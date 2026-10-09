-- Migration V3: Add popularity_score column to routes table
-- This column drives the "Rutas populares" section on the home screen.
-- Existing routes are seeded with a 0 score so ordering works immediately.

ALTER TABLE routes ADD COLUMN IF NOT EXISTS popularity_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE routes ALTER COLUMN popularity_score SET DEFAULT 0;

-- Backfill any rows that were created before the column existed with a zero score.
-- (Only keeps rows that somehow ended up NULL despite the NOT NULL guarantee.)
UPDATE routes SET popularity_score = 0 WHERE popularity_score IS NULL;