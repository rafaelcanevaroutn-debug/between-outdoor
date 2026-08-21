'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ContenidoGenerado } from '@/types'
import CarruselRenderer from './CarruselRenderer'
import { FORMATO_CARRUSEL_LABELS } from './gradientes'
import { metaDeEstado, puedeAprobarse } from './renderStatus'

interface CarruselDrilldownModalProps {
  item: ContenidoGenerado
  salidaNombre?: string
  renderedImages?: string[]
  onApproved?: (id: string, updates: Pick<ContenidoGenerado, 'render_status' | 'approved_at' | 'approved_by'>) => void
  onClose: () => void
}

// Drilldown sobre una pieza ya cargada en memoria — no hace fetch propio
// (las imágenes renderizadas ya vienen resueltas desde CarruselFeedGrid).
// Navegación slide a slide como stories/swipe de carrusel real. Único
// escritor: el botón de aprobación, que dispara el dispatch a Mati.
export default function CarruselDrilldownModal({ item, salidaNombre, renderedImages, onApproved, onClose }: CarruselDrilldownModalProps) {
  const slides = item.slides_data ?? []
  const estadoMeta = metaDeEstado(item)
  const [index, setIndex] = useState(0)
  const [aprobando, setAprobando] = useState(false)
  const [aprobarError, setAprobarError] = useState('')

  const goNext = useCallback(() => setIndex(i => Math.min(i + 1, slides.length - 1)), [slides.length])
  const goPrev = useCallback(() => setIndex(i => Math.max(i - 1, 0)), [])

  async function aprobar() {
    setAprobando(true)
    setAprobarError('')
    try {
      const response = await fetch(`/api/generate/carrusel/${item.id}/aprobar`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        setAprobarError(data.error || 'No se pudo aprobar el carrusel')
        return
      }
      onApproved?.(item.id, {
        render_status: data.status,
        approved_at: data.approvedAt ?? item.approved_at,
        approved_by: data.approvedBy ?? item.approved_by,
      })
    } catch {
      setAprobarError('Error de red al aprobar el carrusel')
    } finally {
      setAprobando(false)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, goNext, goPrev])

  if (slides.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(5,8,5,0.85)' }}
      onClick={onClose}
    >
      <div className="relative w-full max-w-[380px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            {salidaNombre && (
              <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: '#5CE6A0' }}>{salidaNombre}</p>
            )}
            <p className="text-[13px] font-medium" style={{ color: '#EAF2EC' }}>
              {item.formato_carrusel ? FORMATO_CARRUSEL_LABELS[item.formato_carrusel] : 'Carrusel'}
              <span style={{ color: '#4A6B4A' }}> · {index + 1}/{slides.length}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ backgroundColor: '#111A11', color: '#C8DDD0', border: '1px solid #1E2D1E' }}
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: estadoMeta.color }}>
            {estadoMeta.label}
          </span>
        </div>
        {aprobarError && (
          <p className="text-[12px] mb-2 px-1" style={{ color: '#f87171' }}>{aprobarError}</p>
        )}

        <div className="relative">
          <CarruselRenderer
            formatoCarrusel={item.formato_carrusel}
            slides={slides}
            activeIndex={index}
            onIndexChange={setIndex}
            descripcionPost={item.descripcion_post}
            ctaComentario={item.cta_comentario}
            nombreCuenta={salidaNombre}
            renderedImages={renderedImages}
            showCaption
          />

          {index > 0 && (
            <button
              onClick={goPrev}
              className="absolute left-2.5 top-[38%] w-9 h-9 flex items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: '#FFFFFF' }}
              aria-label="Slide anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {index < slides.length - 1 && (
            <button
              onClick={goNext}
              className="absolute right-2.5 top-[38%] w-9 h-9 flex items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: '#FFFFFF' }}
              aria-label="Slide siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
