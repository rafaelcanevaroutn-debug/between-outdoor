-- ============================================================
-- 013_salidas_recurrente_moneda.sql
-- Salida recurrente + moneda de precio
-- ============================================================

-- 1. Ampliar CHECK de tipo_viaje
ALTER TABLE salidas DROP CONSTRAINT IF EXISTS salidas_tipo_viaje_check;
ALTER TABLE salidas ADD CONSTRAINT salidas_tipo_viaje_check
  CHECK (tipo_viaje IN ('expedicion_premium','escapada_fin_semana','salida_un_dia','salida_recurrente'));

-- 2. Campos de recurrencia
ALTER TABLE salidas ADD COLUMN IF NOT EXISTS dias_semana   text[]  DEFAULT NULL;
ALTER TABLE salidas ADD COLUMN IF NOT EXISTS hora_encuentro time    DEFAULT NULL;
ALTER TABLE salidas ADD COLUMN IF NOT EXISTS punto_encuentro text   DEFAULT NULL;
ALTER TABLE salidas ADD COLUMN IF NOT EXISTS frecuencia     text
  CHECK (frecuencia IS NULL OR frecuencia IN ('semanal','quincenal','mensual'));

-- 3. Moneda del precio (aplica a precio_usd y sena_usd)
ALTER TABLE salidas ADD COLUMN IF NOT EXISTS moneda text
  CHECK (moneda IN ('USD','ARS')) DEFAULT 'USD' NOT NULL;
