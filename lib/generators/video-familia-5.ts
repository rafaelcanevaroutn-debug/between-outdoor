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
import {
  SHARED_OPENING_RULES,
  SHARED_SPECIFICITY_RULES,
} from '@/lib/generators/carrusel-copy-rules'
import {
  buildClientBlock,
  buildSalidaBlock,
} from '@/lib/generators/shared-prompt-blocks'
import { validateVideoFamily5Copy } from '@/lib/generators/video-family-5-contract'
import {
  estimateVideoCopyDuration,
  maxVideoCopyCharacters,
  resolveVideoClipDuration,
  truncateVideoCopyAtWord,
  validateVideoText,
} from '@/lib/generators/video-text-limits'
import {
  extractVideoJson,
  resolveVideoTypography,
  uniqueVideoTypographyIds,
} from '@/lib/generators/video-generation-shared'

// Hipótesis de arranque 100, calibrada a 90 con 5 corridas reales contra
// Gemini (salida de Renzo): 5/5 sin reintentos, longitudes reales de
// 47-82 caracteres. 90 deja margen sobre el máximo observado sin regalar
// espacio de más. Sigue sin ser un número confirmado por Mati (a diferencia
// de WINDOW_MAX_CHARACTERS/FIELD_MAX_CHARACTERS) — es el mismo tipo de
// target soft que 3a=85, ajustable con más muestra real si hace falta. El
// techo duro anti-overflow (absoluteMaxCharacters=171) sigue aplicando como
// límite absoluto vía Math.min en resolveFamily5MaxCharacters.
const VIDEO_FAMILY_5_TARGET_CHARACTERS = 90

function resolveFamily5MaxCharacters(clipDurationSeconds: number): number {
  return Math.min(maxVideoCopyCharacters(clipDurationSeconds), VIDEO_FAMILY_5_TARGET_CHARACTERS)
}

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

const MAX_GENERATION_ATTEMPTS = 2

const VIDEO_VERACITY_RULES = `=== REGLAS DURAS DE VERACIDAD ===
- No inventes datos técnicos, de terreno o de seguridad: todo lo que afirmes sobre distancia, altura, clima, agua, señal, sombra o dificultad debe existir literalmente en la salida.
- Si no hay un dato concreto que sostenga un consejo anclado, no lo inventes — usá el ángulo de mindset en su lugar.
- No inventes lugares, rutas, escenas, actividades, emociones, logros ni hechos.
- No inventes disponibilidad, urgencia, cupos restantes ni datos comerciales.
- No hagas promesas médicas o psicológicas.
- No menciones el destino ni ningún lugar verificado: el consejo debe poder acompañar cualquier salida.
- Estas reglas prevalecen sobre ejemplos, voz, patrones y cualquier otra capa de contexto.`

function buildPrompt(
  p: GenerateVideoFamilia5Params,
  typographyIds: VideoTypographyId[],
  clipDurationSeconds: number,
  correction?: string,
): string {
  const context = loadVideoContext({
    niche: p.niche,
    subfamilia: '5',
    vozSlug: p.vozSlug,
  })
  const maxCharacters = resolveFamily5MaxCharacters(clipDurationSeconds)

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding)}

${buildSalidaBlock(p.salida)}

=== MATERIAL VISUAL ===
Carpeta seleccionada: ${p.carpeta?.trim() || 'No especificada'}
Duración del clip: ${clipDurationSeconds} segundos.
No supongas qué muestra el clip a partir del nombre de la carpeta.

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

=== PRECEDENCIA DE FAMILIA 5 ===
La guía de Consejos define dos ángulos posibles (anclado técnico o mindset) y cómo elegir entre ellos. Esa guía prevalece ante una contradicción con reglas compartidas pensadas para una apertura de carrusel.

${VIDEO_VERACITY_RULES}

=== CONTRATO DE LECTURA ===
- Velocidad conservadora: 12 caracteres por segundo.
- Buffer inicial de lectura: 0.75 segundos.
- Máximo para este clip: ${maxCharacters} caracteres, contando espacios, signos y saltos de línea.
- Máximo 2 líneas.
- Si la idea no entra completa, reescribila más corta. No cortes palabras, nombres ni unidades de sentido.

=== TIPOGRAFÍAS HABILITADAS ===
${typographyIds.map(id => `- ${id}`).join('\n')}
Elegí exactamente uno de esos IDs. No inventes ni reformules el identificador.

=== TAREA ===
Generá un único consejo de video para Familia 5 (Consejos).
Aplicá la guía de formato específica inyectada arriba para decidir el ángulo.
No generes slides, roles, portada, desarrollo, cierre, texto de apoyo, CTA separado ni instrucciones de motion.
${correction ? `\n=== CORRECCIÓN DIRIGIDA ===\n${correction}\nRehacé el contrato completo corrigiendo únicamente esos defectos.` : ''}

Respondé ÚNICAMENTE con JSON válido:
{
  "copy": "único texto visible del video",
  "tipografia_id": "uno de los IDs habilitados",
  "duracion_estimada_segundos": 0
}

El sistema recalculará duracion_estimada_segundos; no agregues campos.`
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

export async function generateVideoFamilia5(
  p: GenerateVideoFamilia5Params,
): Promise<GeneratedVideoFamilia5> {
  const typographyIds = uniqueVideoTypographyIds(p.tipografiasPermitidas)
  if (typographyIds.length === 0) {
    throw new Error('Familia 5 requiere al menos una tipografía habilitada')
  }

  const clipDurationSeconds = resolveVideoClipDuration(p.clipDurationSeconds)
  const maxCharacters = resolveFamily5MaxCharacters(clipDurationSeconds)
  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(p, typographyIds, clipDurationSeconds, correction),
      `video-familia-5[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
    )
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens

    try {
      const raw = extractVideoJson(result.text)
      if (typeof raw.copy !== 'string') throw new Error('El campo copy no es un string')

      let copy = raw.copy.replace(/\r\n?/gu, '\n').split('\n').map(line => line.trim()).filter(Boolean).join('\n').trim()
      let textValidation = validateVideoText(copy, clipDurationSeconds, maxCharacters)
      let contractErrors = validateVideoFamily5Copy({ copy, salida: p.salida })

      if (
        attempt === MAX_GENERATION_ATTEMPTS
        && canSafelyTruncate(copy, textValidation, contractErrors)
      ) {
        copy = truncateVideoCopyAtWord(copy, maxCharacters)
        textValidation = validateVideoText(copy, clipDurationSeconds, maxCharacters)
        contractErrors = validateVideoFamily5Copy({ copy, salida: p.salida })
      }

      if (textValidation.violations.length > 0 || contractErrors.length > 0) {
        correction = validationCorrection(textValidation, contractErrors)
        throw new Error(correction)
      }

      const typographyId = resolveVideoTypography(raw.tipografia_id, typographyIds)

      return {
        formato: 'video',
        familia: '5',
        copy,
        tipografia_id: typographyId,
        duracion_estimada_segundos: estimateVideoCopyDuration(copy),
        metadata: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          clipDurationSeconds,
          maxCharacters,
          knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['5'],
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = correction ?? `El contrato es inválido: ${message}`
      console.warn(`[VIDEO/FAMILIA-5] intento ${attempt} rechazado: ${message}`)
      if (attempt === MAX_GENERATION_ATTEMPTS) {
        throw new Error(`No se pudo generar Familia 5: ${message}`)
      }
    }
  }

  throw new Error('No se pudo generar Familia 5')
}
