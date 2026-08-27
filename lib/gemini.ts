import { Salida, KnowledgeBase, TikTokIntelligence, Vertical, Niche, ObjetivoGeneracion, SubVertical, ClientOnboarding, TemaCarrusel, TemaVideo, EstructuraNarrativa, AnyGeneratedPiece, GeneratedCarrusel, GeneratedPieceLegacy } from '@/types'
import { VERTICAL_PROMPTS, VERTICAL_LABELS, SUBVERTICAL_LABELS, SUBVERTICAL_DESCRIPTIONS, VERTICAL_FORMATO_DEFAULT, VERTICAL_MATERIAL_DEFAULT, TRIP_TYPE_MIX, MANTENER_CUENTA_MIX, SALUD_MENTAL_SUBVERTICALS, COMUNIDAD_SUBVERTICALS } from '@/lib/verticals'
import { buildNicheContext, logContextInjection } from '@/lib/context-builder'
import { generateWithRetry } from '@/lib/gemini-core'
import { rankSubverticals, buildHookContext } from '@/lib/trends-context'
import { generateCarrusel } from '@/lib/generators/carrusel'
import { generateVideo } from '@/lib/generators/video'
import { GeneratedVideo } from '@/types'
import { getRotatedBatchItem } from '@/lib/batch-rotation'
import { buildCommercialProfilePrompt } from '@/lib/commercial-content-profiles'
import { buildSalidaBlock } from '@/lib/generators/shared-prompt-blocks'

// GeneratedPiece kept for backwards compat with any external import — alias del union
export type GeneratedPiece = AnyGeneratedPiece

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

  const commercialProfile = buildCommercialProfilePrompt(onboarding)
  if (commercialProfile) parts.push(commercialProfile)

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
  formato?: 'carrusel' | 'video' | 'flyer' | 'historia',
  antiPatternsText: string = '',
  formatoTexts: {
    patronesText?:     string
    storytellingText?: string
    reflexionText?:    string
  } = {},
  piezas?: { tema: TemaCarrusel; estructura: EstructuraNarrativa }[],
  batchIndex: number = 0,
): Promise<AnyGeneratedPiece[]> {

  const mix = objetivo === 'mantener_cuenta'
    ? MANTENER_CUENTA_MIX
    : TRIP_TYPE_MIX[salida.tipo_viaje]

  console.log(`[GEMINI] objetivo recibido: "${objetivo}" | formato: ${formato ?? 'auto'} → mix: ${Object.entries(mix).map(([v, p]) => `${v}=${Math.round((p as number)*100)}%`).join(', ')}`)

  // Si se especifica cantidad, distribuir proporcionalmente. Si no, 1 por vertical (comportamiento anterior).
  const verticalCounts: Array<[Vertical, number]> = cantidad && cantidad > 0
    ? distributeQuantity(mix, cantidad)
    : (Object.entries(mix) as [Vertical, number][]).map(([v]) => [v, 1])

  const mesAnio = salida.tipo_viaje === 'salida_recurrente' || !salida.fecha_inicio
    ? 'grupo semanal'
    : new Date(salida.fecha_inicio).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

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

  const results: AnyGeneratedPiece[] = []

  // ── Carrusel nuevo: dispatcher independiente del loop de verticales ────────
  if (formato === 'carrusel') {
    const totalCarruseles = piezas && piezas.length > 0
      ? piezas.length
      : (cantidad && cantidad > 0 ? cantidad : 1)
    const SEP2 = '═'.repeat(80)
    console.log(`\n${SEP2}`)
    console.log(`[CARRUSEL] GENERANDO — nicho: ${niche} | salida: ${salida.nombre} | total: ${totalCarruseles} carruseles`)
    console.log(SEP2)

    const carpetaDefault = Object.values(carpetasPorVertical)[0] || VERTICAL_MATERIAL_DEFAULT['autoridad']

    // Pre-asignación determinística de temas para garantizar variedad en el lote.
    // Cada lote desplaza el punto de entrada mediante su índice persistente.
    const TEMA_SPREAD_ORDER: TemaCarrusel[] = [
      'destinos', 'seguridad', 'preparacion_fisica', 'motivacion',
      'equipo', 'logistica', 'testimonios', 'detras_del_guia',
      'dudas_objeciones', 'educacion_montana', 'bienestar',
    ]

    const STORYTELLING_TEMAS = new Set<TemaCarrusel>(['testimonios', 'detras_del_guia', 'destinos'])
    const REFLEXION_TEMAS    = new Set<TemaCarrusel>(['motivacion', 'bienestar'])

    const usedTemas: TemaCarrusel[] = []
    const usedAngulos: string[] = []
    const usedEstructuras: import('@/types').EstructuraNarrativa[] = []
    const usedHookTypes: string[] = []
    let batchIn  = 0
    let batchOut = 0

    const ESTRUCTURA_ALTERNATIVAS: import('@/types').EstructuraNarrativa[] = [
      'storytelling', 'problema_solucion', 'pregunta_respuesta',
      'lista_tips', 'antes_despues', 'paso_a_paso',
    ]

    for (let i = 0; i < totalCarruseles; i++) {
      const temaAsignado = piezas?.[i]?.tema ?? getRotatedBatchItem(TEMA_SPREAD_ORDER, batchIndex, i)

      // Estructura: respetar elección del usuario si viene; sino, anti-duplicación de mito_vs_realidad
      const userEstructura = piezas?.[i]?.estructura
      const mitoYaUsado    = usedEstructuras.includes('mito_vs_realidad')
      const estructuraForzada: EstructuraNarrativa | undefined = userEstructura
        ?? (mitoYaUsado ? ESTRUCTURA_ALTERNATIVAS[i % ESTRUCTURA_ALTERNATIVAS.length] : undefined)

      const formatoText = STORYTELLING_TEMAS.has(temaAsignado)
        ? (formatoTexts.storytellingText ?? '')
        : REFLEXION_TEMAS.has(temaAsignado)
        ? (formatoTexts.reflexionText ?? '')
        : ''

      if (estructuraForzada) {
        console.log(`[CARRUSEL] Pieza ${i + 1}/${totalCarruseles} → tema: ${temaAsignado} | estructura forzada: ${estructuraForzada} (mito_vs_realidad ya usada) | formatoText: ${formatoText ? 'sí' : 'no'}`)
      } else {
        console.log(`[CARRUSEL] Pieza ${i + 1}/${totalCarruseles} → tema asignado: ${temaAsignado} | formatoText: ${formatoText ? 'sí' : 'no'}`)
      }

      try {
        const piece = await generateCarrusel({
          salida,
          niche,
          carpeta: carpetaDefault,
          clientOnboarding,
          nicheContextText: nicheContext.text,
          clientProfileContext,
          kbContext,
          tiktokContext,
          hookContext: hookContext ?? '',
          mesAnio,
          pieceIndex: i,
          totalPieces: totalCarruseles,
          usedTemas,
          temaAsignado,
          usedAngulos,
          estructuraForzada,
          usedHookTypes,
        })
        usedTemas.push(piece.tema)
        if (piece.angulo) usedAngulos.push(piece.angulo)
        usedEstructuras.push(piece.estructura_narrativa)
        if (piece.hook_type) usedHookTypes.push(piece.hook_type)
        batchIn  += piece._inputTokens  ?? 0
        batchOut += piece._outputTokens ?? 0
        results.push(piece)
      } catch (error) {
        console.error(`[CARRUSEL] ✗ Falló pieza ${i + 1}/${totalCarruseles}:`, error)
        const fallback: GeneratedCarrusel = {
          formato: 'carrusel',
          tema: temaAsignado,
          estructura_narrativa: 'problema_solucion',
          cantidad_slides: 4,
          angulo: `${salida.nombre} en ${salida.destino} — una experiencia que vale la pena`,
          slides: [
            { n_slide: 1, rol: 'portada',    texto_principal: `¿Estás listo para ${salida.destino}?`, texto_apoyo: null, indicacion_imagen: 'Foto del destino con luz natural' },
            { n_slide: 2, rol: 'desarrollo', texto_principal: 'Cada salida es diferente.',             texto_apoyo: 'El terreno te enseña lo que el gimnasio no puede.', indicacion_imagen: 'Grupo en ruta' },
            { n_slide: 3, rol: 'desarrollo', texto_principal: 'La preparación marca la diferencia.',   texto_apoyo: null, indicacion_imagen: 'Equipo listo antes de partir' },
            { n_slide: 4, rol: 'cierre',     texto_principal: '¿Te sumás?', texto_apoyo: salida.link_inscripcion ? `Inscribite: ${salida.link_inscripcion}` : 'Escribinos para reservar tu lugar.', indicacion_imagen: 'Cumbre o punto panorámico' },
          ],
          cta_comentario: '¿Ya fuiste? Contanos abajo.',
          carpeta_material: carpetaDefault,
          mes: mesAnio,
        }
        results.push(fallback)
      }
    }
    if (batchIn > 0) {
      const batchCostUsd = (batchIn / 1_000_000) * 0.30 + (batchOut / 1_000_000) * 2.50
      const succeededCount = results.length
      const avgCostUsd = succeededCount > 0 ? batchCostUsd / succeededCount : 0
      console.log(`[COSTO] batch completo | ${succeededCount} carruseles | USD ${batchCostUsd.toFixed(4)} | promedio USD ${avgCostUsd.toFixed(4)}/carrusel`)
    }
    return results
  }
  // ── Video: dispatcher independiente del loop de verticales ────────
  if (formato === 'video') {
    const totalVideos = piezas && piezas.length > 0
      ? piezas.length
      : (cantidad && cantidad > 0 ? cantidad : 1)
    const SEP2 = '═'.repeat(80)
    console.log(`\n${SEP2}`)
    console.log(`[VIDEO] GENERANDO — nicho: ${niche} | salida: ${salida.nombre} | total: ${totalVideos} videos`)
    console.log(SEP2)

    const carpetaDefault = Object.values(carpetasPorVertical)[0] || VERTICAL_MATERIAL_DEFAULT['autoridad']
    
    // Temas exclusivos para formato video
    const TEMA_SPREAD_ORDER: TemaVideo[] = [
      'motivacional', 'pov', 'comercial'
    ]

    let batchIn  = 0
    let batchOut = 0

    for (let i = 0; i < totalVideos; i++) {
      const temaAsignado = (piezas?.[i]?.tema as unknown as TemaVideo) ?? TEMA_SPREAD_ORDER[i % TEMA_SPREAD_ORDER.length]
      
      console.log(`[VIDEO] Pieza ${i + 1}/${totalVideos} → tema asignado: ${temaAsignado}`)

      try {
        const piece = await generateVideo({
          salida,
          niche,
          carpeta: carpetaDefault,
          clientOnboarding,
          nicheContextText: nicheContext.text,
          clientProfileContext,
          kbContext,
          tiktokContext,
          hookContext: hookContext ?? '',
          mesAnio,
          pieceIndex: i,
          totalPieces: totalVideos,
          temaAsignado,
        })
        
        batchIn  += (piece.metadata?._inputTokens as number)  ?? 0
        batchOut += (piece.metadata?._outputTokens as number) ?? 0
        results.push(piece)
      } catch (error) {
        console.error(`[VIDEO] ✗ Falló pieza ${i + 1}/${totalVideos}:`, error)
        const fallback: GeneratedVideo = {
          formato: 'video',
          tema: temaAsignado,
          vertical: 'promocional',
          titulo: `¿Estás listo para ${salida.destino}?`,
          subtitulo: 'Cada salida es diferente.',
          bullets: ['Cupos limitados', 'Viví la experiencia', 'Reservá hoy'],
          cta: salida.link_inscripcion ? `Inscribite: ${salida.link_inscripcion}` : 'Escribinos para reservar',
          carpeta_material: carpetaDefault,
          video_crudo: carpetaDefault,
          mes: mesAnio,
        }
        results.push(fallback)
      }
    }
    if (batchIn > 0) {
      const batchCostUsd = (batchIn / 1_000_000) * 0.30 + (batchOut / 1_000_000) * 2.50
      const succeededCount = results.length
      const avgCostUsd = succeededCount > 0 ? batchCostUsd / succeededCount : 0
      console.log(`[COSTO] batch completo (videos) | ${succeededCount} videos | USD ${batchCostUsd.toFixed(4)} | promedio USD ${avgCostUsd.toFixed(4)}/video`)
    }
    return results
  }
  // ─────────────────────────────────────────────────────────────────────────────

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

      // Si el usuario eligió explícitamente video o flyer, todas las piezas salen con ese formato.
      // Si no hay elección explícita (undefined) o se eligió carrusel (que ya fue despachado arriba),
      // usar el default por vertical.
      const legacyFormato: 'video' | 'flyer' | 'historia' =
        (formato === 'flyer' || formato === 'historia')
          ? formato
          : VERTICAL_FORMATO_DEFAULT[vertical] as 'video' | 'flyer' | 'historia'

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
${VERTICAL_PROMPTS[vertical]}${subverticalSection}${variacionSection}
${buildSalidaBlock(salida, clientOnboarding)}

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
Respondé SOLO con el JSON válido definido en las instrucciones del agente. Sin texto adicional.`

      // Log full prompt only for the very first piece
      if (results.length === 0) {
        console.log(`[GEMINI] PROMPT COMPLETO — primera pieza (${vertical})\n${'─'.repeat(80)}\n${prompt}\n${'─'.repeat(80)}\n`)
      }

      try {
        const text = await generateWithRetry(prompt, `${vertical}[${pieceIndex + 1}/${count}]`)

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON found in response')

        const parsed = JSON.parse(jsonMatch[0])

        const legacyPiece: GeneratedPieceLegacy = {
          vertical,
          ...(subvertical && { subvertical }),
          formato: legacyFormato,
          carpeta_material: carpeta,
          titulo: parsed.titulo || '',
          subtitulo: parsed.subtitulo || '',
          bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
          cta: parsed.cta || '',
          video_crudo: carpeta,
          mes: mesAnio,
        }
        results.push(legacyPiece)
      } catch (error) {
        console.error(`[GEMINI] ✗ Falló ${vertical}[${pieceIndex + 1}/${count}] tras reintentos:`, error)
        const fallbackPiece: GeneratedPieceLegacy = {
          vertical,
          ...(subvertical && { subvertical }),
          formato: legacyFormato,
          carpeta_material: carpeta,
          titulo: `${salida.nombre} - ${VERTICAL_LABELS[vertical]}`,
          subtitulo: `Experiencia en ${salida.destino}`,
          bullets: ['Cupos limitados', `Desde USD ${salida.precio_usd}`, 'Guía certificado'],
          cta: salida.link_inscripcion ? `Inscribite en ${salida.link_inscripcion}` : 'Escribinos para reservar',
          video_crudo: carpeta,
          mes: mesAnio,
        }
        results.push(fallbackPiece)
      }
    }
  }

  return results
}
