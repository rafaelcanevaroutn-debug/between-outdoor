-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  company_name text,
  niche text check (niche in ('trekking', 'running', 'ciclismo', 'turismo_aventura')) default 'trekking',
  role text check (role in ('admin', 'client')) default 'client',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Salidas (trips) table
create table salidas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  nombre text not null,
  destino text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  precio_usd numeric(10,2) not null,
  sena_usd numeric(10,2),
  nivel text check (nivel in ('baja', 'media', 'alta')) not null,
  cupos integer not null,
  cupos_totales integer check (cupos_totales is null or cupos_totales > 0),
  cupos_disponibles integer check (cupos_disponibles is null or cupos_disponibles >= 0),
  precio_desde boolean not null default false,
  precio_anterior numeric(10,2) check (precio_anterior is null or (precio_anterior > 0 and precio_anterior > precio_usd)),
  descuento_porcentaje numeric(5,2) check (descuento_porcentaje is null or (descuento_porcentaje > 0 and descuento_porcentaje < 100)),
  precio_efectivo numeric(10,2) check (precio_efectivo is null or (precio_efectivo > 0 and precio_efectivo < precio_usd)),
  promo_vigencia_hasta date,
  financiacion jsonb check (financiacion is null or jsonb_typeof(financiacion) = 'object'),
  detalles_agencia jsonb check (detalles_agencia is null or jsonb_typeof(detalles_agencia) = 'object'),
  link_inscripcion text,
  tipo_viaje text check (tipo_viaje in ('expedicion_premium', 'escapada_fin_semana', 'salida_un_dia', 'salida_recurrente', 'viaje_playa_caribe')) not null,
  itinerario text,
  que_incluye text,
  que_no_incluye text,
  estado text check (estado in ('borrador', 'activa', 'completada')) default 'borrador',
  moneda text check (moneda in ('USD', 'ARS')) default 'USD' not null,
  dias_semana text[],
  hora_encuentro time,
  punto_encuentro text,
  frecuencia text check (frecuencia is null or frecuencia in ('semanal', 'quincenal', 'mensual')),
  lugares_recurrentes text[],
  constraint salidas_cupos_coherentes_check check (
    cupos_totales is null or cupos_disponibles is null or cupos_disponibles <= cupos_totales
  ),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Material slots definition (predefined slots per salida)
create table material_slots (
  id uuid default uuid_generate_v4() primary key,
  salida_id uuid references salidas(id) on delete cascade not null,
  slot_key text not null,
  slot_label text not null,
  slot_description text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Uploaded files per slot
create table slot_files (
  id uuid default uuid_generate_v4() primary key,
  slot_id uuid references material_slots(id) on delete cascade not null,
  salida_id uuid references salidas(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_size bigint,
  storage_url text,
  created_at timestamptz default now()
);

-- Generated content pieces
create table contenido_generado (
  id uuid default uuid_generate_v4() primary key,
  salida_id uuid references salidas(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  vertical text not null,
  slot_key text,
  titulo text,
  subtitulo text,
  bullets jsonb,
  cta text,
  video_crudo text,
  mes text,
  is_edited boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Knowledge base (admin-managed content examples)
create table knowledge_base (
  id uuid default uuid_generate_v4() primary key,
  niche text not null,
  vertical text not null,
  titulo text not null,
  contenido text not null,
  tags text[],
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table salidas enable row level security;
alter table material_slots enable row level security;
alter table slot_files enable row level security;
alter table contenido_generado enable row level security;
alter table knowledge_base enable row level security;

-- Profiles policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Salidas policies
create policy "Users can view own salidas" on salidas for select using (auth.uid() = user_id);
create policy "Users can create salidas" on salidas for insert with check (auth.uid() = user_id);
create policy "Users can update own salidas" on salidas for update using (auth.uid() = user_id);
create policy "Users can delete own salidas" on salidas for delete using (auth.uid() = user_id);

-- Material slots policies (via salida ownership)
create policy "Users can manage own slots" on material_slots for all using (
  exists (select 1 from salidas where salidas.id = material_slots.salida_id and salidas.user_id = auth.uid())
);

-- Slot files policies
create policy "Users can manage own slot files" on slot_files for all using (
  exists (select 1 from salidas where salidas.id = slot_files.salida_id and salidas.user_id = auth.uid())
);

-- Contenido generado policies
create policy "Users can manage own content" on contenido_generado for all using (auth.uid() = user_id);

-- Knowledge base - readable by all authenticated users, writable by admins
create policy "Authenticated users can read knowledge base" on knowledge_base for select using (auth.role() = 'authenticated');
create policy "Admins can manage knowledge base" on knowledge_base for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);

-- Storage bucket for slot files
insert into storage.buckets (id, name, public) values ('slot-files', 'slot-files', true) on conflict do nothing;

create policy "Users can upload slot files" on storage.objects for insert with check (bucket_id = 'slot-files' and auth.role() = 'authenticated');
create policy "Users can view slot files" on storage.objects for select using (bucket_id = 'slot-files');
create policy "Users can delete own slot files" on storage.objects for delete using (bucket_id = 'slot-files' and auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger to create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
