'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, LoaderCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { ContenidoGenerado, SlideCarrusel } from '@/types'
import CarruselRenderer from '@/components/carrusel-preview/CarruselRenderer'
import { BannerCard, VideoCard } from '@/components/contenido/ContenidoTable'

const CarruselDrilldownModal = dynamic(
  () => import('@/components/carrusel-preview/CarruselDrilldownModal'),
  { ssr: false }
)

interface SemanaGeneradaPieceCellProps {
  pieza: ContenidoGenerado
  salidaNombre: string
  renderedImages?: string[]
  initiallyOpen?: boolean
}

export default function SemanaGeneradaPieceCell({
  pieza: initialPieza,
  salidaNombre,
  renderedImages: initialRenderedImages,
  initiallyOpen = false,
}: SemanaGeneradaPieceCellProps) {
  const [showModal, setShowModal] = useState(initiallyOpen)
  const [pieza, setPieza] = useState(initialPieza)
  const [renderedImages, setRenderedImages] = useState<string[] | undefined>(initialRenderedImages)
  const isBanner = pieza.formato === 'banner'
  const isVideo = pieza.formato === 'video'
  const isCarrusel = !isBanner && !isVideo

  useEffect(() => {
    if (!isCarrusel) return

    let mounted = true
    let unsubscribe: (() => void) | null = null

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

    if (pieza.render_folder_id) {
      void fetchRenders(pieza.render_folder_id)
    } else {
      void import('@/lib/supabase/client').then(({ createClient }) => {
        if (!mounted) return
        const supabase = createClient()
        const channel = supabase
          .channel(`calendar-piece-${pieza.id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'contenido_generado', filter: `id=eq.${pieza.id}` },
            payload => {
              if (!mounted) return
              const updated = payload.new as Partial<ContenidoGenerado>
              setPieza(previous => ({ ...previous, ...updated }))
              if (updated.render_folder_id) void fetchRenders(updated.render_folder_id)
            },
          )
          .subscribe()
        unsubscribe = () => { void supabase.removeChannel(channel) }
      })
    }

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [isCarrusel, pieza.id, pieza.render_folder_id])

  function handleApproved(id: string, updates: Partial<ContenidoGenerado>) {
    setPieza({ ...pieza, ...updates })
  }

  const designReady = Boolean(pieza.render_folder_id) || pieza.render_status === 'rendered'
  const designFailed = pieza.render_status === 'failed'

  return (
    <div className="flex flex-col gap-2 relative">
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="block relative aspect-[4/5] w-full rounded-lg overflow-hidden group cursor-pointer text-left"
        style={{ border: '1px solid var(--linea)' }}
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
          <img
            src={`/api/generate/banner/${pieza.id}/imagen`}
            alt={pieza.titulo ?? 'Banner'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-3 text-center bg-[var(--blanco-piedra)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cardon)]">
              {isBanner ? 'Banner / Flyer' : 'Video'}
            </span>
            <span className="text-[12px] text-[var(--tinta)] line-clamp-3">{pieza.titulo || 'Pieza generada'}</span>
            <span className="text-[10px] text-[var(--piedra)]">
              {pieza.render_status === 'rendered' ? 'Render listo' : 'Pendiente de revisión'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
          <span className="text-[12px] font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white">Ver pieza</span>
        </div>
        {isCarrusel && !designReady && (
          <div className={`absolute bottom-2 left-2 right-2 z-10 flex items-center justify-center gap-1.5 rounded-full border bg-[rgba(250,250,247,.94)] px-2.5 py-1.5 text-[10px] font-semibold shadow-sm backdrop-blur-md ${designFailed ? 'border-amber-300 text-amber-800' : 'border-white/60 text-[var(--cardon)]'}`}>
            {designFailed
              ? <AlertCircle className="h-3 w-3" />
              : <LoaderCircle className="h-3 w-3 animate-spin" />}
            {designFailed ? 'Copy listo · diseño pendiente' : 'Copy listo · preparando diseño'}
          </div>
        )}
      </button>

      <div className="text-center px-1 mt-1">
        <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--tinta)' }}>
          {pieza.tema || (pieza.formato_carrusel === 'editorial' ? 'Tip Educativo' : 'Promoción')}
        </p>
        <p className="text-[11px] truncate opacity-80" style={{ color: 'var(--cardon)' }}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowModal(false)}>
          <div
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-[var(--nieve)] border border-[var(--linea)] p-4"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-[var(--linea)] px-3 py-1.5 text-xs text-[var(--piedra)] hover:text-[var(--tinta)]"
              >
                Cerrar
              </button>
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
