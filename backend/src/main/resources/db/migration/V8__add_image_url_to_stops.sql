-- Migration V8: Add image_url column to stops table
-- Holds the full public URL of the stop's single reference image (Supabase
-- Storage). Nullable: existing stops have no image. The URL is stored whole so
-- the static, config-free DtoMapper.toStopResponse can expose it directly.

ALTER TABLE stops ADD COLUMN IF NOT EXISTS image_url TEXT;
