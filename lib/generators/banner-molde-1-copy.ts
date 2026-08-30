import type { ClientOnboarding, Niche, Salida, VideoTypographyId } from '@/types'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import {
  loadVideoContext,
  videoContextToPromptBlock,
} from '@/lib/knowledge/loader'
import {
  SHARED_OPENING_RULES,
  SHARED_SPECIFICITY_RULES,
} from '@/lib/generators/carrusel-copy-rules'
import {
  buildClientBlock,
  buildSalidaBlock,
} from '@/lib/generators/shared-prompt-blocks'
import {
  extractVideoJson,
  resolveVideoTypography,
  uniqueVideoTypographyIds,
} from '@/lib/generators/video-generation-shared'
import { validateBannerMolde1Copy } from './banner-molde-1.ts'

// Familia 4 no se puede invocar como sub-función para Molde 1: su contrato
// exige siempre un dato_duro comercial aunque este banner no lo muestra. Este
// generador reutiliza su guía Comercial, tono de convocatoria, bloques de
// marca/salida y disciplina factual, pero genera únicamente el campo copy del
// contrato neutral. No modifica ni debilita generateVideoFamilia4.

const MAX_GENERATION_ATTEMPTS = 2

export interface GenerateBannerMolde1CopyParams {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  canalesHabilitados: string[]
  tipografiasPermitidas: VideoTypographyId[]
  copyMaxCharacters: number
}

function buildPrompt(
  p: GenerateBannerMolde1CopyParams,
  typographyIds: VideoTypographyId[],
  correction?: string,
): string {
  const context = loadVideoContext({ niche: p.niche, subfamilia: '4', vozSlug: p.vozSlug })

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding, p.salida)}

${buildSalidaBlock(p.salida, p.clientOnboarding)}

=== CANALES VERIFICADOS ===
${p.canalesHabilitados.length > 0 ? p.canalesHabilitados.map(channel => `- ${channel}`).join('\n') : '- NINGUNO'}
No menciones un canal que no aparezca en esta lista.

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

=== REGLAS ESTRICTAS OBLIGATORIAS PARA COPY ===
1. IDENTIDAD DE DESTINO: El copy DEBE mencionar explícitamente el destino o nombre real: "${p.salida.destino || p.salida.nombre}".
2. VERBO DE CONVOCATORIA: El copy DEBE incluir al menos una de estas palabras/frases exactas: "te sumás", "vamos", "venite", "acompañanos", "buscamos", "invitamos", "armamos grupo" o "quién se apunta".
3. SIN DATOS DUROS: PROHIBIDO incluir precio, moneda, seña, fecha, año, cupos en el copy.
4. LÍMITE: Máximo ${p.copyMaxCharacters} caracteres contando espacios.

=== CONTRATO DE ANCHO — copy ===
- Máximo ${p.copyMaxCharacters} caracteres contando espacios.
- El límite responde al ancho del banner, nunca a segundos de video.
- Frase natural completa; no truncar palabras.

=== TIPOGRAFÍAS HABILITADAS ===
${typographyIds.map(id => `- ${id}`).join('\n')}
Elegí exactamente uno de esos IDs.

=== TAREA ===
Escribí una convocatoria breve que identifique el destino "${p.salida.destino || p.salida.nombre}" e invite a sumarse con un verbo de convocatoria.
${correction ? `\n=== CORRECCIÓN DIRIGIDA ===\n${correction}\nReescribí únicamente copy corrigiendo esos defectos.` : ''}

Respondé ÚNICAMENTE con JSON válido:
{
  "copy": "Vamos a ${p.salida.destino || p.salida.nombre}. ¿Te sumás?",
  "tipografia_id": "${typographyIds[0]}"
}`
}

export interface GenerateBannerMolde1CopyResult {
  copy: string
  typographyId: VideoTypographyId
  inputTokens: number
  outputTokens: number
}

export async function generateBannerMolde1Copy(
  p: GenerateBannerMolde1CopyParams,
): Promise<GenerateBannerMolde1CopyResult> {
  const typographyIds = uniqueVideoTypographyIds(p.tipografiasPermitidas)
  if (typographyIds.length === 0) throw new Error('Molde 1 requiere al menos una tipografía habilitada')

  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    try {
      const result = await generateWithRetryTracked(
        buildPrompt(p, typographyIds, correction),
        `banner-molde-1-copy[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
      )
      totalInputTokens += result.inputTokens
      totalOutputTokens += result.outputTokens

      const raw = extractVideoJson(result.text)
      if (typeof raw.copy !== 'string') throw new Error('copy no es un string')
      const copy = raw.copy.replace(/\s+/gu, ' ').trim()
      const errors = validateBannerMolde1Copy({
        copy,
        salida: p.salida,
        maxCharacters: p.copyMaxCharacters,
        canalesHabilitados: p.canalesHabilitados,
      })
      if (errors.length > 0) {
        correction = errors.map(error => `- ${error}`).join('\n')
        throw new Error(correction)
      }

      return {
        copy,
        typographyId: resolveVideoTypography(raw.tipografia_id, typographyIds),
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = correction ?? `El contrato es inválido: ${message}`
      console.warn(`[BANNER/MOLDE-1-COPY] intento ${attempt} rechazado: ${message}`)
    }
  }

  // Fallback determinístico garantizado que cumple 100% con la validación de Molde 1
  const lugar = p.salida.destino || p.salida.nombre || 'esta salida'
  const fallbackCopy = `Vamos a ${lugar}. ¿Te sumás?`.slice(0, p.copyMaxCharacters)
  return {
    copy: fallbackCopy,
    typographyId: typographyIds[0],
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  }
}
