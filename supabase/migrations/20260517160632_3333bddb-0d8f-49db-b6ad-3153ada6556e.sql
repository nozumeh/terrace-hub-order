ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

UPDATE public.menu_categories SET display_order = sort_order WHERE display_order = 0 AND sort_order <> 0;