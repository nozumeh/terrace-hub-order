DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN user_id TO customer_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total_before_discount'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN total_before_discount TO subtotal;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discount_applied'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN discount_applied TO discount_amount;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total_final'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'total'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN total_final TO total;
  END IF;
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE public.orders
  ALTER COLUMN customer_id SET NOT NULL,
  ALTER COLUMN subtotal SET NOT NULL,
  ALTER COLUMN discount_amount SET NOT NULL,
  ALTER COLUMN discount_amount SET DEFAULT 0,
  ALTER COLUMN total SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    ALTER TABLE public.orders
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE text USING status::text,
      ALTER COLUMN status SET DEFAULT 'pending';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.orders_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_set_updated_at_trigger ON public.orders;
CREATE TRIGGER orders_set_updated_at_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.orders_set_updated_at();

DROP POLICY IF EXISTS "Orders own select" ON public.orders;
DROP POLICY IF EXISTS "Orders own insert" ON public.orders;
CREATE POLICY "Orders own select"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

CREATE POLICY "Orders own insert"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Order items insert via own order" ON public.order_items;
DROP POLICY IF EXISTS "Order items via order select" ON public.order_items;
CREATE POLICY "Order items insert via own order"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id AND o.customer_id = auth.uid()
));

CREATE POLICY "Order items via order select"
ON public.order_items
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id
    AND (
      o.customer_id = auth.uid()
      OR private.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid()
      )
    )
));