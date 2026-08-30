-- Contexto editorial multidimensional compartido por copy, música y visuales.
alter table public.salidas
  add column if not exists context_tags text[] not null default '{}';

comment on column public.salidas.context_tags is
  'IDs del registro de contexto: entorno, clima, actividad y experiencia. No contiene datos de clientes.';
