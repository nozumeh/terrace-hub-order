
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS customizations jsonb NOT NULL DEFAULT '{}'::jsonb;
