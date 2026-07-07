-- 015_ornamentals.sql
-- Add color_mode to elements table and seed ornamental assets

-- 1. Add color_mode column to elements
ALTER TABLE elements
  ADD COLUMN IF NOT EXISTS color_mode text DEFAULT 'tint'
  CHECK (color_mode IN ('tint', 'fixed'));

-- 2. Storage bucket for ornamentals (public, read-only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ornamentals', 'ornamentals', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies
CREATE POLICY IF NOT EXISTS "Public read ornamentals"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ornamentals');

CREATE POLICY IF NOT EXISTS "Admin manage ornamentals"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'ornamentals'
    AND auth.uid() = '75a22462-2acf-4c27-b161-c54ea5b80269'::uuid
  )
  WITH CHECK (
    bucket_id = 'ornamentals'
    AND auth.uid() = '75a22462-2acf-4c27-b161-c54ea5b80269'::uuid
  );

-- 4. Seed cardón ornamental for Norte
INSERT INTO elements (kind, type, species_name, region_id, component_key, asset_url, color_mode, props_schema)
SELECT
  'ornamental',
  'svg',
  'Cardón (Echinopsis terscheckii)',
  r.id,
  'cardon',
  '/ornamentals/cardon.svg',
  'tint',
  '{"defaultW": 200, "defaultH": 400}'::jsonb
FROM regions r
WHERE r.slug = 'norte'
ON CONFLICT DO NOTHING;
