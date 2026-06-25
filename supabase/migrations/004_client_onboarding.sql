-- ============================================================
-- 004_client_onboarding.sql
-- Tabla de onboarding por cliente + RLS con is_admin()
-- ============================================================

CREATE TABLE IF NOT EXISTS public.client_onboarding (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Bloque 1: Cliente ideal
  avatar_edad_genero    text,
  avatar_experiencia    text,      -- 'principiante' | 'intermedio' | 'avanzado' | 'mixto'
  avatar_objeciones     text,
  avatar_motor          text[],    -- multi: 'comunidad' | 'superarse' | 'desconectar' | 'aventura'

  -- Bloque 2: Marca y voz
  marca_personalidad    text,
  marca_lineas_rojas    text,
  marca_autoridad       text,
  marca_testimonios     text,      -- 'bastante' | 'algo' | 'poco' (+ detalle embebido en el texto)

  -- Bloque 3: Oferta y calendario
  objetivos_corto_plazo text,
  servicios_estrella    text,
  calendario            text,

  -- Bloque 4: Embudo y material
  embudo_paso           text,      -- 'whatsapp' | 'bio' | 'comentario' | 'dm' | 'formulario'
  material_visual       text[],    -- multi: 'fotos_salidas' | 'videos_accion' | 'testimonios' | 'paisajes' | 'persona_camara' | 'grupo'

  -- Meta
  completed_at          timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),

  CONSTRAINT client_onboarding_user_id_key UNIQUE (user_id)
);

-- ---- RLS ----
ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;

-- SELECT: own row or admin
DROP POLICY IF EXISTS onboarding_select ON public.client_onboarding;
CREATE POLICY onboarding_select ON public.client_onboarding
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- INSERT: own row (trigger context: auth.uid() IS NULL allowed too)
DROP POLICY IF EXISTS onboarding_insert ON public.client_onboarding;
CREATE POLICY onboarding_insert ON public.client_onboarding
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

-- UPDATE: own row or admin
DROP POLICY IF EXISTS onboarding_update ON public.client_onboarding;
CREATE POLICY onboarding_update ON public.client_onboarding
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- DELETE: admin only
DROP POLICY IF EXISTS onboarding_delete ON public.client_onboarding;
CREATE POLICY onboarding_delete ON public.client_onboarding
  FOR DELETE USING (is_admin());
