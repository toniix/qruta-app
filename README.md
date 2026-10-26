# RutaYa

Catálogo web de transporte urbano para ciudades del Perú. Los ciudadanos consultan rutas, recorridos, paraderos, tarifas y horarios sin crear cuenta; un panel administrativo protegido por JWT permite mantener el catálogo. Se cubren los modos `MICRO` y `COMBI`, con datos semilla de Lima, Ica, Huánuco, Chincha y Huancayo.

El repositorio es un monorepo: la API REST vive en `backend/` y la SPA en `frontend/`.

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | Java 21, Spring Boot 3.3.5, Spring Security + JWT (jjwt 0.12.6), Spring Data JPA, Flyway, Lombok |
| Base de datos | PostgreSQL con PostGIS (geometrías e índices GiST) y `unaccent` (búsqueda sin tildes) |
| Frontend | React 19, Vite 8, Tailwind CSS 4, React Router 7, Leaflet + react-leaflet, Zod, Axios |
| Tests | JUnit 5 + Mockito (backend), Vitest + Testing Library (frontend) |
| Imágenes de paraderos | Supabase Storage (opcional; sin configurar, la función queda deshabilitada) |

## Estructura del repositorio

```text
rutasYa/
├── backend/                    API REST (Spring Boot)
│   ├── src/main/java/com/anthony/rutas/
│   │   ├── config/             Seguridad, CORS, seed inicial
│   │   ├── controllers/        Endpoints públicos y admin/
│   │   ├── dtos/               Request/response con validación
│   │   ├── entities/           Modelo JPA
│   │   ├── repositories/       Spring Data + consultas espaciales nativas
│   │   ├── security/           JWT, filtro y UserDetails
│   │   └── services/           Lógica de negocio, storage, geocoding
│   └── src/main/resources/
│       ├── application*.properties
│       └── db/                 Migraciones Flyway y seed manual
└── frontend/                   SPA (React + Vite)
    └── src/
        ├── components/         UI por dominio (home, map, routes, search, community, admin)
        ├── contexts/           Estado global de rutas y ciudades
        ├── hooks/              Favoritos, lugares, geolocalización, identidad
        ├── pages/              Vistas ciudadanas y panel admin
        ├── routes/             Definición de rutas y guardas de acceso
        ├── schemas/            Validación con Zod
        └── services/           Cliente Axios y servicios por dominio
```

## Requisitos

- JDK 21
- pnpm (el lockfile versionado es `pnpm-lock.yaml`)
- PostgreSQL 15 o superior con la extensión PostGIS disponible
- Opcional: proyecto de Supabase para subida de imágenes de paraderos
- Opcional: API key de CARTO para el basemap del mapa (sin key los tiles salen en blanco)

## Puesta en marcha

### 1. Base de datos

El esquema lo controla Flyway. Hay una sola migración, `backend/src/main/resources/db/migration/V1__initial_schema.sql`, que crea las extensiones `postgis` y `unaccent`, las 13 tablas, los índices (incluidos los GiST de PostGIS) y las constraints. Con Flyway habilitado, una base vacía queda construida al arrancar el backend:

```bash
createdb rutas
cd backend
FLYWAY_ENABLED=true DB_URL=jdbc:postgresql://127.0.0.1:5432/rutas ./mvnw spring-boot:run
```

`db/baseline/schema.sql` es una copia de referencia del mismo esquema: sirve para inspeccionarlo o restaurarlo sin arrancar la aplicación, y para comparar contra `V1`. `db/baseline/README.md` explica cómo regenerarla y cómo cargar datos de catálogo sin copiar datos de usuarios.

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Completar en `.env` como mínimo:

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` apuntando a la base local
- `JWT_SECRET` con al menos 32 bytes aleatorios:
  `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`

Luego:

```bash
./mvnw spring-boot:run          # Linux/macOS
mvnw.cmd spring-boot:run        # Windows
```

La API queda en `http://localhost:8080/api`. El perfil activo por defecto es `local`.

#### Configuración: una sola fuente

Toda la configuración local vive en `backend/.env`. No hay `application-local.properties`: si existiera, pisaría en silencio las variables del `.env`, y un clon nuevo se comportaría distinto al no tenerlo. El perfil `local` existe como selector de perfil, pero no aporta valores por sí mismo.

Precedencia, de menor a mayor:

1. Valor por defecto declarado en `application.properties` (`${VAR:default}`)
2. `backend/.env`
3. Archivos por perfil, como `application-prod.properties` (solo con ese perfil activo)
4. Variables de entorno del sistema, que siempre ganan

Si un cambio en `.env` no tiene efecto, revisá primero las variables de entorno del sistema: son la causa más frecuente.

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

La SPA queda en `http://localhost:5173`, origen ya permitido por la configuración de CORS del backend.

### 4. Verificación

`curl http://localhost:8080/api/cities` debe devolver el listado de ciudades. Si la base está vacía, los endpoints responden con listas vacías hasta cargar el seed.

### Datos de ejemplo (opcional)

`backend/src/main/resources/db/seed/seed_data.sql` carga ciudades, líneas, rutas y paraderos de muestra. Es un script manual y destructivo: no se ejecuta automáticamente y no debe correrse sobre una base con datos reales.

```bash
psql -d rutas -f backend/src/main/resources/db/seed/seed_data.sql
```

## Variables de entorno

### Backend (`backend/.env.example`)

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DB_URL` | Sí | URL JDBC de PostgreSQL |
| `DB_USERNAME` / `DB_PASSWORD` | Sí | Credenciales de base de datos |
| `JWT_SECRET` | Sí | Clave HMAC de al menos 32 bytes aleatorios |
| `JWT_EXPIRATION_MS` | No | Vida del token; por defecto 24 h |
| `CORS_ALLOWED_ORIGINS` | No | Orígenes permitidos, separados por coma |
| `SPRING_PROFILES_ACTIVE` | No | `local` (por defecto) o `prod` |
| `JPA_DDL_AUTO` / `FLYWAY_ENABLED` | No | Control del esquema; no usar `update` en producción |
| `APP_SEED_ENABLED` | No | Habilita fixtures de desarrollo |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | No | Admin inicial; sin password no se crea |
| `GOOGLE_MAPS_API_KEY` | No | Geocodificación inversa; vacío usa solo Photon |
| `GEOCODE_DAILY_QUOTA` | No | Tope diario de llamadas a Google; por defecto 1000 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | No | Habilitan subida de imágenes de paraderos |
| `SUPABASE_STORAGE_BUCKET` | No | Bucket de imágenes; por defecto `stop-images` |

### Frontend (`frontend/.env.example`)

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Sí | Base de la API; por defecto `http://localhost:8080/api` |
| `VITE_CARTO_KEY` | No | Key de tiles CARTO; sin ella el basemap no se dibuja |
| `VITE_CARTO_STYLE` | No | Estilo del basemap; por defecto `light_all` |
| `VITE_CARTO_MAX_ZOOM` | No | Zoom máximo del estilo raster; por defecto 19 |

Ningún valor del frontend es secreto: todo lo que empieza con `VITE_` termina en el bundle del navegador.

## Primer deploy

El perfil `prod` define `app.seed.enabled=false` y `ddl-auto=validate`; la base se crea vacía y Flyway aplica `V1__initial_schema.sql`. Consecuencia: después del primer arranque **no existe ningún administrador**, y no hay endpoint de registro — solo `/api/auth/admin/login` y `/api/auth/me`.

Para poder entrar, creá el admin una sola vez:

1. Definí estas variables en la plataforma de deploy, como variables de entorno del proceso y **no** en el `.env` (el archivo `application-prod.properties` gana sobre el `.env`):
   - `APP_SEED_ENABLED=true`
   - `ADMIN_SEED_PASSWORD` con una contraseña fuerte
   - `ADMIN_SEED_EMAIL` con el email del admin
2. Arrancá la aplicación y confirmá en el log: `Administrador por defecto creado: <email>`.
3. Verificá el login con `POST /api/auth/admin/login`.
4. Quitá `APP_SEED_ENABLED`, o ponelo en `false`. El seed queda apagado.

La contraseña se guarda hasheada con BCrypt, así que la variable solo se usa en ese primer arranque. El seed es idempotente: si ya hay administradores, no crea ninguno.

Alternativa sin habilitar el seed: insertar el admin por SQL con un hash BCrypt generado aparte.

## API

Todas las lecturas públicas son `GET` sin autenticación. Las escrituras administrativas requieren `Authorization: Bearer <token>` con rol `ADMIN`.

| Recurso | Endpoints |
| --- | --- |
| Ciudades | `GET /api/cities` |
| Líneas | `GET /api/lines`, `GET /api/lines/city/{cityId}` |
| Rutas | `GET /api/routes/cards`, `/popular`, `/{id}`, `/search`, `/line/{id}`, `/nearby`; `POST /api/routes/nearby` |
| Paraderos | `GET /api/stops`, `/{id}`, `/{id}/routes`, `/search`, `/nearby`; `POST /api/stops/nearby` |
| Geocodificación | `GET /api/geocode/reverse` |
| Comunidad | `GET/POST /api/community/posts`, likes, comentarios y resumen por ruta |
| Autenticación | `POST /api/auth/admin/login`, `GET /api/auth/me` |
| Administración | CRUD en `/api/admin/routes`, `/api/admin/lines`, `/api/admin/stops`, `/api/admin/cities`, moderación en `/api/admin/community` |

La colección Postman está en `backend/RutasYa_API.postman_collection.json`.

## Funcionalidades

- Búsqueda global insensible a tildes por código, nombre, línea, paradero y referencia.
- Filtro por categoría `MICRO` / `COMBI` y listado de rutas populares.
- Búsqueda de rutas y paraderos cercanos con PostGIS.
- Mapa Leaflet con basemap CARTO, trazado de recorridos y paneles de detalle.
- Detalle de ruta con sentidos, paraderos ordenados, tarifa, horario y frecuencia.
- Favoritos y lugares guardados en el dispositivo, sin cuenta de usuario.
- Comunidad: alertas, preguntas, recomendaciones y objetos perdidos, con alias local y moderación administrativa.
- Panel admin con métricas, CRUD de catálogo y carga de imágenes de paraderos.
- Detección automática de ciudad por GPS con selector manual y geocodificación inversa.

## Tests

```bash
cd backend && ./mvnw test      # JUnit 5 + Mockito
cd frontend && pnpm test       # Vitest + Testing Library
cd frontend && pnpm lint       # ESLint
```

Los tests del backend no leen `backend/.env` ni tocan la base real: el perfil `test` (`src/test/resources/application-test.properties`) apunta a una base descartable y aporta todos los valores que en desarrollo vienen del `.env`. La suite pasa sin `.env` y sin red.

El único test que necesita base es `RutasApplicationTests` (arranque de contexto). Usa `rutas_test` y se **omite automáticamente** cuando no está disponible, así que `./mvnw test` queda verde en cualquier máquina. Para ejecutarlo de verdad:

```bash
createdb rutas_test
psql -d rutas_test -c 'CREATE EXTENSION IF NOT EXISTS postgis'
./mvnw test
```

PostGIS es obligatorio: las entidades mapean columnas `geometry(Point, 4326)`. No hay suite end-to-end.

## Decisiones de diseño

- **PostGIS en vez de cálculos en aplicación.** Las consultas de cercanía se resuelven con índices GiST en base de datos, no en memoria.
- **Hibernate valida en producción, Flyway migra.** `ddl-auto=validate` en el perfil `prod` evita cambios implícitos de esquema; el esquema nace de `V1__initial_schema.sql` sobre una base vacía, sin baseline.
- **Admin con JWT, ciudadano sin cuenta.** La identidad ciudadana es un `deviceId` local más un alias elegido; el costo de registro no aportaba valor al caso de uso.
- **Proxy de geocodificación.** La key de Google nunca llega al navegador; el backend cachea direcciones 30 días y cae a Photon cuando la key no está configurada.

## Estado y limitaciones conocidas

- `Vehicle` y `VehicleLocation` existen como entidades sin API ni UI: no hay seguimiento de unidades en tiempo real.
- `VITE_USE_MOCK` está documentada en `.env.example` pero no se consume en el código.
- `FavoritesPage` y `AdminDashboardPage` existen sin ruta activa; `/favoritos` redirige a `/lugares`.
- La subida de imágenes de paraderos devuelve 503 si Supabase no está configurado.
- No hay CI, Docker Compose ni Makefile: backend y frontend se ejecutan por separado.

## Documentación adicional

- `INTEGRATION_API.md` — contrato de la API y flujos de integración.
- `UI_DESIGN.md` — sistema visual y criterios de diseño de la interfaz.
- `docs/PLAN_FILTRADO_POR_CIUDAD.md` — detección y filtrado por ciudad.
- `docs/PLAN_MENU_COMUNIDAD.md` — alcance del módulo comunitario.
- `docs/GUIA_CONTACTO_EMPRESAS_TRANSPORTE.md` — guía de relevamiento de datos con operadores.
