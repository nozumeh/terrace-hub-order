
-- Employee invitations
CREATE TABLE public.employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  store_name text NOT NULL DEFAULT '',
  store_floor text NOT NULL DEFAULT '',
  staff_role text NOT NULL DEFAULT 'empleado',
  email text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  used_by uuid
);

ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invites owner manage"
ON public.employee_invitations
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = employee_invitations.restaurant_id AND r.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = employee_invitations.restaurant_id AND r.owner_id = auth.uid()));

CREATE POLICY "Invites admin all"
ON public.employee_invitations
FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Public lookup by token (returns minimal info)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE(
  id uuid,
  restaurant_id uuid,
  restaurant_name text,
  store_name text,
  store_floor text,
  staff_role text,
  email text,
  expires_at timestamptz,
  used_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.restaurant_id, r.name AS restaurant_name, i.store_name, i.store_floor,
         i.staff_role, i.email, i.expires_at, i.used_at
  FROM public.employee_invitations i
  JOIN public.restaurants r ON r.id = i.restaurant_id
  WHERE i.token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- Accept invitation (called by the new user right after signing up)
CREATE OR REPLACE FUNCTION public.accept_employee_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inv public.employee_invitations%ROWTYPE;
  role_to_assign public.app_role;
  promo text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.employee_invitations WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación no encontrada';
  END IF;
  IF inv.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Esta invitación ya fue utilizada';
  END IF;
  IF inv.expires_at < now() THEN
    RAISE EXCEPTION 'Esta invitación ha expirado';
  END IF;

  role_to_assign := CASE
    WHEN inv.staff_role = 'gerente' THEN 'manager'::public.app_role
    WHEN inv.staff_role = 'dueno' THEN 'supervisor'::public.app_role
    ELSE 'worker'::public.app_role
  END;

  -- Make sure profile exists, then patch with invite data
  promo := public.generate_promo_code();
  INSERT INTO public.profiles (id, name, account_type, is_employee, store_name, store_floor, promo_code)
  VALUES (uid, '', 'employee', true, inv.store_name, inv.store_floor, promo)
  ON CONFLICT (id) DO UPDATE SET
    account_type = 'employee',
    is_employee = true,
    store_name = COALESCE(NULLIF(EXCLUDED.store_name,''), public.profiles.store_name),
    store_floor = COALESCE(NULLIF(EXCLUDED.store_floor,''), public.profiles.store_floor),
    promo_code = COALESCE(public.profiles.promo_code, EXCLUDED.promo_code);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, role_to_assign)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.employee_invitations
  SET used_at = now(), used_by = uid
  WHERE id = inv.id;

  RETURN jsonb_build_object('ok', true, 'role', role_to_assign::text, 'restaurant_id', inv.restaurant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_employee_invite(text) TO authenticated;

-- Admin management by email (admin-only)
CREATE OR REPLACE FUNCTION public.promote_user_to_admin_by_email(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  target_id uuid;
BEGIN
  IF caller IS NULL OR NOT private.has_role(caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;

  SELECT id INTO target_id FROM public.profiles WHERE lower(email) = lower(_email) LIMIT 1;
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'No existe ningún usuario con ese email';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'user_id', target_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_user_to_admin_by_email(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_admin_by_email(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  target_id uuid;
BEGIN
  IF caller IS NULL OR NOT private.has_role(caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can revoke admin role';
  END IF;

  SELECT id INTO target_id FROM public.profiles WHERE lower(email) = lower(_email) LIMIT 1;
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'No existe ningún usuario con ese email';
  END IF;

  IF target_id = caller THEN
    RAISE EXCEPTION 'No puedes revocar tu propio rol de admin';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_id AND role = 'admin'::public.app_role;

  RETURN jsonb_build_object('ok', true, 'user_id', target_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_admin_by_email(text) TO authenticated;
