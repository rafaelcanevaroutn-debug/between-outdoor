alter table public.salidas
  add column if not exists precio_anterior numeric(10,2),
  add column if not exists descuento_porcentaje numeric(5,2),
  add column if not exists precio_efectivo numeric(10,2),
  add column if not exists promo_vigencia_hasta date;

alter table public.salidas
  drop constraint if exists salidas_precio_anterior_check,
  add constraint salidas_precio_anterior_check check (
    precio_anterior is null or (precio_anterior > 0 and precio_anterior > precio_usd)
  ),
  drop constraint if exists salidas_descuento_porcentaje_check,
  add constraint salidas_descuento_porcentaje_check check (
    descuento_porcentaje is null or (descuento_porcentaje > 0 and descuento_porcentaje < 100)
  ),
  drop constraint if exists salidas_precio_efectivo_check,
  add constraint salidas_precio_efectivo_check check (
    precio_efectivo is null or (precio_efectivo > 0 and precio_efectivo < precio_usd)
  );

comment on column public.salidas.precio_anterior is 'Precio anterior verificado para comunicar descuento; nunca se deriva del precio vigente.';
comment on column public.salidas.descuento_porcentaje is 'Porcentaje promocional verificado; nunca se calcula desde otros precios.';
comment on column public.salidas.precio_efectivo is 'Precio diferenciado para pago en efectivo, cargado explícitamente.';
comment on column public.salidas.promo_vigencia_hasta is 'Fecha de vigencia de la promoción; independiente de financiacion.fecha_limite_pago.';
