-- Route usage analytics.
--
-- Two tables:
--   route_events       raw, append-only events. Partitioned by month on recorded_at so a
--                      year of events can be dropped or archived per partition.
--   route_daily_stats  daily aggregates recomputed from route_events (idempotent job).
--
-- PRIVACY: route_events never stores a raw device id. It stores only device_hash, a
-- SHA-256 digest salted with a secret that rotates every day, so a device deduplicates
-- within a day but cannot be re-identified across days.
--
-- No foreign keys on route_events on purpose: an event is a fact about usage, and a
-- catalog row being deleted must not cascade-delete the city's demand history.

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
    CONSTRAINT route_events_pkey PRIMARY KEY (id, recorded_at),
    CONSTRAINT route_events_category_check CHECK (((category)::text = ANY ((ARRAY[
        'route_view'::character varying,
        'route_search'::character varying,
        'stop_view'::character varying,
        'nearby_query'::character varying,
        'qr_scan'::character varying,
        'community_post'::character varying
    ])::text[])))
) PARTITION BY RANGE (recorded_at);

-- Monthly partitions for a rolling 24-month window plus a DEFAULT partition so an
-- insert outside the pre-created range still succeeds instead of failing the request.
DO $$
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
END $$;

CREATE TABLE IF NOT EXISTS public.route_events_default PARTITION OF public.route_events DEFAULT;

-- Per-route daily aggregates. Rebuilt with DELETE + INSERT for a (city, date), so
-- running the aggregation twice yields the same numbers. route_id is null for the
-- city-level rollup of events that carry no route.
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

CREATE UNIQUE INDEX uq_route_daily_stats_route_date
    ON public.route_daily_stats (
        COALESCE(route_id, '00000000-0000-0000-0000-000000000000'::uuid),
        date
    );

CREATE INDEX idx_route_daily_stats_city_date
    ON public.route_daily_stats USING btree (city_id, date);

CREATE INDEX idx_route_events_route_recorded
    ON public.route_events USING btree (route_id, recorded_at);

CREATE INDEX idx_route_events_device_day
    ON public.route_events USING btree (device_hash, recorded_at);
