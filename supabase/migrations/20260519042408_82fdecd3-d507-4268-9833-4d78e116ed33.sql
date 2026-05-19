CREATE TABLE IF NOT EXISTS public.bcv_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate numeric(10,2) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date)
);

INSERT INTO public.bcv_rates (rate, date, notes)
VALUES (517.96, CURRENT_DATE, 'Tasa inicial — Mayo 2026')
ON CONFLICT (date) DO UPDATE SET rate = EXCLUDED.rate;

CREATE OR REPLACE FUNCTION public.get_current_bcv_rate()
RETURNS numeric
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT rate FROM public.bcv_rates ORDER BY date DESC LIMIT 1;
$$;

ALTER TABLE public.bcv_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BCV rates public read"
  ON public.bcv_rates FOR SELECT USING (true);

CREATE POLICY "BCV rates admin manage"
  ON public.bcv_rates FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bcv_rate_snapshot numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_bs numeric(12,2);