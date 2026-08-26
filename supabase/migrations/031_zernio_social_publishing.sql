-- Perfiles y cuentas Zernio por cliente. La API key permanece sólo en ZERNIO_API_KEY.

CREATE TABLE IF NOT EXISTS public.zernio_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  external_profile_id text NOT NULL UNIQUE,
  label text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  is_primary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disabled')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, label)
);

CREATE UNIQUE INDEX IF NOT EXISTS zernio_profiles_one_primary_per_user
  ON public.zernio_profiles (user_id) WHERE is_primary;

CREATE TABLE IF NOT EXISTS public.zernio_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  zernio_profile_id uuid NOT NULL REFERENCES public.zernio_profiles(id) ON DELETE CASCADE,
  external_account_id text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'facebook', 'youtube')),
  username text,
  display_name text,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zernio_profile_id, platform, external_account_id)
);

CREATE INDEX IF NOT EXISTS zernio_accounts_user_idx ON public.zernio_accounts (user_id, platform);

CREATE TABLE IF NOT EXISTS public.zernio_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_publications
  ADD COLUMN IF NOT EXISTS publisher text NOT NULL DEFAULT 'metricool',
  ADD COLUMN IF NOT EXISTS external_post_id text,
  ADD COLUMN IF NOT EXISTS external_profile_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS platform_results jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.content_publications DROP CONSTRAINT IF EXISTS content_publications_networks_check;
ALTER TABLE public.content_publications ADD CONSTRAINT content_publications_networks_check CHECK (
  providers <@ ARRAY['instagram', 'facebook', 'tiktok', 'youtube']::text[]
  AND cardinality(providers) > 0
);

CREATE UNIQUE INDEX IF NOT EXISTS content_publications_publisher_post_idx
  ON public.content_publications (publisher, external_post_id)
  WHERE external_post_id IS NOT NULL;

ALTER TABLE public.zernio_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zernio_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zernio_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zernio_profiles_select" ON public.zernio_profiles
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "zernio_profiles_admin_all" ON public.zernio_profiles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "zernio_accounts_select" ON public.zernio_accounts
  FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "zernio_accounts_admin_all" ON public.zernio_accounts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "zernio_webhook_events_admin_select" ON public.zernio_webhook_events
  FOR SELECT USING (is_admin());
