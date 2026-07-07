import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRenderCarpetasByIds } from '@/lib/google-drive'

export const maxDuration = 30

// Piezas sin render_folder_id creadas hace más de este tiempo se consideran expiradas.
// Debe ser mayor que el timeout del servidor (72 × 5s = 6 min) para dar margen.
const RENDER_TIMEOUT_MS = 7 * 60 * 1000 // 7 minutos

/**
 * GET /api/renders/batch?piezaIds=id1,id2,...
 *
 * 1. Lee render_folder_id y created_at de contenido_generado para esos IDs
 * 2. Para los que ya tienen render_folder_id, los busca en Drive
 * 3. Devuelve { ready: RenderCarpeta[], pending: number, timedOut: number }
 *    pending   = piezas sin render_folder_id aún dentro del plazo (Mati procesando)
 *    timedOut  = piezas sin render_folder_id que superaron RENDER_TIMEOUT_MS
 *                El cliente para el polling cuando pending === 0 (timedOut no bloquea)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const raw = req.nextUrl.searchParams.get('piezaIds') ?? ''
    const piezaIds = raw.split(',').filter(Boolean)
    if (piezaIds.length === 0) {
      return NextResponse.json({ ready: [], pending: 0, timedOut: 0 })
    }

    // Fetch render_folder_id + created_at for each piece
    const { data: piezas } = await createAdminClient()
      .from('contenido_generado')
      .select('id, render_folder_id, created_at')
      .in('id', piezaIds)

    const now = Date.now()
    const sinRender = (piezas ?? []).filter(p => !p.render_folder_id)
    const timedOut  = sinRender.filter(p => now - new Date(p.created_at as string).getTime() > RENDER_TIMEOUT_MS).length
    const pending   = sinRender.length - timedOut

    const folderIds = [...new Set(
      (piezas ?? [])
        .map(p => p.render_folder_id as string | null)
        .filter((id): id is string => !!id),
    )]

    if (folderIds.length === 0) {
      return NextResponse.json({ ready: [], pending, timedOut })
    }

    const carpetas = await getRenderCarpetasByIds(folderIds)
    return NextResponse.json({ ready: carpetas, pending, timedOut })
  } catch (err) {
    console.error('[RENDERS/BATCH]', err)
    return NextResponse.json({ error: 'Error al cargar renders del batch' }, { status: 500 })
  }
}
