-- Quitar el bypass de admin sobre tablas de menú e inventario.
-- A partir de ahora, solo el dueño del restaurante puede modificar su menú.

DROP POLICY IF EXISTS "Categories admin all" ON public.menu_categories;
DROP POLICY IF EXISTS "Menu admin all" ON public.menu_items;
DROP POLICY IF EXISTS "Extras admin all" ON public.menu_item_extras;
DROP POLICY IF EXISTS "Removable admin all" ON public.menu_item_removable_options;

-- Permitir a admin SOLO leer (igual que público, pero explícito por claridad).
-- La lectura pública ya existe; no se necesita policy adicional.

-- Restaurants: admin sigue pudiendo leer (public read) pero no debe poder editar
-- restaurantes de otros owners. Quitamos el bypass admin de UPDATE/INSERT/DELETE.
DROP POLICY IF EXISTS "Restaurants admin all" ON public.restaurants;