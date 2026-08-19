import { after, NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildBannerBrand, rebuildBannerMolde1Content } from '@/lib/banner-render-contract'
import {readPersistedBannerContent} from '@/lib/banner-content-insert'
import {buildApprovedLibraryPreviewPayload, selectApprovedCreativeTemplate, type ApprovedLibraryPreviewPayload} from '@/lib/creative-lab/production-library'
import { dispatchBannerRender } from '@/lib/banner-render-dispatch'

const ACTIVE_STATUSES = new Set(['dispatching', 'rendering'])

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID de contenido requerido' }, { status: 400 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const admin = createAdminClient()
    const { data: row, error: rowError } = await admin.from('contenido_generado')
      .select('id,user_id,formato,titulo,subtitulo,bullets,cta,generation_metadata,render_status,approved_at,approved_by,render_folder_id')
      .eq('id', id).maybeSingle()
    if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'Pieza no encontrada' }, { status: 404 })
    if (callerProfile?.role !== 'admin' && row.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para aprobar esta pieza' }, { status: 403 })
    }
    if (row.formato !== 'banner') return NextResponse.json({ error: 'La pieza no es un banner' }, { status: 400 })
    if (row.render_status === 'rendered' || ACTIVE_STATUSES.has(row.render_status ?? '')) {
      return NextResponse.json({
        success: true, status: row.render_status, approvedAt: row.approved_at,
        approvedBy: row.approved_by, renderFileId: row.render_folder_id,
        dispatched: false, idempotent: true,
      })
    }
    if (row.render_status !== 'pending_review' && row.render_status !== 'failed') {
      return NextResponse.json({ error: `El banner no puede aprobarse desde ${row.render_status}` }, { status: 409 })
    }
    const metadata = objectValue(row.generation_metadata)
    const backgroundDriveFileId = typeof metadata.banner_background_drive_file_id === 'string'
      ? metadata.banner_background_drive_file_id : ''
    const persistedContent = readPersistedBannerContent(metadata)
    const content = persistedContent.contentKind === 'banner/molde-1' ? rebuildBannerMolde1Content(row) : persistedContent
    const moldType = Number(content.contentKind.slice(-1)) as 1 | 2 | 3 | 4 | 5 | 6
    const [{ data: ownerProfile }, { data: brandIdentity }] = await Promise.all([
      admin.from('profiles').select('company_name,full_name').eq('id', row.user_id).maybeSingle(),
      admin.from('brand_identity').select('drive_folder_id,logo_url,color_acento,color_primario').eq('user_id', row.user_id).maybeSingle(),
    ])
    if (!ownerProfile) return NextResponse.json({ error: 'El propietario no tiene perfil' }, { status: 409 })
    const template = await selectApprovedCreativeTemplate({client: admin, moldType, selectionKey: row.id})
    if (!template) return NextResponse.json({error: `No hay un Molde ${moldType} aprobado y probado al extremo`}, {status: 409})
    const typographyId = content.typographyId === 'Playfair Display' || content.typographyId === 'PlayfairDisplay' ? 'PlayfairDisplay' : 'Inter'
    const payload = buildApprovedLibraryPreviewPayload({
      template,
      currentPayload: {
        templateId: `${content.contentKind}@1` as ApprovedLibraryPreviewPayload['templateId'],
        requestId: row.id,
        content: {...content, typographyId} as ApprovedLibraryPreviewPayload['content'],
        backgroundDriveFileId,
        brand: buildBannerBrand({ownerProfile, brandIdentity}),
      },
    })
    const approvedAt = row.approved_at ?? new Date().toISOString()
    const approvedBy = row.approved_by ?? user.id
    const { data: updated, error: updateError } = await admin.from('contenido_generado').update({
      render_status: 'dispatching', approved_at: approvedAt, approved_by: approvedBy,
      generation_metadata: { ...metadata, banner_approved_contract: content },
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('render_status', row.render_status)
      .select('render_status,approved_at,approved_by').maybeSingle()
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    if (!updated) return NextResponse.json({ error: 'El estado del banner cambió durante la aprobación' }, { status: 409 })
    const configuredBannerUrl = process.env.MATI_SKILL_BANNER_LIBRARY_URL?.trim()
    const configuredBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+\/?$/u, '')
    const matiBannerUrl = configuredBannerUrl || (configuredBase ? `${configuredBase}/api/generar-banner-library` : null)
    const matiBase = matiBannerUrl?.replace(/\/api\/generar-banner(?:-library)?\/?$/u, '') ?? configuredBase
    after(() => dispatchBannerRender(
      { id: row.id, payload },
      { admin, matiBase, matiBannerUrl, matiToken: process.env.MATI_SKILL_TOKEN?.trim() },
    ))
    return NextResponse.json({
      success: true, status: updated.render_status, approvedAt: updated.approved_at,
      approvedBy: updated.approved_by, dispatched: true, idempotent: false,
    })
  } catch (error) {
    console.error('[BANNER/APPROVAL] Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al aprobar el banner' }, { status: 500 })
  }
}
