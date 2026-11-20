-- Remove legacy name and code columns from transport_lines
--
-- Company is the canonical identifier for transport lines.
-- Routes maintain code and name for transit navigation, and GTFS uses route.code.

UPDATE public.transport_lines
SET company = name
WHERE (company IS NULL OR TRIM(company) = '') AND name IS NOT NULL;

ALTER TABLE public.transport_lines
    DROP COLUMN IF EXISTS name,
    DROP COLUMN IF EXISTS code;
