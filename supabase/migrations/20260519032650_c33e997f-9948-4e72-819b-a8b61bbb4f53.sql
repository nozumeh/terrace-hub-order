ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS delivery_pickup boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_to_store boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_pago_movil boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_whatsapp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_en_caja boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_efectivo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_number text NOT NULL DEFAULT '+584120690379',
  ADD COLUMN IF NOT EXISTS pago_movil_info text NOT NULL DEFAULT '';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'to_store';