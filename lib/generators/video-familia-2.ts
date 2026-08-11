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
  FIELD_MAX_CHARACTERS,
  MAX_BULLETS,
  resolveVideoSequenceDuration,
  TARGET_BULLETS,
  validateSequenceField,
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
  "items": ["bullet 1 sin numeración", "bullet 2 sin numeración"],
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
  correction?: string,
): string {
  const context = loadVideoContext({
    niche: p.niche,
    subfamilia: p.subfamilia,
    vozSlug: p.vozSlug,
  })
  const tituloLabel = p.subfamilia === '2a' ? 'Título' : 'Apertura'
  const ctaLabel = p.subfamilia === '2a' ? 'CTA' : 'Cierre'
  const bulletLabel = p.subfamilia === '2a' ? 'bullet/ítem' : 'segmento de desarrollo'

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding)}

${buildSalidaBlock(p.salida)}

${verifiedSourcesBlock(p.salida)}

=== MATERIAL VISUAL ===
Carpeta seleccionada: ${p.carpeta?.trim() || 'No especificada'}
Techo del clip: ${clipDurationSeconds} segundos.
No supongas qué muestra un clip a partir del nombre de su carpeta.

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

=== PRECEDENCIA DE FAMILIA 2 ===
La guía específica define una secuencia temporal y prevalece sobre cualquier regla compartida pensada para una apertura estática. Todo dato factual sigue sujeto a las fuentes habilitadas.

=== ESTRUCTURA DE TIEMPO ===
- ${tituloLabel}: fijo en pantalla desde el arranque del video hasta el final. NO es una ventana temporal, no cuenta para la duración. Máximo ${FIELD_MAX_CHARACTERS} caracteres.
- Cada ${bulletLabel}: ventana fija de ${WINDOW_DURATION_SECONDS} segundos en pantalla, uno atrás del otro. Máximo ${WINDOW_MAX_CHARACTERS} caracteres — el contenedor envuelve el texto automáticamente hasta 3 líneas si hace falta, así que un nombre largo es válido aunque ocupe varios renglones; lo que no podés superar es la cantidad de caracteres.
- Objetivo: ${TARGET_BULLETS} ${bulletLabel}s. Nunca más de ${MAX_BULLETS} (tope duro).
- ${ctaLabel}: aparece al terminar el último ${bulletLabel} y queda visible hasta el final del clip. Tampoco es una ventana temporal. Máximo ${FIELD_MAX_CHARACTERS} caracteres.
- Duración total del video = (cantidad de ${bulletLabel}s) × ${WINDOW_DURATION_SECONDS}s.
- Si no entra: reducí la CANTIDAD de ${bulletLabel}s, no comprimas uno con más texto del permitido.

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
  bulletsValidation: ReturnType<typeof validateVideoSequence>,
  fields: Record<string, ReturnType<typeof validateSequenceField> | undefined>,
  contractErrors: string[],
): string {
  const errors = [...contractErrors]
  if (bulletsValidation.violations.includes('bullet-empty')) errors.push('hay un bullet/segmento vacío')
  if (bulletsValidation.violations.includes('bullet-characters')) {
    errors.push(`un bullet/segmento supera ${bulletsValidation.windowMaxCharacters} caracteres`)
  }
  if (bulletsValidation.violations.includes('too-many-bullets')) {
    errors.push(`hay ${bulletsValidation.bulletCount} bullets/segmentos y el máximo es ${bulletsValidation.maxBullets} (objetivo: ${bulletsValidation.targetBullets})`)
  }
  for (const [name, validation] of Object.entries(fields)) {
    if (!validation) continue
    if (validation.violations.includes('empty')) errors.push(`${name} está vacío`)
    if (validation.violations.includes('characters')) {
      errors.push(`${name} tiene ${validation.characterCount} caracteres y el máximo es ${validation.maxCharacters}`)
    }
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
  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(p, typographyIds, clipDurationSeconds, correction),
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
        const bulletsValidation = validateVideoSequence(items, clipDurationSeconds)
        const tituloValidation = validateSequenceField(titulo)
        const ctaValidation = validateSequenceField(cta)
        const contractErrors = validateVideoListicle({ titulo, items, cta, salida: p.salida })
        if (
          bulletsValidation.violations.length > 0
          || tituloValidation.violations.length > 0
          || ctaValidation.violations.length > 0
          || contractErrors.length > 0
        ) {
          correction = sequenceCorrection(
            bulletsValidation,
            { titulo: tituloValidation, cta: ctaValidation },
            contractErrors,
          )
          throw new Error(correction)
        }
        return {
          formato: 'video',
          subfamilia: '2a',
          titulo,
          items,
          cta,
          tipografia_id: typographyId,
          duracion_estimada_segundos: estimateVideoSequenceDuration(items.length, clipDurationSeconds),
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
      const bulletsValidation = validateVideoSequence(desarrollo, clipDurationSeconds)
      const aperturaValidation = validateSequenceField(apertura)
      const cierreValidation = cierre !== undefined ? validateSequenceField(cierre) : undefined
      const contractErrors = validateVideoStorytelling({
        apertura,
        desarrollo,
        cierre,
        salida: p.salida,
      })
      if (
        bulletsValidation.violations.length > 0
        || aperturaValidation.violations.length > 0
        || (cierreValidation?.violations.length ?? 0) > 0
        || contractErrors.length > 0
      ) {
        correction = sequenceCorrection(
          bulletsValidation,
          { apertura: aperturaValidation, cierre: cierreValidation },
          contractErrors,
        )
        throw new Error(correction)
      }
      return {
        formato: 'video',
        subfamilia: '2b',
        apertura,
        desarrollo,
        ...(cierre ? { cierre } : {}),
        tipografia_id: typographyId,
        duracion_estimada_segundos: estimateVideoSequenceDuration(desarrollo.length, clipDurationSeconds),
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
