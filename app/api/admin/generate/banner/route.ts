import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { resolveAdminGenerationContext } from '@/lib/admin-generation/resolve-context'
import { runBannerMolde1 } from '@/lib/generators/banner-molde-1-run'
import { generateBannerMolde1Copy } from '@/lib/generators/banner-molde-1-copy'
import { generateBannerMolde1Items } from '@/lib/generators/banner-molde-1-items'
import { runBannerMolde2 } from '@/lib/generators/banner-molde-2-run'
import { generateVideoFamilia5 } from '@/lib/generators/video-familia-5'
import { generateBannerCtaSuave } from '@/lib/generators/banner-cta-suave'
import { buildBannerMolde3, buildBannerMolde5 } from '@/lib/generators/banner-moldes-commercial'
import { runBannerMolde4 } from '@/lib/generators/banner-molde-4-run'
import { runBannerMolde6 } from '@/lib/generators/banner-molde-6-run'
import { generateVideoFamilia3 } from '@/lib/generators/video-familia-3'
import { generateBannerMolde6Convocatoria } from '@/lib/generators/banner-molde-6-convocatoria'
import { BANNER_MOLDE_1_CAPS } from '@/lib/banner-render-contract'
import { isVideoTypographyId } from '@/lib/generators/video-typography'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchAdminBannerGeneration } from '@/lib/admin-generation/dispatch-banner'
import type { Salida, VideoTypographyId } from '@/types'

// Prueba de copy solamente: a diferencia de app/api/generate/banner/route.ts
// no pide backgroundDriveFileId ni valida el banco de fotos del cliente —
// el modo admin no renderiza ni inserta, solo genera y devuelve el texto.

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin()
  if (authorization.error) return authorization.error

  try {
    const body = await request.json() as Record<string, unknown>
    const moldType = typeof body.moldType === 'number' && Number.isInteger(body.moldType) ? body.moldType : 0
    if (moldType < 1 || moldType > 6) return NextResponse.json({ error: 'moldType debe estar entre 1 y 6' }, { status: 400 })

    const clienteId = typeof body.clienteId === 'string' ? body.clienteId : ''
    const salidaId = typeof body.salidaId === 'string' ? body.salidaId : undefined
    const mockSalida = body.mockSalida && typeof body.mockSalida === 'object'
      ? body.mockSalida as Record<string, unknown>
      : undefined
    const canalesHabilitados = Array.isArray(body.canalesHabilitados)
      ? body.canalesHabilitados.filter((value): value is string => typeof value === 'string')
      : []
    const tipografiasPermitidas: VideoTypographyId[] = Array.isArray(body.tipografiasPermitidas)
      ? body.tipografiasPermitidas.filter((value): value is string => typeof value === 'string').filter(isVideoTypographyId)
      : ['Inter', 'Playfair Display']

    // Molde 4 ("Próximas salidas") compone una agenda de 2-4 salidas reales
    // del cliente — no calza con el modelo de "una salida MOCK o REAL" del
    // resto de los moldes, y no usa IA (runBannerMolde4 no toma niche ni
    // onboarding), así que se resuelve aparte, siempre contra la base real.
    if (moldType === 4) {
      if (!clienteId) return NextResponse.json({ error: 'clienteId es requerido' }, { status: 400 })
      const ids = Array.isArray(body.salidaIds)
        ? [...new Set(body.salidaIds.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/iu.test(id)))].slice(0, 4)
        : []
      if (ids.length < 2) return NextResponse.json({ error: 'Molde 4 requiere salidaIds con 2 a 4 salidas reales del cliente' }, { status: 400 })
      const admin = createAdminClient()
      const { data: scheduleRows, error: scheduleError } = await admin.from('salidas').select('*').in('id', ids).eq('user_id', clienteId)
      if (scheduleError) return NextResponse.json({ error: scheduleError.message }, { status: 500 })
      const byId = new Map((scheduleRows ?? []).map(item => [item.id, item as Salida]))
      const salidasParaAgenda = ids.flatMap(id => byId.get(id) ? [byId.get(id) as Salida] : [])
      const result = runBannerMolde4({ salidas: salidasParaAgenda, cta: typeof body.cta === 'string' ? body.cta : undefined, typographyId: 'Inter' })
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
      return NextResponse.json({ success: true, moldType, content: result.content, salidaSource: 'real' })
    }

    const resolved = await resolveAdminGenerationContext({ clienteId, salidaId, mockSalida: mockSalida as never })
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    const { salida, niche, clientName, clientOnboarding, vozSlug } = resolved.context
    const common = { salida, niche, clientName, clientOnboarding, vozSlug, tipografiasPermitidas, canalesHabilitados }

    const dispatched = await dispatchAdminBannerGeneration(
      moldType as 1 | 2 | 3 | 5 | 6,
      common,
      {
        cta: typeof body.cta === 'string' ? body.cta : undefined,
        caps: {
          copyMaxCharacters: BANNER_MOLDE_1_CAPS.copy,
          lugarMaxCharacters: BANNER_MOLDE_1_CAPS.lugar,
          fechaMaxCharacters: BANNER_MOLDE_1_CAPS.fecha,
          itemMaxCharacters: BANNER_MOLDE_1_CAPS.item,
        },
      },
      {
        runBannerMolde1,
        generateBannerMolde1Copy,
        generateBannerMolde1Items,
        runBannerMolde2,
        generateVideoFamilia5,
        generateBannerCtaSuave,
        buildBannerMolde3,
        buildBannerMolde5,
        runBannerMolde6,
        generateVideoFamilia3,
        generateBannerMolde6Convocatoria,
      },
    )
    if (!dispatched.ok) return NextResponse.json({ error: dispatched.error }, { status: 422 })

    return NextResponse.json({ success: true, moldType, content: dispatched.content, salidaSource: salidaId ? 'real' : 'mock' })
  } catch (error) {
    console.error('[ADMIN/GENERATE/BANNER] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar el banner' },
      { status: 500 },
    )
  }
}
