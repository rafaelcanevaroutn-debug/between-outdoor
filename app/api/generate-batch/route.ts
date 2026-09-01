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
    const { clientId, salidaId: rawSalidaId, videoPiezas: rawVideoPiezas } = await request.json().catch(() => ({}))
    const salidaId = typeof rawSalidaId === 'string' && rawSalidaId.trim() ? rawSalidaId.trim() : undefined
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
      .select('id, nombre, fecha_inicio, estado, tipo_viaje, carpeta_fotos_id, carpeta_videos_id')
      .eq('user_id', targetClientId)

    const today = new Date().toISOString().slice(0, 10)
    const activeSalidas = (salidas ?? []).filter(s => (
      s.estado !== 'completada'
      && (s.tipo_viaje === 'salida_recurrente' || Boolean(s.fecha_inicio && s.fecha_inicio >= today))
    ))
    const selectedSalida = salidaId ? activeSalidas.find(s => s.id === salidaId) : null
    if (salidaId && !selectedSalida) {
      return NextResponse.json({ error: 'La salida elegida no existe, no está activa o no pertenece a este cliente' }, { status: 400 })
    }
    const generationSalidas = selectedSalida ? [selectedSalida] : activeSalidas
    if ((salidas ?? []).length === 0) {
      return NextResponse.json({ error: 'Primero tenés que cargar una salida para generar el contenido' }, { status: 400 })
    }
    if (activeSalidas.length === 0) {
      return NextResponse.json({ error: 'No hay salidas futuras ni grupos recurrentes activos para generar esta semana' }, { status: 400 })
    }
    const missingPhotos = generationSalidas.filter(s => !s.carpeta_fotos_id)
    if (missingPhotos.length > 0) {
      return NextResponse.json({ error: 'Hay salidas activas sin fotos vinculadas. Vinculá una carpeta de fotos antes de generar.' }, { status: 400 })
    }
    const missingVideos = generationSalidas.filter(s => !s.carpeta_videos_id)
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

    try {
      runWeeklyBatch({
        runId: run.id,
        clientId: targetClientId,
        admin,
        videoPiezas,
        salidaId,
      }).catch(error => {
        console.error('[BATCH ROUTE] Error ejecutando la generación semanal:', error)
      })
    } catch (error) {
      console.error('[BATCH ROUTE] Error ejecutando la generación semanal:', error)
    }

    return NextResponse.json({ runId: run.id, status: 'pending' }, { status: 202 })
  } catch (error) {
    console.error('Generate-batch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al iniciar el batch' },
      { status: 500 },
    )
  }
}
