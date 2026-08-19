import type { ClientOnboarding } from '@/types'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import { buildClientBlock } from '@/lib/generators/shared-prompt-blocks'
import { extractVideoJson } from '@/lib/generators/video-generation-shared'
import { COMMERCIAL_CTA_PATTERN, SUAVE_CTA_PATTERN } from './banner-molde-2.ts'
import { validateBannerField } from './banner-text-limits.ts'

// Generador nuevo pero mínimo — mismo patrón de CTA suave que ya usa 2a/2c
// (video-familia-2.ts: ctaToneExamples), acotado a un solo campo. No hay
// knowledge doc de banner todavía, así que el prompt no carga voz/tono por
// formato — solo la marca (buildClientBlock) y la regla dura de la familia,
// validada con los mismos patrones que ya usan los compositores del PR #14
// (SUAVE_CTA_PATTERN/COMMERCIAL_CTA_PATTERN, exportados de banner-molde-2.ts).

const MAX_GENERATION_ATTEMPTS = 2

export interface GenerateBannerCtaSuaveParams {
  clientName: string
  clientOnboarding: ClientOnboarding | null
  maxCharacters: number
}

function buildPrompt(p: GenerateBannerCtaSuaveParams, correction?: string): string {
  return `${buildClientBlock(p.clientName, p.clientOnboarding)}

=== TAREA ===
Escribí un único CTA editorial suave para un banner — mismo criterio que ya usa el catálogo de video en Familia 2a/2c: invita a compartir, guardar o elegir. Nunca comercial (reservas, cupos, precio, WhatsApp, mensaje privado).

=== LÍMITE DURO ===
Máximo ${p.maxCharacters} caracteres. Si tu frase natural no entra, acortala vos — no hay corrección automática de longitud.

Ejemplos de LONGITUD, no textos para copiar — escribí el tuyo propio: "Guardalo para tu próxima gran aventura" (38 caracteres), "Compartilo con tu compañero de ruta" (35 caracteres), "Elegí tu favorito" (18 caracteres).
${correction ? `\n=== CORRECCIÓN DIRIGIDA ===\n${correction}\nReescribilo corrigiendo únicamente esos defectos.` : ''}

Respondé ÚNICAMENTE con JSON válido:
{
  "cta": "CTA editorial suave"
}`
}

export interface GenerateBannerCtaSuaveResult {
  cta: string
  inputTokens: number
  outputTokens: number
}

export async function generateBannerCtaSuave(
  p: GenerateBannerCtaSuaveParams,
): Promise<GenerateBannerCtaSuaveResult> {
  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(p, correction),
      `banner-cta-suave[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
    )
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens

    try {
      const raw = extractVideoJson(result.text)
      if (typeof raw.cta !== 'string') throw new Error('cta no es un string')
      const cta = raw.cta.replace(/\s+/gu, ' ').trim()

      const validation = validateBannerField(cta, p.maxCharacters)
      const errors: string[] = []
      if (validation.violations.includes('empty')) errors.push('cta está vacío')
      if (validation.violations.includes('characters')) {
        errors.push(`cta tiene ${validation.characterCount} caracteres y el máximo es ${validation.maxCharacters}`)
      }
      if (COMMERCIAL_CTA_PATTERN.test(cta)) errors.push('cta debe ser editorial y no comercial')
      if (!SUAVE_CTA_PATTERN.test(cta)) errors.push('cta debe invitar de forma suave a compartir, guardar o elegir')

      if (errors.length > 0) {
        correction = errors.join('; ')
        throw new Error(correction)
      }

      return { cta, inputTokens: totalInputTokens, outputTokens: totalOutputTokens }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = correction ?? `El contrato es inválido: ${message}`
      console.warn(`[BANNER/CTA-SUAVE] intento ${attempt} rechazado: ${message}`)
      if (attempt === MAX_GENERATION_ATTEMPTS) {
        throw new Error(`No se pudo generar el CTA de banner: ${message}`)
      }
    }
  }

  throw new Error('No se pudo generar el CTA de banner')
}
