import type {
  AnyGeneratedPiece,
  FormatoCarrusel,
  GeneratedAdaptiveCarrusel,
  GeneratedCarrusel,
  GeneratedCarruselPromo,
  GeneratedPieceLegacy,
  GeneratedVideo,
  GeneratedVideoFamilia2,
  GeneratedVideoFamilia3,
  GeneratedVideoFamilia4,
  ObjetivoInteraccion,
} from '@/types'

/**
 * Arma la fila para `contenido_generado` a partir de una pieza generada,
 * extraído de app/api/generate/route.ts para reusarlo también desde el
 * orquestador de batch (lib/orchestrators/weekly-batch.ts), donde cada
 * pieza puede tener su propia `salidaId`/`formatoCarrusel` en vez de un
 * único valor fijo para todo el request.
 */

export interface ContenidoInsertContext {
  salidaId: string
  userId: string
  formatoCarrusel?: FormatoCarrusel
  objetivoInteraccion?: ObjetivoInteraccion
  /** Nombre de carpeta de fotos (no el id) — mismo campo que usa Mati como `carpeta`. */
  carpetaFotos?: string
  /** ID de Drive de la carpeta elegida; se persiste para el dispatch diferido de video. */
  carpetaFotosId?: string
  sourcePastSalidaId?: string | null
  futureRelatedSalidaId?: string | null
  /** Solo lo usa carrusel_promo, para el ángulo "<destino> — promo". */
  destino?: string
}

type GeneratedFamiliesVideo =
  | GeneratedVideoFamilia2
  | GeneratedVideoFamilia3
  | GeneratedVideoFamilia4

function isFamiliesVideo(piece: AnyGeneratedPiece): piece is GeneratedFamiliesVideo {
  if (piece.formato !== 'video') return false
  if ('familia' in piece && piece.familia === '4') return true
  return 'subfamilia' in piece
    && ['2a', '2b', '3a', '3b', '3c', '3d', '3e'].includes(String(piece.subfamilia))
}

function mapFamiliesVideoToInsertRow(
  piece: GeneratedFamiliesVideo,
  ctx: ContenidoInsertContext,
): Record<string, unknown> {
  const { salidaId, userId, carpetaFotos, carpetaFotosId } = ctx
  const subfamilia = 'familia' in piece ? '4' : piece.subfamilia
  let titulo: string
  let bullets: string[]
  let cta: string | null
  let videoContract: Record<string, unknown>

  if ('subfamilia' in piece && piece.subfamilia === '2a') {
    titulo = piece.titulo
    bullets = piece.items
    cta = piece.cta
    videoContract = {
      titulo: piece.titulo,
      items: piece.items,
      cta: piece.cta,
      tipografia_id: piece.tipografia_id,
      duracion_estimada_segundos: piece.duracion_estimada_segundos,
    }
  } else if ('subfamilia' in piece && piece.subfamilia === '2b') {
    titulo = piece.apertura
    bullets = piece.desarrollo
    cta = piece.cierre ?? null
    videoContract = {
      apertura: piece.apertura,
      desarrollo: piece.desarrollo,
      ...(piece.cierre ? { cierre: piece.cierre } : {}),
      tipografia_id: piece.tipografia_id,
      duracion_estimada_segundos: piece.duracion_estimada_segundos,
    }
  } else {
    titulo = piece.copy
    bullets = []
    cta = null
    videoContract = {
      copy: piece.copy,
      tipografia_id: piece.tipografia_id,
      duracion_estimada_segundos: piece.duracion_estimada_segundos,
    }
  }
  const vertical = subfamilia === '4'
    ? 'conversion'
    : subfamilia === '3b'
      ? 'pov'
      : subfamilia === '3c' || subfamilia === '3d'
        ? 'comunidad'
        : subfamilia === '2a'
          ? 'autoridad'
          : 'aspiracional'

  return {
    salida_id: salidaId,
    user_id: userId,
    formato: 'video',
    vertical,
    slot_key: `video_${subfamilia}`,
    titulo,
    subtitulo: null,
    bullets,
    cta,
    slides: null,
    video_crudo: carpetaFotos ?? null,
    mes: null,
    is_edited: false,
    tema: `video_${subfamilia}`,
    estructura_narrativa: null,
    angulo: null,
    cta_comentario: null,
    slides_data: null,
    generation_metadata: {
      ...piece.metadata,
      video_motor: 'familias',
      video_subfamilia: subfamilia,
      video_contract: videoContract,
      ...(carpetaFotosId?.trim() ? { video_folder_id: carpetaFotosId.trim() } : {}),
    },
    source_salida_ids: [],
    formato_carrusel: null,
    objetivo_interaccion: null,
    descripcion_post: null,
    video_render_status: 'pending_review',
    video_approved_at: null,
    video_approved_by: null,
  }
}

export function mapPieceToInsertRow(piece: AnyGeneratedPiece, ctx: ContenidoInsertContext): Record<string, unknown> {
  const { salidaId, userId, formatoCarrusel, objetivoInteraccion, carpetaFotos, sourcePastSalidaId, futureRelatedSalidaId, destino } = ctx

  if (piece.formato === 'carrusel') {
    const c = piece as GeneratedCarrusel | GeneratedAdaptiveCarrusel
    return {
      salida_id:            salidaId,
      user_id:              userId,
      formato:              'carrusel',
      formato_carrusel:     c.formato_carrusel ?? formatoCarrusel,
      objetivo_interaccion: c.objetivo_interaccion ?? objetivoInteraccion,
      descripcion_post:     c.descripcion_post ?? null,
      generation_metadata:  { ...(c.metadata ?? {}), ...('fuentes' in c && c.fuentes ? { fuentes: c.fuentes } : {}) },
      source_salida_ids:    [sourcePastSalidaId, futureRelatedSalidaId].filter(Boolean),
      vertical:             'vertical' in c ? (c.vertical ?? null) : null,
      slot_key:             null,
      tema:                 c.tema,
      estructura_narrativa: c.estructura_narrativa,
      angulo:               c.angulo,
      cta_comentario:       c.cta_comentario,
      slides_data:          c.slides,
      video_crudo:          carpetaFotos ?? c.carpeta_material,
      mes:                  c.mes,
      is_edited:            false,
      titulo: null, subtitulo: null, bullets: null, cta: null, slides: null,
    }
  }

  if (piece.formato === 'carrusel_promo') {
    const c = piece as GeneratedCarruselPromo
    return {
      salida_id:            salidaId,
      user_id:              userId,
      formato:              'carrusel_promo',
      vertical:             null,
      slot_key:             null,
      tema:                 c.variante,
      estructura_narrativa: null,
      angulo:               `${destino ?? ''} — promo`,
      cta_comentario:       null,
      slides_data:          c.slides,
      video_crudo:          c.carpeta_material,
      mes:                  c.mes,
      is_edited:            false,
      titulo: null, subtitulo: null, bullets: null, cta: null, slides: null,
    }
  }

  if (isFamiliesVideo(piece)) {
    return mapFamiliesVideoToInsertRow(piece, ctx)
  }

  if (piece.formato === 'video') {
    const v = piece as GeneratedVideo
    return {
      salida_id:   salidaId,
      user_id:     userId,
      formato:     'video',
      vertical:    v.vertical || null,
      slot_key:    null,
      titulo:      v.titulo,
      subtitulo:   v.subtitulo,
      bullets:     v.bullets,
      cta:         v.cta,
      slides:      null,
      video_crudo: carpetaFotos ?? v.carpeta_material,
      mes:         v.mes,
      is_edited:   false,
      tema:        v.tema,
      estructura_narrativa: null,
      angulo:      null,
      cta_comentario: null,
      slides_data: null,
    }
  }

  const l = piece as GeneratedPieceLegacy
  return {
    salida_id:   salidaId,
    user_id:     userId,
    formato:     l.formato,
    vertical:    l.vertical,
    slot_key:    l.subvertical ?? null,
    titulo:      l.titulo,
    subtitulo:   l.subtitulo,
    bullets:     l.bullets,
    cta:         l.cta,
    slides:      null,
    video_crudo: l.video_crudo,
    mes:         l.mes,
    is_edited:   false,
    tema: null, estructura_narrativa: null, angulo: null, cta_comentario: null, slides_data: null,
  }
}
