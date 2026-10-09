# Guía de Diseño UI — RutaYa (Frontend)

Documento de referencia para diseñar e implementar la interfaz del proyecto **RutaYa**,
basado en las APIs que expone el backend (`backend/`).

> Complementa a `INTEGRATION_API.md`, que documenta en detalle los endpoints y contratos.
> Aquí nos enfocamos en cómo esos datos se convierten en pantallas, componentes y flujos.

---

## 1. Visión General

**RutaYa** es una app de transporte urbano que permite:

- **Al ciudadano** encontrar rutas de transporte, ver su trazado sobre el mapa, los
  paraderos y datos operativos (tarifa, horario, frecuencia) de forma pública y sencilla.
- **Al administrador** gestionar el catálogo completo (ciudades, líneas, paraderos y rutas)
  mediante un panel con autenticación JWT.

### Dos experiencias de usuario

| Perfil | Acceso | Propósito |
|---|---|---|
| **Ciudadano** | Público, sin login | Buscar y explorar rutas en el mapa |
| **Administrador** | Login JWT (`/api/auth/admin/login`) | CRUD de datos del sistema |

### Stack recomendado

Frontend existente en `frontend/`: React + Vite. Para el mapa es apropiado
**Leaflet** o **MapLibre GL**. Los diseños asumen mobile-first (con `BottomNav`) y
vistas de escritorio ampliadas para el panel de administración.

---

## 2. Mapa de Navegación (Sitemap)

```
                        ┌─────────────────────────────────────────────┐
                        │                 APP  CITIZEN               │
                        └─────────────────────────────────────────────┘

  (Geolocalización denegada → modal GPS)
  [ubicación obtenida → interactúan "cercanos"]

                              ┌─────────────┐
                              │   HOME MAP  │
                              └──────┬──────┘
               ┌──────────────────┬──┴──┬─────────────────────┐
               ▼                  ▼     ▼                     │
        ┌────────────┐    ┌──────────────┐   ┌──────────────┐ │
        │ Búsqueda   │    │  RUTAS (lista│   │ PARADEROS    │ │
        │ (Sheet)    │    │  /grid tarj.)│   │ cercanos     │ │
        └────────────┘    └──────┬───────┘   └──────┬───────┘ │
                                 ▼                  ▼
                        ┌────────────────┐   ┌──────────────┐
                        │  RUTA (detalle)│   │   PARADERO   │
                        └────────────────┘   │   (opcional) │
                                             └──────────────┘

  BottomNav: [Mapa]  [Rutas]  [Cercanos]
  Header: logo + barra de búsqueda global

─────────────────────────────────────────────────────────────────

                        ┌─────────────────────────────────────────────┐
                        │             APP  ADMINISTRATOR             │
                        └─────────────────────────────────────────────┘

                               ┌────────────┐
                               │  LOGIN     │  POST /api/auth/admin/login
                               └─────┬──────┘
                                     │ (JWT → guardado en localStorage)
                                     ▼
                              ┌──────────────┐
                              │  DASHBOARD   │  (KPIs + atajos)
                              └──────┬───────┘
        ┌──────────────┬────────────┬┴────────────┬──────────────┐
        ▼              ▼            ▼             ▼              ▼
  ┌──────────┐  ┌──────────┐ ┌──────────┐  ┌──────────┐  ┌──────────────┐
  │ CIUDADES │  │ LINEAS   │ │ PARADEROS│  │  RUTAS   │  │  USUARIOS    │
  │ list/CRUD│  │ list/CRUD│ │ list/CRUD│  │ list/CRUD│  │ (futuro)     │
  └──────────┘  └──────────┘ └──────────┘  └────┬─────┘  └──────────────┘
                                               │
                                        ┌──────┴────────┐
                                        │ RUTA detalle/ │
                                        │ editar + map  │ (direcciones, paraderos, polígono)
                                        └───────────────┘
```

---

## 3. Contratos de Datos por Pantalla

> Fuente: DTOs del backend. Campos `id` son `UUID`. `isAccessible` serializa como `accessible` en JSON.

### 3.1 HOME MAP (`/mapa`)

Endpoints:
- `GET /api/routes/cards` — tarjetas de rutas para mostrarlas en el mapa.
- `POST /api/routes/nearby` y `POST /api/stops/nearby` — según geolocalización.

Datos relevantes:

```jsonc
// POST /api/routes/nearby  Body: { "latitude": -14.0678, "longitude": -75.7286, "radiusMeters": 1000 }
// Response: RouteSummaryResponse[]
{
  "id": "uuid",
  "code": "R101",
  "name": "Ruta 101: Plaza de Armas - Huacachina",
  "color": "#2563eb",
  "fare": "S/ 1.50",
  "transportLineName": "Línea 1: Consorcio Urbano Ica",
  "keyStops": [
    { "id": "uuid", "name": "Plaza de Armas de Ica",
      "latitude": -14.0678, "longitude": -75.7286 }
  ]
}
```

En pantalla: marcadores (pins) por ruta o por primer `keyStop`; al tocar → sheet con detalle
y botón "Ver ruta". Las rutas se dibujan al ver el detalle.

### 3.2 LISTA DE RUTAS (`/rutas`)

Endpoints:
- `GET /api/routes/cards` — listado completo (grid de tarjetas).
- `GET /api/routes/search?query=` — búsqueda por nombre/código/línea.
- `GET /api/routes/line/{transportLineId}` — filtro por línea.
- `GET /api/lines` y `GET /api/lines/city/{cityId}` — filtros de línea/ciudad.

Tarjeta: `code`, `name`, `color` (badge/acento), `fare`, `transportLineName`, `keyStops[]` (primeros 2-3).

### 3.3 DETALLE DE RUTA (`/rutas/:id`)

Endpoint: `GET /api/routes/{id}` → `RouteDetailResponse`

```jsonc
{
  "id": "uuid",
  "code": "R101",
  "name": "Ruta 101: Plaza de Armas - Huacachina",
  "color": "#2563eb",
  "description": "...",
  "status": "ACTIVE",
  "fare": "S/ 1.50",
  "schedule": "06:00 - 21:00",
  "frequency": "Cada 15 min",
  "transportLineId": "uuid",
  "transportLineName": "Línea 1: Consorcio Urbano Ica",
  "directions": [
    {
      "id": "uuid",
      "direction": "Ida",
      "originName": "Plaza de Armas",
      "destinationName": "Huacachina",
      "totalDistanceKm": 7.2,
      "estimatedMinutes": 25,
      "stops": [
        { "id": "uuid", "name": "Plaza de Armas de Ica",
          "latitude": -14.0678, "longitude": -75.7286,
          "reference": "Av. Municipalidad", "address": "...", "accessible": true }
      ],
      "routePoints": [
        { "pointOrder": 1, "latitude": -14.0678, "longitude": -75.7286 }
      ]
    }
  ]
}
```

En pantalla:
- **Mapa** con la polilínea (ordenar `routePoints` por `pointOrder`) y pins de `stops`.
- **Tabs Ida/Vuelta** (`directions[]`).
- **Datos operativos**: tarifa, horario, frecuencia, distancia y tiempo estimado por dirección.
- **Lista de paraderos** por dirección con orden y referencia.

### 3.4 PARADEROS (`/rutas` sección o `/paraderos`)

Endpoints: `GET /api/stops`, `GET /api/stops/search?query=`, `POST /api/stops/nearby`.

```jsonc
{
  "id": "uuid",
  "name": "Plaza de Armas de Ica",
  "latitude": -14.0678, "longitude": -75.7286,
  "reference": "Av. Municipalidad",
  "address": "Av. Municipalidad cdra 1",
  "accessible": true
}
```

En pantalla: marcadores, listado con nombre + referencia + icono de accesibilidad (`accessible`).

### 3.5 LOGIN ADMIN (`/admin/login`)

Endpoint: `POST /api/auth/admin/login`

```jsonc
// Request: { "email": "admin@rutasya.pe", "password": "admin123" }
// Response: { "token": "eyJ...", "email": "admin@rutasya.pe" }
```

Se almacena `token` (para header `Authorization: Bearer`) e `email`. Validación de errores:
- `400`: body de validación → mapear `errors` por campo.
- `401`: credenciales incorrectas.

### 3.6 DASHBOARD & CRUD ADMIN (`/admin/**`)

Todas requieren JWT. Lógica idéntica por recurso, cambia el modelo.

| Módulo | Listar (GET) | Crear (POST) | Actualizar (PUT) | Eliminar (DELETE) |
|---|---|---|---|---|
| Ciudades | `/api/admin/cities` | `/api/admin/cities` | `/api/admin/cities/{id}` | `/api/admin/cities/{id}` |
| Líneas | `/api/admin/lines` | `/api/admin/lines` | `/api/admin/lines/{id}` | `/api/admin/lines/{id}` |
| Paraderos | `/api/admin/stops` | `/api/admin/stops` | `/api/admin/stops/{id}` | `/api/admin/stops/{id}` |
| Rutas | `/api/admin/routes` | `/api/admin/routes` | `/api/admin/routes/{id}` | `/api/admin/routes/{id}` |

Endpoints auxiliares:
- `PUT /api/admin/routes/{id}/directions` — editar direcciones (paraderos y polígono) de una ruta.
- `GET /api/admin/routes/{id}` — detalle para editar (usan `RouteDetailResponse`).

Formularios / campos (datos a recoger en la UI):

**Ciudad:** `name`, `department`, `country` (default `Perú`).

```jsonc
{ "name": "Ica", "department": "Ica", "country": "Perú" } // CreateCityRequest
```

**Línea:** `cityId`, `name`, `code`, `color`, `company`, `contact`, `description`, `status`.

```jsonc
// CreateTransportLineRequest
{ "cityId": "uuid","name":"Línea 1","code":"L1","color":"#2563eb",
  "company":"Consorcio Urbano Ica","contact":"...","description":"...","status":"ACTIVE" }
```

**Paradero:** `cityId`, `name`, `latitude`, `longitude`, `reference`, `address`, `isAccessible` (default `true`). Lat/Long capturados por clic en mapa.

```jsonc
// CreateStopRequest
{ "cityId":"uuid","name":"Plaza de Armas","latitude":-14.0678,
  "longitude":-75.7286,"reference":"Av. Municipalidad","address":"...","isAccessible":true }
```

**Ruta (create):** `transportLineId`, `code`, `name`, `color`, `description`, `fare`,
`schedule`, `frequency`, `status` y `directions[]` (cada una con `direction`, origen/destino,
`totalDistanceKm`, `estimatedMinutes`, `stops[]` con `stopId`+`stopOrder`, `routePoints[]`
con `pointOrder`+lat/lon — dibujado sobre mapa).

**Ruta (update):** `code, name, color, description, fare, schedule, frequency, status`
(UpdateRouteRequest). Las direcciones se editan por separado con `PUT .../directions`.

> **Nota de UI:** Create vs Update difieren. `CreateRouteRequest` trae `directions` anidado
> completo; `UpdateRouteRequest` NO trae direcciones (usa el endpoint de direcciones aparte).
> El formulario de "editar ruta" debe separar: campos base + editor de direcciones.

---

## 4. Wireframes (ASCII)

### 4.1 HOME MAP (ciudadano)

```
 ┌────────────────────────────────────────┐
 │ 🔍 RutaYa            [ubicación]  ▾   │ ← Header + SearchBar
 ├────────────────────────────────────────┤
 │                                        │
 │        (Mapa interactivo)              │
 │        ● pins de rutas / paraderos     │
 │                                        │
 │                                        │
 │             ┌──────────────────────┐   │
 │             │ R101 · S/ 1.50       │   │ ← Sheet/card superpuesta
 │             │ Plaza de Armas →     │   │
 │             │ Huacachina           │   │
 │             │ [Ver ruta]           │   │
 │             └──────────────────────┘   │
 ├────────────────────────────────────────┤
 │  🗺 Mapa        🚌 Rutas        📍 Cercanos │ ← BottomNav
 └────────────────────────────────────────┘
```

### 4.2 DETALLE DE RUTA

```
 ┌────────────────────────────────────────┐
 │ ‹  R101  Ruta 101                      │ ← Header (← volver)
 ├────────────────────────────────────────┤
 │  (Mapa con polilínea + pins paraderos) │
 ├────────────────────────────────────────┤
 │  [ Ida ]  [ Vuelta ]                   │ ← Tabs directions
 │  Plaza de Armas ────────▶ Huacachina   │
 │  🕐 ~25 min · 📏 7.2 km · 💰 S/1.50    │
 │  Horario: 06:00-21:00 · Frec: 15 min   │
 │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
 │  ● Paraderos                           │
 │  1. Plaza de Armas de Ica   (ref)      │
 │  2. ...                                │
 │  3. Huacachina          ♿ (accesible)  │
 ├────────────────────────────────────────┤
 │  🗺 Mapa       🚌 Rutas        📍 Cercanos │
 └────────────────────────────────────────┘
```

### 4.3 LISTA DE RUTAS

```
 ┌────────────────────────────────────────┐
 │ ‹  Rutas                        (filtro)│
 ├────────────────────────────────────────┤
 │ ┌────────────────────────────────────┐ │
 │ │ ██ R101 ─ Ruta 101         S/1.50 │ │ ← color = acento
 │ │ Línea 1: Consorcio Urbano Ica      │ │
 │ │ ● Plaza de Armas · ● Huacachina    │ │ ← keyStops
 │ └────────────────────────────────────┘ │
 │ ┌────────────────────────────────────┐ │
 │ │ ██ R105 ...                        │ │
 │ └────────────────────────────────────┘ │
 │ ...                                   │
 └────────────────────────────────────────┘
```

### 4.4 LOGIN ADMIN

```
 ┌────────────────────────────────────────┐
 │         🔐 Administrador               │
 │   Email: [ admin@rutasya.pe        ]  │
 │   Contraseña: [ •••••••            ]   │
 │          [  Iniciar sesión  ]          │
 │          (Cargando…) / error msj       │
 └────────────────────────────────────────┘
```

### 4.5 DASHBOARD ADMIN

```
 ┌────────────────────────────────────────┐
 │ ▤ RutaYa Admin           👤 admin ▾    │ ← Sidebar (escritorio) / TopBar (móvil)
 ├──────────┬─────────────────────────────┤
 │ Ciudades │  Panel                       │
 │ Líneas   │  [ KPI: 5 ciudades ]         │
 │ Paraderos│  [ KPI: 12 líneas  ]         │
 │ Rutas    │  [ KPI: 40 rutas    ]        │
 │ Cerrar   │  atajos: [Nueva ruta]        │
 └──────────┴─────────────────────────────┘
```

### 4.6 CRUD (ej. Lista de Rutas + Formulario modal)

```
 Tabla/listado                        Modal / página de edición
 ┌──────────────────────────┐        ┌──────────────────────────┐
 │ Rutas        [+ Nueva]   │        │ Ruta  Editar / Crear     │
 │──────────────────────────│        │ Código: [R101]           │
 │ R101  Ruta 1   ▸ ✎ 🗑   │        │ Nombre: [Ruta 101 ...]   │
 │ R102  Ruta 2   ▸ ✎ 🗑   │        │ Línea:  [▾ Línea 1]      │
 │ ...                      │        │ Tarifa  [S/1.50] Horario │
 │                          │        │ ...                      │
 │                          │        │ [Editor de direcciones]  │
 │                          │        │   → mapa + lista parader.│
 │                          │        │ [Guardar]  [Cancelar]    │
 └──────────────────────────┘        └──────────────────────────┘
```

---

## 5. Estados de UI (Carga / Vacío / Error / Offline)

La app debe contemplar los siguientes estados por cada pantalla y conector de datos.

### Carga (loading)
- Spinner o skeleton correspondiente a la vista (tarjetas, tabla, mapa).
- En el mapa: indicador mientras se dibujan líneas/pins.

### Vacío (empty)
- Mismo layout pero con ilustración + mensaje accionable:
  - "No hay rutas cerca. Acércate a un punto de origen o cambia de zona."
  - "Sin resultados para tu búsqueda." + botón "Limpiar filtros".

### Error
- **Formato de error del backend** (GlobalExceptionHandler):
  - Simple: `{ "timestamp", "status", "message" }`
  - Validación (400): `{ "timestamp", "status", "errors": { "campo": "mensaje" } }`
- UX: banner/toast con `message`; en formularios admin, mostrar los de `errors` debajo de cada campo.
- Network/API caída → mensaje de reintento ("Reintentar").

### Geolocalización
- Sin permisos → `GpsPermissionModal` (componente ya existente en `src/components/common/`):
  permitir, o continuar en modo manual. Los endpoints `nearby` fallan/usar sin coords.

### Caché / sin conexión
- `GET` de catálogo son idempotentes → cachear respuesta para degradación offline y menos llamadas.

---

## 6. Componentes Reutilizables Propuestos

Basado en los componentes ya presentes en `frontend/src/components/` (+ propostos).

| Componente | Fuente / proposito |
|---|---|
| `Header` | Logo + `SearchBar` global (existe) |
| `SearchBar` | Búsqueda → `GET routes/search`, `stops/search` (existe) |
| `Sidebar` / `TopBar` | Navegación admin |
| `BottomNav` | [Mapa] [Rutas] [Cercanos] (existe) |
| `InteractiveMap` | Mapa con polilínea + pins; soporta captura de clic para lat/long (existe) |
| `RouteCard` | Tarjeta de ruta: color, code, name, fare, línea, keyStops (existe) |
| `RouteDrawer` | Sheet con detalle superpuesto sobre el mapa (existe) |
| `GpsPermissionModal` | Solicitar ubicación (existe) |
| `CityPicker` | Selector de ciudad → `GET /cities` |
| `LinePicker` | Selector de línea → `GET /lines` o `/lines/city/:id` |
| `DirectionsTabs` | Tabs Ida/Vuelta + resumen distancia/tiempo |
| `StopList` | Paraderos ordenados: nombre, ref, ℹ accesibilidad |
| `Datalist` / `CRUDTable` | Tabla genérica admin + actions ✎/🗑 |
| `FormField`, `FormModal` | Campo con error de validación; modal/form genérico |
| `RouteMapEditor` | Editor de trazado para crear/editar rutas admin |
| `EmptyState`, `ErrorState`, `Skeleton`, `Toast` | Estados de UI comunes |

---

## 7. Notas de Integración / Pendientes de Decisión

1. **Base URL**: el frontend debe usar `http://localhost:8080/api` (no `/api/v1`).
   Configurable vía `VITE_API_BASE_URL`. CORS limita a origen `http://localhost:5173`.
2. **`POST nearby` requiere JWT** (`/api/routes/nearby` y `/api/stops/nearby`). Decisión:
   - La UX ciudadana espera usarlos sin login. Opciones:
     a) El frontend añade un token de servicio,
     b) El backend relaja esos endpoints a un `permitAll` público (por seguridad de la entidad
     ciudadana esto se recomienda evaluar / mover a `permitAll`).
   - Hasta decidirlo, tratar la respuesta 401 en "Cercanos".
3. **Desajuste Create vs Update de rutas**: el formulario de edición usa `UpdateRouteRequest`
   (sin direcciones) + `PUT /routes/{id}/directions`. El de alta usa `CreateRouteRequest`
   (direcciones anidadas).
4. **`isAccessible` → JSON `accessible`**: manejar el nombre del campo al tipar la respuesta.
5. **`status` field**: saneatrizar (ACTIVE/INACTIVE) para badges de línea/ruta.
6. **`keyStop` de tarjeta vs `stops` de detalle**: la tarjeta expone solo `keyStops` resumidos;
   el detalle trae `stops` completos. Usar el detalle para la lista completa de paraderos.
7. **Admin seed**: `admin@rutasya.pe` / `admin123` (creado por `DataInitializer`).

---

## 8. Checklist de Implementación Sugerido

- [ ] Fundamento: tipos (CreateRouteRequest, etc.) y clients en `src/services/`.
- [ ] Corregir `apiClient` a `/api` y añadir interceptor JWT para `/api/admin/**`.
- [ ] Home: mapa + `GET /routes/cards` + `RouteCard` + sheet/detalle.
- [ ] Búsqueda global (routes + stops) con debounce.
- [ ] Detalle de ruta: polilínea por `routePoints`, tabs Ida/Vuelta, `stops`.
- [ ] Cercanos: geolocalización + `POST nearby` (decidir token).
- [ ] Admin: login, guard de ruta, dashboard, CRUD genérico (ciudades/líneas/paraderos).
- [ ] Admin rutas: CRUD base + editor de direcciones con `MapEditor`.
- [ ] Estados de UI (loading/empty/error/offline) y toasts.