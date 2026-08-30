import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { resolveAdminGenerationContext } from '@/lib/admin-generation/resolve-context'
import { isVideoTypographyId } from '@/lib/generators/video-typography'
import { generateVideoFamilia1a } from '@/lib/generators/video-familia-1a'
import { generateVideoFamilia1b } from '@/lib/generators/video-familia-1b'
import { generateVideoFamilia1c } from '@/lib/generators/video-familia-1c'
import { generateVideoFamilia2 } from '@/lib/generators/video-familia-2'
import { generateVideoFamilia3 } from '@/lib/generators/video-familia-3'
import { generateVideoFamilia4 } from '@/lib/generators/video-familia-4'
import { generateVideoFamilia5 } from '@/lib/generators/video-familia-5'
import { dispatchAdminVideoGeneration } from '@/lib/admin-generation/dispatch-video'
import type { VideoKnowledgeFormat, VideoTypographyId } from '@/types'

// Namespace separado de app/api/generate/route.ts a propósito: cuando exista
// un gate de límites para el cliente, se implementará ahí — esta ruta queda
// afuera por construcción, no por un flag a chequear en cada llamada.

const VALID_SUBFAMILIAS: VideoKnowledgeFormat[] = ['1a', '1b', '1c', '2a', '2b', '2c', '3a', '3b', '3c', '3d', '3e', '4', '5']

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin()
  if (authorization.error) return authorization.error

  try {
    const body = await request.json() as Record<string, unknown>
    const subfamilia = body.subfamilia as VideoKnowledgeFormat
    if (!VALID_SUBFAMILIAS.includes(subfamilia)) {
      return NextResponse.json({ error: `subfamilia debe ser una de: ${VALID_SUBFAMILIAS.join(', ')}` }, { status: 400 })
    }
    const clienteId = typeof body.clienteId === 'string' ? body.clienteId : ''
    const salidaId = typeof body.salidaId === 'string' ? body.salidaId : undefined
    const mockSalida = body.mockSalida && typeof body.mockSalida === 'object'
      ? body.mockSalida as Record<string, unknown>
      : undefined

    const tipografiasPermitidas = Array.isArray(body.tipografiasPermitidas)
      ? body.tipografiasPermitidas.filter((value): value is string => typeof value === 'string').filter(isVideoTypographyId)
      : []
    if (tipografiasPermitidas.length === 0) {
      return NextResponse.json({ error: 'tipografiasPermitidas requiere al menos un ID válido' }, { status: 400 })
    }
    const canalesHabilitados = Array.isArray(body.canalesHabilitados)
      ? body.canalesHabilitados.filter((value): value is string => typeof value === 'string')
      : []
    if ((subfamilia === '4' || subfamilia === '5') && canalesHabilitados.length === 0) {
      return NextResponse.json({ error: 'Familia 4 y 5 requieren al menos un canal habilitado' }, { status: 400 })
    }

    const resolved = await resolveAdminGenerationContext({ clienteId, salidaId, mockSalida: mockSalida as never })
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    const { salida, niche, clientName, clientOnboarding, vozSlug } = resolved.context

    const commonVideoParams = {
      salida,
      niche,
      clientName,
      clientOnboarding,
      vozSlug,
      tipografiasPermitidas: tipografiasPermitidas as VideoTypographyId[],
      clipDurationSeconds: typeof body.clipDurationSeconds === 'number' ? body.clipDurationSeconds : undefined,
    }

    const { piece, stubUnknownOrigin } = await dispatchAdminVideoGeneration(
      subfamilia,
      commonVideoParams,
      { publicationDate: typeof body.publicationDate === 'string' ? body.publicationDate : undefined, canalesHabilitados },
      {
        generateVideoFamilia1a,
        generateVideoFamilia1b,
        generateVideoFamilia1c,
        generateVideoFamilia2,
        generateVideoFamilia3,
        generateVideoFamilia4,
        generateVideoFamilia5,
      },
    )

    return NextResponse.json({ success: true, subfamilia, stubUnknownOrigin, piece, salidaSource: salidaId ? 'real' : 'mock' })
  } catch (error) {
    console.error('[ADMIN/GENERATE/VIDEO] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar el video' },
      { status: 500 },
    )
  }
}
