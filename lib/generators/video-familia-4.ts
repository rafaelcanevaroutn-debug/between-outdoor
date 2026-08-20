import type {
  ClientOnboarding,
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
  DATO_DURO_MAX_CHARACTERS,
  estimateVideoCopyDuration,
  maxVideoCopyCharacters,
  resolveVideoClipDuration,
  validateDatoDuroWidth,
  validateVideoText,
} from '@/lib/generators/video-text-limits'
import { validateVideoFamily4Copy } from '@/lib/generators/video-family-4-contract'

export interface GenerateVideoFamilia4Params {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  clipDurationSeconds?: number
  publicationDate?: string
  canalesHabilitados: string[]
  tipografiasPermitidas: VideoTypographyId[]
  carpeta?: string
}

const MAX_GENERATION_ATTEMPTS = 2

function buildPrompt(
  p: GenerateVideoFamilia4Params,
  typographyIds: VideoTypographyId[],
  clipDurationSeconds: number,
  correction?: string,
): string {
  const context = loadVideoContext({ niche: p.niche, subfamilia: '4', vozSlug: p.vozSlug })
  const maxCharacters = maxVideoCopyCharacters(clipDurationSeconds)

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding)}

${buildSalidaBlock(p.salida)}

=== FECHA Y CANALES VERIFICADOS ===
- Fecha prevista de publicación: ${p.publicationDate ?? 'NO INFORMADA'}
- Canales habilitados: ${p.canalesHabilitados.length > 0 ? p.canalesHabilitados.join(', ') : 'NINGUNO'}
No uses referencias relativas ni canales que no puedan verificarse con este bloque.

=== MATERIAL VISUAL ===
Carpeta seleccionada: ${p.carpeta?.trim() || 'No especificada'}
Duración del clip: ${clipDurationSeconds} segundos.

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

=== PRECEDENCIA DE FAMILIA 4 ===
La guía Comercial exige convocatoria, dato duro real y CTA concreto. Esta exigencia prevalece sobre prohibiciones comerciales de otras familias. No habilita inventar urgencia, precio, fecha, cupos, inclusiones ni canales.

=== CONTRATO DE LECTURA — copy ===
- 12 caracteres por segundo y buffer de 0.75 segundos.
- Máximo ${maxCharacters} caracteres para este clip.
- Máximo 2 líneas.
- No truncar ni modificar nombres, precios, fechas, cupos o CTA.

=== CONTRATO DE ANCHO — dato_duro ===
- dato_duro NO sigue la fórmula de lectura de copy — es un bloque destacado que se renderiza grande, y su límite es de ANCHO, no de tiempo.
- Máximo ${DATO_DURO_MAX_CHARACTERS} caracteres (contando espacios) — es el máximo que entra en una línea sin desbordar el render.
- Una sola línea, sin saltos.

=== TIPOGRAFÍAS HABILITADAS ===
${typographyIds.map(id => `- ${id}`).join('\n')}
Elegí exactamente uno de esos IDs.

=== TAREA ===
Generá una pieza Familia 4 con dos bloques visibles:
- copy: convocatoria principal y CTA concreto. Incluí el destino o nombre de la salida (ej. "${p.salida.destino || p.salida.nombre.split('—')[0].trim()}"). Está PROHIBIDO incluir acá precio, moneda, fecha, seña, cupos o disponibilidad, incluso si son correctos.
- dato_duro: un único dato verificable escrito para mostrarse en grande. Elegí UNO de los siguientes: precio (ej. "${p.salida.moneda} ${p.salida.precio_usd}"), cantidad de cupos (ej. "${p.salida.cupos} cupos") o la fecha exacta de inicio.
El dato comercial aparece UNA sola vez y únicamente en dato_duro. No copies, repitas ni reformules ese dato dentro de copy.
No generes slides, caption ni instrucciones de motion.
${correction ? `\n=== CORRECCIÓN DIRIGIDA ===\n${correction}\nRehacé el contrato completo corrigiendo únicamente esos defectos.` : ''}

Respondé ÚNICAMENTE con JSON válido:
{
  "copy": "Vamos a [destino real]. ¿Te sumás? Escribinos por [canal habilitado].",
  "dato_duro": "un único precio, fecha o cupos verificados; nunca texto de convocatoria",
  "tipografia_id": "uno de los IDs habilitados",
  "duracion_estimada_segundos": 0
}

El sistema recalculará duracion_estimada_segundos; no agregues campos.`
}

function correctionText(
  textValidation: ReturnType<typeof validateVideoText>,
  datoDuroValidation: ReturnType<typeof validateDatoDuroWidth>,
  contractErrors: string[],
): string {
  const errors = [...contractErrors]
  if (textValidation.violations.includes('empty')) errors.push('copy está vacío')
  if (textValidation.violations.includes('characters')) {
    errors.push(`copy tiene ${textValidation.characterCount} caracteres y el máximo es ${textValidation.maxCharacters}`)
  }
  if (textValidation.violations.includes('lines')) errors.push('copy supera 2 líneas')
  if (datoDuroValidation.violations.includes('empty')) errors.push('dato_duro está vacío')
  if (datoDuroValidation.violations.includes('characters')) {
    errors.push(`dato_duro tiene ${datoDuroValidation.characterCount} caracteres y el máximo por ancho es ${datoDuroValidation.maxCharacters}`)
  }
  if (datoDuroValidation.violations.includes('lines')) errors.push('dato_duro debe ser una sola línea')
  return errors.map(error => `- ${error}`).join('\n')
}

export async function generateVideoFamilia4(
  p: GenerateVideoFamilia4Params,
): Promise<GeneratedVideoFamilia4> {
  const typographyIds = uniqueVideoTypographyIds(p.tipografiasPermitidas)
  if (typographyIds.length === 0) throw new Error('Familia 4 requiere al menos una tipografía habilitada')

  const clipDurationSeconds = resolveVideoClipDuration(p.clipDurationSeconds)
  const maxCharacters = maxVideoCopyCharacters(clipDurationSeconds)
  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(p, typographyIds, clipDurationSeconds, correction),
      `video-familia-4[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
    )
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens

    try {
      const raw = extractVideoJson(result.text)
      if (typeof raw.copy !== 'string') throw new Error('copy no es un string')
      if (typeof raw.dato_duro !== 'string') throw new Error('dato_duro no es un string')
      const copy = raw.copy.replace(/\s+/gu, ' ').trim()
      const datoDuro = raw.dato_duro.replace(/\s+/gu, ' ').trim()
      const textValidation = validateVideoText(copy, clipDurationSeconds, maxCharacters)
      const datoDuroValidation = validateDatoDuroWidth(datoDuro)
      const contractErrors = validateVideoFamily4Copy({
        copy,
        datoDuro,
        salida: p.salida,
        publicationDate: p.publicationDate,
        canalesHabilitados: p.canalesHabilitados,
      })
      if (textValidation.violations.length > 0 || datoDuroValidation.violations.length > 0 || contractErrors.length > 0) {
        correction = correctionText(textValidation, datoDuroValidation, contractErrors)
        throw new Error(correction)
      }

      return {
        formato: 'video',
        familia: '4',
        copy,
        dato_duro: datoDuro,
        tipografia_id: resolveVideoTypography(raw.tipografia_id, typographyIds),
        duracion_estimada_segundos: estimateVideoCopyDuration(copy),
        metadata: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          clipDurationSeconds,
          maxCharacters,
          knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['4'],
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = correction ?? `El contrato es inválido: ${message}`
      console.warn(`[VIDEO/FAMILIA-4] intento ${attempt} rechazado: ${message}`)
      if (attempt === MAX_GENERATION_ATTEMPTS) {
        throw new Error(`No se pudo generar Familia 4: ${message}`)
      }
    }
  }

  throw new Error('No se pudo generar Familia 4')
}
