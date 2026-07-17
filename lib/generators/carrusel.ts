import type {
  Salida, Niche, Vertical, TemaCarrusel, EstructuraNarrativa, RolSlide,
  SlideCarrusel, GeneratedCarrusel, ClientOnboarding,
} from '@/types'
import { VERTICAL_LABELS } from '@/lib/verticals'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import { formatFechaSalida } from '@/lib/utils/dates'
import { loadCarruselContext, contextToPromptBlock } from '@/lib/knowledge/loader'
import { truncateAtWord } from '@/lib/generators/carrusel-text-limits'
export { TEMA_LABELS } from '@/lib/generators/carrusel-labels'

// ─── Descriptions ─────────────────────────────────────────────────────────────

const TEMA_DESCRIPTIONS: Record<TemaCarrusel, string> = {
  seguridad:          'Riesgos, decisiones críticas en montaña, cuándo dar media vuelta, por qué ir con guía certificado.',
  destinos:           'Características del lugar, paisaje, dificultad del terreno, logística, qué hace único a este destino.',
  preparacion_fisica: 'Qué condición física se necesita, cómo entrenar para la salida, errores de preparación comunes.',
  equipo:             'Qué llevar, qué no llevar, errores de equipamiento, diferencias entre opciones, por qué importa cada item.',
  educacion_montana:  'Conceptos técnicos, lectura del clima, orientación, terminología del deporte, conocimiento que marca la diferencia.',
  testimonios:        'Experiencias reales de participantes anteriores, historias de cambio personal, transformaciones que generó la salida.',
  detras_del_guia:    'Quién es el guía, su filosofía, su trayectoria, su historia, qué lo hace diferente.',
  motivacion:         'Por qué salir, por qué moverse, qué cambia en vos cuando te movés en la naturaleza, inspiración.',
  logistica:          'Cómo inscribirse, qué incluye la salida, cómo prepararse, precios, cupos, fechas, detalles operativos.',
  dudas_objeciones:   'Responder las dudas reales que frenan al cliente: "es muy difícil para mí", "es caro", "no tengo experiencia".',
  bienestar:          'Bienestar físico y mental en la montaña, desconexión, naturaleza como terapia, salud holística.',
}

const ESTRUCTURA_DESCRIPTIONS: Record<EstructuraNarrativa, string> = {
  problema_solucion: 'Planteás un problema real del lector (portada), lo desarrollás (desarrollo), ofrecés la salida como solución (cierre).',
  lista_tips:        'Enumerás consejos prácticos accionables, uno por slide de desarrollo.',
  storytelling:      'Contás una historia con tensión y resolución emocional, slide a slide como escenas.',
  mito_vs_realidad:  'Desmontás una creencia falsa slide a slide: mito → realidad.',
  antes_despues:     'Mostrás un estado inicial (dolor, miedo) y un estado final (logro, libertad).',
  paso_a_paso:       'Guiás al lector por un proceso secuencial. Cada slide de desarrollo es un paso.',
  pregunta_respuesta:'Formulás preguntas reales que tiene el lector y las respondés una a una.',
}

const EMBUDO_CTA_MAP: Record<string, string> = {
  whatsapp:   'El CTA debe invitar a escribir por WhatsApp directo.',
  bio:        'El CTA debe dirigir al link en bio.',
  comentario: 'El CTA debe pedir que comenten en el post.',
  dm:         'El CTA debe pedir un DM de Instagram.',
  formulario: 'El CTA debe dirigir a completar un formulario web.',
}

const CTA_DEFAULTS: Record<TemaCarrusel, string[]> = {
  seguridad:          ['¿Sabías esto? Comentá abajo.', '¿Lo tenías en cuenta? Guardalo.', '¿Cuántos de estos aplicás? Contanos.', '¿Algo que agregar? Dale en comentarios.'],
  destinos:           ['¿Ya fuiste? Contanos tu experiencia.', '¿Este destino está en tu lista? Comentá.', 'Guardalo para tu próxima salida.', '¿Cuándo vas? Avisanos abajo.'],
  preparacion_fisica: ['¿Cómo es tu entrenamiento? Contanos.', '¿Qué te cuesta más entrenar? Comentá.', 'Guardalo si te servió.', '¿Empezás hoy? Decinos abajo.'],
  equipo:             ['¿Qué te falta en tu mochila? Comentá.', '¿Algún item que agregarías? Dale abajo.', 'Guardalo antes de tu próxima salida.', '¿Usás todo esto? Contanos.'],
  educacion_montana:  ['¿Sabías todo esto? Comentá abajo.', '¿Qué te sorprendió? Decinos.', 'Guardalo — vale para cada salida.', '¿Algo que agregar? Comentá.'],
  testimonios:        ['¿Tuviste una experiencia así? Contanos.', '¿Te identificás? Decinos.', '¿Cuándo fue tu última salida? Contanos.', '¿Qué te cambió a vos? Comentá abajo.'],
  detras_del_guia:    ['¿Tenés alguna pregunta? Comentá abajo.', 'Guardalo si te resonó.', '¿Lo conocías? Contanos.', '¿Qué querés saber del guía? Dale.'],
  motivacion:         ['¿Qué te frenó la última vez? Comentá.', '¿Te convencimos? Comentá abajo.', '¿Cuándo fue tu última aventura? Contanos.', '¿Para cuándo tu próxima salida? Decinos.'],
  logistica:          ['¿Tenés alguna duda? Comentá abajo.', '¿Te quedás con alguna pregunta? Comentá.', '¿Te anotás? Escribinos abajo.', '¿Qué querés saber? Dale en comentarios.'],
  dudas_objeciones:   ['¿Cuál era tu duda? Comentá.', '¿Te convencimos? Comentá.', '¿Qué pregunta tenés todavía? Dale.', '¿Te pasaba esto? Contanos abajo.'],
  bienestar:          ['¿Lo sentiste alguna vez? Comentá.', 'Guardalo si te resonó.', '¿Te identificás? Dale abajo.', '¿Qué te da la montaña a vos? Decinos.'],
}

function getCtaDefault(tema: TemaCarrusel, pieceIndex: number): string {
  const pool = CTA_DEFAULTS[tema]
  return pool[pieceIndex % pool.length]
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const INPUT_PER_1M  = 0.30  // USD — gemini-2.5-flash; ajustar si cambia el modelo
const OUTPUT_PER_1M = 2.50

// ─── Limits ───────────────────────────────────────────────────────────────────

export const LIMITS = {
  pill_text:       18,
  texto_principal: 60,
  texto_apoyo:     180,
  cta_comentario:  80,
  angulo:          100,
} as const

// ─── Truncation ───────────────────────────────────────────────────────────────

function truncate(
  value:    string,
  limit:    number,
  field:    string,
  exceeded: { value: boolean },
): string {
  if (value.length <= limit) return value
  exceeded.value = true
  const clean = finalizeTruncatedText(value, limit)
  console.warn(`[CARRUSEL] ${field} excede ${limit} chars (${value.length}) → truncado a ${clean.length} chars`)
  return clean
}

function finalizeTruncatedText(value: string, limit: number): string {
  const wordSafe = truncateAtWord(value.trim(), limit)
  const sentenceMatches = [...wordSafe.matchAll(/[.?!](?=\s|$)/g)]
  const lastSentenceEnd = sentenceMatches.at(-1)?.index
  const sentenceSafe = lastSentenceEnd !== undefined
    ? wordSafe.slice(0, lastSentenceEnd + 1)
    : wordSafe

  let clean = sentenceSafe
    .replace(/[\s,;:–—-]+$/u, '')
    .trimEnd()

  // Evita entregar etiquetas técnicas sin su valor después del corte.
  const incompleteTechnicalEnding = /(?:\s*[(,;:–—-]?\s*)\b(?:seña|precio|valor)\s*:?[\s]*(?:USD|ARS|\$)?$/iu
  clean = clean.replace(incompleteTechnicalEnding, '').replace(/[\s,;:–—-]+$/u, '').trimEnd()

  return clean || wordSafe.replace(/[\s,;:–—-]+$/u, '').trimEnd()
}

function compactCompleteCta(value: string, limit: number, channel?: string | null): string {
  if (value.length <= limit) return value

  const wordSafe = truncateAtWord(value.trim(), limit)
  const completeSentences = [...wordSafe.matchAll(/[.?!](?=\s|$)/g)]
  const lastSentenceEnd = completeSentences.at(-1)?.index
  if (lastSentenceEnd !== undefined) {
    const completePrefix = wordSafe.slice(0, lastSentenceEnd + 1).trim()
    const channelPatterns: Record<string, RegExp> = {
      whatsapp:   /whatsapp/iu,
      bio:        /(?:link|enlace).{0,12}bio|bio.{0,12}(?:link|enlace)/iu,
      comentario: /coment/iu,
      dm:         /(?:\bdm\b|mensaje directo)/iu,
      formulario: /formular/iu,
    }
    const channelPattern = channel ? channelPatterns[channel] : undefined
    if (!channelPattern || channelPattern.test(completePrefix)) return completePrefix
  }

  const keyword = value.match(/coment(?:á|a)\s+([\p{L}\p{N}_-]+)/iu)?.[1]
  const fallbacks: Record<string, string> = {
    whatsapp:   'Escribinos por WhatsApp y te enviamos toda la información.',
    bio:        'Encontrá toda la información en el link de la bio.',
    comentario: keyword
      ? `Comentá ${keyword} y te enviamos toda la información.`
      : 'Comentá y te enviamos toda la información.',
    dm:         'Mandanos un DM y te enviamos toda la información.',
    formulario: 'Completá el formulario para recibir toda la información.',
  }
  const fallback = channel ? fallbacks[channel] : undefined
  if (fallback && fallback.length <= limit) return fallback

  return 'Escribinos y te enviamos toda la información.'
}

// ─── CarruselParams ───────────────────────────────────────────────────────────

interface CarruselParams {
  salida:               Salida
  niche:                Niche
  vertical?:            Vertical
  carpeta:              string
  clientOnboarding:     ClientOnboarding | null
  nicheContextText:     string
  clientProfileContext: string
  kbContext:            string
  tiktokContext:        string
  hookContext:          string
  mesAnio:              string
  pieceIndex:           number
  totalPieces:          number
  usedTemas:            TemaCarrusel[]
  temaAsignado:         TemaCarrusel
  usedAngulos:          string[]
  estructuraForzada?:   EstructuraNarrativa
  usedHookTypes?:       string[]
  vozSlug?:             string    // slug del cliente para voz personalizada (ej: 'montania_viva')
}

// ─── Shared context block ─────────────────────────────────────────────────────

function buildSalidaBlock(salida: Salida): string {
  const lines = [
    `- Nombre: ${salida.nombre}`,
    `- Destino: ${salida.destino}`,
    `- Fecha: ${formatFechaSalida(salida.fecha_inicio, salida.fecha_fin)}`,
    `- Nivel: ${salida.nivel}`,
    `- Tipo: ${salida.tipo_viaje.replace(/_/g, ' ')}`,
  ]
  if (salida.itinerario)    lines.push(`- Itinerario: ${salida.itinerario}`)
  if (salida.precio_usd)    lines.push(`- Precio: USD ${salida.precio_usd}${salida.sena_usd ? ` (seña: USD ${salida.sena_usd})` : ''}`)
  if (salida.cupos)         lines.push(`- Cupos: ${salida.cupos}`)
  if (salida.que_incluye)   lines.push(`- Incluye (EXACTO — no agregues ni quites nada): ${salida.que_incluye}`)
  if (salida.que_no_incluye) lines.push(`- No incluye: ${salida.que_no_incluye}`)
  if (salida.link_inscripcion) lines.push(`- Link inscripción: ${salida.link_inscripcion}`)
  return lines.join('\n')
}

function buildToneSection(p: CarruselParams): string {
  const ctaReminder    = p.clientOnboarding?.embudo_paso ? `\n${EMBUDO_CTA_MAP[p.clientOnboarding.embudo_paso] ?? ''}` : ''
  const lineasRojas    = p.clientOnboarding?.marca_lineas_rojas ?? ''
  const prohibePrecio  = lineasRojas && /precio|plata|dinero|tarif/i.test(lineasRojas)
  const lineasRojasNote = prohibePrecio
    ? `\n⛔ LÍNEA ROJA: No menciones precios, montos ni tarifas. Si el tema es logística, derivá al canal de conversión sin revelar precio.`
    : ''
  return `=== JERARQUÍA DE TONO ===
1. VOZ DE MARCA (si está en el perfil del cliente): define CÓMO suena. Prioridad máxima.
2. NICHO (${p.niche.toUpperCase()}): define vocabulario técnico y tipo de contenido. No pisa la voz.
3. Conflicto → la voz del cliente gana en tono; el nicho aporta el mundo temático.
NUNCA sonar a folleto publicitario.${ctaReminder}${lineasRojasNote}`
}

const EDITORIAL_VERACITY_RULES = `=== REGLA DURA DE VERACIDAD ===
Prohibido inventar disponibilidad, urgencia o escasez ('pocos cupos', 'cupos limitados', 'últimos lugares') salvo que la salida tenga ese dato cargado explícitamente. Prohibido inventar datos técnicos, certificaciones o características que no estén en los datos de la salida. Si un dato no está, no se menciona.`

// ─── Step 1: Hook ─────────────────────────────────────────────────────────────

function buildStep1Prompt(p: CarruselParams, ctx: ReturnType<typeof loadCarruselContext>): string {
  const ctxBlock = contextToPromptBlock(ctx, /* includeAntiPatterns */ false)

  const variacionSection = p.totalPieces > 1
    ? `\nEsta es la pieza ${p.pieceIndex + 1} de ${p.totalPieces} carruseles en este lote.`
    : ''

  const angulosUsadosSection = p.usedAngulos.length > 0
    ? `\n──────────────────────────────────────────
ÁNGULOS YA USADOS EN ESTE LOTE (no repitas el mismo discurso ni vocabulario)
──────────────────────────────────────────
${p.usedAngulos.map((a, i) => `  ${i + 1}. "${a}"`).join('\n')}
El ángulo de ESTA pieza tiene que ser COMPLETAMENTE DISTINTO — ninguna palabra clave repetida.`
    : ''

  const hookTypes = ['pregunta retórica', 'afirmación audaz', 'ironía', 'dato concreto', 'contraste', 'objeción directa']
  const usedHookTypes = p.usedHookTypes ?? []
  const hookVariedadSection = p.totalPieces > 1
    ? `\n──────────────────────────────────────────
VARIEDAD DE HOOKS (OBLIGATORIO en lotes)
──────────────────────────────────────────
Los hooks de portada del lote NO pueden ser todos preguntas retóricas.
Tipos disponibles: ${hookTypes.join(' · ')}
${usedHookTypes.length > 0 ? `Tipos ya usados: ${usedHookTypes.join(', ')} — NO uses estos.` : ''}
Elegí un tipo diferente a los ya usados. Declaralo en "hook_type".`
    : ''

  const preparacionFisicaNote = p.temaAsignado === 'preparacion_fisica'
    ? `\n⛔ TEMA PREPARACIÓN FÍSICA — ÁNGULO PROHIBIDO: No hables de condición física como barrera de entrada. No uses ninguna variante de '¿sos atleta?', 'no necesitás ser experto', 'adaptamos el ritmo', 'niveles para todos'. Ese ángulo está agotado.\nEn cambio, elegí UNO de estos ángulos alternativos:\n- Preparación mental: el mindset para la montaña, el miedo, la incertidumbre\n- Qué llevar: el equipo correcto como diferencia entre disfrutar y sufrir\n- El ritmo del grupo: cómo funciona una expedición grupal real\n- La logística previa: qué hacer las semanas antes de la salida\n- Los errores que arruinan la experiencia (que no son físicos)`
    : ''

  const estructuraSection = p.estructuraForzada
    ? `ESTRUCTURA (OBLIGATORIA — asignada por el sistema): ${p.estructuraForzada}
${ESTRUCTURA_DESCRIPTIONS[p.estructuraForzada]}
No podés elegir otra — indicá "${p.estructuraForzada}" en "estructura_narrativa".`
    : `ESTRUCTURA: elegí la que mejor se adapte al tema y la salida.
Opciones:
${(Object.entries(ESTRUCTURA_DESCRIPTIONS) as [EstructuraNarrativa, string][]).map(([e, d]) => `  - ${e}: ${d}`).join('\n')}`

  const verticalSection = p.vertical
    ? `\nContexto vertical: ${VERTICAL_LABELS[p.vertical]} (informativo).`
    : ''

  return `${p.nicheContextText}

${ctxBlock}

${p.clientProfileContext}
${buildToneSection(p)}

=== DATOS DE LA SALIDA ===
${buildSalidaBlock(p.salida)}

${EDITORIAL_VERACITY_RULES}

=== MATERIAL DISPONIBLE ===
Carpeta: "${p.carpeta}"

${p.kbContext ? p.kbContext + '\n' : ''}${p.tiktokContext ? p.tiktokContext + '\n' : ''}${p.hookContext ? p.hookContext + '\n' : ''}
=== PIEZA ${p.pieceIndex + 1}/${p.totalPieces}${verticalSection} ===
TEMA: ${p.temaAsignado}
${TEMA_DESCRIPTIONS[p.temaAsignado]}${preparacionFisicaNote}
${variacionSection}${angulosUsadosSection}${hookVariedadSection}

${estructuraSection}

=== PASO 1: SOLO EL SLIDE DE PORTADA ===
Generá únicamente el slide 1 (portada).
Un hook que frene el scroll — conversacional, que suene a persona real.
No presentés el tema, no informés, no vendás. Solo enganchá.
También definí el ángulo del carrusel (columna vertebral temática, una oración).

Límites de texto — REGLAS DURAS (contá los caracteres antes de escribir):
- pill_text: null en portada (casi siempre)
- texto_principal: máximo ${LIMITS.texto_principal} caracteres. La idea tiene que ser COMPLETA dentro del límite. Prohibido que la frase se corte a mitad. Si no entra, reescribila más corta.
- texto_apoyo: null en portada (casi siempre)
- angulo: máximo ${LIMITS.angulo} caracteres. Una oración completa, no la cortes.

Respondé ÚNICAMENTE con JSON válido:
{
  "angulo": "idea central del carrusel (máx. ${LIMITS.angulo} chars, oración completa)",
  "estructura_narrativa": "una de: storytelling|problema_solucion|mito_vs_realidad|lista_tips|antes_despues|paso_a_paso|pregunta_respuesta",
  "hook_type": "tipo de hook elegido",
  "slide": {
    "n_slide": 1,
    "rol": "portada",
    "pill_text": null,
    "texto_principal": "hook que frena el scroll (máx. ${LIMITS.texto_principal} chars, idea completa)",
    "texto_apoyo": null,
    "indicacion_imagen": "descripción de la imagen ideal"
  }
}`
}

// ─── Step 2: Desarrollo ───────────────────────────────────────────────────────

function buildStep2Prompt(
  p:          CarruselParams,
  ctx:        ReturnType<typeof loadCarruselContext>,
  slide1:     SlideCarrusel,
  angulo:     string,
  estructura: EstructuraNarrativa,
): string {
  const ctxBlock = contextToPromptBlock(ctx, /* includeAntiPatterns */ true)

  const pillGuidance = getPillGuidance(estructura)

  const tonoConsistenteNote = `📐 REGLA DE TONO: el tono del slide de portada define el tono de TODOS los slides. Si el hook es conversacional e irónico, los slides de desarrollo tienen que serlo también. Si el hook habla de igual a igual, el desarrollo no puede sonar a folleto. Revisá cada slide: ¿suena como la continuación natural del hook?`

  return `${p.nicheContextText}

${ctxBlock}

${p.clientProfileContext}
${buildToneSection(p)}

=== SLIDE 1 — PORTADA (YA GENERADA) ===
Ángulo del carrusel: "${angulo}"
Estructura elegida: ${estructura} — ${ESTRUCTURA_DESCRIPTIONS[estructura]}

Hook generado:
${JSON.stringify(slide1, null, 2)}

=== DATOS DE LA SALIDA ===
${buildSalidaBlock(p.salida)}

${EDITORIAL_VERACITY_RULES}

=== PASO 2: SLIDES DE DESARROLLO (2, 3 y 4) ===
Tu única tarea es continuar el tono de la portada.
${tonoConsistenteNote}

⛔ FORMATO: solo texto plano. Prohibido usar backticks (\`), asteriscos (*), guiones bajos (_), almohadillas (#) o cualquier otro símbolo de markdown. Los valores del JSON tienen que ser strings de texto limpio, sin formato.

Tema: ${p.temaAsignado} — ${TEMA_DESCRIPTIONS[p.temaAsignado]}
Estructura: ${estructura} — ${ESTRUCTURA_DESCRIPTIONS[estructura]}

${pillGuidance}

Límites por slide — REGLAS DURAS (contá los caracteres antes de escribir):
- pill_text: máximo ${LIMITS.pill_text} caracteres, EN MAYÚSCULAS. Dejalo null si el copy solo es suficiente. Si usás pill, que sea una palabra o frase muy corta que entre completa.
- texto_principal: máximo ${LIMITS.texto_principal} caracteres. La idea tiene que ser COMPLETA dentro del límite. Prohibido que la frase se corte a mitad. Si no entra, reescribila más corta.
- texto_apoyo: máximo ${LIMITS.texto_apoyo} caracteres o null. Tiene que ser una idea COMPLETA. Si no entra completa, reescribila más corta o dejá null.
- indicacion_imagen: 1-2 oraciones para el diseñador.

Respondé ÚNICAMENTE con JSON válido:
{
  "slides": [
    { "n_slide": 2, "rol": "desarrollo", "pill_text": null, "texto_principal": "...", "texto_apoyo": "...", "indicacion_imagen": "..." },
    { "n_slide": 3, "rol": "desarrollo", "pill_text": null, "texto_principal": "...", "texto_apoyo": "...", "indicacion_imagen": "..." },
    { "n_slide": 4, "rol": "desarrollo", "pill_text": null, "texto_principal": "...", "texto_apoyo": "...", "indicacion_imagen": "..." }
  ]
}`
}

function getPillGuidance(estructura: EstructuraNarrativa): string {
  switch (estructura) {
    case 'mito_vs_realidad':
      return `pill_text sugerido: "EL MITO" (slide del mito) / "LA REALIDAD" (slide de la verdad). Muy efectivo en esta estructura.`
    case 'lista_tips':
    case 'paso_a_paso':
      return `pill_text sugerido: "TIP CLAVE" / "LO QUE SÍ SIRVE" / "PASO 1", "PASO 2"... Enumerar con pill ayuda al lector.`
    case 'pregunta_respuesta':
      return `pill_text sugerido: la pregunta en pill, la respuesta en texto_principal. Usalo con criterio — no repitas la misma pill.`
    default:
      return `pill_text: usalo solo si agrega valor. En storytelling y problema_solucion generalmente es null.`
  }
}

// ─── Step 3: Cierre ───────────────────────────────────────────────────────────

function buildStep3Prompt(
  p:          CarruselParams,
  ctx:        ReturnType<typeof loadCarruselContext>,
  slides:     SlideCarrusel[],
  angulo:     string,
  estructura: EstructuraNarrativa,
): string {
  const ctaReminder    = p.clientOnboarding?.embudo_paso ? `\n${EMBUDO_CTA_MAP[p.clientOnboarding.embudo_paso] ?? ''}` : ''
  const lineasRojas    = p.clientOnboarding?.marca_lineas_rojas ?? ''
  const prohibePrecio  = lineasRojas && /precio|plata|dinero|tarif/i.test(lineasRojas)
  const lineasRojasNote = prohibePrecio
    ? `\n⛔ LÍNEA ROJA: No menciones precios, montos ni tarifas.`
    : ''

  const fechasCierreNote = `📅 FIDELIDAD DE DATOS EN EL CIERRE:
- Fechas: usá EXACTAMENTE la fecha que figura en los datos. Nunca cambies el año. Si dice '27 de diciembre de 2026 al 2 de enero de 2027', escribí exactamente eso.
- Duración: usá el texto exacto de la salida. No recalcules días ni noches. Si dice '6 noches', escribí '6 noches', no '7 días'. Si dice '27/12 al 2/1', no lo conviertas a días.
- Precio: transcribí el precio exacto. No lo aproximes ni lo reformules.
Prohibido interpretar, redondear o reescribir estos datos.`

  const antiPatternsBlock = ctx.antiPatternsText
    ? `=== PROHIBICIONES ===\n${ctx.antiPatternsText}\n\n`
    : ''

  return `${antiPatternsBlock}${p.clientProfileContext}
=== SLIDES 1-4 (YA GENERADOS) ===
Ángulo del carrusel: "${angulo}"
Estructura: ${estructura}

${JSON.stringify(slides, null, 2)}

=== DATOS EXACTOS DE LA SALIDA ===
⚠️ FIDELIDAD CRÍTICA: usá estos datos EXACTAMENTE como están. Prohibido inventar, aproximar o cambiar.
${buildSalidaBlock(p.salida)}

${EDITORIAL_VERACITY_RULES}

${fechasCierreNote}

=== PASO 3: SLIDE DE CIERRE (slide 5) ===
⛔ FORMATO: solo texto plano. Prohibido usar backticks (\`), asteriscos (*), guiones bajos (_), almohadillas (#) o cualquier otro símbolo de markdown. Los valores del JSON tienen que ser strings de texto limpio, sin formato.

Cerrá el carrusel con el mismo tono de los slides anteriores.
CTA claro, datos exactos, una sola acción.
El ángulo del cierre surge del hook — no puede ser genérico ni idéntico en distintos carruseles.${ctaReminder}${lineasRojasNote}

Estilo de lenguaje (OBLIGATORIO):
- Nunca usar @ ni x para lenguaje inclusivo (List@, Listx, Tod@s). Usar la forma masculina genérica: "Listo", "Preparado", "Sumate", "Todos".
- Siempre con signos de apertura y cierre en preguntas: ¿Listo? no Listo?.

Límites — REGLAS DURAS (contá los caracteres antes de escribir):
- pill_text: máximo ${LIMITS.pill_text} caracteres, EN MAYÚSCULAS (ej: "PRÓXIMAS FECHAS"). Que entre completo.
- subtitle_highlight: máximo ${LIMITS.pill_text} caracteres (segunda etiqueta apilada, opcional — null si no suma). Que entre completo.
- texto_principal: máximo ${LIMITS.texto_principal} caracteres. La idea tiene que ser COMPLETA dentro del límite. Prohibido que la frase se corte a mitad. Si no entra, reescribila más corta.
- texto_apoyo: máximo ${LIMITS.texto_apoyo} caracteres o null. Idea COMPLETA. Si no entra, reescribila más corta o dejá null.
- cta_comentario: OBLIGATORIO, nunca null, máximo ${LIMITS.cta_comentario} caracteres. Idea completa, no la cortes.

Respondé ÚNICAMENTE con JSON válido:
{
  "slide": {
    "n_slide": 5,
    "rol": "cierre",
    "pill_text": "PRÓXIMAS FECHAS",
    "subtitle_highlight": null,
    "texto_principal": "...",
    "texto_apoyo": "...",
    "indicacion_imagen": "..."
  },
  "cta_comentario": "..."
}`
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

function extractJson(text: string): unknown {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in response')
  return JSON.parse(match[0])
}

const VALID_ESTRUCTURAS = new Set<string>([
  'problema_solucion','lista_tips','storytelling','mito_vs_realidad',
  'antes_despues','paso_a_paso','pregunta_respuesta',
])

function parseSlide(
  raw:      Record<string, unknown>,
  nSlide:   number,
  rol:      RolSlide,
  exceeded: { value: boolean },
): SlideCarrusel {
  return {
    n_slide:            nSlide,
    rol,
    pill_text:          raw.pill_text
                          ? truncate(String(raw.pill_text).toUpperCase(), LIMITS.pill_text, `slide[${nSlide}].pill_text`, exceeded)
                          : null,
    subtitle_highlight: raw.subtitle_highlight
                          ? truncate(String(raw.subtitle_highlight).toUpperCase(), LIMITS.pill_text, `slide[${nSlide}].subtitle_highlight`, exceeded)
                          : null,
    texto_principal:    truncate(String(raw.texto_principal ?? ''), LIMITS.texto_principal, `slide[${nSlide}].texto_principal`, exceeded),
    texto_apoyo:        raw.texto_apoyo
                          ? truncate(String(raw.texto_apoyo), LIMITS.texto_apoyo, `slide[${nSlide}].texto_apoyo`, exceeded)
                          : null,
    indicacion_imagen:  String(raw.indicacion_imagen ?? ''),
  }
}

function parseStep1(
  text:              string,
  estructuraForzada?: EstructuraNarrativa,
): { slide: SlideCarrusel; angulo: string; estructura_narrativa: EstructuraNarrativa; hook_type: string | null; hadTruncation: boolean } {
  const raw      = extractJson(text) as Record<string, unknown>
  const exceeded = { value: false }

  const estructura: EstructuraNarrativa = estructuraForzada
    ?? (VALID_ESTRUCTURAS.has(String(raw.estructura_narrativa))
      ? raw.estructura_narrativa as EstructuraNarrativa
      : 'storytelling')

  const slideRaw = (raw.slide ?? {}) as Record<string, unknown>
  const slide    = parseSlide(slideRaw, 1, 'portada', exceeded)

  const angulo   = truncate(String(raw.angulo ?? ''), LIMITS.angulo, 'step1.angulo', exceeded)

  return {
    slide,
    angulo,
    estructura_narrativa: estructura,
    hook_type:            raw.hook_type ? String(raw.hook_type) : null,
    hadTruncation:        exceeded.value,
  }
}

function parseStep2(
  text: string,
): { slides: SlideCarrusel[]; hadTruncation: boolean } {
  const raw      = extractJson(text) as Record<string, unknown>
  const exceeded = { value: false }

  let rawSlides: unknown[]
  if (Array.isArray(raw.slides)) {
    rawSlides = raw.slides
  } else if (raw.slides && typeof raw.slides === 'object') {
    rawSlides = Object.values(raw.slides as Record<string, unknown>)
    console.warn(`[CARRUSEL] paso2 — slides llegó como objeto, recuperados ${rawSlides.length} items`)
  } else {
    throw new Error('Step 2: slides missing or invalid')
  }

  const slides: SlideCarrusel[] = rawSlides
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s, i) => parseSlide(s, i + 2, 'desarrollo', exceeded))

  if (slides.length === 0) throw new Error('Step 2: no slides parsed')

  return { slides, hadTruncation: exceeded.value }
}

function parseStep3(
  text:       string,
  tema:       TemaCarrusel,
  pieceIndex: number,
  ctaChannel?: string | null,
): { slide: SlideCarrusel; cta_comentario: string; hadTruncation: boolean } {
  const raw      = extractJson(text) as Record<string, unknown>
  const exceeded = { value: false }

  const slideRaw = (raw.slide ?? {}) as Record<string, unknown>
  const slide    = parseSlide(slideRaw, 5, 'cierre', exceeded)

  const ctaValue = raw.cta_comentario ? String(raw.cta_comentario) : null
  const ctaRaw = ctaValue
    ? (() => {
        if (ctaValue.length <= LIMITS.cta_comentario) return ctaValue
        exceeded.value = true
        const compact = compactCompleteCta(ctaValue, LIMITS.cta_comentario, ctaChannel)
        console.warn(`[CARRUSEL] step3.cta_comentario excede ${LIMITS.cta_comentario} chars (${ctaValue.length}) → CTA completo reducido a ${compact.length} chars`)
        return compact
      })()
    : null

  if (!ctaRaw) {
    console.warn(`[CARRUSEL] paso3 — cta_comentario null, usando default para tema "${tema}"`)
  }

  return {
    slide,
    cta_comentario: ctaRaw ?? getCtaDefault(tema, pieceIndex),
    hadTruncation:  exceeded.value,
  }
}

// ─── Step runner ──────────────────────────────────────────────────────────────

async function runStep<T extends { hadTruncation: boolean }>(
  label:   string,
  prompt:  string,
  parseFn: (text: string) => T,
): Promise<T & { inputTokens: number; outputTokens: number }> {
  const tracked1 = await generateWithRetryTracked(prompt, `${label} [1]`)
  let totalIn  = tracked1.inputTokens
  let totalOut = tracked1.outputTokens
  let r1: T | null = null
  try {
    r1 = parseFn(tracked1.text)
    if (!r1.hadTruncation) return { ...r1, inputTokens: totalIn, outputTokens: totalOut }
    console.warn(`[CARRUSEL] ${label} — truncación detectada en intento 1, reintentando`)
  } catch (e) {
    console.warn(`[CARRUSEL] ${label} — parse error en intento 1, reintentando:`, e)
  }
  const tracked2 = await generateWithRetryTracked(prompt, `${label} [2]`)
  totalIn  += tracked2.inputTokens
  totalOut += tracked2.outputTokens
  return { ...parseFn(tracked2.text), inputTokens: totalIn, outputTokens: totalOut }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateCarrusel(p: CarruselParams): Promise<GeneratedCarrusel & { hook_type: string | null; _inputTokens: number; _outputTokens: number; _costUsd: number }> {
  const label = `carrusel[${p.pieceIndex + 1}/${p.totalPieces}] tema=${p.temaAsignado}`

  // Cargar contexto de knowledge base desde las capas nuevas
  const ctx = loadCarruselContext({
    niche: p.niche,
    tema: p.temaAsignado,
    formatoCarrusel: 'editorial',
    vozSlug: p.vozSlug,
  })

  console.log(`[CARRUSEL] Iniciando pipeline 3 pasos — ${label}`)
  console.log(`[CARRUSEL] Contexto cargado: lineamiento=${ctx.lineamentoText ? 'sí' : 'no'} | mundo=${ctx.mundoText ? 'sí' : 'no'} | patrones=${ctx.patronesText ? 'sí' : 'no'} | voz=${ctx.vozText ? 'sí' : 'no'} | formato=${ctx.formatoText ? 'sí' : 'no'} | tema=${ctx.temaText ? 'sí' : 'no'}`)

  if (p.pieceIndex === 0) {
    const p1 = buildStep1Prompt(p, ctx)
    console.log(`[CARRUSEL] PROMPT PASO 1 (primera pieza)\n${'─'.repeat(80)}\n${p1}\n${'─'.repeat(80)}\n`)
  }

  // ── Paso 1: Hook ────────────────────────────────────────────────────────────
  const step1 = await runStep(
    `${label} paso=1`,
    buildStep1Prompt(p, ctx),
    (text) => parseStep1(text, p.estructuraForzada),
  )
  console.log(`[CARRUSEL] ✓ paso=1 | angulo="${step1.angulo.slice(0, 60)}..." | estructura=${step1.estructura_narrativa} | hook_type=${step1.hook_type}`)

  // ── Paso 2: Desarrollo ──────────────────────────────────────────────────────
  const step2 = await runStep(
    `${label} paso=2`,
    buildStep2Prompt(p, ctx, step1.slide, step1.angulo, step1.estructura_narrativa),
    parseStep2,
  )
  console.log(`[CARRUSEL] ✓ paso=2 | slides=${step2.slides.length}`)

  // ── Paso 3: Cierre ──────────────────────────────────────────────────────────
  const slides1to4 = [step1.slide, ...step2.slides]
  const step3 = await runStep(
    `${label} paso=3`,
    buildStep3Prompt(p, ctx, slides1to4, step1.angulo, step1.estructura_narrativa),
    (text) => parseStep3(text, p.temaAsignado, p.pieceIndex, p.clientOnboarding?.embudo_paso),
  )
  console.log(`[CARRUSEL] ✓ paso=3 | cta="${step3.cta_comentario}"`)

  // ── Ensamblar ────────────────────────────────────────────────────────────────
  const allSlides = [...slides1to4, step3.slide]
  console.log(`[CARRUSEL] ✓ ${label} completado | slides=${allSlides.length} | estructura=${step1.estructura_narrativa}`)

  const totalIn  = step1.inputTokens + step2.inputTokens + step3.inputTokens
  const totalOut = step1.outputTokens + step2.outputTokens + step3.outputTokens
  const costUsd  = (totalIn / 1_000_000) * INPUT_PER_1M + (totalOut / 1_000_000) * OUTPUT_PER_1M
  console.log(`[COSTO] ${label} | in=${totalIn} out=${totalOut} tokens | USD ${costUsd.toFixed(4)}`)

  return {
    formato:              'carrusel',
    ...(p.vertical && { vertical: p.vertical }),
    tema:                 p.temaAsignado,
    estructura_narrativa: step1.estructura_narrativa,
    cantidad_slides:      allSlides.length,
    angulo:               step1.angulo,
    slides:               allSlides,
    cta_comentario:       step3.cta_comentario,
    carpeta_material:     p.carpeta,
    mes:                  p.mesAnio,
    hook_type:            step1.hook_type,
    _inputTokens:         totalIn,
    _outputTokens:        totalOut,
    _costUsd:             costUsd,
  }
}
