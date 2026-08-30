import type {
  ClientOnboarding,
  GeneratedVideoFamilia5,
  GeneratedVideoFamilia3,
  GeneratedVideoFamilia4,
  Niche,
  Salida,
  VideoTypographyId,
} from '@/types'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import {
  loadVideoContext,
  videoContextToPromptBlock,
  VIDEO_KNOWLEDGE_FILE_MAP,
} from '@/lib/knowledge/loader'
import { buildClientBlock } from '@/lib/generators/shared-prompt-blocks'
import {
  extractVideoJson,
  resolveVideoTypography,
  uniqueVideoTypographyIds,
} from '@/lib/generators/video-generation-shared'
import { resolveVideoClipDuration } from '@/lib/generators/video-text-limits'
import { generateVideoFamilia3 } from '@/lib/generators/video-familia-3'
import { generateVideoFamilia4 } from '@/lib/generators/video-familia-4'
import {
  canonicalizeVideoFamily5Candidate,
  eligibleVideoFamilia5Candidates,
  estimateVideoFamilia5Duration,
  extractVideoFamily5SourceCandidates,
  resolveVideoFamilia5Fallback,
  validateVideoFamily5Output,
  VIDEO_FAMILY_5_VALUE_MAX_CHARACTERS,
  type VideoFamily5Datum,
  type VideoFamily5SourceCandidate,
} from '@/lib/generators/video-family-5-contract'

export interface GenerateVideoFamilia5Params {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  clipDurationSeconds?: number
  tipografiasPermitidas: VideoTypographyId[]
  carpeta?: string
  canalesHabilitados: string[]
  publicationDate?: string
}

export type GeneratedVideoFamilia5Result =
  | GeneratedVideoFamilia5
  | GeneratedVideoFamilia4
  | GeneratedVideoFamilia3
  | null

const MAX_GENERATION_ATTEMPTS = 2

export function resolveVideoFamilia5SourceData(
  salida: Salida,
): VideoFamily5SourceCandidate[] {
  return extractVideoFamily5SourceCandidates(salida)
}

function buildPrompt(
  p: GenerateVideoFamilia5Params,
  candidates: VideoFamily5SourceCandidate[],
  typographyIds: VideoTypographyId[],
  correction?: string,
): string {
  const context = loadVideoContext({ niche: p.niche, subfamilia: '5', vozSlug: p.vozSlug })
  const preparedCandidates = candidates.map(candidate => ({
    lugar: candidate.lugar,
    datos_canonicos: canonicalizeVideoFamily5Candidate(candidate).datos
      .filter(datum => datum.etiqueta !== 'acceso'),
    acceso_fuente: candidate.datos.find(datum => datum.etiqueta === 'acceso')?.valor ?? null,
  }))

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding, p.salida)}

=== ÚNICAS FICHAS VERIFICADAS DISPONIBLES ===
${JSON.stringify(preparedCandidates, null, 2)}

=== CONTRATO DURO DE FAMILIA 5 ===
- Elegí exactamente un lugar de la lista, sin abreviarlo ni corregirlo. 📍 es opcional y solo puede prefijar lugar.
- Copiá los datos_canónicos exactamente. No agregues, estimes ni reformules magnitudes.
- Para acceso, comprimí acceso_fuente a un solo ancla literal: "Desde [lugar]" o "N km de [lugar]".
- Cada valor debe tener como máximo ${VIDEO_FAMILY_5_VALUE_MAX_CHARACTERS} caracteres después de trim y ocupar una línea.
- Preservá exactamente tildes y espacios de nombres propios. Si un acceso no entra limpio, elegí otra ancla literal de la misma fuente.
- datos lleva entre 3 y 6 etiquetas únicas del vocabulario cerrado. Sin emoji, prosa, relato ni dato comercial.

=== TIPOGRAFÍAS HABILITADAS ===
${typographyIds.map(id => `- ${id}`).join('\n')}

${correction ? `=== CORRECCIÓN DIRIGIDA ===\n${correction}\nRehacé la ficha completa corrigiendo esos defectos, sin cambiar ni inventar la fuente.` : ''}

Respondé ÚNICAMENTE con JSON válido y sin campos extra:
{
  "lugar": "nombre real completo",
  "datos": [{ "etiqueta": "distancia", "valor": "26 km i/v" }],
  "tipografia_id": "uno de los IDs habilitados"
}`
}

async function generateFallback(
  p: GenerateVideoFamilia5Params,
): Promise<GeneratedVideoFamilia4 | GeneratedVideoFamilia3 | null> {
  const fallback = resolveVideoFamilia5Fallback(p.salida)
  if (fallback === '4') {
    if (p.canalesHabilitados.length === 0) {
      throw new Error('Fallback de Familia 5 a Familia 4 requiere al menos un canal habilitado')
    }
    return generateVideoFamilia4({
      ...p,
      canalesHabilitados: p.canalesHabilitados,
      publicationDate: p.publicationDate,
    })
  }
  if (fallback === '3e') {
    return generateVideoFamilia3({ ...p, subfamilia: '3e' })
  }
  return null
}

function parseData(raw: unknown): VideoFamily5Datum[] {
  if (!Array.isArray(raw)) throw new Error('datos no es un array')
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`datos[${index}] no es un objeto`)
    }
    const datum = item as Record<string, unknown>
    if (typeof datum.etiqueta !== 'string' || typeof datum.valor !== 'string') {
      throw new Error(`datos[${index}] requiere etiqueta y valor string`)
    }
    return {
      etiqueta: datum.etiqueta as VideoFamily5Datum['etiqueta'],
      valor: datum.valor.replace(/\s+/gu, ' ').trim(),
    }
  })
}

export async function generateVideoFamilia5(
  p: GenerateVideoFamilia5Params,
): Promise<GeneratedVideoFamilia5Result> {
  const typographyIds = uniqueVideoTypographyIds(p.tipografiasPermitidas)
  if (typographyIds.length === 0) throw new Error('Familia 5 requiere al menos una tipografía habilitada')
  const candidates = eligibleVideoFamilia5Candidates(resolveVideoFamilia5SourceData(p.salida))
  if (candidates.length === 0) return generateFallback(p)

  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(p, candidates, typographyIds, correction),
      `video-familia-5[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
    )
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens
    try {
      const raw = extractVideoJson(result.text)
      if (typeof raw.lugar !== 'string') throw new Error('lugar no es un string')
      const lugar = raw.lugar.replace(/\s+/gu, ' ').trim()
      const datos = parseData(raw.datos)
      const errors = validateVideoFamily5Output({ lugar, datos, candidates })
      if (errors.length > 0) throw new Error(errors.join('; '))

      return {
        formato: 'video',
        familia: '5',
        lugar,
        datos,
        tipografia_id: resolveVideoTypography(raw.tipografia_id, typographyIds),
        duracion_estimada_segundos: estimateVideoFamilia5Duration(datos.length),
        metadata: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          clipDurationSeconds: resolveVideoClipDuration(p.clipDurationSeconds),
          knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['5'],
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = message.includes('acceso')
        ? `El acceso fue rechazado. Debe estar trimmeado, medir hasta ${VIDEO_FAMILY_5_VALUE_MAX_CHARACTERS} caracteres y usar un ancla literal de acceso_fuente en forma "Desde [lugar]" o "N km de [lugar]". Error: ${message}`
        : `La ficha fue rechazada: ${message}`
      console.warn(`[VIDEO/FAMILIA-5] intento ${attempt} rechazado: ${message}`)
    }
  }

  return generateFallback(p)
}
