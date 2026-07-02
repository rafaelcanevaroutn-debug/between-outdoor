import type { BrandIdentity } from '@/types'

// ─── Contrato Etapa 1: /api/onboarding-cliente ───────────────────────────────
// Solo 3 campos. Mati copia los templates tal cual están en Drive (colores del diseñador).
// No se manda branding — ya no lo usa.

export interface MatiOnboardingPayload {
  cliente:            string
  logo_url?:          string
  templates_elegidos: string[]   // nombres sin extensión: ["main", "brand_guidelines"]
}

export function buildSkillPayload(
  branding: BrandIdentity | null,
  ownerProfile: { company_name: string | null; full_name: string | null },
): MatiOnboardingPayload {
  const cliente = branding?.mati_cliente_id || ownerProfile.company_name || ownerProfile.full_name || 'cliente'

  const payload: MatiOnboardingPayload = {
    cliente,
    // Strip .hbs — Mati espera nombres sin extensión
    templates_elegidos: (branding?.templates_elegidos ?? []).map(t => t.replace(/\.hbs$/i, '')),
  }

  if (branding?.logo_url) {
    // Strip cache-bust query string (?t=...) — Mati necesita URL limpia
    payload.logo_url = branding.logo_url.split('?')[0]
  }

  return payload
}
