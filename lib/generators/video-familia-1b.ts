import type {
  ClientOnboarding,
  GeneratedVideoFamilia1b,
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
  comparableVideoText,
  verifiedVideoPlaces,
} from '@/lib/generators/video-verified-places'
import {
  maxVideoCopyCharacters,
  truncateVideoCopyAtWord,
  validateVideoText,
} from '@/lib/generators/video-text-limits'
import {
  extractVideoJson,
  resolveVideoTypography,
  uniqueVideoTypographyIds,
} from '@/lib/generators/video-generation-shared'
import { COMMERCIAL_LANGUAGE_PATTERN } from '@/lib/generators/video-commercial-patterns'

// Ventana real de texto confirmada por Mati para TemplateFamilia1Motion:
// el clip tiene 15s fijos siempre, pero las barras de señal + el error de
// conexión ocupan los primeros ~4.3s. El título (Modo Título/KineticTitle,
// lectura palabra por palabra) aparece del segundo 4.33 al 15 — esos 10.5s
// son la única ventana real de lectura, nunca los 15s completos del clip.
export const FAMILIA_1B_TEXT_WINDOW_SECONDS = 10.5

// floor((10.5 - 0.75) * 12) = 117 — techo teórico de la fórmula estándar
// del catálogo (maxVideoCopyCharacters), sin techo editorial. Primera
// calibración real (5 corridas contra una salida de Tilcara) convergió en
// 33-39 caracteres — muy por debajo del techo, mismo patrón que pasó con
// los tips de 2c. Cap editorial bajado a 65 (margen sobre lo observado,
// no pegado al máximo real) — sigue siendo provisional, a seguir
// calibrando con más corridas antes de cerrarlo del todo.
const FAMILIA_1B_FORMULA_CEILING_CHARACTERS = maxVideoCopyCharacters(FAMILIA_1B_TEXT_WINDOW_SECONDS)
export const FAMILIA_1B_TARGET_CHARACTERS = Math.min(FAMILIA_1B_FORMULA_CEILING_CHARACTERS, 65)

// Mati confirmó Modo Título fijo en 15s: a diferencia de Familia 3, la
// duración del render NUNCA depende del copy (el clip no se recorta ni se
// estira). Nunca reemplazar esta constante por una estimación de tiempo
// de lectura del copy.
export const FAMILIA_1B_FIXED_DURATION_SECONDS = 15

const MAX_GENERATION_ATTEMPTS = 2

const VIDEO_VERACITY_RULES = `=== REGLAS DURAS DE VERACIDAD ===
- No inventes escenas, actividades, emociones, logros ni hechos.
- No conviertas una actividad planificada en algo que ocurrió.
- No inventes disponibilidad, urgencia, cupos restantes ni datos comerciales.
- No hagas promesas médicas o psicológicas.
- No menciones ningún nombre geográfico, aunque esté disponible en el contexto — Familia 1b es atemporal y no ancla a la salida.
- Estas reglas prevalecen sobre ejemplos, voz, patrones y cualquier otra capa de contexto.`

const SHARED_RULE_PRECEDENCE_1B = `=== PRECEDENCIA ESPECÍFICA 1B ===
La guía de Familia 1b exige un copy atemporal que funcione para cualquier salida, igual que 3a. Esa regla prevalece sobre la prueba compartida de reemplazo de destino. El ancla de especificidad de esta familia es el gag visual —el instante exacto en el que se pierde la señal—, nunca un lugar, fecha o dato de la salida.`

const DATE_PATTERN = /\b(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|20\d{2}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/iu

// Alarma de humo (mismo mecanismo que unsupportedQualitativeClaims en
// video-qualitative-risk.ts): no prueba semánticamente que el copy
// "necesite" el gag, es una red de seguridad angosta. Se agregó después de
// que la primera calibración real mostrara un caso concreto —"Acá no te
// entran ni las preocupaciones", una frase atemporal genérica de 3a que
// pasaba todos los demás chequeos sin mencionar nada del gag de señal—.
// Rechazo duro, igual que destino/fecha/comercial: si ninguna palabra del
// campo semántico de señal/conexión/notificaciones aparece, se corrige y
// reintenta.
const GAG_ANCHOR_PATTERN = /\bseñal(?:es)?\b|\bconexi[oó]n(?:es)?\b|\bcobertura\b|\b5g\b|\bwifi\b|\bnotificaci[oó]n(?:es)?\b|\bmensaje(?:s)?\b|\bchat\b|\bwhatsapp\b|\bcelular\b|\btel[eé]fono\b|\bvibr[a-záéíóú]*\b|\bdesconect[a-záéíóú]*\b|\boffline\b|\bmodo\s+avi[oó]n\b|\bbarras?\b|\binternet\b/iu

function mentionsVerifiedPlace(copy: string, salida: Salida): boolean {
  const normalizedCopy = comparableVideoText(copy)
  return verifiedVideoPlaces(salida).some(place => {
    const value = comparableVideoText(place.value)
    return value.length >= 3 && normalizedCopy.includes(value)
  })
}

function validateFamilia1bCopy(copy: string, salida: Salida): string[] {
  const errors: string[] = []
  if (COMMERCIAL_LANGUAGE_PATTERN.test(copy) || DATE_PATTERN.test(copy)) {
    errors.push('copy contiene un dato comercial, CTA o fecha prohibida')
  }
  if (mentionsVerifiedPlace(copy, salida)) {
    errors.push('copy menciona un destino o lugar verificado, pero Familia 1b debe ser atemporal')
  }
  if (!GAG_ANCHOR_PATTERN.test(copy)) {
    errors.push('copy no menciona señal, conexión, notificaciones ni desconexión — no depende del gag visual, podría ser una frase genérica de Familia 3a')
  }
  return errors
}

function normalizeFamilia1bCopy(rawCopy: string): string {
  return rawCopy
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

export interface GenerateVideoFamilia1bParams {
  subfamilia: '1b'
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  tipografiasPermitidas: VideoTypographyId[]
  carpeta?: string
}

function buildPrompt(
  p: GenerateVideoFamilia1bParams,
  typographyIds: VideoTypographyId[],
  correction?: string,
): string {
  const context = loadVideoContext({
    niche: p.niche,
    subfamilia: '1b',
    vozSlug: p.vozSlug,
  })

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding, p.salida)}

${buildSalidaBlock(p.salida, p.clientOnboarding)}

=== MATERIAL VISUAL ===
Carpeta seleccionada: ${p.carpeta?.trim() || 'No especificada'}
El motion ya está armado por el template (barras de señal 5G → sin señal, ~4.3s). El copy solo aparece en la ventana de título, del segundo 4.33 al 15.

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

${SHARED_RULE_PRECEDENCE_1B}

${VIDEO_VERACITY_RULES}

=== CONTRATO DE LECTURA ===
- Velocidad conservadora: 12 caracteres por segundo.
- Buffer inicial de lectura: 0.75 segundos.
- Ventana real de texto: ${FAMILIA_1B_TEXT_WINDOW_SECONDS} segundos (no los 15s completos del clip — las barras y el error de conexión ocupan los primeros ~4.3s).
- Máximo para este clip: ${FAMILIA_1B_TARGET_CHARACTERS} caracteres, contando espacios, signos y saltos de línea.
- Máximo 2 líneas.
- Si la idea no entra completa, reescribila más corta. No cortes palabras ni unidades de sentido.

=== TIPOGRAFÍAS HABILITADAS ===
${typographyIds.map(id => `- ${id}`).join('\n')}
Elegí exactamente uno de esos IDs. No inventes ni reformules el identificador.

=== TAREA ===
Generá un único copy de video para Familia 1b (barras de señal). El texto remata el gag visual de perder señal — no lo narra ni lo explica.
Aplicá la guía de formato específica inyectada arriba.
No generes slides, roles, portada, desarrollo, cierre, texto de apoyo, CTA separado ni instrucciones de motion.
${correction ? `\n=== CORRECCIÓN DIRIGIDA DEL CAMPO COPY ===\n${correction}\nRehacé el contrato completo corrigiendo únicamente esos defectos.` : ''}

Respondé ÚNICAMENTE con JSON válido:
{
  "copy": "único texto visible del video",
  "tipografia_id": "uno de los IDs habilitados"
}

No agregues duracion_estimada_segundos ni otros campos — el sistema la fija en ${FAMILIA_1B_FIXED_DURATION_SECONDS}, la duración real del render, siempre fija.`
}

function validationCorrection(
  textErrors: ReturnType<typeof validateVideoText>,
  contractErrors: string[],
): string {
  const messages: string[] = []
  for (const violation of textErrors.violations) {
    if (violation === 'empty') messages.push('El campo copy está vacío.')
    if (violation === 'characters') {
      messages.push(`El campo copy tiene ${textErrors.characterCount} caracteres y el máximo es ${textErrors.maxCharacters}. Reescribilo más corto sin perder la idea.`)
    }
    if (violation === 'lines') {
      messages.push(`El campo copy tiene ${textErrors.lineCount} líneas y el máximo es 2.`)
    }
  }
  messages.push(...contractErrors.map(error => `El campo copy no cumple: ${error}.`))
  return messages.join('\n')
}

function canSafelyTruncate(
  copy: string,
  textErrors: ReturnType<typeof validateVideoText>,
  contractErrors: string[],
): boolean {
  return textErrors.violations.length === 1
    && textErrors.violations[0] === 'characters'
    && contractErrors.length === 0
    && !copy.includes('\n')
}

export async function generateVideoFamilia1b(
  p: GenerateVideoFamilia1bParams,
): Promise<GeneratedVideoFamilia1b> {
  const typographyIds = uniqueVideoTypographyIds(p.tipografiasPermitidas)
  if (typographyIds.length === 0) {
    throw new Error('Familia 1b requiere al menos una tipografía habilitada')
  }

  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(p, typographyIds, correction),
      `video-familia-1b[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
    )
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens

    try {
      const raw = extractVideoJson(result.text)
      if (typeof raw.copy !== 'string') throw new Error('El campo copy no es un string')

      let copy = normalizeFamilia1bCopy(raw.copy)
      let textValidation = validateVideoText(copy, FAMILIA_1B_TEXT_WINDOW_SECONDS, FAMILIA_1B_TARGET_CHARACTERS)
      let contractErrors = validateFamilia1bCopy(copy, p.salida)

      if (
        attempt === MAX_GENERATION_ATTEMPTS
        && canSafelyTruncate(copy, textValidation, contractErrors)
      ) {
        copy = truncateVideoCopyAtWord(copy, FAMILIA_1B_TARGET_CHARACTERS)
        textValidation = validateVideoText(copy, FAMILIA_1B_TEXT_WINDOW_SECONDS, FAMILIA_1B_TARGET_CHARACTERS)
        contractErrors = validateFamilia1bCopy(copy, p.salida)
      }

      if (textValidation.violations.length > 0 || contractErrors.length > 0) {
        correction = validationCorrection(textValidation, contractErrors)
        throw new Error(correction)
      }

      const typographyId = resolveVideoTypography(raw.tipografia_id, typographyIds)

      return {
        formato: 'video',
        subfamilia: '1b',
        copy,
        tipografia_id: typographyId,
        duracion_estimada_segundos: FAMILIA_1B_FIXED_DURATION_SECONDS,
        metadata: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          clipDurationSeconds: FAMILIA_1B_TEXT_WINDOW_SECONDS,
          maxCharacters: FAMILIA_1B_TARGET_CHARACTERS,
          knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['1b'],
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = correction ?? `El contrato es inválido: ${message}`
      console.warn(`[VIDEO/FAMILIA-1B] intento ${attempt} rechazado: ${message}`)
      if (attempt === MAX_GENERATION_ATTEMPTS) {
        throw new Error(`No se pudo generar Familia 1b: ${message}`)
      }
    }
  }

  throw new Error('No se pudo generar Familia 1b')
}
