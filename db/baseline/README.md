# Baseline del esquema

`schema.sql` contiene la estructura completa de la base que el proyecto usa hoy: tablas, columnas, índices, foreign keys y constraints. No contiene filas.

El proyecto todavía no está desplegado, así que no existe una base de producción. Supabase es la base de trabajo actual y sus datos son de prueba; este archivo guarda su forma, no su contenido.

## Por qué existe

Las migraciones de Flyway no crean las tablas base. `V1__add_new_fields.sql` ya asume que `cities`, `transport_lines`, `stops`, `routes` y el resto existen. Esas tablas las creó Hibernate con `ddl-auto=update` contra Supabase.

Sin este archivo la estructura existía únicamente dentro de Supabase. Si esa instancia se perdía, el repositorio no alcanzaba para reconstruirla.

El baseline permite:

- levantar una base local desde cero;
- auditar el esquema sin conectarse a Supabase;
- desplegar más adelante sin depender de una única base.

## Restaurar en local

```bash
createdb rutas
psql -d rutas -f db/baseline/schema.sql
```

El archivo crea por sí mismo el schema `extensions` y las extensiones `postgis` (en `extensions`, igual que en Supabase) y `unaccent` (en `public`). No hace falta crearlas a mano.

Después se apunta `DB_URL` del `.env` a la base local.

## Cargar datos de catálogo (opcional)

Para que la aplicación sea usable en local hacen falta ciudades, líneas, rutas y paraderos. Se copian de Supabase porque son datos geográficos, no datos de personas:

```bash
URL=${DB_URL#jdbc:}

pg_dump "$URL" --data-only --no-owner \
  -t cities -t transport_lines -t stops \
  -t routes -t route_stops -t route_directions -t route_points \
  -f /tmp/catalog.sql

psql -d rutas -f /tmp/catalog.sql
```

Si aparecen errores de foreign keys por el orden de carga, restaurar en una sola sesión:

```bash
psql -d rutas -c "SET session_replication_role = replica;" -f /tmp/catalog.sql
```

### Qué no copiar

| Tabla | Motivo |
| --- | --- |
| `administrators` | Contiene hashes de contraseñas reales |
| `community_posts` | Contenido escrito por usuarios |
| `community_comments` | Contenido escrito por usuarios |
| `community_post_likes` | Actividad de usuarios |

Para el administrador local conviene crear uno propio con una contraseña conocida en lugar de copiar el hash de Supabase.

## Regenerar el baseline

El servidor de Supabase corre PostgreSQL 17. El `pg_dump` del sistema debe ser 17 o superior; una versión anterior se niega a leer un servidor más nuevo.

```bash
URL=${DB_URL#jdbc:}

pg_dump "$URL" \
  --schema-only --schema=public \
  --no-owner --no-privileges \
  -f /tmp/schema_dump.sql
```

Después hay que anteponer la cabecera de extensiones que `--schema=public` no exporta:

```sql
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
```

Y hacer portable el archivo antes de commitearlo:

- borrar las líneas `\restrict` y `\unrestrict`, que `pg_dump` 17.9 emite y `psql` 16 no entiende;
- borrar `SET transaction_timeout`, que solo existe en PostgreSQL 17;
- cambiar `CREATE SCHEMA public;` por `CREATE SCHEMA IF NOT EXISTS public;`, porque `public` ya existe en una base nueva.

## Nota sobre Flyway

El esquema lo controla Flyway: `backend/src/main/resources/db/migration/V1__initial_schema.sql` es la única migración y crea todas las tablas. Este snapshot se conserva como copia de referencia y como punto de comparación, no como paso de instalación.

La base de Supabase no tiene tabla `flyway_schema_history` porque el proyecto nunca se ejecutó con el perfil `prod`. Una instalación nueva no necesita baseline: arranca con la base vacía y Flyway aplica `V1`.

Si en algún momento se quiere adoptar este snapshot en una base ya existente, primero hay que comprobar que coincide con `V1` columna por columna. Baselinear sin esa comprobación es exactamente lo que produce drift silencioso.
