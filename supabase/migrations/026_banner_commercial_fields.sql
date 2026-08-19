alter table public.salidas
  add column if not exists cupos_totales integer,
  add column if not exists cupos_disponibles integer,
  add column if not exists precio_desde boolean not null default false,
  add column if not exists financiacion jsonb,
  add column if not exists detalles_agencia jsonb;

alter table public.salidas
  drop constraint if exists salidas_cupos_totales_check,
  add constraint salidas_cupos_totales_check check (cupos_totales is null or cupos_totales > 0),
  drop constraint if exists salidas_cupos_disponibles_check,
  add constraint salidas_cupos_disponibles_check check (cupos_disponibles is null or cupos_disponibles >= 0),
  drop constraint if exists salidas_cupos_coherentes_check,
  add constraint salidas_cupos_coherentes_check check (
    cupos_totales is null or cupos_disponibles is null or cupos_disponibles <= cupos_totales
  ),
  drop constraint if exists salidas_financiacion_object_check,
  add constraint salidas_financiacion_object_check check (financiacion is null or jsonb_typeof(financiacion) = 'object'),
  drop constraint if exists salidas_detalles_agencia_object_check,
  add constraint salidas_detalles_agencia_object_check check (detalles_agencia is null or jsonb_typeof(detalles_agencia) = 'object');

comment on column public.salidas.cupos is 'Campo legado; si cupos_disponibles existe, ese valor manda en comunicación comercial.';
comment on column public.salidas.financiacion is 'Datos comerciales verificados; nunca deben ser inferidos por IA.';
comment on column public.salidas.detalles_agencia is 'Noches, alojamiento, régimen e incluidos verificados para Molde 5.';
