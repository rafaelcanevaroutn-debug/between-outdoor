-- ============================================================
-- 012_fotos_folder.sql
-- Carpeta raíz de fotos del cliente en Drive (distinta de
-- drive_folder_id que setea Mati para sus outputs)
-- ============================================================

ALTER TABLE public.brand_identity
  ADD COLUMN IF NOT EXISTS fotos_folder_id text;
