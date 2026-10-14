-- Migration V7: accent-insensitive search support for global route search.
--
-- Enables the Postgres `unaccent` extension used by the ranked search queries in
-- RouteRepository (searchByQuery / searchByQueryAndCityId), and provides an
-- immutable wrapper for future functional indexes (plain unaccent() is STABLE,
-- so it cannot back an index directly).
--
-- HOW TO APPLY: this project has no migration runner wired in Spring
-- (spring.jpa.hibernate.ddl-auto=update, no Flyway/Liquibase dependency), so the
-- SQL files in this directory are applied manually, following the existing
-- convention. Run this file once against the database with a privileged role
-- (CREATE EXTENSION requires it; on Supabase use the SQL editor):
--
--   psql "$DB_URL" -f V7__add_unaccent_search_support.sql

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT unaccent($1);
$$ LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE;
