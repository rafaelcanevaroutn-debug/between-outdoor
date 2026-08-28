import type { CommercialContentAxis, VideoFamilia3Subfamilia } from '@/types'

export type LocalRecurringMotif =
  | 'compania'
  | 'bienestar'
  | 'habito'
  | 'naturaleza'
  | 'lugar'
  | 'tiempo'
  | 'confianza_fisica'
  | 'logistica'
  | 'plan_semana'
  | 'humor_cotidiano'
  | 'informacion_directa'

const LOCAL_AXIS_GUIDANCE: Record<CommercialContentAxis, string> = {
  conversion: 'Hacé una invitación directa y concreta. El CTA puede llevar al grupo, pero no conviertas pertenencia en el tema de todas las piezas.',
  comunidad: 'Esta sí es una pieza de compañía: mostrale a alguien que puede incorporarse, compartir la caminata o conocer gente sin prometer amistad.',
  descubrimiento: 'Mostrá la sorpresa de no conocer algo que estaba cerca. No vendas el lugar ni uses imperativos como “descubrí” o “conocé”: hacé una observación reconocible.',
  confianza: 'Bajá incertidumbre con criterio: nivel, primera vez, guía, punto de encuentro o qué esperar, usando solo información confirmada.',
  objeciones: 'Resolvé un solo freno real. Rotá entre tiempo, energía, motivación, condición física, miedo a no poder, equipo, logística y compañía.',
  utilidad: 'Dale una ayuda aplicable: qué consultar, qué llevar, cómo elegir nivel o cómo preparar una primera salida. Sin inventar requisitos.',
  destino: 'Hacé protagonista al lugar verificado y la posibilidad concreta de conocerlo caminando.',
  personalidad: 'Hacé una observación humana con giro, contraste o ironía. Tiene que sonar compartible, no a autoayuda ni a frase de taza.',
  alcance: 'Usá humor o identificación cotidiana: sillón, escaleras, alarma, reloj, notificaciones, fin de semana o excusas. Conservá esos recursos, pero rotalos: no vuelvas automáticamente a terapia o soledad.',
  bienestar: 'Mostrá el contraste concreto entre pantalla/notificaciones/rutina y estar afuera. No expliques el beneficio con frases genéricas ni prometas curar, sanar o reemplazar terapia.',
  habito: 'Mostrá con ironía la negociación entre agenda, ganas, alarma y zapatillas. La práctica repetible debe entenderse sin dar una lección ni moralizar.',
}

const LOCAL_WEEKLY_AXES: readonly (readonly CommercialContentAxis[])[] = [
  ['bienestar', 'descubrimiento', 'conversion', 'confianza', 'alcance', 'utilidad', 'comunidad', 'conversion', 'habito', 'objeciones'],
  ['habito', 'utilidad', 'conversion', 'descubrimiento', 'bienestar', 'objeciones', 'alcance', 'confianza', 'comunidad', 'destino'],
  ['objeciones', 'bienestar', 'conversion', 'utilidad', 'alcance', 'descubrimiento', 'habito', 'confianza', 'comunidad', 'destino'],
  ['descubrimiento', 'objeciones', 'conversion', 'habito', 'bienestar', 'utilidad', 'alcance', 'confianza', 'comunidad', 'destino'],
]

export function localRecurringAxisGuidance(axis: CommercialContentAxis | null | undefined): string {
  return LOCAL_AXIS_GUIDANCE[axis ?? 'comunidad']
}

export function localRecurringWeeklyAxes(rotationIndex = 0): CommercialContentAxis[] {
  const index = ((rotationIndex % LOCAL_WEEKLY_AXES.length) + LOCAL_WEEKLY_AXES.length)
    % LOCAL_WEEKLY_AXES.length
  return [...LOCAL_WEEKLY_AXES[index]]
}

function normalizedTokens(value: string): Set<string> {
  const canonical = (token: string) => {
    if (/^lleg/u.test(token)) return 'llegar'
    if (/^volv/u.test(token)) return 'volver'
    if (/^camin/u.test(token)) return 'caminar'
    if (/^acompan/u.test(token)) return 'acompanar'
    return token
  }
  return new Set(value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .replace(/[^a-z0-9\s]/gu, ' ')
    .split(/\s+/u)
    .filter(token => token.length >= 3 && !['para', 'pero', 'como', 'con', 'una', 'que', 'del', 'las', 'los', 'por'].includes(token))
    .map(canonical))
}

export function localCopySimilarity(left: string, right: string): number {
  const a = normalizedTokens(left)
  const b = normalizedTokens(right)
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const token of a) if (b.has(token)) intersection += 1
  return intersection / (a.size + b.size - intersection)
}

export function detectLocalRecurringMotifs(copy: string): LocalRecurringMotif[] {
  const motifs: LocalRecurringMotif[] = []
  const add = (motif: LocalRecurringMotif, pattern: RegExp) => {
    if (pattern.test(copy)) motifs.push(motif)
  }
  add('compania', /\b(?:grupo|junt[oa]s?|acompa[ñn]ad|con qui[eé]n|solo|sola|nadie)\b/iu)
  add('bienestar', /\b(?:bienestar|aire|pausa|pantalla|cabeza|descans|respir|energ[ií]a)\b/iu)
  add('habito', /\b(?:h[aá]bito|semana|regular|constan|reserv[áa]|repet|rutina)\b/iu)
  add('naturaleza', /\b(?:naturaleza|verde|sol|aire libre|yungas|bosque|sendero)\b/iu)
  add('lugar', /\b(?:lugar|cascada|r[ií]o|cerro|conocer|descubrir)\b/iu)
  add('tiempo', /\b(?:tiempo|rato|agenda|ocupad|finde|fin de semana)\b/iu)
  add('confianza_fisica', /\b(?:nivel|ritmo|experiencia|poder|entrenad|principiante|lesi[oó]n)\b/iu)
  add('logistica', /\b(?:llevar|equipo|encuentro|horario|calzado|mochila|agua)\b/iu)
  add('plan_semana', /\b(?:plan|s[aá]bado|domingo|finde|semana)\b/iu)
  add('humor_cotidiano', /\b(?:yo:|pov:|alarma|sill[oó]n|escaleras|excusas?)\b/iu)
  add('informacion_directa', /\b(?:trekking|salida|jueves|viernes|s[aá]bado|tucum[aá]n)\b/iu)
  return motifs
}

export function localCopyRepeatsPrevious(
  copy: string,
  previousCopies: readonly string[],
  axis: CommercialContentAxis | null | undefined,
): boolean {
  if (previousCopies.some(previous => localCopySimilarity(copy, previous) >= 0.46)) return true
  if (axis === 'alcance') {
    const humorHooks = [
      /\bsill[oó]n\b/iu,
      /\bescaleras?\b/iu,
      /\balarma\b/iu,
      /\b(?:cama|dormir|sueño)\b/iu,
      /\bexcusas?\b/iu,
    ]
    if (humorHooks.some(pattern => pattern.test(copy) && previousCopies.some(previous => pattern.test(previous)))) {
      return true
    }
  }
  const motifs = detectLocalRecurringMotifs(copy)
  const previousMotifs = previousCopies.flatMap(detectLocalRecurringMotifs)
  if (axis !== 'comunidad' && motifs.includes('compania')) {
    return previousMotifs.filter(motif => motif === 'compania').length >= 1
  }
  if (/\bterapia\b/iu.test(copy)) {
    return previousCopies.some(previous => /\bterapia\b/iu.test(previous))
  }
  return false
}

export function localAxisMismatch(
  copy: string,
  axis: CommercialContentAxis | null | undefined,
): string | null {
  if (/cortar el pasto(?: del cerro)?/iu.test(copy)) {
    return 'la frase no suena natural para una salida de trekking; hablá de caminar, reservar tiempo o salir'
  }
  if (axis === 'habito') {
    return /\b(?:semana|agenda|reserv|repet|h[aá]bito|regular|cada|tiempo|rato)\b/iu.test(copy)
      ? null
      : 'el eje HÁBITO debe mostrar una práctica repetible, un rato reservado o una decisión de agenda'
  }
  if (axis === 'bienestar') {
    return /\b(?:aire|afuera|pantalla|mover|cuerpo|pausa|sol|notificaciones?|respir|caminar)\b/iu.test(copy)
      ? null
      : 'el eje BIENESTAR debe mostrar movimiento o tiempo al aire libre sin caer en terapia'
  }
  if (axis === 'objeciones') {
    return /\b(?:tiempo|nivel|ritmo|experiencia|equipo|llevar|calzado|agua|miedo|puedo|poder|compa[ñn][ií]a|con qui[eé]n|solo|sola)\b/iu.test(copy)
      ? null
      : 'el eje OBJECIONES debe responder un freno reconocible: tiempo, nivel, experiencia, equipo, ritmo o compañía'
  }
  if (axis === 'descubrimiento' || axis === 'destino') {
    return /\b(?:lugar|camino|sendero|cascada|r[ií]o|cerro|bosque|yungas|conocer|descubrir|cerca)\b/iu.test(copy)
      ? null
      : 'el eje DESCUBRIMIENTO debe poner en primer plano un camino, lugar o paisaje'
  }
  return null
}

const GENERIC_LOCAL_ORGANIC_PATTERN = /(?:el d[ií]a afloj[oó]|un rato afuera tambi[eé]n cuenta|mover el cuerpo y tomar aire|ordenar el d[ií]a|caminar un rato tambi[eé]n cuenta|siempre queda un camino cerca|hac[eé] lugar para caminar|sumar naturaleza a la semana)/iu
const COMMERCIAL_DISCOVERY_OPENING = /^\s*(?:descubr[ií]|conoc[eé]|explor[aá]|ven[ií]|sumate|consult[aá]|ped[ií])(?:\s|$)/iu
const ORGANIC_OBSERVATION_MARKER = /(?:\bPOV:|\byo:|\btambi[eé]n yo:|\bmi\s+[\p{L}]+:|[¿?]|\b(?:alarma|sill[oó]n|escaleras?|reloj|agenda|zapatillas|notificaciones?|pantalla|se[ñn]al|excusa|lunes|finde)\b)/iu
const ORGANIC_IRONY_MARKER = /(?:\b(?:alarma|sill[oó]n|escaleras?|reloj|agenda|zapatillas|notificaciones?|excusa|terapia)\b|\byo:|\btambi[eé]n yo:|\bmi\s+[\p{L}]+:|\n|\bpero\b)/iu

/** Evita que un eje orgánico termine escrito como publicidad o wellness
 * genérico. No obliga a cambiar los motivos que ya funcionan: exige que la
 * pieza tenga observación, contraste o remate y deja que esos motivos roten. */
export function localOrganicStyleMismatch(
  copy: string,
  axis: CommercialContentAxis | null | undefined,
): string | null {
  if (GENERIC_LOCAL_ORGANIC_PATTERN.test(copy)) {
    return 'la idea es genérica; necesitás una observación cotidiana, un contraste o un remate con ironía'
  }
  if (/:\s*$/u.test(copy)) {
    return 'el remate quedó incompleto; la segunda idea debe cerrar la observación'
  }
  if ((axis === 'descubrimiento' || axis === 'destino') && COMMERCIAL_DISCOVERY_OPENING.test(copy)) {
    return 'el descubrimiento orgánico no debe vender el lugar con un imperativo; mostrale al público algo en lo que se reconozca'
  }
  if (
    ['descubrimiento', 'destino', 'personalidad', 'alcance', 'bienestar', 'habito'].includes(axis ?? '')
    && !ORGANIC_OBSERVATION_MARKER.test(copy)
  ) {
    return 'la pieza orgánica necesita una observación reconocible, contraste o ironía; no una afirmación plana'
  }
  if (axis === 'alcance' && !ORGANIC_IRONY_MARKER.test(copy)) {
    return 'el contenido de alcance necesita un giro o contraste concreto; poner POV delante de una frase plana no alcanza'
  }
  return null
}

const FALLBACKS: Record<VideoFamilia3Subfamilia, Partial<Record<CommercialContentAxis, readonly string[]>>> = {
  '3a': {
    bienestar: ['Mis notificaciones tenían mucho para decir. El sendero, nada.', 'La pantalla pidió cinco minutos más. Las zapatillas no.'],
    habito: ['Mi agenda decía después. Las zapatillas dijeron hoy.', 'Las ganas llegaron tarde. La caminata ya estaba agendada.'],
    comunidad: ['Compartir el camino hace más fácil dar el primer paso.'],
    objeciones: ['No hace falta empezar rápido. Hace falta empezar.'],
    descubrimiento: ['Yo diciendo que conozco todo cerca. El sendero: seguro que no.'],
  },
  '3b': {
    bienestar: ['POV: cerraste una app y abriste un sendero.', 'POV: dos horas sin señal y ninguna queja.'],
    habito: ['POV: la agenda dijo después. Las zapatillas dijeron hoy.'],
    comunidad: [
      'POV: llegaste sin conocer a nadie y ya tenés otro plan.',
      'POV: viniste por el sendero y te quedaste por la gente.',
      'POV: la primera caminata ya te dejó el próximo plan.',
      'POV: preguntaste si podías ir solo y volviste acompañado.',
    ],
    objeciones: ['POV: empezaste a tu ritmo y era por ahí.'],
    alcance: [
      'POV: las escaleras eran entrenamiento y no lo sabías.',
      'POV: la alarma del finde sí se escucha.',
      'POV: cambiaste el sillón por un buen sendero.',
    ],
    descubrimiento: ['POV: encontraste un lugar nuevo sin irte lejos.'],
  },
  '3c': {
    bienestar: ['Mis notificaciones: 27.\nLas del sendero: ninguna.'],
    habito: ['Mi agenda: después.\nMis zapatillas: hoy.'],
    comunidad: [
      'Yo: vengo una vez.\nTambién yo: ¿cuándo salimos?',
      'Yo: no conozco a nadie.\nTambién yo: nos vemos el sábado.',
      'Yo: vine a caminar.\nTambién yo: ya tengo próximo plan.',
      'Yo: hoy voy por mi cuenta.\nEl camino: eso lo vemos.',
    ],
    objeciones: ['Yo: seguro no aguanto.\nMi ritmo: tranquilo, llegamos.'],
    alcance: [
      'Yo subiendo escaleras: no puedo.\nYo en el cerro: una más.',
      'Mi alarma del finde: suena.\nYo: ya estoy listo.',
      'Mi sillón: quedate.\nMis zapatillas: ya salimos.',
    ],
    descubrimiento: ['Yo: conozco todo cerca.\nEl sendero: seguro que no.'],
  },
  '3d': {
    bienestar: ['¿Dónde dejé el celular?\nYo: guardado mientras camino.'],
    habito: ['¿Cuándo te queda tiempo?\nYo: cuando lo dejo agendado.'],
    comunidad: [
      '¿Con quién salís?\nYo: con la gente que conocí caminando.',
      '¿Hace falta conocer a alguien?\nYo: no, me sumo y listo.',
      '¿Vas con amigos?\nYo: los conocí en el camino.',
      '¿Puedo ir sin conocer a nadie?\nYo: sí, me sumo al grupo.',
    ],
    objeciones: ['¿Y si voy lento?\nYo: pregunto el nivel y voy a mi ritmo.'],
    alcance: [
      '¿Plan para el finde?\nYo: zapatillas puestas y afuera.',
      '¿Sonó la alarma?\nYo: si es para caminar, sí.',
      '¿Otra tarde de sillón?\nYo: hoy toca sendero.',
    ],
    descubrimiento: ['¿Otra vez el mismo lugar?\nYo: hoy toca conocer un camino nuevo.'],
  },
  '3e': {},
}

export function localRecurringFallback(
  subfamilia: VideoFamilia3Subfamilia,
  axis: CommercialContentAxis | null | undefined,
  rotationIndex = 0,
): string | null {
  if (subfamilia === '3e') return null
  const byAxis = FALLBACKS[subfamilia]
  const variants = byAxis[axis ?? 'comunidad']
    ?? byAxis.alcance
    ?? byAxis.comunidad
    ?? []
  if (variants.length === 0) return null
  const index = ((rotationIndex % variants.length) + variants.length) % variants.length
  return variants[index]
}
