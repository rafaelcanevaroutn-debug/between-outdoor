-- Fábrica de plantillas — Fase 0
-- Regiones biográficas, tokens, elementos y plantillas

create table if not exists regions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  mood text,
  created_at timestamptz default now()
);

create table if not exists tokens (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id) on delete cascade,
  category text not null,
  role text not null,
  value text not null,
  created_at timestamptz default now()
);

create table if not exists elements (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('structural','ornamental')),
  type text not null,
  species_name text,
  region_id uuid references regions(id) on delete cascade,
  component_key text,
  asset_url text,
  props_schema jsonb default '{}'::jsonb,
  preview_url text,
  version int default 1,
  created_at timestamptz default now()
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  archetype text not null,
  region_id uuid references regions(id),
  composition jsonb not null,
  preview_url text,
  version int default 1,
  created_at timestamptz default now()
);

-- RLS
alter table regions   enable row level security;
alter table tokens    enable row level security;
alter table elements  enable row level security;
alter table templates enable row level security;

create policy "auth read regions"   on regions   for select using (auth.role() = 'authenticated');
create policy "auth read tokens"     on tokens    for select using (auth.role() = 'authenticated');
create policy "auth read elements"   on elements  for select using (auth.role() = 'authenticated');
create policy "auth read templates"  on templates for select using (auth.role() = 'authenticated');

create policy "admin write regions"   on regions   for all using (auth.uid() = '75a22462-2acf-4c27-b161-c54ea5b80269'::uuid);
create policy "admin write tokens"     on tokens    for all using (auth.uid() = '75a22462-2acf-4c27-b161-c54ea5b80269'::uuid);
create policy "admin write elements"   on elements  for all using (auth.uid() = '75a22462-2acf-4c27-b161-c54ea5b80269'::uuid);
create policy "admin write templates"  on templates for all using (auth.uid() = '75a22462-2acf-4c27-b161-c54ea5b80269'::uuid);
