-- Reasignar órdenes huérfanas al restaurante real al que pertenecen los items
UPDATE public.orders o
SET restaurant_id = mi.restaurant_id
FROM public.order_items oi
JOIN public.menu_items mi ON mi.id = oi.menu_item_id
WHERE oi.order_id = o.id
  AND o.restaurant_id = 'a0000000-0000-0000-0000-000000000001'
  AND mi.restaurant_id <> o.restaurant_id;