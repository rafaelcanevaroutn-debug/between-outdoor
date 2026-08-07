-- ============================================================
-- 018_calendario_asignado.sql
-- Calendario editorial asignado a cada cliente (catálogo CAL-00..CAL-05)
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calendario_asignado text
  CHECK (calendario_asignado IN ('CAL-00','CAL-01','CAL-02','CAL-03','CAL-04','CAL-05'))
  DEFAULT 'CAL-00' NOT NULL;
