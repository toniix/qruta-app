-- Migration V5: Add indexes on foreign-key columns
-- PostgreSQL does NOT index FK columns automatically, so every lookup by parent
-- (findByStopId, findByRouteId, findByCityId, ...) is a sequential scan. That is
-- cheap at the current table sizes but grows linearly, and the admin/public list
-- endpoints amplify it by issuing many such lookups.
--
-- NOTE: this fixes future growth, not current latency — the N+1 latency was
-- dominated by the number of remote round trips and is fixed in the services
-- with JOIN FETCH / batched queries.
--
-- On a large production table, create these with CREATE INDEX CONCURRENTLY to
-- avoid locking writes (not usable inside a transaction block).

CREATE INDEX IF NOT EXISTS idx_route_stops_stop_id
ON route_stops (stop_id);

CREATE INDEX IF NOT EXISTS idx_route_stops_direction_id
ON route_stops (direction_id);

CREATE INDEX IF NOT EXISTS idx_route_directions_route_id
ON route_directions (route_id);

CREATE INDEX IF NOT EXISTS idx_routes_transport_line_id
ON routes (transport_line_id);

CREATE INDEX IF NOT EXISTS idx_transport_lines_city_id
ON transport_lines (city_id);
