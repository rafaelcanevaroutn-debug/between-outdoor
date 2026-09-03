import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import type { DiaItinerario, PuntoInteres } from '@/types'

type DataType = 'itinerario' | 'puntos_interes'

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Gemini no devolvió JSON válido')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function parseDays(value: unknown): DiaItinerario[] {
  if (!Array.isArray(value)) throw new Error('No se detectaron días válidos')
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`Día ${index + 1} inválido`)
    const item = raw as Record<string, unknown>
    const titulo = optionalText(item.titulo)
    const descripcion = optionalText(item.descripcion)
    if (!titulo || !descripcion) throw new Error(`Al día ${index + 1} le falta actividad o descripción`)
    return {
      numero: index + 1,
      titulo,
      descripcion,
      horario: optionalText(item.horario),
      hito: optionalText(item.hito),
    }
  })
}

function parsePlaces(value: unknown): PuntoInteres[] {
  if (!Array.isArray(value)) throw new Error('No se detectaron lugares válidos')
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`Lugar ${index + 1} inválido`)
    const item = raw as Record<string, unknown>
    const nombre = optionalText(item.nombre)
    const descripcion = optionalText(item.descripcion)
    if (!nombre || !descripcion) throw new Error(`Al lugar ${index + 1} le falta nombre o descripción`)
    return {
      nombre,
      descripcion,
      ubicacion: optionalText(item.ubicacion),
      distancia: optionalText(item.distancia),
      duracion: optionalText(item.duracion),
      dificultad: optionalText(item.dificultad),
      fuente: optionalText(item.fuente),
    }
  })
}

function buildPrompt(tipo: DataType, texto: string): string {
  const common = `Organizá información pegada por un usuario de turismo outdoor.
Tu trabajo es extraer y ordenar, no redactar contenido publicitario.

REGLAS OBLIGATORIAS:
- Usá exclusivamente datos explícitos del texto.
- No completes información faltante con conocimiento propio.
- No inventes horarios, distancias, dificultad, duración, ubicaciones, fuentes ni etapas.
- Conservá nombres propios, cifras, unidades y calificadores como "aproximadamente".
- Si un dato opcional no aparece, devolvé null.
- Corregí solamente errores ortográficos evidentes sin alterar el significado.

TEXTO DEL USUARIO:
---
${texto}
---`

  if (tipo === 'itinerario') return `${common}

Detectá los días o etapas en el orden cronológico.
MUY IMPORTANTE: Si el texto agrupa varios días juntos (ej: "Días 2 al 5", "Los primeros 4 días", "Días libres"), DEBÉS separar y crear un objeto individual para CADA UNO de esos días en tu respuesta JSON, repitiendo la descripción para cada día si es necesario, para que el itinerario refleje la cantidad real de días del viaje.
Asegurate de que el campo "numero" sea estrictamente secuencial (1, 2, 3, 4...). No omitas días intermedios.
"titulo" resume la actividad principal. "descripcion" conserva todos los detalles reales de ese día.
"horario" solo puede contener un horario explícito. "hito" solo un momento o punto destacado explícito.

Respondé únicamente con JSON válido:
{"dias":[{"numero":1,"titulo":"...","descripcion":"...","horario":null,"hito":null}]}`

  return `${common}

Detectá lugares, senderos, miradores, lagunas o puntos del recorrido.
Una fuente puede ser una URL, organismo, documento o referencia que el usuario haya pegado explícitamente.
No atribuyas una fuente general a un lugar si el texto no permite asociarlos con razonable claridad.
Los lugares sin fuente deben conservar "fuente": null y quedarán pendientes de verificación.

Respondé únicamente con JSON válido:
{"puntos":[{"nombre":"...","descripcion":"...","ubicacion":null,"distancia":null,"duracion":null,"dificultad":null,"fuente":null}]}`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { tipo, texto } = await request.json() as { tipo?: DataType; texto?: string }
    if (tipo !== 'itinerario' && tipo !== 'puntos_interes') {
      return NextResponse.json({ error: 'Tipo de información inválido' }, { status: 400 })
    }
    const normalized = texto?.trim() ?? ''
    if (normalized.length < 20) return NextResponse.json({ error: 'Pegá un poco más de información para poder organizarla.' }, { status: 400 })
    if (normalized.length > 20_000) return NextResponse.json({ error: 'El texto supera el máximo de 20.000 caracteres.' }, { status: 400 })

    const result = await generateWithRetryTracked(buildPrompt(tipo, normalized), `organizar-${tipo}`)
    const parsed = extractJson(result.text) as Record<string, unknown>
    const data = tipo === 'itinerario' ? parseDays(parsed.dias) : parsePlaces(parsed.puntos)

    return NextResponse.json({
      data,
      metadata: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
    })
  } catch (error) {
    console.error('[organizar-datos]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo organizar la información' }, { status: 500 })
  }
}
