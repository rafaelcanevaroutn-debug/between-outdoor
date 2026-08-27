-- Add zona_geografica column to salidas table
alter table salidas
  add column if not exists zona_geografica text;
