-- Agrega la columna scheduled_at a contenido_generado para que cada pieza
-- generada por el batch semanal tenga una fecha+hora de publicación asignada.
-- Esta columna es la que Zernio usa para programar la publicación automática.

ALTER TABLE public.contenido_generado
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.contenido_generado.scheduled_at IS
  'Fecha y hora programada de publicación (usada por Zernio). Asignada por el batch semanal. NULL = sin programar.';

CREATE INDEX IF NOT EXISTS contenido_generado_scheduled_at_idx
  ON public.contenido_generado (user_id, scheduled_at ASC)
  WHERE scheduled_at IS NOT NULL;
