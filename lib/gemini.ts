import { GoogleGenAI } from '@google/genai'
import { Salida, MaterialSlot, KnowledgeBase, TikTokIntelligence, Vertical, Niche } from '@/types'
import { VERTICAL_PROMPTS, VERTICAL_LABELS, TRIP_TYPE_MIX, PREDEFINED_SLOTS } from '@/lib/verticals'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const NICHE_CONTEXT: Record<Niche, string> = {
  trekking: 'trekking de montaña, senderismo, excursiones a pie por terrenos naturales, alta montaña',
  running: 'running trail, carreras de montaña, trail running, competencias y entrenamiento en naturaleza',
  ciclismo: 'ciclismo de montaña, MTB, gravel, cicloturismo por rutas naturales',
  turismo_aventura: 'turismo aventura multideporte, experiencias de naturaleza combinadas, rafting, rappel, cabalgatas',
}

const BUYER_PERSONA = `Buyer persona: profesional de 27-55 años, independiente económicamente, con buen ingreso pero poco tiempo libre. Busca confianza, calidad y desconexión real. No quiere improvisar su tiempo libre. Valora la seguridad, la experiencia del guía y el grupo selecto. Le importa el "qué voy a vivir" más que el "qué voy a hacer".`

export interface GeneratedPiece {
  vertical: Vertical
  slot_key: string
  titulo: string
  subtitulo: string
  bullets: string[]
  cta: string
  video_crudo: string
  mes: string
}

export async function generateContentForSalida(
  salida: Salida,
  slots: MaterialSlot[],
  knowledgeBase: KnowledgeBase[],
  niche: Niche,
  clientName: string,
  tiktokExamples: TikTokIntelligence[] = []
): Promise<GeneratedPiece[]> {

  const mix = TRIP_TYPE_MIX[salida.tipo_viaje]
  const verticals = Object.entries(mix) as [Vertical, number][]

  const fechaInicio = new Date(salida.fecha_inicio)
  const mesAnio = fechaInicio.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  // Build knowledge base context
  const kbContext = knowledgeBase.length > 0
    ? `\n\nEJEMPLOS DE CONTENIDO QUE FUNCIONA EN ESTE NICHO:\n${knowledgeBase.map(kb => `[${VERTICAL_LABELS[kb.vertical as Vertical]}]\nTítulo: ${kb.titulo}\n${kb.contenido}`).join('\n\n')}`
    : ''

  // Build TikTok intelligence context — real patterns from high-performing videos
  const tiktokContext = tiktokExamples.length > 0
    ? `\n\nINTELIGENCIA DE CONTENIDO TIKTOK (patrones reales de videos exitosos en este nicho):\nEstos son ejemplos de videos que performaron bien. Usalos como REFERENCIA DE PATRONES — analizá qué tipo de hooks, formatos y temas conectan con la audiencia. NO copies el contenido, estudiá el estilo:\n\n${tiktokExamples.slice(0, 5).map((item, i) => {
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

  // ─── PROMPT DEBUG LOG ───────────────────────────────────────────────────────
  const SEP = '═'.repeat(80)
  console.log(`\n${SEP}`)
  console.log(`[GEMINI] CONTEXTO DE REFERENCIA — nicho: ${niche} | salida: ${salida.nombre}`)
  console.log(SEP)
  if (tiktokExamples.length === 0) {
    console.log('[GEMINI] ⚠  Sin ejemplos TikTok para este nicho — Gemini genera sin referencia')
  } else {
    console.log(`[GEMINI] ${tiktokExamples.length} ejemplo(s) TikTok que recibirá Gemini:\n`)
    tiktokExamples.slice(0, 5).forEach((item, i) => {
      const eng = item.likes + item.comments * 2 + item.shares * 3
      console.log(`  Ejemplo ${i + 1}`)
      console.log(`  Nicho:     ${item.nicho}`)
      console.log(`  Views:     ${item.views.toLocaleString()} | Likes: ${item.likes.toLocaleString()} | Eng: ${eng.toLocaleString()}`)
      console.log(`  Caption:   ${String(item.caption ?? '').slice(0, 200)}`)
      console.log(`  Hook/txt:  ${item.texto_miniatura || '(sin texto extraído)'}`)
      console.log(`  Hashtags:  ${(item.hashtags ?? []).slice(0, 8).map(h => `#${h}`).join(' ') || '(ninguno)'}`)
      console.log()
    })
  }
  if (knowledgeBase.length > 0) {
    console.log(`[GEMINI] ${knowledgeBase.length} ejemplo(s) de knowledge_base manual`)
  }
  console.log(SEP + '\n')
  // ────────────────────────────────────────────────────────────────────────────

  const results: GeneratedPiece[] = []

  for (const [vertical, proportion] of verticals) {
    // Select best matching slot for this vertical
    const bestSlot = selectBestSlotForVertical(vertical, slots)
    const slotInfo = bestSlot
      ? `Material disponible: ${bestSlot.slot_label} - ${bestSlot.slot_description || ''}`
      : 'Material: paisajes generales del destino'

    const slotKey = bestSlot?.slot_key || 'paisajes'
    const slotLabel = bestSlot?.slot_label || 'Paisajes del destino'

    const prompt = `${VERTICAL_PROMPTS[vertical]}

CONTEXTO DEL NICHO: ${NICHE_CONTEXT[niche]}

${BUYER_PERSONA}

DATOS DE LA SALIDA:
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

${slotInfo}
${kbContext}
${tiktokContext}

Genera una pieza de contenido para redes sociales en la vertical ${VERTICAL_LABELS[vertical]}.

Responde SOLO con un JSON válido con esta estructura exacta:
{
  "titulo": "título gancho de máximo 10 palabras, sin hashtags",
  "subtitulo": "subtítulo que complementa el título, 1-2 oraciones",
  "bullets": ["punto 1", "punto 2", "punto 3"],
  "cta": "llamado a la acción específico y directo"
}

Sé específico, usa los datos reales de la salida. No uses frases genéricas. El contenido debe sonar auténtico y estar adaptado al nicho de ${niche}.`

    // Log full prompt for the first vertical only (rest have identical structure)
    if (results.length === 0) {
      console.log(`[GEMINI] PROMPT COMPLETO — vertical: ${vertical}\n${'─'.repeat(80)}\n${prompt}\n${'─'.repeat(80)}\n`)
    }

    try {
      const result = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt })
      const text = result.text ?? ''

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')

      const parsed = JSON.parse(jsonMatch[0])

      results.push({
        vertical,
        slot_key: slotKey,
        titulo: parsed.titulo || '',
        subtitulo: parsed.subtitulo || '',
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
        cta: parsed.cta || '',
        video_crudo: slotLabel,
        mes: mesAnio,
      })
    } catch (error) {
      console.error(`Error generating content for vertical ${vertical}:`, error)
      // Add a fallback piece
      results.push({
        vertical,
        slot_key: slotKey,
        titulo: `${salida.nombre} - ${VERTICAL_LABELS[vertical]}`,
        subtitulo: `Experiencia en ${salida.destino}`,
        bullets: ['Cupos limitados', `Desde USD ${salida.precio_usd}`, 'Guía certificado'],
        cta: salida.link_inscripcion ? `Inscribite en ${salida.link_inscripcion}` : 'Escribinos para reservar',
        video_crudo: slotLabel,
        mes: mesAnio,
      })
    }
  }

  return results
}

function selectBestSlotForVertical(vertical: Vertical, slots: MaterialSlot[]): MaterialSlot | null {
  const slotMapping: Record<Vertical, string[]> = {
    conversion: ['guia_camara', 'testimonios', 'paisajes'],
    aspiracional: ['paisajes', 'amaneceres', 'pov'],
    pov: ['pov', 'trekking_marcha', 'amaneceres'],
    autoridad: ['guia_camara', 'trekking_marcha', 'refugios'],
    salud_mental: ['paisajes', 'amaneceres', 'refugios'],
    transformacion: ['trekking_marcha', 'amaneceres', 'pov'],
    prueba_social: ['testimonios', 'grupo', 'trekking_marcha'],
    comunidad: ['grupo', 'testimonios', 'refugios'],
    objeciones: ['guia_camara', 'grupo', 'paisajes'],
  }

  const preferred = slotMapping[vertical] || []
  const slotsWithFiles = slots.filter(s => s.files && s.files.length > 0)

  for (const prefKey of preferred) {
    const found = slotsWithFiles.find(s => s.slot_key === prefKey)
    if (found) return found
  }

  // Return any slot with files, or the first preferred slot definition
  if (slotsWithFiles.length > 0) return slotsWithFiles[0]

  const fallbackKey = preferred[0]
  const fallbackSlot = PREDEFINED_SLOTS.find(s => s.key === fallbackKey)
  if (fallbackSlot) {
    return {
      id: '',
      salida_id: '',
      slot_key: fallbackSlot.key,
      slot_label: fallbackSlot.label,
      slot_description: fallbackSlot.description,
      sort_order: fallbackSlot.order,
      created_at: '',
    }
  }

  return slots[0] || null
}
