-- Log de gasto OpenAI del modo admin de curaduría creativa.
-- Append-only: cada fila es una respuesta ya liquidada (settle()) contra
-- lib/creative-lab/openai-budget.ts. Reemplaza el checkpoint JSON local de
-- los scripts CLI como fuente de `initialUsage` para que el guardarraíl de
-- USD 2 sea acumulativo entre invocaciones, no solo dentro de un proceso.

create table if not exists admin_openai_spend_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_user_id uuid not null references profiles(id) on delete restrict,
  molde text not null,
  model text not null,
  run_id text not null,
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  cost_usd numeric not null check (cost_usd >= 0)
);

create index if not exists admin_openai_spend_log_created_at_idx
  on admin_openai_spend_log (created_at);

alter table admin_openai_spend_log enable row level security;

create policy "admins manage admin openai spend log"
  on admin_openai_spend_log for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
