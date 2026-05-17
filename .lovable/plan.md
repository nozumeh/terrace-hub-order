## Plan: 5 paneles del owner

Los 5 paneles ya existen como rutas separadas (`/restaurant/dashboard`, `inventory`, `runners`, `employees`, `kitchen`). Vamos a reemplazar el contenido de cada uno para cumplir el spec.

### Fase 1 — Prioridad (Vista Cocina + Inventario)

**Vista Cocina (`/restaurant/kitchen`)** — reescribir
- Layout fullscreen negro, header con reloj y contadores (🔴 activos / 🟡 espera)
- Grid de tickets (2 col desktop / 1 móvil) con destaque por antigüedad:
  - <15 min: borde gris
  - 15–30 min: borde naranja `#E8872A` + "URGENTE"
  - >30 min: borde rojo `#F85149` + pulse + "CRÍTICO"
- Botón único de avance según status (Empezar / Listo / Enviado)
- Auto-refresh 15s + realtime (ya existe). Animación verde al entregar.
- Empty state grande "✓ Todo al día"

**Inventario (`/restaurant/inventory`)** — reescribir
- Buscador, tabs por categoría (Todos + categorías dinámicas)
- Lista tipo tabla con imagen, nombre, descripción, precio, toggle HAY/AGOTADO
- Side panel deslizable (Sheet) para editar ítem:
  - Info básica + imagen (upload a bucket `menu-images`)
  - Extras (CRUD sobre `menu_item_extras`) + chips de quick-add
  - Removibles (CRUD sobre `menu_item_removable_options`) + custom
  - Footer sticky: Cancelar / Guardar / Eliminar
- Botón "+ Incluir Inventario" abre el mismo panel vacío
- "Importar CSV" reutiliza el componente existente

### Fase 2 — Food Runners + Empleados

**Food Runners (`/restaurant/runners`)** — reescribir
- Nueva tabla `runner_shifts` (migration)
- Card "Runner de hoy" con asignación / check-in / check-out
- Form registrar turno (date + runner)
- Roster con CRUD + toggle activo + contador de turnos del mes
- Modal agregar runner (nombre, teléfono, horario, notas)
- Tabla historial últimos 30 días

**Empleados (`/restaurant/employees`)** — reescribir
- Nueva tabla `staff_members` (migration) — separada de invitaciones
- Roster: ID Empleado, Nombre, Cargo, Teléfono, Estado, Acciones
- Modal "Agregar empleado" con auto-sugerencia `EMP-XXXX`
- Toggle activo, editar
- Empty state con copy del spec

### Fase 3 — Resumen (Analytics)

**Resumen (`/restaurant/dashboard`)** — reescribir
- Selector de período (Hoy / Semana / Mes)
- 4 KPI cards: Ventas, Pedidos, Ticket promedio, Top item
- BarChart de `recharts` "Ventas por día" (7 o 30 días)
- Bloque "Órdenes activas" con badges
- Tabla "Historial de transacciones" con paginación "Cargar 20 más"

### Cambios de base de datos (migration única)

```sql
CREATE TABLE public.runner_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id uuid NOT NULL REFERENCES public.food_runners(id) ON DELETE CASCADE,
  shift_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in timestamptz, check_out timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('cocinero','cajero','mesero','supervisor','otro')),
  employee_id text NOT NULL,
  phone text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, employee_id)
);

ALTER TABLE public.food_runners ADD COLUMN IF NOT EXISTS schedule text, ADD COLUMN IF NOT EXISTS notes text;
```
+ RLS owner-manage en ambas tablas.

### Notas técnicas
- `restaurantId` se obtiene en cada panel vía `restaurants.owner_id = auth.uid()` (ya funciona)
- Toggle disponibilidad ya es realtime en `menu_items.is_available`
- `recharts` ya está instalado
- Uso `Sheet` de shadcn para el side-panel de edición
- Mantengo el `Header` y `NotificationsBanner` en todos

### Confirma antes de empezar
1. ¿Procedo con las 3 fases en orden (cocina+inventario primero)?
2. ¿OK con las dos tablas nuevas (`runner_shifts`, `staff_members`)?
3. La tabla `orders` no tiene columna `total` simple — uso `total_final`. ¿OK?
