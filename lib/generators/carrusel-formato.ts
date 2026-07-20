import type {
  ClientOnboarding,
  DiaItinerario,
  FormatoCarrusel,
  FuenteContenido,
  GeneratedAdaptiveCarrusel,
  Niche,
  ObjetivoInteraccion,
  PuntoInteres,
  Salida,
  SlideCarrusel,
} from '@/types'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import { contextToPromptBlock, loadCarruselContext } from '@/lib/knowledge/loader'
import { formatFechaSalida } from '@/lib/utils/dates'
import { editLugarContent } from '@/lib/generators/lugar-editor'
import { editConversationContent } from '@/lib/generators/conversacion-editor'
import {
  descriptionNeedsDirectedRewrite,
  editableDescriptionBody,
  finalizeDirectedDescription,
  mergeConversationEditorialReview,
  normalizeOrganicDraft,
} from '@/lib/generators/adaptive-format-normalizers'
import { groupItineraryDaysByLoad, type ItineraryGroup } from '@/lib/generators/itinerary-groups'
import { findForbiddenItineraryCopy, itineraryAngleMatchesCover } from '@/lib/generators/itinerary-copy-quality'
import {
  formatAdaptiveTextLimitError,
  LIMITS_BY_FORMAT,
  logAdaptiveTextLimitWarnings,
  resolveAdaptiveTextLimits,
  validateAdaptiveTextLimits,
} from '@/lib/generators/carrusel-text-limits'
import {
  SHARED_OPENING_RULES,
  SHARED_SPECIFICITY_RULES,
} from '@/lib/generators/carrusel-copy-rules'

type ImplementedAdaptiveFormat = 'organico' | 'conversacion' | 'itinerario' | 'ascenso' | 'calendario' | 'lugar'

const SYSTEM_OWNED_IMAGE_FORMATS = new Set<ImplementedAdaptiveFormat>([
  'organico',
  'itinerario',
  'calendario',
  'lugar',
])

const INTERNAL_ANGLE_FALLBACKS: Record<ImplementedAdaptiveFormat, string> = {
  organico: 'Estrategia interna: conectar una tensión cotidiana con la salida real.',
  conversacion: 'Estrategia interna: convertir una situación cotidiana en un plan compartido.',
  itinerario: 'Recorrido día por día con foco en los hitos documentados de la salida.',
  ascenso: 'Estrategia interna: narrar la salida pasada mediante hechos documentados.',
  calendario: 'Estrategia interna: volver útiles y guardables las próximas fechas.',
  lugar: 'Estrategia interna: descubrir el destino mediante puntos verificados.',
}

export interface HolidayInput {
  fecha: string
  nombre: string
  tipo?: string | null
  fuente?: string | null
}

interface GenerateAdaptiveCarruselParams {
  formato: ImplementedAdaptiveFormat
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  objetivo: ObjetivoInteraccion
  carpeta: string
  mesAnio: string
  tema?: string
  vozSlug?: string
  sourcePastSalida?: Salida | null
  sourcePastItineraryConfirmed?: boolean
  sourcePastChanges?: string | null
  futureRelatedSalida?: Salida | null
  futureSalidas?: Salida[]
  holidays?: HolidayInput[]
  imageFiles?: string[]
  avoidConversationLines?: string[]
  variantIndex?: number
  variantCount?: number
  avoidAngles?: string[]
}

interface RawAdaptiveResponse {
  angulo?: unknown
  descripcion_post?: unknown
  cta_comentario?: unknown
  slides?: unknown
}

const FORMAT_LIMITS: Record<ImplementedAdaptiveFormat, { min: number; max: number }> = {
  organico: { min: 5, max: 5 },
  conversacion: { min: 2, max: 5 },
  itinerario: { min: 3, max: 8 },
  ascenso: { min: 5, max: 5 },
  calendario: { min: 3, max: 5 },
  lugar: { min: 5, max: 5 },
}

const CONVERSATION_AXES = [
  'propuesta espontánea y cómplice entre amigos, pareja o familia; un plan simple que termina en aventura',
  'rutina, poco tiempo o un problema cotidiano tratado con ligereza, sin autoayuda ni dramatización',
  'una objeción real del público: compañía, nivel, experiencia, equipo o postergación; resolverla sin discurso comercial',
  'deseo aspiracional concreto y casual: mate, mochila, sendero, viaje o fin de semana; la imagen aporta la grandeza',
]

function assignedConversationAxis(p: GenerateAdaptiveCarruselParams): string | null {
  if (p.formato !== 'conversacion' || (p.variantCount ?? 1) <= 1) return null
  return CONVERSATION_AXES[((p.variantIndex ?? 1) - 1) % CONVERSATION_AXES.length]
}

function buildClientBlock(clientName: string, onboarding: ClientOnboarding | null): string {
  const lines = [`- Marca: ${clientName}`]
  if (onboarding?.avatar_edad_genero) lines.push(`- Público: ${onboarding.avatar_edad_genero}`)
  if (onboarding?.avatar_experiencia) lines.push(`- Experiencia del público: ${onboarding.avatar_experiencia}`)
  if (onboarding?.avatar_objeciones) lines.push(`- Objeciones reales: ${onboarding.avatar_objeciones}`)
  if (onboarding?.avatar_motor?.length) lines.push(`- Motivaciones: ${onboarding.avatar_motor.join(', ')}`)
  if (onboarding?.marca_personalidad) lines.push(`- Voz de marca: ${onboarding.marca_personalidad}`)
  if (onboarding?.marca_lineas_rojas) lines.push(`- Líneas rojas: ${onboarding.marca_lineas_rojas}`)
  if (onboarding?.embudo_paso) lines.push(`- Canal de conversión: ${onboarding.embudo_paso}`)
  return `=== PERFIL DEL CLIENTE ===\n${lines.join('\n')}`
}

function buildSalidaBlock(salida: Salida): string {
  const start = new Date(`${salida.fecha_inicio}T00:00:00Z`)
  const end = new Date(`${salida.fecha_fin}T00:00:00Z`)
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
  const lines = [
    `- Nombre: ${salida.nombre}`,
    `- Destino: ${salida.destino}`,
    `- Fecha: ${formatFechaSalida(salida.fecha_inicio, salida.fecha_fin)}`,
    `- Duración calendario exacta: ${durationDays} días (${Math.max(0, durationDays - 1)} noches si la salida incluye todas las noches intermedias)`,
    `- Nivel: ${salida.nivel}`,
    `- Cupos: ${salida.cupos}`,
    `- Precio: ${salida.moneda ?? 'USD'} ${salida.precio_usd}`,
  ]
  if (salida.que_incluye) lines.push(`- Incluye (dato exacto): ${salida.que_incluye}`)
  if (salida.link_inscripcion) lines.push(`- Inscripción: ${salida.link_inscripcion}`)
  lines.push(salida.punto_encuentro
    ? `- Punto de encuentro confirmado por el guía: ${salida.punto_encuentro}`
    : '- Punto de encuentro: NO CARGADO. No inferirlo desde el inicio de un sendero, una ubicación o un destino.')
  if (salida.hora_encuentro) lines.push(`- Hora de encuentro confirmada: ${salida.hora_encuentro}`)
  return `=== DATOS VERIFICADOS DE LA SALIDA ===\n${lines.join('\n')}`
}

function buildFormatTask(formato: ImplementedAdaptiveFormat): string {
  if (formato === 'organico') {
    return `=== TAREA ===
Generá UN carrusel orgánico de exactamente 5 slides.
- Slide 1: tipo "texto", rol "portada", una frase original; texto_apoyo null.
- El texto_principal de portada tiene un máximo de ${LIMITS_BY_FORMAT.organico.texto_principal} caracteres.
- Slide 2: tipo "ficha", rol "datos", nombre + fecha + UN dato clave.
- Cuando el dato sea cupos, significa capacidad total: nunca lo presentes como lugares restantes, urgencia o escasez. El sistema normalizará esta ficha con datos verificados.
- Slides 3 en adelante: tipo "foto", rol "foto", texto_principal null y texto_apoyo null.
- La descripción tiene un máximo de 650 caracteres: 2 a 4 líneas breves, un bloque compacto de datos reales y el CTA.
- Resumí qué incluye; no copies la lista completa ni redactes un folleto.
- cta_comentario contiene la frase canónica completa: "Comentá [PALABRA] y te enviamos toda la info."
- Esa misma frase debe cerrar literalmente descripcion_post.
- La frase inicial y la descripción deben compartir tono.
- Corregí tildes evidentes de nombres propios sin alterar la información.
- indicacion_imagen puede ser null: el sistema la asignará de forma determinística después de validar el copy.
- No copies ni parafrasees los ejemplos de la guía.`
  }

  if (formato === 'conversacion') return `=== TAREA ===
Generá únicamente el MICRODIÁLOGO de un carrusel conversación: 2 o 3 slides de diálogo.
- Antes de escribir, elegí UN disparador humano: propuesta espontánea, complicidad entre personas, rutina, problema cotidiano, objeción, bienestar o deseo aspiracional concreto.
- No conviertas rutina o salud mental en la fórmula por defecto. Una invitación sencilla y una respuesta cómplice también pueden sostener toda la pieza.
- Elegí una sola variante de la guía según la salida y el público.
- Cada slide contiene una sola intervención.
- Para diálogo: tipo "dialogo" y hablante breve cuando haga falta.
- No generes la revelación visual, la fecha ni el cierre: el sistema los agregará después con datos verificados.
- Prohibido usar tipo "ficha", slides de datos, precio, duración, inclusiones, cupos o cierre comercial.
- No inventes "Amigo A", "Amigo B" ni interlocutores genéricos. Usá hablante solo cuando la relación sea necesaria para el giro.
- La pieza debe funcionar como microdiálogo: situación cotidiana → respuesta inesperada → giro visual outdoor.
- Primero pensá 3 situaciones posibles. Descartá la más obvia y redactá solamente la más creíble. No muestres ese razonamiento.
- Cada respuesta debe contestar o reinterpretar concretamente la intervención anterior. Si las frases también funcionarían como títulos separados, no es una conversación.
- El destino no puede aparecer de golpe: debe responder a una pregunta o propuesta previa, o revelarse únicamente mediante la foto final.
- El giro no debe decir qué debería sentir el público ni resumir una moraleja. La imagen puede completar lo que el texto calla.
- El giro debe nombrar una acción concreta y hablada, no una metáfora turística.
- Prohibido "huir de la civilización", "gigantes de piedra", "la montaña te llama", "el alma lo pide" y poesía publicitaria equivalente.
- Bienestar no significa prometer cura, terapia ni transformación psicológica. Hablar de pausa, descanso, aire libre o desconexión cotidiana.
- La venta queda fuera del microdiálogo. La descripción es breve y termina con un único CTA.
- No uses frases comodín como "cambiar de aire", "arrancar distinto", "la montaña te espera" o "nos vemos en [destino]" como remate.
- Prohibido "volar la cabeza", "reset", "recargar energías", "inmensidad", "vorágine" y lenguaje de bienestar escrito por una marca.
- No copies ni parafrasees conversaciones observadas o ejemplos de la guía.`

  if (formato === 'itinerario') {
    const limits = LIMITS_BY_FORMAT.itinerario
    return `=== TAREA ===
Generá UN carrusel itinerario.
- Cantidad exacta: 1 portada + 1 slide por cada GRUPO ya calculado + 1 cierre; máximo ${FORMAT_LIMITS.itinerario.max} slides totales.
- Los grupos ya conservan todos los días en orden. No los combines, dividas, reordenes ni agregues etapas.
- Cada slide de recorrido usa rol "desarrollo", tipo "texto" y pill_text exactamente igual a la etiqueta del grupo.
- Si un grupo contiene más de un día, texto_principal y texto_apoyo deben representar todos sin omitir ninguno.
- Conservá en el slide los puntos PRINCIPALES y los datos técnicos indicados por el checklist. Los puntos secundarios van en descripcion_post.
- La actividad y los detalles deben salir exclusivamente del grupo correspondiente.
- La portada debe PARAR EL SCROLL: construí una frase con tensión, pregunta o contraste en la voz del cliente. No escribas un título descriptivo de folleto ni un simple resumen del producto.
- El destino y la duración pueden aparecer, pero el gancho manda sobre la descripción informativa.
- angulo es la estrategia interna y texto_principal de portada es el copy público: deben ser diferentes. Nunca copies el angulo como portada.
- El cierre usa datos reales de la salida.
- indicacion_imagen puede ser null: el sistema la asignará de forma determinística después de validar el copy.
- Prohibido afirmar urgencia, cupos restantes, cumbres o condiciones visuales no documentadas.
- cta_comentario contiene la frase completa: "Comentá [PALABRA] y te enviamos toda la info."
- El texto principal o de apoyo del slide final también debe contener literalmente ese CTA completo para que se renderice en la placa.
- Prohibido usar "único", "increíble", "inolvidable", "épico", "recargar energías" o "vale la pena", incluso con variaciones de género o número.
- Evitá también lugares comunes como "aventura pura", "volar la cabeza", "dejar sin aliento", "mochila llena de recuerdos", "como se debe" o "una nueva vos".
- Mostrá el lugar, la acción y el dato concreto; no los reemplaces por adjetivos promocionales.
- descripcion_post resume el itinerario, incorpora los puntos secundarios del checklist sin agregar actividades y termina con ese mismo CTA.

LÍMITES EXACTOS — son los mismos que aplica el validador:
- angulo: máximo ${limits.angulo} caracteres.
- pill_text: máximo ${limits.pill_text} caracteres y exactamente igual a la etiqueta calculada.
- texto_principal: máximo ${limits.texto_principal} caracteres.
- texto_apoyo: máximo ${limits.texto_apoyo} caracteres.
- descripcion_post: máximo ${limits.descripcion_post} caracteres.
- cta_comentario: máximo ${limits.cta_comentario} caracteres.`
  }

  if (formato === 'ascenso') {
    const limits = LIMITS_BY_FORMAT.ascenso
    return `=== TAREA ===
Generá UN carrusel ascenso basado en una salida que ya ocurrió.
- Estructura exacta: 1 portada + 3 momentos + 1 cierre (5 slides).
- Los momentos usan rol "desarrollo", tipo "texto", sin pill_text.
- Narrá en pasado y primera persona plural.
- Construí el arco inicio → avance o esfuerzo → momento principal → regreso usando solo hechos presentes en la fuente.
- No describas clima, emociones, accidentes, horarios ni escenas que no estén documentados.
- El itinerario solo puede narrarse como un hecho ocurrido cuando la confirmación humana lo autoriza.
- Si hay cambios declarados, tienen prioridad sobre el itinerario original.
- Si la única fuente es el itinerario confirmado, escribí un registro factual: acciones, recorridos y lugares. No inventes sensaciones, clima, dificultades vividas, logros grupales ni personificaciones.
- Prohibido "nos esperaba", "fue la recompensa", "nos abrazó", "nos regaló", "quedó para siempre" y equivalentes.
- El tercer momento debe cerrar cronológicamente la experiencia con las últimas actividades o el regreso documentado.
- El cierre puede vender la salida futura relacionada; si no existe, termina con CTA sin fecha.
- cta_comentario usa la frase completa: "Comentá [PALABRA] y te enviamos toda la info."
- El slide final y descripcion_post terminan con ese CTA completo.
- descripcion_post resume hechos del recorrido en 2 o 3 líneas; no usa nostalgia inventada ni tono de folleto.
- Cada texto_principal tiene un máximo de ${limits.texto_principal} caracteres.`
  }

  if (formato === 'calendario') return `=== TAREA ===
Generá UN carrusel calendario usando los grupos ya calculados por el sistema.
- Cantidad exacta: 1 portada + 1 slide por cada grupo + 1 cierre.
- No calcules fechas, no cambies meses y no agregues feriados.
- Cada grupo usa rol "datos", tipo "ficha" y pill_text igual a su etiqueta.
- texto_principal lista fecha y destino; texto_apoyo usa un único dato útil real.
- La descripción contiene una lista compacta de las fechas y un CTA.`

  const limits = LIMITS_BY_FORMAT.lugar
  return `=== TAREA ===
Generá UN carrusel lugar con 1 portada + 1 desarrollo por cada PUNTO SELECCIONADO + 1 cierre.
- Conservá exactamente el orden y la cantidad de puntos seleccionados.
- Cada desarrollo usa rol "desarrollo", tipo "texto" y pill_text exactamente igual a etiqueta.
- Cada desarrollo representa únicamente su punto; no mezcles información entre lugares.
- Repetí los nombres geográficos necesarios. Nunca reemplaces un nombre propio por "homónimo", "el mismo", "este lugar" o fórmulas ambiguas.
- indicacion_imagen puede ser null: el sistema la asignará de forma determinística después de validar el copy.
- texto_principal: una sola frase de hasta ${limits.texto_principal} caracteres. Sin introducciones ni remates emocionales.
- texto_apoyo: una sola línea compacta de hasta 90 caracteres con los datos técnicos más útiles.
- Conservá distancia, duración y dificultad cuando estén disponibles, sin cambiar cifras ni alcance.
- No amplíes "vista", "accesible" o "cercano" como tocar, llegar al hielo o realizar una actividad no documentada.
- Prohibido inventar colores, témpanos, clima, momento del día, escenas, superlativos o características visuales.
- La salida comercial aparece únicamente en el cierre y en una sola línea final de la descripción.
- La descripción tiene un máximo de 750 caracteres. No copies todo lo incluido, precio ni cupos: destino, puntos mostrados, fecha y CTA alcanzan.
- El cierre contiene solo una conexión breve con la salida, fecha exacta y CTA. No uses urgencia ni lenguaje de venta.
- El cierre y la descripción no pueden prometer cumbres, ascensos, escalada ni ninguna actividad que no figure como acción en los datos de la salida. Una cumbre mencionada como paisaje no documenta un ascenso.
- Si la fecha cruza de año, escribí ambos años explícitamente.
- cta_comentario contiene la frase completa: "Comentá [PALABRA] y te enviamos toda la información."
- La descripción contiene el CTA una sola vez, al final, y el slide final también lo incluye literalmente.
- Evitá clichés como "imperdible", "experiencia única", "volar la cabeza", "sin matarte", "ahí cerquita", "destino mágico", "joya escondida", "te desarma la cabeza" o "cada paso es una historia".
- No uses superlativos como "el más accesible", "las mejores vistas" o "el más icónico" salvo que la fuente los verifique expresamente.
- No llames "amigos" al grupo si ese vínculo no está documentado.
- Los ejemplos de la guía no son títulos reutilizables.`
}

interface CalendarGroup {
  key: string
  label: string
  salidas: Array<{ nombre: string; destino: string; fecha_inicio: string; fecha_fin: string; cupos: number }>
  feriados: Array<{ fecha: string; nombre: string }>
}

interface ItineraryRequirement {
  label: string
  primaryPoints: string[]
  secondaryPoints: string[]
  technicalFacts: string[]
  technicalFactLabels: string[]
}

interface LugarPoint {
  etiqueta: string
  punto: PuntoInteres
}

function buildLugarPoints(salida: Salida): LugarPoint[] {
  return (salida.puntos_interes ?? [])
    .filter(point => Boolean(point.fuente))
    .slice(0, 3)
    .map(point => ({ etiqueta: point.nombre.replace(/^Sendero\s+/i, '').trim(), punto: point }))
}

function uniqueTexts(values: string[]): string[] {
  const seen = new Set<string>()
  return values.filter(value => {
    const key = normalizeFactTokens(value).join(' ')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function pointIsCovered(point: string, selected: string[]): boolean {
  const pointTokens = normalizeFactTokens(point)
  return selected.some(candidate => {
    const candidateTokens = normalizeFactTokens(candidate)
    return pointTokens.length > 0
      && candidateTokens.length > 0
      && pointTokens.every(token => candidateTokens.includes(token))
      && candidateTokens.every(token => pointTokens.includes(token))
  })
}

function extractNamedRoutePointsFromText(source: string): string[] {
  const matches = source.match(/\b(?:Laguna|Glaciar|Lago|Río|Sendero|Cascada|Chorrillo|Mirador(?:es)?|Fitz Roy)\b[^.,;()\-–\n]*/gu) ?? []
  return uniqueTexts(matches.map(match => match.trim()).filter(Boolean))
}

function extractPrimaryPoints(day: DiaItinerario): string[] {
  const titlePoint = extractNamedRoutePointsFromText(day.titulo)[0]
  const hitoPoints = extractNamedRoutePointsFromText(day.hito ?? '')
  const declared = uniqueTexts([...(titlePoint ? [titlePoint] : []), ...hitoPoints]).slice(0, 2)
  if (declared.length > 0) return declared
  const descriptionPoint = extractNamedRoutePointsFromText(day.descripcion)[0]
  return descriptionPoint ? [descriptionPoint] : []
}

function extractTechnicalFactLabels(group: ItineraryGroup): string[] {
  const source = group.dias.map(day => `${day.descripcion} ${day.hito ?? ''}`).join(' ')
  const measurements = (source.match(/\b\d+(?:[.,]\d+)?\s*(?:km|kilómetros?|m|metros?)\b/gi) ?? [])
    .map(value => value
      .replace(/kilómetros?/i, 'km')
      .replace(/metros?/i, 'm')
      .replace(/\s+/g, ' ')
      .trim())
  const difficulties = source.match(/\bdificultad\s+(?:baja|media|alta)\b/gi) ?? []
  return uniqueTexts([...measurements, ...difficulties])
}

function buildItineraryGroups(days: DiaItinerario[]): ItineraryGroup[] {
  const maxDevelopmentSlides = FORMAT_LIMITS.itinerario.max - 2
  return groupItineraryDaysByLoad(days, maxDevelopmentSlides, day => {
    const singleDayGroup: ItineraryGroup = { label: `DÍA ${day.numero}`, dias: [day] }
    return {
      requiredItems: extractPrimaryPoints(day).length + extractTechnicalFactLabels(singleDayGroup).length,
      textLength: day.titulo.length + day.descripcion.length + (day.hito?.length ?? 0),
    }
  })
}

function buildItineraryRequirements(groups: ItineraryGroup[]): ItineraryRequirement[] {
  return groups.map(group => {
    const allPoints = extractNamedRoutePoints(group)
    const primaryPoints = uniqueTexts(group.dias.flatMap(extractPrimaryPoints))
    return {
      label: group.label,
      primaryPoints,
      secondaryPoints: allPoints.filter(point => !pointIsCovered(point, primaryPoints)),
      technicalFacts: extractTechnicalFacts(group),
      technicalFactLabels: extractTechnicalFactLabels(group),
    }
  })
}

function buildItineraryChecklist(groups: ItineraryGroup[]): string {
  const requirements = buildItineraryRequirements(groups)
  const lines = requirements.flatMap(requirement => [
    requirement.label,
    `- SLIDE · puntos principales obligatorios: ${requirement.primaryPoints.join('; ') || 'ninguno'}`,
    `- SLIDE · datos técnicos obligatorios: ${requirement.technicalFactLabels.join('; ') || 'ninguno'}`,
    `- DESCRIPCION_POST · puntos secundarios obligatorios: ${requirement.secondaryPoints.join('; ') || 'ninguno'}`,
  ])
  return `=== CHECKLIST EXPLÍCITO QUE SE VALIDARÁ ===
Los slides enganchan con lo principal; descripcion_post conserva el detalle secundario.
${lines.join('\n')}`
}

function buildCalendarGroups(salidas: Salida[], holidays: HolidayInput[]): CalendarGroup[] {
  const groups = new Map<string, CalendarGroup>()
  for (const salida of salidas) {
    const key = salida.fecha_inicio.slice(0, 7)
    const monthDate = new Date(`${key}-01T12:00:00`)
    const label = monthDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase()
    const group = groups.get(key) ?? { key, label, salidas: [], feriados: [] }
    group.salidas.push({
      nombre: salida.nombre,
      destino: salida.destino,
      fecha_inicio: salida.fecha_inicio,
      fecha_fin: salida.fecha_fin,
      cupos: salida.cupos,
    })
    groups.set(key, group)
  }

  for (const group of groups.values()) {
    group.feriados = holidays
      .filter(holiday => group.salidas.some(salida => holiday.fecha >= salida.fecha_inicio && holiday.fecha <= salida.fecha_fin))
      .map(holiday => ({ fecha: holiday.fecha, nombre: holiday.nombre }))
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(0, 3)
}

function buildSequentialSources(p: GenerateAdaptiveCarruselParams): string {
  if (p.formato === 'itinerario') {
    const groups = buildItineraryGroups(p.salida.itinerario_dias ?? [])
    return `=== GRUPOS DE ITINERARIO CALCULADOS — FUENTE ÚNICA PARA LOS SLIDES ===
${JSON.stringify(groups, null, 2)}

${buildItineraryChecklist(groups)}`
  }
  if (p.formato === 'ascenso') {
    return `=== SALIDA PASADA — FUENTE DEL RELATO ===
${p.sourcePastSalida ? buildSalidaBlock(p.sourcePastSalida) : 'No disponible'}
Confirmación humana de que se realizó según el itinerario: ${p.sourcePastItineraryConfirmed ? 'SÍ' : 'NO'}
Cambios o momento destacado declarado por el cliente: ${p.sourcePastChanges?.trim() || 'Ninguno informado'}
Itinerario general: ${p.sourcePastSalida?.itinerario ?? '—'}
Etapas estructuradas:
${JSON.stringify(p.sourcePastSalida?.itinerario_dias ?? [], null, 2)}

Usá el itinerario en pasado únicamente si la confirmación humana dice SÍ. No conviertas una actividad planificada en un logro, cumbre o resultado que el itinerario no documenta.

=== SALIDA FUTURA — SOLO PARA EL CIERRE ===
${p.futureRelatedSalida ? buildSalidaBlock(p.futureRelatedSalida) : 'No hay salida futura relacionada.'}`
  }
  if (p.formato === 'calendario') {
    return `=== GRUPOS DE FECHAS CALCULADOS POR EL SISTEMA ===
${JSON.stringify(buildCalendarGroups(p.futureSalidas ?? [], p.holidays ?? []), null, 2)}`
  }
  if (p.formato === 'lugar') {
    return `=== PUNTOS SELECCIONADOS Y VERIFICADOS — ÚNICA FUENTE GEOGRÁFICA ===
${JSON.stringify(buildLugarPoints(p.salida), null, 2)}`
  }
  return ''
}

function buildPrompt(p: GenerateAdaptiveCarruselParams, correction?: string): string {
  const context = loadCarruselContext({
    niche: p.niche,
    tema: p.tema ?? (p.formato === 'organico' ? 'motivacion' : 'destinos'),
    formatoCarrusel: p.formato,
    vozSlug: p.vozSlug,
  })

  const conversationAxis = assignedConversationAxis(p)

  return `${contextToPromptBlock(context, true)}

${buildClientBlock(p.clientName, p.clientOnboarding)}

${buildSalidaBlock(p.salida)}

${buildSequentialSources(p)}

=== OBJETIVO PRINCIPAL ===
${p.objetivo}

${p.variantCount && p.variantCount > 1 ? `=== VARIANTE ${p.variantIndex ?? 1} DE ${p.variantCount} ===
Esta pieza debe tener un ángulo y una apertura claramente distintos de las otras variantes del mismo disparo.
${p.avoidAngles?.length ? `Ángulos ya utilizados — no repetir ni parafrasear:\n${p.avoidAngles.map(angle => `- ${angle}`).join('\n')}` : 'Es la primera variante del lote.'}` : ''}
${conversationAxis ? `EJE HUMANO ASIGNADO A ESTA VARIANTE: ${conversationAxis}. No lo cambies ni lo reemplaces durante la revisión.` : ''}

=== MATERIAL VISUAL ===
Carpeta seleccionada: ${p.carpeta}

${buildFormatTask(p.formato)}

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

=== REGLAS DE VERACIDAD Y RAZONAMIENTO ===
- Razoná desde los datos, la voz, el público y las imágenes disponibles.
- Los ejemplos de las guías explican mecanismos; nunca deben aparecer copiados ni apenas reformulados.
- No inventes testimonios, escenas ocurridas, prestaciones, precios, fechas ni características del destino.
- La ubicación o inicio de un sendero NO es el punto de encuentro de la salida. Solo podés mencionar dónde se encuentra el grupo, desde dónde sale el transporte o dónde arranca la salida si "Punto de encuentro confirmado por el guía" contiene ese dato.
- Nunca conviertas ubicacion de un punto de interés en logística comercial de la salida.
- Cada indicacion_imagen describe la función visual, sin afirmar que una foto específica existe.
- Elegí un único CTA coherente con el objetivo principal.
${correction ? `\n=== CORRECCIÓN DEL INTENTO ANTERIOR ===\n${correction}\nRehacé la respuesta completa.` : ''}

Respondé ÚNICAMENTE con JSON válido:
{
  "angulo": "idea central específica",
  "descripcion_post": "descripción completa lista para publicar",
  "cta_comentario": "CTA si corresponde o null",
  "slides": [
    {
      "n_slide": 1,
      "rol": "portada|desarrollo|datos|foto|cierre",
      "tipo": "texto|foto|dialogo|ficha",
      "pill_text": null,
      "texto_principal": "texto o null",
      "texto_apoyo": "texto o null",
      "indicacion_imagen": "función de la imagen",
      "hablante": "hablante o null"
    }
  ]
}`
}

function buildLugarEditorialReviewPrompt(p: GenerateAdaptiveCarruselParams, draft: string): string {
  return `Actuá como editor senior de contenido orgánico de turismo de montaña.

Reescribí el borrador completo como un CARRUSEL LUGAR de exactamente 5 slides:
1 portada + 3 lugares + 1 cierre.

OBJETIVO EDITORIAL
- El destino y la utilidad son protagonistas; no escribas un folleto.
- Portada y desarrollos sin venta. La salida aparece solo en el cierre y al final de la descripción.
- texto_principal de cada desarrollo: una frase concreta de hasta ${LIMITS_BY_FORMAT.lugar.texto_principal} caracteres.
- texto_apoyo: una línea técnica breve. No inventes ni alteres datos.
- Evitá clichés, superlativos, urgencia, sensaciones inventadas y frases intercambiables.
- No copies ejemplos ni reemplaces nombres geográficos por "homónimo".
- El cierre y la descripción no prometen cumbres, ascensos, escalada ni actividades ausentes de la salida. Una cumbre usada como paisaje no prueba un ascenso.
- La descripción contiene un único CTA y está ubicado al final.

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

DATOS PROTEGIDOS — NO REINTERPRETAR
${buildSalidaBlock(p.salida)}
${buildSequentialSources(p)}

BORRADOR A EDITAR
${draft}

Conservá el mismo esquema JSON del borrador. Respondé ÚNICAMENTE JSON válido. La revisión posterior colocará de forma determinista etiquetas, datos técnicos, fecha y CTA.`
}

function buildConversationEditorialReviewPrompt(p: GenerateAdaptiveCarruselParams, draft: string): string {
  const avoidBlock = p.avoidConversationLines?.length
    ? `\nINTERVENCIONES YA USADAS — NO REPETIR NI PARAFRASEAR\n${p.avoidConversationLines.map(line => `- ${line}`).join('\n')}\n`
    : ''
  return `Actuá como editor de microcontenido compartible para Instagram y TikTok.

EJE OBLIGATORIO DE ESTA VARIANTE
${assignedConversationAxis(p) ?? 'Elegí el disparador más natural para la salida y el público.'}
No cambies este eje por otro durante la edición.

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

Reescribí únicamente el MICRODIÁLOGO del CARRUSEL CONVERSACIÓN:
- Entregá exactamente 2 o 3 slides, todos de tipo "dialogo" y rol "desarrollo".
- No generes portada, revelación visual, slide de foto, fecha, ficha ni cierre: el sistema los agrega después de forma determinista.
- Elegí UN disparador real: propuesta espontánea, complicidad, rutina, problema cotidiano, objeción, bienestar o deseo de compartir un plan.
- Priorizá una charla casual cuando alcance. No fuerces cansancio, terapia ni una transformación emocional para justificar la montaña.
- Una situación cotidiana reconocible, una respuesta breve y un giro concreto hacia ${p.salida.nombre || p.salida.destino}.
- La conversación tiene que poder ocurrir de verdad entre personas concretas. Una frase debe provocar la siguiente; no armes una sucesión de slogans.
- Aplicá una prueba de continuidad: leé cada intervención como respuesta directa a la anterior. Si no contesta, contradice o reinterpreta lo dicho, reescribila.
- La última intervención debe cerrar una idea completa y preparar una revelación visual del destino. No puede quedar suspendida con puntos suspensivos ni depender de texto que el sistema agregue después.
- El slide de revelación debe poder responder visualmente a esa última frase. Funcionan propuestas concretas como caminar, hacer un trekking o cambiar el plan del fin de semana; no funcionan abstracciones como "otra postal", "algo distinto" o "cortar por lo sano".
- Preferí no nombrar el destino dentro del diálogo: el sistema lo revela en el slide siguiente. Solo nombralo si resulta indispensable para que la respuesta suene natural.
- Antes de responder, evaluá internamente tres ideas distintas y elegí la menos predecible que siga siendo natural. Entregá solo la elegida.
- Cada intervención debe sonar hablada y tener entre 3 y 12 palabras.
- No expliques el remate.
- No uses fichas, precio, duración, inclusiones, cupos, urgencia ni cierre comercial.
- No inventes "Amigo A/B". El hablante solo existe si su relación aporta al giro.
- Escribí como hablan dos personas argentinas, sin frases de marca ni solemnidad.
- Prohibido usar metáforas como "gigantes de piedra", "huir de la civilización", "la montaña te llama", "el alma lo pide" o equivalentes.
- No prometas curar ansiedad, estrés o salud mental. La salida puede representar pausa, descanso, aire libre o cambio de rutina.
- La descripción no repite el diálogo ni vende como folleto; usa una o dos frases sencillas y termina con un solo CTA.
- No pongas en la descripción slogans, ficha técnica, nivel, inclusiones, falsa urgencia ni afirmaciones sobre integrantes del grupo.
- El destino debe ser necesario para el remate, no intercambiable por cualquier viaje.
- Evitá remates comodín: "cambiar de aire", "arrancar distinto", "nos vemos en...", "te espera" y cualquier moraleja de marca.
- No uses "volar la cabeza", "reset", "recargar energías", "inmensidad", "vorágine", "sacudón" ni falsos mensajes inspiracionales.
- No inventes que alguien ya compró un pasaje, reservó, sacó un lugar o confirmó una actividad.
- No inventes composición ni disponibilidad del grupo: prohibido "nos falta uno", "el grupo ya está listo", "queda un lugar" o equivalentes.
- Si la objeción es no tener compañía, resolvela únicamente con el carácter grupal confirmado de la experiencia, sin simular una charla privada ni afirmar cuántas personas hay.
- No menciones cima ni cumbre: esta salida propone senderos y paisajes, no un ascenso confirmado.
- No uses superlativos como "la mejor vista", "el mejor lugar" o "la aventura más épica".
- No escribas "¿Che...?": en habla natural, "Che" va antes de la pregunta ("Che, ¿...?").
- Prohibido "caminar picos", "modo piloto automático", "cambiar el chip", "buscar la tranquilidad" y expresiones fabricadas equivalentes.
- Prohibido "la rutina me está gastando", "otra postal", "cortar por lo sano" y finales gramaticalmente incompletos.
- Preferí objetos, acciones y decisiones concretas: mate, mochila, caminar, viajar, elegir fecha, invitar a alguien.
- No copies ni parafrasees literalmente los ejemplos de referencia.
${avoidBlock}

SALIDA REAL
${buildSalidaBlock(p.salida)}

PÚBLICO, OBJECIONES Y MOTIVACIONES
${buildClientBlock(p.clientName, p.clientOnboarding)}

BORRADOR A CORREGIR
${draft}

Devolvé ÚNICAMENTE JSON válido con una sola clave, "slides", y exactamente 2 o 3 objetos de microdiálogo. El sistema preservará angulo, descripcion_post y cta_comentario del borrador original.`
}

function buildAscensoEditorialReviewPrompt(p: GenerateAdaptiveCarruselParams, draft: string): string {
  return `Actuá como editor factual de un carrusel que recuerda una salida real ya realizada.

FUENTE PASADA CONFIRMADA
${buildSequentialSources(p)}

REGLAS OBLIGATORIAS
- Conservá exactamente 5 slides: portada, 3 desarrollos cronológicos y cierre.
- Portada: el destino y la fecha pasada pueden aparecer, pero no como mero rótulo; el gancho debe dominar.
- Los desarrollos están en pasado y primera persona plural, sin pill_text.
- Convertí exclusivamente acciones y lugares del itinerario confirmado en hechos ocurridos.
- No inventes emociones, clima, horarios, escenas, vistas, dificultades vividas, resultados grupales ni cumbres.
- Prohibido personificar: "nos esperaba", "nos abrazó", "nos regaló", "nos recordó" o equivalentes.
- Prohibido interpretar: "fue la recompensa", "valió cada paso", "quedó para siempre" o equivalentes.
- El tercer desarrollo debe representar las últimas actividades o el regreso documentado, no otro momento intermedio.
- Una frase concreta por desarrollo, máximo ${LIMITS_BY_FORMAT.ascenso.texto_principal} caracteres.
- La descripción resume el recorrido sin nostalgia inventada ni folleto.
- Usá exactamente este CTA: "Comentá ${ctaKeyword(p.salida.destino)} y te enviamos toda la info."
- El cierre y la descripción deben contener literalmente ese CTA completo.
- La salida futura se menciona únicamente en el cierre y la descripción, con sus fechas exactas.

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

BORRADOR A CORREGIR
${draft}

Conservá el esquema JSON y respondé ÚNICAMENTE JSON válido.`
}

function extractJson(text: string): RawAdaptiveResponse {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('La respuesta no contiene JSON')
  return JSON.parse(cleaned.slice(start, end + 1)) as RawAdaptiveResponse
}

function nullableText(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim().replace(/\bCHALTEN\b/g, 'CHALTÉN').replace(/\bChalten\b/g, 'Chaltén').replace(/\bchalten\b/g, 'chaltén')
}

function ctaKeyword(destino: string): string {
  return destino
    .trim()
    .replace(/^(?:el|la|los|las)\s+/i, '')
    .split(/[,–—-]/)[0]
    .trim()
    .toLocaleUpperCase('es-AR')
    .replace(/\bCHALTEN\b/g, 'CHALTÉN') || 'INFO'
}

function normalizeAscensoRaw(raw: RawAdaptiveResponse, p: GenerateAdaptiveCarruselParams): RawAdaptiveResponse {
  const destinationName = nullableText(p.sourcePastSalida?.nombre) || nullableText(p.salida.nombre) || p.salida.destino
  const displayDestination = destinationName.trim().replace(/\bChalten\b/g, 'Chaltén')
  const cta = `Comentá ${ctaKeyword(displayDestination)} y te enviamos toda la info.`
  const futureLine = p.futureRelatedSalida
    ? `Próxima salida: ${formatFechaSalida(p.futureRelatedSalida.fecha_inicio, p.futureRelatedSalida.fecha_fin)}.`
    : null
  const slides = Array.isArray(raw.slides)
    ? raw.slides.map(item => item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : item)
    : raw.slides

  if (Array.isArray(slides)) {
    slides.forEach((item, index) => {
      if (!item || typeof item !== 'object') return
      const slide = item as Record<string, unknown>
      if (!nullableText(slide.texto_principal) && nullableText(slide.texto_apoyo)) {
        slide.texto_principal = nullableText(slide.texto_apoyo)
        slide.texto_apoyo = null
      }
      if (index === slides.length - 1) {
        slide.texto_principal = p.futureRelatedSalida ? `Próxima salida a ${displayDestination}` : `Más historias en ${displayDestination}`
        slide.texto_apoyo = futureLine ? `${futureLine}\n${cta}` : cta
      }
    })
  }

  return {
    ...raw,
    descripcion_post: `Así fue nuestra salida a ${displayDestination}.${futureLine ? `\n${futureLine}` : ''}\n\n${cta}`,
    cta_comentario: cta,
    slides,
  }
}

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function compactDateRange(start: string, end: string): string {
  const [startYear, startMonth, startDay] = start.split('-').map(Number)
  const [endYear, endMonth, endDay] = end.split('-').map(Number)
  if (start === end) return `${startDay} ${SHORT_MONTHS[startMonth - 1]} ${startYear}`
  if (startYear === endYear && startMonth === endMonth) return `${startDay} al ${endDay} ${SHORT_MONTHS[startMonth - 1]} ${startYear}`
  if (startYear === endYear) return `${startDay} ${SHORT_MONTHS[startMonth - 1]} al ${endDay} ${SHORT_MONTHS[endMonth - 1]} ${startYear}`
  return `${startDay} ${SHORT_MONTHS[startMonth - 1]} ${startYear} al ${endDay} ${SHORT_MONTHS[endMonth - 1]} ${endYear}`
}

function displayHolidayName(name: string): string {
  if (/d[ií]a no laborable.*(?:tur[ií]stic|fines tur)/i.test(name)) return 'Día turístico'
  return name.trim()
}

function normalizeCalendarRaw(raw: RawAdaptiveResponse, p: GenerateAdaptiveCarruselParams): RawAdaptiveResponse {
  const groups = buildCalendarGroups(p.futureSalidas ?? [], p.holidays ?? [])
  const allSalidas = groups.flatMap(group => group.salidas)
  const keyword = allSalidas.length === 1 ? ctaKeyword(allSalidas[0].nombre || allSalidas[0].destino) : 'FECHAS'
  const cta = `Comentá ${keyword} y te enviamos toda la info.`
  const hasHolidays = groups.some(group => group.feriados.length > 0)
  const hasTouristDay = groups.some(group => group.feriados.some(item => /tur[ií]stic|fines tur/i.test(item.nombre)))
  const period = groups.length === 1 ? groups[0].label.toLocaleLowerCase('es-AR') : 'las próximas fechas'
  const fallbackCover = hasTouristDay ? `Fin de semana largo: ${period}` : hasHolidays ? `Feriados y salidas: ${period}` : `Próximas salidas: ${period}`
  const rawSlides = Array.isArray(raw.slides) ? raw.slides : []
  const rawCover = rawSlides.find(item => item && typeof item === 'object' && (item as Record<string, unknown>).rol === 'portada')
    ?? rawSlides[0]
  const cover = rawCover && typeof rawCover === 'object'
    ? nullableText((rawCover as Record<string, unknown>).texto_principal) ?? fallbackCover
    : fallbackCover
  const slides: Record<string, unknown>[] = [
    {
      n_slide: 1,
      rol: 'portada',
      tipo: 'texto',
      pill_text: null,
      texto_principal: cover,
      texto_apoyo: null,
      indicacion_imagen: 'Usar una imagen general de temporada o calendario, sin atribuir un lugar específico.',
      hablante: null,
    },
  ]

  groups.forEach((group, index) => {
    const lines = group.salidas.map(salida => `${compactDateRange(salida.fecha_inicio, salida.fecha_fin)} — ${(salida.nombre || salida.destino).trim().replace(/\bChalten\b/g, 'Chaltén')}`)
    const holidayLine = group.feriados.length > 0 ? group.feriados.map(item => displayHolidayName(item.nombre)).join(' + ') : null
    slides.push({
      n_slide: index + 2,
      rol: 'datos',
      tipo: 'ficha',
      pill_text: group.label,
      texto_principal: lines.join('\n'),
      texto_apoyo: holidayLine,
      indicacion_imagen: `Usar una imagen general asociable a ${group.salidas.map(item => item.nombre || item.destino).join(' / ')} sin inventar escenas ni condiciones.`,
      hablante: null,
    })
  })

  slides.push({
    n_slide: slides.length + 1,
    rol: 'cierre',
    tipo: 'texto',
    pill_text: null,
    texto_principal: 'Guardá este calendario para organizar tu próxima salida.',
    texto_apoyo: cta,
    indicacion_imagen: 'Usar una imagen general de cierre que mantenga legibles la fecha y el CTA.',
    hablante: null,
  })

  const descriptionLines = allSalidas.map(salida => `${compactDateRange(salida.fecha_inicio, salida.fecha_fin)} — ${(salida.nombre || salida.destino).trim().replace(/\bChalten\b/g, 'Chaltén')}`)
  const holidayLines = groups.flatMap(group => group.feriados.map(item => `${compactDateRange(item.fecha, item.fecha)} — ${displayHolidayName(item.nombre)}`))
  return {
    ...raw,
    angulo: nullableText(raw.angulo) ?? (hasHolidays ? 'Fechas especiales vinculadas con próximas salidas.' : 'Próximas fechas disponibles organizadas en un calendario.'),
    descripcion_post: `${[...holidayLines, ...descriptionLines].join('\n')}\n\n${cta}`,
    cta_comentario: cta,
    slides,
  }
}

function buildOrganicImageInstructions(salida: Salida, count: number): string[] {
  const destino = nullableText(salida.nombre) ?? nullableText(salida.destino) ?? 'el destino'
  const pool = [
    `Seleccionar de la carpeta la imagen más reconocible de ${destino}; priorizar plano abierto, buena lectura del paisaje y un sujeto pequeño o ausente.`,
    'Seleccionar una foto real del grupo durante la experiencia; priorizar interacción espontánea y evitar poses publicitarias.',
    'Seleccionar un plano abierto distinto al de portada que muestre escala y profundidad del recorrido real.',
    'Seleccionar una foto real con personas en movimiento; priorizar una acción legible dentro del recorrido.',
    'Seleccionar un detalle auténtico disponible en la carpeta que aporte textura y variedad sin identificar elementos no verificados.',
    'Seleccionar una toma de cierre real con sensación de llegada, descanso o contemplación; evitar repetir encuadres anteriores.',
    'Seleccionar la mejor imagen restante que amplíe la variedad visual del carrusel sin repetir sujeto ni escala.',
    'Seleccionar una última imagen real de la carpeta que funcione como cierre visual y mantenga coherencia con la portada.',
  ]
  return pool.slice(0, count)
}

function buildItineraryImageInstructions(salida: Salida, groups: ItineraryGroup[]): string[] {
  const destino = nullableText(salida.nombre) ?? nullableText(salida.destino) ?? 'el destino'
  return [
    `Seleccionar de la carpeta la imagen real más reconocible de ${destino}; priorizar plano abierto y lectura clara del destino.`,
    ...groups.map(group => {
      const activities = group.dias.map(day => day.titulo).join(' / ')
      return `Seleccionar una foto real asociable a ${group.label} (${activities}); no exigir clima, accidente geográfico, cumbre ni escena que no pueda comprobarse en la carpeta.`
    }),
    'Seleccionar una foto real de cierre, preferentemente del grupo o de un momento de llegada; evitar afirmar una cumbre si el itinerario no la documenta.',
  ]
}

function buildLugarImageInstructions(salida: Salida, points: LugarPoint[], imageFiles: string[] = []): string[] {
  const destino = nullableText(salida.nombre) ?? nullableText(salida.destino) ?? 'el destino'
  const fallbacks = [
    `Seleccionar de la carpeta la imagen real más reconocible de ${destino}; no identificar un sitio específico si la foto no puede verificarse.`,
    ...points.map(({ etiqueta }) => `Seleccionar una foto real identificable como ${etiqueta}. Si no puede verificarse, usar una imagen general del destino sin atribuirle rasgos específicos.`),
    'Seleccionar una foto real del grupo o de la experiencia para el cierre; evitar escenas, cumbres o condiciones no documentadas.',
  ]
  return fallbacks.map((fallback, index) => {
    const file = imageFiles[index]
    return file
      ? `Usar el archivo exacto "${file}" de la carpeta seleccionada. ${fallback}`
      : fallback
  })
}

function extractTechnicalFacts(group: ItineraryGroup): string[] {
  const source = group.dias.map(day => `${day.descripcion} ${day.hito ?? ''}`).join(' ')
  const measurements = (source.match(/\b\d+(?:[.,]\d+)?\s*(?:km|kilómetros?|m|metros?)\b/gi) ?? [])
    .map(measurement => measurement.match(/\d+(?:[.,]\d+)?/)?.[0].replace(/[.,]/g, '') ?? '')
    .filter(Boolean)
  const difficulties = source.match(/\bdificultad\s+(?:baja|media|alta)\b/gi) ?? []
  return [...measurements, ...difficulties]
}

function normalizeFactTokens(value: string): string[] {
  const stopWords = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'al'])
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR')
    .match(/[a-z0-9]+/g)
    ?.filter(token => !stopWords.has(token))
    .map(token => token.length > 5 && token.endsWith('es') ? token.slice(0, -2) : token.length > 4 && token.endsWith('s') ? token.slice(0, -1) : token) ?? []
}

function extractNamedRoutePoints(group: ItineraryGroup): string[] {
  const source = group.dias.map(day => `${day.titulo}. ${day.descripcion}. ${day.hito ?? ''}`).join(' ')
  return extractNamedRoutePointsFromText(source)
}

function missingNamedRoutePoints(points: string[], text: string): string[] {
  const slideTokens = new Set(normalizeFactTokens(text))
  return points.filter(point => {
    const pointTokens = normalizeFactTokens(point)
    return pointTokens.length > 0 && pointTokens.some(token => !slideTokens.has(token))
  })
}

function systemImagePlaceholder(formato: ImplementedAdaptiveFormat): string | null {
  if (SYSTEM_OWNED_IMAGE_FORMATS.has(formato)) {
    return `La indicación visual de ${formato} se asignará automáticamente después de validar el copy.`
  }
  if (formato === 'conversacion') {
    return 'Usar una imagen cotidiana y neutra que acompañe el diálogo sin revelar todavía el destino.'
  }
  return null
}

function ensureDistinctAngleFromOpening<T extends { angulo: string; slides: SlideCarrusel[] }>(
  formato: ImplementedAdaptiveFormat,
  output: T,
): T {
  const opening = output.slides.find(slide => slide.rol === 'portada' && slide.texto_principal)?.texto_principal
    ?? output.slides.find(slide => slide.texto_principal)?.texto_principal
    ?? ''
  if (!itineraryAngleMatchesCover(output.angulo, opening)) return output
  return { ...output, angulo: INTERNAL_ANGLE_FALLBACKS[formato] }
}

function parseSlides(raw: unknown, formato: ImplementedAdaptiveFormat): SlideCarrusel[] {
  if (!Array.isArray(raw)) throw new Error('slides debe ser un array')
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Slide ${index + 1} inválido`)
    const slide = item as Record<string, unknown>
    const rol = slide.rol
    const tipo = slide.tipo
    if (!['portada', 'desarrollo', 'datos', 'foto', 'cierre'].includes(String(rol))) {
      throw new Error(`Slide ${index + 1}: rol inválido`)
    }
    if (!['texto', 'foto', 'dialogo', 'ficha'].includes(String(tipo))) {
      throw new Error(`Slide ${index + 1}: tipo inválido`)
    }
    const textoPrincipal = nullableText(slide.texto_principal)
    if (tipo !== 'foto' && !textoPrincipal) throw new Error(`Slide ${index + 1}: falta texto principal`)
    const indicacionImagen = nullableText(slide.indicacion_imagen) ?? systemImagePlaceholder(formato)
    if (!indicacionImagen) throw new Error(`Slide ${index + 1}: falta indicación de imagen`)
    return {
      n_slide: index + 1,
      rol: rol as SlideCarrusel['rol'],
      tipo: tipo as SlideCarrusel['tipo'],
      pill_text: nullableText(slide.pill_text),
      texto_principal: textoPrincipal,
      texto_apoyo: nullableText(slide.texto_apoyo),
      indicacion_imagen: indicacionImagen,
      hablante: nullableText(slide.hablante),
    }
  })
}

function parseResponse(formato: ImplementedAdaptiveFormat, raw: RawAdaptiveResponse, expectedItems?: number, itineraryGroups?: ItineraryGroup[], salida?: Salida, lugarPoints?: LugarPoint[], avoidConversationLines?: string[], objetivo?: ObjetivoInteraccion) {
  const angulo = nullableText(raw.angulo) ?? INTERNAL_ANGLE_FALLBACKS[formato]
  let descripcion = nullableText(raw.descripcion_post)
  let finalCta = nullableText(raw.cta_comentario)
  if (!descripcion) throw new Error('Falta descripcion_post')
  const slides = parseSlides(raw.slides, formato)
  const limits = FORMAT_LIMITS[formato]
  if (slides.length < limits.min || slides.length > limits.max) {
    throw new Error(`${formato} requiere entre ${limits.min} y ${limits.max} slides`)
  }

  if (formato === 'organico') {
    if (slides[0]?.rol !== 'portada' || slides[0]?.tipo !== 'texto') throw new Error('Orgánico necesita portada de texto')
    if (slides[1]?.rol !== 'datos' || slides[1]?.tipo !== 'ficha') throw new Error('Orgánico necesita ficha de datos en slide 2')
    if (slides.slice(2).some(slide => slide.tipo !== 'foto' || slide.texto_principal !== null || slide.texto_apoyo !== null)) {
      throw new Error('Desde el slide 3, Orgánico debe contener solamente fotos')
    }
    const cta = nullableText(raw.cta_comentario)
    if (!cta || !/^comentá\s+.+\s+y\s+te\s+enviamos\s+toda\s+la\s+info\.?$/i.test(cta)) {
      throw new Error('Orgánico requiere el CTA completo: "Comentá [PALABRA] y te enviamos toda la info."')
    }
    if (!descripcion.toLocaleLowerCase('es-AR').endsWith(cta.toLocaleLowerCase('es-AR'))) {
      throw new Error('La descripción de Orgánico debe cerrar literalmente con el CTA completo')
    }
  }

  if (formato === 'conversacion') {
    const edited = editConversationContent({
      descripcion,
      rawCta: finalCta,
      destino: salida?.nombre ?? salida?.destino ?? 'el destino',
      fechaInicio: salida?.fecha_inicio ?? '',
      fechaFin: salida?.fecha_fin ?? '',
      slides,
      forbiddenLines: avoidConversationLines,
      objetivo,
    })
    descripcion = edited.descripcion
    finalCta = edited.cta
    slides.splice(0, slides.length, ...edited.slides as SlideCarrusel[])
    const conversationText = slides.map(slide => `${slide.texto_principal ?? ''} ${slide.texto_apoyo ?? ''}`).join(' ')
    const salidaEvidence = `${salida?.itinerario ?? ''} ${JSON.stringify(salida?.itinerario_dias ?? [])}`
    if (/\bcumbre\b/i.test(conversationText) && !/\bcumbre\b/i.test(salidaEvidence)) {
      throw new Error('Conversación afirmó una cumbre que la salida no documenta')
    }
  }

  if (formato === 'itinerario') {
    if (slides.length !== (expectedItems ?? 0) + 2) {
      throw new Error(`Itinerario requiere exactamente ${(expectedItems ?? 0) + 2} slides`)
    }
    if (slides[0]?.rol !== 'portada') throw new Error('Itinerario necesita una portada')
    if (slides.at(-1)?.rol !== 'cierre') throw new Error('Itinerario necesita un cierre')
    const requirements = buildItineraryRequirements(itineraryGroups ?? [])
    const dias = slides.slice(1, -1)
    dias.forEach((slide, index) => {
      const group = itineraryGroups?.[index]
      const requirement = requirements[index]
      if (!group || slide.rol !== 'desarrollo' || slide.pill_text !== group.label) {
        throw new Error(`El slide ${index + 2} debe usar exactamente la etiqueta ${group?.label ?? 'calculada'}`)
      }
      const slideText = `${slide.texto_principal ?? ''} ${slide.texto_apoyo ?? ''}`.toLocaleLowerCase('es-AR')
      const comparableSlideText = slideText.replace(/[.,]/g, '')
      const missingFacts = extractTechnicalFacts(group).filter(fact => !comparableSlideText.includes(fact.toLocaleLowerCase('es-AR')))
      if (missingFacts.length) {
        throw new Error(`${group.label} omitió datos técnicos: ${missingFacts.join(', ')}`)
      }
      const missingPoints = missingNamedRoutePoints(requirement?.primaryPoints ?? [], slideText)
      if (missingPoints.length) {
        throw new Error(`${group.label} omitió puntos principales: ${missingPoints.join(', ')}`)
      }
      const sourceText = group.dias.map(day => `${day.titulo} ${day.descripcion} ${day.hito ?? ''}`).join(' ').toLocaleLowerCase('es-AR')
      const unsupportedTemporalFacts = ['amanecer', 'atardecer']
        .filter(term => slideText.includes(term) && !sourceText.includes(term))
      if (unsupportedTemporalFacts.length) {
        throw new Error(`${group.label} agregó momentos no documentados: ${unsupportedTemporalFacts.join(', ')}`)
      }
    })
    const secondaryPoints = uniqueTexts(requirements.flatMap(requirement => requirement.secondaryPoints))
    const missingSecondaryPoints = missingNamedRoutePoints(secondaryPoints, descripcion)
    if (missingSecondaryPoints.length) {
      throw new Error(`descripcion_post omitió puntos secundarios: ${missingSecondaryPoints.join(', ')}`)
    }
    const cta = nullableText(raw.cta_comentario)
    if (!cta || !/^comentá\s+.+\s+y\s+te\s+enviamos\s+toda\s+la\s+info\.?$/i.test(cta)) {
      throw new Error('Itinerario requiere el CTA completo: "Comentá [PALABRA] y te enviamos toda la info."')
    }
    if (!descripcion.toLocaleLowerCase('es-AR').endsWith(cta.toLocaleLowerCase('es-AR'))) {
      throw new Error('La descripción de Itinerario debe cerrar literalmente con el CTA completo')
    }
    const closingText = `${slides.at(-1)?.texto_principal ?? ''} ${slides.at(-1)?.texto_apoyo ?? ''}`.toLocaleLowerCase('es-AR')
    if (!closingText.includes(cta.toLocaleLowerCase('es-AR'))) {
      throw new Error('El slide final de Itinerario debe incluir literalmente el CTA completo')
    }
    const allText = `${descripcion} ${slides.map(slide => `${slide.texto_principal ?? ''} ${slide.texto_apoyo ?? ''}`).join(' ')}`
    const forbiddenCopy = findForbiddenItineraryCopy(allText)
    if (forbiddenCopy) {
      throw new Error(`Itinerario contiene lenguaje promocional prohibido: ${forbiddenCopy}`)
    }
    if (/últimos? cupos|cupos limitados|asegurá tu lugar|no te lo pierdas/i.test(allText)) {
      throw new Error('Itinerario no puede inventar urgencia ni disponibilidad de cupos')
    }
    if (salida) {
      const allowedYears = new Set([salida.fecha_inicio.slice(0, 4), salida.fecha_fin.slice(0, 4)])
      const generatedYears: string[] = allText.match(/\b20\d{2}\b/g) ?? []
      const invalidYears = [...new Set(generatedYears.filter(year => !allowedYears.has(year)))]
      if (invalidYears.length) {
        throw new Error(`Itinerario alteró el año de la salida: ${invalidYears.join(', ')} no coincide con ${[...allowedYears].join('–')}`)
      }
      const missingYears = [...allowedYears].filter(year => !generatedYears.includes(year))
      if (missingYears.length) {
        throw new Error(`Itinerario debe escribir explícitamente todos los años de la salida: falta ${missingYears.join(', ')}`)
      }
    }
  }

  if (formato === 'ascenso') {
    if (slides[0]?.rol !== 'portada') throw new Error('Ascenso necesita una portada')
    if (slides.at(-1)?.rol !== 'cierre') throw new Error('Ascenso necesita un cierre')
    const moments = slides.slice(1, -1)
    if (moments.some(slide => slide.rol !== 'desarrollo' || slide.pill_text !== null)) {
      throw new Error('Los momentos de Ascenso deben ser desarrollo sin pill_text')
    }
    if (moments.some(slide => !/\b[\p{L}]+mos\b/iu.test(`${slide.texto_principal ?? ''} ${slide.texto_apoyo ?? ''}`))) {
      throw new Error('Los momentos de Ascenso deben narrarse en pasado y primera persona plural')
    }
    const allText = `${descripcion} ${slides.map(slide => `${slide.texto_principal ?? ''} ${slide.texto_apoyo ?? ''}`).join(' ')}`
    if (/nos (?:esperaba|abraz[oó]|regal[oó]|record[oó])|fue la recompensa|vali[oó] cada paso|qued[oó] para siempre|la monta[nñ]a llama/i.test(allText)) {
      throw new Error('Ascenso agregó emociones o personificaciones no documentadas')
    }
    const cta = nullableText(raw.cta_comentario)
    if (!cta || !/^comentá\s+.+\s+y\s+te\s+enviamos\s+toda\s+la\s+info\.?$/i.test(cta)) {
      throw new Error('Ascenso requiere el CTA completo: "Comentá [PALABRA] y te enviamos toda la info."')
    }
    if (!descripcion.toLocaleLowerCase('es-AR').endsWith(cta.toLocaleLowerCase('es-AR'))) {
      throw new Error('La descripción de Ascenso debe cerrar literalmente con el CTA completo')
    }
    const closingText = `${slides.at(-1)?.texto_principal ?? ''} ${slides.at(-1)?.texto_apoyo ?? ''}`.toLocaleLowerCase('es-AR')
    if (!closingText.includes(cta.toLocaleLowerCase('es-AR'))) {
      throw new Error('El slide final de Ascenso debe incluir el CTA completo')
    }
  }

  if (formato === 'calendario') {
    if (slides.length !== (expectedItems ?? 0) + 2) throw new Error(`Calendario requiere exactamente ${(expectedItems ?? 0) + 2} slides`)
    if (slides[0]?.rol !== 'portada' || slides.at(-1)?.rol !== 'cierre') throw new Error('Calendario necesita portada y cierre')
    if (slides.slice(1, -1).some(slide => slide.rol !== 'datos' || slide.tipo !== 'ficha')) {
      throw new Error('Cada grupo de Calendario debe ser una ficha de datos')
    }
  }

  if (formato === 'lugar') {
    if (slides[0]?.rol !== 'portada' || slides.at(-1)?.rol !== 'cierre') throw new Error('Lugar necesita portada y cierre')
    const developments = slides.slice(1, -1)
    if (developments.length !== (lugarPoints?.length ?? 0)) throw new Error(`Lugar requiere exactamente ${lugarPoints?.length ?? 0} desarrollos`)
    developments.forEach((slide, index) => {
      const selected = lugarPoints?.[index]
      if (!selected || slide.rol !== 'desarrollo') throw new Error(`Lugar tiene una estructura inválida en el desarrollo ${index + 1}`)
    })
    if (!salida || !lugarPoints) throw new Error('Lugar necesita salida y puntos verificados')
    const edited = editLugarContent({
      descripcion,
      rawCta: nullableText(raw.cta_comentario),
      destino: salida.destino,
      fechaInicio: salida.fecha_inicio,
      fechaFin: salida.fecha_fin,
      activityEvidence: [
        salida.nombre,
        salida.itinerario ?? '',
        JSON.stringify(salida.itinerario_dias ?? []),
        salida.que_incluye ?? '',
      ].join(' '),
      slides,
      points: lugarPoints.map(({ etiqueta, punto }) => ({
        etiqueta,
        descripcion: punto.descripcion,
        distancia: punto.distancia,
        duracion: punto.duracion,
        dificultad: punto.dificultad,
      })),
    })
    descripcion = edited.descripcion
    finalCta = edited.cta
    slides.splice(0, slides.length, ...edited.slides as SlideCarrusel[])
    const allText = `${descripcion} ${slides.map(slide => `${slide.texto_principal ?? ''} ${slide.texto_apoyo ?? ''}`).join(' ')}`
    if (!salida?.punto_encuentro && /punto de encuentro|nos encontramos|nos juntamos|la salida (?:empieza|comienza|arranca)|salimos desde|partimos desde/i.test(allText)) {
      throw new Error('Lugar infirió un punto de encuentro o salida que el guía no cargó')
    }
  }

  return { angulo, descripcion, slides, cta: finalCta }
}

function buildDirectedDescriptionPrompt(
  p: GenerateAdaptiveCarruselParams,
  body: string,
): string {
  const destination = nullableText(p.salida.nombre) ?? nullableText(p.salida.destino) ?? 'el destino'
  const verifiedPlaces = [
    ...(p.salida.puntos_interes ?? []).map(point => point.nombre),
    ...(p.salida.itinerario_dias ?? []).map(day => day.titulo),
  ].map(item => item.trim()).filter(Boolean).slice(0, 8)
  const maxBody = p.formato === 'organico' ? 220 : 170

  return `Actuá como editor de una única descripcion_post para contenido outdoor argentino.

FORMATO: ${p.formato}
DESTINO VERIFICADO: ${destination}
LUGARES O ACCIONES VERIFICADAS: ${verifiedPlaces.join(' · ') || 'No hay detalle adicional; no inventes.'}

CUERPO A REESCRIBIR
${body}

REGLAS
- Reescribí únicamente el cuerpo narrativo en un máximo de ${maxBody} caracteres.
- Mantené el sentido humano, pero volvelo concreto y hablado.
- No agregues fechas, precios, cupos, inclusiones, CTA ni datos técnicos: el sistema los conserva por separado.
- No inventes lugares, actividades, emociones, escenas ni resultados.
- Prohibido usar "reset", "otra energía", "cambiar la sintonía", "vivir el fin del mundo", "cambiar el chip", "recargar energías", "reconectar", "transformación", "volver a vos" o abstracciones equivalentes.
- Si una frase serviría para cualquier destino, reemplazala por una acción o lugar verificado.

${SHARED_SPECIFICITY_RULES}

Respondé ÚNICAMENTE JSON válido:
{"descripcion_post":"cuerpo narrativo corregido"}`
}

async function rewriteDescriptionFieldIfNeeded(
  p: GenerateAdaptiveCarruselParams,
  output: ReturnType<typeof parseResponse>,
): Promise<ReturnType<typeof parseResponse>> {
  if (p.formato !== 'organico' && p.formato !== 'conversacion') return output
  if (!descriptionNeedsDirectedRewrite(output.descripcion)) return output

  const destination = nullableText(p.salida.nombre) ?? nullableText(p.salida.destino) ?? 'el destino'
  const cta = output.cta ?? (p.formato === 'organico'
    ? `Comentá ${ctaKeyword(destination)} y te enviamos toda la info.`
    : `Comentá ${ctaKeyword(destination)} y te pasamos toda la info.`)
  const originalBody = editableDescriptionBody(p.formato, output.descripcion, cta)
  let rewrittenBody: string | null = null

  try {
    const result = await generateWithRetryTracked(
      buildDirectedDescriptionPrompt(p, originalBody),
      `${p.formato}-descripcion-editor[1/1]`,
    )
    rewrittenBody = nullableText(extractJson(result.text).descripcion_post)
  } catch (error) {
    console.warn(`[CARRUSEL/${p.formato}] editor dirigido de descripcion_post falló; se aplicará fallback local: ${error instanceof Error ? error.message : 'respuesta inválida'}`)
  }

  const descripcion = finalizeDirectedDescription({
    format: p.formato,
    originalDescription: output.descripcion,
    rewrittenBody,
    destination,
    exactDateRange: compactDateRange(p.salida.fecha_inicio, p.salida.fecha_fin),
    capacity: p.salida.cupos,
    canonicalCta: cta,
    descriptionLimit: LIMITS_BY_FORMAT[p.formato].descripcion_post,
    verifiedPlaces: (p.salida.puntos_interes ?? []).map(point => point.nombre),
  })

  console.warn(`[CARRUSEL/${p.formato}] descripcion_post reescrita por campo sin rechazar la pieza.`)
  return { ...output, descripcion }
}

function buildSources(p: GenerateAdaptiveCarruselParams): FuenteContenido[] {
  const sources: FuenteContenido[] = [
    { tipo: 'salida', referencia: p.salida.id, detalle: p.salida.nombre },
    { tipo: 'foto', referencia: p.carpeta },
    { tipo: 'knowledge_base', referencia: `formatos/carrusel_${p.formato}.md` },
  ]
  if (p.formato === 'itinerario') {
    sources.push({ tipo: 'itinerario', referencia: p.salida.id, detalle: `${p.salida.itinerario_dias?.length ?? 0} días` })
  }
  if (p.sourcePastSalida) {
    sources.push({ tipo: 'salida', referencia: p.sourcePastSalida.id, detalle: 'Salida pasada fuente' })
  }
  if (p.futureRelatedSalida) {
    sources.push({ tipo: 'salida', referencia: p.futureRelatedSalida.id, detalle: 'Salida futura relacionada' })
  }
  if (p.formato === 'calendario') {
    for (const salida of p.futureSalidas ?? []) sources.push({ tipo: 'salida', referencia: salida.id, detalle: 'Salida futura de calendario' })
    for (const holiday of p.holidays ?? []) sources.push({ tipo: 'feriado', referencia: holiday.fecha, detalle: holiday.fuente ?? holiday.nombre })
  }
  if (p.formato === 'lugar') {
    buildLugarPoints(p.salida).forEach(({ punto }) => sources.push({ tipo: 'punto_interes', referencia: punto.nombre, detalle: punto.fuente }))
  }
  return sources
}

export async function generateAdaptiveCarrusel(
  p: GenerateAdaptiveCarruselParams,
): Promise<GeneratedAdaptiveCarrusel> {
  let correction: string | undefined
  let parsed: ReturnType<typeof parseResponse> | null = null
  const maxAttempts = p.formato === 'conversacion' ? 4 : p.formato === 'itinerario' ? 5 : 2

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await generateWithRetryTracked(buildPrompt(p, correction), `${p.formato}[${attempt}/${maxAttempts}]`)
    try {
      const draftExtracted = extractJson(result.text)
      let extracted: RawAdaptiveResponse = draftExtracted
      if (p.formato === 'lugar') {
        const reviewed = await generateWithRetryTracked(buildLugarEditorialReviewPrompt(p, result.text), `lugar-editor[${attempt}/2]`)
        extracted = extractJson(reviewed.text)
      } else if (p.formato === 'conversacion') {
        const reviewed = await generateWithRetryTracked(buildConversationEditorialReviewPrompt(p, result.text), `conversacion-editor[${attempt}/${maxAttempts}]`)
        extracted = mergeConversationEditorialReview(draftExtracted, extractJson(reviewed.text))
      } else if (p.formato === 'ascenso') {
        const reviewed = await generateWithRetryTracked(buildAscensoEditorialReviewPrompt(p, result.text), `ascenso-editor[${attempt}/2]`)
        extracted = extractJson(reviewed.text)
      }
      const itineraryGroups = p.formato === 'itinerario'
        ? buildItineraryGroups(p.salida.itinerario_dias ?? [])
        : undefined
      const lugarPoints = p.formato === 'lugar' ? buildLugarPoints(p.salida) : undefined
      const expectedItems = p.formato === 'itinerario'
        ? itineraryGroups?.length
        : p.formato === 'calendario'
          ? buildCalendarGroups(p.futureSalidas ?? [], p.holidays ?? []).length
          : p.formato === 'lugar'
            ? lugarPoints?.length
            : undefined
      const normalized = p.formato === 'ascenso'
        ? normalizeAscensoRaw(extracted, p)
        : p.formato === 'calendario'
          ? normalizeCalendarRaw(extracted, p)
          : p.formato === 'organico'
            ? normalizeOrganicDraft(extracted, {
              destination: nullableText(p.salida.nombre) ?? nullableText(p.salida.destino) ?? 'el destino',
              exactDateRange: compactDateRange(p.salida.fecha_inicio, p.salida.fecha_fin),
              capacity: p.salida.cupos,
              canonicalCta: `Comentá ${ctaKeyword(p.salida.nombre || p.salida.destino)} y te enviamos toda la info.`,
              descriptionLimit: LIMITS_BY_FORMAT.organico.descripcion_post,
            })
            : extracted
      let candidate = parseResponse(p.formato, normalized, expectedItems, itineraryGroups, p.salida, lugarPoints, p.avoidConversationLines, p.objetivo)
      candidate = await rewriteDescriptionFieldIfNeeded(p, candidate)
      const calendarLabels = p.formato === 'calendario'
        ? buildCalendarGroups(p.futureSalidas ?? [], p.holidays ?? []).map(group => group.label)
        : []
      const protectedLabels = [
        ...(itineraryGroups?.map(group => group.label) ?? []),
        ...(lugarPoints?.map(point => point.etiqueta) ?? []),
        ...calendarLabels,
      ]
      const protectedTerms = [
        p.salida.nombre,
        p.salida.destino,
        ...(itineraryGroups?.flatMap(group => group.dias.flatMap(day => [day.titulo, day.hito ?? ''])) ?? []),
        ...(itineraryGroups ? buildItineraryRequirements(itineraryGroups).flatMap(requirement => requirement.primaryPoints) : []),
        ...(p.sourcePastSalida?.itinerario_dias?.flatMap(day => [day.titulo, day.hito ?? '']) ?? []),
        p.sourcePastSalida?.nombre ?? '',
        p.sourcePastSalida?.destino ?? '',
        ...(lugarPoints?.flatMap(({ etiqueta, punto }) => [etiqueta, punto.nombre]) ?? []),
      ]
      const limitValidation = validateAdaptiveTextLimits(p.formato, candidate, { protectedLabels, protectedTerms })
      logAdaptiveTextLimitWarnings(p.formato, limitValidation.warnings)
      const limitResolution = resolveAdaptiveTextLimits(candidate, limitValidation, attempt, maxAttempts)
      if (limitResolution.action === 'retry' || limitResolution.action === 'reject') {
        throw new Error(formatAdaptiveTextLimitError(limitResolution.validation))
      }
      parsed = ensureDistinctAngleFromOpening(p.formato, limitResolution.output)
      break
    } catch (error) {
      correction = error instanceof Error ? error.message : 'La estructura no cumple el contrato'
      console.warn(`[CARRUSEL/${p.formato}] intento ${attempt} rechazado: ${correction}`)
      if (attempt === maxAttempts) throw error
    }
  }

  if (!parsed) throw new Error(`No se pudo generar el carrusel ${p.formato}`)

  if (p.formato === 'organico') {
    const imageInstructions = buildOrganicImageInstructions(p.salida, parsed.slides.length)
    parsed.slides = parsed.slides.map((slide, index) => ({
      ...slide,
      indicacion_imagen: imageInstructions[index],
    }))
  }
  if (p.formato === 'itinerario') {
    const itineraryGroups = buildItineraryGroups(p.salida.itinerario_dias ?? [])
    const imageInstructions = buildItineraryImageInstructions(p.salida, itineraryGroups)
    parsed.slides = parsed.slides.map((slide, index) => ({ ...slide, indicacion_imagen: imageInstructions[index] }))
  }
  if (p.formato === 'lugar') {
    const instructions = buildLugarImageInstructions(p.salida, buildLugarPoints(p.salida), p.imageFiles)
    parsed.slides = parsed.slides.map((slide, index) => ({ ...slide, indicacion_imagen: instructions[index] }))
  }

  return {
    formato: 'carrusel',
    formato_carrusel: p.formato as Exclude<FormatoCarrusel, 'editorial'>,
    tema: p.formato === 'organico' ? 'motivacion' : 'destinos',
    estructura_narrativa: null,
    cantidad_slides: parsed.slides.length,
    angulo: parsed.angulo,
    slides: parsed.slides,
    cta_comentario: parsed.cta,
    objetivo_interaccion: p.objetivo,
    descripcion_post: parsed.descripcion,
    fuentes: buildSources(p),
    metadata: { strategy: 'single_call_validated', version: 1 },
    carpeta_material: p.carpeta,
    mes: p.mesAnio,
  }
}
