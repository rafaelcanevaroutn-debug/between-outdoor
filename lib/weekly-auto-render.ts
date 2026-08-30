import type {createAdminClient} from '@/lib/supabase/admin'
import type {BrandIdentity, Profile, Salida, VideoKnowledgeFormat} from '@/types'
import type {BannerContentContract} from '@/lib/generators/banner-content'
import {buildBannerBrand, validateBannerRendererContent} from '@/lib/banner-render-contract'
import {
  buildApprovedLibraryPreviewPayload,
  selectApprovedCreativeTemplate,
  type ApprovedLibraryPreviewPayload,
} from '@/lib/creative-lab/production-library'
import type {BannerRenderSource} from '@/lib/banner-render-dispatch'
import type {FamiliesVideoRenderSource} from '@/lib/mati-families-video-dispatch'

type AdminClient = ReturnType<typeof createAdminClient>

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

async function markAutomaticFailure(admin: AdminClient, id: string, field: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const {data: current} = await admin.from('contenido_generado')
    .select('generation_metadata').eq('id', id).maybeSingle()
  await admin.from('contenido_generado').update({
    render_status: 'failed',
    generation_metadata: {
      ...objectValue(current?.generation_metadata),
      [field]: message,
    },
    updated_at: new Date().toISOString(),
  }).eq('id', id)
}

export async function prepareAutomaticBannerRender(params: {
  admin: AdminClient
  rowId: string
  userId: string
  content: BannerContentContract
  backgroundDriveFileId: string
  profile: Pick<Profile, 'company_name' | 'full_name'>
  brandIdentity: BrandIdentity | null
  templateRotationOffset?: number
  templateRecordId?: string
}): Promise<BannerRenderSource | null> {
  try {
    const errors = validateBannerRendererContent(params.content)
    if (errors.length > 0) throw new Error(errors.join('; '))
    const moldType = Number(params.content.contentKind.slice(-1)) as 1 | 2 | 3 | 4 | 5 | 6
    const template = await selectApprovedCreativeTemplate({
      client: params.admin,
      moldType,
      selectionKey: params.rowId,
      rotationOffset: params.templateRotationOffset,
      templateRecordId: params.templateRecordId,
    })
    if (!template) throw new Error(`No hay un Molde ${moldType} aprobado y probado al extremo`)
    const typographyId = params.content.typographyId === 'Playfair Display' || params.content.typographyId === 'PlayfairDisplay'
      ? 'PlayfairDisplay'
      : 'Inter'
    const payload = buildApprovedLibraryPreviewPayload({
      template,
      currentPayload: {
        templateId: `${params.content.contentKind}@1` as ApprovedLibraryPreviewPayload['templateId'],
        requestId: params.rowId,
        content: {...params.content, typographyId} as ApprovedLibraryPreviewPayload['content'],
        backgroundDriveFileId: params.backgroundDriveFileId,
        brand: buildBannerBrand({ownerProfile: params.profile, brandIdentity: params.brandIdentity}),
      },
    })
    const now = new Date().toISOString()
    const {data: current} = await params.admin.from('contenido_generado')
      .select('generation_metadata').eq('id', params.rowId).maybeSingle()
    const {data: claimed, error} = await params.admin.from('contenido_generado').update({
      render_status: 'dispatching',
      approved_at: now,
      approved_by: params.userId,
      generation_metadata: {
        ...objectValue(current?.generation_metadata),
        banner_approved_contract: params.content,
        banner_auto_dispatched_at: now,
      },
      updated_at: now,
    }).eq('id', params.rowId).eq('render_status', 'pending_review').select('id').maybeSingle()
    if (error) throw new Error(error.message)
    return claimed ? {id: params.rowId, payload} : null
  } catch (error) {
    console.error(`[BATCH/BANNER] No se pudo preparar el render automático ${params.rowId}:`, error)
    await markAutomaticFailure(params.admin, params.rowId, 'banner_render_error', error)
    return null
  }
}

export async function prepareAutomaticVideoRender(params: {
  admin: AdminClient
  rowId: string
  userId: string
  subfamilia: VideoKnowledgeFormat
  persistedRow: Record<string, unknown>
  salida: Salida
  profile: Pick<Profile, 'company_name' | 'full_name'>
  brandIdentity: BrandIdentity | null
}): Promise<FamiliesVideoRenderSource | null> {
  try {
    const metadata = objectValue(params.persistedRow.generation_metadata)
    const contract = objectValue(metadata.video_contract)
    if (Object.keys(contract).length === 0) throw new Error('El video no conserva su contrato de generación')
    const now = new Date().toISOString()
    const nextMetadata = {
      ...metadata,
      ...(params.salida.zona_geografica ? {zona_geografica: params.salida.zona_geografica} : {}),
      ...(params.salida.context_tags?.length ? {content_context_tags: params.salida.context_tags} : {}),
      approved_video_contract: contract,
      approved_video_contract_version: 1,
      video_auto_dispatched_at: now,
      video_render_error: null,
    }
    const {data: claimed, error} = await params.admin.from('contenido_generado').update({
      render_status: 'dispatching',
      approved_at: now,
      approved_by: params.userId,
      generation_metadata: nextMetadata,
      updated_at: now,
    }).eq('id', params.rowId).eq('render_status', 'pending_review').select('id').maybeSingle()
    if (error) throw new Error(error.message)
    if (!claimed) return null
    return {
      id: params.rowId,
      subfamilia: params.subfamilia,
      contract,
      generationMetadata: nextMetadata,
      videoCrudo: typeof params.persistedRow.video_crudo === 'string' ? params.persistedRow.video_crudo : null,
      mes: typeof params.persistedRow.mes === 'string' ? params.persistedRow.mes : null,
      fechaInicio: params.salida.fecha_inicio,
      ownerProfile: params.profile,
      brandIdentity: params.brandIdentity,
    }
  } catch (error) {
    console.error(`[BATCH/VIDEO] No se pudo preparar el render automático ${params.rowId}:`, error)
    await markAutomaticFailure(params.admin, params.rowId, 'video_render_error', error)
    return null
  }
}
