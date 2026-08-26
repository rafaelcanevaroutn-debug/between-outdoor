import {NextRequest, NextResponse} from 'next/server'
import {createAdminClient} from '@/lib/supabase/admin'
import type {RenderApprovalStatus} from '@/types'

interface MatiVideoWebhookBody {
  referenceId?: string
  jobId?: string | number
  state?: string
  stage?: string
  progress?: number
  result?: {
    driveFolderId?: string
    driveUrl?: string
    file?: string
    timings?: {preparationMs?: number; lambdaMs?: number; deliveryMs?: number; totalMs?: number}
  } | null
  error?: string | null
}

function authorized(request: NextRequest): boolean {
  const expected = (process.env.MATI_WEBHOOK_SECRET || process.env.MATI_SKILL_TOKEN)?.trim()
  return Boolean(expected && request.headers.get('authorization') === `Bearer ${expected}`)
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({error: 'No autorizado'}, {status: 401})

  let body: MatiVideoWebhookBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({error: 'JSON inválido'}, {status: 400})
  }

  const referenceId = body.referenceId?.trim()
  const jobId = body.jobId == null ? null : String(body.jobId)
  if (!referenceId || !/^[a-f0-9-]{36}$/iu.test(referenceId) || !jobId) {
    return NextResponse.json({error: 'referenceId o jobId inválido'}, {status: 400})
  }

  const completedWithFile = body.state === 'completed' && Boolean(body.result?.driveFolderId)
  const renderStatus: RenderApprovalStatus = completedWithFile
    ? 'rendered'
    : body.state === 'failed' || body.state === 'completed'
      ? 'failed'
      : 'rendering'

  const admin = createAdminClient()
  const {data: current, error: readError} = await admin
    .from('contenido_generado')
    .select('generation_metadata')
    .eq('id', referenceId)
    .maybeSingle()
  if (readError) return NextResponse.json({error: readError.message}, {status: 500})
  if (!current) return NextResponse.json({error: 'Pieza no encontrada'}, {status: 404})

  const metadata = current.generation_metadata && typeof current.generation_metadata === 'object'
    ? current.generation_metadata as Record<string, unknown>
    : {}
  const stage = renderStatus === 'rendered' ? 'completed' : renderStatus === 'failed' ? 'failed' : body.stage || null
  const progress = renderStatus === 'rendered'
    ? 100
    : Number.isFinite(body.progress)
      ? Math.max(0, Math.min(100, Number(body.progress)))
      : undefined
  const update = {
    render_status: renderStatus,
    ...(completedWithFile ? {render_folder_id: body.result?.driveFolderId} : {}),
    generation_metadata: {
      ...metadata,
      video_render_job_id: jobId,
      video_render_stage: stage,
      ...(progress !== undefined ? {video_render_progress: progress} : {}),
      video_render_completed_at: renderStatus === 'rendered' ? new Date().toISOString() : null,
      video_render_error: renderStatus === 'failed'
        ? body.error || 'El render terminó sin archivo de Drive'
        : null,
      ...(body.result?.driveUrl ? {video_render_drive_url: body.result.driveUrl} : {}),
      ...(body.result?.file ? {video_render_file_name: body.result.file} : {}),
      ...(body.result?.timings?.totalMs ? {video_render_total_ms: body.result.timings.totalMs} : {}),
      ...(body.result?.timings ? {video_render_timings: body.result.timings} : {}),
    },
    updated_at: new Date().toISOString(),
  }

  const {error: updateError} = await admin.from('contenido_generado').update(update).eq('id', referenceId)
  if (updateError) return NextResponse.json({error: updateError.message}, {status: 500})

  try {
    await admin.channel(`calendar-piece-${referenceId}`).httpSend('render-status', {
      id: referenceId,
      render_status: renderStatus,
      stage,
      progress,
      ...(completedWithFile ? {render_folder_id: body.result?.driveFolderId} : {}),
    })
  } catch (broadcastError) {
    console.warn('[WEBHOOK/MATI/VIDEO] No se pudo emitir el estado al calendario:', broadcastError)
  }

  console.log(`[WEBHOOK/MATI/VIDEO] job=${jobId} pieza=${referenceId} state=${body.state} → ${renderStatus}`)
  return NextResponse.json({success: true, renderStatus})
}
