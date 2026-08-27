alter table public.client_onboarding
  add column if not exists content_profile text not null default 'standard_outdoor',
  add column if not exists campaign_context jsonb not null default '{}'::jsonb;

alter table public.client_onboarding
  drop constraint if exists client_onboarding_content_profile_check;

alter table public.client_onboarding
  add constraint client_onboarding_content_profile_check
  check (content_profile in (
    'standard_outdoor',
    'grupo_recurrente_local',
    'dupla_viajes_internacionales'
  ));

comment on column public.client_onboarding.content_profile is
  'Perfil comercial que modula prompts y composición sin crear formatos visuales nuevos.';

comment on column public.client_onboarding.campaign_context is
  'Hechos comerciales verificados del perfil. Los campos ausentes nunca deben inferirse.';
