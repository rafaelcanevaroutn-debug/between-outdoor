-- Contexto geográfico editorial y musical de una salida.
alter table public.salidas
  add column if not exists zona_geografica text;
