# Project Memory

## Core
Terraza Gourmet City Market es el DUEÑO de la plataforma (food court). Los restaurantes inquilinos (Capital Burgers y futuros) son filas en `restaurants` y administran su propio menú/inventario desde el panel `/restaurant`. SOLO el owner del restaurante (`restaurants.owner_id = auth.uid()`) puede CRUD su menú/extras/categorías/removibles. La plataforma (admin/Terraza) NO puede sobrescribir menús de inquilinos: las policies "* admin all" sobre menu_categories/menu_items/menu_item_extras/menu_item_removable_options/restaurants fueron eliminadas. Admin solo conserva lectura pública.

## Memories
- [Ownership model](mem://features/ownership) — Terraza = plataforma; cada restaurante administra su propio menú vía panel de perfil.
