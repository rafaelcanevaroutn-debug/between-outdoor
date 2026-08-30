import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { resolveAdminGenerationContext } from '@/lib/admin-generation/resolve-context'
import { generateAdaptiveCarrusel } from '@/lib/generators/carrusel-formato'
import { generateCarruselPromo } from '@/lib/generators/carrusel-promo'
import {
  ADAPTIVE_CARRUSEL_FORMATS,
  PROMO_CARRUSEL_VARIANTS,
  dispatchAdminCarruselGeneration,
} from '@/lib/admin-generation/dispatch-carrusel'

// Alcance a propósito: solo los formatos adaptativos (organico, conversacion,
// itinerario, ascenso, calendario, lugar) y promo. El formato 'editorial'
// pasa por generateContentForSalida, la función legacy que mezcla video/
// carrusel/flyer y batch-index de Supabase — fuera de alcance de esta fase.

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin()
  if (authorization.error) return authorization.error

  try {
    const body = await request.json() as Record<string, unknown>
    const formato = typeof body.formato === 'string' ? body.formato : ''
    const isValid = (ADAPTIVE_CARRUSEL_FORMATS as readonly string[]).includes(formato)
      || (PROMO_CARRUSEL_VARIANTS as readonly string[]).includes(formato)
    if (!isValid) {
      return NextResponse.json(
        { error: `formato debe ser uno de: ${[...ADAPTIVE_CARRUSEL_FORMATS, ...PROMO_CARRUSEL_VARIANTS].join(', ')}` },
        { status: 400 },
      )
    }

    const clienteId = typeof body.clienteId === 'string' ? body.clienteId : ''
    const salidaId = typeof body.salidaId === 'string' ? body.salidaId : undefined
    const mockSalida = body.mockSalida && typeof body.mockSalida === 'object'
      ? body.mockSalida as Record<string, unknown>
      : undefined

    const resolved = await resolveAdminGenerationContext({ clienteId, salidaId, mockSalida: mockSalida as never })
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    const { salida, niche, clientName, clientOnboarding, vozSlug } = resolved.context

    const dispatched = await dispatchAdminCarruselGeneration(
      formato,
      { salida, niche, clientName, clientOnboarding, vozSlug, objetivoInteraccion: body.objetivoInteraccion as string },
      { generateAdaptiveCarrusel, generateCarruselPromo },
    )
    if (!dispatched.ok) return NextResponse.json({ error: dispatched.error }, { status: 400 })

    return NextResponse.json({ success: true, formato, piece: dispatched.piece, salidaSource: salidaId ? 'real' : 'mock' })
  } catch (error) {
    console.error('[ADMIN/GENERATE/CARRUSEL] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar el carrusel' },
      { status: 500 },
    )
  }
}
