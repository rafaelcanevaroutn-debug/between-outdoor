-- ============================================================
-- 005_brand_identity.sql
-- Identidad visual por cliente (colores, tipografía, logo)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brand_identity (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Colores
  color_primario   text,
  color_secundario text,
  color_acento     text,
  color_texto      text,
  color_fondo      text,

  -- Tipografía
  font_family      text,

  -- Logo
  logo_url         text,

  -- Meta
  updated_at       timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now(),

  CONSTRAINT brand_identity_user_id_key UNIQUE (user_id)
);

-- ---- RLS ----
ALTER TABLE public.brand_identity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brand_identity_select ON public.brand_identity;
CREATE POLICY brand_identity_select ON public.brand_identity
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS brand_identity_insert ON public.brand_identity;
CREATE POLICY brand_identity_insert ON public.brand_identity
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS brand_identity_update ON public.brand_identity;
CREATE POLICY brand_identity_update ON public.brand_identity
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS brand_identity_delete ON public.brand_identity;
CREATE POLICY brand_identity_delete ON public.brand_identity
  FOR DELETE USING (is_admin());

-- ---- Nota: Storage ----
-- Crear el bucket "logos" en Supabase Dashboard → Storage → New bucket
-- Nombre: logos | Public: true
-- Policy sugerida: permitir upload a auth.uid() y lectura pública
