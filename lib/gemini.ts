import { Salida, KnowledgeBase, TikTokIntelligence, Vertical, Niche, ObjetivoGeneracion, SubVertical, FormatoContenido, ClientOnboarding } from '@/types'
import { VERTICAL_PROMPTS, VERTICAL_LABELS, SUBVERTICAL_LABELS, SUBVERTICAL_DESCRIPTIONS, VERTICAL_FORMATO_DEFAULT, VERTICAL_MATERIAL_DEFAULT, TRIP_TYPE_MIX, MANTENER_CUENTA_MIX, SALUD_MENTAL_SUBVERTICALS, COMUNIDAD_SUBVERTICALS } from '@/lib/verticals'
import { buildNicheContext, logContextInjection } from '@/lib/context-builder'
import { getActiveClient, markCurrentExhausted, getPoolStatus } from '@/lib/gemini-key-pool'
import { rankSubverticals, buildHookContext } from '@/lib/trends-context'

const BACKOFF_DELAYS_MS = [2000, 4000, 8000]

function is503(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return msg.includes('"code":503') || msg.includes('UNAVAILABLE')
}

function is429(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return msg.includes('"code":429') || msg.includes('RESOURCE_EXHAUSTED')
}

// Lógica de generación con dos niveles de resiliencia:
//   - 429 (cuota agotada): rota a la siguiente key del pool y reintenta
//   - 503 (saturación temporal): backoff con la misma key, hasta 3 reintentos
async function generateWithRetry(prompt: string, vertical: string): Promise<string> {
  // Outer loop: rotación de keys por 429
  while (true) {
    const current = getActiveClient()
    if (!current) {
      throw new Error('Todas las keys de Gemini están agotadas — esperá el reset diario o agregá más keys.')
    }

    console.log(`[GEMINI] Usando ${current.label} (${getPoolStatus()}) — vertical: ${vertical}`)

    // Inner loop: retry con backoff por 503
    for (let attempt = 0; attempt <= BACKOFF_DELAYS_MS.length; attempt++) {
      try {
        const result = await current.client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        })
        return result.text ?? ''
      } catch (error) {
        if (is429(error)) {
          // Loguear el error real de la API antes de rotar
          const errMsg = error instanceof Error ? error.message : String(error)
          console.error(`[GEMINI] Error raw (429): ${errMsg.slice(0, 400)}`)
          const hasNext = markCurrentExhausted()
          if (!hasNext) {
            throw new Error('Todas las keys de Gemini están agotadas — esperá el reset diario o agregá más keys.')
          }
          break  // sale del inner loop → outer loop reintenta con nueva key
        }

        if (is503(error)) {
          const isLast = attempt === BACKOFF_DELAYS_MS.length
          if (isLast) throw error
          const delay = BACKOFF_DELAYS_MS[attempt]
          console.warn(`[GEMINI] ⚠ 503 en vertical ${vertical} — reintento ${attempt + 1}/3 en ${delay / 1000}s...`)
          await new Promise(res => setTimeout(res, delay))
          continue
        }

        // Cualquier otro error: falla inmediata
        throw error
      }
    }
    // Si llegamos acá es porque hubo un 429 y se rotó la key → outer loop continúa
  }
}

export interface GeneratedPiece {
  vertical: Vertical
  subvertical?: SubVertical
  formato: FormatoContenido
  // Ruta o nombre de la carpeta de Drive elegida por el cliente para esta vertical.
  // Reemplaza el sistema de slots fijos. Vacío si el cliente no asignó carpeta.
  carpeta_material: string
  titulo: string
  subtitulo: string
  bullets: string[]
  cta: string
  // 5 slides para formato carrusel. Vacío para reel/flyer/historia.
  slides: string[]
  // Label legible de la carpeta (para UI y exportación). Mismo valor que carpeta_material
  // o "Sin carpeta asignada" como fallback.
  video_crudo: string
  mes: string
}

// Distribuye `cantidad` piezas entre verticales según sus proporciones (Largest Remainder Method)
function distributeQuantity(mix: Partial<Record<Vertical, number>>, cantidad: number): Array<[Vertical, number]> {
  const entries = (Object.entries(mix) as [Vertical, number][]).filter(([, p]) => p > 0)
  const items = entries.map(([v, p]) => {
    const exact = p * cantidad
    return { v, floor: Math.floor(exact), remainder: exact - Math.floor(exact) }
  })
  const totalFloor = items.reduce((s, e) => s + e.floor, 0)
  const remaining = cantidad - totalFloor
  items.sort((a, b) => b.remainder - a.remainder)
  for (let i = 0; i < remaining; i++) items[i].floor++
  return items.filter(e => e.floor > 0).map(e => [e.v, e.floor])
}

// Selecciona subvertical por ranking de tendencias (o índice si no hay datos)
function pickSubvertical(
  vertical: Vertical,
  pieceIndex: number,
  rankedSaludMental: SubVertical[],
  rankedComunidad: SubVertical[],
  explicit?: SubVertical,
): SubVertical | undefined {
  if (explicit) return explicit
  if (vertical === 'salud_mental') return rankedSaludMental[pieceIndex % rankedSaludMental.length]
  if (vertical === 'comunidad')    return rankedComunidad[pieceIndex % rankedComunidad.length]
  return undefined
}

const EMBUDO_CTA_MAP: Record<string, string> = {
  whatsapp:   'El CTA debe invitar a escribirle por WhatsApp directo (ej: "Escribime por WhatsApp", "Mandame un mensaje").',
  bio:        'El CTA debe dirigir al link en bio (ej: "Link en bio", "Entrá desde el link en bio").',
  comentario: 'El CTA debe pedir que comenten en el post (ej: "Comentá QUIERO abajo", "Dejá tu comentario").',
  dm:         'El CTA debe pedir un DM de Instagram (ej: "Mandame un DM", "Escribime por IG").',
  formulario: 'El CTA debe dirigir a completar un formulario web (ej: "Completá el formulario", "Reservá tu lugar en el link").',
}

function buildClientProfileContext(onboarding: ClientOnboarding | null): string {
  if (!onboarding) return ''

  const parts: string[] = []

  // Avatar del cliente ideal
  const avatarLines: string[] = []
  if (onboarding.avatar_edad_genero) avatarLines.push(`Perfil demográfico: ${onboarding.avatar_edad_genero}`)
  if (onboarding.avatar_experiencia) avatarLines.push(`Nivel de experiencia: ${onboarding.avatar_experiencia}`)
  if (onboarding.avatar_motor && onboarding.avatar_motor.length > 0) {
    const motors = Array.isArray(onboarding.avatar_motor) ? onboarding.avatar_motor : [onboarding.avatar_motor]
    avatarLines.push(`Motor de compra (por qué te eligen): ${motors.join(', ')}`)
  }
  if (avatarLines.length > 0) {
    parts.push(`── CLIENTE IDEAL ──\n${avatarLines.join('\n')}`)
  }

  // Objeciones (especialmente relevante para vertical objeciones)
  if (onboarding.avatar_objeciones) {
    parts.push(`── OBJECIONES QUE FRENAN AL CLIENTE IDEAL ──\n${onboarding.avatar_objeciones}\nUsalas para anticipar dudas y construir argumentos en las verticales que correspondan.`)
  }

  // Tono y personalidad de marca — peso alto
  if (onboarding.marca_personalidad) {
    parts.push(`── VOZ Y PERSONALIDAD DE MARCA ⚡ (PRIORIDAD SOBRE TONO GENÉRICO) ──\n${onboarding.marca_personalidad}\nEsta voz fue definida por el cliente. Aplicala sobre el tono del nicho — si hay tensión, la personalidad del cliente manda para el tono; el nicho manda para el tipo de contenido.`)
  }

  // Líneas rojas — prohibición dura
  if (onboarding.marca_lineas_rojas) {
    parts.push(`── LÍNEAS ROJAS: PROHIBICIONES ABSOLUTAS ⛔ ──\nEl cliente definió que NUNCA quiere que su marca se asocie con:\n${onboarding.marca_lineas_rojas}\n⛔ CRÍTICO: No violes estas restricciones bajo ningún concepto, ni en el copy, ni en el tono, ni en las implicaciones del texto.`)
  }

  // Autoridad y credenciales
  if (onboarding.marca_autoridad) {
    parts.push(`── AUTORIDAD Y CREDENCIALES DEL CLIENTE ──\n${onboarding.marca_autoridad}\nMencioná estas credenciales cuando la vertical lo justifique (especialmente en Autoridad y Prueba Social).`)
  }

  // Embudo / canal de conversión → modula el CTA
  if (onboarding.embudo_paso) {
    const ctaInstruction = EMBUDO_CTA_MAP[onboarding.embudo_paso]
      ?? `Canal de conversión elegido por el cliente: ${onboarding.embudo_paso}. El CTA debe respetar este canal.`
    parts.push(`── CTA: CANAL DE CONVERSIÓN ──\n${ctaInstruction}`)
  }

  if (parts.length === 0) return ''

  return `=== PERFIL DEL CLIENTE (personalización) ===\n${parts.join('\n\n')}\n`
}

export async function generateContentForSalida(
  salida: Salida,
  carpetasPorVertical: Partial<Record<Vertical, string>>,
  knowledgeBase: KnowledgeBase[],
  niche: Niche,
  clientName: string,
  tiktokExamples: TikTokIntelligence[] = [],
  objetivo: ObjetivoGeneracion = 'vender_salida',
  subverticalMap: Partial<Record<Vertical, SubVertical>> = {},
  cantidad?: number,
  clientOnboarding: ClientOnboarding | null = null,
): Promise<GeneratedPiece[]> {

  const mix = objetivo === 'mantener_cuenta'
    ? MANTENER_CUENTA_MIX
    : TRIP_TYPE_MIX[salida.tipo_viaje]

  console.log(`[GEMINI] objetivo recibido: "${objetivo}" → mix: ${Object.entries(mix).map(([v, p]) => `${v}=${Math.round((p as number)*100)}%`).join(', ')}`)

  // Si se especifica cantidad, distribuir proporcionalmente. Si no, 1 por vertical (comportamiento anterior).
  const verticalCounts: Array<[Vertical, number]> = cantidad && cantidad > 0
    ? distributeQuantity(mix, cantidad)
    : (Object.entries(mix) as [Vertical, number][]).map(([v]) => [v, 1])

  const fechaInicio = new Date(salida.fecha_inicio)
  const mesAnio = fechaInicio.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  // Build knowledge base context (manual examples from DB)
  const kbContext = knowledgeBase.length > 0
    ? `=== EJEMPLOS DE CONTENIDO QUE FUNCIONA EN ESTE NICHO ===\n${knowledgeBase.map(kb => `[${VERTICAL_LABELS[kb.vertical as Vertical]}]\nTítulo: ${kb.titulo}\n${kb.contenido}`).join('\n\n')}`
    : ''

  // Build TikTok intelligence context — real patterns from high-performing videos
  const tiktokContext = tiktokExamples.length > 0
    ? `=== INTELIGENCIA TIKTOK (patrones reales de videos exitosos en este nicho) ===\nEstos son ejemplos de videos que performaron bien. Usalos como REFERENCIA DE PATRONES — analizá qué tipo de hooks, formatos y temas conectan con la audiencia. NO copies el contenido, estudiá el estilo:\n\n${tiktokExamples.slice(0, 5).map((item, i) => {
        const engagement = item.likes + item.comments * 2 + item.shares * 3
        const captionPart = item.caption
          ? `Caption: "${item.caption.slice(0, 300)}${item.caption.length > 300 ? '...' : ''}"`
          : ''
        const thumbTextPart = item.texto_miniatura
          ? `Hook/texto en miniatura: "${item.texto_miniatura}"`
          : ''
        const hashtagsPart = item.hashtags && item.hashtags.length > 0
          ? `Hashtags: ${item.hashtags.slice(0, 8).map(h => `#${h}`).join(' ')}`
          : ''
        const parts = [captionPart, thumbTextPart, hashtagsPart].filter(Boolean).join('\n')
        return `[Ejemplo ${i + 1} — ${item.views.toLocaleString()} views, ${engagement.toLocaleString()} engagement]\n${parts}`
      }).join('\n\n')}`
    : ''

  // Log TikTok examples summary once (before the loop)
  const SEP = '═'.repeat(80)
  const totalPiezas = verticalCounts.reduce((s, [, n]) => s + n, 0)
  console.log(`\n${SEP}`)
  console.log(`[GEMINI] GENERANDO — nicho: ${niche} | salida: ${salida.nombre} | modo: ${objetivo} | tipo: ${salida.tipo_viaje} | total: ${totalPiezas} piezas`)
  console.log(`[GEMINI] Distribución: ${verticalCounts.map(([v, n]) => `${v}×${n}`).join(', ')}`)
  console.log(SEP)
  if (tiktokExamples.length === 0) {
    console.log('[GEMINI] ⚠  Sin ejemplos TikTok para este nicho — Gemini genera sin referencia de scraping')
  } else {
    console.log(`[GEMINI] ${tiktokExamples.length} ejemplo(s) TikTok disponibles:\n`)
    tiktokExamples.slice(0, 5).forEach((item, i) => {
      const eng = item.likes + item.comments * 2 + item.shares * 3
      console.log(`  Ejemplo ${i + 1} | Views: ${item.views.toLocaleString()} | Eng: ${eng.toLocaleString()}`)
      console.log(`  Caption:  ${String(item.caption ?? '').slice(0, 120)}`)
      console.log(`  Hook/txt: ${item.texto_miniatura || '(sin texto extraído)'}`)
    })
  }
  console.log()

  // Build the niche context from knowledge files — same for all verticals in this run
  const nicheContext = buildNicheContext(niche)

  // Build client profile context once — injected into every vertical prompt
  const clientProfileContext = buildClientProfileContext(clientOnboarding)

  // Obtener ranking de subverticales y bloque de hooks desde TrendsMCP (con cache 7 días)
  const [rankedSaludMental, rankedComunidad, hookContext] = await Promise.all([
    rankSubverticals(SALUD_MENTAL_SUBVERTICALS),
    rankSubverticals(COMUNIDAD_SUBVERTICALS),
    buildHookContext(),
  ])

  if (hookContext) {
    console.log('[TRENDS] Bloque de hooks inyectado al prompt')
  } else {
    console.log('[TRENDS] Sin datos de tendencias — generando sin contexto de hooks')
  }

  const results: GeneratedPiece[] = []

  for (const [vertical, count] of verticalCounts) {
    // Log which files were injected (only once per vertical, not per piece)
    const explicitSv = subverticalMap[vertical]
    logContextInjection(niche, vertical, nicheContext, explicitSv)

    // Carpeta: cliente elige Drive folder → fallback a default genérico por vertical
    const carpeta = carpetasPorVertical[vertical] || VERTICAL_MATERIAL_DEFAULT[vertical]

    for (let pieceIndex = 0; pieceIndex < count; pieceIndex++) {
      const subvertical = pickSubvertical(vertical, pieceIndex, rankedSaludMental, rankedComunidad, explicitSv)

      const slotInfo = `Carpeta de material: "${carpeta}"`

      const subverticalSection = subvertical
        ? `\n=== ÁNGULO ESPECÍFICO (subvertical): ${SUBVERTICAL_LABELS[subvertical].toUpperCase()} ===\n${SUBVERTICAL_DESCRIPTIONS[subvertical]}\nEste ángulo es el foco del contenido. La vertical sigue siendo ${VERTICAL_LABELS[vertical]}, pero todo el copy gira alrededor de este eje específico.`
        : ''

      const variacionSection = count > 1
        ? `\n=== VARIACIÓN ===\nEsta es la pieza ${pieceIndex + 1} de ${count} para la vertical ${VERTICAL_LABELS[vertical]}${subvertical ? ` (ángulo: ${SUBVERTICAL_LABELS[subvertical]})` : ''}.\nIMPORTANTE: Esta pieza debe tener un hook, ángulo y estructura COMPLETAMENTE DISTINTOS a las otras piezas de esta vertical. No repitas ideas, frases de apertura ni formatos.`
        : ''

      const formato = VERTICAL_FORMATO_DEFAULT[vertical]
      const isCarrusel = formato === 'carrusel'

      const carruselOverride = isCarrusel ? `
=== OVERRIDE DE FORMATO: CARRUSEL ===
Esta pieza es un CARRUSEL de 5 slides. IGNORÁ el esquema JSON estándar del agente. Respondé con este esquema:

{
  "slides": [
    "Slide 1 — HOOK: la frase que frena el scroll. Lo más potente. Máximo 2 líneas.",
    "Slide 2 — DESARROLLO 1: primera idea que avanza la historia o el argumento.",
    "Slide 3 — DESARROLLO 2: segunda idea, profundiza o genera tensión.",
    "Slide 4 — DESARROLLO 3: tercera idea, el punto de mayor impacto o dato concreto.",
    "Slide 5 — CIERRE + CTA: resolución emocional o argumento final, seguido del llamado a la acción."
  ],
  "titulo": "título del carrusel para referencia interna (máx. 8 palabras)",
  "cta": "el CTA específico del slide 5"
}

Reglas de slides:
- Cada slide es texto independiente, sin numeración ni prefijos.
- El tono lo define la VOZ DE MARCA del cliente (si está en el perfil); si no, el tono del nicho. Nunca sonar a publicidad.
- Densidad: adaptá la longitud de cada slide al ángulo (emocional/aspiracional → más corto; tips/objeciones → puede tener más texto). El criterio es que cada slide se lea de un vistazo.
- Los 5 strings del array "slides" deben ser el texto final de cada slide, listo para usar.
` : ''

      // CTA channel reminder for TAREA section
      const ctaReminder = clientOnboarding?.embudo_paso
        ? `\n${EMBUDO_CTA_MAP[clientOnboarding.embudo_paso] ?? ''}`
        : ''

      // Líneas rojas × vertical: if the client prohibits price/money talk and this is
      // a conversion-type vertical, inject an explicit resolution instruction.
      const lineasRojas = clientOnboarding?.marca_lineas_rojas ?? ''
      const prohibePrecio = lineasRojas && /precio|plata|dinero|tarif/i.test(lineasRojas)
      const esConversionVertical = vertical === 'conversion' || vertical === 'promocional'
      const lineasRojasVerticalNote = (prohibePrecio && esConversionVertical)
        ? `\n⛔ ADAPTACIÓN POR LÍNEA ROJA: El cliente prohibió hablar de precio o dinero. En esta vertical de conversión no menciones montos, tarifas ni referencias económicas. El CTA debe generar interés sin revelar precio — derivá al canal de conversión (ej: "escribime para los detalles", "preguntame por WhatsApp").`
        : ''

      const prompt = `${nicheContext.text}

${clientProfileContext}=== INSTRUCCIÓN ESPECÍFICA PARA ESTA VERTICAL: ${VERTICAL_LABELS[vertical].toUpperCase()} ===
${VERTICAL_PROMPTS[vertical]}${subverticalSection}${variacionSection}${carruselOverride}
=== DATOS DE LA SALIDA ===
- Nombre: ${salida.nombre}
- Destino: ${salida.destino}
- Fecha: ${salida.fecha_inicio} al ${salida.fecha_fin}
- Precio: USD ${salida.precio_usd}${salida.sena_usd ? ` (seña: USD ${salida.sena_usd})` : ''}
- Nivel: ${salida.nivel}
- Cupos: ${salida.cupos}
- Tipo: ${salida.tipo_viaje.replace(/_/g, ' ')}
${salida.itinerario ? `- Itinerario: ${salida.itinerario}` : ''}
${salida.que_incluye ? `- Incluye: ${salida.que_incluye}` : ''}
${salida.que_no_incluye ? `- No incluye: ${salida.que_no_incluye}` : ''}
${salida.link_inscripcion ? `- Link inscripción: ${salida.link_inscripcion}` : ''}

=== MATERIAL DISPONIBLE ===
${slotInfo}

${kbContext ? kbContext + '\n' : ''}${tiktokContext ? tiktokContext + '\n' : ''}${hookContext ? hookContext + '\n' : ''}
=== TAREA ===
Generá una pieza de contenido para redes sociales en la vertical ${VERTICAL_LABELS[vertical]}.
⚠️ JERARQUÍA DE TONO:
1. VOZ DE MARCA (si está definida en PERFIL DEL CLIENTE): manda sobre CÓMO suena el texto — personalidad, registro, cercanía, ritmo. Es la capa más alta.
2. NICHO (${niche.toUpperCase()}): define QUÉ tipo de contenido hacer y el vocabulario técnico del deporte/actividad. No pisa la voz del cliente.
3. Si hay conflicto entre ambos (ej: nicho competitivo/datos vs. voz cercana/orgánica), la voz del cliente gana para el tono. El nicho aporta el mundo, la temática y los términos técnicos.
NUNCA suenes a folleto publicitario, independientemente del nicho.${ctaReminder}${lineasRojasVerticalNote}
Respondé SOLO con el JSON válido${isCarrusel ? ' del OVERRIDE DE FORMATO CARRUSEL' : ' definido en las instrucciones del agente'}. Sin texto adicional.`

      // Log full prompt only for the very first piece
      if (results.length === 0) {
        console.log(`[GEMINI] PROMPT COMPLETO — primera pieza (${vertical})\n${'─'.repeat(80)}\n${prompt}\n${'─'.repeat(80)}\n`)
      }

      try {
        const text = await generateWithRetry(prompt, `${vertical}[${pieceIndex + 1}/${count}]`)

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON found in response')

        const parsed = JSON.parse(jsonMatch[0])

        const slides: string[] = isCarrusel && Array.isArray(parsed.slides)
          ? parsed.slides.slice(0, 5).map(String)
          : []

        results.push({
          vertical,
          ...(subvertical && { subvertical }),
          formato,
          carpeta_material: carpeta,
          titulo: parsed.titulo || '',
          subtitulo: parsed.subtitulo || '',
          bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
          cta: parsed.cta || '',
          slides,
          video_crudo: carpeta,
          mes: mesAnio,
        })
      } catch (error) {
        console.error(`[GEMINI] ✗ Falló ${vertical}[${pieceIndex + 1}/${count}] tras reintentos:`, error)
        results.push({
          vertical,
          ...(subvertical && { subvertical }),
          formato,
          carpeta_material: carpeta,
          titulo: `${salida.nombre} - ${VERTICAL_LABELS[vertical]}`,
          subtitulo: `Experiencia en ${salida.destino}`,
          bullets: ['Cupos limitados', `Desde USD ${salida.precio_usd}`, 'Guía certificado'],
          cta: salida.link_inscripcion ? `Inscribite en ${salida.link_inscripcion}` : 'Escribinos para reservar',
          slides: [],
          video_crudo: carpeta,
          mes: mesAnio,
        })
      }
    }
  }

  return results
}

