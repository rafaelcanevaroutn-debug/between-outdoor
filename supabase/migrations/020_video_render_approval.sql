-- Aprobación explícita de videos generados por el motor de familias.
-- Los formatos legacy y el resto del contenido conservan estado NULL.

ALTER TABLE public.contenido_generado
  ADD COLUMN IF NOT EXISTS video_render_status text,
  ADD COLUMN IF NOT EXISTS video_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS video_approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.contenido_generado
  DROP CONSTRAINT IF EXISTS contenido_video_render_status_check,
  ADD CONSTRAINT contenido_video_render_status_check CHECK (
    video_render_status IS NULL OR video_render_status IN (
      'pending_review',
      'approved_pending_contract',
      'dispatching',
      'rendering',
      'rendered',
      'failed'
    )
  );

UPDATE public.contenido_generado
SET video_render_status = 'pending_review'
WHERE formato = 'video'
  AND generation_metadata->>'video_motor' = 'familias'
  AND video_render_status IS NULL;

CREATE INDEX IF NOT EXISTS contenido_video_render_status_idx
  ON public.contenido_generado (video_render_status)
  WHERE video_render_status IS NOT NULL;
