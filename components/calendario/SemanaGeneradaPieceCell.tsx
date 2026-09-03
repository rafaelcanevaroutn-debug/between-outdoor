'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, LoaderCircle, Play, RefreshCw, CheckCircle2, Clock3 } from 'lucide-react'
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
  onPieceChange?: (pieceId: string, updates: Partial<ContenidoGenerado>) => void
}

export default function SemanaGeneradaPieceCell({
  pieza: initialPieza,
  salidaNombre,
  renderedImages: initialRenderedImages,
  initiallyOpen = false,
  onPieceChange,
}: SemanaGeneradaPieceCellProps) {
  const metadataFileIds = renderFileIdsFromMetadata(initialPieza.generation_metadata)
  const zernioMediaUrls = initialPieza.generation_metadata?.zernio_media_urls as string[] | undefined
  const initialImages = initialRenderedImages ?? zernioMediaUrls ?? (metadataFileIds.length > 0 ? renderUrlsFromFileIds(metadataFileIds) : undefined)
  const hasInitialImages = Boolean(initialImages?.length)
  const [showModal, setShowModal] = useState(initiallyOpen)
  const [pieza, setPieza] = useState(initialPieza)
  const [renderedImages, setRenderedImages] = useState<string[] | undefined>(initialImages)
  const [renderProgressLabel, setRenderProgressLabel] = useState('Preparando diseño')
  const [renderLoadState, setRenderLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>(hasInitialImages ? 'loaded' : 'idle')
  const [renderLoadAttempt, setRenderLoadAttempt] = useState(0)
  const [retryingRender, setRetryingRender] = useState(false)
  const [retryRenderFailed, setRetryRenderFailed] = useState(false)
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
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let latestRenderStatus = pieza.render_status

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
              latestRenderStatus = updated.render_status ?? latestRenderStatus
              setPieza(previous => ({ ...previous, ...updated }))
              onPieceChange?.(pieza.id, updated)
            },
          )
          .on('broadcast', { event: 'render-status' }, message => {
            if (!mounted) return
            const updated = message.payload as Partial<ContenidoGenerado> & {render_file_ids?: string[]; stage?: string; progress?: number}
            latestRenderStatus = updated.render_status ?? latestRenderStatus
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
            onPieceChange?.(pieza.id, updated)
          })
          .subscribe()
        unsubscribe = () => { void supabase.removeChannel(channel) }

        pollTimer = setInterval(() => {
          if (latestRenderStatus !== 'dispatching' && latestRenderStatus !== 'rendering') return
          if (isVideo) {
            void fetch(`/api/generate/video/${pieza.id}/status`, {cache: 'no-store'})
              .then(response => response.ok ? response.json() : null)
              .then((data: Partial<ContenidoGenerado> | null) => {
                if (!mounted || !data) return
                latestRenderStatus = data.render_status ?? latestRenderStatus
                setPieza(previous => ({...previous, ...data}))
                onPieceChange?.(pieza.id, data)
              })
            return
          }
          void supabase
            .from('contenido_generado')
            .select('render_status, render_folder_id, generation_metadata')
            .eq('id', pieza.id)
            .maybeSingle()
            .then(({data}) => {
              if (!mounted || !data) return
              const updated = data as Partial<ContenidoGenerado>
              latestRenderStatus = updated.render_status ?? latestRenderStatus
              setPieza(previous => ({...previous, ...updated}))
              onPieceChange?.(pieza.id, updated)
            })
        }, 5_000)
      })
    }

    return () => {
      mounted = false
      unsubscribe?.()
      if (pollTimer) clearInterval(pollTimer)
    }
  // `render_status` se sigue dentro del efecto mediante `latestRenderStatus`;
  // no debe reiniciar las suscripciones cada vez que llega progreso del render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCarrusel, isVideo, onPieceChange, pieza.id, pieza.render_folder_id])

  useEffect(() => {
    if (!isCarrusel || !pieza.render_folder_id) return
    if (hasInitialImages && renderLoadAttempt === 0) return
    let cancelled = false

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
      onPieceChange?.(pieza.id, {
        render_status: renderStatus,
        ...(folderId ? {render_folder_id: folderId} : {}),
      })

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
  }, [isCarrusel, onPieceChange, pieza.id, pieza.render_folder_id])

  function handleApproved(id: string, updates: Partial<ContenidoGenerado>) {
    setPieza({ ...pieza, ...updates })
    onPieceChange?.(id, updates)
  }

  const designReady = Boolean(pieza.render_folder_id) || pieza.render_status === 'rendered'
  const designFailed = pieza.render_status === 'failed'
  const previewLoading = Boolean(pieza.render_folder_id) && renderLoadState !== 'loaded' && renderLoadState !== 'error'
  const previewFailed = Boolean(pieza.render_folder_id) && renderLoadState === 'error'

  async function retryRender() {
    if (retryingRender) return
    setRetryingRender(true)
    setRetryRenderFailed(false)
    const endpointFormat = isVideo ? 'video' : isBanner ? 'banner' : 'carrusel'
    try {
      const response = await fetch(`/api/generate/${endpointFormat}/${pieza.id}/aprobar`, {method: 'POST'})
      if (!response.ok) throw new Error('No se pudo iniciar el reintento')
      const result = await response.json() as {status?: ContenidoGenerado['render_status']}
      const generationMetadata = {
        ...(pieza.generation_metadata ?? {}),
        video_render_error: null,
        banner_render_error: null,
        carrusel_render_error: null,
      }
      const updates: Partial<ContenidoGenerado> = {
        render_status: result.status ?? 'dispatching',
        generation_metadata: generationMetadata,
      }
      setPieza(previous => ({...previous, ...updates}))
      onPieceChange?.(pieza.id, updates)
      setRenderProgressLabel('Reintentando diseño')
    } catch (error) {
      console.error(`[CALENDARIO/REINTENTO] pieza=${pieza.id}`, error)
      setRetryRenderFailed(true)
    } finally {
      setRetryingRender(false)
    }
  }

  function handleCardClick() {
    if (designFailed) {
      void retryRender()
      return
    }
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
        className="block relative aspect-[4/5] w-full rounded-lg overflow-hidden group cursor-pointer text-left border border-[var(--linea)]"
      >
        {pieza.publication_status === 'published' && (
          <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 rounded-full bg-[var(--cardon)] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
            <CheckCircle2 className="h-3 w-3" /> Publicado
          </div>
        )}
        {(pieza.publication_status === 'scheduled' || pieza.publication_status === 'syncing') && (
          <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 rounded-full bg-[var(--tinta)] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
            <Clock3 className="h-3 w-3" /> Programado
          </div>
        )}
        {pieza.publication_status === 'failed' && (
          <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 rounded-full bg-[var(--cardon)] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm border border-red-500/30">
            <AlertCircle className="h-3 w-3" /> Error al publicar
          </div>
        )}
        {isCarrusel ? (
          <CarruselRenderer
            formatoCarrusel={pieza.formato_carrusel}
            slides={(pieza.slides_data as unknown as SlideCarrusel[]) ?? []}
            activeIndex={0}
            variant="thumbnail"
            renderedImages={renderedImages}
            onRenderedCoverLoad={() => setRenderLoadState('loaded')}
            onRenderedCoverError={() => setRenderLoadState('error')}
          />
        ) : isBanner && pieza.render_status === 'rendered' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={zernioMediaUrls?.[0] || `/api/generate/banner/${pieza.id}/imagen`}
            alt={pieza.titulo ?? 'Banner'}
            className="h-full w-full object-cover"
          />
        ) : isVideo && pieza.render_status === 'rendered' ? (
          <div className="relative h-full w-full bg-black">
            <video
              src={zernioMediaUrls?.[0] || `/api/generate/video/${pieza.id}/media`}
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
              {designFailed
                ? 'No se pudo preparar el diseño'
                : pieza.render_status === 'rendered'
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
          <div className={`absolute bottom-2 left-2 right-2 z-10 flex items-center justify-center gap-1.5 rounded-full border bg-[rgba(250,250,247,.94)] px-2.5 py-1.5 text-[10px] font-semibold shadow-sm backdrop-blur-md ${designFailed ? 'border-[var(--linea)] text-[var(--tinta)]' : 'border-[var(--linea)] text-[var(--cardon)]'}`}>
            {designFailed && !retryingRender
              ? <AlertCircle className="h-3 w-3 text-[var(--cardon)]" />
              : <LoaderCircle className="h-3 w-3 animate-spin" />}
            {designFailed
              ? retryingRender
                ? 'Reintentando diseño'
                : retryRenderFailed
                  ? 'No pudimos reintentar · tocá'
                  : 'Copy listo · tocá para reintentar'
              : `Copy listo · ${renderProgressLabel.toLocaleLowerCase('es-AR')}`}
          </div>
        )}
        {isVideo && !designReady && (pieza.render_status === 'rendering' || pieza.render_status === 'dispatching') && (
          <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-center gap-1.5 rounded-full border border-white/60 bg-[rgba(250,250,247,.94)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--cardon)] shadow-sm backdrop-blur-md">
            <LoaderCircle className="h-3 w-3 animate-spin" />
            {renderProgressLabel}
          </div>
        )}
        {(isBanner || isVideo) && designFailed && (
          <div className="absolute inset-x-2 bottom-2 z-20 rounded-lg border border-[var(--linea)] bg-[var(--blanco-piedra)]/95 px-2.5 py-2 text-left shadow-sm backdrop-blur-md">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--tinta)]">
              {retryingRender
                ? <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--cardon)]" />
                : <RefreshCw className="h-3.5 w-3.5 shrink-0 text-[var(--cardon)]" />}
              {retryingRender ? 'Reintentando diseño' : 'No pudimos preparar esta pieza'}
            </span>
            {!retryingRender && (
              <span className="mt-1 block text-[9px] leading-snug text-[var(--piedra)]">
                {retryRenderFailed ? 'No se pudo iniciar. Tocá para probar otra vez.' : 'Tocá la pieza para reintentar.'}
              </span>
            )}
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
        <p className="text-[12px] font-semibold truncate text-[var(--tinta)]">
          {pieceLabel}
        </p>
        <p className="text-[11px] truncate opacity-80 text-[var(--cardon)]">
          {salidaNombre}
        </p>
      </div>

      {showModal && isCarrusel && (
        <CarruselDrilldownModal
          item={pieza}
          salidaNombre={salidaNombre}
          renderedImages={renderedImages && renderedImages.length > 0 ? renderedImages : undefined}
          onPieceChange={(updatedPiece: ContenidoGenerado) => {
            setPieza(updatedPiece)
            onPieceChange?.(updatedPiece.id, updatedPiece)
          }}
          onClose={() => setShowModal(false)}
        />
      )}
      {showModal && !isCarrusel && (
        <SocialPostPreviewModal
          item={pieza}
          profileName={salidaNombre}
          onClose={() => setShowModal(false)}
          onPieceChange={(updatedPiece) => {
            setPieza(updatedPiece)
            onPieceChange?.(updatedPiece.id, updatedPiece)
          }}
        />
      )}
    </div>
  )
}
