-- Initial schema. This is the only migration that creates tables.
--
-- Everything here was derived from db/baseline/schema.sql, which is a structure-only
-- dump of the database the project used during development. That database was built by
-- Hibernate with ddl-auto=update, so this file mirrors the JPA entities rather than the
-- old V1..V9 migrations (those only added columns on top of tables they never created,
-- and nine of their column definitions disagreed with reality).
--
-- Consequences that are intentional:
--   * Text columns are varchar(255) because the entities declare no length.
--   * Nullable columns stay nullable because the entities allow null.
--   * No baseline: a deployment starts from an empty database and Flyway builds it.
--
-- PRIVILEGES
--   CREATE EXTENSION requires a superuser unless the extension is trusted, and PostGIS is
--   not trusted. On a managed database the extensions already exist and IF NOT EXISTS
--   short-circuits. On a fresh database the migration connection must be able to create
--   them; pre-creating them as a superuser is the alternative.
--
-- The search_path manipulation below reproduces the environment in which the original
-- schema was created. Keep it: the function body relies on it to stay unqualified.
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Extensions. Must precede immutable_unaccent() (its body calls unaccent) and any
-- extensions.geometry column.
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS public;

-- Needed for accent-insensitive search: unaccent() is STABLE, which makes it unusable in
-- an index expression. This wrapper is the IMMUTABLE version the indexes depend on.
CREATE FUNCTION public.immutable_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $_$
  SELECT unaccent($1);
$_$;

SET default_tablespace = '';
SET default_table_access_method = heap;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.administrators (
    active boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL
);

CREATE TABLE public.cities (
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    id uuid NOT NULL,
    country character varying(255) NOT NULL,
    department character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    latitude numeric(10,7),
    longitude numeric(10,7),
    radius_km numeric(6,2) DEFAULT 30.0 NOT NULL
);

CREATE TABLE public.community_comments (
    id uuid NOT NULL,
    author_alias character varying(50) NOT NULL,
    author_device_id character varying(64) NOT NULL,
    content character varying(400) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    post_id uuid NOT NULL
);

CREATE TABLE public.community_post_likes (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    device_id character varying(64) NOT NULL,
    post_id uuid NOT NULL
);

CREATE TABLE public.community_posts (
    id uuid NOT NULL,
    author_alias character varying(50) NOT NULL,
    author_device_id character varying(64) NOT NULL,
    category character varying(30) NOT NULL,
    comments_count integer NOT NULL,
    content character varying(600) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    likes_count integer NOT NULL,
    updated_at timestamp(6) without time zone,
    city_id uuid,
    route_id uuid,
    CONSTRAINT community_posts_category_check CHECK (((category)::text = ANY ((ARRAY['ALERTA'::character varying, 'PREGUNTA'::character varying, 'RECOMENDACION'::character varying, 'OBJETOS_PERDIDOS'::character varying])::text[])))
);

CREATE TABLE public.route_directions (
    estimated_minutes integer,
    total_distance_km double precision,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    id uuid NOT NULL,
    route_id uuid NOT NULL,
    destination_name character varying(255),
    direction character varying(255) NOT NULL,
    origin_name character varying(255)
);

CREATE TABLE public.route_points (
    point_order integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    direction_id uuid NOT NULL,
    id uuid NOT NULL,
    location extensions.geometry(Point,4326)
);

CREATE TABLE public.route_stops (
    distance_from_start double precision,
    stop_order integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    direction_id uuid NOT NULL,
    id uuid NOT NULL,
    stop_id uuid NOT NULL
);

CREATE TABLE public.routes (
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    id uuid NOT NULL,
    transport_line_id uuid NOT NULL,
    code character varying(255) NOT NULL,
    color character varying(255),
    description character varying(255),
    fare character varying(255),
    frequency character varying(255),
    name character varying(255) NOT NULL,
    schedule character varying(255),
    status character varying(255) NOT NULL,
    popularity_score integer,
    category character varying(255) DEFAULT 'MICRO'::character varying NOT NULL
);

CREATE TABLE public.stops (
    is_accessible boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    city_id uuid NOT NULL,
    id uuid NOT NULL,
    address character varying(255),
    name character varying(255) NOT NULL,
    reference character varying(255),
    location extensions.geometry(Point,4326),
    key_stop boolean,
    image_url character varying(255)
);

CREATE TABLE public.transport_lines (
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    city_id uuid NOT NULL,
    id uuid NOT NULL,
    code character varying(20),
    color character varying(255),
    company character varying(255),
    contact character varying(255),
    description character varying(255),
    name character varying(255) NOT NULL,
    status character varying(255) NOT NULL
);

CREATE TABLE public.vehicle_locations (
    heading double precision,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    speed double precision,
    recorded_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    vehicle_id uuid NOT NULL
);

CREATE TABLE public.vehicles (
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    id uuid NOT NULL,
    route_id uuid NOT NULL,
    internal_code character varying(255),
    plate character varying(255) NOT NULL,
    status character varying(255) NOT NULL
);

-- ---------------------------------------------------------------------------
-- Primary keys, unique constraints
-- ---------------------------------------------------------------------------

ALTER TABLE ONLY public.administrators
    ADD CONSTRAINT administrators_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.administrators
    ADD CONSTRAINT administrators_email_key UNIQUE (email);

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_name_key UNIQUE (name);

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT community_post_likes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT uq_community_post_like_device UNIQUE (post_id, device_id);

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.route_directions
    ADD CONSTRAINT route_directions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.route_points
    ADD CONSTRAINT route_points_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT route_stops_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_code_key UNIQUE (code);

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.transport_lines
    ADD CONSTRAINT transport_lines_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.vehicle_locations
    ADD CONSTRAINT vehicle_locations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_plate_key UNIQUE (plate);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_route_directions_route_id ON public.route_directions USING btree (route_id);

CREATE INDEX idx_route_stops_direction_id ON public.route_stops USING btree (direction_id);

CREATE INDEX idx_route_stops_stop_id ON public.route_stops USING btree (stop_id);

CREATE INDEX idx_routes_category ON public.routes USING btree (category);

CREATE INDEX idx_routes_transport_line_id ON public.routes USING btree (transport_line_id);

CREATE INDEX idx_transport_lines_city_id ON public.transport_lines USING btree (city_id);

-- Spatial indexes: required for the ST_DWithin queries behind /api/stops/nearby.
CREATE INDEX idx_route_points_location_gist ON public.route_points USING gist (location);

CREATE INDEX idx_stops_location_gist ON public.stops USING gist (location);

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------

ALTER TABLE ONLY public.route_directions
    ADD CONSTRAINT fk2rpil80v7hi0ko6lauujd0fj4 FOREIGN KEY (route_id) REFERENCES public.routes(id);

ALTER TABLE ONLY public.vehicle_locations
    ADD CONSTRAINT fk8kqgqgch5me3jqsx2a6dvq6k FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT fk9sjf184uxpmtyc0clneu9kr0s FOREIGN KEY (transport_line_id) REFERENCES public.transport_lines(id);

ALTER TABLE ONLY public.route_points
    ADD CONSTRAINT fkcitru2joogxl9r7e7loaxvf9l FOREIGN KEY (direction_id) REFERENCES public.route_directions(id);

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT fkjmssq6w9xpsvupp2x407s43i2 FOREIGN KEY (stop_id) REFERENCES public.stops(id);

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT fkk01b40sx8j8y136dxysmavi5i FOREIGN KEY (route_id) REFERENCES public.routes(id);

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT fklrj6e98eodhkxqxolyyqowvbc FOREIGN KEY (post_id) REFERENCES public.community_posts(id);

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT fkm849m9jpcp900uq0v5g2eunv FOREIGN KEY (direction_id) REFERENCES public.route_directions(id);

ALTER TABLE ONLY public.transport_lines
    ADD CONSTRAINT fko7dudurbbosw9t4p0dfrwh6a9 FOREIGN KEY (city_id) REFERENCES public.cities(id);

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT fkoixubksvdr6r5cf76ub5tktrt FOREIGN KEY (route_id) REFERENCES public.routes(id);

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT fkq50vvo0f7kb959d75um2ud34g FOREIGN KEY (city_id) REFERENCES public.cities(id);

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT fkqkirdl1pmallapnn7jqacr2ey FOREIGN KEY (city_id) REFERENCES public.cities(id);

ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT fks98gntvorodjgg3tc6h3etwr FOREIGN KEY (post_id) REFERENCES public.community_posts(id);
