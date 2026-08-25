import {NextRequest, NextResponse} from 'next/server'
import {createAdminClient} from '@/lib/supabase/admin'
import type {RenderApprovalStatus} from '@/types'

interface MatiWebhookBody {
  referenceId?: string
  jobId?: string | number
  state?: string
  result?: {driveFolderId?: string; slides?: {fileId?: string; name?: string}[]} | null
  error?: string | null
}

function authorized(request: NextRequest): boolean {
  const expected = (process.env.MATI_WEBHOOK_SECRET || process.env.MATI_SKILL_TOKEN)?.trim()
  if (!expected) return false
  return request.headers.get('authorization') === `Bearer ${expected}`
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({error: 'No autorizado'}, {status: 401})

  let body: MatiWebhookBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({error: 'JSON inválido'}, {status: 400})
  }

  const referenceId = body.referenceId?.trim()
  const jobId = body.jobId != null ? String(body.jobId) : null
  if (!referenceId || !/^[a-f0-9-]{36}$/iu.test(referenceId) || !jobId) {
    return NextResponse.json({error: 'referenceId o jobId inválido'}, {status: 400})
  }

  let renderStatus: RenderApprovalStatus
  let renderFolderId: string | undefined
  if (body.state === 'completed' && body.result?.driveFolderId) {
    renderStatus = 'rendered'
    renderFolderId = body.result.driveFolderId
  } else if (body.state === 'failed' || body.state === 'completed') {
    renderStatus = 'failed'
  } else {
    renderStatus = 'rendering'
  }

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
  const renderFileIds = (body.result?.slides ?? [])
    .map(slide => slide.fileId)
    .filter((fileId): fileId is string => typeof fileId === 'string' && /^[a-zA-Z0-9_-]{8,}$/u.test(fileId))
  const update = {
    render_status: renderStatus,
    ...(renderFolderId ? {render_folder_id: renderFolderId} : {}),
    generation_metadata: {
      ...metadata,
      carrusel_render_job_id: jobId,
      carrusel_render_completed_at: renderStatus === 'rendered' ? new Date().toISOString() : null,
      carrusel_render_error: renderStatus === 'failed' ? body.error || 'El render terminó sin carpeta de Drive' : null,
      ...(renderFileIds.length > 0 ? {carrusel_render_files: renderFileIds} : {}),
    },
    updated_at: new Date().toISOString(),
  }

  const {error: updateError} = await admin.from('contenido_generado').update(update).eq('id', referenceId)
  if (updateError) return NextResponse.json({error: updateError.message}, {status: 500})

  try {
    await admin.channel(`calendar-piece-${referenceId}`).httpSend('render-status', {
      id: referenceId,
      render_status: renderStatus,
      ...(renderFolderId ? {render_folder_id: renderFolderId} : {}),
      ...(renderFileIds.length > 0 ? {render_file_ids: renderFileIds} : {}),
    })
  } catch (broadcastError) {
    console.warn('[WEBHOOK/MATI] No se pudo emitir el estado al calendario:', broadcastError)
  }

  console.log(`[WEBHOOK/MATI] job=${jobId} pieza=${referenceId} state=${body.state} → ${renderStatus}`)
  return NextResponse.json({success: true, renderStatus})
}
