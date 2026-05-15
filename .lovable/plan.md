# Plan: Tres tipos de cuenta + paneles dedicados

## 1. Header
- Mostrar **Entrar** y **Registrarse** cuando no hay sesión (hoy solo aparece Entrar).
- Cuando hay sesión, agregar enlace a "Mi panel" que redirige según rol:
  - cliente → `/account`
  - empleado/supervisor/gerente → `/employee`
  - dueño de restaurante → `/restaurant`

## 2. Registro: una sola página `/register` con 3 pestañas
Pestañas: **Cliente**, **Trabajador City Market**, **Negocio / Restaurante**.

- **Cliente**: nombre, email, contraseña. Sin tienda ni piso.
- **Trabajador City Market**: nombre, email, contraseña, nombre de tienda, piso, **rol en la tienda** (selector: `empleado`, `gerente`, `dueño`). Genera código promocional automático y aplica `is_employee=true`.
- **Negocio / Restaurante**: nombre del responsable, email, contraseña, **nombre del negocio**, descripción corta, teléfono. Crea el `restaurants` row (pendiente de aprobación admin = `is_active=false`) y asigna rol `restaurant_owner`.

Toda la lógica corre en un `createServerFn` (admin client) que: crea usuario, inserta profile, inserta user_roles, y para restaurante inserta restaurants.owner_id.

## 3. Panel empleado `/employee` (simple)
Tres secciones en una sola página:
- **Mis órdenes** (lista de pedidos propios con estado).
- **Mi perfil** (nombre, tienda, piso, rol; editable).
- **Mi código promocional** (mostrar el código, copiar al clic).

## 4. Panel restaurante `/restaurant` (ampliado)
Tabs adicionales sobre lo que ya existe:
- **Resumen / Promocional**: ventas hoy / semana / mes, top 5 productos, ingresos totales.
- **Productos vendidos**: tabla agrupada por item con cantidad y revenue, filtros por fecha.
- **Información del negocio**: editar nombre, descripción, logo, teléfono, horarios.
- **Inventario**: ya existe stock_quantity por item — agregar vista dedicada con ajuste rápido (+/-, set valor) y umbral de bajo stock.
- **Food runners**: lista de runners (nuevo rol `food_runner`), asignar pedidos en preparación a un runner; estado `out_for_delivery` registra runner_id y timestamp.
- **Cocina** (ya existe).
- **Menú** (ya existe).

## 5. Panel cliente `/account` (mínimo)
- Mis pedidos y datos básicos (separa al cliente del empleado para que no vea descuento).

## Cambios técnicos

### Base de datos
- `app_role`: añadir valores `customer`, `manager`, `food_runner` (ya existen `worker`, `supervisor`, `restaurant_owner`, `admin`).
- `profiles`: añadir `phone text`, `promo_code text unique` (autogenerado para empleados via trigger), `account_type text check in ('customer','employee','restaurant_owner')`.
- `restaurants`: añadir `phone text`, `hours jsonb`, dejar `is_active` como aprobación admin.
- Nueva tabla `food_runners` (id, user_id, restaurant_id, name, phone, active).
- `orders`: añadir `runner_id uuid null`, `out_for_delivery_at timestamptz null`.
- RLS: empleado lee solo su perfil/órdenes; runner lee órdenes asignadas; owner lee todo de su restaurante.
- Trigger `on_auth_user_created` para crear profile + promo_code automático.

### Frontend
- Nuevo `RegisterTabs` en `/register`.
- Nuevas rutas: `src/routes/employee.tsx`, `src/routes/account.tsx`, `src/routes/restaurant.dashboard.tsx`, `src/routes/restaurant.inventory.tsx`, `src/routes/restaurant.runners.tsx`.
- Header actualizado.
- Server fn `signUpAccount({ type, ... })` con admin client para crear todo atómicamente.

## Lo que NO se incluye
- Notificaciones push/SMS al runner.
- Pasarela de pago real.
- Sistema de turnos para empleados.

¿Apruebas el plan así, o ajustamos algo (por ejemplo: solo 2 tipos en vez de 3, recortar el panel de restaurante, dejar food runners para otra iteración)?