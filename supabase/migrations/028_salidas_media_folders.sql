-- Track the selected Google Drive photo/video folders for each trip.
-- Keep this idempotent because early development environments may already
-- have received these columns manually.
alter table salidas
  add column if not exists carpeta_fotos_id text,
  add column if not exists carpeta_fotos_nombre text,
  add column if not exists carpeta_videos_id text,
  add column if not exists carpeta_videos_nombre text;
