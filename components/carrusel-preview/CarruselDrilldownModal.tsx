'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ContenidoGenerado } from '@/types'
import CarruselRenderer from './CarruselRenderer'

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(5,8,5,0.9)' }}
      onClick={onClose}
    >
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 md:top-6 md:right-6 text-white/70 hover:text-white transition-colors z-50"
        aria-label="Cerrar"
      >
        <X className="w-8 h-8 md:w-10 md:h-10" />
      </button>

      <div 
        className="relative w-full max-w-[450px] bg-black rounded-xl overflow-hidden shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        <div className="relative w-full p-2 md:p-4">
          <CarruselRenderer
            formatoCarrusel={item.formato_carrusel}
            slides={slides}
            activeIndex={index}
            onIndexChange={setIndex}
            renderedImages={renderedImages}
          />
          
          {index > 0 && (
            <button
              onClick={goPrev}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-black/70"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFFFFF' }}
              aria-label="Slide anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {index < slides.length - 1 && (
            <button
              onClick={goNext}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-black/70"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFFFFF' }}
              aria-label="Slide siguiente"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
