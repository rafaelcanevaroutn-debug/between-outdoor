-- Add media folder tracking directly to salidas (trips)
ALTER TABLE salidas
ADD COLUMN carpeta_fotos_id text,
ADD COLUMN carpeta_fotos_nombre text,
ADD COLUMN carpeta_videos_id text,
ADD COLUMN carpeta_videos_nombre text;
