import {
  createBanner1Content,
  createBanner2Content,
  createBanner3Content,
  createBanner4Content,
  createBanner5Content,
  createBanner6Content,
  type Banner1ContentContract,
  type BannerContentContract,
} from './generators/banner-content.ts'
import type {VideoFichaEtiqueta} from '../types/index.ts'
import { BANNER_MOLDE_1_CAPS, BANNER_MOLDE_1_TEMPLATE_ID, validateBannerMolde1RendererContent, validateBannerRendererContent } from './banner-render-contract.ts'
import { generateContextualHashtags } from './hashtags.ts'
import { generateEngagementDescription, enforceCharacterLimit } from './generators/engagement-description.ts'

export function mapBannerMolde1ToInsertRow(params: {
  salidaId: string
  userId: string
  content: Banner1ContentContract
  backgroundDriveFileId: string
  metadata?: Record<string, unknown>
  scheduledAt?: string | null
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
    descripcion_post: enforceCharacterLimit(generateEngagementDescription({
      destino: params.content.lugar,
      mainText: params.content.lugar,
      secondaryText: params.content.fecha,
      hashtags: generateContextualHashtags(params.content.lugar, undefined, null)
    })),
    render_status: 'pending_review',
    approved_at: null,
    approved_by: null,
    scheduled_at: params.scheduledAt ?? null,
  }
}

function presentation(content: BannerContentContract): {titulo: string; subtitulo: string | null; bullets: string[]; cta: string | null} {
  switch (content.contentKind) {
    case 'banner/molde-1': return {titulo: content.lugar, subtitulo: content.fecha, bullets: content.items, cta: content.copy}
    case 'banner/molde-2': return {titulo: content.lugar, subtitulo: content.fecha, bullets: content.ficha.map(item => `${item.etiqueta}: ${item.valor}`), cta: content.cta}
    case 'banner/molde-3': return {titulo: content.lugar, subtitulo: content.fecha, bullets: [content.precio, content.reserva, content.financiacion, content.disponibilidad].filter((item): item is string => Boolean(item)), cta: content.cta}
    case 'banner/molde-4': return {titulo: content.titulo, subtitulo: null, bullets: content.salidas.map(item => `${item.lugar} · ${item.fecha} · ${item.precio}`), cta: content.cta}
    case 'banner/molde-5': return {titulo: content.lugar, subtitulo: content.fecha, bullets: [content.noches, content.alojamiento, content.regimen, ...(content.precio ? [content.precio] : []), ...content.incluye.map(item => item.label)], cta: content.cta}
    case 'banner/molde-6': return {titulo: content.mensaje, subtitulo: content.convocatoria, bullets: [], cta: null}
  }
}

export function mapBannerContentToInsertRow(params: {
  salidaId: string
  userId: string
  content: BannerContentContract
  backgroundDriveFileId: string
  sourceSalidaIds?: string[]
  metadata?: Record<string, unknown>
  scheduledAt?: string | null
}): Record<string, unknown> {
  if (params.content.contentKind === 'banner/molde-1') return mapBannerMolde1ToInsertRow({...params, content: params.content})
  const errors = validateBannerRendererContent(params.content)
  if (errors.length > 0) throw new Error(errors.join('; '))
  if (!/^[a-z0-9_-]+$/iu.test(params.backgroundDriveFileId)) throw new Error('backgroundDriveFileId inválido')
  const mold = Number(params.content.contentKind.slice(-1))
  const display = presentation(params.content)
  return {
    salida_id: params.salidaId, user_id: params.userId, formato: 'banner', vertical: mold === 6 ? 'comunidad' : 'conversion',
    slot_key: `banner_molde_${mold}`, titulo: display.titulo, subtitulo: display.subtitulo, bullets: display.bullets, cta: display.cta,
    slides: null, video_crudo: null, mes: null, is_edited: false, tema: `banner_molde_${mold}`,
    estructura_narrativa: null, angulo: null, cta_comentario: null, slides_data: null,
    generation_metadata: {...(params.metadata ?? {}), banner_motor: 'moldes', banner_template_id: `${params.content.contentKind}@1`, banner_content_contract: params.content, banner_background_drive_file_id: params.backgroundDriveFileId},
    source_salida_ids: params.sourceSalidaIds ?? [], formato_carrusel: null, objetivo_interaccion: null, 
    descripcion_post: enforceCharacterLimit(generateEngagementDescription({
      destino: display.titulo, // Usually el destino
      mainText: display.titulo,
      secondaryText: display.subtitulo,
      hashtags: generateContextualHashtags(display.titulo, undefined, null)
    })),
    render_status: 'pending_review', approved_at: null, approved_by: null,
    scheduled_at: params.scheduledAt ?? null,
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

export interface EditableBannerRow {
  titulo: string | null
  subtitulo: string | null
  bullets: string[] | null
  cta: string | null
  generation_metadata: Record<string, unknown> | null
}

const FICHA_LABELS = new Set<VideoFichaEtiqueta>(['altitud', 'desnivel', 'distancia', 'duración', 'dificultad', 'acceso'])

function exactEditableItems(row: EditableBannerRow, expected: number, label: string): string[] {
  const items = (row.bullets ?? []).map(item => item.trim()).filter(Boolean)
  if (items.length !== expected) {
    throw new Error(`${label} requiere exactamente ${expected} ${expected === 1 ? 'ítem' : 'ítems'}; editá los existentes sin agregar ni borrar filas`)
  }
  return items
}

function parseFichaItem(value: string): {etiqueta: VideoFichaEtiqueta; valor: string} {
  const separator = value.indexOf(':')
  if (separator < 1) throw new Error('Cada dato de ficha debe conservar el formato etiqueta: valor')
  const etiqueta = value.slice(0, separator).trim().toLocaleLowerCase('es-AR') as VideoFichaEtiqueta
  const valor = value.slice(separator + 1).trim()
  if (!FICHA_LABELS.has(etiqueta) || !valor) {
    throw new Error('La ficha sólo admite altitud, desnivel, distancia, duración, dificultad o acceso con formato etiqueta: valor')
  }
  return {etiqueta, valor}
}

function parseDeparture(value: string): {lugar: string; fecha: string; precio: string} {
  const parts = value.split(' · ').map(part => part.trim())
  if (parts.length !== 3 || parts.some(part => !part)) {
    throw new Error('Cada salida debe conservar el formato lugar · fecha · precio')
  }
  return {lugar: parts[0], fecha: parts[1], precio: parts[2]}
}

/**
 * Reconstruye el contrato neutral desde las columnas editables. La metadata se
 * usa sólo para conservar estructura no representable en la UI (tipografía,
 * iconos y presencia de campos opcionales), nunca para recuperar copy viejo.
 */
export function rebuildBannerContentFromEditableRow(row: EditableBannerRow): BannerContentContract {
  const persisted = readPersistedBannerContent(row.generation_metadata)
  const titulo = row.titulo ?? ''
  const subtitulo = row.subtitulo ?? ''
  const cta = row.cta ?? ''

  switch (persisted.contentKind) {
    case 'banner/molde-1':
      return createBanner1Content({lugar: titulo, fecha: subtitulo, copy: cta, items: row.bullets ?? [], typographyId: persisted.typographyId})
    case 'banner/molde-2':
      return createBanner2Content({
        lugar: titulo,
        fecha: subtitulo,
        ficha: exactEditableItems(row, persisted.ficha.length, 'Molde 2').map(parseFichaItem),
        cta,
        typographyId: persisted.typographyId,
      })
    case 'banner/molde-3': {
      const optionalFields = (['reserva', 'financiacion', 'disponibilidad'] as const).filter(field => Boolean(persisted[field]))
      const values = exactEditableItems(row, 1 + optionalFields.length, 'Molde 3')
      const optionals = Object.fromEntries(optionalFields.map((field, index) => [field, values[index + 1]]))
      return createBanner3Content({lugar: titulo, fecha: subtitulo, precio: values[0], ...optionals, cta, typographyId: persisted.typographyId})
    }
    case 'banner/molde-4':
      return createBanner4Content({
        titulo,
        salidas: exactEditableItems(row, persisted.salidas.length, 'Molde 4').map(parseDeparture),
        cta,
        typographyId: persisted.typographyId,
      })
    case 'banner/molde-5': {
      const priceOffset = persisted.precio ? 1 : 0
      const values = exactEditableItems(row, 3 + priceOffset + persisted.incluye.length, 'Molde 5')
      return createBanner5Content({
        lugar: titulo,
        fecha: subtitulo,
        noches: values[0],
        alojamiento: values[1],
        regimen: values[2],
        incluye: persisted.incluye.map((item, index) => ({icon: item.icon, label: values[index + 3 + priceOffset]})),
        precio: persisted.precio ? values[3] : undefined,
        cta,
        typographyId: persisted.typographyId,
      })
    }
    case 'banner/molde-6':
      return createBanner6Content({mensaje: titulo, convocatoria: subtitulo, typographyId: persisted.typographyId})
  }
}
