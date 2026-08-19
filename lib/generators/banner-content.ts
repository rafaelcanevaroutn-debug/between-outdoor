import type { VideoFichaEtiqueta } from '@/types'

// Contenido neutral de banner — desacoplado de cualquier medio de salida.
// El mismo copy sirve después para una salida estática (PNG) o para un
// contenedor con música/duración; ningún campo de acá asume render, layout
// ni tiempo. Mismo principio que ReflexiveVideoContentContract en
// video-render-container.ts (contenido de 3a separado de su contenedor),
// aplicado acá a los 3 moldes de banner.

export interface Banner1ContentContract {
  contentKind: 'banner/molde-1'
  lugar: string
  fecha: string
  copy: string
  items: string[]
  typographyId: string
}

export interface Banner2ContentContract {
  contentKind: 'banner/molde-2'
  lugar: string
  fecha: string
  ficha: { etiqueta: VideoFichaEtiqueta; valor: string }[]
  cta: string
  typographyId: string
}

export type BannerIncludeIcon =
  | 'alojamiento'
  | 'comidas'
  | 'guia'
  | 'traslados'
  | 'aereos'
  | 'asistencia'

export interface BannerIncludedItem {
  icon: BannerIncludeIcon
  label: string
}

export interface Banner3ContentContract {
  contentKind: 'banner/molde-3'
  lugar: string
  fecha: string
  precio: string
  reserva?: string
  financiacion?: string
  disponibilidad?: string
  cta: string
  typographyId: string
}

export interface Banner4DepartureItem {
  lugar: string
  fecha: string
}

export interface Banner4ContentContract {
  contentKind: 'banner/molde-4'
  titulo: string
  salidas: Banner4DepartureItem[]
  cta: string
  typographyId: string
}

export interface Banner5ContentContract {
  contentKind: 'banner/molde-5'
  lugar: string
  fecha: string
  noches: string
  alojamiento: string
  regimen: string
  incluye: BannerIncludedItem[]
  precio?: string
  cta: string
  typographyId: string
}

export interface Banner6ContentContract {
  contentKind: 'banner/molde-6'
  mensaje: string
  convocatoria: string
  typographyId: string
}

export type BannerContentContract =
  | Banner1ContentContract
  | Banner2ContentContract
  | Banner3ContentContract
  | Banner4ContentContract
  | Banner5ContentContract
  | Banner6ContentContract

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`El contenido de banner requiere ${field}`)
  return trimmed
}

export function createBanner1Content(params: {
  lugar: string
  fecha: string
  copy: string
  items: string[]
  typographyId: string
}): Banner1ContentContract {
  const items = params.items.map(item => item.trim()).filter(Boolean)
  if (items.length === 0) throw new Error('El contenido de Molde 1 requiere al menos un ítem')
  return {
    contentKind: 'banner/molde-1',
    lugar: requireNonEmpty(params.lugar, 'lugar'),
    fecha: requireNonEmpty(params.fecha, 'fecha'),
    copy: requireNonEmpty(params.copy, 'copy'),
    items,
    typographyId: requireNonEmpty(params.typographyId, 'tipografía'),
  }
}

export function createBanner2Content(params: {
  lugar: string
  fecha: string
  ficha: { etiqueta: VideoFichaEtiqueta; valor: string }[]
  cta: string
  typographyId: string
}): Banner2ContentContract {
  if (params.ficha.length < 3) {
    throw new Error('El contenido de Molde 2 requiere al menos tres datos de ficha')
  }
  return {
    contentKind: 'banner/molde-2',
    lugar: requireNonEmpty(params.lugar, 'lugar'),
    fecha: requireNonEmpty(params.fecha, 'fecha'),
    ficha: params.ficha,
    cta: requireNonEmpty(params.cta, 'CTA'),
    typographyId: requireNonEmpty(params.typographyId, 'tipografía'),
  }
}

export function createBanner6Content(params: {
  mensaje: string
  convocatoria: string
  typographyId: string
}): Banner6ContentContract {
  return {
    contentKind: 'banner/molde-6',
    mensaje: requireNonEmpty(params.mensaje, 'mensaje'),
    convocatoria: requireNonEmpty(params.convocatoria, 'convocatoria'),
    typographyId: requireNonEmpty(params.typographyId, 'tipografía'),
  }
}

function optionalNonEmpty(value: string | undefined, field: string): string | undefined {
  if (value === undefined) return undefined
  return requireNonEmpty(value, field)
}

export function createBanner3Content(params: {
  lugar: string
  fecha: string
  precio: string
  reserva?: string
  financiacion?: string
  disponibilidad?: string
  cta: string
  typographyId: string
}): Banner3ContentContract {
  return {
    contentKind: 'banner/molde-3',
    lugar: requireNonEmpty(params.lugar, 'lugar'),
    fecha: requireNonEmpty(params.fecha, 'fecha'),
    precio: requireNonEmpty(params.precio, 'precio'),
    reserva: optionalNonEmpty(params.reserva, 'reserva'),
    financiacion: optionalNonEmpty(params.financiacion, 'financiación'),
    disponibilidad: optionalNonEmpty(params.disponibilidad, 'disponibilidad'),
    cta: requireNonEmpty(params.cta, 'CTA'),
    typographyId: requireNonEmpty(params.typographyId, 'tipografía'),
  }
}

export function createBanner4Content(params: {
  titulo: string
  salidas: Banner4DepartureItem[]
  cta: string
  typographyId: string
}): Banner4ContentContract {
  const salidas = params.salidas.map(item => ({
    lugar: requireNonEmpty(item.lugar, 'lugar de salida'),
    fecha: requireNonEmpty(item.fecha, 'fecha de salida'),
  }))
  if (salidas.length < 2 || salidas.length > 4) {
    throw new Error('El contenido de Molde 4 requiere entre dos y cuatro salidas')
  }
  return {
    contentKind: 'banner/molde-4',
    titulo: requireNonEmpty(params.titulo, 'título'),
    salidas,
    cta: requireNonEmpty(params.cta, 'CTA'),
    typographyId: requireNonEmpty(params.typographyId, 'tipografía'),
  }
}

export function createBanner5Content(params: {
  lugar: string
  fecha: string
  noches: string
  alojamiento: string
  regimen: string
  incluye: BannerIncludedItem[]
  precio?: string
  cta: string
  typographyId: string
}): Banner5ContentContract {
  const incluye = params.incluye.map(item => ({
    icon: item.icon,
    label: requireNonEmpty(item.label, 'etiqueta de incluido'),
  }))
  if (incluye.length < 1 || incluye.length > 4) {
    throw new Error('El contenido de Molde 5 requiere entre uno y cuatro incluidos')
  }
  if (new Set(incluye.map(item => item.icon)).size !== incluye.length) {
    throw new Error('El contenido de Molde 5 no admite íconos incluidos repetidos')
  }
  return {
    contentKind: 'banner/molde-5',
    lugar: requireNonEmpty(params.lugar, 'lugar'),
    fecha: requireNonEmpty(params.fecha, 'fecha'),
    noches: requireNonEmpty(params.noches, 'noches'),
    alojamiento: requireNonEmpty(params.alojamiento, 'alojamiento'),
    regimen: requireNonEmpty(params.regimen, 'régimen'),
    incluye,
    precio: optionalNonEmpty(params.precio, 'precio'),
    cta: requireNonEmpty(params.cta, 'CTA'),
    typographyId: requireNonEmpty(params.typographyId, 'tipografía'),
  }
}
