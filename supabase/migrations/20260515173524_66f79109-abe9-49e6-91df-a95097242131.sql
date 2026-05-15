-- Track delivery completion timestamp on orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Trigger: stamp delivered_at when status flips to 'delivered'
CREATE OR REPLACE FUNCTION public.orders_set_delivered_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_set_delivered_at ON public.orders;
CREATE TRIGGER trg_orders_set_delivered_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.orders_set_delivered_at();

-- Helpful index for ETA aggregation queries
CREATE INDEX IF NOT EXISTS idx_orders_delivered_floor
  ON public.orders (restaurant_id, delivery_floor, delivered_at)
  WHERE delivered_at IS NOT NULL AND out_for_delivery_at IS NOT NULL;