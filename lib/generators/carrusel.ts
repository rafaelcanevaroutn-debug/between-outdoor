import type {
  Salida, Niche, Vertical, TemaCarrusel, EstructuraNarrativa, RolSlide,
  SlideCarrusel, GeneratedCarrusel, ClientOnboarding,
} from '@/types'
import { VERTICAL_LABELS } from '@/lib/verticals'
import { generateWithRetry } from '@/lib/gemini-core'
import { formatFechaSalida } from '@/lib/utils/dates'

// ─── Labels ───────────────────────────────────────────────────────────────────

export const TEMA_LABELS: Record<TemaCarrusel, string> = {
  seguridad:         'Seguridad y prevención',
  destinos:          'Destinos y rutas',
  preparacion_fisica:'Preparación física',
  equipo:            'Equipo y gear',
  educacion_montana: 'Educación de montaña',
  testimonios:       'Testimonios y transformaciones',
  detras_del_guia:   'Detrás del guía',
  motivacion:        'Motivación e inspiración',
  logistica:         'Logística del servicio',
  dudas_objeciones:  'Dudas y objeciones',
  bienestar:         'Bienestar y salud en la montaña',
}

const TEMA_DESCRIPTIONS: Record<TemaCarrusel, string> = {
  seguridad:         'Riesgos, decisiones críticas en montaña, cuándo dar media vuelta, por qué ir con guía certificado.',
  destinos:          'Características del lugar, paisaje, dificultad del terreno, logística, qué hace único a este destino.',
  preparacion_fisica:'Qué condición física se necesita, cómo entrenar para la salida, errores de preparación comunes.',
  equipo:            'Qué llevar, qué no llevar, errores de equipamiento, diferencias entre opciones, por qué importa cada item.',
  educacion_montana: 'Conceptos técnicos, lectura del clima, orientación, terminología del deporte, conocimiento que marca la diferencia.',
  testimonios:       'Experiencias reales de participantes anteriores, historias de cambio personal, transformaciones que generó la salida. Fusiona lo que antes era "prueba_social" y "transformacion".',
  detras_del_guia:   'Quién es el guía, su filosofía, su trayectoria, su historia, qué lo hace diferente. Fusiona lo que antes era "autoridad".',
  motivacion:        'Por qué salir, por qué moverse, qué cambia en vos cuando te movés en la naturaleza, inspiración. Fusiona lo que antes era "aspiracional".',
  logistica:         'Cómo inscribirse, qué incluye la salida, cómo prepararse, precios, cupos, fechas, detalles operativos.',
  dudas_objeciones:  'Responder las dudas reales que frenan al cliente: "es muy difícil para mí", "es caro", "no tengo experiencia". Fusiona lo que antes era "objeciones".',
  bienestar:         'Bienestar físico y mental en la montaña, desconexión, naturaleza como terapia, salud holística. Fusiona lo que antes era "salud_mental".',
}

const ESTRUCTURA_DESCRIPTIONS: Record<EstructuraNarrativa, string> = {
  problema_solucion: 'Planteás un problema real del lector (portada), lo desarrollás (desarrollo), ofrecés la salida como solución (cierre).',
  lista_tips:        'Enumerás consejos prácticos accionables, uno por slide de desarrollo. Ideal para "lo que nadie te dice".',
  storytelling:      'Contás una historia con tensión y resolución emocional — contada A TRAVÉS de los slides, como escenas. Portada: la escena inicial que engancha. Desarrollo: la tensión, el nudo, lo que ocurrió. Cierre: la resolución emocional. SIEMPRE en el array de slides — nunca en texto libre ni en formato titulo/bullets.',
  mito_vs_realidad:  'Desmontás una creencia falsa slide a slide: mito → realidad. Ideal para romper objeciones y prejuicios.',
  antes_despues:     'Mostrás un estado inicial (dolor, limitación, miedo) y un estado final (logro, transformación, libertad).',
  paso_a_paso:       'Guiás al lector por un proceso secuencial claro. Cada slide de desarrollo es un paso concreto.',
  pregunta_respuesta:'Formulás preguntas reales que tiene el lector y las respondés una a una. El lector se siente visto.',
}

const EMBUDO_CTA_MAP: Record<string, string> = {
  whatsapp:   'El CTA debe invitar a escribir por WhatsApp directo.',
  bio:        'El CTA debe dirigir al link en bio.',
  comentario: 'El CTA debe pedir que comenten en el post.',
  dm:         'El CTA debe pedir un DM de Instagram.',
  formulario: 'El CTA debe dirigir a completar un formulario web.',
}

// ─── CTA default pool por tema ────────────────────────────────────────────────
// Cuando el modelo devuelve cta_comentario null, se usa uno de estos por tema.
// Se elige según pieceIndex para no repetir el mismo en un lote.

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

// ─── Truncation with warning ───────────────────────────────────────────────────

function truncate(value: string, limit: number, field: string): string {
  if (value.length <= limit) return value
  const cut = value.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  const clean = lastSpace > 0 ? cut.slice(0, lastSpace) : cut
  console.warn(`[CARRUSEL] ${field} excede ${limit} chars (${value.length}) — truncado a "${clean}"`)
  return clean
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

interface CarruselParams {
  salida:              Salida
  niche:               Niche
  vertical?:           Vertical
  carpeta:             string
  clientOnboarding:    ClientOnboarding | null
  nicheContextText:    string
  clientProfileContext: string
  kbContext:           string
  tiktokContext:       string
  hookContext:         string
  mesAnio:             string
  pieceIndex:          number
  totalPieces:         number
  usedTemas:           TemaCarrusel[]   // kept for logging; tema real viene de temaAsignado
  temaAsignado:        TemaCarrusel     // tema pre-asignado por el dispatcher — no negociable
  usedAngulos:         string[]         // ángulos ya usados en el lote (evitar vocabulario repetido)
}

function buildCarruselPrompt(p: CarruselParams): string {
  const ctaReminder = p.clientOnboarding?.embudo_paso
    ? `\n${EMBUDO_CTA_MAP[p.clientOnboarding.embudo_paso] ?? ''}`
    : ''

  const lineasRojas = p.clientOnboarding?.marca_lineas_rojas ?? ''
  const prohibePrecio = lineasRojas && /precio|plata|dinero|tarif/i.test(lineasRojas)
  const lineasRojasNote = prohibePrecio
    ? `\n⛔ LÍNEA ROJA: No menciones precios, montos ni tarifas. Si el tema es logística, derivá al canal de conversión sin revelar precio.`
    : ''

  const verticalSection = p.vertical
    ? `\nContexto vertical: ${VERTICAL_LABELS[p.vertical]} (informativo — el organizador principal es el tema asignado).`
    : ''

  const variacionSection = p.totalPieces > 1
    ? `\nEsta es la pieza ${p.pieceIndex + 1} de ${p.totalPieces} carruseles en este lote.`
    : ''

  const angulosUsadosSection = p.usedAngulos.length > 0
    ? `\n──────────────────────────────────────────\nÁNGULOS YA USADOS EN ESTE LOTE (no repitas el mismo discurso ni vocabulario)\n──────────────────────────────────────────\n${p.usedAngulos.map((a, i) => `  ${i + 1}. "${a}"`).join('\n')}\nEl ángulo de ESTA pieza tiene que ser COMPLETAMENTE DISTINTO en idea central y vocabulario — ninguna palabra clave repetida.`
    : ''

  const estructuraList = (Object.keys(ESTRUCTURA_DESCRIPTIONS) as EstructuraNarrativa[])
    .map(e => `  - ${e}: ${ESTRUCTURA_DESCRIPTIONS[e]}`)
    .join('\n')

  return `${p.nicheContextText}

${p.clientProfileContext}=== TU TAREA: CARRUSEL DE INSTAGRAM ===
${verticalSection}${variacionSection}${angulosUsadosSection}

──────────────────────────────────────────
EJE 1 — TEMA (YA ASIGNADO — no lo cambies)
──────────────────────────────────────────
TEMA: ${p.temaAsignado}
Descripción: ${TEMA_DESCRIPTIONS[p.temaAsignado]}

Este tema fue asignado por el sistema para garantizar variedad en el lote. No podés usar otro — todo el carrusel gira alrededor de este tema. Indicá "${p.temaAsignado}" en el campo "tema" del JSON.

──────────────────────────────────────────
EJE 2 — ESTRUCTURA NARRATIVA (elegí UNA)
──────────────────────────────────────────
${estructuraList}

Elegí la estructura que mejor se adapte al tema asignado y a la salida. Indicá tu elección en "estructura_narrativa" del JSON.

──────────────────────────────────────────
CANTIDAD DE SLIDES
──────────────────────────────────────────
Decidís vos entre 4 y 6:
- 4 slides → estructuras cortas y contundentes (mito_vs_realidad, antes_despues simple)
- 5 slides → el estándar (problema_solucion, storytelling, pregunta_respuesta)
- 6 slides → cuando la narrativa lo justifica (paso_a_paso con pasos concretos, lista_tips extensa)
Indicalo en "cantidad_slides".

──────────────────────────────────────────
ROLES DE SLIDES
──────────────────────────────────────────
- portada    → siempre el slide 1. Hook que frena el scroll. Intriga, no presenta.
- desarrollo → slides intermedios. Avanzan la narrativa o el argumento.
- cierre     → siempre el último. Resolución emocional + llamado a la acción.

──────────────────────────────────────────
LÍMITES DE TEXTO (el template no tiene scroll — la idea tiene que cerrar completa)
──────────────────────────────────────────
- texto_principal: apuntá a 55-60 caracteres. Límite absoluto: 72. La idea tiene que cerrar completa dentro del espacio — nunca terminar en una palabra cortada ni en una oración abierta.
- texto_apoyo:     apuntá a 100-110 caracteres. Límite absoluto: 140. Terminá la oración antes de llegar al tope. Puede ser null si el slide no lo necesita.
- indicacion_imagen: 1-2 oraciones describiendo la imagen ideal para el diseñador/fotógrafo. Sin límite estricto.

──────────────────────────────────────────
ÁNGULO
──────────────────────────────────────────
"angulo": en 1 oración, apuntá a 80 caracteres. Límite absoluto: 100. Tiene que ser una oración completa que cierre bien — la columna vertebral temática que el lector se lleva. No es el título.

──────────────────────────────────────────
CTA DE COMENTARIO (OBLIGATORIO)
──────────────────────────────────────────
"cta_comentario": frase breve — SIEMPRE requerido, nunca null. Máx. 60 chars.
Invitá a comentar, guardar o preguntar algo relacionado al tema del carrusel.
Ejemplos: "¿Ya fuiste? Contanos abajo.", "¿Sabías esto? Comentá.", "Guardalo para tu próxima salida."

──────────────────────────────────────────
DATOS DE LA SALIDA
──────────────────────────────────────────
⚠️ FIDELIDAD DE DATOS (CRÍTICO): Usá los datos de abajo EXACTAMENTE como están. PROHIBIDO inventar, aproximar, combinar o cambiar fechas, precios, destino, nivel, qué incluye y qué no incluye. Si no sabés un dato, omitilo — nunca lo inventes. La fecha es la que figura abajo: si es un día, es un día; si es un rango, es ese rango exacto.

- Nombre: ${p.salida.nombre}
- Destino: ${p.salida.destino}
- Fecha: ${formatFechaSalida(p.salida.fecha_inicio, p.salida.fecha_fin)}
- Nivel: ${p.salida.nivel}
- Tipo: ${p.salida.tipo_viaje.replace(/_/g, ' ')}
${p.salida.itinerario ? `- Itinerario: ${p.salida.itinerario}` : ''}
${p.salida.que_incluye ? `- Incluye (EXACTO — no agregues ni quites nada): ${p.salida.que_incluye}` : '- Incluye: no especificado — no inventes lo que incluye'}
${p.salida.que_no_incluye ? `- No incluye (EXACTO — no modifiques): ${p.salida.que_no_incluye}` : ''}

=== MATERIAL DISPONIBLE ===
Carpeta: "${p.carpeta}"

${p.kbContext ? p.kbContext + '\n' : ''}${p.tiktokContext ? p.tiktokContext + '\n' : ''}${p.hookContext ? p.hookContext + '\n' : ''}
=== JERARQUÍA DE TONO ===
1. VOZ DE MARCA (si está en el perfil del cliente): define CÓMO suena. Prioridad máxima.
2. NICHO (${p.niche.toUpperCase()}): define vocabulario técnico y tipo de contenido. No pisa la voz.
3. Conflicto → la voz del cliente gana en tono; el nicho aporta el mundo temático.
NUNCA sonar a folleto publicitario.${ctaReminder}${lineasRojasNote}

⚠️ FORMATO OBLIGATORIO — APLICA A TODAS LAS ESTRUCTURAS SIN EXCEPCIÓN:
La respuesta SIEMPRE debe ser el JSON con el array "slides". Nunca uses "titulo", "subtitulo", "bullets" ni "cta" — ese esquema no existe aquí. Si elegiste storytelling, contá la historia A TRAVÉS de los slides (escena a escena), no en texto libre. La estructura narrativa define CÓMO avanza el contenido dentro de los slides, no el formato de respuesta.

=== RESPUESTA ===
Respondé ÚNICAMENTE con JSON válido, sin texto adicional antes ni después:

{
  "tema": "uno de los 11 temas listados",
  "estructura_narrativa": "una de las 7 estructuras listadas",
  "cantidad_slides": 4,
  "angulo": "idea central del carrusel (máx. 100 chars)",
  "cta_comentario": "frase breve OBLIGATORIA — nunca null (máx. 60 chars)",
  "slides": [
    {
      "n_slide": 1,
      "rol": "portada",
      "texto_principal": "máx. 72 chars — hook que frena el scroll",
      "texto_apoyo": null,
      "indicacion_imagen": "descripción para el diseñador"
    },
    {
      "n_slide": 2,
      "rol": "desarrollo",
      "texto_principal": "máx. 72 chars",
      "texto_apoyo": "máx. 140 chars o null",
      "indicacion_imagen": "descripción"
    },
    {
      "n_slide": 3,
      "rol": "desarrollo",
      "texto_principal": "máx. 72 chars",
      "texto_apoyo": "máx. 140 chars o null",
      "indicacion_imagen": "descripción"
    },
    {
      "n_slide": 4,
      "rol": "cierre",
      "texto_principal": "máx. 72 chars — resolución + CTA",
      "texto_apoyo": "máx. 140 chars o null",
      "indicacion_imagen": "descripción"
    }
  ]
}`
}

// ─── Response parser ───────────────────────────────────────────────────────────

function parseCarruselResponse(
  text: string,
  temaAsignado: TemaCarrusel,
  pieceIndex: number,
): {
  tema: TemaCarrusel
  estructura_narrativa: EstructuraNarrativa
  cantidad_slides: number
  angulo: string
  cta_comentario: string
  slides: SlideCarrusel[]
} {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in carrusel response')

  const raw = JSON.parse(jsonMatch[0])

  const validEstructuras = new Set<string>([
    'problema_solucion','lista_tips','storytelling','mito_vs_realidad',
    'antes_despues','paso_a_paso','pregunta_respuesta',
  ])
  const validRoles = new Set<string>(['portada', 'desarrollo', 'cierre'])

  // Tema: forzamos el asignado — si el modelo lo cambió, lo corregimos con warning
  const temaRaw = raw.tema as string
  if (temaRaw && temaRaw !== temaAsignado) {
    console.warn(`[CARRUSEL] Modelo cambió tema de "${temaAsignado}" a "${temaRaw}" — revertido`)
  }
  const tema = temaAsignado

  const estructura = validEstructuras.has(raw.estructura_narrativa)
    ? raw.estructura_narrativa as EstructuraNarrativa
    : 'storytelling'

  // slides puede venir como array (correcto) o como objeto con claves numéricas/nombradas
  // (Gemini a veces estructura storytelling como objeto en lugar de array)
  let rawSlides: unknown[]
  if (Array.isArray(raw.slides)) {
    rawSlides = raw.slides
  } else if (raw.slides && typeof raw.slides === 'object') {
    rawSlides = Object.values(raw.slides as Record<string, unknown>)
    console.warn(`[CARRUSEL] slides llegó como objeto (no array) — recuperados ${rawSlides.length} items con Object.values`)
  } else {
    rawSlides = []
    console.warn(`[CARRUSEL] slides null o tipo inesperado (${typeof raw.slides}) — rawSlides forzado a []`)
  }

  const slides: SlideCarrusel[] = rawSlides
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s, i) => ({
      n_slide:          typeof s.n_slide === 'number' ? s.n_slide : i + 1,
      rol:              validRoles.has(String(s.rol)) ? s.rol as RolSlide : 'desarrollo',
      texto_principal:  truncate(String(s.texto_principal ?? ''), 72, `slide[${i+1}].texto_principal`),
      texto_apoyo:      s.texto_apoyo ? truncate(String(s.texto_apoyo), 140, `slide[${i+1}].texto_apoyo`) : null,
      indicacion_imagen: String(s.indicacion_imagen ?? ''),
    }))

  // Force correct roles for first and last slides
  if (slides.length > 0) slides[0].rol = 'portada'
  if (slides.length > 1) slides[slides.length - 1].rol = 'cierre'

  // ── Recovery: Gemini devolvió formato legacy (titulo/subtitulo/bullets/cta) en lugar de slides ──
  // Ocurre con storytelling cuando el modelo "olvida" el schema. Convertimos en lugar de tirar.
  if (slides.length === 0 && (raw.titulo || raw.bullets)) {
    console.warn(`[CARRUSEL] Formato legacy detectado (titulo/bullets) — convirtiendo a slides`)
    const titulo     = String(raw.titulo     ?? '')
    const subtitulo  = String(raw.subtitulo  ?? '')
    const bullets    = Array.isArray(raw.bullets) ? (raw.bullets as unknown[]).map(b => String(b)) : []
    const cta        = String(raw.cta        ?? '')

    if (titulo) {
      slides.push({
        n_slide:          1,
        rol:              'portada',
        texto_principal:  truncate(titulo, 72, 'legacy.titulo'),
        texto_apoyo:      subtitulo ? truncate(subtitulo, 140, 'legacy.subtitulo') : null,
        indicacion_imagen: 'Imagen representativa del tema — foto del destino o del guía',
      })
    }
    bullets.forEach((bullet, i) => {
      slides.push({
        n_slide:          slides.length + 1,
        rol:              'desarrollo',
        texto_principal:  truncate(bullet, 72, `legacy.bullet[${i}]`),
        texto_apoyo:      null,
        indicacion_imagen: 'Imagen que ilustre este punto',
      })
    })
    if (slides.length > 0) {
      // El último slide pasa a ser el cierre
      const cierreIdx = slides.length - 1
      slides[cierreIdx].rol = 'cierre'
      if (cta && !slides[cierreIdx].texto_apoyo) {
        slides[cierreIdx].texto_apoyo = truncate(cta, 140, 'legacy.cta')
      }
    }
    console.warn(`[CARRUSEL] Recovery completado — ${slides.length} slides construidos desde legacy`)
  }

  const ctaRaw = raw.cta_comentario ? truncate(String(raw.cta_comentario), 60, 'cta_comentario') : null
  if (!ctaRaw) {
    console.warn(`[CARRUSEL] cta_comentario null — aplicando default para tema "${tema}"`)
  }

  return {
    tema,
    estructura_narrativa: estructura,
    cantidad_slides: slides.length,
    angulo:         truncate(String(raw.angulo ?? ''), 100, 'angulo'),
    cta_comentario: ctaRaw ?? getCtaDefault(tema, pieceIndex),
    slides,
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateCarrusel(p: CarruselParams): Promise<GeneratedCarrusel> {
  const prompt = buildCarruselPrompt(p)

  console.log(`[CARRUSEL] Generando pieza ${p.pieceIndex + 1}/${p.totalPieces} | tema=${p.temaAsignado} | ángulos usados: [${p.usedAngulos.length}]`)
  if (p.pieceIndex === 0) {
    console.log(`[CARRUSEL] PROMPT COMPLETO — primera pieza\n${'─'.repeat(80)}\n${prompt}\n${'─'.repeat(80)}\n`)
  }

  const label = `carrusel[${p.pieceIndex + 1}/${p.totalPieces}]`
  const text = await generateWithRetry(prompt, label)

  const parsed = parseCarruselResponse(text, p.temaAsignado, p.pieceIndex)

  if (parsed.slides.length === 0) {
    console.error(`[CARRUSEL] ✗ Parser devolvió 0 slides — estructura=${parsed.estructura_narrativa} | raw text:\n${text}`)
    throw new Error(`Carrusel sin slides (estructura_narrativa=${parsed.estructura_narrativa}) — activando fallback`)
  }

  console.log(`[CARRUSEL] ✓ tema=${parsed.tema} | estructura=${parsed.estructura_narrativa} | slides=${parsed.cantidad_slides}`)

  return {
    formato:              'carrusel',
    ...(p.vertical && { vertical: p.vertical }),
    tema:                 parsed.tema,
    estructura_narrativa: parsed.estructura_narrativa,
    cantidad_slides:      parsed.cantidad_slides,
    angulo:               parsed.angulo,
    slides:               parsed.slides,
    cta_comentario:       parsed.cta_comentario,
    carpeta_material:     p.carpeta,
    mes:                  p.mesAnio,
  }
}
