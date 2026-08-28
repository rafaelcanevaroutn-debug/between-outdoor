import type {createAdminClient} from '@/lib/supabase/admin'
import type {BrandIdentity, Salida} from '@/types'
import {listImagesWithCategories} from '@/lib/google-drive'
import {buildBannerMolde3} from '@/lib/generators/banner-moldes-commercial'
import {mapBannerContentToInsertRow} from '@/lib/banner-content-insert'
import {prepareAutomaticBannerRender} from '@/lib/weekly-auto-render'
import {dispatchBannerRender} from '@/lib/banner-render-dispatch'

type AdminClient = ReturnType<typeof createAdminClient>

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export async function replaceFailedVideoWithStatic(
  admin: AdminClient,
  videoId: string,
): Promise<{replaced: boolean; reason?: string}> {
  const {data: video, error: videoError} = await admin
    .from('contenido_generado')
    .select('id,user_id,salida_id,formato,scheduled_at,generation_metadata')
    .eq('id', videoId)
    .maybeSingle()
  if (videoError) throw videoError
  if (!video || video.formato !== 'video') return {replaced: false, reason: 'La pieza ya no es un video pendiente de reemplazo'}

  const [{data: salidaRow}, {data: profile}, {data: brandIdentity}] = await Promise.all([
    admin.from('salidas').select('*').eq('id', video.salida_id).eq('user_id', video.user_id).maybeSingle(),
    admin.from('profiles').select('*').eq('id', video.user_id).maybeSingle(),
    admin.from('brand_identity').select('*').eq('user_id', video.user_id).maybeSingle(),
  ])
  const salida = salidaRow as Salida | null
  if (!salida?.carpeta_fotos_id) return {replaced: false, reason: 'La salida no tiene fotos para el reemplazo'}

  const images = await listImagesWithCategories(salida.carpeta_fotos_id)
  const background = images.find(image => image.mimeType.startsWith('image/'))
  if (!background) return {replaced: false, reason: 'La carpeta no contiene una foto utilizable'}

  const previousMetadata = objectValue(video.generation_metadata)
  const content = buildBannerMolde3({
    salida,
    cta: salida.tipo_viaje === 'salida_recurrente' ? 'Sumate al grupo' : 'Consultá tu lugar',
    typographyId: 'Inter',
  })
  const replacement = mapBannerContentToInsertRow({
    salidaId: salida.id,
    userId: video.user_id,
    content,
    backgroundDriveFileId: background.id,
    scheduledAt: video.scheduled_at,
    metadata: {
      ...previousMetadata,
      fallback_for_video: true,
      fallback_source_video_id: video.id,
      fallback_reason: previousMetadata.video_render_error ?? 'El render de video agotó sus reintentos',
      fallback_replaced_at: new Date().toISOString(),
    },
  })
  const {error: replaceError} = await admin
    .from('contenido_generado')
    .update({...replacement, render_folder_id: null, updated_at: new Date().toISOString()})
    .eq('id', video.id)
    .eq('formato', 'video')
  if (replaceError) throw replaceError

  const prepared = await prepareAutomaticBannerRender({
    admin,
    rowId: video.id,
    userId: video.user_id,
    content,
    backgroundDriveFileId: background.id,
    profile,
    brandIdentity: brandIdentity as BrandIdentity | null,
  })
  if (!prepared) return {replaced: true, reason: 'Reemplazo creado; render pendiente'}

  const matiBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+$/u, '')
  const configuredBannerUrl = process.env.MATI_SKILL_BANNER_LIBRARY_URL?.trim()
  const matiBannerUrl = configuredBannerUrl || (matiBase ? `${matiBase}/api/generar-banner-library` : null)
  const bannerBase = matiBannerUrl?.replace(/\/api\/generar-banner(?:-library)?\/?$/u, '') ?? matiBase
  await dispatchBannerRender(prepared, {
    admin,
    matiBase: bannerBase,
    matiBannerUrl,
    matiToken: process.env.MATI_SKILL_TOKEN?.trim(),
  })
  return {replaced: true}
}
