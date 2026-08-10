-- Generaliza las columnas de aprobación de render (antes exclusivas de
-- video-familias) para que también las use carrusel — mismo gate, mismo
-- criterio de aprobación explícita antes de disparar a Mati, sin duplicar
-- columnas por formato.

ALTER TABLE public.contenido_generado RENAME COLUMN video_render_status TO render_status;
ALTER TABLE public.contenido_generado RENAME COLUMN video_approved_at TO approved_at;
ALTER TABLE public.contenido_generado RENAME COLUMN video_approved_by TO approved_by;

ALTER TABLE public.contenido_generado
  RENAME CONSTRAINT contenido_video_render_status_check TO contenido_render_status_check;

ALTER INDEX contenido_video_render_status_idx RENAME TO contenido_render_status_idx;

-- A partir de esta migración, la generación de carrusel (individual y
-- batch semanal) también inserta con render_status = 'pending_review' en
-- vez de disparar a Mati automáticamente — ver lib/contenido-insert.ts.
