
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_id text DEFAULT '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  acct text := COALESCE(meta->>'account_type', 'customer');
  is_emp boolean := acct = 'employee';
  promo text := NULL;
BEGIN
  IF is_emp THEN
    promo := public.generate_promo_code();
  END IF;

  INSERT INTO public.profiles (id, email, name, store_name, store_floor, store_id, is_employee, phone, promo_code, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'name', ''),
    COALESCE(meta->>'store_name', ''),
    COALESCE(meta->>'store_floor', ''),
    COALESCE(meta->>'store_id', ''),
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
    store_floor = COALESCE(NULLIF(EXCLUDED.store_floor,''), public.profiles.store_floor),
    store_id = COALESCE(NULLIF(EXCLUDED.store_id,''), public.profiles.store_id);

  RETURN NEW;
END;
$function$;
