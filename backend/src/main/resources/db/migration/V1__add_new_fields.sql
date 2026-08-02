-- Migration: Add new fields to TransportLine, Route, Stop, and RouteDirection

-- TransportLine: add code, color, company, contact
ALTER TABLE transport_lines ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE transport_lines ADD COLUMN IF NOT EXISTS color VARCHAR(20);
ALTER TABLE transport_lines ADD COLUMN IF NOT EXISTS company VARCHAR(255);
ALTER TABLE transport_lines ADD COLUMN IF NOT EXISTS contact VARCHAR(50);

-- Route: add fare, schedule, frequency
ALTER TABLE routes ADD COLUMN IF NOT EXISTS fare VARCHAR(20);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS schedule VARCHAR(50);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS frequency VARCHAR(50);

-- Stop: add address, is_accessible (reference already exists)
ALTER TABLE stops ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE stops ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN NOT NULL DEFAULT true;

-- RouteDirection: add total_distance_km, estimated_minutes
ALTER TABLE route_directions ADD COLUMN IF NOT EXISTS total_distance_km DECIMAL(6,2);
ALTER TABLE route_directions ADD COLUMN IF NOT EXISTS estimated_minutes SMALLINT;
