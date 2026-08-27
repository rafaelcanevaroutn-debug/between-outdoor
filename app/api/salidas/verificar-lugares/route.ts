import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveClient } from '@/lib/gemini-key-pool'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import type { DiaItinerario, PuntoInteres } from '@/types'

interface GroundingChunk {
  web?: { uri?: string; title?: string }
}

interface GroundingSupport {
  segment?: { endIndex?: number }
  groundingChunkIndices?: number[]
}

function addCitations(text: string, supports: GroundingSupport[], chunks: GroundingChunk[]): string {
  const sorted = [...supports].sort((a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0))
  let cited = text
  for (const support of sorted) {
    const end = support.segment?.endIndex
    if (end === undefined) continue
    const links = (support.groundingChunkIndices ?? [])
      .map(index => chunks[index]?.web?.uri)
      .filter((uri): uri is string => Boolean(uri))
    if (links.length) cited = `${cited.slice(0, end)} [Fuentes: ${[...new Set(links)].join(' | ')}]${cited.slice(end)}`
  }
  return cited
}

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Gemini no devolvió JSON válido')
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function parsePoints(value: unknown, minimum = 3, maximum = 6): PuntoInteres[] {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new Error(`No se encontraron ${minimum === 1 ? 'lugares verificables' : `al menos ${minimum} lugares verificables`}`)
  }
  return value.slice(0, maximum).map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`Lugar ${index + 1} inválido`)
    const item = raw as Record<string, unknown>
    const nombre = optionalText(item.nombre)
    const descripcion = optionalText(item.descripcion)
    const fuente = optionalText(item.fuente)
    if (!nombre || !descripcion || !fuente || !/^https?:\/\//i.test(fuente)) {
      throw new Error(`El lugar ${index + 1} no quedó respaldado por una fuente web`)
    }
    return {
      nombre,
      descripcion,
      ubicacion: optionalText(item.ubicacion),
      distancia: optionalText(item.distancia),
      duracion: optionalText(item.duracion),
      dificultad: optionalText(item.dificultad),
      fuente,
    }
  })
}

async function resolveSourceUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5_000) })
    return response.url || url
  } catch {
    return url
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json() as {
      destino?: string
      itinerarioDias?: DiaItinerario[]
      puntosInteres?: PuntoInteres[]
      lugares?: string[]
      modo?: 'recurrente' | 'viaje'
    }
    const destino = body.destino?.trim() ?? ''
    if (destino.length < 3) return NextResponse.json({ error: 'Cargá primero el destino de la salida.' }, { status: 400 })
    const requestedPlaces = [...new Set((body.lugares ?? []).map(item => item.trim()).filter(Boolean))].slice(0, 8)
    const isRecurringGroup = body.modo === 'recurrente' && requestedPlaces.length > 0
    const requiredPoints = isRecurringGroup ? requestedPlaces.length : 3
    const maximumPoints = isRecurringGroup ? requestedPlaces.length : 6

    const researchPrompt = isRecurringGroup
      ? `Investigá únicamente ${requestedPlaces.length === 1 ? `el lugar "${requestedPlaces[0]}"` : `estos lugares: ${requestedPlaces.join(', ')}`} dentro de ${destino}, para un grupo o academia outdoor recurrente.
No agregues otros destinos ni inventes recorridos. Para cada nombre cargado, buscá información verificable útil para describir el entorno y planificar contenido: ubicación, actividad outdoor posible, senderos o sectores reconocidos, distancia, duración y dificultad solamente cuando una fuente permita asociarlos sin ambigüedad. Usá fuentes oficiales o especializadas confiables: organismos de turismo, municipios, universidades, administraciones de áreas protegidas o fichas técnicas reconocidas. Evitá reseñas personales y contenido promocional.

LUGARES EXACTOS CARGADOS POR EL CLIENTE:
${JSON.stringify(requestedPlaces, null, 2)}

No conviertas una ubicación técnica en punto de encuentro del grupo. Si un dato no está respaldado, indicá que no fue encontrado.`
      : `Investigá entre 3 y 6 lugares concretos para una experiencia outdoor en ${destino}.
Priorizá los lugares mencionados en el itinerario y en la lista preliminar. Usá fuentes oficiales o especializadas confiables: parques nacionales, organismos de turismo, municipios, administraciones de áreas protegidas o fichas técnicas reconocidas. Evitá reseñas personales y contenido promocional.

ITINERARIO:
${JSON.stringify(body.itinerarioDias ?? [], null, 2)}

LUGARES PRELIMINARES:
${JSON.stringify(body.puntosInteres ?? [], null, 2)}

Para cada lugar informá solamente datos respaldados: nombre, qué lo hace relevante, ubicación geográfica o inicio técnico del sendero, distancia, duración y dificultad. Si un dato no está respaldado, indicá que no fue encontrado. No mezcles datos de rutas distintas. Incluí una fuente junto a cada afirmación.
IMPORTANTE: la ubicación o inicio técnico de un sendero nunca debe presentarse como punto de encuentro, lugar de reunión ni comienzo comercial de la salida del cliente.`

    const { client } = getActiveClient()
    const grounded = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: researchPrompt,
      config: { tools: [{ googleSearch: {} }] },
    })
    const candidate = grounded.candidates?.[0]
    const metadata = candidate?.groundingMetadata
    const chunks = (metadata?.groundingChunks ?? []) as GroundingChunk[]
    const supports = (metadata?.groundingSupports ?? []) as GroundingSupport[]
    const groundedText = addCitations(grounded.text ?? '', supports, chunks)
    if (!groundedText.trim() || chunks.length === 0) throw new Error('Google Search no devolvió fuentes verificables')

    const structurePrompt = `Convertí el informe investigado en datos estructurados para una salida outdoor.
${isRecurringGroup ? `Devolvé exactamente un objeto por cada lugar solicitado: ${requestedPlaces.join(', ')}. No agregues destinos.` : 'Usá entre 3 y 6 lugares.'} No agregues conocimiento propio ni completes datos ausentes.
Cada campo "fuente" debe contener UNA URL exacta que aparezca en los marcadores [Fuentes: ...] del informe y respalde ese lugar. Si no podés asociar una URL, omití ese lugar.
Descripción: una frase concreta y verificable, sin lenguaje promocional.

INFORME CON FUENTES:
${groundedText}

Respondé únicamente con JSON válido:
{"puntos":[{"nombre":"...","descripcion":"...","ubicacion":null,"distancia":null,"duracion":null,"dificultad":null,"fuente":"https://..."}]}`

    const structured = await generateWithRetryTracked(structurePrompt, 'estructurar-lugares-verificados')
    const parsed = extractJson(structured.text)
    const points = parsePoints(parsed.puntos, requiredPoints, maximumPoints)
    const groundedUris = new Set(chunks.map(chunk => chunk.web?.uri).filter(Boolean))
    const verified = points.filter(point => point.fuente && groundedText.includes(point.fuente))
    if (verified.length < requiredPoints) {
      throw new Error(isRecurringGroup
        ? 'No se pudo asociar cada lugar cargado con una fuente web verificable'
        : 'No se pudieron asociar al menos 3 lugares con sus fuentes de Google Search')
    }

    const resolved = await Promise.all(verified.map(async point => ({
      ...point,
      fuente: await resolveSourceUrl(point.fuente!),
    })))

    return NextResponse.json({
      data: resolved,
      metadata: {
        searchQueries: metadata?.webSearchQueries ?? [],
        sourcesFound: groundedUris.size,
      },
    })
  } catch (error) {
    console.error('[verificar-lugares]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron verificar los lugares' }, { status: 500 })
  }
}
