ALTER TABLE public.bcv_rates
  ADD COLUMN IF NOT EXISTS scheduled_rate numeric,
  ADD COLUMN IF NOT EXISTS scheduled_for date;