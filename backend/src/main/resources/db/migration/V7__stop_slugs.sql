-- Stop Slugs for Clean Semantic URLs
--
-- Adds unique slug column to stops for SEO and user-friendly URLs
-- (e.g., /mapa/paradero/plaza-de-armas-de-ica).

ALTER TABLE public.stops
    ADD COLUMN IF NOT EXISTS slug character varying(150);

-- Backfill slugs for existing stops using unaccent and slugify pattern
UPDATE public.stops
SET slug = LOWER(
    TRIM(BOTH '-' FROM
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                public.unaccent(name),
                '[^a-zA-Z0-9\s-]', '', 'g'
            ),
            '[\s-]+', '-', 'g'
        )
    )
)
WHERE slug IS NULL;

-- Enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uq_stops_slug ON public.stops USING btree (slug);
