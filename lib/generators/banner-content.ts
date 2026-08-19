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

export interface Banner6ContentContract {
  contentKind: 'banner/molde-6'
  mensaje: string
  convocatoria: string
  typographyId: string
}

export type BannerContentContract =
  | Banner1ContentContract
  | Banner2ContentContract
  | Banner6ContentContract

function requireNonEmpty(value: string, field: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`El contenido de banner requiere ${field}`)
  return trimmed
}

export function createBanner1Content(params: {
  lugar: string
  fecha: string
  items: string[]
  typographyId: string
}): Banner1ContentContract {
  const items = params.items.map(item => item.trim()).filter(Boolean)
  if (items.length === 0) throw new Error('El contenido de Molde 1 requiere al menos un ítem')
  return {
    contentKind: 'banner/molde-1',
    lugar: requireNonEmpty(params.lugar, 'lugar'),
    fecha: requireNonEmpty(params.fecha, 'fecha'),
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
