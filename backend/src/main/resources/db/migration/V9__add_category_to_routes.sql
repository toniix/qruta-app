-- Migration V9: Add category column to routes table
-- Categorizes public transport vehicle type (e.g. 'MICRO', 'COMBI').
-- Defaults to 'MICRO' for backwards compatibility with existing route records.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'MICRO';
ALTER TABLE routes ALTER COLUMN category SET DEFAULT 'MICRO';

-- Ensure backfilled consistency
UPDATE routes SET category = 'MICRO' WHERE category IS NULL;

-- Index for filtering routes by category
CREATE INDEX IF NOT EXISTS idx_routes_category ON routes(category);
