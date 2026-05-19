WITH capital AS (
  SELECT id
  FROM public.restaurants
  WHERE id = '05fc202f-44fc-4d72-9b4a-37c01ad1340b'::uuid
     OR lower(name) = 'capital burgers'
  LIMIT 1
), burger_items AS (
  SELECT mi.id
  FROM public.menu_items mi
  JOIN capital c ON c.id = mi.restaurant_id
  WHERE mi.category ILIKE '%Hamburguesas%'
     OR mi.name ILIKE '%BURGER%'
     OR mi.name ILIKE '%CALIFORNIA KIDS%'
     OR mi.name ILIKE '%ARMA TU CAPITAL%'
), default_extras(name, price) AS (
  VALUES
    ('Queso Americano', 0.50::numeric),
    ('Tocineta', 1.00::numeric),
    ('Aguacate', 0.75::numeric),
    ('Huevo', 0.50::numeric),
    ('Doble carne', 2.00::numeric),
    ('Jalapeños', 0.50::numeric)
), default_removables(name) AS (
  VALUES
    ('Lechuga'),
    ('Tomate'),
    ('Cebolla'),
    ('Pepinillos'),
    ('Mostaza'),
    ('Mayonesa'),
    ('Queso Americano'),
    ('Tocineta'),
    ('Salsa')
)
INSERT INTO public.menu_item_extras (menu_item_id, name, price)
SELECT bi.id, de.name, de.price
FROM burger_items bi
CROSS JOIN default_extras de
WHERE NOT EXISTS (
  SELECT 1
  FROM public.menu_item_extras e
  WHERE e.menu_item_id = bi.id
    AND lower(e.name) = lower(de.name)
);

WITH capital AS (
  SELECT id
  FROM public.restaurants
  WHERE id = '05fc202f-44fc-4d72-9b4a-37c01ad1340b'::uuid
     OR lower(name) = 'capital burgers'
  LIMIT 1
), burger_items AS (
  SELECT mi.id
  FROM public.menu_items mi
  JOIN capital c ON c.id = mi.restaurant_id
  WHERE mi.category ILIKE '%Hamburguesas%'
     OR mi.name ILIKE '%BURGER%'
     OR mi.name ILIKE '%CALIFORNIA KIDS%'
     OR mi.name ILIKE '%ARMA TU CAPITAL%'
), default_removables(name) AS (
  VALUES
    ('Lechuga'),
    ('Tomate'),
    ('Cebolla'),
    ('Pepinillos'),
    ('Mostaza'),
    ('Mayonesa'),
    ('Queso Americano'),
    ('Tocineta'),
    ('Salsa')
)
INSERT INTO public.menu_item_removable_options (menu_item_id, name)
SELECT bi.id, dr.name
FROM burger_items bi
CROSS JOIN default_removables dr
WHERE NOT EXISTS (
  SELECT 1
  FROM public.menu_item_removable_options ro
  WHERE ro.menu_item_id = bi.id
    AND lower(ro.name) = lower(dr.name)
);