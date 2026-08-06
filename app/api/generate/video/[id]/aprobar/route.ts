import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rebuildApprovedVideoContract } from '@/lib/video-approved-contract'

const APPROVED_STATUS = 'approved_pending_contract'
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
      .select('id, user_id, formato, titulo, subtitulo, bullets, cta, generation_metadata, video_render_status, video_approved_at, video_approved_by, render_folder_id')
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

    if (row.video_render_status === APPROVED_STATUS) {
      return NextResponse.json({
        success: true,
        status: APPROVED_STATUS,
        approvedAt: row.video_approved_at,
        approvedBy: row.video_approved_by,
        generationMetadata: row.generation_metadata,
        dispatched: false,
        idempotent: true,
      })
    }
    if (row.video_render_status === 'rendered') {
      return NextResponse.json({
        success: true,
        status: 'rendered',
        renderFolderId: row.render_folder_id,
        dispatched: false,
        idempotent: true,
      })
    }
    if (ACTIVE_STATUSES.has(row.video_render_status ?? '') || row.video_render_status === 'failed') {
      return NextResponse.json(
        { error: `La pieza no puede aprobarse desde el estado ${row.video_render_status}` },
        { status: 409 },
      )
    }

    const currentMetadata = row.generation_metadata as Record<string, unknown>
    const approvedAt = new Date().toISOString()
    const nextMetadata = {
      ...currentMetadata,
      approved_video_contract: rebuilt.contract,
      approved_video_contract_version: 1,
    }
    let updateQuery = admin
      .from('contenido_generado')
      .update({
        generation_metadata: nextMetadata,
        video_render_status: APPROVED_STATUS,
        video_approved_at: approvedAt,
        video_approved_by: user.id,
        updated_at: approvedAt,
      })
      .eq('id', id)

    updateQuery = row.video_render_status === null
      ? updateQuery.is('video_render_status', null)
      : updateQuery.eq('video_render_status', 'pending_review')

    const { data: updated, error: updateError } = await updateQuery
      .select('video_render_status, video_approved_at, video_approved_by, generation_metadata')
      .maybeSingle()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    if (!updated) {
      const { data: current } = await admin
        .from('contenido_generado')
        .select('video_render_status, video_approved_at, video_approved_by, generation_metadata')
        .eq('id', id)
        .maybeSingle()
      if (current?.video_render_status === APPROVED_STATUS) {
        return NextResponse.json({
          success: true,
          status: APPROVED_STATUS,
          approvedAt: current.video_approved_at,
          approvedBy: current.video_approved_by,
          generationMetadata: current.generation_metadata,
          dispatched: false,
          idempotent: true,
        })
      }
      return NextResponse.json(
        { error: 'El estado de la pieza cambió durante la aprobación' },
        { status: 409 },
      )
    }

    console.log(`[VIDEO/APPROVAL] id=${id} | subfamilia=${rebuilt.subfamilia} | approvedBy=${user.id} | dispatch=false`)
    return NextResponse.json({
      success: true,
      status: updated.video_render_status,
      approvedAt: updated.video_approved_at,
      approvedBy: updated.video_approved_by,
      generationMetadata: updated.generation_metadata,
      dispatched: false,
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
