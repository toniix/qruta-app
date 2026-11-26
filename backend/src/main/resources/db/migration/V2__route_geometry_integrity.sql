-- =============================================================================
-- V2: route geometry integrity + canonical direction vocabulary
-- =============================================================================
-- This migration is intentionally idempotent: it can be replayed without
-- duplicating route points or reprocessing direction values. Constraint and
-- index creation is guarded so a replay does not fail on "already exists".
--
-- Order matters:
--   1. preflight (abort on data that cannot be fixed automatically)
--   2. normalize OUTBOUND/INBOUND -> IDA/VUELTA
--   3. drop points without geometry
--   4. renumber duplicate/gapped orders (only before unique order constraints exist)
--   5. backfill route_points only for directions that have none
--   6. add constraints, CHECK and index
-- =============================================================================

-- 1. Preflight ---------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.route_directions
        WHERE direction IS NULL
           OR direction NOT IN ('IDA', 'VUELTA', 'OUTBOUND', 'INBOUND')
    ) THEN
        RAISE EXCEPTION 'V2 aborted: route_directions.direction contains an unknown value. '
                        'Expected IDA, VUELTA, OUTBOUND or INBOUND.';
    END IF;

    -- After normalization, IDA+OUTBOUND would collapse into the same value and
    -- violate UNIQUE(route_id, direction). Same for VUELTA+INBOUND.
    IF EXISTS (
        SELECT 1
        FROM public.route_directions
        GROUP BY route_id
        HAVING COUNT(*) FILTER (WHERE direction IN ('IDA', 'OUTBOUND')) > 1
            OR COUNT(*) FILTER (WHERE direction IN ('VUELTA', 'INBOUND')) > 1
    ) THEN
        RAISE EXCEPTION 'V2 aborted: a route has duplicate or mixed direction values '
                        '(IDA/OUTBOUND or VUELTA/INBOUND). Resolve them manually before migrating.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM (
            SELECT direction_id, stop_id
            FROM public.route_stops
            GROUP BY direction_id, stop_id
            HAVING COUNT(*) > 1
        ) duplicates
    ) THEN
        RAISE EXCEPTION 'V2 aborted: route_stops has the same stop twice in one direction. '
                        'Remove the duplicates before migrating.';
    END IF;
END $$;

-- 2. Canonical vocabulary ----------------------------------------------------
UPDATE public.route_directions SET direction = 'IDA'    WHERE direction = 'OUTBOUND';
UPDATE public.route_directions SET direction = 'VUELTA' WHERE direction = 'INBOUND';

-- 3. Drop unusable points before renumbering and backfill --------------------
DELETE FROM public.route_points WHERE location IS NULL;

-- 4. Renumber duplicate or gapped order values -------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_route_stops_direction_order') THEN
        WITH ranked AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY direction_id
                       ORDER BY stop_order NULLS LAST, created_at, id
                   ) AS rn
            FROM public.route_stops
        )
        UPDATE public.route_stops rs
        SET stop_order = ranked.rn
        FROM ranked
        WHERE rs.id = ranked.id
          AND rs.stop_order IS DISTINCT FROM ranked.rn;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_route_points_direction_order') THEN
        WITH ranked AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY direction_id
                       ORDER BY point_order NULLS LAST, created_at, id
                   ) AS rn
            FROM public.route_points
        )
        UPDATE public.route_points rp
        SET point_order = ranked.rn
        FROM ranked
        WHERE rp.id = ranked.id
          AND rp.point_order IS DISTINCT FROM ranked.rn;
    END IF;
END $$;

-- 5. Backfill geometry for directions without points ------------------------
INSERT INTO public.route_points (id, direction_id, point_order, location, created_at)
SELECT gen_random_uuid(),
       rs.direction_id,
       ROW_NUMBER() OVER (
           PARTITION BY rs.direction_id
           ORDER BY rs.stop_order, rs.id
       ),
       s.location,
       NOW()
FROM public.route_stops rs
JOIN public.stops s ON s.id = rs.stop_id
JOIN public.route_directions d ON d.id = rs.direction_id
WHERE s.location IS NOT NULL
  AND d.direction IN ('IDA', 'VUELTA')
  AND NOT EXISTS (
      SELECT 1 FROM public.route_points existing
      WHERE existing.direction_id = rs.direction_id
  );

-- 6. Integrity rules ---------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_route_stops_direction_stop') THEN
        ALTER TABLE public.route_stops
            ADD CONSTRAINT uk_route_stops_direction_stop UNIQUE (direction_id, stop_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_route_stops_direction_order') THEN
        ALTER TABLE public.route_stops
            ADD CONSTRAINT uk_route_stops_direction_order UNIQUE (direction_id, stop_order);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_route_points_direction_order') THEN
        ALTER TABLE public.route_points
            ADD CONSTRAINT uk_route_points_direction_order UNIQUE (direction_id, point_order);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_route_directions_route_direction') THEN
        ALTER TABLE public.route_directions
            ADD CONSTRAINT uk_route_directions_route_direction UNIQUE (route_id, direction);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_route_directions_direction') THEN
        ALTER TABLE public.route_directions
            ADD CONSTRAINT ck_route_directions_direction CHECK (direction IN ('IDA', 'VUELTA'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'route_points'
          AND column_name = 'location'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.route_points ALTER COLUMN location SET NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_route_points_direction_id
    ON public.route_points USING btree (direction_id);
