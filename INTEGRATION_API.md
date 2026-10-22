# Documentación de Integración API — RutaYa (v2)

> **Actualización:** 17 de octubre de 2026. Fuente de verdad: código del backend (`backend/src/main/java/com/anthony/rutas/**`).
> Este documento es el **contrato de referencia** para QA e integraciones externas. La API está
> íntegramente consumida por el frontend actual (citizen + admin); ya no hay una lista de
> "correcciones pendientes" — lo que está acá es lo que existe.

## Información General

| Item | Valor |
|---|---|
| **Base URL (dev)** | `http://localhost:8080/api` |
| **Base URL (prod)** | `https://back.anthonywar.dev` (los endpoints mantienen el prefijo `/api`, p. ej. `https://back.anthonywar.dev/api/cities`) |
| **Formato** | JSON (única excepción: subida de imagen admin, `multipart/form-data`) |
| **Identidad pública** | Header `X-Device-Id` (comunidad; ver §Comunidad) |
| **Autenticación admin** | JWT Bearer Token (solo `/api/admin/**` y `GET /api/auth/me`) |
| **CORS** | `http://localhost:5173` y `https://front.anthonywar.dev` |
| **Admin por defecto (seed)** | `admin@rutasya.pe` / `admin123` (`DataInitializer`) |

### Reglas de seguridad (SecurityConfig)

Tal como está configurado hoy (`config/SecurityConfig.java`):

| Regla | Resultado |
|---|---|
| `GET /api/**` | Público (sin token) |
| `POST /api/stops/nearby`, `POST /api/routes/nearby` | Público (sin token) |
| `POST /api/community/**` y `DELETE /api/community/**` | Público (sin token; identidad por `X-Device-Id`) |
| `/api/auth/**` | Público, **salvo** `GET /api/auth/me` (autenticado) |
| `/api/admin/**` | JWT con role `ADMIN` (Bearer `Authorization: Bearer <token>`) |
| Cualquier otro request | Autenticado (hoy no hay endpoints ciudadanos que caigan acá) |

---

## Autenticación

### POST `/api/auth/admin/login`

Inicia sesión de administrador.

**Request Body:**
```json
{
  "email": "admin@rutasya.pe",
  "password": "admin123"
}
```

**Response (200):** `AuthResponse`
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "email": "admin@rutasya.pe",
  "role": "ROLE_ADMIN"
}
```

**Errores:**
- `400` — Validación fallida (email inválido o campos vacíos)
- `401` — Credenciales incorrectas (manejado por Spring Security)

**Uso del token:** incluir en `Authorization: Bearer <token>` para todos los endpoints de `/api/admin/**` y `GET /api/auth/me`.

### GET `/api/auth/me`

Valida la sesión guardada en cliente (ej. al refrescar el panel admin).

- Con token válido: `200` con `email` y `role` (el campo `token` no es un token nuevo).
- Sin token o token inválido: `401`.

```json
{
  "email": "admin@rutasya.pe",
  "role": "ROLE_ADMIN"
}
```

---

## Ciudades

### GET `/api/cities`

Lista todas las ciudades disponibles. La respuesta incluye las coordenadas del centro y el radio base en kilómetros (usado como default del cálculo de cercanía cuando no hay filtro de ciudad).

**Response (200):** array de `CityResponse`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Ica",
    "department": "Ica",
    "country": "Perú",
    "latitude": -14.0678,
    "longitude": -75.7286,
    "radiusKm": 30.0
  }
]
```

---

## Líneas de Transporte

### GET `/api/lines`

Lista todas las líneas de transporte.

**Response (200):** array de `TransportLineResponse`
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

`StopResponse` (usado por todos los endpoints de lectura pública):
`id, name, latitude, longitude, reference, address, accessible, cityId, cityName, imageUrl`
(en JSON el boolean se serializa como `accessible`; `imageUrl` llega `null` si el paradero no tiene foto).

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Plaza de Armas de Ica",
  "latitude": -14.0678,
  "longitude": -75.7286,
  "reference": "Av. Municipalidad cdra 1",
  "address": "Av. Municipalidad cdra 1",
  "accessible": true,
  "cityId": "550e8400-e29b-41d4-a716-446655440001",
  "cityName": "Ica",
  "imageUrl": "https://.../stops/<uuid>.jpg"
}
```

### GET `/api/stops`

Lista todos los paraderos (array de `StopResponse`).

### GET `/api/stops/{id}`

Obtiene un paradero por su ID (misma estructura).
- `404` — No existe.

### GET `/api/stops/search?query=plaza`

Busca paraderos por nombre. **Response (200):** array de `StopResponse`.

### GET `/api/stops/{id}/routes`

Devuelve las rutas que pasan por ese paradero, agrupadas por ruta (una sola entrada por ruta). `directions` lista las direcciones servidas (`INBOUND`/`OUTBOUND`) y `directionLabel` es derivado calculado en el service: `IDA`, `VUELTA` o `IDA Y VUELTA` (nunca se persiste).

**Response (200):** array de `StopRouteResponse`
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
- `404` — Paradero no existe.

### GET `/api/stops/nearby`

Encuentra paraderos cercanos por query params. **Público.**

**Query params:** `latitude` (obligatorio), `longitude` (obligatorio), `radiusMeters` (opcional, default `1000`).

```
GET /api/stops/nearby?latitude=-14.0678&longitude=-75.7286&radiusMeters=500
```

**Response (200):** array de `StopResponse`.

### POST `/api/stops/nearby`

Misma búsqueda por body JSON (`NearbySearchRequest`):

```json
{
  "latitude": -14.0678,
  "longitude": -75.7286,
  "radiusMeters": 500.0
}
```

Validación: `latitude` ∈ [-90, 90], `longitude` ∈ [-180, 180] (obligatorios), `radiusMeters` > 0 y ≤ 100000 (opcional, default `1000.0`). Fuera de rango → `400` con el formato de errores de validación.

**Response (200):** array de `StopResponse`.

---

## Rutas — Público

`RouteSummaryResponse` es el formato "tarjeta" usado por `cards`, `search`, `line/{id}` y `nearby`:
`id, code, name, color, fare, frequency, transportLineName, cityId, cityName, keyStops[]`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "R101",
  "name": "Ruta 101: Plaza de Armas - Huacachina",
  "color": "#2563eb",
  "fare": "S/ 1.50",
  "frequency": "Cada 15 min",
  "transportLineName": "Línea 1: Consorcio Urbano Ica",
  "cityId": "550e8400-e29b-41d4-a716-446655440001",
  "cityName": "Ica",
  "keyStops": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "name": "Plaza de Armas de Ica",
      "latitude": -14.0678,
      "longitude": -75.7286
    }
  ]
}
```

### GET `/api/routes/cards`

Lista de rutas en formato tarjeta. Acepta filtro opcional `cityId`.

```
GET /api/routes/cards?cityId=550e8400-e29b-41d4-a716-446655440001
```

**Response (200):** array de `RouteSummaryResponse`.

### GET `/api/routes/popular`

Rutas más populares para la sección **"Rutas populares"** de la pantalla principal. Hasta 10 rutas activas ordenadas por `popularityScore` desc. Acepta filtro opcional `cityId`.

**Response (200):** array de `PopularRouteResponse`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "R101",
  "name": "Miraflores - Centro",
  "color": "#E8532E",
  "totalStops": 25,
  "popularityScore": 95,
  "cityId": "550e8400-e29b-41d4-a716-446655440001",
  "cityName": "Ica"
}
```

### GET `/api/routes/{id}`

Detalle completo de una ruta. **Ojo:** en el detalle, la línea y el horario viajan anidados (`transportLine`, `schedule`), no como campos planos; los `routePoints` son pares `[lat, lng]`.

**Response (200):** `RouteDetailResponse`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "R101",
  "name": "Ruta 101: Plaza de Armas - Huacachina",
  "color": "#2563eb",
  "description": "Descripción de la ruta",
  "status": "ACTIVE",
  "fare": "S/ 1.50",
  "transportLine": { "id": "550e8400-e29b-41d4-a716-446655440001", "name": "Línea 1: Consorcio Urbano Ica" },
  "schedule": { "hours": "06:00 - 21:00", "frequency": "Cada 15 min" },
  "directions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "direction": "INBOUND",
      "originName": "Plaza de Armas",
      "destinationName": "Huacachina",
      "totalDistanceKm": 7.2,
      "estimatedMinutes": 25,
      "stops": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440020",
          "name": "Plaza de Armas de Ica",
          "location": { "latitude": -14.0678, "longitude": -75.7286 },
          "reference": "Av. Municipalidad",
          "address": "Av. Municipalidad cdra 1",
          "accessible": true,
          "stopOrder": 1,
          "distanceFromStart": 0.0
        }
      ],
      "routePoints": [[-14.0678, -75.7286], [-14.0701, -75.7310]]
    }
  ]
}
```
- `404` — Ruta no existe.

### GET `/api/routes/search`

Búsqueda de rutas por nombre, código o línea. Insensible a mayúsculas y acentos (normalización sin diacríticos), con rankeo por relevancia.

**Query params:** `query` (obligatorio), `cityId` (opcional), `size` (opcional, default `50`, se acota a rango 1..100).

```
GET /api/routes/search?query=huacachina&cityId=...&size=20
```

**Response (200):** array de `RouteSummaryResponse` ordenado por relevancia.

### GET `/api/routes/line/{transportLineId}`

Lista rutas de una línea específica. **Response (200):** array de `RouteSummaryResponse`.

### GET `/api/routes/nearby`

Encuentra rutas cercanas por query params. **Público** (ya no requiere JWT).

**Query params:** `latitude` (obligatorio), `longitude` (obligatorio), `radiusMeters` (opcional, default `1500`).

```
GET /api/routes/nearby?latitude=-14.0678&longitude=-75.7286&radiusMeters=1500
```

**Response (200):** array de `RouteSummaryResponse`.

### POST `/api/routes/nearby`

Misma búsqueda por body JSON (mismo `NearbySearchRequest` que `POST /api/stops/nearby`; default local `1000.0`). Validaciones idénticas.

```json
{
  "latitude": -14.0678,
  "longitude": -75.7286,
  "radiusMeters": 1000.0
}
```

**Response (200):** array de `RouteSummaryResponse`.

---

## Geocodificación Inversa

### GET `/api/geocode/reverse`

Traduce coordenadas a una dirección legible. Funciona con dos proveedores en cascada: Google primero, Photon como fallback; el campo `source` indica quién respondió (`google` o `photon`).

**Query params:** `lat` (opcional en el binding), `lng` (opcional en el binding). Los params ausentes o inválidos caen en el servicio y se converten en `400` (no en error 500 de parametro faltante).

```
GET /api/geocode/reverse?lat=-14.0678&lng=-75.7286
```

**Response (200):** `ReverseGeocodeResponse`
```json
{
  "formattedAddress": "Av. Municipalidad, Ica, Perú",
  "street": "Av. Municipalidad",
  "streetNumber": "1",
  "district": "Ica",
  "city": "Ica",
  "source": "google"
}
```

**Comportamiento interno (no es parte del contrato, explica los tiempos):** cache local de ~100 m sobre coordenadas con TTL 30 días; cuota diaria de llamadas externas limitada a 1000 en memoria. Si se supera la cuota, el request puede caer en Photon o responder desde cache.

**Errores:**
- `400` — `lat`/`lng` ausentes o fuera de rango.
- `503` — Google y Photon caídos (handler propio del controller; mismo shape de error JSON del GlobalExceptionHandler con `message` explicativo).

---

## Comunidad

Endpoints públicos usados por la pantalla ciudadano `CommunityPage.jsx`. La identidad del usuario es el header `X-Device-Id` (sin JWT, sin registro).

### Header `X-Device-Id` — contrato

- Sirve como identidad anónima: pertenece a `ownedByMe`, `likedByMe`, límite antifraude y, si el usuario desaparece el header, se computa `ownedByMe=false` / `likedByMe=false` en lecturas.
- Cadena de 1 a 64 chars según validación del backend; sobre 64 el backend **trunca** (no rechaza), es decir, el máximo efectivo es 64. Envía siempre el mismo valor por dispositivo (el frontend lo persiste con `getOrCreateDeviceId()`).
- Escrituras (postear, like, comentar, borrar propio) lo exigen: inválido (ausente, vacío o < 6 chars) → `400` con mensaje `"Identificador de dispositivo inválido (X-Device-Id)"`.

### Anti-spam (todas las escrituras responden con `400`)

| Mecanismo | Detección | Respuesta |
|---|---|---|
| Cooldown | Máximo 1 escritura por dispositivo cada 8 segundos (ventana en memoria con TTL) | `400` con indicación de cooldown |
| Honeypot | Campo oculto `website` del request llega con contenido | `400` `"No se pudo procesar la solicitud."` |
| Lenguaje | Palabras prohibidas en `authorAlias`, `content` de post o comentario, menor a normalización: lowercase + sin acentos + split por caracteres no alfanuméricos | `400` con detalle del campo ofensor |

- No hay HTTP `429` ni `409`: la velocidad y el contenido se señalizan con `400` + mensaje. El cliente debería igualmente cachear el cooldown de 8 s en UI (counter) para no spamear la red.

### Enum `PostCategory`

Valores válidos (mayúsculas): `ALERTA`, `PREGUNTA`, `RECOMENDACION`, `OBJETOS_PERDIDOS`.

### Usuario (community posts)

`CommunityPostResponse`:
```json
{
  "id": "f0000000-0000-4000-8000-000000000001",
  "authorAlias": "BuscandoRuta",
  "category": "ALERTA",
  "content": "Control policial en el cruce",
  "likesCount": 3,
  "commentsCount": 2,
  "likedByMe": false,
  "ownedByMe": true,
  "createdAt": "2026-10-15T18:30:00",
  "routeId": "40000000-0000-4000-8000-000000000001",
  "routeCode": "R101",
  "routeName": "Ruta 101",
  "routeColor": "#2563eb",
  "lineId": "50000000-0000-4000-8000-000000000001",
  "lineName": "Línea 1",
  "lineCode": "L1",
  "cityId": "550e8400-e29b-41d4-a716-446655440001",
  "cityName": "Ica"
}
```
El contexto de ruta/línea/ciudad viaja `null` cuando no aplica.

### GET `/api/community/posts`

Lista paginada de publicaciones, con filtros.

**Query params:** `category` (enum), `routeId`, `cityId`, `limit` (1..60, default `20`), `page` (0..1000, default `0`), `sort` (`recent` | `popular`, default `recent`).

**Header:** `X-Device-Id` (opcional; recomendado para `ownedByMe`/`likedByMe`).

**Response (200):** array de `CommunityPostResponse` (sin envelope de paginación: el cliente pagina incrementando `page`).

### POST `/api/community/posts`

Crea publicación. **Header:** `X-Device-Id` (obligatorio). **Response `201`** con el post creado (`CommunityPostResponse`).

**Request Body:**
```json
{
  "authorAlias": "BuscandoRuta",
  "category": "ALERTA",
  "content": "Control policial en el cruce",
  "routeId": "40000000-0000-4000-8000-000000000001",
  "cityId": "550e8400-e29b-41d4-a716-446655440001"
}
```

Validaciones: `authorAlias` 2–40 chars; `category` requerida (enum); `content` 4–600 chars; `routeId`/`cityId` opcionales (deben existir si van). El campo `website` es un honeypot: los clientes legítimos no deben enviarlo (o van vacío). Anti-spam aplica (sección arriba).

### DELETE `/api/community/posts/{id}`

Elimina una publicación propiedad del header `X-Device-Id`. **Response: `204`** sin body. Si el post no existe → `404`; si es de otro dispositivo → `400` con mensaje claro.

### POST `/api/community/posts/{id}/like`

Toggle de like para el dispositivo. Devuelve `200` con el post actualizado (`CommunityPostResponse`, con `likedByMe` y `likesCount` resultantes).

**Header:** `X-Device-Id` (obligatorio). No hay endpoint de "unlike" separado: re-llamar al mismo endpoint retira el like. `404` si el post no existe.

### GET `/api/community/posts/{id}/comments`

Lista comentarios del post. **Header:** `X-Device-Id` opcional (para `ownedByMe`).

**Response (200):** array de `CommunityCommentResponse`
```json
{
  "id": "60000000-0000-4000-8000-000000000001",
  "postId": "f0000000-0000-4000-8000-000000000001",
  "authorAlias": "Ana",
  "content": "Yo también vi eso",
  "ownedByMe": true,
  "createdAt": "2026-10-15T19:10:00"
}
```

### POST `/api/community/posts/{id}/comments`

Comenta un post. **Header:** `X-Device-Id` (obligatorio). **Response `201`** con `CommunityCommentResponse`.

**Request Body:**
```json
{
  "authorAlias": "Ana",
  "content": "Yo también vi eso"
}
```

Validaciones: `authorAlias` 2–40; `content` 2–400; honeypot `website` (opcional, vacío). Anti-spam aplica. `404` si el post no existe.

### DELETE `/api/community/comments/{id}`

El autor del comentario (por `X-Device-Id`) lo elimina. **Response: `204`**. `404` si no existe, `400` si no le pertenece.

### GET `/api/community/routes/{routeId}/summary`

Resumen de actividad de comunidad para una ruta específica (usado en RouteDrawer).

**Response (200):** `RouteCommunitySummaryResponse`
```json
{
  "routeId": "40000000-0000-4000-8000-000000000001",
  "totalPostsCount": 12,
  "activeAlertsCount": 3,
  "latestPost": { /* CommunityPostResponse o null */ }
}
```

---

## Administración (`/api/admin/**`)

Todos los endpoints de este bloque requieren `Authorization: Bearer <token>` con role `ADMIN`.

### Ciudades

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/admin/cities` | Lista ciudades |
| POST | `/api/admin/cities` | Crea ciudad |
| PUT | `/api/admin/cities/{id}` | Actualiza ciudad |
| DELETE | `/api/admin/cities/{id}` | Elimina ciudad (204 No Content) |

**Request (crear/actualizar):**
```json
{
  "name": "Ica",
  "department": "Ica",
  "country": "Perú",
  "latitude": -14.0678,
  "longitude": -75.7286,
  "radiusKm": 30.0
}
```
- `name` y `department` obligatorios; `country` default `"Perú"` si se omite; `latitude`/`longitude` validadas en rango; `radiusKm` default `30.0` (fallback del cálculo de cercanía).

**Response:** `CityResponse` con todos los campos (igual que la sección pública).

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

**Response:** `StopResponse` (en JSON el boolean se serializa como `accessible`; incluye `imageUrl`).

### Imágenes de paradero (Nueva, V8)

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/admin/stops/{id}/image` | Sube/actualiza la foto del paradero (`multipart/form-data`) |
| DELETE | `/api/admin/stops/{id}/image` | Quita la foto (`imageUrl` queda `null`) |

**POST** — multipart con el campo `file`:
```bash
curl -X POST https://back.anthonywar.dev/api/admin/stops/{id}/image \
  -H "Authorization: Bearer <token>" \
  -F "file=@foto-paradero.jpg"
```

Procesamiento en memoria del backend (lo que recibe el cliente es la imagen ya optimizada, no la foto original):
- **Entrada:** archivo decodificable por ImageIO (en la práctica JPEG/PNG/GIF/BMP), ≤ 2 MB y ≤ 25 MP de header; vacío o corrupto → `400`.
- **Salida:** JPEG calidad 0.8, transparencia aplanada a blanco, lado más largo reducido a máx. 1024 px (nunca se agranda).
- **Response (200):** `StopResponse` con `imageUrl` apuntando al bucket (el backend re-encodea a JPEG y sube un archivo nuevo).
- **DELETE (200):** `StopResponse` con `imageUrl` `null`. Idempotente: borrar dos veces funciona.
- `503` — almacenamiento de archivos no configurado (`SUPABASE_URL` / `SUPABASE_SERVICE_KEY` ausentes); handler propio del controller.

### Rutas

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/admin/routes` | Lista rutas en resumen admin |
| GET | `/api/admin/routes/{id}` | Detalle de ruta |
| POST | `/api/admin/routes` | Crea ruta (con direcciones) |
| PUT | `/api/admin/routes/{id}` | Actualiza datos base de la ruta |
| PUT | `/api/admin/routes/{id}/directions` | Actualiza direcciones (paraderos y puntos) |
| DELETE | `/api/admin/routes/{id}` | Elimina ruta (204 No Content) |

**GET `/api/admin/routes` — Response (200):** array de `AdminRouteSummaryResponse` con todos los scalares que la tabla admin y el formulario de edición necesitan (sin `keyStops` para evitar N+1):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "R101",
  "name": "Ruta 101",
  "color": "#2563eb",
  "fare": "S/ 1.50",
  "schedule": "06:00 - 21:00",
  "frequency": "Cada 15 min",
  "description": "Descripción",
  "status": "ACTIVE",
  "transportLineId": "550e8400-e29b-41d4-a716-446655440001",
  "transportLineName": "Línea 1: Consorcio Urbano Ica"
}
```

**POST `/api/admin/routes` — Request:** campos base + direcciones anidadas. **Response:** `RouteDetailResponse`.
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
      "direction": "INBOUND",
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
**Response:** `AdminRouteSummaryResponse` (resumen admin — *no* la tarjeta pública con paraderos clave).

**PUT `/api/admin/routes/{id}/directions` — Request:** direcciones completas (replaces). Para cada dirección existente puede ir `id`; para nueva, `id` ausente. **Response:** `RouteDetailResponse`.

### Comunidad — Moderación

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/admin/community/posts` | Lista publicaciones (top 100 más recientes, **sin filtros**) |
| DELETE | `/api/admin/community/posts/{id}` | Elimina la publicación (204 No Content) |
| DELETE | `/api/admin/community/comments/{id}` | Elimina el comentario (204 No Content) |

- El listado admin es fijo (página 0, tamaño 100, recientes): la búsqueda por texto o filtros se maneja en la UI del panel, no en la API.
- Los deletes **no** respetan propiedad: cualquier admin borra cualquier post/comentario.

---

## Convenciones y Límites

| Convención | Detalle |
|---|---|
| IDs | UUIDs (serialización estándar)`
| Timestamps | `LocalDateTime` ISO (`yyyy-MM-ddTHH:mm:ss`), zona del servidor (hoy UTC) sin sufijo `Z` |
| Paginación comunidad | Sin envelope: array plano; el cliente envía `page` incremental |
| Rangos | nearby radius 0–100000 m (default stop GET 1000 / route GET 1500 / POST 1000); buscar rutas `size` 1–100 (default 50); posts `limit` 1–60 (default 20), `page` 0–1000 |
| Anti-spam | Cooldown 8 s por dispositivo; honeypot `website` vacío; sin 429/409, todo `400` |
| Multipart | Única excepción JSON-only: subida de imagen admin |
| Errores "operativos" | `503` para dependencias caídas (geocode dual-provider down, storage de imágenes deshabilitado) |

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
| `400` | `BadRequestException` / `MethodArgumentNotValidException` | Solicitud inválida o errores de validación (también: anti-spam, borrar recurso ajeno, imagen inválida, identificador inválido) |
| `401` | Spring Security | No autenticado / token inválido (login fallido, `GET /api/auth/me` sin sesión) |
| `403` | Spring Security | Sin permiso (endpoint admin sin role `ADMIN`) |
| `404` | `ResourceNotFoundException` | Recurso no encontrado |
| `500` | `Exception` | Error interno del servidor |
| `503` | Handlers de `GeocodingController` y `AdminStopController` | Dependencia caída (Google+Photon fuera de servicio; storage de imágenes deshabilitado) |

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

## Resumen de Endpoints por Módulo

| Módulo | Método | Endpoint | Autenticación |
|---|---|---|---|
| Auth | POST | `/api/auth/admin/login` | No |
| Auth | GET | `/api/auth/me` | **Sí** (JWT) |
| Ciudades | GET | `/api/cities` | No |
| Líneas | GET | `/api/lines` | No |
| Líneas | GET | `/api/lines/city/{cityId}` | No |
| Paraderos | GET | `/api/stops` | No |
| Paraderos | GET | `/api/stops/{id}` | No |
| Paraderos | GET | `/api/stops/search?query=` | No |
| Paraderos | GET/POST | `/api/stops/nearby` | No |
| Paraderos | GET | `/api/stops/{id}/routes` | No |
| Rutas | GET | `/api/routes/cards` | No |
| Rutas | GET | `/api/routes/popular` | No |
| Rutas | GET | `/api/routes/{id}` | No |
| Rutas | GET | `/api/routes/search` | No |
| Rutas | GET | `/api/routes/line/{transportLineId}` | No |
| Rutas | GET/POST | `/api/routes/nearby` | **No** (antes requería JWT; ahora público) |
| Geocode | GET | `/api/geocode/reverse` | No |
| Comunidad | GET | `/api/community/posts` | No (`X-Device-Id` opcional) |
| Comunidad | POST | `/api/community/posts` | No (`X-Device-Id` obligatorio) |
| Comunidad | DELETE | `/api/community/posts/{id}` | No (`X-Device-Id` del autor) |
| Comunidad | POST | `/api/community/posts/{id}/like` | No (`X-Device-Id` obligatorio) |
| Comunidad | GET/POST | `/api/community/posts/{id}/comments` | POST exige `X-Device-Id`; GET opcional |
| Comunidad | DELETE | `/api/community/comments/{id}` | No (`X-Device-Id` del autor) |
| Comunidad | GET | `/api/community/routes/{routeId}/summary` | No (`X-Device-Id` opcional) |
| Admin Ciudades | GET/POST/PUT/DELETE | `/api/admin/cities` y `/api/admin/cities/{id}` | **Sí** (JWT admin) |
| Admin Líneas | GET/POST/PUT/DELETE | `/api/admin/lines` y `/api/admin/lines/{id}` | **Sí** (JWT admin) |
| Admin Paraderos | GET/POST/PUT/DELETE | `/api/admin/stops` y `/api/admin/stops/{id}` | **Sí** (JWT admin) |
| Admin Imágenes | POST/DELETE | `/api/admin/stops/{id}/image` | **Sí** (JWT admin) |
| Admin Rutas | GET/POST/PUT/DELETE | `/api/admin/routes` y `/api/admin/routes/{id}` | **Sí** (JWT admin) |
| Admin Rutas | PUT | `/api/admin/routes/{id}/directions` | **Sí** (JWT admin) |
| Admin Comunidad | GET/DELETE | `/api/admin/community/posts` y deletes de post/comentario | **Sí** (JWT admin) |
