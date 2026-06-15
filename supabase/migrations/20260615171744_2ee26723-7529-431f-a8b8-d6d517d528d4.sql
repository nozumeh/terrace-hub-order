
CREATE TABLE public.platform_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('activation','monthly','commission')),
  period text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, kind, period)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_payments TO authenticated;
GRANT ALL ON public.platform_payments TO service_role;

ALTER TABLE public.platform_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers and admins can view platform payments"
  ON public.platform_payments FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'developer'::public.app_role)
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Developers and admins can insert platform payments"
  ON public.platform_payments FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'developer'::public.app_role)
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Developers and admins can update platform payments"
  ON public.platform_payments FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(), 'developer'::public.app_role)
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    private.has_role(auth.uid(), 'developer'::public.app_role)
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Developers and admins can delete platform payments"
  ON public.platform_payments FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(), 'developer'::public.app_role)
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE TRIGGER platform_payments_set_updated_at
  BEFORE UPDATE ON public.platform_payments
  FOR EACH ROW EXECUTE FUNCTION public.orders_set_updated_at();
