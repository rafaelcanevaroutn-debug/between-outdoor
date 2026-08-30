-- Biblioteca de piezas (content_templates) + feedback ordenado.
-- Capa de metadata/activación que se agrega ENCIMA de los generadores y
-- sistemas existentes (moldes clásicos de banner, creative-lab/template_library,
-- generadores de video/carrusel por familia) — no los reemplaza. Para
-- video/carrusel una fila referencia la familia/subfamilia real del código
-- vía generator_key, sin asset propio; para banner/flyer puede además
-- enlazar una fila de template_library ya aprobada.
--
-- El motor de generación semanal (weekly-batch.ts / calendar-format-plan.ts)
-- no consume estas tablas todavía — esa conexión es una fase posterior,
-- gradual, con el motor actual como fallback.

create table content_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('video', 'carrusel', 'banner', 'flyer')),
  status text not null default 'borrador' check (status in ('borrador', 'aprobada', 'productiva')),
  -- Identifica la familia/subfamilia/molde real del código que esta fila
  -- describe, ej. 'video_familia_3_3a', 'carrusel_itinerario', 'banner_molde_3'.
  generator_key text not null,
  -- Solo para banner/flyer que reusan un HTML ya aprobado del sistema
  -- creative-lab en vez de un molde clásico.
  template_library_id uuid references template_library(id) on delete set null,
  compatibility jsonb not null default '{}'::jsonb,
  style_profile jsonb not null default '{}'::jsonb,
  copy_profile jsonb not null default '{}'::jsonb,
  cta_mode text,
  rotation_weight numeric not null default 1 check (rotation_weight >= 0),
  -- Semanas a evitar repetir esta pieza; 0 = sin guard de repetición.
  repeat_guard_window integer not null default 0 check (repeat_guard_window >= 0),
  is_main_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un único fallback seguro ("main default") por tipo de pieza.
create unique index content_templates_one_default_per_type
  on content_templates (type) where is_main_default;

create index content_templates_type_status_idx
  on content_templates (type, status);

create table content_template_verticals (
  template_id uuid not null references content_templates(id) on delete cascade,
  vertical_key text not null,
  primary key (template_id, vertical_key)
);

create table content_template_families (
  template_id uuid not null references content_templates(id) on delete cascade,
  family_key text not null,
  primary key (template_id, family_key)
);

create index content_template_families_family_key_idx
  on content_template_families (family_key);

create table content_template_requirements (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references content_templates(id) on delete cascade,
  -- ej. 'punto_encuentro' | 'dias_semana' | 'hora_encuentro' | 'puntos_interes_verificados'
  input_key text not null,
  required boolean not null default true,
  hints text
);

create index content_template_requirements_template_id_idx
  on content_template_requirements (template_id);

create table content_template_overrides (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references content_templates(id) on delete cascade,
  client_id uuid not null references profiles(id) on delete cascade,
  -- null = aplica a todas las salidas de este cliente.
  salida_id uuid references salidas(id) on delete cascade,
  enabled boolean not null default true,
  custom_rules jsonb not null default '{}'::jsonb,
  vigente_desde date,
  vigente_hasta date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (vigente_desde is null or vigente_hasta is null or vigente_desde <= vigente_hasta)
);

create unique index content_template_overrides_client_wide
  on content_template_overrides (template_id, client_id) where salida_id is null;
create unique index content_template_overrides_client_salida
  on content_template_overrides (template_id, client_id, salida_id) where salida_id is not null;
create index content_template_overrides_client_id_idx
  on content_template_overrides (client_id);

create table content_feedback (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('pieza', 'familia', 'motor', 'run')),
  piece_id uuid references contenido_generado(id) on delete cascade,
  template_id uuid references content_templates(id) on delete set null,
  family_key text,
  generator_key text,
  run_id uuid references calendar_batch_runs(id) on delete set null,
  note text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'block')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- El scope determina cuál referencia es obligatoria.
  check (
    (scope = 'pieza' and piece_id is not null)
    or (scope = 'familia' and family_key is not null)
    or (scope = 'motor' and generator_key is not null)
    or (scope = 'run' and run_id is not null)
  )
);

create index content_feedback_status_idx on content_feedback (status);
create index content_feedback_scope_idx on content_feedback (scope);
create index content_feedback_template_id_idx on content_feedback (template_id);

alter table content_templates enable row level security;
alter table content_template_verticals enable row level security;
alter table content_template_families enable row level security;
alter table content_template_requirements enable row level security;
alter table content_template_overrides enable row level security;
alter table content_feedback enable row level security;

create policy "admins manage content templates"
  on content_templates for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "admins manage content template verticals"
  on content_template_verticals for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "admins manage content template families"
  on content_template_families for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "admins manage content template requirements"
  on content_template_requirements for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "admins manage content template overrides"
  on content_template_overrides for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

create policy "admins manage content feedback"
  on content_feedback for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
