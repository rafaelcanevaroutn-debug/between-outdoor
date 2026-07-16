export interface ConversationSlide {
  n_slide: number
  rol: string
  tipo?: string
  pill_text?: string | null
  texto_principal?: string | null
  texto_apoyo?: string | null
  indicacion_imagen?: string
  hablante?: string | null
}

export interface ConversationEditorInput {
  descripcion: string
  rawCta: string | null
  destino: string
  slides: ConversationSlide[]
  forbiddenLines?: string[]
  objetivo?: 'comentar' | 'guardar' | 'compartir' | 'convertir'
}

const CTA_PATTERN = /[¡!]?\s*coment[aá]\s+[^.!?\n]+\s+y\s+te\s+(?:pasamos|enviamos)\s+toda\s+la\s+info(?:rmaci[oó]n)?[.!]?/gi
const EXTRA_CTA_PATTERN = /envianos|escribinos|mandanos|link (?:de|en) la bio|te contamos todo|ped[ií] (?:la )?info|mensaje con la palabra/i
const COMMERCIAL_PATTERN = /\busd\b|\bprecio\b|\bcupos?\b|\bincluye\b|\balojamiento\b|\btransfer|\bseguro\b|\bkit\b|\breserv[aá]|\binscrib|para que te sumes|\bresetear\b|\b(?:una|\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+semanas?\b|\b(?:\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*d[ií]as?\b|\b(?:\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*noches?\b/i
const GENERIC_SPEAKER = /^(?:(?:un|una)\s+)?(?:amig[oa]|persona|viajer[oa]|cliente|gu[ií]a)\s*[a-z0-9]*$/i
const CLICHE_PATTERN = /[eé]pico|sin aliento|experiencia [uú]nica|paisajes? (?:incre[ií]bles?|impresionantes?)|viv[ií] una?|aventura (?:es|pura)|v(?:ol|uel)[a-záéíóú]* la cabeza|inmensidad|reinicia|recarg|reset|vor[aá]gine|preparate/i
const POETIC_PATTERN = /gigantes? de piedra|huir de (?:todo|la civilizaci[oó]n)|saludar a (?:la|los)|la monta[nñ]a te llama|el alma (?:lo )?pide|coraz[oó]n de la monta[nñ]a/i
const HEALTH_PROMISE_PATTERN = /curar|cura (?:la|el)|terapia|sanar|sana (?:la|el)|elimina (?:la ansiedad|el estr[eé]s)/i
const OVERDRAMATIC_PATTERN = /no doy m[aá]s|urgente|no aguanto m[aá]s|necesito escapar/i
const ADVERTISING_VOICE_PATTERN = /\bte espera\b|\bven[ií] a\b|\bsumate\b|\bdescubr[ií]\b|\bviv[ií] la\b|\bcomo nunca\b|\bpara arrancar el a[nñ]o distinto\b/i

function comparable(value: string): string {
  return value.toLocaleLowerCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function interactionCta(objetivo: ConversationEditorInput['objetivo'], canonical: string): string {
  if (objetivo === 'compartir') return 'Enviáselo a esa persona con la que harías este plan.'
  if (objetivo === 'guardar') return 'Guardalo para cuando necesites un plan así.'
  return canonical
}

function canonicalCta(_raw: string | null, destino: string): string {
  const keyword = destino.replace(/^(?:el|la|los|las)\s+/i, '').split(/[,–—-]/)[0].trim().toLocaleUpperCase('es-AR').replace(/\bCHALTEN\b/g, 'CHALTÉN')
  return `Comentá ${keyword || 'INFO'} y te pasamos toda la info.`
}

function shorten(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const shortened = clean.slice(0, max - 1).replace(/\s+\S*$/, '').trim()
  return `${shortened || clean.slice(0, max - 1)}…`
}

function cleanDescription(value: string, cta: string, destino: string): string {
  const sentences = value
    .replace(cta, '')
    .replace(CTA_PATTERN, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(sentence => sentence.replace(/\s+/g, ' ').replace(/\s+de la salida\.?$/i, '.').trim())
    .filter(sentence => sentence && !COMMERCIAL_PATTERN.test(sentence) && !CLICHE_PATTERN.test(sentence) && !POETIC_PATTERN.test(sentence) && !HEALTH_PROMISE_PATTERN.test(sentence) && !EXTRA_CTA_PATTERN.test(sentence) && !/¿qu[eé] incluye\??/i.test(sentence))
  let result = ''
  for (const sentence of sentences) {
    const candidate = `${result}${result ? ' ' : ''}${sentence}`
    if (candidate.length > 260) break
    result = candidate
  }
  return result || `Una pregunta de todos los días terminó en un plan para ${destino}.`
}

function isCommercialSlide(slide: ConversationSlide): boolean {
  const text = `${slide.texto_principal ?? ''} ${slide.texto_apoyo ?? ''}`
  return slide.tipo === 'ficha' || COMMERCIAL_PATTERN.test(text) || CTA_PATTERN.test(text)
}

export function editConversationContent(input: ConversationEditorInput): { descripcion: string; cta: string; slides: ConversationSlide[] } {
  if (input.slides.length < 2) throw new Error('Conversación necesita al menos 2 slides')
  const cta = canonicalCta(input.rawCta, input.destino)
  const nonCommercial = input.slides.filter(slide => !isCommercialSlide(slide))
  const selected = (nonCommercial.length >= 2 ? nonCommercial : input.slides.slice(0, 2)).slice(0, 4)

  const slides = selected.map((source, index) => {
    const slide = { ...source, n_slide: index + 1 }
    slide.pill_text = null
    slide.texto_apoyo = null
    if (slide.hablante && GENERIC_SPEAKER.test(slide.hablante.trim())) slide.hablante = null
    if (slide.tipo === 'foto') {
      slide.rol = 'foto'
      slide.texto_principal = null
    } else {
      slide.rol = 'desarrollo'
      slide.tipo = 'dialogo'
      const original = shorten(slide.texto_principal ?? '', 60)
      if (POETIC_PATTERN.test(original) || HEALTH_PROMISE_PATTERN.test(original) || OVERDRAMATIC_PATTERN.test(original) || ADVERTISING_VOICE_PATTERN.test(original) || CLICHE_PATTERN.test(original)) {
        throw new Error(`Conversación: slide ${index + 1} no suena a una charla cotidiana`)
      }
      slide.texto_principal = original
      if (!slide.texto_principal) throw new Error(`Conversación: slide ${index + 1} sin intervención`)
    }
    return slide
  })

  const lines = slides.flatMap(slide => slide.texto_principal ? [comparable(slide.texto_principal)] : [])
  if (new Set(lines).size !== lines.length) throw new Error('Conversación: hay intervenciones repetidas')
  const forbidden = (input.forbiddenLines ?? []).map(comparable).filter(Boolean)
  const repeated = lines.find(line => forbidden.some(previous => previous === line || (line.length >= 18 && (previous.includes(line) || line.includes(previous)))))
  if (repeated) throw new Error('Conversación: repite una intervención usada anteriormente')
  const ending = slides.at(-1)
  const endingReveal = comparable(`${ending?.texto_principal ?? ''} ${ending?.indicacion_imagen ?? ''}`)
  const destinationWords = comparable(input.destino).split(' ').filter(word => word.length >= 4)
  const hasOutdoorReveal = /montana|sendero|trekking|paisaje|grupo|fitz|cerro|laguna|glaciar|chalten/.test(endingReveal)
    || destinationWords.some(word => endingReveal.includes(word))
  if (!hasOutdoorReveal) throw new Error('Conversación: el último slide no revela el plan outdoor')

  const visibleCta = interactionCta(input.objetivo, cta)
  const interventions = slides.flatMap(slide => slide.texto_principal ? [slide.texto_principal] : [])
  let interventionIndex = 0
  const presentedSlides = slides.map((slide, index) => {
    const hasIntervention = Boolean(slide.texto_principal)
    if (hasIntervention) interventionIndex += 1
    const currentIndex = Math.max(0, interventionIndex - 1)
    const window = interventions.slice(Math.max(0, currentIndex - 1), currentIndex + 1)
    const transcript = window.map(line => `— ${line}`).join('\n')
    return {
      ...slide,
      rol: index === slides.length - 1 ? 'cierre' : 'desarrollo',
      hablante: 'CONVERSACIÓN',
      pill_text: null,
      texto_principal: transcript || (index === slides.length - 1 ? `— ${interventions.at(-1) ?? ''}` : null),
      texto_apoyo: index === slides.length - 1 ? visibleCta : null,
    }
  })

  const descriptionBody = cleanDescription(input.descripcion, cta, input.destino)
  return {
    descripcion: `${descriptionBody}\n\n${cta}`,
    cta,
    slides: presentedSlides,
  }
}
