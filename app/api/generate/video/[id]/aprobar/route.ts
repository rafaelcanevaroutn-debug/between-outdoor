import { after, NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rebuildApprovedVideoContract } from '@/lib/video-approved-contract'
import { dispatchFamiliesVideoRender } from '@/lib/mati-families-video-dispatch'

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
      .select('id, salida_id, user_id, formato, titulo, subtitulo, bullets, cta, video_crudo, mes, generation_metadata, video_render_status, video_approved_at, video_approved_by, render_folder_id')
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

    if (row.video_render_status === 'rendered') {
      return NextResponse.json({
        success: true,
        status: 'rendered',
        renderFolderId: row.render_folder_id,
        dispatched: false,
        idempotent: true,
      })
    }
    if (ACTIVE_STATUSES.has(row.video_render_status ?? '')) {
      return NextResponse.json({
        success: true,
        status: row.video_render_status,
        approvedAt: row.video_approved_at,
        approvedBy: row.video_approved_by,
        generationMetadata: row.generation_metadata,
        dispatched: false,
        idempotent: true,
      })
    }
    if (row.video_render_status === 'failed') {
      return NextResponse.json(
        { error: 'La pieza falló durante el render; el reintento explícito todavía no está habilitado' },
        { status: 409 },
      )
    }
    if (
      row.video_render_status !== null
      && row.video_render_status !== 'pending_review'
      && row.video_render_status !== LEGACY_APPROVED_STATUS
    ) {
      return NextResponse.json(
        { error: `La pieza no puede aprobarse desde el estado ${row.video_render_status}` },
        { status: 409 },
      )
    }

    const [{ data: ownerProfile, error: ownerError }, { data: brandIdentity }, { data: salida, error: salidaError }] = await Promise.all([
      admin.from('profiles').select('company_name, full_name').eq('id', row.user_id).maybeSingle(),
      admin.from('brand_identity').select('mati_cliente_id, color_primario, color_texto, font_body, videos_folder_id').eq('user_id', row.user_id).maybeSingle(),
      admin.from('salidas').select('fecha_inicio').eq('id', row.salida_id).maybeSingle(),
    ])
    if (ownerError) return NextResponse.json({ error: ownerError.message }, { status: 500 })
    if (!ownerProfile) return NextResponse.json({ error: 'Perfil propietario no encontrado' }, { status: 404 })
    if (salidaError) return NextResponse.json({ error: salidaError.message }, { status: 500 })
    if (!salida) return NextResponse.json({ error: 'Salida de la pieza no encontrada' }, { status: 404 })

    const currentMetadata = row.generation_metadata as Record<string, unknown>
    const approvedAt = row.video_approved_at ?? new Date().toISOString()
    const approvedBy = row.video_approved_by ?? user.id
    const nextMetadata = {
      ...currentMetadata,
      approved_video_contract: rebuilt.contract,
      approved_video_contract_version: 1,
      video_render_error: null,
    }
    let updateQuery = admin
      .from('contenido_generado')
      .update({
        generation_metadata: nextMetadata,
        video_render_status: 'dispatching',
        video_approved_at: approvedAt,
        video_approved_by: approvedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (row.video_render_status === null) {
      updateQuery = updateQuery.is('video_render_status', null)
    } else {
      updateQuery = updateQuery.eq('video_render_status', row.video_render_status)
    }

    const { data: updated, error: updateError } = await updateQuery
      .select('video_render_status, video_approved_at, video_approved_by, generation_metadata')
      .maybeSingle()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    if (!updated) {
      const { data: current } = await admin
        .from('contenido_generado')
        .select('video_render_status, video_approved_at, video_approved_by, generation_metadata, render_folder_id')
        .eq('id', id)
        .maybeSingle()
      const currentStatus = current?.video_render_status ?? null
      if (current && (currentStatus === 'rendered' || ACTIVE_STATUSES.has(currentStatus ?? ''))) {
        return NextResponse.json({
          success: true,
          status: currentStatus,
          approvedAt: current.video_approved_at,
          approvedBy: current.video_approved_by,
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

    const matiBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+\/?$/u, '')
    const matiVideoUrl = process.env.MATI_SKILL_VIDEOS_URL || (matiBase ? `${matiBase}/api/generar-video` : null)
    const renderSource = {
      id: row.id,
      subfamilia: rebuilt.subfamilia,
      contract: rebuilt.contract,
      generationMetadata: nextMetadata,
      videoCrudo: row.video_crudo,
      mes: row.mes,
      fechaInicio: salida.fecha_inicio,
      ownerProfile,
      brandIdentity,
    }
    const renderContext = {
      admin,
      matiVideoUrl,
      matiToken: process.env.MATI_SKILL_TOKEN?.trim(),
    }
    after(() => dispatchFamiliesVideoRender(renderSource, renderContext))

    console.log(`[VIDEO/APPROVAL] id=${id} | subfamilia=${rebuilt.subfamilia} | approvedBy=${approvedBy} | dispatch=true`)
    return NextResponse.json({
      success: true,
      status: updated.video_render_status,
      approvedAt: updated.video_approved_at,
      approvedBy: updated.video_approved_by,
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
