-- Migration V7: accent-insensitive search support for global route search.
--
-- Enables the Postgres `unaccent` extension used by the ranked search queries in
-- RouteRepository (searchByQuery / searchByQueryAndCityId), and provides an
-- immutable wrapper for future functional indexes (plain unaccent() is STABLE,
-- so it cannot back an index directly).
--
-- HOW IT RUNS: Flyway applies this directory on startup when enabled
-- (prod profile, or FLYWAY_ENABLED=true). The existing production schema,
-- already at V7 state, is baselined once via baseline-on-migrate; only NEW
-- versions run after that. Manual fallback if Flyway is off:
--
--   psql "$DB_URL" -f V7__add_unaccent_search_support.sql

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT unaccent($1);
$$ LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE;
