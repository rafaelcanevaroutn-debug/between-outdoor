-- Configuración Metricool por cliente y trazabilidad idempotente de publicaciones.
-- El token de acceso NO se guarda en la base: permanece en METRICOOL_API_TOKEN.

CREATE TABLE IF NOT EXISTS public.metricool_connections (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  metricool_user_id bigint NOT NULL CHECK (metricool_user_id > 0),
  blog_id bigint NOT NULL CHECK (blog_id > 0),
  timezone text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  enabled_networks text[] NOT NULL DEFAULT ARRAY['instagram']::text[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disabled')),
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT metricool_connections_networks_check CHECK (
    enabled_networks <@ ARRAY['instagram', 'facebook', 'tiktok']::text[]
    AND cardinality(enabled_networks) > 0
  )
);

CREATE TABLE IF NOT EXISTS public.content_publications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contenido_id uuid NOT NULL REFERENCES public.contenido_generado(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  timezone text NOT NULL,
  providers text[] NOT NULL,
  status text NOT NULL DEFAULT 'preparing' CHECK (
    status IN ('preparing', 'syncing', 'draft', 'scheduled', 'published', 'failed', 'cancelled')
  ),
  idempotency_key text NOT NULL UNIQUE,
  metricool_post_id bigint,
  metricool_post_uuid text,
  request_payload jsonb,
  response_payload jsonb,
  last_error text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_publications_networks_check CHECK (
    providers <@ ARRAY['instagram', 'facebook', 'tiktok']::text[]
    AND cardinality(providers) > 0
  )
);

CREATE INDEX IF NOT EXISTS content_publications_user_schedule_idx
  ON public.content_publications (user_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS content_publications_content_idx
  ON public.content_publications (contenido_id, created_at DESC);

ALTER TABLE public.metricool_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metricool_connections_select" ON public.metricool_connections
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "metricool_connections_admin_all" ON public.metricool_connections
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "content_publications_select" ON public.content_publications
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "content_publications_insert" ON public.content_publications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "content_publications_update" ON public.content_publications
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());
