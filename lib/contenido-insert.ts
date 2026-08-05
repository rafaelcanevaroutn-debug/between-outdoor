import type {
  AnyGeneratedPiece,
  FormatoCarrusel,
  GeneratedAdaptiveCarrusel,
  GeneratedCarrusel,
  GeneratedCarruselPromo,
  GeneratedPieceLegacy,
  GeneratedVideo,
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
  sourcePastSalidaId?: string | null
  futureRelatedSalidaId?: string | null
  /** Solo lo usa carrusel_promo, para el ángulo "<destino> — promo". */
  destino?: string
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
