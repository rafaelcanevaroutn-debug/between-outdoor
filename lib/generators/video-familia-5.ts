import type {
  ClientOnboarding,
  GeneratedVideoFamilia5,
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
import {
  canonicalizeVideoFamily5Candidate,
  extractVideoFamily5SourceCandidates,
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
}

export function resolveVideoFamilia5SourceData(
  salida: Salida,
): VideoFamily5SourceCandidate[] {
  return extractVideoFamily5SourceCandidates(salida)
}

function buildPrompt(
  p: GenerateVideoFamilia5Params,
  candidates: VideoFamily5SourceCandidate[],
  typographyIds: VideoTypographyId[],
): string {
  const context = loadVideoContext({ niche: p.niche, subfamilia: '5', vozSlug: p.vozSlug })
  const preparedCandidates = candidates.map(candidate => ({
    lugar: candidate.lugar,
    datos_canonicos: canonicalizeVideoFamily5Candidate(candidate).datos
      .filter(datum => datum.etiqueta !== 'acceso'),
    acceso_fuente: candidate.datos.find(datum => datum.etiqueta === 'acceso')?.valor ?? null,
  }))

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding)}

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

Respondé ÚNICAMENTE con JSON válido y sin campos extra:
{
  "lugar": "nombre real completo",
  "datos": [{ "etiqueta": "distancia", "valor": "26 km i/v" }],
  "tipografia_id": "uno de los IDs habilitados"
}`
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
): Promise<GeneratedVideoFamilia5> {
  const typographyIds = uniqueVideoTypographyIds(p.tipografiasPermitidas)
  if (typographyIds.length === 0) throw new Error('Familia 5 requiere al menos una tipografía habilitada')
  const candidates = resolveVideoFamilia5SourceData(p.salida)
  const result = await generateWithRetryTracked(buildPrompt(p, candidates, typographyIds), 'video-familia-5[1/1]')
  const raw = extractVideoJson(result.text)
  if (typeof raw.lugar !== 'string') throw new Error('lugar no es un string')
  const lugar = raw.lugar.replace(/\s+/gu, ' ').trim()
  const datos = parseData(raw.datos)
  const errors = validateVideoFamily5Output({ lugar, datos, candidates })
  if (errors.length > 0) throw new Error(`No se pudo generar Familia 5: ${errors.join('; ')}`)

  return {
    formato: 'video',
    familia: '5',
    lugar,
    datos,
    tipografia_id: resolveVideoTypography(raw.tipografia_id, typographyIds),
    // PENDIENTE: fórmula de duración de Mati (grilla fija + staggered entry)
    duracion_estimada_segundos: 0,
    metadata: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      clipDurationSeconds: resolveVideoClipDuration(p.clipDurationSeconds),
      knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['5'],
    },
  }
}
