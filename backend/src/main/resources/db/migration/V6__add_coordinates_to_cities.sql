-- Migration V6: Add geographic center coordinates and coverage radius to cities table
-- Enables automatic city detection from user GPS coordinates via Haversine distance.

ALTER TABLE cities ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS radius_km DECIMAL(6, 2) NOT NULL DEFAULT 30.0;

-- Backfill coordinates for existing seeded cities (Lima & Ica)
UPDATE cities
SET latitude = -12.0463740,
    longitude = -77.0427930,
    radius_km = 60.00
WHERE LOWER(name) = 'lima';

UPDATE cities
SET latitude = -14.0677700,
    longitude = -75.7286100,
    radius_km = 30.00
WHERE LOWER(name) = 'ica';
