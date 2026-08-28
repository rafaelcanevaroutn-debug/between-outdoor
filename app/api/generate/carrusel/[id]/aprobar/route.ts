import { after, NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchCarruselRenders, type MatiInsertedRow } from '@/lib/mati-dispatch'

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
      .select('id, user_id, formato, formato_carrusel, objetivo_interaccion, descripcion_post, tema, angulo, slides_data, video_crudo, mes, generation_metadata, render_status, approved_at, approved_by, render_folder_id')
      .eq('id', id)
      .maybeSingle()

    if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'Pieza no encontrada' }, { status: 404 })
    if (callerProfile?.role !== 'admin' && row.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para aprobar esta pieza' }, { status: 403 })
    }
    if (row.formato !== 'carrusel' && row.formato !== 'carrusel_promo') {
      return NextResponse.json({ error: 'La pieza no es un carrusel' }, { status: 400 })
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
        dispatched: false,
        idempotent: true,
      })
    }
    if (
      row.render_status !== null
      && row.render_status !== 'pending_review'
      && row.render_status !== 'failed'
    ) {
      return NextResponse.json(
        { error: `La pieza no puede aprobarse desde el estado ${row.render_status}` },
        { status: 409 },
      )
    }

    const approvedAt = row.approved_at ?? new Date().toISOString()
    const approvedBy = row.approved_by ?? user.id

    let updateQuery = admin
      .from('contenido_generado')
      .update({
        render_status: 'dispatching',
        approved_at: approvedAt,
        approved_by: approvedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    updateQuery = row.render_status === null
      ? updateQuery.is('render_status', null)
      : updateQuery.eq('render_status', row.render_status)

    const { data: updated, error: updateError } = await updateQuery
      .select('render_status, approved_at, approved_by')
      .maybeSingle()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    if (!updated) {
      const { data: current } = await admin
        .from('contenido_generado')
        .select('render_status, approved_at, approved_by, render_folder_id')
        .eq('id', id)
        .maybeSingle()
      const currentStatus = current?.render_status ?? null
      if (current && (currentStatus === 'rendered' || ACTIVE_STATUSES.has(currentStatus ?? ''))) {
        return NextResponse.json({
          success: true,
          status: currentStatus,
          approvedAt: current.approved_at,
          approvedBy: current.approved_by,
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

    const { data: ownerProfile, error: ownerError } = await admin
      .from('profiles')
      .select('company_name, full_name')
      .eq('id', row.user_id)
      .maybeSingle()
    if (ownerError) return NextResponse.json({ error: ownerError.message }, { status: 500 })

    const { data: brandIdentity } = await admin
      .from('brand_identity')
      .select('mati_cliente_id')
      .eq('user_id', row.user_id)
      .maybeSingle()

    const matiBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+\/?$/u, '')
    const matiCarruselUrl = matiBase ? `${matiBase}/api/generar-carrusel` : null
    const matiCliente = brandIdentity?.mati_cliente_id || ownerProfile?.company_name || ownerProfile?.full_name || 'cliente'
    const matiToken = process.env.MATI_SKILL_TOKEN?.trim()

    const matiCtx = { admin, matiBase, matiCarruselUrl, matiVideoUrl: null, matiCliente, matiToken }
    const dispatchRow: MatiInsertedRow = {
      id: row.id,
      formato: row.formato,
      formato_carrusel: row.formato_carrusel,
      objetivo_interaccion: row.objetivo_interaccion,
      descripcion_post: row.descripcion_post,
      tema: row.tema,
      angulo: row.angulo,
      slides_data: row.slides_data,
      video_crudo: row.video_crudo,
      titulo: null,
      subtitulo: null,
      bullets: null,
      cta: null,
      mes: row.mes,
      generation_metadata: row.generation_metadata,
    }
    // row.video_crudo guarda el nombre de carpeta de fotos elegido al
    // generar (mismo campo reusado que en el insert de carrusel) — es la
    // misma carpeta que se le manda a Mati en el dispatch original.
    after(() => dispatchCarruselRenders([dispatchRow], matiCtx, row.video_crudo ?? undefined))

    console.log(`[CARRUSEL/APPROVAL] id=${id} | approvedBy=${approvedBy} | dispatch=true`)
    return NextResponse.json({
      success: true,
      status: updated.render_status,
      approvedAt: updated.approved_at,
      approvedBy: updated.approved_by,
      dispatched: true,
      idempotent: false,
    })
  } catch (error) {
    console.error('[CARRUSEL/APPROVAL] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al aprobar el carrusel' },
      { status: 500 },
    )
  }
}
