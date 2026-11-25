-- =============================================================================
-- V2 deployment control: backup + post-migration verification
-- =============================================================================
-- Run BEFORE applying V2 in production:
--
--   CREATE TABLE route_points_v2_backup AS TABLE public.route_points;
--   CREATE TABLE route_stops_v2_backup AS TABLE public.route_stops;
--   CREATE TABLE route_directions_v2_backup AS TABLE public.route_directions;
--
-- Recovery: restore the affected columns from the backups, e.g.
--   UPDATE public.route_directions d SET direction = b.direction
--   FROM route_directions_v2_backup b WHERE b.id = d.id;
--
-- Run the queries below AFTER V2. Every query MUST return zero rows / the
-- expected single value. Exit non-zero on any unexpected result in CI.
-- =============================================================================

-- 1. No legacy or null direction values remain.
SELECT DISTINCT direction
FROM public.route_directions
WHERE direction IS NULL
   OR direction NOT IN ('IDA', 'VUELTA');
-- EXPECTED: 0 rows

-- 2. Direction values are unique per route (also enforced by UNIQUE).
SELECT route_id, direction, COUNT(*)
FROM public.route_directions
GROUP BY route_id, direction
HAVING COUNT(*) > 1;
-- EXPECTED: 0 rows

-- 3. Point order is contiguous (1..N) and unique inside every direction.
SELECT direction_id, COUNT(*) AS point_count, MIN(point_order) AS min_order, MAX(point_order) AS max_order
FROM public.route_points
GROUP BY direction_id
HAVING COUNT(*) <> COUNT(DISTINCT point_order)
    OR MIN(point_order) <> 1
    OR MAX(point_order) <> COUNT(*);
-- EXPECTED: 0 rows

-- 4. Stop order is unique inside every direction.
SELECT direction_id, stop_order, COUNT(*)
FROM public.route_stops
GROUP BY direction_id, stop_order
HAVING COUNT(*) > 1;
-- EXPECTED: 0 rows

-- 5. No point without geometry remains (also enforced by NOT NULL).
SELECT COUNT(*) AS null_locations
FROM public.route_points
WHERE location IS NULL;
-- EXPECTED: 0

-- 6. Every direction has a baseline geometry (after backfill).
SELECT d.id
FROM public.route_directions d
LEFT JOIN public.route_points rp ON rp.direction_id = d.id
GROUP BY d.id
HAVING COUNT(rp.id) = 0;
-- EXPECTED: 0 rows (directions created without stops are a valid exception
-- only if the product explicitly allows them; review before accepting).

-- 7. Constraints and index exist.
SELECT conname
FROM pg_constraint
WHERE conname IN (
    'uk_route_stops_direction_stop',
    'uk_route_stops_direction_order',
    'uk_route_points_direction_order',
    'uk_route_directions_route_direction',
    'ck_route_directions_direction'
)
ORDER BY conname;
-- EXPECTED: 5 rows

SELECT indexname
FROM pg_indexes
WHERE indexname = 'idx_route_points_direction_id';
-- EXPECTED: 1 row
