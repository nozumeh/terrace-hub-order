
-- 1. Ensure target restaurant exists
INSERT INTO public.restaurants (id, name, description, is_active)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Terraza Gourmet City Market', 'Terraza gourmet en City Market', true)
ON CONFLICT (id) DO NOTHING;

-- 2. menu_categories
CREATE TABLE public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_categories_restaurant ON public.menu_categories(restaurant_id);
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories public read" ON public.menu_categories
  FOR SELECT USING (true);
CREATE POLICY "Categories owner manage" ON public.menu_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_categories.restaurant_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_categories.restaurant_id AND r.owner_id = auth.uid()));
CREATE POLICY "Categories admin all" ON public.menu_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Add category_id to menu_items (nullable, optional FK)
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);

-- 4. menu_item_extras
CREATE TABLE public.menu_item_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_item_extras_item ON public.menu_item_extras(menu_item_id);
ALTER TABLE public.menu_item_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Extras public read" ON public.menu_item_extras
  FOR SELECT USING (true);
CREATE POLICY "Extras owner manage" ON public.menu_item_extras
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.restaurants r ON r.id = mi.restaurant_id
    WHERE mi.id = menu_item_extras.menu_item_id AND r.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.restaurants r ON r.id = mi.restaurant_id
    WHERE mi.id = menu_item_extras.menu_item_id AND r.owner_id = auth.uid()
  ));
CREATE POLICY "Extras admin all" ON public.menu_item_extras
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. menu_item_removable_options
CREATE TABLE public.menu_item_removable_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_item_removable_item ON public.menu_item_removable_options(menu_item_id);
ALTER TABLE public.menu_item_removable_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Removable public read" ON public.menu_item_removable_options
  FOR SELECT USING (true);
CREATE POLICY "Removable owner manage" ON public.menu_item_removable_options
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.restaurants r ON r.id = mi.restaurant_id
    WHERE mi.id = menu_item_removable_options.menu_item_id AND r.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.restaurants r ON r.id = mi.restaurant_id
    WHERE mi.id = menu_item_removable_options.menu_item_id AND r.owner_id = auth.uid()
  ));
CREATE POLICY "Removable admin all" ON public.menu_item_removable_options
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
