import type {
  ClientOnboarding,
  GeneratedVideoListicle,
  GeneratedVideoStorytelling,
  Niche,
  Salida,
  VideoFamilia2Subfamilia,
  VideoTypographyId,
} from '@/types'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import {
  loadVideoContext,
  videoContextToPromptBlock,
  VIDEO_KNOWLEDGE_FILE_MAP,
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
import {
  estimateVideoSequenceDuration,
  maxSequenceWindows,
  resolveVideoSequenceDuration,
  validateVideoSequence,
  WINDOW_DURATION_SECONDS,
  WINDOW_MAX_CHARACTERS,
} from '@/lib/generators/video-sequence-limits'
import {
  normalizeListicleItems,
  normalizeStorytellingSegments,
  validateVideoListicle,
  validateVideoStorytelling,
} from '@/lib/generators/video-family-2-contract'

export const VIDEO_FAMILY_2_CONFIG = {
  '2a': { slug: 'listicle', knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['2a'] },
  '2b': { slug: 'storytelling', knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['2b'] },
} as const satisfies Record<
  VideoFamilia2Subfamilia,
  { slug: string; knowledgeFile: string }
>

interface GenerateVideoFamilia2BaseParams {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  clipDurationSeconds?: number
  tipografiasPermitidas: VideoTypographyId[]
  carpeta?: string
}

export type GenerateVideoFamilia2Params =
  | (GenerateVideoFamilia2BaseParams & { subfamilia: '2a' })
  | (GenerateVideoFamilia2BaseParams & { subfamilia: '2b' })

// 21 caracteres por ventana deja poco margen de error para Gemini — subido
// de 2 a 3 intentos para no perder generaciones válidas por convergencia.
const MAX_GENERATION_ATTEMPTS = 3

function verifiedSourcesBlock(salida: Salida): string {
  return `=== FUENTES FACTUALES HABILITADAS ===
${JSON.stringify({
    salida: {
      nombre: salida.nombre,
      destino: salida.destino,
      dificultad: salida.nivel,
      itinerario: salida.itinerario,
      itinerario_dias: salida.itinerario_dias,
      puntos_interes: salida.puntos_interes,
      punto_encuentro: salida.punto_encuentro,
      hora_encuentro: salida.hora_encuentro,
    },
  }, null, 2)}

No uses conocimiento general para completar lugares, distancias, tiempos, actividades ni el orden del recorrido.`
}

function responseContract(subfamilia: VideoFamilia2Subfamilia): string {
  if (subfamilia === '2a') {
    return `{
  "titulo": "empieza con la cantidad exacta",
  "items": ["item 1 sin numeración", "item 2 sin numeración"],
  "cta": "CTA editorial suave",
  "tipografia_id": "uno de los IDs habilitados",
  "duracion_estimada_segundos": 0
}`
  }
  return `{
  "apertura": "gancho o pregunta",
  "desarrollo": ["segmento 1", "segmento 2"],
  "cierre": "cierre orgánico opcional",
  "tipografia_id": "uno de los IDs habilitados",
  "duracion_estimada_segundos": 0
}`
}

function buildPrompt(
  p: GenerateVideoFamilia2Params,
  typographyIds: VideoTypographyId[],
  clipDurationSeconds: number,
  maxWindows: number,
  correction?: string,
): string {
  const context = loadVideoContext({
    niche: p.niche,
    subfamilia: p.subfamilia,
    vozSlug: p.vozSlug,
  })

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding)}

${buildSalidaBlock(p.salida)}

${verifiedSourcesBlock(p.salida)}

=== MATERIAL VISUAL ===
Carpeta seleccionada: ${p.carpeta?.trim() || 'No especificada'}
Techo del clip: ${clipDurationSeconds} segundos (equivale a ${maxWindows} ventanas de ${WINDOW_DURATION_SECONDS}s cada una).
No supongas qué muestra un clip a partir del nombre de su carpeta.

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

=== PRECEDENCIA DE FAMILIA 2 ===
La guía específica define una secuencia temporal y prevalece sobre cualquier regla compartida pensada para una apertura estática. Todo dato factual sigue sujeto a las fuentes habilitadas.

=== VENTANAS DE TIEMPO FIJAS ===
- Cada unidad (título/apertura, cada ítem/segmento, CTA/cierre) se muestra en pantalla ${WINDOW_DURATION_SECONDS} segundos FIJOS — no se reparte un presupuesto total entre las unidades, ni leer más rápido extiende el tiempo de otra.
- Máximo ${WINDOW_MAX_CHARACTERS} caracteres y 2 líneas por unidad — es un tope duro, no una guía orientativa.
- Máximo ${maxWindows} unidades en total (cuenta título/apertura + cada ítem/segmento + CTA/cierre) — más unidades alarga el video, hasta ese tope.
- El video completo dura exactamente (cantidad de unidades) × ${WINDOW_DURATION_SECONDS} segundos.
- Si no entra: reducí la CANTIDAD de unidades, no comprimas una unidad con más texto del permitido.

=== TIPOGRAFÍAS HABILITADAS ===
${typographyIds.map(id => `- ${id}`).join('\n')}
Elegí exactamente uno de esos IDs.

=== TAREA ===
Generá un video Familia ${p.subfamilia} (${VIDEO_FAMILY_2_CONFIG[p.subfamilia].slug}) con el contrato estructurado de la guía.
No generes slides, roles de carrusel, caption, texto de apoyo ni instrucciones de motion o TTS.
${correction ? `\n=== CORRECCIÓN DIRIGIDA ===\n${correction}\nRehacé el contrato completo corrigiendo únicamente esos defectos.` : ''}

Respondé ÚNICAMENTE con JSON válido:
${responseContract(p.subfamilia)}

El sistema recalculará duracion_estimada_segundos; no agregues campos.`
}

function stringField(raw: unknown, field: string): string {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error(`${field} no es un string válido`)
  return raw.replace(/\r\n?/gu, '\n').trim()
}

function arrayField(raw: unknown, field: string): unknown[] {
  if (!Array.isArray(raw)) throw new Error(`${field} no es un array`)
  return raw
}

function sequenceCorrection(
  validation: ReturnType<typeof validateVideoSequence>,
  contractErrors: string[],
): string {
  const errors = [...contractErrors]
  if (validation.violations.includes('unit-empty')) errors.push('hay una unidad de texto vacía')
  if (validation.violations.includes('unit-characters')) {
    errors.push(`una unidad supera ${validation.windowMaxCharacters} caracteres`)
  }
  if (validation.violations.includes('unit-lines')) errors.push('una unidad supera 2 líneas')
  if (validation.violations.includes('too-many-units')) {
    errors.push(`la secuencia tiene ${validation.unitCount} unidades y el máximo es ${validation.maxWindows} (cada unidad dura ${WINDOW_DURATION_SECONDS}s fijos)`)
  }
  return errors.map(error => `- ${error}`).join('\n')
}

export function generateVideoFamilia2(
  p: GenerateVideoFamilia2BaseParams & { subfamilia: '2a' },
): Promise<GeneratedVideoListicle>
export function generateVideoFamilia2(
  p: GenerateVideoFamilia2BaseParams & { subfamilia: '2b' },
): Promise<GeneratedVideoStorytelling>
export async function generateVideoFamilia2(
  p: GenerateVideoFamilia2Params,
): Promise<GeneratedVideoListicle | GeneratedVideoStorytelling> {
  const typographyIds = uniqueVideoTypographyIds(p.tipografiasPermitidas)
  if (typographyIds.length === 0) throw new Error('Familia 2 requiere al menos una tipografía habilitada')

  const clipDurationSeconds = resolveVideoSequenceDuration(p.clipDurationSeconds)
  const maxWindows = maxSequenceWindows(clipDurationSeconds)
  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(p, typographyIds, clipDurationSeconds, maxWindows, correction),
      `video-familia-2/${p.subfamilia}[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
    )
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens

    try {
      const raw = extractVideoJson(result.text)
      const typographyId = resolveVideoTypography(raw.tipografia_id, typographyIds)

      if (p.subfamilia === '2a') {
        const titulo = stringField(raw.titulo, 'titulo')
        const items = normalizeListicleItems(arrayField(raw.items, 'items'))
        const cta = stringField(raw.cta, 'cta')
        const units = [titulo, ...items, cta]
        const sequenceValidation = validateVideoSequence(units, clipDurationSeconds)
        const contractErrors = validateVideoListicle({ titulo, items, cta, salida: p.salida })
        if (sequenceValidation.violations.length > 0 || contractErrors.length > 0) {
          correction = sequenceCorrection(sequenceValidation, contractErrors)
          throw new Error(correction)
        }
        return {
          formato: 'video',
          subfamilia: '2a',
          titulo,
          items,
          cta,
          tipografia_id: typographyId,
          duracion_estimada_segundos: estimateVideoSequenceDuration(units.length),
          metadata: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            clipDurationSeconds,
            knowledgeFile: VIDEO_FAMILY_2_CONFIG['2a'].knowledgeFile,
          },
        }
      }

      const apertura = stringField(raw.apertura, 'apertura')
      const desarrollo = normalizeStorytellingSegments(arrayField(raw.desarrollo, 'desarrollo'))
      const cierre = typeof raw.cierre === 'string' && raw.cierre.trim()
        ? raw.cierre.replace(/\s+/gu, ' ').trim()
        : undefined
      const units = [apertura, ...desarrollo, ...(cierre ? [cierre] : [])]
      const sequenceValidation = validateVideoSequence(units, clipDurationSeconds)
      const contractErrors = validateVideoStorytelling({
        apertura,
        desarrollo,
        cierre,
        salida: p.salida,
      })
      if (sequenceValidation.violations.length > 0 || contractErrors.length > 0) {
        correction = sequenceCorrection(sequenceValidation, contractErrors)
        throw new Error(correction)
      }
      return {
        formato: 'video',
        subfamilia: '2b',
        apertura,
        desarrollo,
        ...(cierre ? { cierre } : {}),
        tipografia_id: typographyId,
        duracion_estimada_segundos: estimateVideoSequenceDuration(units.length),
        metadata: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          clipDurationSeconds,
          knowledgeFile: VIDEO_FAMILY_2_CONFIG['2b'].knowledgeFile,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = correction ?? `El contrato es inválido: ${message}`
      console.warn(`[VIDEO/FAMILIA-2/${p.subfamilia}] intento ${attempt} rechazado: ${message}`)
      if (attempt === MAX_GENERATION_ATTEMPTS) {
        throw new Error(`No se pudo generar Familia ${p.subfamilia}: ${message}`)
      }
    }
  }

  throw new Error(`No se pudo generar Familia ${p.subfamilia}`)
}
