import type { createAdminClient } from '@/lib/supabase/admin'
import type { RenderApprovalStatus } from '@/types'
import type { BannerMolde1RenderPayload } from './banner-render-contract.ts'
import type {ApprovedLibraryPreviewPayload} from './creative-lab/production-library.ts'

type AdminClient = ReturnType<typeof createAdminClient>

export interface BannerRenderSource {
  id: string
  payload: BannerMolde1RenderPayload | ApprovedLibraryPreviewPayload
}

export interface BannerRenderDispatchContext {
  admin: AdminClient
  matiBase: string
  matiBannerUrl: string | null
  matiToken?: string
  fetchImpl?: typeof fetch
  sleep?: (milliseconds: number) => Promise<void>
  pollIntervalMs?: number
  maxPollAttempts?: number
  persistRenderState?: (
    status: RenderApprovalStatus,
    metadataPatch: Record<string, unknown>,
    renderFileId?: string,
  ) => Promise<void>
}

const POLL_INTERVAL_MS = 5_000
const MAX_POLL_ATTEMPTS = 72

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

async function persistState(
  source: BannerRenderSource,
  ctx: BannerRenderDispatchContext,
  status: RenderApprovalStatus,
  metadataPatch: Record<string, unknown>,
  renderFileId?: string,
): Promise<void> {
  if (ctx.persistRenderState) {
    await ctx.persistRenderState(status, metadataPatch, renderFileId)
    return
  }
  const { data: current } = await ctx.admin
    .from('contenido_generado')
    .select('generation_metadata')
    .eq('id', source.id)
    .maybeSingle()
  const metadata = objectValue(current?.generation_metadata) ?? {}
  const update: Record<string, unknown> = {
    render_status: status,
    generation_metadata: { ...metadata, ...metadataPatch },
    updated_at: new Date().toISOString(),
  }
  if (renderFileId) update.render_folder_id = renderFileId
  const { error } = await ctx.admin.from('contenido_generado').update(update).eq('id', source.id)
  if (error) throw new Error(`No se pudo persistir el estado ${status}: ${error.message}`)
}

async function fail(
  source: BannerRenderSource,
  ctx: BannerRenderDispatchContext,
  message: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await persistState(source, ctx, 'failed', {
    ...metadata,
    banner_render_error: message,
    banner_render_failed_at: new Date().toISOString(),
  })
}

export async function dispatchBannerRender(
  source: BannerRenderSource,
  ctx: BannerRenderDispatchContext,
): Promise<void> {
  if (!ctx.matiBannerUrl || !ctx.matiBase) {
    await fail(source, ctx, 'MATI_SKILL_URL no está configurada para banners')
    return
  }
  const fetchImpl = ctx.fetchImpl ?? fetch
  const sleep = ctx.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)))
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(ctx.matiToken ? { Authorization: `Bearer ${ctx.matiToken}` } : {}),
  }

  let response: Response
  try {
    response = await fetchImpl(ctx.matiBannerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(source.payload),
    })
  } catch (error) {
    await fail(source, ctx, `Error enviando el banner: ${error instanceof Error ? error.message : error}`)
    return
  }
  const rawBody = await response.text()
  if (response.status !== 202) {
    await fail(source, ctx, `Mati respondió HTTP ${response.status}; esperaba 202`, {
      banner_render_response: rawBody.slice(0, 500),
    })
    return
  }

  let accepted: { jobId?: string }
  try {
    accepted = JSON.parse(rawBody)
  } catch {
    await fail(source, ctx, 'Mati respondió 202 con body inválido')
    return
  }
  if (!accepted.jobId) {
    await fail(source, ctx, 'Mati respondió 202 sin jobId')
    return
  }
  const jobId = accepted.jobId
  await persistState(source, ctx, 'rendering', {
    banner_render_job_id: jobId,
    banner_render_started_at: new Date().toISOString(),
    banner_render_error: null,
  })

  const statusHeaders = ctx.matiToken ? { Authorization: `Bearer ${ctx.matiToken}` } : undefined
  const pollIntervalMs = ctx.pollIntervalMs ?? POLL_INTERVAL_MS
  const maxPollAttempts = ctx.maxPollAttempts ?? MAX_POLL_ATTEMPTS
  for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
    await sleep(pollIntervalMs)
    let statusResponse: Response
    try {
      statusResponse = await fetchImpl(`${ctx.matiBase}/api/banner/status/${jobId}`, { headers: statusHeaders })
    } catch {
      continue
    }
    if (!statusResponse.ok) continue
    const status = await statusResponse.json() as {
      state?: string
      error?: string
      result?: {
        driveFileId?: string
        downloadUrl?: string
        templateId?: string
        width?: number
        height?: number
      }
    }
    if (status.state === 'completed') {
      const driveFileId = status.result?.driveFileId
      const downloadPath = status.result?.downloadUrl
      if (!driveFileId || !downloadPath) {
        await fail(source, ctx, 'El render terminó sin persistencia privada en Drive', { banner_render_job_id: jobId })
        return
      }
      await persistState(source, ctx, 'rendered', {
        banner_render_job_id: jobId,
        banner_render_completed_at: new Date().toISOString(),
        banner_render_error: null,
        banner_render_download_path: downloadPath,
        banner_render_drive_file_id: driveFileId,
        banner_render_template_id: status.result?.templateId,
        banner_render_width: status.result?.width,
        banner_render_height: status.result?.height,
      }, driveFileId)
      return
    }
    if (status.state === 'failed') {
      await fail(source, ctx, status.error || 'Mati informó que el render falló', { banner_render_job_id: jobId })
      return
    }
  }
  await fail(source, ctx, 'Timeout esperando el render de banner', { banner_render_job_id: jobId })
}
