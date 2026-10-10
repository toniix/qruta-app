-- Migration V4: Add spatial GiST indexes for PostGIS geography/geometry queries
-- Optimizes ST_DWithin and ST_Distance calculations for nearby stops and route points.

CREATE INDEX IF NOT EXISTS idx_stops_location_gist
ON stops USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_route_points_location_gist
ON route_points USING GIST (location);

