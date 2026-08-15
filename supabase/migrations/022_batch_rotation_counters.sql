-- Contador genérico de lotes para rotaciones determinísticas.
-- La PK compuesta serializa los UPSERT concurrentes de un mismo formato/cliente.

CREATE TABLE IF NOT EXISTS public.batch_rotation_counters (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  formato text NOT NULL CHECK (btrim(formato) <> ''),
  next_batch_index bigint NOT NULL DEFAULT 0 CHECK (next_batch_index >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, formato)
);

ALTER TABLE public.batch_rotation_counters ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.batch_rotation_counters TO authenticated, service_role;

DROP POLICY IF EXISTS "batch_rotation_counters_select" ON public.batch_rotation_counters;
CREATE POLICY "batch_rotation_counters_select" ON public.batch_rotation_counters
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "batch_rotation_counters_insert" ON public.batch_rotation_counters;
CREATE POLICY "batch_rotation_counters_insert" ON public.batch_rotation_counters
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "batch_rotation_counters_update" ON public.batch_rotation_counters;
CREATE POLICY "batch_rotation_counters_update" ON public.batch_rotation_counters
  FOR UPDATE USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

CREATE OR REPLACE FUNCTION public.claim_batch_rotation_index(
  p_user_id uuid,
  p_formato text
)
RETURNS bigint
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  INSERT INTO public.batch_rotation_counters AS counters (
    user_id,
    formato,
    next_batch_index,
    updated_at
  )
  VALUES (p_user_id, btrim(p_formato), 1, now())
  ON CONFLICT (user_id, formato) DO UPDATE
  SET next_batch_index = counters.next_batch_index + 1,
      updated_at = now()
  RETURNING counters.next_batch_index - 1;
$$;

REVOKE ALL ON FUNCTION public.claim_batch_rotation_index(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_batch_rotation_index(uuid, text) TO authenticated, service_role;
