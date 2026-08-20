import type { ClientOnboarding } from '@/types'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import { buildClientBlock } from '@/lib/generators/shared-prompt-blocks'
import { extractVideoJson } from '@/lib/generators/video-generation-shared'
import { HARD_DATUM_PATTERN } from './banner-molde-1.ts'
import { COMMERCIAL_CTA_PATTERN } from './banner-molde-2.ts'
import {
  COMMUNITY_INVITATION_PATTERN,
  FALSE_PROMISE_PATTERN,
  INVENTED_URGENCY_PATTERN,
} from './banner-molde-6.ts'
import { validateBannerField } from './banner-text-limits.ts'

// Generador GENUINAMENTE NUEVO — el único de los 3 moldes sin generador
// existente del cual partir. No hay precedente de un CTA de captación de
// marca sin salida específica: 2a/2c/4 están atados a una salida real, 3a
// prohíbe CTA por completo. Mismo patrón estructural de prompt que el
// resto del catálogo (bloque de marca + tarea + reglas duras + límite +
// contrato JSON + corrección dirigida — ver video-familia-4.ts/
// video-familia-3.ts), pero sin buildSalidaBlock ni ninguna fuente
// factual: esta pieza no ancla a datos verificados porque no nombra
// ninguna salida — así lo confirmó el spec original de Molde 6.
//
// No hay knowledge doc de banner todavía (mismo estado que banner-cta-
// suave.ts) — el prompt no carga voz/tono por formato, solo la marca y
// las reglas duras dadas explícitamente en el spec.

const MAX_GENERATION_ATTEMPTS = 2

export interface GenerateBannerMolde6ConvocatoriaParams {
  clientName: string
  clientOnboarding: ClientOnboarding | null
  maxCharacters: number
}

function buildPrompt(p: GenerateBannerMolde6ConvocatoriaParams, correction?: string): string {
  return `${buildClientBlock(p.clientName, p.clientOnboarding)}

=== TAREA ===
Escribí una convocatoria abierta de comunidad/reclutamiento para la marca — un CTA de captación genérico, no atado a ninguna salida puntual. Invita a sumarse a una comunidad, no a comprar ni a inscribirse en algo específico.

=== REGLAS DURAS ===
- No nombres ninguna salida, destino, fecha, precio ni cupos — esta pieza es de marca, no de una salida real.
- No inventes urgencia ni disponibilidad ("últimos cupos", "se agota", "solo hoy").
- No prometas curar, sanar, arreglar, transformar ni garantizar nada — tono aspiracional, nunca promesa vacía.
- Tono de marca: cálido, invita a pertenecer a algo más grande, sin sonar a venta ni a slogan corporativo.

=== LÍMITE DURO ===
Máximo ${p.maxCharacters} caracteres. Si tu frase natural no entra, acortala vos — no hay corrección automática de longitud.
${correction ? `\n=== CORRECCIÓN DIRIGIDA ===\n${correction}\nReescribilo corrigiendo únicamente esos defectos.` : ''}

Respondé ÚNICAMENTE con JSON válido:
{
  "convocatoria": "CTA de captación de marca, sin salida específica"
}`
}

export interface GenerateBannerMolde6ConvocatoriaResult {
  convocatoria: string
  inputTokens: number
  outputTokens: number
}

export async function generateBannerMolde6Convocatoria(
  p: GenerateBannerMolde6ConvocatoriaParams,
): Promise<GenerateBannerMolde6ConvocatoriaResult> {
  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(p, correction),
      `banner-molde-6-convocatoria[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
    )
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens

    try {
      const raw = extractVideoJson(result.text)
      if (typeof raw.convocatoria !== 'string') throw new Error('convocatoria no es un string')
      const convocatoria = raw.convocatoria.replace(/\s+/gu, ' ').trim()

      const validation = validateBannerField(convocatoria, p.maxCharacters)
      const errors: string[] = []
      if (validation.violations.includes('empty')) errors.push('convocatoria está vacía')
      if (validation.violations.includes('characters')) {
        errors.push(`convocatoria tiene ${validation.characterCount} caracteres y el máximo es ${validation.maxCharacters}`)
      }
      if (INVENTED_URGENCY_PATTERN.test(convocatoria)) errors.push('convocatoria inventa urgencia o disponibilidad')
      if (FALSE_PROMISE_PATTERN.test(convocatoria)) errors.push('convocatoria promete sanar, curar, arreglar, transformar o garantizar algo')
      if (HARD_DATUM_PATTERN.test(convocatoria) || COMMERCIAL_CTA_PATTERN.test(convocatoria)) {
        errors.push('convocatoria contiene datos o lenguaje comercial — esta pieza no ancla a ninguna salida')
      }
      if (!COMMUNITY_INVITATION_PATTERN.test(convocatoria)) {
        errors.push('convocatoria debe invitar explícitamente a sumarse o participar de la comunidad')
      }

      if (errors.length > 0) {
        correction = errors.join('; ')
        throw new Error(correction)
      }

      return { convocatoria, inputTokens: totalInputTokens, outputTokens: totalOutputTokens }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = correction ?? `El contrato es inválido: ${message}`
      console.warn(`[BANNER/MOLDE-6-CONVOCATORIA] intento ${attempt} rechazado: ${message}`)
      if (attempt === MAX_GENERATION_ATTEMPTS) {
        throw new Error(`No se pudo generar la convocatoria de Molde 6: ${message}`)
      }
    }
  }

  throw new Error('No se pudo generar la convocatoria de Molde 6')
}
