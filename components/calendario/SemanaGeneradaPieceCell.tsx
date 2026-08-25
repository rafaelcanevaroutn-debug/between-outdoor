'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { ContenidoGenerado, SlideCarrusel } from '@/types'
import CarruselRenderer from '@/components/carrusel-preview/CarruselRenderer'

const CarruselDrilldownModal = dynamic(
  () => import('@/components/carrusel-preview/CarruselDrilldownModal'),
  { ssr: false }
)

interface SemanaGeneradaPieceCellProps {
  pieza: ContenidoGenerado
  salidaNombre: string
}

export default function SemanaGeneradaPieceCell({
  pieza: initialPieza,
  salidaNombre,
}: SemanaGeneradaPieceCellProps) {
  const [showModal, setShowModal] = useState(false)
  const [pieza, setPieza] = useState(initialPieza)
  const [renderedImages, setRenderedImages] = useState<string[] | undefined>(undefined)

  useEffect(() => {
    let mounted = true
    let pollInterval: NodeJS.Timeout | null = null

    const fetchRenders = async (folderId: string) => {
      try {
        const res = await fetch(`/api/fotos/renders?folderId=${folderId}`)
        const data = await res.json()
        if (mounted && data.urls) {
          setRenderedImages(data.urls)
        }
      } catch (err) {
        console.error('[SemanaGeneradaPieceCell] Error fetching renders:', err)
      }
    }

    const pollPiece = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data, error } = await supabase
          .from('contenido_generado')
          .select('render_folder_id')
          .eq('id', pieza.id)
          .single()
          
        if (data && data.render_folder_id && mounted) {
          setPieza(prev => ({ ...prev, render_folder_id: data.render_folder_id }))
          fetchRenders(data.render_folder_id)
          if (pollInterval) clearInterval(pollInterval)
        }
      } catch (err) {
        // Ignore errors during polling
      }
    }

    if (pieza.render_folder_id) {
      fetchRenders(pieza.render_folder_id)
    } else {
      // Start polling every 4 seconds if it doesn't have a folder id yet
      pollInterval = setInterval(pollPiece, 4000)
    }

    return () => {
      mounted = false
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [pieza.id, pieza.render_folder_id])

  function handleApproved(id: string, updates: Partial<ContenidoGenerado>) {
    setPieza({ ...pieza, ...updates })
  }

  return (
    <div className="flex flex-col gap-2 relative">
      <button 
        type="button"
        onClick={() => setShowModal(true)} 
        className="block relative aspect-[4/5] w-full rounded-lg overflow-hidden group cursor-pointer text-left" 
        style={{ border: '1px solid var(--linea)' }}
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
        <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--tinta)' }}>
          {pieza.tema || (pieza.formato_carrusel === 'editorial' ? 'Tip Educativo' : 'Promoción')}
        </p>
        <p className="text-[11px] truncate opacity-80" style={{ color: 'var(--cardon)' }}>
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
