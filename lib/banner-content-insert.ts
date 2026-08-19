import type { Banner1ContentContract } from './generators/banner-content.ts'
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
