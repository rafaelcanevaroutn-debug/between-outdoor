'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ContenidoGenerado } from '@/types'
import CarruselRenderer from './CarruselRenderer'
import { FORMATO_CARRUSEL_LABELS } from './gradientes'

interface CarruselDrilldownModalProps {
  item: ContenidoGenerado
  salidaNombre?: string
  renderedImages?: string[]
  onClose: () => void
}

// Drilldown de solo lectura sobre una pieza ya cargada en memoria —
// no hace fetch propio (las imágenes renderizadas ya vienen resueltas
// desde CarruselFeedGrid), no escribe en Supabase. Navegación slide a
// slide como stories/swipe de carrusel real.
export default function CarruselDrilldownModal({ item, salidaNombre, renderedImages, onClose }: CarruselDrilldownModalProps) {
  const slides = item.slides_data ?? []
  const [index, setIndex] = useState(0)

  const goNext = useCallback(() => setIndex(i => Math.min(i + 1, slides.length - 1)), [slides.length])
  const goPrev = useCallback(() => setIndex(i => Math.max(i - 1, 0)), [])

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
