-- Schema baseline (structure only, no rows).
--
-- Source:        Supabase PostgreSQL 17.6, schema "public"
-- Exported with: pg_dump 17.9 --schema-only --schema=public --no-owner --no-privileges
-- Date:          2026-11-20 (Updated with V2-V7 schemas)
--
-- WHAT THIS IS
--   A copy of the structure of the database the project uses today: tables,
--   columns, indexes, foreign keys and constraints. No rows.
--
--   The project has not been deployed yet, so there is no production database.
--   The Supabase instance is the current working database and its contents are
--   test data. This file captures its SHAPE, not its data.
--
-- WHY IT EXISTS
--   The base tables (cities, transport_lines, stops, routes, ...) are not created
--   by any Flyway migration. V1__add_new_fields.sql already assumes they exist.
--   Those tables were created by Hibernate with ddl-auto=update against Supabase.
--
--   Without this file the structure would exist only inside that one database:
--   losing it would mean losing the schema, because the repository alone cannot
--   rebuild it.
--
-- RESTORE ORDER
--   Extensions must exist before public.immutable_unaccent() is created (its body
--   calls unaccent) and before any extensions.geometry column is created.
--   pg_dump --schema=public does not export extensions, so they are created here.
--
-- FLYWAY
--   Reference copy. The schema is owned by Flyway and built by
--   backend/src/main/resources/db/migration/V1__initial_schema.sql, which mirrors
--   this file column for column. There is no baseline: a new deployment starts from
--   an empty database and Flyway applies V1.
--   If the two ever diverge, V1 is authoritative for deployments; regenerate this
--   snapshot from the resulting database instead of editing it by hand.
--
-- PORTABILITY
--   Adjusted so this file restores on PostgreSQL 15/16/17 and psql 16+:
--     * \restrict / \unrestrict meta-commands removed (pg_dump 17.9 only).
--     * SET transaction_timeout removed (PostgreSQL 17 only).
--     * CREATE SCHEMA public guarded with IF NOT EXISTS (exists on a fresh DB).

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- "SET transaction_timeout" removed: it only exists on PostgreSQL 17 and errors
-- on 15/16, which are valid targets for local development.
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- pg_dump emitted this without IF NOT EXISTS, which fails on a fresh database
-- because "public" already exists there. Guarded so the baseline restores cleanly.
CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: immutable_unaccent(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.immutable_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $_$
  SELECT unaccent($1);
$_$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: administrators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.administrators (
    active boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL
);


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: community_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_comments (
    id uuid NOT NULL,
    author_alias character varying(50) NOT NULL,
    author_device_id character varying(64) NOT NULL,
    content character varying(400) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    post_id uuid NOT NULL
);


--
-- Name: community_post_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_post_likes (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    device_id character varying(64) NOT NULL,
    post_id uuid NOT NULL
);


--
-- Name: community_posts; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: route_directions; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: route_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_points (
    point_order integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    direction_id uuid NOT NULL,
    id uuid NOT NULL,
    location extensions.geometry(Point,4326)
);


--
-- Name: route_stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.route_stops (
    distance_from_start double precision,
    stop_order integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    direction_id uuid NOT NULL,
    id uuid NOT NULL,
    stop_id uuid NOT NULL
);


--
-- Name: routes; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stops (
    is_accessible boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    city_id uuid NOT NULL,
    id uuid NOT NULL,
    address character varying(255),
    name character varying(255) NOT NULL,
    slug character varying(150),
    reference character varying(255),
    location extensions.geometry(Point,4326),
    key_stop boolean,
    image_url character varying(255)
);


--
-- Name: transport_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_lines (
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    city_id uuid NOT NULL,
    id uuid NOT NULL,
    color character varying(255),
    company character varying(255) NOT NULL,
    contact character varying(255),
    description character varying(255),
    status character varying(255) NOT NULL,
    operator_id uuid
);


--
-- Name: vehicle_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_locations (
    heading double precision,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    speed double precision,
    recorded_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    vehicle_id uuid NOT NULL
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    id uuid NOT NULL,
    route_id uuid NOT NULL,
    internal_code character varying(255),
    plate character varying(255) NOT NULL,
    status character varying(255) NOT NULL
);


--
-- Name: administrators administrators_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrators
    ADD CONSTRAINT administrators_email_key UNIQUE (email);


--
-- Name: administrators administrators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrators
    ADD CONSTRAINT administrators_pkey PRIMARY KEY (id);


--
-- Name: cities cities_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_name_key UNIQUE (name);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: community_comments community_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_pkey PRIMARY KEY (id);


--
-- Name: community_post_likes community_post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT community_post_likes_pkey PRIMARY KEY (id);


--
-- Name: community_posts community_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);


--
-- Name: route_directions route_directions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_directions
    ADD CONSTRAINT route_directions_pkey PRIMARY KEY (id);


--
-- Name: route_points route_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_points
    ADD CONSTRAINT route_points_pkey PRIMARY KEY (id);


--
-- Name: route_stops route_stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT route_stops_pkey PRIMARY KEY (id);


--
-- Name: routes routes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_code_key UNIQUE (code);


--
-- Name: routes routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT routes_pkey PRIMARY KEY (id);


--
-- Name: stops stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT stops_pkey PRIMARY KEY (id);


--
-- Name: transport_lines transport_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_lines
    ADD CONSTRAINT transport_lines_pkey PRIMARY KEY (id);


--
-- Name: community_post_likes uq_community_post_like_device; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT uq_community_post_like_device UNIQUE (post_id, device_id);


--
-- Name: vehicle_locations vehicle_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_locations
    ADD CONSTRAINT vehicle_locations_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_plate_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_plate_key UNIQUE (plate);


--
-- Name: idx_route_directions_route_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_directions_route_id ON public.route_directions USING btree (route_id);


--
-- Name: idx_route_points_location_gist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_points_location_gist ON public.route_points USING gist (location);


--
-- Name: idx_route_stops_direction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_stops_direction_id ON public.route_stops USING btree (direction_id);


--
-- Name: idx_route_stops_stop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_route_stops_stop_id ON public.route_stops USING btree (stop_id);


--
-- Name: idx_routes_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_routes_category ON public.routes USING btree (category);


--
-- Name: idx_routes_transport_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_routes_transport_line_id ON public.routes USING btree (transport_line_id);


--
-- Name: idx_stops_location_gist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stops_location_gist ON public.stops USING gist (location);


--
-- Name: idx_transport_lines_city_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transport_lines_city_id ON public.transport_lines USING btree (city_id);


--
-- Name: route_directions fk2rpil80v7hi0ko6lauujd0fj4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_directions
    ADD CONSTRAINT fk2rpil80v7hi0ko6lauujd0fj4 FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: vehicle_locations fk8kqgqgch5me3jqsx2a6dvq6k; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_locations
    ADD CONSTRAINT fk8kqgqgch5me3jqsx2a6dvq6k FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: routes fk9sjf184uxpmtyc0clneu9kr0s; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routes
    ADD CONSTRAINT fk9sjf184uxpmtyc0clneu9kr0s FOREIGN KEY (transport_line_id) REFERENCES public.transport_lines(id);


--
-- Name: route_points fkcitru2joogxl9r7e7loaxvf9l; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_points
    ADD CONSTRAINT fkcitru2joogxl9r7e7loaxvf9l FOREIGN KEY (direction_id) REFERENCES public.route_directions(id);


--
-- Name: route_stops fkjmssq6w9xpsvupp2x407s43i2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT fkjmssq6w9xpsvupp2x407s43i2 FOREIGN KEY (stop_id) REFERENCES public.stops(id);


--
-- Name: community_posts fkk01b40sx8j8y136dxysmavi5i; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT fkk01b40sx8j8y136dxysmavi5i FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: community_comments fklrj6e98eodhkxqxolyyqowvbc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT fklrj6e98eodhkxqxolyyqowvbc FOREIGN KEY (post_id) REFERENCES public.community_posts(id);


--
-- Name: route_stops fkm849m9jpcp900uq0v5g2eunv; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.route_stops
    ADD CONSTRAINT fkm849m9jpcp900uq0v5g2eunv FOREIGN KEY (direction_id) REFERENCES public.route_directions(id);


--
-- Name: transport_lines fko7dudurbbosw9t4p0dfrwh6a9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_lines
    ADD CONSTRAINT fko7dudurbbosw9t4p0dfrwh6a9 FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: vehicles fkoixubksvdr6r5cf76ub5tktrt; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT fkoixubksvdr6r5cf76ub5tktrt FOREIGN KEY (route_id) REFERENCES public.routes(id);


--
-- Name: community_posts fkq50vvo0f7kb959d75um2ud34g; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT fkq50vvo0f7kb959d75um2ud34g FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: stops fkqkirdl1pmallapnn7jqacr2ey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stops
    ADD CONSTRAINT fkqkirdl1pmallapnn7jqacr2ey FOREIGN KEY (city_id) REFERENCES public.cities(id);


--
-- Name: community_post_likes fks98gntvorodjgg3tc6h3etwr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT fks98gntvorodjgg3tc6h3etwr FOREIGN KEY (post_id) REFERENCES public.community_posts(id);


--
-- PostgreSQL database dump complete
--



-- ============================================================================
-- V2 - V7 TABLES AND CONSTRAINTS (Route Analytics, Operator Portal,
-- Data Licensing, Billing, Smart QR, and Stop Slugs)
-- ============================================================================

--
-- Name: route_events; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.route_events (
    id uuid NOT NULL,
    recorded_at timestamp(6) with time zone NOT NULL,
    received_at timestamp(6) with time zone NOT NULL,
    route_id uuid,
    stop_id uuid,
    transport_line_id uuid,
    city_id uuid,
    category character varying(30) NOT NULL,
    device_hash character varying(64) NOT NULL,
    campaign character varying(255),
    qr_code_id uuid,
    CONSTRAINT route_events_pkey PRIMARY KEY (id, recorded_at),
    CONSTRAINT route_events_category_check CHECK (((category)::text = ANY ((ARRAY[
        'route_view'::character varying,
        'route_search'::character varying,
        'stop_view'::character varying,
        'nearby_query'::character varying,
        'qr_scan'::character varying,
        'community_post'::character varying,
        'page_view'::character varying,
        'favorite_added'::character varying,
        'qr_redirect_failed'::character varying
    ])::text[])))
) PARTITION BY RANGE (recorded_at);

DO 120990
DECLARE
    month_start date := date_trunc('month', CURRENT_DATE)::date;
    range_start date;
    range_end date;
    partition_name text;
BEGIN
    FOR i IN 0..23 LOOP
        range_start := month_start + (i || ' months')::interval;
        range_end := range_start + interval '1 month';
        partition_name := 'route_events_' || to_char(range_start, 'YYYY_MM');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.route_events FOR VALUES FROM (%L) TO (%L)',
            partition_name, range_start, range_end
        );
    END LOOP;
END 120990;

CREATE TABLE IF NOT EXISTS public.route_events_default PARTITION OF public.route_events DEFAULT;

--
-- Name: route_daily_stats; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.route_daily_stats (
    id uuid NOT NULL,
    route_id uuid,
    transport_line_id uuid,
    city_id uuid NOT NULL,
    date date NOT NULL,
    views integer NOT NULL DEFAULT 0,
    searches integer NOT NULL DEFAULT 0,
    qr_scans integer NOT NULL DEFAULT 0,
    stop_views integer NOT NULL DEFAULT 0,
    nearby_queries integer NOT NULL DEFAULT 0,
    community_posts integer NOT NULL DEFAULT 0,
    unique_devices integer NOT NULL DEFAULT 0,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT route_daily_stats_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_route_daily_stats_route_date
    ON public.route_daily_stats (
        COALESCE(route_id, '00000000-0000-0000-0000-000000000000'::uuid),
        date
    );

CREATE INDEX IF NOT EXISTS idx_route_daily_stats_city_date
    ON public.route_daily_stats USING btree (city_id, date);

CREATE INDEX IF NOT EXISTS idx_route_events_route_recorded
    ON public.route_events USING btree (route_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_route_events_device_day
    ON public.route_events USING btree (device_hash, recorded_at);

CREATE INDEX IF NOT EXISTS idx_route_events_qr_code_id
    ON public.route_events USING btree (qr_code_id, recorded_at);

--
-- Name: operators; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.operators (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    ruc character varying(20) NOT NULL,
    contact_name character varying(255),
    contact_email character varying(255),
    contact_phone character varying(50),
    city_id uuid NOT NULL,
    plan character varying(20) NOT NULL DEFAULT 'PRO',
    active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT operators_pkey PRIMARY KEY (id),
    CONSTRAINT operators_ruc_key UNIQUE (ruc),
    CONSTRAINT operators_plan_check CHECK (plan IN ('BASIC', 'PRO', 'ENTERPRISE')),
    CONSTRAINT fk_operators_city FOREIGN KEY (city_id) REFERENCES public.cities(id)
);

--
-- Name: operator_users; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.operator_users (
    id uuid NOT NULL,
    operator_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    role character varying(20) NOT NULL DEFAULT 'EDITOR',
    active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT operator_users_pkey PRIMARY KEY (id),
    CONSTRAINT operator_users_email_key UNIQUE (email),
    CONSTRAINT operator_users_role_check CHECK (role IN ('OWNER', 'EDITOR')),
    CONSTRAINT fk_operator_users_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_operator_users_operator_id ON public.operator_users USING btree (operator_id);

ALTER TABLE ONLY public.transport_lines
    ADD CONSTRAINT fk_transport_lines_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id);

CREATE INDEX IF NOT EXISTS idx_transport_lines_operator_id ON public.transport_lines USING btree (operator_id);

--
-- Name: disruptions; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.disruptions (
    id uuid NOT NULL,
    operator_id uuid NOT NULL,
    route_id uuid NOT NULL,
    type character varying(40) NOT NULL,
    description character varying(500) NOT NULL,
    starts_at timestamp(6) without time zone NOT NULL,
    ends_at timestamp(6) without time zone,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT disruptions_pkey PRIMARY KEY (id),
    CONSTRAINT disruptions_type_check CHECK (type IN ('DESVIO', 'CORTE', 'HORARIO', 'PARADERO', 'OTRO')),
    CONSTRAINT fk_disruptions_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE,
    CONSTRAINT fk_disruptions_route FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_disruptions_operator_id ON public.disruptions USING btree (operator_id);
CREATE INDEX IF NOT EXISTS idx_disruptions_route_id ON public.disruptions USING btree (route_id);

--
-- Name: change_logs; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.change_logs (
    id uuid NOT NULL,
    operator_id uuid,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    field character varying(100) NOT NULL,
    old_value text,
    new_value text,
    author_email character varying(255) NOT NULL,
    author_role character varying(30) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT change_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_change_logs_operator_id ON public.change_logs USING btree (operator_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_entity ON public.change_logs USING btree (entity_type, entity_id);

--
-- Name: data_licenses; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.data_licenses (
    id uuid NOT NULL,
    client_name character varying(255) NOT NULL,
    plan character varying(20) NOT NULL,
    conditions character varying(2000),
    valid_from date NOT NULL,
    valid_until date NOT NULL,
    monthly_quota integer NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT data_licenses_pkey PRIMARY KEY (id),
    CONSTRAINT data_licenses_plan_check CHECK (plan IN ('BASIC', 'PRO', 'ENTERPRISE')),
    CONSTRAINT data_licenses_monthly_quota_check CHECK (monthly_quota > 0)
);

--
-- Name: data_api_keys; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.data_api_keys (
    id uuid NOT NULL,
    key_hash character varying(64) NOT NULL,
    client_name character varying(255) NOT NULL,
    plan character varying(20) NOT NULL,
    monthly_quota integer NOT NULL,
    used_this_period integer NOT NULL DEFAULT 0,
    period_start date NOT NULL,
    active boolean NOT NULL DEFAULT true,
    operator_id uuid,
    data_license_id uuid NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    last_used_at timestamp(6) without time zone,
    CONSTRAINT data_api_keys_pkey PRIMARY KEY (id),
    CONSTRAINT data_api_keys_key_hash_key UNIQUE (key_hash),
    CONSTRAINT data_api_keys_plan_check CHECK (plan IN ('BASIC', 'PRO', 'ENTERPRISE')),
    CONSTRAINT data_api_keys_monthly_quota_check CHECK (monthly_quota > 0),
    CONSTRAINT fk_data_api_keys_license FOREIGN KEY (data_license_id) REFERENCES public.data_licenses(id),
    CONSTRAINT fk_data_api_keys_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id)
);

CREATE INDEX IF NOT EXISTS idx_data_api_keys_license_id ON public.data_api_keys USING btree (data_license_id);
CREATE INDEX IF NOT EXISTS idx_data_api_keys_operator_id ON public.data_api_keys USING btree (operator_id);

--
-- Name: data_access_logs; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.data_access_logs (
    id uuid NOT NULL,
    api_key_id uuid NOT NULL,
    endpoint character varying(255) NOT NULL,
    city_slug character varying(100) NOT NULL,
    status_code integer NOT NULL,
    requested_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT data_access_logs_pkey PRIMARY KEY (id),
    CONSTRAINT fk_data_access_logs_api_key FOREIGN KEY (api_key_id) REFERENCES public.data_api_keys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_data_access_logs_api_key_id ON public.data_access_logs USING btree (api_key_id);

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.subscriptions (
    id uuid NOT NULL,
    operator_id uuid NOT NULL,
    plan character varying(20) NOT NULL DEFAULT 'PRO',
    status character varying(20) NOT NULL DEFAULT 'TRIAL',
    starts_at timestamp(6) without time zone NOT NULL,
    renews_at timestamp(6) without time zone,
    grace_until timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT subscriptions_operator_id_key UNIQUE (operator_id),
    CONSTRAINT subscriptions_plan_check CHECK (plan IN ('PRO')),
    CONSTRAINT subscriptions_status_check CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED')),
    CONSTRAINT fk_subscriptions_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE
);

--
-- Name: subscription_periods; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.subscription_periods (
    id uuid NOT NULL,
    subscription_id uuid NOT NULL,
    operator_id uuid NOT NULL,
    from_at timestamp(6) without time zone NOT NULL,
    to_at timestamp(6) without time zone NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) NOT NULL DEFAULT 'PEN',
    method character varying(20) NOT NULL DEFAULT 'QR',
    status character varying(20) NOT NULL DEFAULT 'PENDING',
    provider_reference character varying(100) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT subscription_periods_pkey PRIMARY KEY (id),
    CONSTRAINT subscription_periods_provider_reference_key UNIQUE (provider_reference),
    CONSTRAINT subscription_periods_status_check CHECK (status IN ('PENDING', 'PAID', 'FAILED')),
    CONSTRAINT fk_subscription_periods_subscription FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_subscription_periods_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscription_periods_subscription_id ON public.subscription_periods USING btree (subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_periods_operator_id ON public.subscription_periods USING btree (operator_id);

--
-- Name: billing_events; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.billing_events (
    id uuid NOT NULL,
    provider_event_id character varying(100) NOT NULL,
    event_type character varying(50) NOT NULL,
    provider_reference character varying(100),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    processed_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT billing_events_pkey PRIMARY KEY (id),
    CONSTRAINT billing_events_provider_event_id_key UNIQUE (provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_events_provider_event_id ON public.billing_events USING btree (provider_event_id);

--
-- Name: qr_codes; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.qr_codes (
    id uuid NOT NULL,
    code character varying(32) NOT NULL,
    label character varying(120) NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id uuid,
    campaign_source character varying(60),
    campaign_medium character varying(60),
    campaign_name character varying(100),
    status character varying(20) NOT NULL DEFAULT 'ACTIVE',
    operator_id uuid,
    created_at timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT qr_codes_pkey PRIMARY KEY (id),
    CONSTRAINT qr_codes_code_key UNIQUE (code),
    CONSTRAINT qr_codes_target_type_check CHECK (target_type IN ('HOME', 'ROUTE', 'STOP', 'CAMPAIGN')),
    CONSTRAINT qr_codes_status_check CHECK (status IN ('ACTIVE', 'PAUSED', 'REVOKED')),
    CONSTRAINT fk_qr_codes_operator FOREIGN KEY (operator_id) REFERENCES public.operators(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON public.qr_codes USING btree (code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_operator_id ON public.qr_codes USING btree (operator_id);

--
-- Name: uq_stops_slug; Type: INDEX; Schema: public; Owner: -
--
CREATE UNIQUE INDEX IF NOT EXISTS uq_stops_slug ON public.stops USING btree (slug);
