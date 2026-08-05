-- ============================================================
-- 019_calendar_batch_runs.sql
-- Tracking de corridas del batch semanal de calendario (/api/generate-batch).
-- El batch corre dentro de after() (background) — esta tabla es lo que
-- el cliente pollea para saber cuándo terminó y qué pasó con cada slot.
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_batch_runs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  calendar_code text NOT NULL,
  status text CHECK (status IN ('pending', 'running', 'completed', 'error')) DEFAULT 'pending' NOT NULL,
  result jsonb,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_batch_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_batch_runs_select" ON calendar_batch_runs
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_admin()
  );

CREATE POLICY "calendar_batch_runs_insert" ON calendar_batch_runs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR is_admin()
  );

CREATE POLICY "calendar_batch_runs_update" ON calendar_batch_runs
  FOR UPDATE USING (
    auth.uid() = user_id
    OR is_admin()
  );
