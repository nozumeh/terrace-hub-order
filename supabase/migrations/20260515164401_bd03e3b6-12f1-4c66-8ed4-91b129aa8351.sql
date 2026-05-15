
-- 1. Esquema privado (no expuesto vía PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- 2. Mover has_role -> private.has_role
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO postgres, service_role, authenticated, anon;

-- 3. Recrear todas las RLS que usaban public.has_role para que apunten a private.has_role

-- menu_items
DROP POLICY IF EXISTS "Menu admin all" ON public.menu_items;
CREATE POLICY "Menu admin all" ON public.menu_items
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- orders
DROP POLICY IF EXISTS "Orders admin all" ON public.orders;
CREATE POLICY "Orders admin all" ON public.orders
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- order_items (select policy referencia has_role)
DROP POLICY IF EXISTS "Order items via order select" ON public.order_items;
CREATE POLICY "Order items via order select" ON public.order_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.user_id = auth.uid()
        OR private.has_role(auth.uid(), 'admin'::public.app_role)
        OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = o.restaurant_id AND r.owner_id = auth.uid())
      )
  ));

-- profiles
DROP POLICY IF EXISTS "Profiles select admin" ON public.profiles;
CREATE POLICY "Profiles select admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Profiles update admin" ON public.profiles;
CREATE POLICY "Profiles update admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- restaurants
DROP POLICY IF EXISTS "Restaurants admin all" ON public.restaurants;
CREATE POLICY "Restaurants admin all" ON public.restaurants
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- user_roles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- menu_categories (creadas en migración previa)
DROP POLICY IF EXISTS "Categories admin all" ON public.menu_categories;
CREATE POLICY "Categories admin all" ON public.menu_categories
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- menu_item_extras
DROP POLICY IF EXISTS "Extras admin all" ON public.menu_item_extras;
CREATE POLICY "Extras admin all" ON public.menu_item_extras
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- menu_item_removable_options
DROP POLICY IF EXISTS "Removable admin all" ON public.menu_item_removable_options;
CREATE POLICY "Removable admin all" ON public.menu_item_removable_options
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Mover handle_new_user -> private.handle_new_user y recrear el trigger
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, store_name, store_floor, is_employee)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name',''),
    COALESCE(NEW.raw_user_meta_data->>'store_name',''),
    COALESCE(NEW.raw_user_meta_data->>'store_floor',''),
    true
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'worker'::public.app_role)
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

DROP FUNCTION IF EXISTS public.handle_new_user();

-- 5. Reescribir import_menu_from_csv como SECURITY INVOKER (RLS hace cumplir el control)
CREATE OR REPLACE FUNCTION public.import_menu_from_csv(_restaurant_id uuid, _items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  inserted_count integer := 0;
BEGIN
  -- RLS sobre menu_items garantiza que solo el dueño del restaurante o un admin puedan
  -- borrar/insertar. Si el caller no tiene permiso, los DELETE/INSERT siguientes no afectarán filas.
  DELETE FROM public.menu_items WHERE restaurant_id = _restaurant_id;

  INSERT INTO public.menu_items (restaurant_id, name, description, price, category, image_url, is_available, options)
  SELECT
    _restaurant_id,
    COALESCE(item->>'name', 'Sin nombre'),
    COALESCE(item->>'description', ''),
    COALESCE((item->>'price')::numeric, 0),
    COALESCE(NULLIF(item->>'category',''), 'Otros'),
    COALESCE(item->>'image_url', ''),
    COALESCE((item->>'is_available')::boolean, true),
    CASE WHEN item ? 'options' AND jsonb_typeof(item->'options') = 'array' THEN item->'options' ELSE NULL END
  FROM jsonb_array_elements(_items) AS item;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count = 0 THEN
    RAISE EXCEPTION 'No se importaron items. Verifica que seas dueño del restaurante o admin.';
  END IF;

  RETURN inserted_count;
END;
$function$;

-- 6. Eliminar la has_role pública ahora que ya no es referenciada
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
