-- Laboratorio creativo de contenido estático.
-- Separado de `templates`: esa tabla pertenece a la Fábrica JSON/drag-and-drop.

create table if not exists template_library (
  id uuid primary key default gen_random_uuid(),
  template_id text not null check (template_id ~ '^[a-z0-9]+(?:[a-z0-9_-]*[a-z0-9])?$'),
  version text not null check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  piece_type text not null check (piece_type in ('banner', 'flyer', 'story', 'carousel_slide')),
  mold_type smallint check (mold_type between 1 and 6),
  width integer not null check (width between 320 and 4096),
  height integer not null check (height between 320 and 4096),
  variant text not null default 'dark' check (variant in ('light', 'dark', 'adaptive')),
  status text not null default 'experimental' check (status in ('experimental', 'approved', 'archived', 'rejected')),
  slots_schema jsonb not null,
  branding_tokens text[] not null default array[]::text[],
  title_rules jsonb not null default '{}'::jsonb,
  compatible_formats jsonb not null default '[]'::jsonb,
  html_template text not null check (char_length(html_template) between 1 and 250000),
  preview_drive_file_id text,
  source_model text,
  critique_summary text,
  parent_template_id uuid references template_library(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, version),
  check ((status = 'approved' and approved_at is not null and approved_by is not null) or status <> 'approved')
);

create index if not exists template_library_catalog_idx
  on template_library (piece_type, mold_type, status, width, height);

alter table template_library enable row level security;

create policy "authenticated read approved creative templates"
  on template_library for select
  using (auth.role() = 'authenticated' and status = 'approved');

create policy "admins manage creative templates"
  on template_library for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

