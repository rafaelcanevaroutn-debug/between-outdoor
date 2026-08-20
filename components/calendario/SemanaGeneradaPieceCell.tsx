'use client'

import { useState } from 'react'
import type { ContenidoGenerado, SlideCarrusel } from '@/types'
import CarruselRenderer from '@/components/carrusel-preview/CarruselRenderer'
import CarruselDrilldownModal from '@/components/carrusel-preview/CarruselDrilldownModal'
import {BannerCard, VideoCard} from '@/components/contenido/ContenidoTable'

interface SemanaGeneradaPieceCellProps {
  pieza: ContenidoGenerado
  salidaNombre: string
  renderedImages?: string[]
  initiallyOpen?: boolean
}

export default function SemanaGeneradaPieceCell({
  pieza: initialPieza,
  salidaNombre,
  renderedImages,
  initiallyOpen = false,
}: SemanaGeneradaPieceCellProps) {
  const [showModal, setShowModal] = useState(initiallyOpen)
  const [pieza, setPieza] = useState(initialPieza)

  function handleApproved(id: string, updates: Partial<ContenidoGenerado>) {
    setPieza({ ...pieza, ...updates })
  }

  const isBanner = pieza.formato === 'banner'
  const isVideo = pieza.formato === 'video'
  const isCarrusel = !isBanner && !isVideo

  return (
    <div className="flex flex-col gap-2 relative">
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="block relative aspect-[4/5] w-full rounded-lg overflow-hidden group cursor-pointer text-left"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {isCarrusel ? (
          <CarruselRenderer
            formatoCarrusel={pieza.formato_carrusel}
            slides={pieza.slides_data as unknown as SlideCarrusel[]}
            activeIndex={0}
            variant="thumbnail"
            renderedImages={renderedImages}
          />
        ) : isBanner && pieza.render_status === 'rendered' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/generate/banner/${pieza.id}/imagen`} alt={pieza.titulo ?? 'Banner'} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-3 text-center bg-[#0A0F0A]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5CE6A0]">{isBanner ? 'Banner / Flyer' : 'Video'}</span>
            <span className="text-[12px] text-[#C8DDD0] line-clamp-3">{pieza.titulo || 'Pieza generada'}</span>
            <span className="text-[10px] text-[#7E9286]">{pieza.render_status === 'rendered' ? 'Render listo' : 'Pendiente de revisión'}</span>
          </div>
        )}
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

      {showModal && isCarrusel && (
        <CarruselDrilldownModal
          item={pieza}
          salidaNombre={salidaNombre}
          renderedImages={renderedImages && renderedImages.length > 0 ? renderedImages : undefined}
          onApproved={handleApproved}
          onClose={() => setShowModal(false)}
        />
      )}
      {showModal && !isCarrusel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowModal(false)}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[#0D130E] p-4" onClick={event => event.stopPropagation()}>
            <div className="mb-3 flex justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#C8DDD0]">Cerrar</button>
            </div>
            {isBanner
              ? <BannerCard item={pieza} onSaved={setPieza} />
              : <VideoCard item={pieza} onSaved={setPieza} />}
          </div>
        </div>
      )}
    </div>
  )
}
