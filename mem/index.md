# Project Memory

## Core
Terraza Gourmet City Market es el DUEÑO de la plataforma (food court / terraza). Los restaurantes inquilinos (Capital Burgers y futuros) son filas en `restaurants` y administran su propio menú/inventario desde su panel de perfil. Solo el owner del restaurante (o admin) puede CRUD su menú vía RLS sobre `restaurants.owner_id = auth.uid()`.

## Memories
- [Ownership model](mem://features/ownership) — Terraza = plataforma; cada restaurante administra su propio menú vía panel de perfil.
