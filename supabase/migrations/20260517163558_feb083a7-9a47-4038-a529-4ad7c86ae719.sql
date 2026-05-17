
ALTER TABLE public.food_runners
  ADD COLUMN IF NOT EXISTS schedule text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE IF NOT EXISTS public.runner_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id uuid NOT NULL REFERENCES public.food_runners(id) ON DELETE CASCADE,
  shift_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in timestamptz,
  check_out timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_runner_shifts_runner_date ON public.runner_shifts(runner_id, shift_date DESC);

ALTER TABLE public.runner_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shifts owner manage" ON public.runner_shifts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.food_runners fr
    JOIN public.restaurants r ON r.id = fr.restaurant_id
    WHERE fr.id = runner_shifts.runner_id AND r.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.food_runners fr
    JOIN public.restaurants r ON r.id = fr.restaurant_id
    WHERE fr.id = runner_shifts.runner_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Shifts admin all" ON public.runner_shifts
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Shifts runner self read" ON public.runner_shifts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.food_runners fr
    WHERE fr.id = runner_shifts.runner_id AND fr.user_id = auth.uid()
  ));

CREATE TABLE IF NOT EXISTS public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('cocinero','cajero','mesero','supervisor','otro')),
  employee_id text NOT NULL,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_staff_restaurant ON public.staff_members(restaurant_id);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff public read active" ON public.staff_members
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Staff owner manage" ON public.staff_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = staff_members.restaurant_id AND r.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = staff_members.restaurant_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Staff admin all" ON public.staff_members
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
