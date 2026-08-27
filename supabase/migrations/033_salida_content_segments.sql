-- Clasificación comercial por salida y soporte para grupos locales
-- que operan de forma recurrente en uno o varios lugares.

ALTER TABLE salidas DROP CONSTRAINT IF EXISTS salidas_tipo_viaje_check;
ALTER TABLE salidas ADD CONSTRAINT salidas_tipo_viaje_check
  CHECK (tipo_viaje IN (
    'expedicion_premium',
    'escapada_fin_semana',
    'salida_un_dia',
    'salida_recurrente',
    'viaje_playa_caribe'
  ));

ALTER TABLE salidas
  ADD COLUMN IF NOT EXISTS lugares_recurrentes text[] DEFAULT NULL;

COMMENT ON COLUMN salidas.lugares_recurrentes IS
  'Lugares físicos habituales de una salida recurrente local.';
