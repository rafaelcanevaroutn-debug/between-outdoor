import type {
  ClientOnboarding,
  GeneratedVideoFamilia1a,
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
  normalizeVideoFamily1aDiscourse,
  validateVideoFamily1aDiscourse,
} from '@/lib/generators/video-family-1a-contract'
import {
  extractVideoJson,
  resolveVideoTypography,
  uniqueVideoTypographyIds,
} from '@/lib/generators/video-generation-shared'

export interface GenerateVideoFamilia1aParams {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  clipDurationSeconds?: number
  tipografiasPermitidas: VideoTypographyId[]
  carpeta?: string
}

const MAX_GENERATION_ATTEMPTS = 2

function buildPrompt(
  p: GenerateVideoFamilia1aParams,
  typographyIds: VideoTypographyId[],
  correction?: string,
): string {
  const context = loadVideoContext({
    niche: p.niche,
    subfamilia: '1a',
    vozSlug: p.vozSlug,
  })

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding)}

=== PRECEDENCIA ESPECÍFICA DE FAMILIA 1A ===
La guía de Video Discurso prevalece ante cualquier ejemplo o patrón de las otras capas.
Generá una idea atemporal desde cero: no uses el nombre, destino, fecha, itinerario, terreno ni datos comerciales de una salida.
No describas imágenes ni supongas qué muestra el material visual.

=== FRONTERA DURA CON FAMILIA 3A ===
El discurso debe transcurrir como una narración y tener tres movimientos reconocibles: entrada, desarrollo y desenlace.
No entregues una frase suelta ni un único remate condensado. Una reflexión breve sin progresión pertenece a 3a y debe rechazarse.

=== CONTRATO EDITORIAL ===
- Escribí una sola pieza coherente, en prosa; no una lista.
- Sostené un solo tono de punta a punta: reflexivo, épico o íntimo.
- Narrá una idea de vida, nunca una excursión ni un recorrido concreto.
- No uses humor, precio, fecha, cupos, convocatoria ni CTA.
- Evitá el cliché motivacional genérico y hacé que cada movimiento tenga textura propia.
- No apliques los límites de lectura en pantalla de otras familias: este texto será narrado.

=== TIPOGRAFÍAS HABILITADAS ===
${typographyIds.map(id => `- ${id}`).join('\n')}
Elegí exactamente uno de esos IDs. No inventes ni reformules el identificador.

=== TAREA ===
Generá un único discurso original para Familia 1a. El JSON debe contener solamente el discurso completo y la tipografía.
${correction ? `\n=== CORRECCIÓN DIRIGIDA DEL DISCURSO ===\n${correction}\nRehacé el contrato completo corrigiendo esos defectos.` : ''}

Respondé ÚNICAMENTE con JSON válido:
{
  "discurso": "texto narrado con entrada, desarrollo y desenlace",
  "tipografia_id": "uno de los IDs habilitados"
}`
}

function validationCorrection(errors: string[]): string {
  return errors.map(error => `El campo discurso no cumple: ${error}.`).join('\n')
}

export async function generateVideoFamilia1a(
  p: GenerateVideoFamilia1aParams,
): Promise<GeneratedVideoFamilia1a> {
  const typographyIds = uniqueVideoTypographyIds(p.tipografiasPermitidas)
  if (typographyIds.length === 0) {
    throw new Error('Familia 1a requiere al menos una tipografía habilitada')
  }

  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(p, typographyIds, correction),
      `video-familia-1a[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
    )
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens

    try {
      const raw = extractVideoJson(result.text)
      if (typeof raw.discurso !== 'string') {
        throw new Error('El campo discurso no es un string')
      }

      const discurso = normalizeVideoFamily1aDiscourse(raw.discurso)
      const errors = validateVideoFamily1aDiscourse({ discurso, salida: p.salida })
      if (errors.length > 0) {
        correction = validationCorrection(errors)
        throw new Error(correction)
      }

      return {
        formato: 'video',
        subfamilia: '1a',
        discurso,
        tipografia_id: resolveVideoTypography(raw.tipografia_id, typographyIds),
        duracion_estimada_segundos: 0,
        metadata: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          clipDurationSeconds: p.clipDurationSeconds ?? 0,
          knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['1a'],
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = correction ?? `El contrato es inválido: ${message}`
      console.warn(`[VIDEO/FAMILIA-1A] intento ${attempt} rechazado: ${message}`)
      if (attempt === MAX_GENERATION_ATTEMPTS) {
        throw new Error(`No se pudo generar Familia 1a: ${message}`)
      }
    }
  }

  throw new Error('No se pudo generar Familia 1a')
}
