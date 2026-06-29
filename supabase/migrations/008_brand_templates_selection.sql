-- ============================================================
-- 008_brand_templates_selection.sql
-- Templates elegidos por el cliente para sus carruseles
-- ============================================================

ALTER TABLE public.brand_identity
  ADD COLUMN IF NOT EXISTS templates_elegidos text[] DEFAULT '{}';
