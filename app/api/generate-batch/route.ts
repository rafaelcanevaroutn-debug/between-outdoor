import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runWeeklyBatch, type WeeklyBatchVideoPiezaInput } from '@/lib/orchestrators/weekly-batch'
import { VIDEO_SUBFAMILIES } from '@/lib/video-generation-dispatch'
import { isVideoTypographyId } from '@/lib/generators/video-typography'
import type { VideoKnowledgeFormat } from '@/types'

export const maxDuration = 300 // 5 minutes max for background tasks if deployed
export const fetchCache = 'force-no-store'
export const dynamic = 'force-dynamic'

function normalizeVideoPiezas(raw: unknown): WeeklyBatchVideoPiezaInput[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const normalized: WeeklyBatchVideoPiezaInput[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const { subfamilia, salidaId, tipografiasPermitidas, canalesHabilitados, publicationDate } = item as Record<string, unknown>
    if (typeof subfamilia !== 'string' || !VIDEO_SUBFAMILIES.has(subfamilia as VideoKnowledgeFormat)) continue
    if (typeof salidaId !== 'string' || !salidaId.trim()) continue
    const fonts = Array.isArray(tipografiasPermitidas)
      ? tipografiasPermitidas.filter((v): v is string => typeof v === 'string' && isVideoTypographyId(v))
      : []
    if (fonts.length === 0) continue
    normalized.push({
      subfamilia: subfamilia as VideoKnowledgeFormat,
      salidaId,
      tipografiasPermitidas: fonts as WeeklyBatchVideoPiezaInput['tipografiasPermitidas'],
      ...(Array.isArray(canalesHabilitados) && { canalesHabilitados: canalesHabilitados.filter((v): v is string => typeof v === 'string') }),
      ...(typeof publicationDate === 'string' && { publicationDate }),
    })
  }
  return normalized.length > 0 ? normalized : undefined
}

export async function POST(request: NextRequest) {
  try {
    const { clientId, videoPiezas: rawVideoPiezas } = await request.json().catch(() => ({}))
    const videoPiezas = normalizeVideoPiezas(rawVideoPiezas)
    if (videoPiezas?.some(p => (p.subfamilia === '4' || p.subfamilia === '5') && (p.canalesHabilitados ?? []).length === 0)) {
      return NextResponse.json({ error: 'Familia 4 y el fallback comercial de Familia 5 requieren al menos un canal habilitado' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!callerProfile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    if (clientId && clientId !== user.id && callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado para generar el calendario de otro cliente' }, { status: 403 })
    }

    const targetClientId: string = clientId || user.id
    const admin = createAdminClient()

    const { data: targetProfile } = await admin.from('profiles').select('id, calendario_asignado').eq('id', targetClientId).single()
    if (!targetProfile) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const { data: salidas } = await admin
      .from('salidas')
      .select('id, nombre, fecha_inicio, estado, carpeta_fotos_id, carpeta_videos_id')
      .eq('user_id', targetClientId)

    const today = new Date().toISOString().slice(0, 10)
    const activeSalidas = (salidas ?? []).filter(s => s.estado !== 'completada' && s.fecha_inicio >= today)
    if (activeSalidas.length === 0 && (salidas ?? []).length === 0) {
      return NextResponse.json({ error: 'Primero tenés que cargar una salida para generar el contenido' }, { status: 400 })
    }
    const missingVideos = activeSalidas.filter(s => !s.carpeta_videos_id)
    if (missingVideos.length > 0 && !videoPiezas) {
      return NextResponse.json({ error: 'Hay salidas activas sin videos vinculados. Vinculá una carpeta de videos antes de generar.' }, { status: 400 })
    }

    const { data: run, error: insertError } = await admin
      .from('calendar_batch_runs')
      .insert({ user_id: targetClientId, calendar_code: targetProfile.calendario_asignado, status: 'pending' })
      .select('id')
      .single()

    if (insertError || !run) {
      return NextResponse.json({ error: insertError?.message ?? 'No se pudo crear la corrida del batch' }, { status: 500 })
    }

    // Ejecutamos en background explícitamente sin usar `after()` para
    // que el servidor de dev no trague excepciones ni suspenda el hilo.
    Promise.resolve().then(() => runWeeklyBatch({
      runId: run.id,
      clientId: targetClientId,
      admin,
      videoPiezas,
    })).catch(err => {
      console.error('[BATCH ROUTE] Error iniciando background task:', err)
    })

    return NextResponse.json({ runId: run.id, status: 'pending' }, { status: 202 })
  } catch (error) {
    console.error('Generate-batch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al iniciar el batch' },
      { status: 500 },
    )
  }
}
