import type {
  CampaignContext,
  ClientOnboarding,
  CommercialContentAxis,
  ContentProfileCode,
  FormatoCarrusel,
  Salida,
  VideoKnowledgeFormat,
} from '@/types'

export interface CommercialWeekRecipe {
  profile: ContentProfileCode
  objective: string
  bannerMolde: 1 | 2 | 3 | 4 | 5 | 6
  videoSubfamilia: VideoKnowledgeFormat
  carouselPriority: FormatoCarrusel[]
  distribution: Readonly<Partial<Record<CommercialContentAxis, number>>>
}

export interface LocalCampaignBanner {
  contentKind: 'banner/molde-6'
  mensaje: string
  convocatoria: string
  typographyId: 'Inter'
}

const PROFILE_CODES = new Set<ContentProfileCode>([
  'standard_outdoor',
  'grupo_recurrente_local',
  'dupla_viajes_internacionales',
])

const DAYS = new Set([
  'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
])

const CTA_VALUES = new Set([
  'link_bio', 'whatsapp', 'comentario', 'dm', 'formulario',
])

const CONTENT_AXES = new Set<CommercialContentAxis>([
  'conversion', 'comunidad', 'descubrimiento', 'confianza', 'objeciones',
  'utilidad', 'destino', 'personalidad', 'alcance',
])

const CONTENT_AXIS_INSTRUCTIONS: Record<CommercialContentAxis, string> = {
  conversion: 'Llevá la pieza a una consulta o acción concreta con un CTA claro y sin presión inventada.',
  comunidad: 'Mostrá pertenencia, compañía y la experiencia de compartir el viaje o la salida.',
  descubrimiento: 'Priorizá el lugar, la experiencia y una idea que invite a descubrirla.',
  confianza: 'Reducí incertidumbre con información verificable, claridad y criterio profesional.',
  objeciones: 'Respondé una duda o freno real sin prometer resultados ni inventar condiciones.',
  utilidad: 'Entregá una idea práctica que la audiencia pueda guardar o aplicar.',
  destino: 'Hacé que el destino sea protagonista y despierte deseo concreto de conocerlo.',
  personalidad: 'Mostrá la mirada y contraste de los protagonistas; la pieza debe sentirse humana.',
  alcance: 'Buscá identificación, humor o sorpresa compartible sin perder relación con la campaña.',
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim()
  return clean || null
}

function cleanTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(cleanText).filter((item): item is string => Boolean(item)))]
}

export function resolveContentProfile(onboarding: ClientOnboarding | null): ContentProfileCode {
  const value = onboarding?.content_profile
  return value && PROFILE_CODES.has(value) ? value : 'standard_outdoor'
}

export function normalizeCampaignContext(value: unknown): CampaignContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const input = value as Record<string, unknown>
  const cta = cleanText(input.cta_primario)
  const contentAxis = cleanText(input.content_axis)
  const protagonists = Array.isArray(input.protagonistas)
    ? input.protagonistas.flatMap(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return []
        const raw = item as Record<string, unknown>
        const nombre = cleanText(raw.nombre)
        if (!nombre) return []
        return [{
          nombre,
          rol: cleanText(raw.rol),
          autoridad_verificada: cleanText(raw.autoridad_verificada),
        }]
      })
    : []

  return {
    territorio: cleanText(input.territorio),
    actividad: cleanText(input.actividad),
    nombre_publico: cleanText(input.nombre_publico),
    nombre_oferta: cleanText(input.nombre_oferta),
    destinos: cleanTextList(input.destinos),
    campania_principal: cleanText(input.campania_principal),
    frecuencia_confirmada: typeof input.frecuencia_confirmada === 'boolean'
      ? input.frecuencia_confirmada
      : null,
    dias_confirmados: cleanTextList(input.dias_confirmados)
      .filter(day => DAYS.has(day)) as CampaignContext['dias_confirmados'],
    horarios_confirmados: cleanTextList(input.horarios_confirmados),
    cta_primario: cta && CTA_VALUES.has(cta)
      ? cta as CampaignContext['cta_primario']
      : null,
    keyword_comentario: cleanText(input.keyword_comentario),
    whatsapp_group_url: cleanText(input.whatsapp_group_url),
    protagonistas: protagonists,
    marcas_prohibidas: cleanTextList(input.marcas_prohibidas),
    terminos_prohibidos: cleanTextList(input.terminos_prohibidos),
    responsable_cierre: cleanText(input.responsable_cierre),
    content_axis: contentAxis && CONTENT_AXES.has(contentAxis as CommercialContentAxis)
      ? contentAxis as CommercialContentAxis
      : null,
  }
}

export function withCommercialContentAxis(
  onboarding: ClientOnboarding | null,
  axis: CommercialContentAxis | null | undefined,
): ClientOnboarding | null {
  if (!onboarding || !axis) return onboarding
  return {
    ...onboarding,
    campaign_context: {
      ...normalizeCampaignContext(onboarding.campaign_context),
      content_axis: axis,
    },
  }
}

/**
 * Cuando el cliente cargó una salida recurrente real, esos datos tienen
 * precedencia sobre el contexto provisorio de la campaña. Así el motor puede
 * comunicar días, horario y lugares sin depender de volver al onboarding.
 */
export function withSalidaCommercialFacts(
  onboarding: ClientOnboarding | null,
  salida: Salida,
): ClientOnboarding | null {
  if (!onboarding || resolveContentProfile(onboarding) !== 'grupo_recurrente_local') return onboarding
  if (salida.tipo_viaje !== 'salida_recurrente') return onboarding

  const current = normalizeCampaignContext(onboarding.campaign_context)
  const days = salida.dias_semana ?? []
  const places = salida.lugares_recurrentes?.length
    ? salida.lugares_recurrentes
    : [salida.destino].filter(Boolean)

  return {
    ...onboarding,
    campaign_context: {
      ...current,
      territorio: current.territorio ?? salida.destino,
      destinos: places,
      frecuencia_confirmada: days.length > 0,
      dias_confirmados: days,
      horarios_confirmados: salida.hora_encuentro ? [salida.hora_encuentro.slice(0, 5)] : [],
    },
  }
}

function profileHeader(profile: ContentProfileCode): string {
  if (profile === 'grupo_recurrente_local') return 'GRUPO RECURRENTE LOCAL'
  if (profile === 'dupla_viajes_internacionales') return 'DUPLA DE VIAJES INTERNACIONALES'
  return 'OUTDOOR ESTÁNDAR'
}

function buildCtaInstruction(context: CampaignContext): string {
  if (context.cta_primario === 'link_bio') {
    return context.whatsapp_group_url
      ? 'El CTA lleva al grupo de WhatsApp mediante el link de la bio. No imprimas la URL dentro de la pieza.'
      : 'El CTA puede decir “sumate desde el link de la bio”. No inventes ni imprimas una URL.'
  }
  if (context.cta_primario === 'comentario') {
    return context.keyword_comentario
      ? `El CTA pide comentar la palabra exacta “${context.keyword_comentario}”.`
      : 'El CTA puede pedir un comentario natural, pero no inventes una palabra clave.'
  }
  if (context.cta_primario === 'whatsapp') return 'El CTA invita a escribir por WhatsApp, sin inventar número ni enlace.'
  if (context.cta_primario === 'dm') return 'El CTA invita a escribir por mensaje directo.'
  if (context.cta_primario === 'formulario') return 'El CTA dirige al formulario o link de la bio, sin inventar URL.'
  return 'No inventes un canal de contacto. Usá un CTA neutro como “pedí la info”.'
}

/**
 * Bloque central que reciben video, carrusel y banner. Convierte el perfil
 * comercial en reglas concretas y, sobre todo, separa hechos confirmados de
 * hipótesis pendientes.
 */
export function buildCommercialProfilePrompt(onboarding: ClientOnboarding | null): string {
  const profile = resolveContentProfile(onboarding)
  if (profile === 'standard_outdoor') return ''
  const context = normalizeCampaignContext(onboarding?.campaign_context)
  const lines = [
    `=== PERFIL COMERCIAL: ${profileHeader(profile)} ===`,
    'REGLA DE VERACIDAD: solo podés afirmar fechas, días, horarios, precios, cupos, servicios, credenciales y destinos que estén cargados explícitamente. Si faltan, omitilos. Nunca completes huecos con algo probable.',
  ]

  if (context.territorio) lines.push(`- Territorio confirmado: ${context.territorio}`)
  if (context.actividad) lines.push(`- Actividad confirmada: ${context.actividad}`)
  if (context.nombre_publico) lines.push(`- Nombre público que puede aparecer: ${context.nombre_publico}`)
  if (context.nombre_oferta) lines.push(`- Oferta/unidad confirmada: ${context.nombre_oferta}`)
  if (context.destinos?.length) lines.push(`- Destinos habilitados: ${context.destinos.join(', ')}`)
  if (context.campania_principal) lines.push(`- Campaña prioritaria: ${context.campania_principal}`)

  if (profile === 'grupo_recurrente_local') {
    lines.push(
      '- Objetivo: convertir el deseo de salir a caminar en una consulta o ingreso al grupo local.',
      '- Idea madre: trekking en grupo. Trabajá pertenencia, compañía, cercanía, constancia, lugar y objeciones reales; no presentes esto como una agencia internacional.',
      '- El registro de salida vinculado puede funcionar solo como fuente técnica de material. Para el tema, destino y promesa comercial manda este perfil. No arrastres el viaje vinculado si no coincide con la oferta o los destinos habilitados.',
      '- Podés comunicar que existen salidas semanales únicamente si “frecuencia_confirmada” es verdadera.',
    )
    if (context.frecuencia_confirmada) {
      lines.push('- Frecuencia semanal confirmada: sí.')
    } else {
      lines.push('- Frecuencia semanal NO confirmada: no prometas regularidad ni uses “todos los fines de semana”.')
    }
    if (context.dias_confirmados?.length) {
      lines.push(`- Días confirmados: ${context.dias_confirmados.join(', ')}.`)
    } else {
      lines.push('- Días pendientes: no menciones martes, jueves, sábado ni ningún día concreto.')
    }
    if (context.horarios_confirmados?.length) {
      lines.push(`- Horarios confirmados: ${context.horarios_confirmados.join(', ')}.`)
    } else {
      lines.push('- Horarios pendientes: no menciones mañana, tarde ni una hora concreta.')
    }
    lines.push(`- ${buildCtaInstruction(context)}`)
  }

  if (profile === 'dupla_viajes_internacionales') {
    const people = context.protagonistas ?? []
    lines.push(
      '- Objetivo: posicionar una dupla con dos mundos complementarios y convertir interés por viajar en consultas.',
      '- Relato: una mirada aporta montaña y aventura; la otra aporta playa y viajes internacionales. Mostralos como dupla, no como dos marcas desconectadas.',
      '- No presentes todos los viajes como trekking ni uses la identidad Caminantes salvo que esté cargada explícitamente como permitida.',
      '- No atribuyas cargos, medios, empresas, años de experiencia ni credenciales a una persona si no aparecen abajo como autoridad verificada.',
      '- Para el tema y destino manda la campaña prioritaria y la lista de destinos habilitados; no arrastres otro viaje solo porque comparte la carpeta o el registro fuente.',
    )
    people.forEach(person => {
      const detail = [person.rol, person.autoridad_verificada].filter(Boolean).join(' — ')
      lines.push(`- Protagonista confirmado: ${person.nombre}${detail ? ` — ${detail}` : ''}`)
    })
    if (context.marcas_prohibidas?.length) {
      lines.push(`- Marcas/nombres que NO deben aparecer: ${context.marcas_prohibidas.join(', ')}.`)
    }
    lines.push(`- ${buildCtaInstruction(context)}`)
  }

  if (context.terminos_prohibidos?.length) {
    lines.push(`- Temas, destinos o expresiones que NO deben aparecer: ${context.terminos_prohibidos.join(', ')}.`)
  }
  if (context.content_axis) {
    lines.push(
      `- INTENCIÓN DE ESTA PIEZA: ${context.content_axis.toUpperCase()}.`,
      `- ${CONTENT_AXIS_INSTRUCTIONS[context.content_axis]}`,
    )
  }

  return lines.join('\n')
}

const PROFILE_RECIPES: Record<Exclude<ContentProfileCode, 'standard_outdoor'>, readonly CommercialWeekRecipe[]> = {
  grupo_recurrente_local: [
    {
      profile: 'grupo_recurrente_local',
      objective: 'Captar demanda para el grupo y explicar cómo sumarse.',
      bannerMolde: 6,
      videoSubfamilia: '4',
      carouselPriority: ['organico', 'conversacion'],
      distribution: { conversion: 40, comunidad: 30, descubrimiento: 20, confianza: 10 },
    },
    {
      profile: 'grupo_recurrente_local',
      objective: 'Mostrar el territorio y bajar la barrera de ir sin compañía.',
      bannerMolde: 6,
      videoSubfamilia: '4',
      carouselPriority: ['organico', 'conversacion'],
      distribution: { conversion: 30, comunidad: 30, descubrimiento: 30, confianza: 10 },
    },
    {
      profile: 'grupo_recurrente_local',
      objective: 'Responder objeciones y reforzar pertenencia.',
      bannerMolde: 6,
      videoSubfamilia: '4',
      carouselPriority: ['organico', 'conversacion'],
      distribution: { conversion: 25, comunidad: 35, objeciones: 25, descubrimiento: 15 },
    },
    {
      profile: 'grupo_recurrente_local',
      objective: 'Dar utilidad y sostener una invitación comercial clara.',
      bannerMolde: 6,
      videoSubfamilia: '4',
      carouselPriority: ['organico', 'conversacion'],
      distribution: { conversion: 30, utilidad: 30, comunidad: 25, descubrimiento: 15 },
    },
  ],
  dupla_viajes_internacionales: [
    {
      profile: 'dupla_viajes_internacionales',
      objective: 'Presentar la dupla y abrir deseo por el destino principal.',
      bannerMolde: 5,
      videoSubfamilia: '2b',
      carouselPriority: ['lugar', 'organico', 'conversacion', 'itinerario'],
      distribution: { destino: 30, personalidad: 30, conversion: 25, confianza: 15 },
    },
    {
      profile: 'dupla_viajes_internacionales',
      objective: 'Convertir el viaje en una propuesta concreta y consultable.',
      bannerMolde: 3,
      videoSubfamilia: '4',
      carouselPriority: ['itinerario', 'lugar', 'conversacion', 'editorial'],
      distribution: { conversion: 40, destino: 25, confianza: 20, personalidad: 15 },
    },
    {
      profile: 'dupla_viajes_internacionales',
      objective: 'Ganar alcance con contraste montaña/playa sin perder el viaje.',
      bannerMolde: 5,
      videoSubfamilia: '3c',
      carouselPriority: ['organico', 'conversacion', 'lugar', 'editorial'],
      distribution: { alcance: 35, personalidad: 30, destino: 20, conversion: 15 },
    },
    {
      profile: 'dupla_viajes_internacionales',
      objective: 'Responder dudas y consolidar autoridad compartida.',
      bannerMolde: 3,
      videoSubfamilia: '3d',
      carouselPriority: ['conversacion', 'editorial', 'itinerario', 'lugar'],
      distribution: { confianza: 30, objeciones: 30, conversion: 25, destino: 15 },
    },
  ],
}

export function getCommercialWeekRecipe(
  profile: ContentProfileCode,
  rotationIndex = 0,
): CommercialWeekRecipe | null {
  if (profile === 'standard_outdoor') return null
  const recipes = PROFILE_RECIPES[profile]
  const safeIndex = ((rotationIndex % recipes.length) + recipes.length) % recipes.length
  return recipes[safeIndex]
}

export function buildLocalCampaignBanner(
  onboarding: ClientOnboarding | null,
  salida: Salida,
): LocalCampaignBanner | null {
  if (resolveContentProfile(onboarding) !== 'grupo_recurrente_local') return null
  const campaign = normalizeCampaignContext(onboarding?.campaign_context)
  const activity = campaign.actividad ?? 'Trekking en grupo'
  const territory = salida.tipo_viaje === 'salida_recurrente'
    ? (salida.lugares_recurrentes?.[0] ?? campaign.territorio ?? salida.destino)
    : (campaign.territorio ?? salida.destino)
  const convocatoria = campaign.cta_primario === 'link_bio'
    ? 'Sumate desde el link de la bio'
    : campaign.cta_primario === 'whatsapp'
      ? 'Escribinos por WhatsApp para sumarte'
      : 'Pedí la info para sumarte'
  return {
    contentKind: 'banner/molde-6',
    mensaje: `${activity} en ${territory}`,
    convocatoria,
    typographyId: 'Inter',
  }
}

/**
 * Separa el registro que presta fotos/videos de la oferta que el copy puede
 * comunicar. Conserva IDs y carpetas; reemplaza únicamente los hechos
 * editoriales cuando el perfil es una campaña local sin salida puntual.
 */
export function projectSalidaForCommercialProfile(
  salida: Salida,
  onboarding: ClientOnboarding | null,
): Salida {
  if (resolveContentProfile(onboarding) !== 'grupo_recurrente_local') return salida
  if (salida.tipo_viaje === 'salida_recurrente') return salida
  const context = normalizeCampaignContext(onboarding?.campaign_context)
  const destinations = context.destinos ?? []
  const primaryDestination = destinations[0] ?? context.territorio ?? context.actividad ?? 'Salida local'
  return {
    ...salida,
    nombre: context.nombre_oferta ?? context.actividad ?? 'Salida local en grupo',
    destino: primaryDestination,
    tipo_viaje: 'salida_recurrente',
    dias_semana: context.frecuencia_confirmada ? (context.dias_confirmados ?? []) : [],
    hora_encuentro: context.frecuencia_confirmada ? (context.horarios_confirmados?.[0] ?? null) : null,
    frecuencia: context.frecuencia_confirmada ? 'semanal' : null,
    puntos_interes: destinations.map(nombre => ({ nombre, descripcion: `Destino confirmado de la campaña: ${nombre}` })),
    itinerario: null,
    itinerario_dias: [],
    que_incluye: null,
    que_no_incluye: null,
  }
}

/** Auditoría determinista para bloquear afirmaciones de agenda no cargadas. */
export function auditCommercialCopy(
  text: string,
  onboarding: ClientOnboarding | null,
): string[] {
  const profile = resolveContentProfile(onboarding)
  if (profile === 'standard_outdoor') return []
  const context = normalizeCampaignContext(onboarding?.campaign_context)
  const normalized = text.toLocaleLowerCase('es-AR')
  const issues: string[] = []

  if (profile === 'grupo_recurrente_local') {
    const mentionedDays = [...DAYS].filter(day => new RegExp(`\\b${day}\\b`, 'iu').test(normalized))
    const allowedDays = new Set<string>(context.dias_confirmados ?? [])
    const invalidDays = mentionedDays.filter(day => !allowedDays.has(day))
    if (invalidDays.length) issues.push(`Días no confirmados: ${invalidDays.join(', ')}`)
    if (!context.frecuencia_confirmada && /\b(?:finde|fin(?:es)? de semana|salidas semanales|cada semana)\b/iu.test(text)) {
      issues.push('Frecuencia o fin de semana no confirmado')
    }
    if (!context.frecuencia_confirmada && /\b(?:20\d{2}|\d{1,2}[/-]\d{1,2}|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/iu.test(text)) {
      issues.push('Fecha no confirmada')
    }
    if (/\b(?:USD|ARS|precio|seña|\d+\s+(?:cupos?|lugares disponibles))\b|\$\s*\d/iu.test(text)) {
      issues.push('Dato comercial no confirmado para la campaña local')
    }
  }

  for (const forbidden of context.marcas_prohibidas ?? []) {
    if (normalized.includes(forbidden.toLocaleLowerCase('es-AR'))) {
      issues.push(`Marca prohibida: ${forbidden}`)
    }
  }
  for (const forbidden of context.terminos_prohibidos ?? []) {
    if (normalized.includes(forbidden.toLocaleLowerCase('es-AR'))) {
      issues.push(`Término prohibido: ${forbidden}`)
    }
  }
  return issues
}

export function assertCommercialCopy(
  value: unknown,
  onboarding: ClientOnboarding | null,
): void {
  const ignoredKeys = new Set([
    'metadata',
    'fuentes',
    'indicacion_imagen',
    'carpeta',
    'carpetaOrigen',
    'sourceFolder',
    'angulo',
    'estructura_narrativa',
  ])
  const visibleText: string[] = []
  const visit = (node: unknown, key?: string) => {
    if (key && ignoredKeys.has(key)) return
    if (typeof node === 'string') {
      visibleText.push(node)
      return
    }
    if (Array.isArray(node)) {
      node.forEach(item => visit(item))
      return
    }
    if (node && typeof node === 'object') {
      Object.entries(node as Record<string, unknown>).forEach(([childKey, child]) => visit(child, childKey))
    }
  }
  visit(value)
  const issues = auditCommercialCopy(visibleText.join('\n'), onboarding)
  if (issues.length > 0) {
    throw new Error(`La pieza viola el perfil comercial: ${issues.join('; ')}`)
  }
}

/**
 * Evita que una campaña use por accidente el banco visual de otra oferta.
 * El nombre de carpeta es metadata técnica (no copy visible), por eso se
 * valida en un guard separado antes de generar o despachar el render.
 */
export function assertCommercialMediaSource(
  source: string | null | undefined,
  onboarding: ClientOnboarding | null,
): void {
  if (!source?.trim()) return
  const profile = resolveContentProfile(onboarding)
  if (profile === 'standard_outdoor') return
  const context = normalizeCampaignContext(onboarding?.campaign_context)
  const comparable = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('es-AR')
  const normalizedSource = comparable(source)
  const forbidden = [
    ...(context.marcas_prohibidas ?? []),
    ...(context.terminos_prohibidos ?? []),
  ].find(term => normalizedSource.includes(comparable(term)))

  if (forbidden) {
    throw new Error(
      `El banco visual “${source}” pertenece a otra campaña (${forbidden}). Vinculá material compatible con este perfil antes de generar.`,
    )
  }
}
