'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, LoaderCircle, Play, RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { ContenidoGenerado, SlideCarrusel } from '@/types'
import CarruselRenderer from '@/components/carrusel-preview/CarruselRenderer'
import SocialPostPreviewModal from '@/components/contenido/SocialPostPreviewModal'
import { getMatiSocket, type MatiRenderEvent } from '@/lib/mati-socket-client'
import { getRenderImageUrls, primeRenderImageUrls, renderUrlsFromFileIds } from '@/lib/render-images-client'

const CarruselDrilldownModal = dynamic(
  () => import('@/components/carrusel-preview/CarruselDrilldownModal'),
  { ssr: false }
)

function renderFileIdsFromMetadata(metadata: Record<string, unknown> | null | undefined): string[] {
  const value = metadata?.carrusel_render_files
  if (!Array.isArray(value)) return []
  return value.filter((fileId): fileId is string => typeof fileId === 'string' && fileId.length > 0)
}

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
  const metadataFileIds = renderFileIdsFromMetadata(initialPieza.generation_metadata)
  const initialImages = initialRenderedImages ?? (metadataFileIds.length > 0 ? renderUrlsFromFileIds(metadataFileIds) : undefined)
  const hasInitialImages = Boolean(initialImages?.length)
  const [showModal, setShowModal] = useState(initiallyOpen)
  const [pieza, setPieza] = useState(initialPieza)
  const [renderedImages, setRenderedImages] = useState<string[] | undefined>(initialImages)
  const [renderProgressLabel, setRenderProgressLabel] = useState('Preparando diseño')
  const [renderLoadState, setRenderLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>(hasInitialImages ? 'loaded' : 'idle')
  const [renderLoadAttempt, setRenderLoadAttempt] = useState(0)
  const isBanner = pieza.formato === 'banner'
  const isVideo = pieza.formato === 'video'
  const isCarrusel = !isBanner && !isVideo
  const pieceLabel = isVideo
    ? 'Video'
    : isBanner
      ? 'Banner / Flyer'
      : pieza.formato_carrusel === 'editorial'
        ? 'Carrusel educativo'
        : 'Carrusel'

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | null = null

    if (!pieza.render_folder_id) {
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
            },
          )
          .on('broadcast', { event: 'render-status' }, message => {
            if (!mounted) return
            const updated = message.payload as Partial<ContenidoGenerado> & {render_file_ids?: string[]; stage?: string; progress?: number}
            const videoStageLabels: Record<string, string> = {
              preparing: 'Preparando el material',
              audio_ready: 'Música lista',
              clips_ready: 'Clips listos',
              rendering: 'Armando el video',
              uploading: 'Subiendo el video',
            }
            if (isVideo && updated.stage) {
              const label = videoStageLabels[updated.stage] ?? 'Armando el video'
              setRenderProgressLabel(updated.progress ? `${label} · ${Math.round(updated.progress)}%` : label)
            }
            if (isCarrusel && updated.render_folder_id && updated.render_file_ids?.length) {
              setRenderedImages(primeRenderImageUrls(updated.render_folder_id, updated.render_file_ids))
              setRenderLoadState('loading')
            }
            setPieza(previous => ({ ...previous, ...updated }))
          })
          .subscribe()
        unsubscribe = () => { void supabase.removeChannel(channel) }
      })
    }

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [isCarrusel, isVideo, pieza.id, pieza.render_folder_id])

  useEffect(() => {
    if (!isCarrusel || !pieza.render_folder_id) return
    if (hasInitialImages && renderLoadAttempt === 0) return
    let cancelled = false
    setRenderLoadState('loading')

    void getRenderImageUrls(pieza.render_folder_id, {force: renderLoadAttempt > 0})
      .then(urls => {
        if (cancelled) return
        setRenderedImages(urls)
        // `loaded` se confirma cuando la portada termina de decodificar.
      })
      .catch(error => {
        if (cancelled) return
        console.error('[SemanaGeneradaPieceCell] Error fetching renders:', error)
        setRenderLoadState('error')
      })

    return () => { cancelled = true }
  }, [hasInitialImages, isCarrusel, pieza.render_folder_id, renderLoadAttempt])

  useEffect(() => {
    if (!isCarrusel || pieza.render_folder_id) return
    const socket = getMatiSocket()
    if (!socket) return

    const handleRenderStatus = (event: MatiRenderEvent) => {
      if (event.referenceId !== pieza.id) return
      const folderId = event.result?.driveFolderId
      const renderStatus = event.state === 'completed'
        ? 'rendered'
        : event.state === 'failed'
          ? 'failed'
          : 'rendering'

      const labelsByStage: Record<string, string> = {
        preparing_brand: 'Preparando tu identidad',
        finding_photos: 'Buscando tus mejores fotos',
        preparing_design: 'Preparando el diseño',
        rendering_slides: 'Generando tus slides',
        uploading: 'Subiendo el contenido',
        completed: 'Contenido listo',
      }
      if (event.label || event.stage) {
        setRenderProgressLabel(event.label || labelsByStage[event.stage || ''] || 'Preparando diseño')
      }

      const renderFileIds = (event.result?.slides ?? []).map(slide => slide.fileId).filter(Boolean)
      if (folderId && renderFileIds.length > 0) {
        setRenderedImages(primeRenderImageUrls(folderId, renderFileIds))
        setRenderLoadState('loading')
      }

      setPieza(previous => ({
        ...previous,
        render_status: renderStatus,
        ...(folderId ? {render_folder_id: folderId} : {}),
      }))

    }

    const subscribeToPiece = () => {
      socket.emit('render:subscribe', {referenceId: pieza.id})
    }

    socket.on('render:status', handleRenderStatus)
    socket.on('connect', subscribeToPiece)
    if (socket.connected) subscribeToPiece()

    return () => {
      socket.off('render:status', handleRenderStatus)
      socket.off('connect', subscribeToPiece)
      socket.emit('render:unsubscribe', {referenceId: pieza.id})
    }
  }, [isCarrusel, pieza.id, pieza.render_folder_id])

  function handleApproved(id: string, updates: Partial<ContenidoGenerado>) {
    setPieza({ ...pieza, ...updates })
  }

  const designReady = Boolean(pieza.render_folder_id) || pieza.render_status === 'rendered'
  const designFailed = pieza.render_status === 'failed'
  const previewLoading = Boolean(pieza.render_folder_id) && renderLoadState !== 'loaded' && renderLoadState !== 'error'
  const previewFailed = Boolean(pieza.render_folder_id) && renderLoadState === 'error'

  function handleCardClick() {
    if (previewFailed) {
      setRenderedImages(undefined)
      setRenderLoadState('loading')
      setRenderLoadAttempt(attempt => attempt + 1)
      return
    }
    setShowModal(true)
  }

  return (
    <div className="flex flex-col gap-2 relative">
      <button
        type="button"
        onClick={handleCardClick}
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
            onRenderedCoverLoad={() => setRenderLoadState('loaded')}
            onRenderedCoverError={() => setRenderLoadState('error')}
          />
        ) : isBanner && pieza.render_status === 'rendered' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/generate/banner/${pieza.id}/imagen`}
            alt={pieza.titulo ?? 'Banner'}
            className="h-full w-full object-cover"
          />
        ) : isVideo && pieza.render_status === 'rendered' ? (
          <div className="relative h-full w-full bg-black">
            <video
              src={`/api/generate/video/${pieza.id}/media`}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={event => {
                // Sin un `poster` separado, usamos el primer cuadro real del
                // render como miniatura de la pieza.
                if (event.currentTarget.duration > 0) event.currentTarget.currentTime = 0.05
              }}
            />
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-black/45 text-white shadow-lg backdrop-blur-sm transition-transform group-hover:scale-105">
                <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
              </span>
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-3 text-center bg-[var(--blanco-piedra)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--cardon)]">
              {isBanner ? 'Banner / Flyer' : 'Video'}
            </span>
            <span className="text-[12px] text-[var(--tinta)] line-clamp-3">{pieza.titulo || 'Pieza generada'}</span>
            <span className="text-[10px] text-[var(--piedra)]">
              {pieza.render_status === 'rendered'
                ? 'Render listo'
                : pieza.render_status === 'rendering' || pieza.render_status === 'dispatching'
                  ? renderProgressLabel
                  : 'Pendiente de revisión'}
            </span>
          </div>
        )}
        {!isVideo && !previewLoading && !previewFailed && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
            <span className="text-[12px] font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white">Ver pieza</span>
          </div>
        )}
        {isCarrusel && !designReady && (
          <div className={`absolute bottom-2 left-2 right-2 z-10 flex items-center justify-center gap-1.5 rounded-full border bg-[rgba(250,250,247,.94)] px-2.5 py-1.5 text-[10px] font-semibold shadow-sm backdrop-blur-md ${designFailed ? 'border-amber-300 text-amber-800' : 'border-white/60 text-[var(--cardon)]'}`}>
            {designFailed
              ? <AlertCircle className="h-3 w-3" />
              : <LoaderCircle className="h-3 w-3 animate-spin" />}
            {designFailed ? 'Copy listo · diseño pendiente' : `Copy listo · ${renderProgressLabel.toLocaleLowerCase('es-AR')}`}
          </div>
        )}
        {isVideo && !designReady && (pieza.render_status === 'rendering' || pieza.render_status === 'dispatching') && (
          <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-center gap-1.5 rounded-full border border-white/60 bg-[rgba(250,250,247,.94)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--cardon)] shadow-sm backdrop-blur-md">
            <LoaderCircle className="h-3 w-3 animate-spin" />
            {renderProgressLabel}
          </div>
        )}
        {isCarrusel && previewLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(250,250,247,.78)] backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-[10px] font-semibold text-[var(--cardon)] shadow-sm">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Diseño listo · cargando portada
            </div>
          </div>
        )}
        {isCarrusel && previewFailed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(250,250,247,.88)] px-3 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 rounded-full border border-[var(--linea)] bg-white px-3 py-2 text-[10px] font-semibold text-[var(--cardon)] shadow-sm">
              <RefreshCw className="h-3.5 w-3.5" />
              No cargó la vista · reintentar
            </div>
          </div>
        )}
      </button>

      <div className="text-center px-1 mt-1">
        <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--tinta)' }}>
          {pieceLabel}
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
        <SocialPostPreviewModal
          item={pieza}
          profileName={salidaNombre}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
