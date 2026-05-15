
CREATE OR REPLACE FUNCTION public.setup_account(
  _account_type text,
  _staff_role text DEFAULT NULL,
  _business_name text DEFAULT NULL,
  _business_description text DEFAULT NULL,
  _business_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_restaurant_id uuid := NULL;
  role_to_assign public.app_role;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _account_type = 'customer' THEN
    role_to_assign := 'customer';
  ELSIF _account_type = 'employee' THEN
    role_to_assign := CASE
      WHEN _staff_role = 'gerente' THEN 'manager'::public.app_role
      WHEN _staff_role = 'dueno' THEN 'supervisor'::public.app_role
      ELSE 'worker'::public.app_role
    END;
  ELSIF _account_type = 'restaurant_owner' THEN
    role_to_assign := 'restaurant_owner';
    IF _business_name IS NULL OR length(trim(_business_name)) = 0 THEN
      RAISE EXCEPTION 'Business name required';
    END IF;
    INSERT INTO public.restaurants (name, description, owner_id, phone, is_active)
    VALUES (_business_name, COALESCE(_business_description,''), uid, COALESCE(_business_phone,''), false)
    RETURNING id INTO new_restaurant_id;
  ELSE
    RAISE EXCEPTION 'Invalid account type';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, role_to_assign)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('restaurant_id', new_restaurant_id, 'role', role_to_assign::text);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.setup_account(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.setup_account(text, text, text, text, text) TO authenticated;
