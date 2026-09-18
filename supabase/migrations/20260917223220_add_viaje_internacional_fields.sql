alter table public.salidas
add column if not exists foco_viaje text,
add column if not exists destinos_destacados text[],
add column if not exists paquete_integral boolean;

ALTER TABLE salidas DROP CONSTRAINT IF EXISTS salidas_tipo_viaje_check;
ALTER TABLE salidas ADD CONSTRAINT salidas_tipo_viaje_check
  CHECK (tipo_viaje IN (
    'expedicion_premium',
    'escapada_fin_semana',
    'salida_un_dia',
    'salida_recurrente',
    'viaje_playa_caribe',
    'viaje_internacional'
  ));
