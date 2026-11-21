# QRuta

Plataforma de transporte urbano para ciudades del Perú. Combina un catálogo ciudadano sin registro con un panel administrativo y un portal de operadores, más una capa de plataforma: QR inteligente, analítica de rutas, suscripciones/facturación y una API de licenciamiento de datos.

Cubre los modos `MICRO` y `COMBI`, con datos semilla de Lima, Ica, Huánuco, Chincha y Huancayo. Es un monorepo: la API REST está en `backend/` y la SPA en `frontend/`.

**Sitio oficial:** https://qruta.app

> La marca del producto es **QRuta**. El código conserva identificadores históricos (`rutasya` en el `pom.xml` y en los emails seed `@...rutasya.pe`, paquete `com.anthony.rutas`, nombre de job `rutas`); son nombres técnicos heredados, no el nombre del sitio.

## Inicio rápido

```bash
# 1. Base de datos vacía con PostGIS
createdb rutas

# 2. Backend: configurar .env y migrations automáticas
cd backend
cp .env.example .env          # completar DB_URL, DB_USERNAME, DB_PASSWORD y JWT_SECRET
FLYWAY_ENABLED=true ./mvnw spring-boot:run

# 3. Frontend
cd ../frontend
cp .env.example .env.local    # VITE_CARTO_KEY es recomendable para ver el basemap
pnpm install
pnpm dev
```

Verificación: `curl http://localhost:8080/api/cities` devuelve un JSON (lista vacía si aún no hay seed) y la SPA abre en `http://localhost:5173`. Para cargar datos de demostración, ver [Datos de ejemplo](#datos-de-ejemplo-opcional).

## Superficies del producto

| Superficie | Audiencia | Acceso | Qué permite |
| --- | --- | --- | --- |
| Portal ciudadano | Ciudadanos | Sin cuenta | Buscar rutas y paraderos, ver recorridos en el mapa, tarifas y horarios, guardar favoritos y lugares en el dispositivo, participar en la comunidad y escanear QR (`/q/:code`) |
| Panel administrativo | Administradores `ADMIN` | JWT | CRUD de ciudades, líneas, rutas y paraderos; alta de operadores y sus usuarios; QR codes; analítica global; moderación de comunidad; cierre mensual de facturación |
| Portal de operadores | Empresas `OPERATOR` | JWT | Administrar sus líneas, rutas y paraderos; publicar desvíos; generar y ver QR codes; consultar analítica; gestionar la suscripción |
| API de datos | Clientes B2B/B2G | `X-Api-Key` | Cobertura por ciudad y matriz OD (`/api/data/v1/*`) |
| Plataforma | Máquinas / clientes | Endpoints públicos con validación propia | Ingesta de eventos de analítica, webhook de facturación, exportación GTFS, resolución de QR |

### Rutas de la SPA

- **Ciudadanas:** `/`, `/buscar`, `/cercanas`, `/mapa`, `/mapa/ruta/:id`, `/mapa/paradero/:id`, `/q/:code`, `/rutas`, `/comunidad`, `/lugares`.
- **Administrativas:** `/admin/overview`, `/admin/rutas`, `/admin/lineas`, `/admin/paraderos`, `/admin/ciudades`, `/admin/operadores`, `/admin/qr-codes`, `/admin/comunidad`.
- **De operador:** `/operador/overview`, `/operador/lineas`, `/operador/rutas`, `/operador/paraderos`, `/operador/desvios`, `/operador/qr-codes`, `/operador/analitica`, `/operador/suscripcion`.

Alias legacy `/ruta/:id` y `/paradero/:id` redirigen a las rutas del mapa; `/favoritos` redirige a `/lugares?tab=rutas`.

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | Java 21, Spring Boot 3.3.5, Spring Security + JWT (jjwt 0.12.6), Spring Data JPA, Hibernate Spatial, Flyway, Caffeine, Lombok, Actuator |
| Base de datos | PostgreSQL con PostGIS (geometrías e índices GiST) y `unaccent` (búsqueda sin tildes) |
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Leaflet + react-leaflet + leaflet-geosearch, Lucide, Zod, Axios |
| Tests | JUnit 5 + Mockito (backend, con H2 y PostgreSQL de prueba), Vitest + Testing Library (frontend) |
| Imágenes de paraderos | Supabase Storage (opcional; sin configurar, la función devuelve 503) |
| Pagos | Proveedor `simulated` por defecto (`PAYMENT_PROVIDER`), webhook firmado |

## Estructura del repositorio

```text
qruta-app/
├── backend/
│   ├── src/main/java/com/anthony/rutas/
│   │   ├── billing/            Suscripciones, facturación, cierre mensual, webhook
│   │   ├── config/             Seguridad, CORS, spatial, seed inicial, job de analítica
│   │   ├── controllers/        Endpoints públicos, de operador y admin/ (admin)
│   │   ├── dtos/               Request/response con validación (request/, response/)
│   │   ├── entities/           Modelo JPA (catálogo, comunidad, QR, analítica, billing, licencias)
│   │   ├── exceptions/         Manejo global de errores
│   │   ├── mappers/            Map declarativo a DTO
│   │   ├── repositories/       Spring Data + consultas espaciales nativas
│   │   ├── security/           JWT, filtro, UserDetails, scope de operador
│   │   ├── services/           Lógica de negocio, geocoding, GTFS, QR, analítica, storage
│   │   └── utils/              Slugs canónicos para paraderos
│   └── src/main/resources/
│       ├── application*.properties
│       └── db/                 Migración Flyway V1 y seed manual
└── frontend/
    └── src/
        ├── assets/branding/    Logotipos y símbolos
        ├── components/         UI por dominio (admin, common, community, home, map, operator, routes, search, stops)
        ├── constants/          Marca y departamentos del Perú
        ├── contexts/           Estado global de rutas y ciudades
        ├── hooks/              Favoritos, lugares, geolocalización, identidad, toast
        ├── layouts/            Citizen, Admin y Operator
        ├── pages/              Vistas ciudadanas, admin/ y operator/
        ├── routes/             Definición de rutas y guardas de acceso
        ├── schemas/            Validación con Zod
        ├── services/           Cliente Axios y servicios por dominio
        └── utils/              Adaptadores, caché, QR, fechas, geo, share, scheduler
```

## Requisitos

- JDK 21
- pnpm (el lockfile versionado es `pnpm-lock.yaml`)
- PostgreSQL 15 o superior con PostGIS disponible
- Opcional: proyecto de Supabase para subida de imágenes de paraderos
- Opcional: API key de CARTO para el basemap (sin key los tiles salen en blanco)

## Puesta en marcha

### 1. Base de datos

Flyway controla el esquema. Hay una sola migración, `backend/src/main/resources/db/migration/V1__initial_schema.sql`, que crea las extensiones `postgis` y `unaccent`, las tablas (catálogo, comunidad, operadores, QR, analítica, facturación y licencias), los índices GiST y las constraints. Con `FLYWAY_ENABLED=true`, una base vacía queda construida al arrancar el backend:

```bash
createdb rutas
cd backend
FLYWAY_ENABLED=true DB_URL=jdbc:postgresql://127.0.0.1:5432/rutas ./mvnw spring-boot:run
```

`db/baseline/schema.sql` es una copia de referencia del mismo esquema: sirve para inspeccionarlo o restaurarlo sin arrancar la aplicación. `db/baseline/README.md` explica cómo regenerarla y cómo cargar catálogo sin copiar datos de usuarios.

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Completar como mínimo:

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` apuntando a la base local.
- `JWT_SECRET` con al menos 32 bytes aleatorios: `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`.

Luego `./mvnw spring-boot:run` (o `mvnw.cmd spring-boot:run` en Windows). La API queda en `http://localhost:8080/api`. El perfil activo por defecto es `local`.

#### Configuración: una sola fuente

Toda la configuración local vive en `backend/.env`. No hay `application-local.properties`: si existiera, pisaría en silencio las variables del `.env` y un clon nuevo se comportaría distinto. El perfil `local` existe como selector, pero no aporta valores por sí mismo (`spring.config.import=optional:file:.env[.properties]`).

Precedencia, de menor a mayor:

1. Valor por defecto declarado en `application.properties` (`${VAR:default}`).
2. `backend/.env`.
3. Archivos por perfil, como `application-prod.properties` (solo con ese perfil activo).
4. Variables de entorno del sistema, que siempre ganan.

Si un cambio en `.env` no tiene efecto, revisar primero las variables de entorno del sistema: son la causa más frecuente.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

La SPA queda en `http://localhost:5173`, origen ya permitido por el CORS del backend. En producción, Vercel publica la SPA y redirige `/api/*` y `/q/*` al backend, de modo que frontend y API comparten origen.

### Datos de ejemplo (opcional)

`backend/src/main/resources/db/seed/seed_data.sql` reemplaza todo el catálogo: ciudades, líneas, rutas, paraderos, vehículos, operadores y sus usuarios, suscripciones activas, facturación, licencias de datos, QR codes, desvíos oficiales, change logs, comunidad y 30 días de analítica. Es un script manual y destructivo: no se ejecuta automáticamente y **nunca** debe correrse sobre una base con datos reales.

```bash
psql -d rutas -f backend/src/main/resources/db/seed/seed_data.sql
```

Accesos de demo (solo local):

| Rol | Credencial |
| --- | --- |
| Admin | `admin@rutasya.pe` / `Admin123!` |
| Operadores | `operador.66bbee27@rutasya.pe`, `operador.32109707@rutasya.pe`, `operador.38d86457@rutasya.pe` |

Las contraseñas de operadores son hashes aleatorios: se cambian desde el panel admin (Operadores > Usuarios > Reset password).

### Verificación

- `curl http://localhost:8080/api/cities` → listado de ciudades.
- `GET /api/admin/analytics/overview` con token `ADMIN` → métricas (vacías sin seed).
- `/operador/login` → acceso al portal de operadores con un usuario sembrado y su password reseteada.

## Variables de entorno

### Backend (`backend/.env.example`)

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DB_URL` | Sí | URL JDBC de PostgreSQL (sin default: falla el arranque si falta) |
| `DB_USERNAME` / `DB_PASSWORD` | Sí | Credenciales de base de datos |
| `JWT_SECRET` | Sí | Clave HMAC de al menos 32 bytes aleatorios |
| `JWT_EXPIRATION_MS` | No | Vida del token; por defecto 24 h |
| `PORT` | No | Puerto del servidor; Cloud Run lo inyecta, local usa 8080 |
| `CORS_ALLOWED_ORIGINS` | No | Orígenes permitidos, separados por coma |
| `SPRING_PROFILES_ACTIVE` | No | `local` (por defecto) o `prod` |
| `JPA_DDL_AUTO` / `FLYWAY_ENABLED` | No | Control del esquema; no usar `update` en producción |
| `JPA_SHOW_SQL` / `JPA_FORMAT_SQL` | No | Logging de SQL; apagado por defecto |
| `APP_SEED_ENABLED` | No | Habilita fixtures de desarrollo y admin inicial |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | No | Admin inicial; sin password no se crea |
| `GOOGLE_MAPS_API_KEY` / `GEOCODE_DAILY_QUOTA` | No | Geocodificación inversa; vacío usa solo Photon. Tope diario, 1000 por defecto |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | No | Habilitan subida de imágenes de paraderos |
| `SUPABASE_STORAGE_BUCKET` | No | Bucket de imágenes; por defecto `stop-images` |
| `APP_ANALYTICS_SALT` | No | Salt diario para deduplicación de eventos; cae a `JWT_SECRET` si está vacío |
| `APP_ANALYTICS_RUN_AGGREGATION` | No | Agrega el día anterior una vez al arrancar (job CLI) |
| `APP_FRONTEND_URL` / `APP_BACKEND_URL` | No | URLs canónicas para QR y links absolutos |
| `PAYMENT_PROVIDER` | No | `simulated` por defecto |
| `BILLING_WEBHOOK_SECRET` | No | Verificación de firma del webhook de facturación |

### Frontend (`frontend/.env.example`)

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Sí | Base de la API; por defecto `http://localhost:8080/api` |
| `VITE_CARTO_KEY` | No | Key de tiles CARTO; sin ella el basemap no se dibuja |
| `VITE_CARTO_STYLE` | No | Estilo del basemap; por defecto `light_all` |
| `VITE_CARTO_MAX_ZOOM` | No | Zoom máximo del estilo raster; por defecto 19 |
| `VITE_USE_MOCK` | No | Documentada en la plantilla, pero hoy no se consume en el código |

Ningún valor del frontend es secreto: todo lo que empieza con `VITE_` termina en el bundle del navegador.

## API

La colección Postman está en `backend/RutasYa_API.postman_collection.json`. El contrato detallado está en `INTEGRATION_API.md`.

### Pública / ciudadana

| Dominio | Endpoints |
| --- | --- |
| Ciudades y líneas | `GET /api/cities`, `/api/lines`, `/api/lines/city/{cityId}` |
| Rutas | `GET /api/routes/cards`, `/popular`, `/{identifier}`, `/search`, `/line/{transportLineId}`, `/nearby`; `POST /api/routes/nearby` |
| Paraderos | `GET /api/stops`, `/{idOrSlug}`, `/{idOrSlug}/routes`, `/search`, `/nearby`; `POST /api/stops/nearby` |
| Geocodificación | `GET /api/geocode/reverse` |
| GTFS | `GET /api/gtfs/{citySlug}.zip` |
| Comunidad | `GET/POST /api/community/posts`, likes, comentarios, `GET /api/community/routes/{routeId}/summary` |
| Analítica | `POST /api/analytics/events` (lote ≤ 64 KB; `deviceId` hasheado en servidor) |
| QR | `GET /q/{code}` → `302` al destino validado, con registro de telemetría |

### Autenticación

| Portal | Endpoints |
| --- | --- |
| Admin | `POST /api/auth/admin/login`, `GET /api/auth/me` |
| Operador | `POST /api/auth/operator/login`, `GET /api/operator/me` |

### Administración (rol `ADMIN`)

CRUD y operaciones sobre `/api/admin/routes`, `/api/admin/lines`, `/api/admin/stops` (incluye imagen), `/api/admin/cities`, `/api/admin/operators` (con usuarios y reset de password), `/api/admin/community`, `/api/admin/qr-codes` (con `/stats`), `/api/admin/analytics` (`/overview`, `/routes/{routeId}`, `/aggregate`) y `/api/admin/billing/monthly-close`.

### Operador (rol `OPERATOR`)

`/api/operator/*` expone `profile`, `subscription`, `analytics/summary`, `analytics/routes/{routeId}`, `lines`, `routes`, `stops`, `disruptions`, `changes` y `/api/operator/qr-codes/*`. Los desvíos publicados se sincronizan como publicaciones oficiales de la comunidad. Las escrituras de catálogo requieren suscripción en `TRIAL` o `ACTIVE`; la analítica requiere un estado distinto de `CANCELED`/`EXPIRED`.

### Facturación y datos

| Dominio | Endpoints | Control |
| --- | --- | --- |
| Facturación | `POST /api/billing/checkout`, `POST /api/billing/webhook` | Checkout autenticado; webhook público verificado por `X-Signature` |
| Licenciamiento de datos | `GET /api/data/v1/coverage/{citySlug}`, `/api/data/v1/od-matrix/{citySlug}` | Header `X-Api-Key`; licencia y cuota validadas en el servicio |

Nota de seguridad: `GET /api/**` es público por diseño, pero los árboles `/api/admin/**` y `/api/operator/**` se evalúan **antes** y exigen su rol. Los webhooks y la ingesta de analítica son públicos a nivel Spring Security porque su validación (firma, tamaño, formato) ocurre en el servicio.

## Primer deploy

En el perfil `prod`, `app.seed.enabled=false` y `ddl-auto=validate`: la base nace vacía y Flyway aplica `V1__initial_schema.sql`. Después del primer arranque **no existe ningún administrador** y no hay endpoint de registro público.

Para crear el admin una sola vez:

1. Definir estas variables como variables de entorno del proceso (no en el `.env`, porque `application-prod.properties` gana sobre él): `APP_SEED_ENABLED=true`, `ADMIN_SEED_EMAIL` y `ADMIN_SEED_PASSWORD`.
2. Arrancar y confirmar en el log: `Administrador por defecto creado: <email>`.
3. Verificar `POST /api/auth/admin/login`.
4. Quitar `APP_SEED_ENABLED` o dejarlo en `false`.

La contraseña se guarda con BCrypt, así que la variable solo se usa en ese primer arranque. El seed es idempotente. Los usuarios operadores se crean después desde el panel admin, no por variables de entorno.

## Deploy

El backend se empaqueta en `backend/Dockerfile`: build multi-stage con Maven y JDK 21, ejecución sobre JRE 21 con usuario sin privilegios y `SPRING_PROFILES_ACTIVE=prod` por defecto. El `.env` no entra en la imagen (`backend/.dockerignore`) y `JAVA_TOOL_OPTIONS` usa `MaxRAMPercentage=75` para adaptarse a la memoria del contenedor.

```bash
gcloud builds submit backend \
  --tag southamerica-east1-docker.pkg.dev/PROYECTO/rutasya/api:latest

gcloud run deploy qruta-app \
  --image southamerica-east1-docker.pkg.dev/PROYECTO/rutasya/api:latest \
  --region southamerica-east1 \
  --memory 1Gi --cpu 1 --port 8080 \
  --min-instances 0 --max-instances 4 \
  --allow-unauthenticated \
  --set-env-vars SPRING_PROFILES_ACTIVE=prod,DB_URL='jdbc:postgresql://HOST:5432/postgres?sslmode=require',DB_USERNAME=postgres,APP_FRONTEND_URL=https://qruta.app,APP_BACKEND_URL=https://qruta.app,CORS_ALLOWED_ORIGINS=https://qruta.app
```

Variables obligatorias: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`. Recomendadas: `CORS_ALLOWED_ORIGINS`, `APP_FRONTEND_URL`, `APP_BACKEND_URL`, `GOOGLE_MAPS_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `BILLING_WEBHOOK_SECRET`.

Los secretos van por Secret Manager, no en `--set-env-vars`:

```bash
--set-secrets DB_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest
```

**Health checks.** Actuator expone solo `health`, sin detalles. `/actuator/health` es público a propósito: un probe no puede autenticarse.

```bash
--startup-probe httpGet.path=/actuator/health/readiness,initialDelaySeconds=10,periodSeconds=5,timeoutSeconds=3,failureThreshold=30 \
--liveness-probe httpGet.path=/actuator/health/liveness,periodSeconds=30,timeoutSeconds=3,failureThreshold=3
```

El primer arranque incluye Flyway y la validación de Hibernate, por eso el probe de arranque tolera hasta ~150 s.

**Frontend en Vercel.** `frontend/vercel.json` publica la SPA y agrega rewrites: `/api/:path*` y `/q/:path*` se proxyan al Cloud Run, y el resto cae en `/` (SPA fallback). También define headers de seguridad (nosniff, DENY, Referrer-Policy, Permissions-Policy) y caché para assets. Esto permite URLs QR canónicas bajo el mismo dominio y evita problemas de CORS en producción.

Notas de operación: la imagen no corre tests (`-Dmaven.test.skip=true`) porque la suite necesita PostgreSQL con PostGIS; ejecutarlos antes de construir. Con `--min-instances 0` el primer request paga el arranque en frío de la JVM (~10–20 s); si la latencia importa, usar `--min-instances 1` o `--cpu-boost`. No hay workflow de CI en el repositorio (solo hooks de modernización en `.github/`).

## Funcionalidades

- Búsqueda global insensible a tildes por código, nombre, línea, paradero y referencia.
- Filtro por categoría `MICRO` / `COMBI`, listado de rutas populares y búsqueda cercana con PostGIS.
- Mapa Leaflet con basemap CARTO, trazado de recorridos y paneles de detalle; selector de destino con geosearch.
- Detalle de ruta con sentidos, paraderos ordenados, tarifa, horario y frecuencia; slugs semánticos para URLs de paraderos.
- Favoritos y lugares guardados en el dispositivo, sin cuenta de usuario.
- Comunidad con alertas, preguntas, recomendaciones y objetos perdidos, alias local y moderación; los desvíos de operadores se muestran como anuncios oficiales verificados.
- QR inteligente: generación desde admin y operador, redirección por código, destinos de dominio validado y telemetría de escaneos.
- Analítica de rutas con eventos ciudadanos agregados por día y paneles para admin y operador.
- Suscripciones y facturación simulada con control de acceso por estado; cierre mensual desde el panel admin.
- API de licenciamiento de datos con claves, cuotas y matriz OD por ciudad.
- Exportación GTFS por ciudad y detección automática de ciudad por GPS con selector manual y geocodificación inversa.

## Tests

```bash
cd backend && ./mvnw test      # JUnit 5 + Mockito
cd frontend && pnpm test       # Vitest + Testing Library
cd frontend && pnpm lint       # ESLint
```

Los tests del backend no leen `backend/.env` ni tocan la base real: el perfil `test` (`src/test/resources/application-test.properties`) apunta a `rutas_test` y aporta todos los valores que en desarrollo vienen del `.env`. La suite pasa sin `.env` y sin red.

Los tests que necesitan base (`RutasApplicationTests` y `RouteAnalyticsIntegrationTest`) se omiten automáticamente si `rutas_test` no está disponible. Para ejecutarlos de verdad:

```bash
createdb rutas_test
psql -d rutas_test -c 'CREATE EXTENSION IF NOT EXISTS postgis'
./mvnw test
```

PostGIS es obligatorio: las entidades mapean columnas `geometry(Point, 4326)`. No hay suite end-to-end.

## Decisiones de diseño

- **PostGIS en vez de cálculos en aplicación.** Las consultas de cercanía se resuelven con índices GiST en base de datos, no en memoria.
- **Hibernate valida en producción, Flyway migra.** `ddl-auto=validate` en `prod`; el esquema nace de `V1__initial_schema.sql` sobre una base vacía, sin baseline.
- **Tres identidades separadas.** Ciudadano anónimo (`deviceId` + alias local), admin y operador con JWT propios. Cada portal tiene su propio login y sus guardas de ruta.
- **Datos de operador aislados por scope.** `OperatorScope` restringe cada consulta a la empresa del token; la suscripción limita escrituras y acceso a analítica.
- **Proxy de geocodificación.** La key de Google nunca llega al navegador; el backend cachea direcciones 30 días con Caffeine y cae a Photon cuando la key no está configurada.
- **QR como capa de resolución.** `/q/{code}` es público y devuelve un `302`; el backend valida el dominio destino y registra el evento antes de redirigir.
- **Ingesta desacoplada.** Analítica y webhook de facturación son públicos en el filtro de seguridad; la validez se comprueba en el servicio (tamaño, formato o firma).

## Estado y limitaciones conocidas

- `Vehicle` y `VehicleLocation` siguen como entidades sin API ni UI: no hay seguimiento de unidades en tiempo real.
- El proveedor de pagos es simulado: no hay integración con un procesador real.
- `VITE_USE_MOCK` está documentada en `.env.example` pero no se consume en el código.
- `FavoritesPage` y `AdminDashboardPage` quedaron como archivos deprecados sin ruta activa; `/favoritos` redirige a `/lugares`.
- La subida de imágenes de paraderos devuelve 503 si Supabase no está configurado.
- No hay CI, Docker Compose ni Makefile: backend y frontend se ejecutan por separado.

## Documentación adicional

- `INTEGRATION_API.md` — contrato de la API y flujos de integración.
- `UI_DESIGN.md` — sistema visual y criterios de diseño de la interfaz.
- `docs/PLAN_FILTRADO_POR_CIUDAD.md` — detección y filtrado por ciudad.
- `docs/PLAN_MENU_COMUNIDAD.md` — alcance del módulo comunitario.
- `docs/GUIA_CONTACTO_EMPRESAS_TRANSPORTE.md` — guía de relevamiento de datos con operadores.
- `docs/ventas/README.md` — material de venta para empresas de transporte.
- `openspec/changes/` — propuestas de cambio (operadores, analítica/QR, monetización, línea de transporte canónica, entre otras).

## Validación manual de GTFS

La validación con MobilityData `gtfs-validator` no forma parte de la suite automática:

1. Descargar el JAR CLI desde los Releases de `MobilityData/gtfs-validator` (por ejemplo `gtfs-validator-8.0.1-cli.jar`) y usar Java 17 o superior.
2. Descargar el feed con `curl -o lima.zip http://localhost:8080/api/gtfs/lima.zip`.
3. Ejecutar `java -jar gtfs-validator-8.0.1-cli.jar -i lima.zip -o validator-report -c pe`.
4. Revisar `validator-report/report.json` y `report.html`. El feed se considera verificado solo si no hay errores de severidad `ERROR`.

Si el JAR no está disponible, la validación queda pendiente y debe registrarse como tarea manual de bloqueo: no afirmar que el feed pasó el validador.

## Producción

Estado verificado por HTTP el 2026-11-21:

| Componente | URL | Resultado |
| --- | --- | --- |
| **Sitio oficial** (Vercel) | https://qruta.app | 200 — canonical |
| Backend API (directo, Cloud Run) | https://qruta-app-645317527911.southamerica-east1.run.app | 200 en `/actuator/health`; región `southamerica-east1` |
| Backend API (proxy Vercel) | https://qruta.app/api | Rewrites configurados en `frontend/vercel.json` |
| Resolutor QR | https://qruta.app/q/:code | Rewrite al backend |
| Dominio anterior de Vercel | https://qruta-app.vercel.app | 404 — reemplazado por el dominio propio |
| Dominios de configuración local | https://front.anthonywar.dev, https://back.anthonywar.dev | Aparecen en `application.properties`; no son la URL canónica de producción |
