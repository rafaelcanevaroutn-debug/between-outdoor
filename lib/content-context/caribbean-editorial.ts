import type {Salida, VideoFamilia3Subfamilia} from '@/types'
import type {VideoMaterialContext} from '@/lib/material-context/video-material-context'
import {resolveContentContextTags} from './registry.ts'

const CARIBBEAN_TAG = 'entorno_caribe_playa'
const MOUNTAIN_CONTEXT_TAGS = new Set([
  'entorno_montana_altura',
  'entorno_patagonia_nieve',
  'actividad_trekking',
  'actividad_nieve',
])

const MOUNTAIN_LANGUAGE_PATTERN = /\b(?:monta[ñn]a|cumbre|refugio|trekking|ascenso|desnivel|sendero|expedici[oó]n)\b/iu
const EMOJI_PATTERN = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})/u
const EMOJI_TOKEN_PATTERN = /(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu

function safeRotation(rotationIndex = 0, length: number): number {
  return ((rotationIndex % length) + length) % length
}

export function isCaribbeanBeachSalida(
  salida: Pick<Salida, 'tipo_viaje' | 'context_tags' | 'zona_geografica'>,
): boolean {
  return salida.tipo_viaje === 'viaje_playa_caribe'
    || resolveContentContextTags(salida).includes(CARIBBEAN_TAG)
}

export function isPureCaribbeanBeachSalida(
  salida: Pick<Salida, 'tipo_viaje' | 'context_tags' | 'zona_geografica'>,
): boolean {
  const tags = resolveContentContextTags(salida)
  return isCaribbeanBeachSalida(salida) && !tags.some(tag => MOUNTAIN_CONTEXT_TAGS.has(tag))
}

export function countryFlagEmoji(countryCode?: string | null): string {
  const code = countryCode?.trim().toUpperCase()
  if (!code || !/^[A-Z]{2}$/u.test(code)) return ''
  return [...code].map(letter => String.fromCodePoint(127397 + letter.charCodeAt(0))).join('')
}

export function destinationCity(destination: string): string {
  return destination.split(',')[0]?.trim() || destination.trim()
}

/**
 * Mantiene libre la redacción de Gemini, pero garantiza que las piezas
 * comerciales consecutivas no terminen siempre con el mismo ícono.
 */
export function rotateCaribbeanCommercialEmoji(params: {
  copy: string
  countryCode?: string | null
  rotationIndex?: number
}): string {
  const flag = countryFlagEmoji(params.countryCode)
  const pool = ['🌴', '🌊', '🐚', '☀️', '✈️', '🏖️', flag].filter(Boolean)
  const selected = pool[safeRotation(params.rotationIndex, pool.length)]
  const withoutEmoji = params.copy
    .replace(EMOJI_TOKEN_PATTERN, '')
    .replace(/\s+([.,!?])/gu, '$1')
    .replace(/\s+/gu, ' ')
    .trim()
  const punctuation = withoutEmoji.match(/[.!?]$/u)?.[0] ?? ''
  const stem = punctuation ? withoutEmoji.slice(0, -1).trimEnd() : withoutEmoji
  return `${stem} ${selected}${punctuation}`.trim()
}

/**
 * Red de seguridad factual. No es un banco editorial ni debe usarse en el
 * camino normal: el copy principal lo escribe Gemini y luego se valida.
 */
export function buildCaribbeanLocationFallbackCopy(params: {
  destination: string
  countryCode?: string | null
  rotationIndex?: number
}): string {
  const destination = params.destination.trim()
  const city = destinationCity(destination)
  const flag = countryFlagEmoji(params.countryCode)
  const variants = [
    `📍 ${destination}${flag ? ` ${flag}` : ''}`,
    `Welcome to\n${city}${flag ? ` ${flag}` : ''}`,
    `🌴🐬🐚🌺\n${destination}`,
    `${city}\n${destination.includes(',') ? destination.split(',').slice(1).join(',').trim() : 'Caribe'}${flag ? ` ${flag}` : ''}`,
    `${city} 🌊${flag ? `\n${flag}` : ''}`,
    `Bienvenidos a\n${city} 🐚`,
    `☀️ ${destination}${flag ? ` ${flag}` : ''}`,
    `Unos días en\n${city} 🌴`,
  ]
  return variants[safeRotation(params.rotationIndex, variants.length)]
}

function comparable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export type CaribbeanNarrativePattern =
  | 'plan_salio_del_chat'
  | 'dinero_reservado_para_viajar'
  | 'madrugar_en_vacaciones'
  | 'promesa_de_no_publicar'
  | 'necesito_agua_mar'
  | 'necesito_despejar_la_mente'
  | 'antojo_de_viaje'
  | 'amistades_financieramente_irresponsables'
  | 'trabajo_tiempo_reloj'
  | 'juventud_antes_de_que_sea_tarde'

const CARIBBEAN_NARRATIVE_PATTERNS: ReadonlyArray<{
  id: CaribbeanNarrativePattern
  pattern: RegExp
}> = [
  {id: 'plan_salio_del_chat', pattern: /\bplan\b[\s\S]{0,45}\b(?:chat|grupo)\b|\b(?:chat|grupo)\b[\s\S]{0,45}\bplan\b/iu},
  {id: 'dinero_reservado_para_viajar', pattern: /\b(?:plata|dinero|sueldo|presupuesto|cuenta)\b[\s\S]{0,55}\b(?:viaj|vacacion|canc[uú]n|caribe)\w*/iu},
  {id: 'madrugar_en_vacaciones', pattern: /\b(?:madrug|7\s*(?:a\.?\s*m\.?)?|despert)\w*[\s\S]{0,55}\b(?:vacacion|viaj|playa|caribe)\w*/iu},
  {id: 'promesa_de_no_publicar', pattern: /\b(?:no\s+(?:voy\s+a\s+)?(?:subir|publicar)|sin\s+redes)\b[\s\S]{0,65}\b(?:historias?|stories|public|sub)\w*/iu},
  {id: 'necesito_agua_mar', pattern: /\bnecesit\w*\s+agua\b|\bel\s+agua\s+que\s+necesit/iu},
  {id: 'necesito_despejar_la_mente', pattern: /\b(?:despej|mente|cabeza)\w*[\s\S]{0,40}\b(?:mar|playa|viaj|vacacion)\w*/iu},
  {id: 'antojo_de_viaje', pattern: /\bantojo\w*[\s\S]{0,45}\b(?:viaj|vacacion|playa|caribe)\w*/iu},
  {id: 'amistades_financieramente_irresponsables', pattern: /\b(?:amig|compa|nosotros|grupo)\w*[\s\S]{0,55}\b(?:financier|responsab|cotiz|reserv)\w*/iu},
  {id: 'trabajo_tiempo_reloj', pattern: /\b(?:trabaj|hora|reloj)\w*[\s\S]{0,55}\b(?:trabaj|hora|reloj)\w*/iu},
  {id: 'juventud_antes_de_que_sea_tarde', pattern: /\b(?:joven|juventud|para\s+siempre|despu[eé]s\s+uno\s+se\s+muere|vida\s+es\s+(?:demasiado\s+)?corta)\b/iu},
]

export function detectCaribbeanNarrativePatterns(copy: string): CaribbeanNarrativePattern[] {
  return CARIBBEAN_NARRATIVE_PATTERNS
    .filter(({pattern}) => pattern.test(copy))
    .map(({id}) => id)
}

/**
 * Compara mecanismos editoriales, no sólo palabras. Así un POV y una
 * conversación no pueden repetir en el mismo lote la idea de que “el plan
 * salió del chat” cambiando apenas el comienzo o el destino.
 */
export function caribbeanCopyRepeatsNarrativePattern(
  copy: string,
  previousCopies: readonly string[],
): boolean {
  const current = new Set(detectCaribbeanNarrativePatterns(copy))
  if (current.size === 0) return false
  return previousCopies.slice(-15).some(previous => (
    detectCaribbeanNarrativePatterns(previous).some(pattern => current.has(pattern))
  ))
}

export function caribbeanLocationCopyViolations(params: {
  salida: Salida
  copy: string
}): string[] {
  if (!isCaribbeanBeachSalida(params.salida)) return []
  const destination = params.salida.destino?.trim()
  if (!destination) return ['la pieza de lugar no tiene un destino verificado disponible']
  const city = comparable(destinationCity(destination))
  const normalizedCopy = comparable(params.copy)
  const errors = caribbeanContextViolations(params.salida, params.copy)
  if (!city || !normalizedCopy.includes(city)) {
    errors.push(`la pieza de lugar debe identificar el destino verificado: ${destinationCity(destination)}`)
  }
  const expectedFlag = countryFlagEmoji(params.salida.pais_codigo)
  const flags = [...params.copy.matchAll(/\p{Regional_Indicator}{2}/gu)].map(match => match[0])
  if (flags.some(flag => flag !== expectedFlag)) {
    errors.push(`la pieza usa una bandera que no coincide con el país verificado${expectedFlag ? ` (${expectedFlag})` : ''}`)
  }
  if (!EMOJI_PATTERN.test(params.copy)) {
    errors.push('la pieza de lugar Caribe debe usar al menos un emoji pertinente')
  }
  return errors
}

export function buildCaribbeanEditorialPrompt(salida: Salida): string {
  if (!isCaribbeanBeachSalida(salida)) return ''
  const flag = countryFlagEmoji(salida.pais_codigo)
  return `=== PACK EDITORIAL PLAYA / CARIBE ===
Este pack tiene prioridad sobre ejemplos genéricos del nicho y sobre la historia profesional de los protagonistas.

UNIVERSO OBLIGATORIO
- Viaje, vacaciones, mar, agua, playa, descanso, amigos, calor, recuerdos, planes y vida costera.
- Si esta salida no tiene además una etiqueta explícita de montaña o trekking, están prohibidos: montaña, cumbre, refugio, ascenso, desnivel, sendero, trekking y expedición.
- Nunca uses la profesión previa de un protagonista para forzar montaña dentro de una pieza de playa.

FORMATOS QUE EL MOTOR DEBE ROTAR COMO MECANISMOS, NO COMO CUATRO COPIES CERRADOS
1. Ubicación mínima: pin + destino verificado + bandera, por ejemplo “📍 [destino] ${flag}”.
2. Bienvenida premium: “Welcome to” o “Bienvenidos a” y debajo el destino verificado.
3. Destino + fecha: ubicación arriba y fecha real de la salida como dato separado. Nunca inventar una fecha.
4. Reacción visual: una frase corta cuya respuesta es el agua, el viaje, el plan o la playa mostrada.
5. POV concreto: el espectador ya está de vacaciones, frente al mar, llegando o guardando un recuerdo. No inventar una actividad específica.
6. Humor cotidiano: dinero reservado para viajar, amigos financieramente irresponsables, madrugar distinto de vacaciones, prometer no publicar y subir todo, querer un plan y que el plan sea viajar.
7. Reflexión compartible: juventud, tiempo, trabajo, deseo, recuerdos y la decisión de vivir; sin sanación, terapia ni frase de póster.
8. Información útil: lista, recorrido o consejo construido solamente con datos cargados y material compatible.

EMOJIS
- Usalos como parte del lenguaje nativo, no como decoración automática.
- Ubicación: 📍. País: bandera derivada del país cargado. Playa/Caribe: 🌴, 🌊, 🐚, 🐬, ☀️. Humor: 😂, 🤭 o 🫠 cuando el remate lo justifique.
- Lugar minimalista: uno o dos emojis; bienvenida tropical puede usar hasta cuatro arriba.
- Meme y POV deben llevar al menos un emoji pertinente. Reflexivo puede ir limpio.
- No reemplaces un dato faltante con un emoji y no inventes actividades a partir del emoji.

MATERIAL Y ESPECIFICIDAD
- El destino general permite hablar del viaje, el Caribe o la playa de forma general.
- Hotel, boliche, beach club, excursión, cenote, snorkel, jet ski, yate o actividad concreta sólo pueden nombrarse si el material seleccionado y los datos verificados sostienen exactamente esa experiencia.
- Que algo figure en el itinerario no alcanza si la colección visual seleccionada es general.

ESTILO
- Texto breve, blanco, legible y fijo durante el clip para POV, meme, reflexión, conversación y lugar.
- Tono orgánico, social y directo. Nada de “experiencia inolvidable”, “paraíso soñado”, “aventura única” ni publicidad turística genérica.
- Los mecanismos anteriores son patrones; no copies literalmente ejemplos de referencia ni repitas la misma frase en el lote.`
}

export function buildCaribbeanFamily3Direction(params: {
  salida: Salida
  subfamilia: VideoFamilia3Subfamilia
  rotationIndex?: number
  materialContext?: VideoMaterialContext | null
}): string {
  if (!isCaribbeanBeachSalida(params.salida)) return ''
  const rotation = Math.abs(params.rotationIndex ?? 0)
  const directionByFamily: Record<VideoFamilia3Subfamilia, readonly string[]> = {
    '3a': [
      'Reflexioná sobre tiempo y vida elegida. Evitá pantallas, oficina y frases motivacionales obvias.',
      'Construí una observación irónica sobre todo lo que uno posterga para “cuando tenga tiempo”. No repitas reloj/hora ni escribas una moraleja.',
      'Hablá de juventud, recuerdos o hacer lugar para lo que uno desea. Una sola observación humana.',
      'Redefiní riqueza o éxito desde el tiempo vivido, sin vender el destino.',
      'Contrastá una agenda llena con un recuerdo que sí valió la pena, sin usar reloj, sueldo ni moraleja.',
      'Escribí sobre elegir una experiencia mientras todavía se puede. Evitá “la vida es corta” y cualquier frase de póster.',
      'Hacé una observación sobre volver con recuerdos en vez de cosas. Sin hablar de sanar ni transformarse.',
      'Mostrá que descansar también puede ser cambiar de paisaje. Una idea sobria y humana, sin vender.',
    ],
    '3b': [
      'POV de llegada o primera vista del mar. Debe terminar con un emoji pertinente.',
      'POV de cambiar rutina por vacaciones. Debe terminar con un emoji pertinente.',
      'POV de guardar un recuerdo del viaje. Debe terminar con un emoji pertinente.',
      'POV de un plan que finalmente salió del chat. Debe terminar con un emoji pertinente.',
      'POV del primer momento en que las vacaciones dejan de ser una fecha y se vuelven reales. Cerrá con un emoji.',
      'POV de mirar el mar y entender que esta vez sí hiciste lugar para el viaje. Cerrá con un emoji.',
      'POV de cambiar notificaciones por una vista que merece toda la atención. Cerrá con un emoji.',
      'POV de volver con un recuerdo que ya sabés que vas a mirar muchas veces. Cerrá con un emoji.',
    ],
    '3c': [
      'Contraste entre “no tengo plata” y tener un presupuesto que sí existe para viajar. No copies una frase fija; construí una premisa y un remate claros. Cerrá con 🤭 o 😂.',
      'Contraste entre madrugar en casa y madrugar de vacaciones. La segunda línea debe cerrar el chiste por sí sola. Cerrá con un emoji pertinente.',
      'Premisa: hay que ahorrar. Remate: el mismo grupo ya está armando otro viaje. No calques el ejemplo; escribí una escena breve y reconocible. Cerrá con 😂.',
      'Promesa de no publicar nada versus lo que ocurre el primer día del viaje. Evitá “yo a los cinco minutos en la playa”; describí una contradicción concreta. Cerrá con 😂.',
      'Necesidad cotidiana que en realidad significa mar: “necesito agua” y una segunda línea que revele qué agua. No nombres una playa específica. Usá 🌊.',
      'Ganas de hacer un plan y una segunda línea que revele visualmente que el plan es viajar. Usá 🌴 o ✈️.',
      'Necesidad de despejar la mente y una segunda línea que muestre cómo quiere despejarla: mar, viaje o vacaciones. Usá 🌊.',
      'Antojo que no es comida: la segunda línea revela que el antojo es viajar o estar frente al mar. Usá un emoji pertinente.',
      'Ironía sobre amistades “responsables” que convierten cualquier conversación en una cotización de viaje. Cerrá con 😂.',
      'Lo que los demás imaginan al ver las historias versus la prioridad real de quien viaja. Dos líneas, una conclusión concreta y un emoji.',
    ],
    '3d': [
      'Pregunta cotidiana que alguien haría al ver las historias; respuesta exagerada y cómplice con remate, no una ubicación seca.',
      'Pregunta sobre qué pasó con el plan que nunca salía del chat. La respuesta debe empezar “Salió:” o “El plan:” y cerrar el chiste con un emoji.',
      'Pregunta sobre por qué no contesta; respuesta inesperada desde vacaciones que tenga conclusión, no “estoy en la playa”.',
      'Pregunta sobre plata o prioridades del viaje; respuesta seca y graciosa, sin inventar compañía ni datos comerciales.',
      'Pregunta sobre por qué madrugó sin quejarse; respuesta breve que contraste vacaciones con rutina.',
      'Pregunta sobre cuántas historias piensa subir; respuesta exagerada y cómplice que cierre el chiste.',
      'Pregunta sobre qué necesitaba para cortar la semana; respuesta concreta ligada al mar o al viaje.',
      'Pregunta sobre si era realmente necesario viajar; respuesta seca que convierta la duda en remate.',
    ],
    '3e': [
      'Composición de ubicación mínima: destino verificado y lenguaje visual de geolocalización. Elegí vos emojis pertinentes; no calques una combinación anterior.',
      'Composición de bienvenida premium en una o dos líneas. Variá idioma, ritmo y emoji sin alterar el destino.',
      'Composición tropical: una banda breve de emojis elegida para esta pieza y el destino verificado. No repitas una banda usada recientemente.',
      'Composición jerárquica: ciudad protagonista y país o región verificada como segunda línea. Elegí un gesto visual distinto.',
      'Composición postal mínima: destino más un único emoji costero elegido según el tono del material.',
      'Composición de llegada: una microfrase de bienvenida o llegada y el destino; máximo dos líneas.',
      'Composición editorial bilingüe muy breve, siempre comprensible y con el destino real.',
      'Composición libre premium de ubicación: sólo destino, jerarquía y emojis; sin CTA ni adjetivos publicitarios.',
    ],
  }
  const materialRule = params.materialContext?.mentionPolicy === 'specific_allowed'
    ? `La colección permite mencionar únicamente esta experiencia específica: ${params.materialContext.verifiedSpecificName}.`
    : 'La colección no habilita una experiencia específica: mantené el copy en destino, playa o vacaciones generales.'
  return `=== DIRECCIÓN CARIBE PARA ESTA PIEZA ===
- ${directionByFamily[params.subfamilia][safeRotation(rotation, directionByFamily[params.subfamilia].length)]}
- ${materialRule}
- En Familia 3c escribí exactamente dos líneas: la primera instala una situación reconocible y la segunda la contradice o la revela.
- Un meme debe entenderse con el video oculto. La imagen puede potenciar el remate, nunca rescatar un texto sin contexto.
- No uses reacciones vacías como “yo a los cinco minutos en la playa”. Si aparece “yo”, tiene que hacer o decidir algo concreto.
- Prohibido introducir montaña por el perfil, profesión o antecedentes de las personas.`
}

export function caribbeanEmergencyCopy(params: {
  subfamilia: Exclude<VideoFamilia3Subfamilia, '3e'>
  rotationIndex?: number
  avoidCopies?: string[]
}): string {
  const pools: Record<Exclude<VideoFamilia3Subfamilia, '3e'>, readonly string[]> = {
    '3a': [
      'La vida también se mide en recuerdos que sí vivimos.',
      'Trabajaste sin mirar la hora. Viví sin mirar el reloj.',
      'El tiempo vuelve inolvidable lo que el dinero no puede medir.',
      'Ser joven también es animarse a hacer lugar para el viaje.',
      'Hay semanas que se olvidan. Este paisaje, no.',
      'Volver con recuerdos también es volver con algo.',
      'Descansar a veces es mirar otro horizonte.',
      'La agenda se llena sola. Los recuerdos hay que elegirlos.',
    ],
    '3b': [
      'POV: por fin el agua que necesitabas 🌊',
      'POV: el plan salió del chat y llegó al Caribe 🌴',
      'POV: este recuerdo ya se quedó con vos ✨',
      'POV: madrugar se siente distinto de vacaciones ☀️',
      'POV: las vacaciones dejaron de ser una fecha 🌴',
      'POV: cambiaste notificaciones por esta vista 🌊',
      'POV: hiciste lugar para algo que sí vas a recordar 🐚',
      'POV: por unos días, la única agenda es disfrutar ☀️',
    ],
    '3c': [
      'No tengo plata para cualquier cosa.\nPara viajar es otra cuenta 🤭',
      'A las 7 en casa: imposible.\nA las 7 de vacaciones: mirá qué energía ☀️',
      'Tenemos que ahorrar.\nTambién nosotros: cotizando otro viaje ✈️😂',
      'No voy a subir nada del viaje.\nPrimera mañana: 14 historias 😂',
      'Necesito agua.\nEl agua que necesito: 🌊',
      'Tengo ganas de hacer un plan.\nEl plan que necesito: 🌴',
      'Necesito despejar la mente.\nCómo necesito despejarla: 🌊',
      'Tengo antojo de algo.\nEl antojo: vacaciones 🐚',
      'Somos financieramente responsables.\nLa responsabilidad: reservar el viaje 😂',
      'Ellos: ¿con qué plata viajan?\nNosotros: prioridades 🤭',
    ],
    '3d': [
      '¿Dónde andás que no aparecés?\nDonde ando: de viaje 🌴',
      '¿Qué plan elegiste?\nEl mío: playa y nada más 🌊',
      '¿Por qué no contestás?\nMi señal ahora: el mar 🫠',
      '¿Con quién andás?\nYo: disfrutando el viaje 🤭',
      '¿Madrugaste sin quejarte?\nSí: pero de vacaciones ☀️',
      '¿Cuántas historias vas a subir?\nLas necesarias: todas 😂',
      '¿Qué necesitabas esta semana?\nEsto: mar y cero apuro 🌊',
      '¿Era necesario viajar?\nMi respuesta: absolutamente 🐚',
    ],
  }
  const pool = pools[params.subfamilia]
  const start = safeRotation(params.rotationIndex, pool.length)
  const recent = new Set((params.avoidCopies ?? []).map(comparable))
  for (let offset = 0; offset < pool.length; offset += 1) {
    const candidate = pool[(start + offset) % pool.length]
    if (!recent.has(comparable(candidate)) && !caribbeanCopyRepeatsNarrativePattern(candidate, params.avoidCopies ?? [])) return candidate
  }
  return pool[start]
}

export function caribbeanVideoCopyViolations(params: {
  salida: Salida
  subfamilia: VideoFamilia3Subfamilia
  copy: string
  rotationIndex?: number
  avoidCopies?: string[]
}): string[] {
  if (!isCaribbeanBeachSalida(params.salida)) return []
  const errors = caribbeanContextViolations(params.salida, params.copy)
  if (
    params.subfamilia !== '3e'
    && caribbeanCopyRepeatsNarrativePattern(params.copy, params.avoidCopies ?? [])
  ) {
    errors.push('la pieza repite un mecanismo narrativo usado en los últimos 15 videos, aunque cambie algunas palabras')
  }
  const emojiRequired = params.subfamilia === '3b'
    || params.subfamilia === '3c'
    || (params.subfamilia === '3d' && Math.abs(params.rotationIndex ?? 0) % 2 === 1)
    || params.subfamilia === '3e'
  if (emojiRequired && !EMOJI_PATTERN.test(params.copy)) {
    errors.push(`Familia ${params.subfamilia} requiere un emoji pertinente en esta rotación Caribe`)
  }
  if (params.subfamilia === '3e') {
    const composition = safeRotation(params.rotationIndex, 8)
    const tropicalEmojiCount = [...params.copy.matchAll(/\p{Extended_Pictographic}/gu)].length
    const country = params.salida.destino?.split(',').slice(1).join(',').trim()
    if (composition === 0 && !params.copy.includes('📍')) {
      errors.push('esta rotación de lugar requiere una composición de geolocalización con pin')
    }
    if (composition === 0 && country && !params.copy.toLocaleLowerCase('es-AR').includes(country.toLocaleLowerCase('es-AR'))) {
      errors.push('la composición con pin debe escribir también el país verificado, no sólo la ciudad')
    }
    if (composition === 1 && !/\b(?:welcome|bienvenid[oa]s?)\b/iu.test(params.copy)) {
      errors.push('esta rotación de lugar requiere una bienvenida breve, no otra composición con pin')
    }
    if (composition === 2 && tropicalEmojiCount < 2) {
      errors.push('esta rotación de lugar requiere una composición tropical con al menos dos emojis elegidos para la pieza')
    }
    if (composition === 3 && (!params.copy.includes('\n') || (country && !params.copy.toLocaleLowerCase('es-AR').includes(country.toLocaleLowerCase('es-AR'))))) {
      errors.push('esta rotación de lugar requiere jerarquía en dos líneas: ciudad y país o región verificada')
    }
  }
  if (params.subfamilia === '3d') {
    const [question = '', response = ''] = params.copy.split('\n')
    if (/\bplan\b/iu.test(question) && !/^(?:el plan|mi plan|el m[ií]o|plan|sali[oó]|termin[oó]|resultado)\s*:/iu.test(response.trim())) {
      errors.push('la respuesta debe resolver la pregunta sobre el plan; no puede cambiar de tema a dónde está la persona')
    }
    if (/\bd[oó]nde\b/iu.test(question) && !/^(?:donde|ac[aá]|yo)\s*:/iu.test(response.trim())) {
      errors.push('la respuesta debe resolver la pregunta de ubicación antes de hacer el remate')
    }
  }
  if (params.subfamilia === '3c') {
    const lines = params.copy.split('\n').map(line => line.trim()).filter(Boolean)
    if (lines.length !== 2) {
      errors.push('el meme Caribe debe tener exactamente dos líneas: situación y remate')
    }
    if (lines.length === 2 && lines.some(line => line.replace(EMOJI_PATTERN, '').trim().length < 4)) {
      errors.push('las dos líneas del meme deben aportar contexto verbal; el emoji no puede reemplazar el remate')
    }
    if (/\byo\s+a\s+los?\s+(?:\d+|cinco|diez)\s+minutos?\s+(?:en|de)\s+(?:la\s+)?playa\b/iu.test(params.copy)) {
      errors.push('el meme usa una reacción genérica sin acción ni conclusión concreta')
    }
    if (/\bdetox\s+digital\b/iu.test(params.copy)) {
      errors.push('el meme usa “detox digital”, una expresión menos directa que el tono conversado requerido')
    }
    if (/^cuando\b/iu.test(lines[0] ?? '') || /\byo\s+al\s+primer\s+d[ií]a\b/iu.test(lines[1] ?? '')) {
      errors.push('el meme queda como una frase colgada o usa una construcción poco natural en rioplatense')
    }
    const mechanism = safeRotation(params.rotationIndex, 10)
    const semanticAnchors: RegExp[] = [
      /\b(?:plata|dinero|sueldo|presupuesto|cuenta|pasaje)\b/iu,
      /\b(?:madrug|7\s*(?:a\.?\s*m\.?)?|ma[ñn]ana|despert)\b/iu,
      /\b(?:ahorr|amig|nosotros|grupo)\b/iu,
      /\b(?:public|subir|redes?|historias?|story)\b/iu,
      /\b(?:agua|mar|ola)\b/iu,
      /\bplan\b/iu,
      /\b(?:despej|mente|cabeza)\b/iu,
      /\b(?:antojo|ganas)\b/iu,
      /\b(?:responsab|financier|cotiz|presupuesto)\b/iu,
      /\b(?:ellos|pregunt|historias?|d[oó]nde|plata)\b/iu,
    ]
    if (!semanticAnchors[mechanism].test(params.copy)) {
      errors.push(`el meme se desvió del mecanismo editorial asignado para la rotación ${mechanism}`)
    }
  }
  return errors
}

export function caribbeanContextViolations(salida: Salida, text: string): string[] {
  if (!isCaribbeanBeachSalida(salida)) return []
  return isPureCaribbeanBeachSalida(salida) && MOUNTAIN_LANGUAGE_PATTERN.test(text)
    ? ['una salida de playa/Caribe no puede heredar lenguaje de montaña o trekking']
    : []
}
