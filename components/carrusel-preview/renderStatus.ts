import type { RenderApprovalStatus } from '@/types'

export interface PiezaAprobacion {
  render_status: RenderApprovalStatus | null
  render_folder_id: string | null
}

// Piezas de antes del gate ya tienen render_folder_id pero render_status
// null â€” nunca pasaron por el flujo de aprobaciÃ³n y no hace falta que lo
// hagan retroactivamente: ya estÃ¡n renderizadas.
export function estaRenderizada(pieza: PiezaAprobacion): boolean {
  return Boolean(pieza.render_folder_id) || pieza.render_status === 'rendered'
}

export function puedeAprobarse(pieza: PiezaAprobacion): boolean {
  if (estaRenderizada(pieza)) return false
  return pieza.render_status === null
    || pieza.render_status === 'pending_review'
    || pieza.render_status === 'failed'
}

export interface EstadoMeta {
  label: string
  color: string
}

export function metaDeEstado(pieza: PiezaAprobacion): EstadoMeta {
  if (estaRenderizada(pieza)) return { label: 'Renderizado', color: 'var(--cardon-tenue)' }
  switch (pieza.render_status) {
    case 'dispatching':
      return { label: 'Enviando a Mati', color: '#E8B45C' }
    case 'rendering':
      return { label: 'Renderizando', color: '#E8B45C' }
    case 'failed':
      return { label: 'Render fallido', color: '#f87171' }
    default:
      return { label: 'Pendiente de aprobaciÃ³n', color: '#7E9286' }
  }
}
