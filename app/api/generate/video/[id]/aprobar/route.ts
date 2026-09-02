import { after, NextRequest, NextResponse } from 'next/server' // HMR refresh
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rebuildApprovedVideoContract } from '@/lib/video-approved-contract'
import { dispatchFamiliesVideoRender, resolveMusicFolderIdFromContext } from '@/lib/mati-families-video-dispatch'
import {
  createReflexiveVideoContent,
  pendingMatiContainerContractError,
} from '@/lib/video-render-container'

const LEGACY_APPROVED_STATUS = 'approved_pending_contract'
const ACTIVE_STATUSES = new Set(['dispatching', 'rendering'])

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID de contenido requerido' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const admin = createAdminClient()
    const { data: row, error: rowError } = await admin
      .from('contenido_generado')
      .select('id, salida_id, user_id, formato, titulo, subtitulo, bullets, cta, video_crudo, mes, generation_metadata, render_status, approved_at, approved_by, render_folder_id')
      .eq('id', id)
      .maybeSingle()

    if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'Pieza no encontrada' }, { status: 404 })
    if (callerProfile?.role !== 'admin' && row.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para aprobar esta pieza' }, { status: 403 })
    }
    if (row.formato !== 'video') {
      return NextResponse.json({ error: 'La pieza no es un video' }, { status: 400 })
    }

    const rebuilt = rebuildApprovedVideoContract(row)
    if (!rebuilt.ok) return NextResponse.json({ error: rebuilt.error }, { status: 400 })

    const pendingContainerError = pendingMatiContainerContractError(row.generation_metadata)
    if (pendingContainerError) {
      return NextResponse.json({ error: pendingContainerError }, { status: 409 })
    }

    const existingMetadata = (row.generation_metadata as Record<string, unknown> | null) ?? {}
    const existingJobId = typeof existingMetadata.video_render_job_id === 'string' ? existingMetadata.video_render_job_id : null
    const matiBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+\/?$/u, '')
    const matiVideoUrl = process.env.MATI_SKILL_VIDEOS_URL || (matiBase ? `${matiBase}/api/generar-video` : null)

    // Si ya existe un jobId de Mati, verificar primero si sigue en proceso o si ya terminó
    if (existingJobId && matiVideoUrl) {
      const matiApiBase = matiVideoUrl.replace(/\/api\/[^/]+\/?$/u, '')
      const statusUrl = `${matiApiBase}/api/status/${existingJobId}`
      const matiToken = process.env.MATI_SKILL_TOKEN?.trim()
      const headers = matiToken ? { Authorization: `Bearer ${matiToken}` } : undefined
      try {
        const statusRes = await fetch(statusUrl, { headers })
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          const state = String(statusData.state ?? '').toLowerCase()
          if (state === 'completed' && statusData.result?.driveFolderId) {
            const driveFolderId = String(statusData.result.driveFolderId)
            const updatedMeta = { ...existingMetadata, video_render_error: null, video_render_completed_at: new Date().toISOString() }
            await admin.from('contenido_generado').update({
              render_status: 'rendered',
              render_folder_id: driveFolderId,
              generation_metadata: updatedMeta,
              updated_at: new Date().toISOString(),
            }).eq('id', id)
            return NextResponse.json({
              success: true,
              status: 'rendered',
              renderFolderId: driveFolderId,
              dispatched: false,
              idempotent: true,
            })
          }
          if (['active', 'processing', 'queued', 'waiting', 'rendering'].includes(state)) {
            // El render sigue en proceso en Mati — restaurar estado 'rendering' sin disparar un nuevo job
            const updatedMeta = { ...existingMetadata, video_render_error: null }
            await admin.from('contenido_generado').update({
              render_status: 'rendering',
              generation_metadata: updatedMeta,
              updated_at: new Date().toISOString(),
            }).eq('id', id)
            return NextResponse.json({
              success: true,
              status: 'rendering',
              approvedAt: row.approved_at,
              approvedBy: row.approved_by,
              generationMetadata: updatedMeta,
              dispatched: false,
              idempotent: true,
            })
          }
        }
      } catch (err) {
        console.warn(`[APROBAR/CHECK] No se pudo verificar el jobId ${existingJobId}:`, err)
      }
    }

    if (row.render_status === 'rendered') {
      return NextResponse.json({
        success: true,
        status: 'rendered',
        renderFolderId: row.render_folder_id,
        dispatched: false,
        idempotent: true,
      })
    }
    if (ACTIVE_STATUSES.has(row.render_status ?? '')) {
      return NextResponse.json({
        success: true,
        status: row.render_status,
        approvedAt: row.approved_at,
        approvedBy: row.approved_by,
        generationMetadata: row.generation_metadata,
        dispatched: false,
        idempotent: true,
      })
    }
    if (
      row.render_status !== null
      && row.render_status !== 'pending_review'
      && row.render_status !== LEGACY_APPROVED_STATUS
      && row.render_status !== 'failed'
    ) {
      return NextResponse.json(
        { error: `La pieza no puede aprobarse desde el estado ${row.render_status}` },
        { status: 409 },
      )
    }

    const [{ data: ownerProfile, error: ownerError }, { data: brandIdentity }, { data: salida, error: salidaError }] = await Promise.all([
      admin.from('profiles').select('company_name, full_name').eq('id', row.user_id).maybeSingle(),
      admin.from('brand_identity').select('mati_cliente_id, color_primario, color_texto, font_body, videos_folder_id').eq('user_id', row.user_id).maybeSingle(),
      admin.from('salidas').select('fecha_inicio, carpeta_videos_id, carpeta_videos_nombre, zona_geografica, context_tags').eq('id', row.salida_id).maybeSingle(),
    ])
    if (ownerError) return NextResponse.json({ error: ownerError.message }, { status: 500 })
    if (!ownerProfile) return NextResponse.json({ error: 'Perfil propietario no encontrado' }, { status: 404 })
    if (salidaError) return NextResponse.json({ error: salidaError.message }, { status: 500 })
    if (!salida) return NextResponse.json({ error: 'Salida de la pieza no encontrada' }, { status: 404 })

    const currentMetadata = row.generation_metadata as Record<string, unknown>
    const approvedAt = row.approved_at ?? new Date().toISOString()
    const approvedBy = row.approved_by ?? user.id
    const musicFolderId = resolveMusicFolderIdFromContext({
      explicitFolderId: typeof currentMetadata.music_folder_id === 'string' ? currentMetadata.music_folder_id : null,
      zonaGeografica: salida.zona_geografica,
      contentContextTags: salida.context_tags,
    })
    const nextMetadata = {
      ...currentMetadata,
      ...(salida.carpeta_videos_id ? { video_folder_id: salida.carpeta_videos_id } : {}),
      ...(salida.zona_geografica ? { zona_geografica: salida.zona_geografica } : {}),
      ...(salida.context_tags?.length ? { content_context_tags: salida.context_tags } : {}),
      ...(musicFolderId ? { music_folder_id: musicFolderId } : {}),
      approved_video_contract: rebuilt.contract,
      approved_video_contract_version: 1,
      ...(rebuilt.subfamilia === '3a'
        ? {
            render_content_contract: createReflexiveVideoContent(
              String(rebuilt.contract.copy),
              String(rebuilt.contract.tipografia_id),
            ),
          }
        : {}),
      video_render_error: null,
    }
    let updateQuery = admin
      .from('contenido_generado')
      .update({
        generation_metadata: nextMetadata,
        render_status: 'dispatching',
        approved_at: approvedAt,
        approved_by: approvedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (row.render_status === null) {
      updateQuery = updateQuery.is('render_status', null)
    } else {
      updateQuery = updateQuery.eq('render_status', row.render_status)
    }

    const { data: updated, error: updateError } = await updateQuery
      .select('render_status, approved_at, approved_by, generation_metadata')
      .maybeSingle()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    if (!updated) {
      const { data: current } = await admin
        .from('contenido_generado')
        .select('render_status, approved_at, approved_by, generation_metadata, render_folder_id')
        .eq('id', id)
        .maybeSingle()
      const currentStatus = current?.render_status ?? null
      if (current && (currentStatus === 'rendered' || ACTIVE_STATUSES.has(currentStatus ?? ''))) {
        return NextResponse.json({
          success: true,
          status: currentStatus,
          approvedAt: current.approved_at,
          approvedBy: current.approved_by,
          generationMetadata: current.generation_metadata,
          renderFolderId: current.render_folder_id,
          dispatched: false,
          idempotent: true,
        })
      }
      return NextResponse.json(
        { error: 'El estado de la pieza cambió durante la aprobación' },
        { status: 409 },
      )
    }

    const renderSource = {
      id: row.id,
      subfamilia: rebuilt.subfamilia,
      contract: rebuilt.contract,
      generationMetadata: nextMetadata,
      videoCrudo: salida.carpeta_videos_nombre?.trim() || row.video_crudo,
      mes: row.mes,
      fechaInicio: salida.fecha_inicio,
      ownerProfile,
      brandIdentity,
    }
    const renderContext = {
      admin,
      matiVideoUrl,
      matiToken: process.env.MATI_SKILL_TOKEN?.trim(),
      callbackUrl: process.env.MATI_VIDEO_RENDER_WEBHOOK_URL?.trim()
        || process.env.MATI_RENDER_WEBHOOK_URL?.trim().replace(/\/render\/?$/u, '/video')
        || null,
    }
    after(() => dispatchFamiliesVideoRender(renderSource, renderContext))

    console.log(`[VIDEO/APPROVAL] id=${id} | subfamilia=${rebuilt.subfamilia} | approvedBy=${approvedBy} | dispatch=true`)
    return NextResponse.json({
      success: true,
      status: updated.render_status,
      approvedAt: updated.approved_at,
      approvedBy: updated.approved_by,
      generationMetadata: updated.generation_metadata,
      dispatched: true,
      idempotent: false,
    })
  } catch (error) {
    console.error('[VIDEO/APPROVAL] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al aprobar el video' },
      { status: 500 },
    )
  }
}
