'use client'

import { useState } from 'react'
import type { ContenidoGenerado, SlideCarrusel } from '@/types'
import CarruselRenderer from '@/components/carrusel-preview/CarruselRenderer'
import CarruselDrilldownModal from '@/components/carrusel-preview/CarruselDrilldownModal'

interface SemanaGeneradaPieceCellProps {
  pieza: ContenidoGenerado
  salidaNombre: string
  renderedImages?: string[]
}

export default function SemanaGeneradaPieceCell({
  pieza: initialPieza,
  salidaNombre,
  renderedImages,
}: SemanaGeneradaPieceCellProps) {
  const [showModal, setShowModal] = useState(false)
  const [pieza, setPieza] = useState(initialPieza)

  function handleApproved(id: string, updates: Partial<ContenidoGenerado>) {
    setPieza({ ...pieza, ...updates })
  }

  return (
    <div className="flex flex-col gap-2 relative">
      <button 
        type="button"
        onClick={() => setShowModal(true)} 
        className="block relative aspect-[4/5] w-full rounded-lg overflow-hidden group cursor-pointer text-left" 
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <CarruselRenderer 
          formatoCarrusel={pieza.formato_carrusel}
          slides={pieza.slides_data as unknown as SlideCarrusel[]}
          activeIndex={0}
          variant="thumbnail"
          renderedImages={renderedImages}
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
          <span className="text-[12px] font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white">Ver pieza</span>
        </div>
      </button>
      
      <div className="text-center px-1 mt-1">
        <p className="text-[12px] font-semibold truncate" style={{ color: '#EAF2EC' }}>
          {pieza.tema || (pieza.formato_carrusel === 'editorial' ? 'Tip Educativo' : 'Promoción')}
        </p>
        <p className="text-[11px] truncate opacity-80" style={{ color: '#5CE6A0' }}>
          {salidaNombre}
        </p>
      </div>

      {showModal && (
        <CarruselDrilldownModal
          item={pieza}
          salidaNombre={salidaNombre}
          renderedImages={renderedImages && renderedImages.length > 0 ? renderedImages : undefined}
          onApproved={handleApproved}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
