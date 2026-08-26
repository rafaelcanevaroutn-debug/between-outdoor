'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ContenidoGenerado } from '@/types'
import CarruselRenderer from './CarruselRenderer'
import { effectiveCarouselSlides } from '@/lib/effective-carousel-slides'
import SocialPublishingControls from '@/components/contenido/SocialPublishingControls'

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
  const slides = effectiveCarouselSlides(item.slides_data ?? [], renderedImages?.length)
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
        className="relative w-full max-w-[450px] md:max-w-[850px] rounded-[4px] md:rounded-r-[4px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
        style={{ backgroundColor: 'var(--nieve)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Lado izquierdo: Carrusel (Oscuro) */}
        <div className="relative w-full md:w-[450px] shrink-0 p-0 flex items-center justify-center" style={{ backgroundColor: 'var(--tinta)' }}>
          <div className="w-full relative">
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
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-105 z-10 shadow-md"
                style={{ backgroundColor: 'var(--nieve)', color: 'var(--tinta)' }}
                aria-label="Slide anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {index < slides.length - 1 && (
              <button
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-105 z-10 shadow-md"
                style={{ backgroundColor: 'var(--nieve)', color: 'var(--tinta)' }}
                aria-label="Slide siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Lado derecho: Descripción (Claro) */}
        <div className="flex flex-col w-full md:w-[400px] border-t md:border-t-0 md:border-l min-h-[250px] md:min-h-[450px]"
             style={{ backgroundColor: 'var(--nieve)', borderColor: 'var(--linea)', color: 'var(--tinta)' }}>
          {/* Header (Mimetiza el perfil de IG) */}
          <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--linea)' }}>
             <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--tinta)' }}>
               <span className="text-[10px] font-bold" style={{ color: 'var(--nieve)' }}>BO</span>
             </div>
             <span className="font-semibold text-[14px] leading-none">{salidaNombre || 'between_outdoor'}</span>
          </div>

          {/* Caption body */}
          <div className="p-4 overflow-y-auto flex-1 text-[14px] leading-relaxed whitespace-pre-wrap custom-scrollbar">
             <span className="font-semibold mr-2">{salidaNombre || 'between_outdoor'}</span>
             {item.descripcion_post || 'Sin descripción...'}
          </div>
          <SocialPublishingControls contenidoId={item.id} ready={item.render_status === 'rendered' && Boolean(item.render_folder_id)} />
        </div>
      </div>
    </div>
  )
}
