---
name: Ownership model
description: Terraza Gourmet City Market es la plataforma; restaurantes inquilinos administran su menú e inventario desde su panel.
type: feature
---
- "Terraza Gourmet City Market" representa el venue/plataforma. Aunque exista como fila en `restaurants` (id `a0000000-0000-0000-0000-000000000001`) para que pueda tener su propio menú de "casa", el rol principal es ser el contenedor.
- Cada restaurante inquilino (ej. Capital Burgers) tiene su propia fila en `restaurants` con `owner_id` apuntando al usuario dueño.
- El panel de administración de menú/inventario debe ser por restaurante: el dueño solo ve y edita SU restaurante (RLS: `restaurants.owner_id = auth.uid()`).
- Las tablas `menu_categories`, `menu_items`, `menu_item_extras`, `menu_item_removable_options` ya tienen políticas que permiten escritura solo al `owner_id` del restaurante asociado o a admins.
- Próximamente se añadirán más restaurantes — el modelo escala sin cambios de esquema; basta crear `restaurants` y asignar `owner_id`.
