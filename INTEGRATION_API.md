# Documentación de Integración API — RutaYa

## Información General

| Item | Valor |
|---|---|
| **Base URL** | `http://localhost:8080/api` |
| **Autenticación** | JWT Bearer Token (solo admin) |
| **Formato** | JSON |
| **CORS** | Permitido desde origen `http://localhost:5173` (configurable en `.env`) |
| **Admin por defecto** | `admin@rutasya.pe` / `admin123` (seed de `DataInitializer`) |

> **Nota:** El frontend actual usa `/api/v1` en `apiClient.js`. Debe cambiarse a `/api` para coincidir con el backend.

### Reglas de seguridad (SecurityConfig)

| Regla | Alcance |
|---|---|
| `/api/auth/**` | Permitido sin token |
| `GET /api/**` | Permitido sin token |
| `/api/admin/**` | Requiere JWT autenticado (cualquier método) |
| Otros (p.ej. `POST /api/routes/nearby`, `POST /api/stops/nearby`) | Requiere JWT |

---

## Autenticación

### POST `/api/auth/admin/login`

Inicia sesión de administrador. Respuesta contiene token JWT y email.

**Request Body:**
```json
{
  "email": "admin@rutasya.pe",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "email": "admin@rutasya.pe"
}
```

**Errores:**
- `400` — Validación fallida (email inválido o campos vacíos)
- `401` — Credenciales incorrectas (manejado por Spring Security)

**Uso del token:** incluir en `Authorization: Bearer <token>` para todos los endpoints de `/api/admin/**`.

---

## Ciudades

### GET `/api/cities`

Lista todas las ciudades disponibles.

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Ica",
    "department": "Ica",
    "country": "Perú"
  }
]
```

---

## Líneas de Transporte

### GET `/api/lines`

Lista todas las líneas de transporte.

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "cityId": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Línea 1: Consorcio Urbano Ica",
    "code": "L1",
    "color": "#2563eb",
    "company": "Consorcio Urbano Ica",
    "contact": "01 234-5678",
    "description": "Descripción de la línea",
    "status": "ACTIVE"
  }
]
```

### GET `/api/lines/city/{cityId}`

Filtra líneas por ciudad. Misma estructura de respuesta que `GET /api/lines`.

---

## Paraderos (Stops)

### GET `/api/stops`

Lista todos los paraderos.

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Plaza de Armas de Ica",
    "latitude": -14.0678,
    "longitude": -75.7286,
    "reference": "Av. Municipalidad cdra 1",
    "address": "Av. Municipalidad cdra 1",
    "accessible": true
  }
]
```

### GET `/api/stops/{id}`

Obtiene un paradero por su ID. Misma estructura que el item anterior.

### GET `/api/stops/search?query=plaza`

Busca paraderos por nombre.

**Response (200):** array con la misma estructura que `GET /api/stops`.

### GET `/api/stops/{id}/routes`

Devuelve las rutas que pasan por ese paradero, **agrupadas por ruta** (una sola entrada por ruta). `directions` lista las direcciones servidas (`INBOUND`/`OUTBOUND`) y `directionLabel` es un derivado calculado en el service (nunca se persiste): `IDA`, `VUELTA` o `IDA Y VUELTA`.

**Response (200):**
```json
[
  {
    "id": "40000000-0000-4000-8000-000000000001",
    "code": "LIMA-01",
    "name": "Plaza de Armas – Miraflores (Parque Kennedy)",
    "color": "#2563eb",
    "directions": ["INBOUND", "OUTBOUND"],
    "directionLabel": "IDA Y VUELTA"
  }
]
```

**Errores:**
- `404` — Paradero no existe

---

## Rutas — Público

### GET `/api/routes/cards`

Lista de rutas en formato resumido, pensado para tarjetas UI. Incluye tarifa y paraderos clave.

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "R101",
    "name": "Ruta 101: Plaza de Armas - Huacachina",
    "color": "#2563eb",
    "fare": "S/ 1.50",
    "transportLineName": "Línea 1: Consorcio Urbano Ica",
    "keyStops": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "name": "Plaza de Armas de Ica",
        "latitude": -14.0678,
        "longitude": -75.7286
      }
    ]
  }
]
```

### GET `/api/routes/{id}`

Obtiene el detalle completo de una ruta, incluyendo direcciones, paraderos y puntos de ruta.

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "R101",
  "name": "Ruta 101: Plaza de Armas - Huacachina",
  "color": "#2563eb",
  "description": "Descripción de la ruta",
  "status": "ACTIVE",
  "fare": "S/ 1.50",
  "schedule": "06:00 - 21:00",
  "frequency": "Cada 15 min",
  "transportLineId": "550e8400-e29b-41d4-a716-446655440001",
  "transportLineName": "Línea 1: Consorcio Urbano Ica",
  "directions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "direction": "Ida",
      "originName": "Plaza de Armas",
      "destinationName": "Huacachina",
      "totalDistanceKm": 7.2,
      "estimatedMinutes": 25,
      "stops": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440020",
          "name": "Plaza de Armas de Ica",
          "latitude": -14.0678,
          "longitude": -75.7286,
          "reference": "Av. Municipalidad",
          "address": "Av. Municipalidad cdra 1",
          "accessible": true
        }
      ],
      "routePoints": [
        { "pointOrder": 1, "latitude": -14.0678, "longitude": -75.7286 },
        { "pointOrder": 2, "latitude": -14.0701, "longitude": -75.7310 }
      ]
    }
  ]
}
```

### GET `/api/routes/search?query=huacachina`

Busca rutas por nombre, código o línea. Respuesta en formato de tarjeta (igual que `GET /api/routes/cards`).

### GET `/api/routes/line/{transportLineId}`

Lista rutas de una línea de transporte específica. Respuesta en formato de tarjeta (igual que `GET /api/routes/cards`).

### GET `/api/routes/popular`

Rutas más populares para la sección **"Rutas populares"** de la pantalla principal. Devuelve hasta 10 rutas activas ordenadas por `popularityScore` desc. No requiere autenticación.

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "R101",
    "name": "Miraflores - Centro",
    "color": "#E8532E",
    "totalStops": 25,
    "popularityScore": 95
  }
]
```

---

## Rutas y Paraderos Cercanos

> **Nota:** `POST /api/stops/nearby` es público. `POST /api/routes/nearby` aún **requiere autenticación JWT** (Bearer token) según la configuración de seguridad actual.

### POST `/api/routes/nearby`

Encuentra rutas cercanas a unas coordenadas dadas. Respuesta en formato de tarjeta.

**Request Body:**
```json
{
  "latitude": -14.0678,
  "longitude": -75.7286,
  "radiusMeters": 1000.0
}
```

**Response (200):** array en formato de tarjeta (igual que `GET /api/routes/cards`).

### POST `/api/stops/nearby`

Encuentra paraderos cercanos a unas coordenadas dadas. **Público, no requiere JWT.**

**Request Body:**
```json
{
  "latitude": -14.0678,
  "longitude": -75.7286,
  "radiusMeters": 500.0
}
```

**Response (200):** array con la estructura de `GET /api/stops`.

---

## Administración (`/api/admin/**`)

> Todos los endpoints de este bloque requieren `Authorization: Bearer <token>`.

### Ciudades

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/admin/cities` | Lista ciudades |
| POST | `/api/admin/cities` | Crea ciudad |
| PUT | `/api/admin/cities/{id}` | Actualiza ciudad |
| DELETE | `/api/admin/cities/{id}` | Elimina ciudad (204 No Content) |

**Request (crear/actualizar):**
```json
{ "name": "Ica", "department": "Ica", "country": "Perú" }
```

**Response:** `CityResponse` (`id, name, department, country`).

### Líneas

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/admin/lines` | Lista líneas |
| POST | `/api/admin/lines` | Crea línea |
| PUT | `/api/admin/lines/{id}` | Actualiza línea |
| DELETE | `/api/admin/lines/{id}` | Elimina línea (204 No Content) |

**Request (crear):**
```json
{
  "cityId": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Línea 1",
  "code": "L1",
  "color": "#2563eb",
  "company": "Consorcio Urbano Ica",
  "contact": "01 234-5678",
  "description": "Descripción",
  "status": "ACTIVE"
}
```

**Request (actualizar):** igual que crear, pero sin `cityId`.

**Response:** `TransportLineResponse`.

### Paraderos

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/admin/stops` | Lista paraderos |
| POST | `/api/admin/stops` | Crea paradero |
| PUT | `/api/admin/stops/{id}` | Actualiza paradero |
| DELETE | `/api/admin/stops/{id}` | Elimina paradero (204 No Content) |

**Request (crear):**
```json
{
  "cityId": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Plaza de Armas",
  "latitude": -14.0678,
  "longitude": -75.7286,
  "reference": "Av. Municipalidad",
  "address": "Av. Municipalidad cdra 1",
  "isAccessible": true
}
```

**Request (actualizar):** igual que crear, pero sin `cityId`.

**Response:** `StopResponse` (en JSON el campo se serializa como `accessible`).

### Rutas

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/admin/routes` | Lista rutas (resumen tarjeta) |
| GET | `/api/admin/routes/{id}` | Detalle de ruta |
| POST | `/api/admin/routes` | Crea ruta (con direcciones) |
| PUT | `/api/admin/routes/{id}` | Actualiza datos base de la ruta |
| PUT | `/api/admin/routes/{id}/directions` | Actualiza direcciones (paraderos y polígono) |
| DELETE | `/api/admin/routes/{id}` | Elimina ruta (204 No Content) |

**POST `/api/admin/routes` — Request:** campos base + direcciones anidadas.
```json
{
  "transportLineId": "550e8400-e29b-41d4-a716-446655440001",
  "code": "R101",
  "name": "Ruta 101",
  "color": "#2563eb",
  "description": "Descripción",
  "fare": "S/ 1.50",
  "schedule": "06:00 - 21:00",
  "frequency": "Cada 15 min",
  "status": "ACTIVE",
  "directions": [
    {
      "direction": "Ida",
      "originName": "Plaza de Armas",
      "destinationName": "Huacachina",
      "totalDistanceKm": 7.2,
      "estimatedMinutes": 25,
      "stops": [
        { "stopId": "550e8400-e29b-41d4-a716-446655440020", "stopOrder": 1, "distanceFromStart": 0.0 }
      ],
      "routePoints": [
        { "pointOrder": 1, "latitude": -14.0678, "longitude": -75.7286 }
      ]
    }
  ]
}
```

**Response:** `RouteDetailResponse`.

**PUT `/api/admin/routes/{id}` — Request (sin direcciones):**
```json
{
  "code": "R101",
  "name": "Ruta 101 Act.",
  "color": "#2563eb",
  "description": "Descripción",
  "fare": "S/ 2.00",
  "schedule": "06:00 - 22:00",
  "frequency": "Cada 10 min",
  "status": "ACTIVE"
}
```
**Response:** `RouteSummaryResponse` (tarjeta).

**PUT `/api/admin/routes/{id}/directions` — Request:**
```json
{
  "directions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "direction": "Ida",
      "originName": "Plaza de Armas",
      "destinationName": "Huacachina",
      "totalDistanceKm": 7.2,
      "estimatedMinutes": 25,
      "stops": [
        { "id": "550e8400...", "stopId": "550e8400...", "stopOrder": 1, "distanceFromStart": 0.0 }
      ],
      "routePoints": [
        { "id": "550e8400...", "pointOrder": 1, "latitude": -14.0678, "longitude": -75.7286 }
      ]
    }
  ]
}
```
**Response:** `RouteDetailResponse`.

---

## Manejo de Errores

Todos los errores siguen este formato:

```json
{
  "timestamp": "2024-01-15T10:30:00",
  "status": 404,
  "message": "Recurso no encontrado"
}
```

| Código | Clase | Significado |
|---|---|---|
| `400` | `BadRequestException` / `MethodArgumentNotValidException` | Solicitud inválida o errores de validación |
| `401` | Spring Security | No autenticado / token inválido |
| `403` | Spring Security | Sin permiso |
| `404` | `ResourceNotFoundException` | Recurso no encontrado |
| `500` | `Exception` | Error interno del servidor |

### Error de validación (400)
```json
{
  "timestamp": "2024-01-15T10:30:00",
  "status": 400,
  "errors": {
    "email": "Must be a valid email address",
    "password": "Password is required"
  }
}
```

---

## Correcciones Necesarias en el Frontend

### 1. Base URL (`apiClient.js`)
```js
// Actual:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
// Corregido:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
```

### 2. Auth Service (`authService.js`)
Endpoint `/api/auth/admin/login`, campos `email`+`password`, respuesta `{token, email}`.

```js
const response = await apiClient.post('/auth/admin/login', { email, password });
const { token, email } = response.data;
localStorage.setItem(TOKEN_KEY, token);
localStorage.setItem(ADMIN_USER_KEY, JSON.stringify({ email, role: 'ROLE_ADMIN' }));
return { token, user: { email, role: 'ROLE_ADMIN' } };
```

Interceptores del `apiClient` deben adjuntar `Authorization: Bearer <token>` para `/admin/**`.

### 3. Servicios por crear/ajustar
- **Rutas:** usar `GET /routes/cards` para listado público y `GET /routes/search?query=` (hoy es client-side).
- **Rutas populares:** ya existe `routeService.getPopularRoutes()` → `GET /routes/popular`. Consumir en la pantalla principal para la sección "Rutas populares".
- **Rutas por paradero:** agregar en `stopService.js` una función `getStopRoutes(stopId)` → `GET /stops/{id}/routes`. Útil en el detalle de un paradero.
- **Nearby:** sustituir el cálculo client-side por `POST /routes/nearby` y `POST /stops/nearby`.
- **cityService:** `GET /cities`, `GET /lines/city/:id`.
- **Admin services:** `adminCityService`, `adminLineService`, `adminStopService`, `adminRouteService`
  apuntando a `/admin/**` con token.

### 4. Mock Data
- Los mocks actuales usan campos (`company`, `schedule`, `points[]`, `stops[]` en resumen) que **no** existen en los DTO públicos actuales.
- El resumen público trae `fare` y `keyStops[]`; `points` y `stops` viven dentro de `directions[]` en el detalle.

---

## Resumen de Endpoints por Módulo

| Módulo | Método | Endpoint | Autenticación |
|---|---|---|---|
| Auth | POST | `/api/auth/admin/login` | No |
| Ciudades | GET | `/api/cities` | No |
| Líneas | GET | `/api/lines` | No |
| Líneas | GET | `/api/lines/city/{cityId}` | No |
| Paraderos | GET | `/api/stops` | No |
| Paraderos | GET | `/api/stops/{id}` | No |
| Paraderos | GET | `/api/stops/search?query=` | No |
| Paraderos | GET | `/api/stops/{id}/routes` | No |
| Rutas | GET | `/api/routes/cards` | No |
| Rutas | GET | `/api/routes/popular` | No |
| Rutas | GET | `/api/routes/{id}` | No |
| Rutas | GET | `/api/routes/search?query=` | No |
| Rutas | GET | `/api/routes/line/{transportLineId}` | No |
| Cercano | POST | `/api/routes/nearby` | **Sí** (JWT) |
| Cercano | POST | `/api/stops/nearby` | No |
| Admin Ciudades | GET/POST/PUT/DELETE | `/api/admin/cities` y `/api/admin/cities/{id}` | **Sí** (JWT) |
| Admin Líneas | GET/POST/PUT/DELETE | `/api/admin/lines` y `/api/admin/lines/{id}` | **Sí** (JWT) |
| Admin Paraderos | GET/POST/PUT/DELETE | `/api/admin/stops` y `/api/admin/stops/{id}` | **Sí** (JWT) |
| Admin Rutas | GET/POST/PUT/DELETE | `/api/admin/routes` y `/api/admin/routes/{id}` | **Sí** (JWT) |
| Admin Rutas | PUT | `/api/admin/routes/{id}/directions` | **Sí** (JWT) |