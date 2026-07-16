-- Formatos de carrusel variables y datos estructurados para generación.
-- Esta migración es aditiva: conserva las columnas y formatos existentes.

ALTER TABLE public.salidas
  ADD COLUMN IF NOT EXISTS pais_codigo text NOT NULL DEFAULT 'AR',
  ADD COLUMN IF NOT EXISTS itinerario_dias jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS puntos_interes jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.salidas
  DROP CONSTRAINT IF EXISTS salidas_pais_codigo_check,
  ADD CONSTRAINT salidas_pais_codigo_check
    CHECK (pais_codigo ~ '^[A-Z]{2}$'),
  DROP CONSTRAINT IF EXISTS salidas_itinerario_dias_array_check,
  ADD CONSTRAINT salidas_itinerario_dias_array_check
    CHECK (jsonb_typeof(itinerario_dias) = 'array'),
  DROP CONSTRAINT IF EXISTS salidas_puntos_interes_array_check,
  ADD CONSTRAINT salidas_puntos_interes_array_check
    CHECK (jsonb_typeof(puntos_interes) = 'array');

ALTER TABLE public.contenido_generado
  ADD COLUMN IF NOT EXISTS formato_carrusel text,
  ADD COLUMN IF NOT EXISTS objetivo_interaccion text,
  ADD COLUMN IF NOT EXISTS descripcion_post text,
  ADD COLUMN IF NOT EXISTS generation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_salida_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.contenido_generado
  DROP CONSTRAINT IF EXISTS contenido_formato_carrusel_check,
  ADD CONSTRAINT contenido_formato_carrusel_check CHECK (
    formato_carrusel IS NULL OR formato_carrusel IN (
      'editorial', 'organico', 'itinerario', 'ascenso',
      'calendario', 'lugar', 'conversacion'
    )
  ),
  DROP CONSTRAINT IF EXISTS contenido_objetivo_interaccion_check,
  ADD CONSTRAINT contenido_objetivo_interaccion_check CHECK (
    objetivo_interaccion IS NULL OR objetivo_interaccion IN (
      'comentar', 'guardar', 'compartir', 'convertir'
    )
  ),
  DROP CONSTRAINT IF EXISTS contenido_generation_metadata_object_check,
  ADD CONSTRAINT contenido_generation_metadata_object_check
    CHECK (jsonb_typeof(generation_metadata) = 'object');

CREATE TABLE IF NOT EXISTS public.feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pais text NOT NULL DEFAULT 'AR',
  fecha date NOT NULL,
  nombre text NOT NULL,
  tipo text,
  fuente text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pais, fecha, nombre)
);

ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feriados_select_authenticated ON public.feriados;
CREATE POLICY feriados_select_authenticated ON public.feriados
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS feriados_admin_insert ON public.feriados;
CREATE POLICY feriados_admin_insert ON public.feriados
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS feriados_admin_update ON public.feriados;
CREATE POLICY feriados_admin_update ON public.feriados
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS feriados_admin_delete ON public.feriados;
CREATE POLICY feriados_admin_delete ON public.feriados
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
