-- ============================================================
-- 006_brand_identity_fonts.sql
-- Separar tipografía en font_title y font_body
-- ============================================================

ALTER TABLE public.brand_identity
  ADD COLUMN IF NOT EXISTS font_title text,
  ADD COLUMN IF NOT EXISTS font_body  text;

-- font_family se mantiene para no romper filas existentes,
-- pero ya no se usa desde la aplicación.
