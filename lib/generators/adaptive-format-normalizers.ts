export interface AdaptiveRawDraft {
  angulo?: unknown
  descripcion_post?: unknown
  cta_comentario?: unknown
  slides?: unknown
}

export interface OrganicNormalizationInput {
  destination: string
  exactDateRange: string
  capacity: number
  canonicalCta: string
  descriptionLimit: number
  includeCommercialFacts?: boolean
}

export interface LocalOrganicEditorialInput {
  axis?: string | null
  territory: string
  destination: string
  publicName?: string | null
  rotationIndex?: number
}

/** Copy base deliberadamente simple para el carrusel local. La IA puede
 * proponer el ángulo visual, pero no convierte la invitación en autoayuda. */
export function localOrganicEditorialCopy(input: LocalOrganicEditorialInput): {
  angle: string
  cover: string
  description: string
} {
  const brand = input.publicName?.trim() || 'el grupo'
  const namedCommunity = input.publicName?.trim() || null
  const rotation = Math.abs(input.rotationIndex ?? 0)
  if (input.axis === 'descubrimiento') {
    const variants = [
      {
        angle: `Contrastar lo conocido con un sendero cercano`,
        cover: `Yo diciendo que ya conozco ${input.territory}.`,
        description: `Después aparece ${input.destination}: uno de esos lugares cercanos que todavía quedan por caminar.`,
      },
      {
        angle: `Mostrar naturaleza cercana en ${input.territory}`,
        cover: 'No hace falta irse lejos para encontrar sendero.',
        description: `Caminos, verde y lugares de ${input.territory} que todavía quedan por recorrer.`,
      },
    ]
    return variants[rotation % variants.length]
  }
  if (input.axis === 'confianza' || input.axis === 'objeciones') {
    const variants = [
      {
        angle: 'Resolver la duda sobre el nivel de una primera salida',
        cover: '¿No sabés si el nivel es para vos?',
        description: `Antes de sumarte, consultá el nivel y qué esperar del recorrido. En ${brand} te damos la información de cada salida por ${input.territory}.`,
      },
      {
        angle: 'Resolver la falta de tiempo con una propuesta local',
        cover: '¿Nunca encontrás tiempo para caminar?',
        description: `Empezá por reservar un rato y elegir una propuesta cerca en ${input.territory}. No hace falta esperar un viaje largo.`,
      },
      {
        angle: 'Resolver dudas de equipo antes de una primera caminata',
        cover: '¿Qué necesitás para tu primera salida?',
        description: `Antes de salir, pedí la lista de equipo, el punto de encuentro y el nivel. Así elegís con información concreta.`,
      },
      {
        angle: 'Resolver la falta de compañía para empezar a caminar',
        cover: '¿Querés caminar y no tenés con quién?',
        description: `No hace falta que armes tu propio grupo. Podés incorporarte a una salida de ${brand} por ${input.territory}.`,
      },
    ]
    return variants[rotation % variants.length]
  }
  if (input.axis === 'utilidad') {
    const variants = [
      {
        angle: 'Explicar de forma simple qué confirmar antes de una salida',
        cover: 'Tu próxima salida empieza con tres datos.',
        description: `Antes de salir, confirmá el nivel, el punto de encuentro y qué llevar. En ${brand} te pasamos la información de cada caminata por ${input.territory}.`,
      },
      {
        angle: 'Preparar una primera caminata sin abrumar',
        cover: 'Primera salida: preguntá esto antes.',
        description: 'Nivel, duración orientativa, punto de encuentro y equipo. Cuatro preguntas concretas antes de elegir una caminata.',
      },
    ]
    return variants[rotation % variants.length]
  }
  if (input.axis === 'destino') {
    const variants = [
      {
        angle: `Presentar ${input.destination} como un plan local concreto`,
        cover: `${input.destination}. Cerca y para conocer caminando.`,
        description: `Una propuesta para recorrer ${input.destination} a pie y seguir conociendo ${input.territory}.`,
      },
      {
        angle: `Abrir curiosidad por los lugares de ${input.territory}`,
        cover: '¿Cuántos lugares cerca todavía no caminaste?',
        description: `${input.destination} puede ser el próximo. Una forma de conocer ${input.territory} en movimiento.`,
      },
    ]
    return variants[rotation % variants.length]
  }
  if (input.axis === 'bienestar') {
    return {
      angle: 'Contrastar las notificaciones con un rato caminando',
      cover: 'Tus notificaciones pueden esperar cinco fotos.',
      description: `El celular sigue ahí cuando volvés. Mientras tanto, hay caminos de ${input.territory} para recorrer${namedCommunity ? ` con ${namedCommunity}` : ''}.`,
    }
  }
  if (input.axis === 'habito') {
    return {
      angle: 'Mostrar que el plan aparece cuando se reserva el tiempo',
      cover: 'La agenda no se despeja sola.',
      description: `Un rato para caminar también se agenda. Hay caminos de ${input.territory} que podés volver parte de la semana${namedCommunity ? ` con ${namedCommunity}` : ''}.`,
    }
  }
  if (input.axis === 'alcance') {
    return {
      angle: 'Identificación cotidiana entre quedarse en casa y salir a caminar',
      cover: 'El sillón tenía un plan. Vos también.',
      description: `Una caminata, aire libre y un lugar cerca para conocer. Así puede empezar el próximo plan por ${input.territory}.`,
    }
  }
  return {
    angle: 'Invitar a hacer trekking local con una propuesta concreta y cercana',
    cover: 'Una salida cerca. Un plan distinto.',
    description: `Caminamos por ${input.territory} y conocemos lugares cercanos en movimiento. Si querés recibir la próxima propuesta, podés sumarte a ${brand}.`,
  }
}

export type DirectedDescriptionFormat = 'organico' | 'conversacion'

export interface DirectedDescriptionInput {
  format: DirectedDescriptionFormat
  originalDescription: string
  rewrittenBody?: string | null
  destination: string
  exactDateRange?: string
  capacity?: number
  canonicalCta: string
  descriptionLimit: number
  verifiedPlaces?: string[]
  includeCommercialFacts?: boolean
}

const ABSTRACT_DESCRIPTION_PATTERN = /\breset\b|energ[ií]a|cambiar (?:la )?sinton[ií]a|vivir (?:el )?fin del mundo|cambiar (?:el )?chip|recarg\w*|reconect\w*|conexi[oó]n|transform\w*|volver a vos|arrancar distinto|otra vibra|desconect\w* de verdad|marca(?:r)? un antes y un despu[eé]s|cambiar de aire|tiene la respuesta|calendario[^.!?]{0,40}sin freno/i
const GENERATED_FACT_PATTERN = /\b20\d{2}\b|\b\d+(?:[.,]\d+)?\s*(?:km|m|hs?|horas?|min(?:utos?)?|d[ií]as?|noches?|personas?|lugares?)\b|\b(?:usd|ars|precio|capacidad|cupos?|incluye|transfer|alojamiento|seguro)\b/i

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function descriptionNeedsDirectedRewrite(value: string): boolean {
  return ABSTRACT_DESCRIPTION_PATTERN.test(value)
}

export function editableDescriptionBody(
  format: DirectedDescriptionFormat,
  description: string,
  canonicalCta: string,
): string {
  let body = description.trim()
  if (canonicalCta && body.toLocaleLowerCase('es-AR').endsWith(canonicalCta.toLocaleLowerCase('es-AR'))) {
    body = body.slice(0, body.length - canonicalCta.length).trimEnd()
  }
  if (format === 'organico') {
    const managedBlock = body.lastIndexOf('\n\nSalida:')
    if (managedBlock >= 0) body = body.slice(0, managedBlock)
  }
  return body.trim()
}

function cleanDirectedBody(value: string): string {
  return value
    .replace(/[*_#`]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.replace(/\s+/g, ' ').trim())
    .filter(sentence => sentence
      && !/coment[aá]|escribinos|mandanos|ped[ií]\s+(?:la\s+)?info/i.test(sentence)
      && !ABSTRACT_DESCRIPTION_PATTERN.test(sentence)
      && !GENERATED_FACT_PATTERN.test(sentence))
    .join(' ')
    .trim()
}

function fallbackDirectedBody(input: DirectedDescriptionInput): string {
  const cleanOriginal = cleanDirectedBody(editableDescriptionBody(
    input.format,
    input.originalDescription,
    input.canonicalCta,
  ))
  if (cleanOriginal) return cleanOriginal

  if (input.format === 'organico') {
    const places = (input.verifiedPlaces ?? []).map(item => item.trim()).filter(Boolean).slice(0, 3)
    return places.length > 0
      ? `Una salida para caminar por ${input.destination}: ${places.join(', ')}.`
      : `Una salida para caminar por ${input.destination}.`
  }
  return `Una charla cotidiana terminó en un plan para caminar por ${input.destination}.`
}

function fitBody(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const shortened = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut)
    .replace(/[\s,;:\-–—]+$/u, '')
    .replace(/(?:^|\s)(?:y|o|e|u|de|con|para|a|en|por|sin)$/iu, '')
    .trim()
  return shortened && !/[.!?]$/u.test(shortened) ? `${shortened}.` : shortened
}

export function finalizeDirectedDescription(input: DirectedDescriptionInput): string {
  const rewritten = cleanDirectedBody(text(input.rewrittenBody))
  const safeBody = rewritten || fallbackDirectedBody(input)
  const managedFacts = input.format === 'organico' && input.includeCommercialFacts !== false
    ? `Salida: ${input.exactDateRange}. Capacidad total: ${input.capacity} personas.\n\n`
    : ''
  const suffix = `${managedFacts}${input.canonicalCta}`
  const bodyLimit = Math.max(0, input.descriptionLimit - suffix.length - 2)
  const body = fitBody(safeBody, bodyLimit)
  return body ? `${body}\n\n${suffix}` : suffix
}

function managedOrganicFact(value: string): boolean {
  const date = /\b20\d{2}\b|\b\d{1,2}\s+(?:de\s+)?(?:ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\b/i
  const capacity = /\b(?:capacidad|cupos?)\b|\b(?:solo|quedan|[uú]ltimos?|limitados?)\s+\d*\s*lugares?\b|\b\d+\s+(?:lugares?|personas)\b/i
  return date.test(value) || capacity.test(value)
}

function cleanOrganicNarrative(value: string, max: number): string {
  const sentences = value
    .replace(/[*_#`]/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.replace(/\s+/g, ' ').trim())
    .filter(sentence => sentence && !/coment[aá]/i.test(sentence) && !managedOrganicFact(sentence))

  let result = ''
  for (const sentence of sentences) {
    const candidate = `${result}${result ? ' ' : ''}${sentence}`
    if (candidate.length > max) break
    result = candidate
  }

  if (result || max <= 0) return result
  const first = sentences[0] ?? ''
  if (first.length <= max) return first
  const cut = first.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const shortened = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut)
    .replace(/[\s,;:\-–—]+$/u, '')
    .trim()
  return shortened && !/[.!?]$/u.test(shortened) ? `${shortened}.` : shortened
}

export function normalizeOrganicDraft(
  raw: AdaptiveRawDraft,
  input: OrganicNormalizationInput,
): AdaptiveRawDraft {
  const slides = Array.isArray(raw.slides)
    ? raw.slides.map(item => item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : item)
    : raw.slides

  if (Array.isArray(slides) && slides[4] && typeof slides[4] === 'object') {
    slides[4] = {
      ...(slides[4] as Record<string, unknown>),
      rol: 'datos',
      tipo: 'ficha',
      pill_text: null,
      texto_principal: input.destination,
      texto_apoyo: input.includeCommercialFacts === false
        ? input.canonicalCta
        : `${input.exactDateRange} · Capacidad total: ${input.capacity} personas`,
    }
  }

  const dataLine = input.includeCommercialFacts === false
    ? ''
    : `Salida: ${input.exactDateRange}. Capacidad total: ${input.capacity} personas.`
  const suffix = dataLine ? `${dataLine}\n\n${input.canonicalCta}` : input.canonicalCta
  const narrativeLimit = Math.max(0, input.descriptionLimit - suffix.length - 2)
  const narrative = cleanOrganicNarrative(text(raw.descripcion_post), narrativeLimit)

  return {
    ...raw,
    descripcion_post: narrative ? `${narrative}\n\n${suffix}` : suffix,
    cta_comentario: input.canonicalCta,
    slides,
  }
}

export function mergeConversationEditorialReview(
  draft: AdaptiveRawDraft,
  review: AdaptiveRawDraft,
): AdaptiveRawDraft {
  if (!Array.isArray(review.slides)) {
    throw new Error('El editor de Conversación debe devolver slides revisados')
  }

  return {
    ...draft,
    slides: review.slides,
  }
}
