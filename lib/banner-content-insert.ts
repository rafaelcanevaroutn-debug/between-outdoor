import type { Banner1ContentContract, BannerContentContract } from './generators/banner-content.ts'
import { BANNER_MOLDE_1_CAPS, BANNER_MOLDE_1_TEMPLATE_ID, validateBannerMolde1RendererContent } from './banner-render-contract.ts'

export function mapBannerMolde1ToInsertRow(params: {
  salidaId: string
  userId: string
  content: Banner1ContentContract
  backgroundDriveFileId: string
  metadata?: Record<string, unknown>
}): Record<string, unknown> {
  const errors = validateBannerMolde1RendererContent(params.content)
  if (errors.length > 0) throw new Error(errors.join('; '))
  if (!/^[a-z0-9_-]+$/iu.test(params.backgroundDriveFileId)) throw new Error('backgroundDriveFileId inválido')
  return {
    salida_id: params.salidaId,
    user_id: params.userId,
    formato: 'banner',
    vertical: 'conversion',
    slot_key: 'banner_molde_1',
    titulo: params.content.lugar,
    subtitulo: params.content.fecha,
    bullets: params.content.items,
    cta: params.content.copy,
    slides: null,
    video_crudo: null,
    mes: null,
    is_edited: false,
    tema: 'banner_molde_1',
    estructura_narrativa: null,
    angulo: null,
    cta_comentario: null,
    slides_data: null,
    generation_metadata: {
      ...(params.metadata ?? {}),
      banner_motor: 'moldes',
      banner_template_id: BANNER_MOLDE_1_TEMPLATE_ID,
      banner_content_contract: params.content,
      banner_background_drive_file_id: params.backgroundDriveFileId,
      banner_caps: BANNER_MOLDE_1_CAPS,
    },
    source_salida_ids: [],
    formato_carrusel: null,
    objetivo_interaccion: null,
    descripcion_post: null,
    render_status: 'pending_review',
    approved_at: null,
    approved_by: null,
  }
}

function presentation(content: BannerContentContract): {titulo: string; subtitulo: string | null; bullets: string[]; cta: string | null} {
  switch (content.contentKind) {
    case 'banner/molde-1': return {titulo: content.lugar, subtitulo: content.fecha, bullets: content.items, cta: content.copy}
    case 'banner/molde-2': return {titulo: content.lugar, subtitulo: content.fecha, bullets: content.ficha.map(item => `${item.etiqueta}: ${item.valor}`), cta: content.cta}
    case 'banner/molde-3': return {titulo: content.lugar, subtitulo: content.fecha, bullets: [content.precio, content.reserva, content.financiacion, content.disponibilidad].filter((item): item is string => Boolean(item)), cta: content.cta}
    case 'banner/molde-4': return {titulo: content.titulo, subtitulo: null, bullets: content.salidas.map(item => `${item.lugar} · ${item.fecha}`), cta: content.cta}
    case 'banner/molde-5': return {titulo: content.lugar, subtitulo: content.fecha, bullets: [content.noches, content.alojamiento, content.regimen, ...content.incluye.map(item => item.label)], cta: content.cta}
    case 'banner/molde-6': return {titulo: content.mensaje, subtitulo: content.convocatoria, bullets: [], cta: null}
  }
}

export function mapBannerContentToInsertRow(params: {
  salidaId: string
  userId: string
  content: BannerContentContract
  backgroundDriveFileId: string
  metadata?: Record<string, unknown>
}): Record<string, unknown> {
  if (params.content.contentKind === 'banner/molde-1') return mapBannerMolde1ToInsertRow({...params, content: params.content})
  if (!/^[a-z0-9_-]+$/iu.test(params.backgroundDriveFileId)) throw new Error('backgroundDriveFileId inválido')
  const mold = Number(params.content.contentKind.slice(-1))
  const display = presentation(params.content)
  return {
    salida_id: params.salidaId, user_id: params.userId, formato: 'banner', vertical: mold === 6 ? 'comunidad' : 'conversion',
    slot_key: `banner_molde_${mold}`, titulo: display.titulo, subtitulo: display.subtitulo, bullets: display.bullets, cta: display.cta,
    slides: null, video_crudo: null, mes: null, is_edited: false, tema: `banner_molde_${mold}`,
    estructura_narrativa: null, angulo: null, cta_comentario: null, slides_data: null,
    generation_metadata: {...(params.metadata ?? {}), banner_motor: 'moldes', banner_template_id: `${params.content.contentKind}@1`, banner_content_contract: params.content, banner_background_drive_file_id: params.backgroundDriveFileId},
    source_salida_ids: [], formato_carrusel: null, objetivo_interaccion: null, descripcion_post: null,
    render_status: 'pending_review', approved_at: null, approved_by: null,
  }
}

export function readPersistedBannerContent(metadata: Record<string, unknown> | null): BannerContentContract {
  const content = metadata?.banner_content_contract
  if (!content || typeof content !== 'object' || Array.isArray(content)) throw new Error('El banner no conserva su contrato neutral')
  const kind = (content as {contentKind?: unknown}).contentKind
  if (!['banner/molde-1', 'banner/molde-2', 'banner/molde-3', 'banner/molde-4', 'banner/molde-5', 'banner/molde-6'].includes(String(kind))) {
    throw new Error('El banner conserva un contentKind inválido')
  }
  return content as BannerContentContract
}
