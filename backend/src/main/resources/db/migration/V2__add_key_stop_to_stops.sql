-- Migration V2: Add key_stop column to stops table
-- This column marks a stop as a "key stop" (punto clave) to be shown
-- in the route card summary without loading full route directions.

ALTER TABLE stops ADD COLUMN IF NOT EXISTS key_stop BOOLEAN NOT NULL DEFAULT false;
