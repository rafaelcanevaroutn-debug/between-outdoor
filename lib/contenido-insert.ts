import type {
  AnyGeneratedPiece,
  FormatoCarrusel,
  GeneratedAdaptiveCarrusel,
  GeneratedCarrusel,
  GeneratedCarruselPromo,
  GeneratedPieceLegacy,
  GeneratedVideo,
  GeneratedVideoFamilia1a,
  GeneratedVideoFamilia1b,
  GeneratedVideoFamilia2,
  GeneratedVideoFamilia3,
  GeneratedVideoFamilia4,
  GeneratedVideoFamilia5,
  ObjetivoInteraccion,
} from '@/types'
import {
  createReflexiveVideoContent,
  createStillImageWithMusicContainer,
  createVideoBackgroundContainer,
  type VideoRenderContainerKind,
  type VideoMusicTone,
} from './video-render-container.ts'
import type {VideoMaterialContext} from '@/lib/material-context/video-material-context'
import {resolveVideoVisualContract} from './video-visual-contract.ts'
import {resolveMusicFolderIdFromContext} from './mati-families-video-dispatch.ts'

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
  /** Contrato semántico compartido por copy y render. No expone el proveedor de almacenamiento. */
  videoMaterialContext?: VideoMaterialContext | null
  sourcePastSalidaId?: string | null
  futureRelatedSalidaId?: string | null
  /** Solo lo usa carrusel_promo, para el ángulo "<destino> — promo". */
  destino?: string
  /** Segundo eje del render de 3a. Ausente conserva video_background. */
  videoRenderContainer?: VideoRenderContainerKind
  /** Referencia exacta de la imagen elegida para still_image_with_music. */
  stillImageReference?: string
  /** Banco determinístico: reflexivo, comico o epico. */
  musicTone?: VideoMusicTone
  /** Fecha/hora programada de publicación (ISO string) */
  scheduledAt?: string | null
  /** Fotos reservadas por el calendario para evitar repetición visual semanal. */
  preferredImageFileIds?: string[]
  preferredImageFileNames?: string[]
  visualSelectionReused?: boolean
  /** Zona geográfica de la salida (ej: 'Caribe / Playa') para routing musical y de video. */
  zonaGeografica?: string | null
  /** Etiquetas semánticas del contexto de contenido (ej: ['entorno_caribe_playa']). */
  contentContextTags?: string[] | null
}

type GeneratedFamiliesVideo =
  | GeneratedVideoFamilia1a
  | GeneratedVideoFamilia1b
  | GeneratedVideoFamilia2
  | GeneratedVideoFamilia3
  | GeneratedVideoFamilia4
  | GeneratedVideoFamilia5

function isFamiliesVideo(piece: AnyGeneratedPiece): piece is GeneratedFamiliesVideo {
  if (piece.formato !== 'video') return false
  if ('familia' in piece && (piece.familia === '4' || piece.familia === '5')) return true
  return 'subfamilia' in piece
    && ['1a', '1b', '1c', '2a', '2b', '2c', '3a', '3b', '3c', '3d', '3e'].includes(String(piece.subfamilia))
}

function mapFamiliesVideoToInsertRow(
  piece: GeneratedFamiliesVideo,
  ctx: ContenidoInsertContext,
): Record<string, unknown> {
  const { salidaId, userId, carpetaFotos, carpetaFotosId } = ctx
  const subfamilia = 'familia' in piece ? piece.familia : piece.subfamilia
  let titulo: string
  let subtitulo: string | null = null
  let bullets: string[]
  let cta: string | null
  let videoContract: Record<string, unknown>

  if ('subfamilia' in piece && piece.subfamilia === '1a') {
    titulo = piece.discurso
    bullets = []
    cta = null
    videoContract = {
      discurso: piece.discurso,
      tipografia_id: piece.tipografia_id,
      duracion_estimada_segundos: piece.duracion_estimada_segundos,
    }
  } else if ('subfamilia' in piece && (piece.subfamilia === '2a' || piece.subfamilia === '2c')) {
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
  } else if ('familia' in piece && piece.familia === '4') {
    titulo = piece.copy
    subtitulo = piece.dato_duro
    bullets = piece.items ?? []
    cta = piece.cta ?? null
    videoContract = {
      copy: piece.copy,
      dato_duro: piece.dato_duro,
      ...(piece.items ? { items: piece.items } : {}),
      ...(piece.cta ? { cta: piece.cta } : {}),
      ...(piece.layout ? { layout: piece.layout } : {}),
      tipografia_id: piece.tipografia_id,
      duracion_estimada_segundos: piece.duracion_estimada_segundos,
    }
  } else if ('familia' in piece && piece.familia === '5') {
    titulo = piece.lugar
    bullets = piece.datos.map(datum => `${datum.etiqueta}: ${datum.valor}`)
    cta = null
    videoContract = {
      lugar: piece.lugar,
      datos: piece.datos,
      tipografia_id: piece.tipografia_id,
      duracion_estimada_segundos: piece.duracion_estimada_segundos,
    }
  } else {
    // Familia 3 (subfamilia 3a-3e) y Familia 1b (barras de señal) — únicos
    // casos que llegan hasta acá con el shape copy + tipografia_id +
    // duracion_estimada_segundos.
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
    : (subfamilia as string) === '1a'
      ? 'comunidad'
      : subfamilia === '3b'
        ? 'pov'
        : subfamilia === '3c' || subfamilia === '3d' || subfamilia === '1b'
          ? 'comunidad'
          : subfamilia === '2a' || subfamilia === '2c'
            ? 'autoridad'
            : subfamilia === '5'
              ? 'autoridad'
              : 'aspiracional'

  const reflexivePiece = 'subfamilia' in piece && piece.subfamilia === '3a' ? piece : null
  const reflexiveContentContract = reflexivePiece
    ? createReflexiveVideoContent(reflexivePiece.copy, reflexivePiece.tipografia_id)
    : null
  const reflexiveRenderContainer = reflexivePiece
    ? ctx.videoRenderContainer === 'still_image_with_music'
      ? createStillImageWithMusicContainer(ctx.stillImageReference ?? '', ctx.musicTone ?? 'reflexivo')
      : carpetaFotos?.trim()
        ? createVideoBackgroundContainer(carpetaFotos, reflexivePiece.duracion_estimada_segundos)
        : null
    : null

  const visualContract = resolveVideoVisualContract({
    subfamilia,
    typographyId: String(videoContract.tipografia_id ?? ''),
    seed: `${salidaId}:${subfamilia}:${titulo}`,
  })
  if (visualContract) videoContract = {...videoContract, visual_contract: visualContract}

  const musicFolderId = resolveMusicFolderIdFromContext({
    zonaGeografica: ctx.zonaGeografica,
    contentContextTags: ctx.contentContextTags,
  })

  return {
    salida_id: salidaId,
    user_id: userId,
    formato: 'video',
    vertical,
    slot_key: `video_${subfamilia}`,
    titulo,
    subtitulo,
    bullets,
    cta,
    slides: null,
    video_crudo: reflexiveRenderContainer?.kind === 'still_image_with_music'
      ? null
      : carpetaFotos ?? null,
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
      ...(ctx.zonaGeografica ? { zona_geografica: ctx.zonaGeografica } : {}),
      ...(ctx.contentContextTags?.length ? { content_context_tags: ctx.contentContextTags } : {}),
      ...(musicFolderId ? { music_folder_id: musicFolderId } : {}),
      ...(reflexiveContentContract ? { render_content_contract: reflexiveContentContract } : {}),
      ...(reflexiveRenderContainer ? { render_container: reflexiveRenderContainer } : {}),
      ...(carpetaFotosId?.trim() ? { video_folder_id: carpetaFotosId.trim() } : {}),
      ...(ctx.videoMaterialContext ? {video_material_context: ctx.videoMaterialContext} : {}),
    },
    source_salida_ids: [],
    formato_carrusel: null,
    objetivo_interaccion: null,
    descripcion_post: null,
    // El calendario genera la pieza, pero el usuario decide si pasa a render.
    render_status: 'pending_review',
    approved_at: null,
    approved_by: null,
    scheduled_at: ctx.scheduledAt ?? null,
  }
}

export function mapPieceToInsertRow(piece: AnyGeneratedPiece, ctx: ContenidoInsertContext): Record<string, unknown> {
  const { salidaId, userId, formatoCarrusel, objetivoInteraccion, carpetaFotos, sourcePastSalidaId, futureRelatedSalidaId, destino, scheduledAt } = ctx

  if (piece.formato === 'carrusel') {
    const c = piece as GeneratedCarrusel | GeneratedAdaptiveCarrusel
    return {
      salida_id:            salidaId,
      user_id:              userId,
      formato:              'carrusel',
      formato_carrusel:     c.formato_carrusel ?? formatoCarrusel,
      objetivo_interaccion: c.objetivo_interaccion ?? objetivoInteraccion,
      descripcion_post:     c.descripcion_post ?? null,
      generation_metadata:  {
        ...(c.metadata ?? {}),
        ...('fuentes' in c && c.fuentes ? { fuentes: c.fuentes } : {}),
        ...(ctx.preferredImageFileIds?.length ? {
          visual_selection: {
            preferred_image_file_ids: ctx.preferredImageFileIds,
            preferred_image_file_names: ctx.preferredImageFileNames ?? [],
            reused_after_exhaustion: ctx.visualSelectionReused ?? false,
          },
        } : {}),
      },
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
      // Renderizado automático.
      render_status: 'dispatching',
      approved_at: null,
      approved_by: null,
      scheduled_at: scheduledAt ?? null,
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
      video_crudo:          carpetaFotos ?? c.carpeta_material,
      mes:                  c.mes,
      is_edited:            false,
      titulo: null, subtitulo: null, bullets: null, cta: null, slides: null,
      render_status: 'dispatching',
      approved_at: null,
      approved_by: null,
      scheduled_at: scheduledAt ?? null,
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
      scheduled_at: scheduledAt ?? null,
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
    scheduled_at: scheduledAt ?? null,
  }
}
