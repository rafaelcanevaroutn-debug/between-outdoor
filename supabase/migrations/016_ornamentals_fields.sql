-- 016_ornamentals_fields.sql
-- Adds tags, description, color_map, and archived_at to elements

ALTER TABLE elements
  ADD COLUMN IF NOT EXISTS tags        text[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS color_map   jsonb     DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
