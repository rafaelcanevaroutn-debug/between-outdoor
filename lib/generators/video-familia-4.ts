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
import { normalizeCampaignContext, resolveContentProfile } from '@/lib/commercial-content-profiles'

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
  /** Rota composiciones fijas del grupo sin pedirle variaciones a Gemini. */
  rotationIndex?: number
}

const MAX_GENERATION_ATTEMPTS = 2
const LOCAL_CAMPAIGN_DATO_DURO_MAX_CHARACTERS = 22

function localCampaignDatoDuro(onboarding: ClientOnboarding | null): string | null {
  const campaign = normalizeCampaignContext(onboarding?.campaign_context)
  const candidates = [
    campaign.actividad,
    ...(campaign.destinos ?? []),
    campaign.territorio,
    campaign.nombre_oferta,
  ]
    .map(value => value?.replace(/\s+/gu, ' ').trim())
    .filter((value): value is string => Boolean(value))
  return candidates.find(value => value.length <= LOCAL_CAMPAIGN_DATO_DURO_MAX_CHARACTERS) ?? null
}

function localCampaignCopy(onboarding: ClientOnboarding | null): string | null {
  const campaign = normalizeCampaignContext(onboarding?.campaign_context)
  const place = campaign.destinos?.[0] ?? campaign.territorio
  if (!place) return null
  const invitation = `Vení a caminar en ${place}.`
  const cta = campaign.cta_primario === 'link_bio'
    ? 'Sumate desde el link de la bio.'
    : campaign.cta_primario === 'comentario'
      ? `Comentá ${campaign.keyword_comentario ?? 'INFO'} para sumarte.`
    : campaign.cta_primario === 'whatsapp'
      ? 'Escribinos por WhatsApp para sumarte.'
      : campaign.cta_primario === 'dm'
        ? 'Escribinos por mensaje directo para sumarte.'
        : 'Pedí la info para sumarte.'
  return `${invitation} ${cta}`
}

function internationalCampaignCopy(onboarding: ClientOnboarding | null): string | null {
  const campaign = normalizeCampaignContext(onboarding?.campaign_context)
  const destinations = campaign.destinos?.slice(0, 2) ?? []
  if (destinations.length === 0) return null
  const destinationText = destinations.length === 1
    ? destinations[0]
    : `${destinations[0]} y ${destinations[1]}`
  const cta = campaign.cta_primario === 'dm'
    ? 'Escribinos por mensaje directo.'
    : campaign.cta_primario === 'whatsapp'
      ? 'Escribinos por WhatsApp.'
      : campaign.cta_primario === 'link_bio'
        ? 'Pedí la info desde el link de la bio.'
        : 'Pedí la info.'
  return `Vamos a ${destinationText}. ${cta}`
}

function verifiedDateLabel(salida: Salida): string | null {
  const match = salida.fecha_inicio?.match(/^\d{4}-(\d{2})-(\d{2})/u)
  if (!match) return null
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const month = months[Number(match[1]) - 1]
  return month ? `${Number(match[2])} de ${month}` : null
}

const SHORT_DAY_LABELS: Record<string, string> = {
  lunes: 'LUN',
  martes: 'MAR',
  miércoles: 'MIÉ',
  jueves: 'JUE',
  viernes: 'VIE',
  sábado: 'SÁB',
  domingo: 'DOM',
}

function localFixedInfoVideo(
  onboarding: ClientOnboarding | null,
  typographyIds: VideoTypographyId[],
  clipDurationSeconds: number,
  rotationIndex = 0,
): GeneratedVideoFamilia4 | null {
  const campaign = normalizeCampaignContext(onboarding?.campaign_context)
  const territory = campaign.territorio
  const activity = campaign.actividad
  if (!territory || !activity) return null
  const confirmedDays = campaign.frecuencia_confirmada
    ? (campaign.dias_confirmados ?? []).map(day => SHORT_DAY_LABELS[day] ?? day.toLocaleUpperCase('es-AR'))
    : []
  const place = campaign.destinos?.[0] ?? territory
  const activityInGroup = /\bgrupo\b/iu.test(activity) ? activity : `${activity} en grupo`
  const daysLabel = confirmedDays.join(' · ')
  const shortActivity = [activityInGroup, activity].find(value => value.length <= LOCAL_CAMPAIGN_DATO_DURO_MAX_CHARACTERS) ?? territory
  const shortPlace = place.length <= LOCAL_CAMPAIGN_DATO_DURO_MAX_CHARACTERS ? place : territory
  const scheduleItems = [
    ...(campaign.frecuencia_confirmada ? (campaign.horarios_confirmados ?? []) : []),
    ...(place && place !== territory ? [place] : []),
  ]
  const cta = campaign.cta_primario === 'link_bio'
    ? 'Sumate desde el link de la bio.'
    : campaign.cta_primario === 'comentario'
      ? `Comentá ${campaign.keyword_comentario ?? 'INFO'} para sumarte.`
    : campaign.cta_primario === 'whatsapp'
      ? 'Escribinos por WhatsApp para sumarte.'
      : campaign.cta_primario === 'dm'
        ? 'Escribinos por mensaje directo para sumarte.'
        : 'Pedí la info para sumarte.'
  const variants = [
    {
      copy: `${activityInGroup} · ${territory}`,
      datoDuro: daysLabel || shortPlace,
      items: scheduleItems,
    },
    {
      copy: `¿No tenés con quién? Sumate al ${activityInGroup}.`,
      datoDuro: daysLabel || territory,
      items: scheduleItems,
    },
    {
      copy: `Elegí un día y vení a caminar con el grupo · ${territory}`,
      datoDuro: daysLabel || shortActivity,
      items: scheduleItems,
    },
    {
      copy: `Sumate aunque no conozcas a nadie. Caminá con el grupo · ${territory}`,
      datoDuro: shortActivity,
      items: daysLabel ? [daysLabel, ...scheduleItems] : scheduleItems,
    },
    {
      copy: `Un grupo para dejar de postergar la caminata · ${territory}`,
      datoDuro: daysLabel || shortActivity,
      items: scheduleItems,
    },
  ] as const
  const safeIndex = ((rotationIndex % variants.length) + variants.length) % variants.length
  const variant = variants[safeIndex]
  return {
    formato: 'video',
    familia: '4',
    copy: variant.copy,
    dato_duro: variant.datoDuro,
    items: [...variant.items],
    cta,
    layout: 'local_fixed_info',
    tipografia_id: typographyIds[0],
    duracion_estimada_segundos: clipDurationSeconds,
    metadata: {
      inputTokens: 0,
      outputTokens: 0,
      clipDurationSeconds,
      maxCharacters: maxVideoCopyCharacters(clipDurationSeconds),
      knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['4'],
    },
  }
}

function buildPrompt(
  p: GenerateVideoFamilia4Params,
  typographyIds: VideoTypographyId[],
  clipDurationSeconds: number,
  correction?: string,
): string {
  const context = loadVideoContext({ niche: p.niche, subfamilia: '4', vozSlug: p.vozSlug })
  const maxCharacters = maxVideoCopyCharacters(clipDurationSeconds)
  const profile = resolveContentProfile(p.clientOnboarding)
  const campaignContext = normalizeCampaignContext(p.clientOnboarding?.campaign_context)
  const isLocalCampaign = profile === 'grupo_recurrente_local'
  const datoDuroMaxCharacters = isLocalCampaign
    ? LOCAL_CAMPAIGN_DATO_DURO_MAX_CHARACTERS
    : DATO_DURO_MAX_CHARACTERS
  const campaignFacts = [
    campaignContext.nombre_oferta,
    campaignContext.actividad,
    campaignContext.territorio,
    ...(campaignContext.destinos ?? []),
  ].filter(Boolean)

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding)}

${buildSalidaBlock(p.salida, p.clientOnboarding)}

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
- Máximo ${datoDuroMaxCharacters} caracteres (contando espacios) — es el máximo que entra en una línea sin desbordar el render.
- Una sola línea, sin saltos.

=== TIPOGRAFÍAS HABILITADAS ===
${typographyIds.map(id => `- ${id}`).join('\n')}
Elegí exactamente uno de esos IDs.

=== TAREA ===
Generá una pieza Familia 4 con dos bloques visibles:
${isLocalCampaign
    ? `- copy: convocatoria principal para sumarse al grupo local y CTA concreto según el perfil comercial. Identificá la actividad, el territorio o uno de los destinos verificados. Usá un verbo inequívoco de convocatoria, por ejemplo "Sumate", "Unite" o "Vení". Está PROHIBIDO incluir precio, fecha, seña, cupos o disponibilidad.
- dato_duro: una etiqueta comercial breve construida únicamente con UNO de estos datos confirmados: ${campaignFacts.join(' · ')}. No uses números ni fechas. Ejemplo válido si figura entre los datos confirmados: "Trekking en grupo".`
    : `- copy: convocatoria principal y CTA concreto. Incluí el destino o nombre de la salida (ej. "${p.salida.destino || p.salida.nombre.split('—')[0].trim()}"). Está PROHIBIDO incluir acá precio, moneda, fecha, seña, cupos o disponibilidad, incluso si son correctos.
- dato_duro: un único dato verificable escrito para mostrarse en grande. Elegí UNO de los siguientes: precio (ej. "${p.salida.moneda} ${p.salida.precio_usd}"), cantidad de cupos (ej. "${p.salida.cupos} cupos") o la fecha exacta de inicio.`}
El dato comercial aparece UNA sola vez y únicamente en dato_duro. No copies, repitas ni reformules ese dato dentro de copy.
No generes slides, caption ni instrucciones de motion.
${correction ? `\n=== CORRECCIÓN DIRIGIDA ===\n${correction}\nRehacé el contrato completo corrigiendo únicamente esos defectos.` : ''}

Respondé ÚNICAMENTE con JSON válido:
{
  "copy": "Vamos a [destino real]. ¿Te sumás? Escribinos por [canal habilitado].",
  "dato_duro": "${isLocalCampaign ? 'actividad, territorio, oferta o destino verificado' : 'un único precio, fecha o cupos verificados; nunca texto de convocatoria'}",
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
  const contentProfile = resolveContentProfile(p.clientOnboarding)
  const datoDuroMaxCharacters = contentProfile === 'grupo_recurrente_local'
    ? LOCAL_CAMPAIGN_DATO_DURO_MAX_CHARACTERS
    : DATO_DURO_MAX_CHARACTERS
  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  if (contentProfile === 'grupo_recurrente_local') {
    const localVideo = localFixedInfoVideo(
      p.clientOnboarding,
      typographyIds,
      clipDurationSeconds,
      p.rotationIndex,
    )
    if (localVideo) {
      const contractErrors = validateVideoFamily4Copy({
        copy: localVideo.copy,
        datoDuro: localVideo.dato_duro,
        cta: localVideo.cta,
        salida: p.salida,
        publicationDate: p.publicationDate,
        canalesHabilitados: p.canalesHabilitados,
        campaignContext: normalizeCampaignContext(p.clientOnboarding?.campaign_context),
      })
      if (contractErrors.length > 0) {
        throw new Error(`Video local fijo inválido: ${contractErrors.join('; ')}`)
      }
      return localVideo
    }
  }

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
      const generatedCopy = raw.copy.replace(/\s+/gu, ' ').trim()
      const copy = contentProfile === 'grupo_recurrente_local'
        ? (localCampaignCopy(p.clientOnboarding) ?? generatedCopy)
        : contentProfile === 'dupla_viajes_internacionales'
          ? (internationalCampaignCopy(p.clientOnboarding) ?? generatedCopy)
        : generatedCopy
      const generatedDatoDuro = raw.dato_duro.replace(/\s+/gu, ' ').trim()
      const datoDuro = contentProfile === 'grupo_recurrente_local'
        ? (localCampaignDatoDuro(p.clientOnboarding) ?? generatedDatoDuro)
        : contentProfile === 'dupla_viajes_internacionales'
          ? (verifiedDateLabel(p.salida) ?? generatedDatoDuro)
        : generatedDatoDuro
      const textValidation = validateVideoText(copy, clipDurationSeconds, maxCharacters)
      const datoDuroValidation = validateDatoDuroWidth(datoDuro, datoDuroMaxCharacters)
      const contractErrors = validateVideoFamily4Copy({
        copy,
        datoDuro,
        salida: p.salida,
        publicationDate: p.publicationDate,
        canalesHabilitados: p.canalesHabilitados,
        campaignContext: contentProfile === 'grupo_recurrente_local'
          ? normalizeCampaignContext(p.clientOnboarding?.campaign_context)
          : null,
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
