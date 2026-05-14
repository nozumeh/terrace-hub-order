ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS options jsonb;

CREATE OR REPLACE FUNCTION public.import_menu_from_csv(_restaurant_id uuid, _items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  is_owner boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.restaurants WHERE id = _restaurant_id AND owner_id = auth.uid())
    INTO is_owner;
  IF NOT is_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized to import menu for this restaurant';
  END IF;

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
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.import_menu_from_csv(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.import_menu_from_csv(uuid, jsonb) TO authenticated;