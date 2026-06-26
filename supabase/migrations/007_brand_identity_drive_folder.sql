-- ============================================================
-- 007_brand_identity_drive_folder.sql
-- Guardar el drive_folder_id que devuelve la skill de Mati
-- ============================================================

ALTER TABLE public.brand_identity
  ADD COLUMN IF NOT EXISTS drive_folder_id text;
