import type { BrandIdentity } from '@/types'

// ─── Contrato exacto de la skill de Mati ─────────────────────────────────────

export interface MatiSkillPayload {
  cliente:             string
  branding: {
    primaryColor:   string | null
    secondaryColor: string | null
    bgColor:        string | null
    textColor:      string | null
    titleFont:      string | null
    bodyFont:       string | null
  }
  logo_url:            string | null
  templates_elegidos:  string[]
}

/**
 * Construye el payload con los nombres exactos que espera la skill de Mati.
 * Mapeo interno → contrato:
 *   color_primario   → primaryColor
 *   color_secundario → secondaryColor
 *   color_fondo      → bgColor
 *   color_texto      → textColor
 *   font_title       → titleFont
 *   font_body        → bodyFont
 *   logo_url         → logo_url
 *   color_acento     → guardado en brand_identity pero NO incluido en el payload de Mati
 */
export function buildSkillPayload(
  branding: BrandIdentity | null,
  ownerProfile: { company_name: string | null; full_name: string | null },
): MatiSkillPayload {
  return {
    cliente: ownerProfile.company_name || ownerProfile.full_name || 'cliente',
    branding: {
      primaryColor:   branding?.color_primario   ?? null,
      secondaryColor: branding?.color_secundario ?? null,
      bgColor:        branding?.color_fondo      ?? null,
      textColor:      branding?.color_texto      ?? null,
      titleFont:      branding?.font_title       ?? null,
      bodyFont:       branding?.font_body        ?? null,
    },
    logo_url:           branding?.logo_url           ?? null,
    templates_elegidos: branding?.templates_elegidos ?? [],
  }
}
