
-- 1) Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'food_runner';

-- 2) Profiles: phone, promo_code, account_type
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'customer'
    CHECK (account_type IN ('customer','employee','restaurant_owner'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_promo_code_unique
  ON public.profiles (promo_code) WHERE promo_code IS NOT NULL;

-- 3) Restaurants: phone, address, hours
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS hours text DEFAULT '';

-- 4) Food runners table
CREATE TABLE IF NOT EXISTS public.food_runners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  user_id uuid,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.food_runners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Runners owner manage" ON public.food_runners;
CREATE POLICY "Runners owner manage" ON public.food_runners
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = food_runners.restaurant_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = food_runners.restaurant_id AND r.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Runners self read" ON public.food_runners;
CREATE POLICY "Runners self read" ON public.food_runners
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5) Orders: runner_id and out_for_delivery_at
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS runner_id uuid,
  ADD COLUMN IF NOT EXISTS out_for_delivery_at timestamptz;

DROP POLICY IF EXISTS "Orders assigned runner select" ON public.orders;
CREATE POLICY "Orders assigned runner select" ON public.orders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.food_runners fr WHERE fr.id = orders.runner_id AND fr.user_id = auth.uid()));

-- 6) Promo code generator
CREATE OR REPLACE FUNCTION public.generate_promo_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  exists_count int;
BEGIN
  LOOP
    candidate := 'CM' || upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));
    SELECT count(*) INTO exists_count FROM public.profiles WHERE promo_code = candidate;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN candidate;
END;
$$;

-- 7) Trigger: on auth.users created, insert profile row with metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  acct text := COALESCE(meta->>'account_type', 'customer');
  is_emp boolean := acct = 'employee';
  promo text := NULL;
BEGIN
  IF is_emp THEN
    promo := public.generate_promo_code();
  END IF;

  INSERT INTO public.profiles (id, email, name, store_name, store_floor, is_employee, phone, promo_code, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'name', ''),
    COALESCE(meta->>'store_name', ''),
    COALESCE(meta->>'store_floor', ''),
    is_emp,
    COALESCE(meta->>'phone', ''),
    promo,
    acct
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(EXCLUDED.name,''), public.profiles.name),
    account_type = EXCLUDED.account_type,
    is_employee = EXCLUDED.is_employee,
    phone = COALESCE(NULLIF(EXCLUDED.phone,''), public.profiles.phone),
    promo_code = COALESCE(public.profiles.promo_code, EXCLUDED.promo_code),
    store_name = COALESCE(NULLIF(EXCLUDED.store_name,''), public.profiles.store_name),
    store_floor = COALESCE(NULLIF(EXCLUDED.store_floor,''), public.profiles.store_floor);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8) Backfill promo codes for existing employees
UPDATE public.profiles
SET promo_code = public.generate_promo_code()
WHERE is_employee = true AND promo_code IS NULL;

UPDATE public.profiles SET account_type = 'restaurant_owner'
WHERE id IN (SELECT owner_id FROM public.restaurants WHERE owner_id IS NOT NULL)
  AND account_type = 'customer';

UPDATE public.profiles SET account_type = 'employee'
WHERE is_employee = true AND account_type = 'customer';
