-- Los grupos y academias recurrentes no tienen una fecha de inicio/fin única.
ALTER TABLE salidas ALTER COLUMN fecha_inicio DROP NOT NULL;
ALTER TABLE salidas ALTER COLUMN fecha_fin DROP NOT NULL;

-- Información reutilizable para grupos, clubes, escuelas y academias outdoor.
ALTER TABLE salidas
  ADD COLUMN IF NOT EXISTS grupo_info jsonb DEFAULT NULL;

ALTER TABLE salidas DROP CONSTRAINT IF EXISTS salidas_grupo_info_object_check;
ALTER TABLE salidas ADD CONSTRAINT salidas_grupo_info_object_check
  CHECK (grupo_info IS NULL OR jsonb_typeof(grupo_info) = 'object');

COMMENT ON COLUMN salidas.grupo_info IS
  'Configuración de una unidad recurrente outdoor: actividad, organización, propuesta, público, dinámica, responsables, requisitos y equipamiento.';
