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

type ImplementedAdaptiveFormat = 'organico' | 'conversacion' | 'itinerario' | 'ascenso' | 'calendario' | 'lugar'

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
  itinerario: { min: 3, max: 5 },
  ascenso: { min: 5, max: 5 },
  calendario: { min: 3, max: 5 },
  lugar: { min: 5, max: 5 },
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
- Slide 2: tipo "ficha", rol "datos", nombre + fecha + UN dato clave.
- Slides 3 en adelante: tipo "foto", rol "foto", texto_principal null y texto_apoyo null.
- La descripción tiene un máximo de 650 caracteres: 2 a 4 líneas breves, un bloque compacto de datos reales y el CTA.
- Resumí qué incluye; no copies la lista completa ni redactes un folleto.
- cta_comentario contiene la frase canónica completa: "Comentá [PALABRA] y te enviamos toda la info."
- Esa misma frase debe cerrar literalmente descripcion_post.
- La frase inicial y la descripción deben compartir tono.
- Corregí tildes evidentes de nombres propios sin alterar la información.
- Cada indicacion_imagen debe dar un criterio visual concreto de sujeto, encuadre o función narrativa. Evitá "foto impresionante", "otra foto" y descripciones genéricas intercambiables.
- No copies ni parafrasees los ejemplos de la guía.`
  }

  if (formato === 'conversacion') return `=== TAREA ===
Generá UN carrusel conversación de 2 a 5 slides.
- Antes de escribir, elegí UNA tensión humana del perfil: carga mental/rutina, necesidad de descanso, falta de compañía, poco tiempo, duda sobre el nivel, deseo de compartir un plan o necesidad de cambiar de entorno.
- Elegí una sola variante de la guía según la salida y el público.
- Cada slide contiene una sola intervención o un remate visual.
- Para diálogo: tipo "dialogo" y hablante breve cuando haga falta.
- Para remate solo visual: tipo "foto", texto_principal null.
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
- La venta queda fuera de los slides. La descripción es breve y termina con un único CTA.
- No uses frases comodín como "cambiar de aire", "arrancar distinto", "la montaña te espera" o "nos vemos en [destino]" como remate.
- Prohibido "volar la cabeza", "reset", "recargar energías", "inmensidad", "vorágine" y lenguaje de bienestar escrito por una marca.
- No copies ni parafrasees conversaciones observadas o ejemplos de la guía.`

  if (formato === 'itinerario') return `=== TAREA ===
Generá UN carrusel itinerario.
- Cantidad exacta: 1 portada + 1 slide por cada GRUPO ya calculado + 1 cierre; máximo 5 slides totales.
- Los grupos ya conservan todos los días en orden. No los combines, dividas, reordenes ni agregues etapas.
- Cada slide de recorrido usa rol "desarrollo", tipo "texto" y pill_text exactamente igual a la etiqueta del grupo.
- Si un grupo contiene dos días, texto_principal y texto_apoyo deben representar ambos sin omitir ninguno.
- Conservá distancias, desniveles, dificultad, horarios y puntos del recorrido presentes en la fuente. No los reemplaces por adjetivos.
- La actividad y los detalles deben salir exclusivamente del grupo correspondiente.
- La portada resume destino y duración; el cierre usa datos reales de la salida.
- Prohibido afirmar urgencia, cupos restantes, cumbres o condiciones visuales no documentadas.
- cta_comentario contiene la frase completa: "Comentá [PALABRA] y te enviamos toda la info."
- El texto principal o de apoyo del slide final también debe contener literalmente ese CTA completo para que se renderice en la placa.
- Evitá lugares comunes como "aventura pura", "volar la cabeza", "dejar sin aliento", "mochila llena de recuerdos", "como se debe" o "una nueva vos". Escribí observaciones concretas del itinerario.
- descripcion_post resume el itinerario sin agregar actividades y termina con ese mismo CTA.`

  if (formato === 'ascenso') return `=== TAREA ===
Generá UN carrusel ascenso basado en una salida que ya ocurrió.
- Estructura exacta: 1 portada + 3 momentos + 1 cierre (5 slides).
- Los momentos usan rol "desarrollo", tipo "texto", sin pill_text.
- Narrá en pasado y primera persona plural.
- Construí el arco salida → esfuerzo → momento cumbre → regreso usando solo hechos presentes en la fuente.
- No describas clima, emociones, accidentes, horarios ni escenas que no estén documentados.
- El cierre puede vender la salida futura relacionada; si no existe, termina con CTA sin fecha.
- descripcion_post usa tono de memoria, no de folleto.`

  if (formato === 'calendario') return `=== TAREA ===
Generá UN carrusel calendario usando los grupos ya calculados por el sistema.
- Cantidad exacta: 1 portada + 1 slide por cada grupo + 1 cierre.
- No calcules fechas, no cambies meses y no agregues feriados.
- Cada grupo usa rol "datos", tipo "ficha" y pill_text igual a su etiqueta.
- texto_principal lista fecha y destino; texto_apoyo usa un único dato útil real.
- La descripción contiene una lista compacta de las fechas y un CTA.`

  return `=== TAREA ===
Generá UN carrusel lugar con 1 portada + 1 desarrollo por cada PUNTO SELECCIONADO + 1 cierre.
- Conservá exactamente el orden y la cantidad de puntos seleccionados.
- Cada desarrollo usa rol "desarrollo", tipo "texto" y pill_text exactamente igual a etiqueta.
- Cada desarrollo representa únicamente su punto; no mezcles información entre lugares.
- Repetí los nombres geográficos necesarios. Nunca reemplaces un nombre propio por "homónimo", "el mismo", "este lugar" o fórmulas ambiguas.
- texto_principal: una sola frase de hasta 75 caracteres. Sin introducciones ni remates emocionales.
- texto_apoyo: una sola línea compacta de hasta 90 caracteres con los datos técnicos más útiles.
- Conservá distancia, duración y dificultad cuando estén disponibles, sin cambiar cifras ni alcance.
- No amplíes "vista", "accesible" o "cercano" como tocar, llegar al hielo o realizar una actividad no documentada.
- Prohibido inventar colores, témpanos, clima, momento del día, escenas, superlativos o características visuales.
- La salida comercial aparece únicamente en el cierre y en una sola línea final de la descripción.
- La descripción tiene un máximo de 750 caracteres. No copies todo lo incluido, precio ni cupos: destino, puntos mostrados, fecha y CTA alcanzan.
- El cierre contiene solo una conexión breve con la salida, fecha exacta y CTA. No uses urgencia ni lenguaje de venta.
- Si la fecha cruza de año, escribí ambos años explícitamente.
- cta_comentario contiene la frase completa: "Comentá [PALABRA] y te enviamos toda la información."
- La descripción termina con ese CTA y el slide final también lo incluye literalmente.
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

interface ItineraryGroup {
  label: string
  dias: DiaItinerario[]
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

function itineraryGroupScore(group: ItineraryGroup): number {
  return group.dias.reduce((total, day) => total + day.titulo.length + day.descripcion.length + (day.hito?.length ?? 0), 0)
}

function buildItineraryGroups(days: DiaItinerario[]): ItineraryGroup[] {
  const groups = days.map(day => ({ label: `DÍA ${day.numero}`, dias: [day] }))
  while (groups.length > 3) {
    let mergeIndex = 0
    let lowestScore = Number.POSITIVE_INFINITY
    for (let index = 0; index < groups.length - 1; index++) {
      const score = itineraryGroupScore(groups[index]) + itineraryGroupScore(groups[index + 1])
      if (score < lowestScore) {
        lowestScore = score
        mergeIndex = index
      }
    }
    const dias = [...groups[mergeIndex].dias, ...groups[mergeIndex + 1].dias]
    const first = dias[0].numero
    const last = dias.at(-1)!.numero
    groups.splice(mergeIndex, 2, { label: `DÍAS ${first}–${last}`, dias })
  }
  return groups
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
    return `=== GRUPOS DE ITINERARIO CALCULADOS — FUENTE ÚNICA PARA LOS SLIDES ===
${JSON.stringify(buildItineraryGroups(p.salida.itinerario_dias ?? []), null, 2)}`
  }
  if (p.formato === 'ascenso') {
    return `=== SALIDA PASADA — FUENTE DEL RELATO ===
${p.sourcePastSalida ? buildSalidaBlock(p.sourcePastSalida) : 'No disponible'}
Itinerario general: ${p.sourcePastSalida?.itinerario ?? '—'}
Etapas estructuradas:
${JSON.stringify(p.sourcePastSalida?.itinerario_dias ?? [], null, 2)}

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

  const conversationAxes = [
    'bienestar cotidiano o cansancio de rutina, sin dramatizar',
    'objeción de no tener compañía y posibilidad de conocer gente en el viaje',
    'duda real sobre el nivel físico o la capacidad de hacer la actividad',
    'propuesta espontánea entre amigos, pareja o familia',
  ]
  const assignedConversationAxis = p.formato === 'conversacion' && (p.variantCount ?? 1) > 1
    ? conversationAxes[((p.variantIndex ?? 1) - 1) % conversationAxes.length]
    : null

  return `${contextToPromptBlock(context, true)}

${buildClientBlock(p.clientName, p.clientOnboarding)}

${buildSalidaBlock(p.salida)}

${buildSequentialSources(p)}

=== OBJETIVO PRINCIPAL ===
${p.objetivo}

${p.variantCount && p.variantCount > 1 ? `=== VARIANTE ${p.variantIndex ?? 1} DE ${p.variantCount} ===
Esta pieza debe tener un ángulo y una apertura claramente distintos de las otras variantes del mismo disparo.
${p.avoidAngles?.length ? `Ángulos ya utilizados — no repetir ni parafrasear:\n${p.avoidAngles.map(angle => `- ${angle}`).join('\n')}` : 'Es la primera variante del lote.'}` : ''}
${assignedConversationAxis ? `EJE HUMANO ASIGNADO A ESTA VARIANTE: ${assignedConversationAxis}. No lo cambies por cansancio genérico.` : ''}

=== MATERIAL VISUAL ===
Carpeta seleccionada: ${p.carpeta}

${buildFormatTask(p.formato)}

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
- texto_principal de cada desarrollo: una frase concreta de hasta 75 caracteres.
- texto_apoyo: una línea técnica breve. No inventes ni alteres datos.
- Evitá clichés, superlativos, urgencia, sensaciones inventadas y frases intercambiables.
- No copies ejemplos ni reemplaces nombres geográficos por "homónimo".

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

Reescribí este CARRUSEL CONVERSACIÓN siguiendo el mecanismo observado:
- 2 a 4 slides como máximo.
- Elegí UNA tensión humana real del perfil: cansancio de rutina, carga mental, necesidad de pausa, falta de compañía, falta de tiempo, duda sobre el nivel o ganas de compartir un plan.
- Una situación cotidiana reconocible, una respuesta breve y un giro concreto hacia ${p.salida.nombre || p.salida.destino}.
- La conversación tiene que poder ocurrir de verdad entre personas concretas. Una frase debe provocar la siguiente; no armes una sucesión de slogans.
- Aplicá una prueba de continuidad: leé cada intervención como respuesta directa a la anterior. Si no contesta, contradice o reinterpreta lo dicho, reescribila.
- El nombre del destino solo puede aparecer después de que alguien haya propuesto un viaje/lugar, o quedar revelado por la imagen final sin nombrarlo.
- Antes de responder, evaluá internamente tres ideas distintas y elegí la menos predecible que siga siendo natural. Entregá solo la elegida.
- Cada intervención debe sonar hablada y tener entre 3 y 12 palabras.
- No expliques el remate.
- No uses fichas, precio, duración, inclusiones, cupos, urgencia ni cierre comercial.
- No inventes "Amigo A/B". El hablante solo existe si su relación aporta al giro.
- Escribí como hablan dos personas argentinas, sin frases de marca ni solemnidad.
- Prohibido usar metáforas como "gigantes de piedra", "huir de la civilización", "la montaña te llama", "el alma lo pide" o equivalentes.
- No prometas curar ansiedad, estrés o salud mental. La salida puede representar pausa, descanso, aire libre o cambio de rutina.
- La descripción no repite el diálogo ni vende como folleto; termina con un solo CTA.
- El destino debe ser necesario para el remate, no intercambiable por cualquier viaje.
- Evitá remates comodín: "cambiar de aire", "arrancar distinto", "nos vemos en...", "te espera" y cualquier moraleja de marca.
- No uses "volar la cabeza", "reset", "recargar energías", "inmensidad", "vorágine", "sacudón" ni falsos mensajes inspiracionales.
- No copies ni parafrasees literalmente los ejemplos de referencia.
${avoidBlock}

SALIDA REAL
${buildSalidaBlock(p.salida)}

PÚBLICO, OBJECIONES Y MOTIVACIONES
${buildClientBlock(p.clientName, p.clientOnboarding)}

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
  const matches = source.match(/\b(?:Laguna|Glaciar|Lago|Río|Sendero|Cascada|Chorrillo|Mirador(?:es)?|Fitz Roy)\b[^.,;()\-–\n]*/gu) ?? []
  return [...new Set(matches.map(match => match.trim()).filter(Boolean))]
}

function missingNamedRoutePoints(group: ItineraryGroup, slideText: string): string[] {
  const slideTokens = new Set(normalizeFactTokens(slideText))
  return extractNamedRoutePoints(group).filter(point => {
    const pointTokens = normalizeFactTokens(point)
    return pointTokens.length > 0 && pointTokens.some(token => !slideTokens.has(token))
  })
}

function parseSlides(raw: unknown): SlideCarrusel[] {
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
    const indicacionImagen = nullableText(slide.indicacion_imagen)
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
  const angulo = nullableText(raw.angulo)
  let descripcion = nullableText(raw.descripcion_post)
  let finalCta = nullableText(raw.cta_comentario)
  if (!angulo) throw new Error('Falta angulo')
  if (!descripcion) throw new Error('Falta descripcion_post')
  const slides = parseSlides(raw.slides)
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
    if (descripcion.length > 650) throw new Error('La descripción de Orgánico supera los 650 caracteres')
    const cta = nullableText(raw.cta_comentario)
    if (!cta || !/^comentá\s+.+\s+y\s+te\s+enviamos\s+toda\s+la\s+info\.?$/i.test(cta)) {
      throw new Error('Orgánico requiere el CTA completo: "Comentá [PALABRA] y te enviamos toda la info."')
    }
    if (!descripcion.toLocaleLowerCase('es-AR').endsWith(cta.toLocaleLowerCase('es-AR'))) {
      throw new Error('La descripción de Orgánico debe cerrar literalmente con el CTA completo')
    }
    const genericImageInstruction = /\b(foto impresionante|otra foto|foto de paisaje)\b/i
    if (slides.some(slide => genericImageInstruction.test(slide.indicacion_imagen))) {
      throw new Error('Las indicaciones de imagen de Orgánico deben ser específicas, no genéricas')
    }
  }

  if (formato === 'conversacion') {
    const edited = editConversationContent({
      descripcion,
      rawCta: finalCta,
      destino: salida?.nombre ?? salida?.destino ?? 'el destino',
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
    const dias = slides.slice(1, -1)
    dias.forEach((slide, index) => {
      const group = itineraryGroups?.[index]
      if (!group || slide.rol !== 'desarrollo' || slide.pill_text !== group.label) {
        throw new Error(`El slide ${index + 2} debe usar exactamente la etiqueta ${group?.label ?? 'calculada'}`)
      }
      const slideText = `${slide.texto_principal ?? ''} ${slide.texto_apoyo ?? ''}`.toLocaleLowerCase('es-AR')
      const comparableSlideText = slideText.replace(/[.,]/g, '')
      const missingFacts = extractTechnicalFacts(group).filter(fact => !comparableSlideText.includes(fact.toLocaleLowerCase('es-AR')))
      if (missingFacts.length) {
        throw new Error(`${group.label} omitió datos técnicos: ${missingFacts.join(', ')}`)
      }
      const missingPoints = missingNamedRoutePoints(group, slideText)
      if (missingPoints.length) {
        throw new Error(`${group.label} omitió puntos del recorrido: ${missingPoints.join(', ')}`)
      }
      const sourceText = group.dias.map(day => `${day.titulo} ${day.descripcion} ${day.hito ?? ''}`).join(' ').toLocaleLowerCase('es-AR')
      const unsupportedQualifiers = ['cerca', 'mañana', 'tarde', 'noche', 'amanecer', 'atardecer']
        .filter(term => slideText.includes(term) && !sourceText.includes(term))
      if (unsupportedQualifiers.length) {
        throw new Error(`${group.label} agregó calificadores no documentados: ${unsupportedQualifiers.join(', ')}`)
      }
    })
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
    if (slides.slice(1, -1).some(slide => slide.rol !== 'desarrollo' || slide.pill_text !== null)) {
      throw new Error('Los momentos de Ascenso deben ser desarrollo sin pill_text')
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
  const maxAttempts = p.formato === 'conversacion' ? 4 : 2

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await generateWithRetryTracked(buildPrompt(p, correction), `${p.formato}[${attempt}/${maxAttempts}]`)
    try {
      const candidateText = p.formato === 'lugar'
        ? (await generateWithRetryTracked(buildLugarEditorialReviewPrompt(p, result.text), `lugar-editor[${attempt}/2]`)).text
        : p.formato === 'conversacion'
          ? (await generateWithRetryTracked(buildConversationEditorialReviewPrompt(p, result.text), `conversacion-editor[${attempt}/${maxAttempts}]`)).text
          : result.text
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
      parsed = parseResponse(p.formato, extractJson(candidateText), expectedItems, itineraryGroups, p.salida, lugarPoints, p.avoidConversationLines, p.objetivo)
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
