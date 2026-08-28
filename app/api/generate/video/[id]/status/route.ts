import {after, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {replaceFailedVideoWithStatic} from '@/lib/video-render-fallback'
import {publicRenderError} from '@/lib/render-dispatch-retry'

export const maxDuration = 300

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})

  const [{data: callerProfile}, admin] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    Promise.resolve(createAdminClient()),
  ])
  const {data: row, error: rowError} = await admin
    .from('contenido_generado')
    .select('id,user_id,formato,render_status,render_folder_id,generation_metadata')
    .eq('id', id)
    .maybeSingle()
  if (rowError) return NextResponse.json({error: rowError.message}, {status: 500})
  if (!row || row.formato !== 'video') return NextResponse.json({error: 'Video no encontrado'}, {status: 404})
  if (callerProfile?.role !== 'admin' && row.user_id !== user.id) {
    return NextResponse.json({error: 'No autorizado'}, {status: 403})
  }

  const metadata = objectValue(row.generation_metadata)
  const jobId = typeof metadata.video_render_job_id === 'string' ? metadata.video_render_job_id : null
  if (row.render_status !== 'rendering' || !jobId) {
    return NextResponse.json({
      render_status: row.render_status,
      render_folder_id: row.render_folder_id,
      generation_metadata: metadata,
    })
  }

  const matiBase = (process.env.MATI_SKILL_VIDEOS_URL || process.env.MATI_SKILL_URL || '')
    .replace(/\/api\/[^/]+\/?$/u, '')
  if (!matiBase) {
    return NextResponse.json({
      render_status: row.render_status,
      render_folder_id: row.render_folder_id,
      generation_metadata: metadata,
    })
  }

  try {
    const token = process.env.MATI_SKILL_TOKEN?.trim()
    const response = await fetch(`${matiBase}/api/status/${encodeURIComponent(jobId)}`, {
      headers: token ? {Authorization: `Bearer ${token}`} : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (response.ok) {
      const status = await response.json() as {
        state?: string
        error?: string | null
        result?: {driveFolderId?: string; driveUrl?: string; file?: string} | null
      }
      const state = String(status.state ?? '').toLowerCase()
      const completedFileId = typeof status.result?.driveFolderId === 'string'
        ? status.result.driveFolderId
        : null
      if (state === 'completed' && completedFileId) {
        const completedMetadata = {
          ...metadata,
          video_render_error: null,
          video_render_error_code: null,
          video_render_stage: 'completed',
          video_render_progress: 100,
          video_render_completed_at: new Date().toISOString(),
          ...(status.result?.driveUrl ? {video_render_drive_url: status.result.driveUrl} : {}),
          ...(status.result?.file ? {video_render_file_name: status.result.file} : {}),
        }
        await admin.from('contenido_generado').update({
          render_status: 'rendered',
          render_folder_id: completedFileId,
          generation_metadata: completedMetadata,
          updated_at: new Date().toISOString(),
        }).eq('id', id)
        return NextResponse.json({
          render_status: 'rendered',
          render_folder_id: completedFileId,
          generation_metadata: completedMetadata,
          reconciled: true,
        })
      }
      if (state === 'failed') {
        console.error(`[RENDER/VIDEO] job=${jobId} pieza=${id} error=${status.error || 'El render falló sin detalle'}`)
        const failedMetadata = {
          ...metadata,
          video_render_error: publicRenderError('video'),
          video_render_error_code: 'renderer_rejected',
          video_render_stage: 'failed',
          video_render_failed_at: new Date().toISOString(),
        }
        await admin.from('contenido_generado').update({
          render_status: 'failed',
          generation_metadata: failedMetadata,
          updated_at: new Date().toISOString(),
        }).eq('id', id)
        after(async () => {
          try {
            await replaceFailedVideoWithStatic(admin, id)
          } catch (fallbackError) {
            console.error(`[VIDEO/STATUS] falló el reemplazo de ${id}:`, fallbackError)
          }
        })
        return NextResponse.json({
          render_status: 'failed',
          render_folder_id: null,
          generation_metadata: failedMetadata,
          reconciled: true,
        })
      }
    }
  } catch (error) {
    console.warn(`[VIDEO/STATUS] No se pudo reconciliar job ${jobId}:`, error)
  }

  return NextResponse.json({
    render_status: row.render_status,
    render_folder_id: row.render_folder_id,
    generation_metadata: metadata,
  })
}
