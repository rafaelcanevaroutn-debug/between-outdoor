-- Migración incremental e idempotente para instalaciones donde 023 se aplicó
-- antes de incorporar el PNG privado del laboratorio.

alter table if exists template_library
  add column if not exists preview_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creative-template-previews', 'creative-template-previews', false, 10000000, array['image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
