-- Stock opcional en menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS stock_quantity integer;

-- Realtime: capturar fila completa en updates
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;
ALTER TABLE public.menu_categories REPLICA IDENTITY FULL;
ALTER TABLE public.menu_item_extras REPLICA IDENTITY FULL;
ALTER TABLE public.menu_item_removable_options REPLICA IDENTITY FULL;

-- Agregar tablas a la publicación de realtime (idempotente)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_categories;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_item_extras;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_item_removable_options;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;