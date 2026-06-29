-- ============================================================
-- 011_mati_integration.sql
-- Integración con la skill de renderizado de carruseles de Mati
-- ============================================================

-- Identificador corto de carpeta que Mati usa en Drive (ej: "mv", "entre-montana")
-- El admin lo setea en Mi Marca. Si es null, el POST a Mati se saltea.
ALTER TABLE public.brand_identity
  ADD COLUMN IF NOT EXISTS mati_cliente_id text;

-- Carpeta de Drive donde Mati guarda el carrusel renderizado.
-- Se guarda con el drive_folder_id que devuelve la skill después de renderizar.
ALTER TABLE public.contenido_generado
  ADD COLUMN IF NOT EXISTS render_folder_id text;
