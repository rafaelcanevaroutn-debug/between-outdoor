import type {
  ClientOnboarding,
  GeneratedVideoFamilia3,
  Niche,
  Salida,
  VideoFamilia3Subfamilia,
  VideoTypographyId,
} from '@/types'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import {
  loadVideoContext,
  videoContextToPromptBlock,
  VIDEO_FAMILY_3_FILE_MAP,
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
  normalizeVideoFamily3Copy,
  validateVideoFamily3Copy,
} from '@/lib/generators/video-family-3-contract'
import { verifiedVideoPlacesForProfile } from '@/lib/generators/video-verified-places'
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
import { normalizeCampaignContext, resolveContentProfile } from '@/lib/commercial-content-profiles'

export const VIDEO_SUBFAMILY_CONFIG = {
  '3a': { slug: 'reflexivo', knowledgeFile: VIDEO_FAMILY_3_FILE_MAP['3a'] },
  '3b': { slug: 'pov', knowledgeFile: VIDEO_FAMILY_3_FILE_MAP['3b'] },
  '3c': { slug: 'meme', knowledgeFile: VIDEO_FAMILY_3_FILE_MAP['3c'] },
  '3d': { slug: 'conversacional', knowledgeFile: VIDEO_FAMILY_3_FILE_MAP['3d'] },
  '3e': { slug: 'lugar', knowledgeFile: VIDEO_FAMILY_3_FILE_MAP['3e'] },
} as const satisfies Record<
  VideoFamilia3Subfamilia,
  { slug: string; knowledgeFile: string }
>

// Targets por subfamilia, por debajo del techo duro anti-overflow
// (VIDEO_TEXT_LIMITS.absoluteMaxCharacters = 171) — un meme o un lugar no
// necesitan la misma extensión que un reflexivo. El techo global sigue
// aplicando como límite absoluto vía Math.min en resolveFamily3MaxCharacters.
const VIDEO_FAMILY_3_TARGET_CHARACTERS: Record<VideoFamilia3Subfamilia, number> = {
  '3a': 85,
  '3b': 70,
  '3c': 70,
  '3d': 60,
  '3e': 35,
}

function resolveFamily3MaxCharacters(subfamilia: VideoFamilia3Subfamilia, clipDurationSeconds: number): number {
  return Math.min(maxVideoCopyCharacters(clipDurationSeconds), VIDEO_FAMILY_3_TARGET_CHARACTERS[subfamilia])
}

export interface GenerateVideoFamilia3Params {
  subfamilia: VideoFamilia3Subfamilia
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
const DUO_UNVERIFIED_HUMOR_PROPS = /\b(?:cumbre|mojito|tragos?|c[oó]cteles?|alcohol)\b/iu

const VIDEO_VERACITY_RULES = `=== REGLAS DURAS DE VERACIDAD ===
- No inventes lugares, rutas, escenas, actividades, emociones, logros ni hechos.
- No conviertas una actividad planificada en algo que ocurrió.
- No inventes disponibilidad, urgencia, cupos restantes ni datos comerciales.
- No hagas promesas médicas o psicológicas.
- Todo nombre geográfico debe salir de la lista de lugares verificados.
- Si la guía de formato prohíbe destinos, no uses ningún nombre geográfico aunque esté disponible.
- Estas reglas prevalecen sobre ejemplos, voz, patrones y cualquier otra capa de contexto.`

function formatPlacesBlock(salida: Salida, onboarding: ClientOnboarding | null): string {
  const places = verifiedVideoPlacesForProfile(salida, onboarding)
  return `=== LUGARES VERIFICADOS ===
${places.length > 0
    ? JSON.stringify(places.map(place => ({
      nombre_exacto: place.value,
      fuente: place.source,
      orden: place.order,
    })), null, 2)
    : 'No hay lugares verificados disponibles.'}

Usá estos nombres únicamente cuando la guía de la subfamilia lo permita.
Para Familia 3e, cualquier lugar que no figure exactamente en esta lista está prohibido.`
}

function formatSharedRulePrecedence(subfamilia: VideoFamilia3Subfamilia): string {
  if (subfamilia === '3a') {
    return `=== PRECEDENCIA ESPECÍFICA 3A ===
La guía 3a exige una reflexión atemporal que funcione para cualquier salida. En esta subfamilia, esa regla prevalece sobre la prueba compartida de reemplazo de destino. La especificidad debe surgir de una observación humana concreta, nunca de nombrar un lugar.`
  }
  if (subfamilia === '3d' || subfamilia === '3e') {
    return `=== PRECEDENCIA ESPECÍFICA ${subfamilia.toUpperCase()} ===
La guía ${subfamilia} permite${subfamilia === '3e' ? ' y exige' : ''} nombres geográficos verificados. Esa regla prevalece sobre la prohibición compartida de nombrar el destino en la apertura. No habilita ningún dato inventado ni comercial.`
  }
  return `=== PRECEDENCIA DE FORMATO ===
La guía de Familia ${subfamilia} define cómo se aplican las reglas compartidas a un video de un único copy y prevalece ante una contradicción explícita.`
}

function formatSubfamilyContractReinforcement(
  subfamilia: VideoFamilia3Subfamilia,
): string {
  if (subfamilia !== '3d') return ''

  return `=== ESTRUCTURA OBLIGATORIA 3D ===
El copy debe tener EXACTAMENTE dos líneas y una sola voz:
1. Una pregunta cotidiana que la propia voz recibe, recuerda o se formula.
2. Su propia respuesta o remate, marcado con dos puntos.

No uses "vos" explícito ni una pregunta de captación dirigida al espectador. La pregunta cotidiana sí puede reproducir naturalmente algo que otra persona le pregunta a la voz, como "¿Dónde estás...?". Están prohibidas aperturas como "¿Vos también...?", "¿Te gustaría...?", "¿Te animás...?" o "¿Querés...?".
No escribas diálogo entre dos personajes.

Correcto:
¿Dónde estás que no te llegan los mensajes?
Donde ando: [lugar verificado]

Incorrecto:
¿Vos también necesitás escapar de la rutina?
Tu próxima aventura: [lugar]`
}

function buildPrompt(
  p: GenerateVideoFamilia3Params,
  typographyIds: VideoTypographyId[],
  clipDurationSeconds: number,
  correction?: string,
): string {
  const context = loadVideoContext({
    niche: p.niche,
    subfamilia: p.subfamilia,
    vozSlug: p.vozSlug,
  })
  const maxCharacters = resolveFamily3MaxCharacters(p.subfamilia, clipDurationSeconds)
  const contentProfile = resolveContentProfile(p.clientOnboarding)
  const duoHumorRule = contentProfile === 'dupla_viajes_internacionales' && p.subfamilia === '3c'
    ? `=== EJE OBLIGATORIO DE HUMOR PARA ESTA CAMPAÑA ===
- El humor nace del contraste confirmado entre los protagonistas: montaña/aventura y playa/viajes internacionales.
- Podés usar los nombres y roles cargados en el perfil comercial.
- Prohibido reciclar el meme de terapia, psicólogo, ansiedad o "la terapia:". Tampoco uses riesgo físico como chiste.
- No inventes utilería o acciones para representar ese contraste: no uses cumbre, mojito, tragos, cócteles ni alcohol salvo que estén verificados en los datos.
- Debe sonar humano, breve y compartible; no como una promoción ni como una ficha de viaje.`
    : ''

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding)}

${buildSalidaBlock(p.salida, p.clientOnboarding)}

${formatPlacesBlock(p.salida, p.clientOnboarding)}

=== MATERIAL VISUAL ===
Carpeta seleccionada: ${p.carpeta?.trim() || 'No especificada'}
Duración del clip: ${clipDurationSeconds} segundos.
No supongas qué muestra el clip a partir del nombre de la carpeta.

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

${formatSharedRulePrecedence(p.subfamilia)}

${formatSubfamilyContractReinforcement(p.subfamilia)}

${duoHumorRule}

${VIDEO_VERACITY_RULES}

=== CONTRATO DE LECTURA ===
- Velocidad conservadora: 12 caracteres por segundo.
- Buffer inicial de lectura: 0.75 segundos.
- Máximo para este clip: ${maxCharacters} caracteres, contando espacios, signos, saltos de línea y el prefijo POV si corresponde.
- Máximo 2 líneas.
- Si la idea no entra completa, reescribila más corta. No cortes palabras, nombres ni unidades de sentido.

=== TIPOGRAFÍAS HABILITADAS ===
${typographyIds.map(id => `- ${id}`).join('\n')}
Elegí exactamente uno de esos IDs. No inventes ni reformules el identificador.

=== TAREA ===
Generá un único copy de video para Familia ${p.subfamilia} (${VIDEO_SUBFAMILY_CONFIG[p.subfamilia].slug}).
Aplicá la guía de formato específica inyectada arriba.
No generes slides, roles, portada, desarrollo, cierre, texto de apoyo, CTA separado ni instrucciones de motion.
${correction ? `\n=== CORRECCIÓN DIRIGIDA DEL CAMPO COPY ===\n${correction}\nRehacé el contrato completo corrigiendo únicamente esos defectos.` : ''}

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
  subfamilia: VideoFamilia3Subfamilia,
  copy: string,
  textErrors: ReturnType<typeof validateVideoText>,
  contractErrors: string[],
): boolean {
  return textErrors.violations.length === 1
    && textErrors.violations[0] === 'characters'
    && contractErrors.length === 0
    && subfamilia !== '3d'
    && subfamilia !== '3e'
    && !copy.includes('\n')
}

export async function generateVideoFamilia3(
  p: GenerateVideoFamilia3Params,
): Promise<GeneratedVideoFamilia3> {
  const typographyIds = uniqueVideoTypographyIds(p.tipografiasPermitidas)
  if (typographyIds.length === 0) {
    throw new Error('Familia 3 requiere al menos una tipografía habilitada')
  }

  const clipDurationSeconds = resolveVideoClipDuration(p.clipDurationSeconds)
  const maxCharacters = resolveFamily3MaxCharacters(p.subfamilia, clipDurationSeconds)
  const verifiedPlaces = verifiedVideoPlacesForProfile(p.salida, p.clientOnboarding)
  const contentProfile = resolveContentProfile(p.clientOnboarding)
  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(p, typographyIds, clipDurationSeconds, correction),
      `video-familia-3/${p.subfamilia}[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
    )
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens

    try {
      const raw = extractVideoJson(result.text)
      if (typeof raw.copy !== 'string') throw new Error('El campo copy no es un string')

      const campaignPlace = p.subfamilia === '3e'
        ? verifiedPlaces.find(place => place.source === 'campaign_context.destinos')
        : null
      let copy = campaignPlace
        ? campaignPlace.value
        : normalizeVideoFamily3Copy(p.subfamilia, raw.copy)
      let textValidation = validateVideoText(copy, clipDurationSeconds, maxCharacters)
      let contractErrors = validateVideoFamily3Copy({
        subfamilia: p.subfamilia,
        copy,
        salida: p.salida,
        verifiedPlaces,
      })
      if (contentProfile === 'dupla_viajes_internacionales' && p.subfamilia === '3c' && /terapia|psic[oó]log|ansiedad/iu.test(copy)) {
        contractErrors.push('el humor de la dupla debe usar el contraste montaña/playa y no el meme de terapia')
      }
      if (contentProfile === 'dupla_viajes_internacionales' && p.subfamilia === '3c' && DUO_UNVERIFIED_HUMOR_PROPS.test(copy)) {
        contractErrors.push('el humor de la dupla inventa utilería o acciones no verificadas')
      }

      if (
        attempt === MAX_GENERATION_ATTEMPTS
        && canSafelyTruncate(p.subfamilia, copy, textValidation, contractErrors)
      ) {
        copy = truncateVideoCopyAtWord(copy, maxCharacters)
        textValidation = validateVideoText(copy, clipDurationSeconds, maxCharacters)
        contractErrors = validateVideoFamily3Copy({
          subfamilia: p.subfamilia,
          copy,
          salida: p.salida,
          verifiedPlaces,
        })
      }

      if (
        attempt === MAX_GENERATION_ATTEMPTS
        && contentProfile === 'dupla_viajes_internacionales'
        && p.subfamilia === '3c'
        && contractErrors.some(error => error.includes('humor de la dupla'))
      ) {
        const protagonists = normalizeCampaignContext(p.clientOnboarding?.campaign_context).protagonistas ?? []
        const first = protagonists[0]?.nombre ?? 'Uno'
        const second = protagonists[1]?.nombre ?? 'El otro'
        copy = `${first} arma la mochila.\n${second} ya eligió la playa.`
        textValidation = validateVideoText(copy, clipDurationSeconds, maxCharacters)
        contractErrors = validateVideoFamily3Copy({
          subfamilia: p.subfamilia,
          copy,
          salida: p.salida,
          verifiedPlaces,
        })
      }

      if (textValidation.violations.length > 0 || contractErrors.length > 0) {
        correction = validationCorrection(textValidation, contractErrors)
        throw new Error(correction)
      }

      const typographyId = resolveVideoTypography(raw.tipografia_id, typographyIds)

      return {
        formato: 'video',
        subfamilia: p.subfamilia,
        copy,
        tipografia_id: typographyId,
        duracion_estimada_segundos: estimateVideoCopyDuration(copy),
        metadata: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          clipDurationSeconds,
          maxCharacters,
          knowledgeFile: VIDEO_SUBFAMILY_CONFIG[p.subfamilia].knowledgeFile,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = correction ?? `El contrato es inválido: ${message}`
      console.warn(`[VIDEO/FAMILIA-3/${p.subfamilia}] intento ${attempt} rechazado: ${message}`)
      if (attempt === MAX_GENERATION_ATTEMPTS) {
        throw new Error(`No se pudo generar Familia ${p.subfamilia}: ${message}`)
      }
    }
  }

  throw new Error(`No se pudo generar Familia ${p.subfamilia}`)
}
