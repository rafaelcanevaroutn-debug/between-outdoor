'use client'

import {useEffect, useRef, useState} from 'react'
import {Bookmark, Heart, LoaderCircle, MessageCircle, Play, Send, Volume2, VolumeX, X} from 'lucide-react'
import type {ContenidoGenerado} from '@/types'
import SocialPublishingControls from '@/components/contenido/SocialPublishingControls'

interface SocialPostPreviewModalProps {
  item: ContenidoGenerado
  profileName?: string
  onClose: () => void
}

function postCaption(item: ContenidoGenerado): string {
  return [
    item.titulo,
    item.subtitulo,
    ...(item.bullets ?? []),
    item.cta,
    item.descripcion_post,
  ].filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).join('\n\n')
}

export default function SocialPostPreviewModal({item, profileName, onClose}: SocialPostPreviewModalProps) {
  const isVideo = item.formato === 'video'
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoPaused, setVideoPaused] = useState(false)
  const [videoMuted, setVideoMuted] = useState(true)
  const [videoBuffering, setVideoBuffering] = useState(isVideo)
  const [videoLoadProgress, setVideoLoadProgress] = useState<number | null>(null)
  const [videoLoadError, setVideoLoadError] = useState(false)
  const accountName = profileName?.trim() || 'between_outdoor'
  const caption = postCaption(item) || 'Contenido listo para publicar.'

  function updateVideoProgress(video: HTMLVideoElement) {
    if (!Number.isFinite(video.duration) || video.duration <= 0 || video.buffered.length === 0) {
      setVideoLoadProgress(null)
      return
    }
    const bufferedUntil = video.buffered.end(video.buffered.length - 1)
    setVideoLoadProgress(Math.min(100, Math.max(0, Math.round((bufferedUntil / video.duration) * 100))))
  }

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function toggleVideoSound() {
    const video = videoRef.current
    if (!video) return
    const nextMuted = !videoMuted
    video.muted = nextMuted
    setVideoMuted(nextMuted)
    if (!nextMuted && video.paused) {
      void video.play().catch(() => undefined)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{backgroundColor: 'rgba(5,8,5,0.9)'}}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-50 text-white/70 transition-colors hover:text-white md:right-6 md:top-6"
        aria-label="Cerrar"
      >
        <X className="h-8 w-8 md:h-10 md:w-10" />
      </button>

      <div
        className="relative flex max-h-[92vh] w-full max-w-[450px] flex-col overflow-hidden rounded-[4px] shadow-2xl md:max-w-[850px] md:flex-row"
        style={{backgroundColor: 'var(--nieve)'}}
        onClick={event => event.stopPropagation()}
      >
        <div className="relative flex w-full shrink-0 items-center justify-center bg-black md:w-[450px]">
          {isVideo ? (
            <div className="relative w-full">
              <video
                ref={videoRef}
                src={`/api/generate/video/${item.id}/media?full=1`}
                autoPlay
                muted={videoMuted}
                loop
                playsInline
                preload="auto"
                disablePictureInPicture
                controlsList="nodownload noplaybackrate noremoteplayback"
                onLoadStart={() => {
                  setVideoBuffering(true)
                  setVideoLoadError(false)
                  setVideoLoadProgress(null)
                }}
                onProgress={event => updateVideoProgress(event.currentTarget)}
                onLoadedMetadata={event => updateVideoProgress(event.currentTarget)}
                onCanPlay={event => {
                  updateVideoProgress(event.currentTarget)
                  if (event.currentTarget.currentTime === 0) {
                    void event.currentTarget.play().catch(() => undefined)
                  }
                }}
                onPlaying={() => {
                  setVideoPaused(false)
                  setVideoBuffering(false)
                }}
                onWaiting={event => {
                  updateVideoProgress(event.currentTarget)
                  setVideoBuffering(true)
                }}
                onError={() => {
                  setVideoBuffering(false)
                  setVideoLoadError(true)
                }}
                onPause={() => setVideoPaused(true)}
                onClick={event => {
                  if (event.currentTarget.paused) {
                    // Cerrar el modal o cambiar de pieza cancela play() con
                    // AbortError. Es una cancelación normal del navegador.
                    void event.currentTarget.play().catch(() => undefined)
                  } else {
                    event.currentTarget.pause()
                  }
                }}
                className="max-h-[86vh] w-full cursor-pointer bg-black object-contain md:h-[min(80vh,700px)]"
              >
                Tu navegador no puede reproducir este video.
              </video>
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation()
                  toggleVideoSound()
                }}
                className="absolute bottom-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-md transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={videoMuted ? 'Activar sonido' : 'Silenciar video'}
                title={videoMuted ? 'Activar sonido' : 'Silenciar video'}
              >
                {videoMuted
                  ? <VolumeX className="h-5 w-5" aria-hidden="true" />
                  : <Volume2 className="h-5 w-5" aria-hidden="true" />}
              </button>
              {videoBuffering && !videoLoadError && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
                  <div className="flex min-w-[150px] flex-col items-center rounded-2xl bg-black/55 px-5 py-4 text-white shadow-xl backdrop-blur-md">
                    <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
                    <span className="mt-2 text-[13px] font-semibold">
                      {videoLoadProgress === null ? 'Cargando video…' : `Cargando video · ${videoLoadProgress}%`}
                    </span>
                    {videoLoadProgress !== null && (
                      <span className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/20">
                        <span className="block h-full rounded-full bg-white transition-[width] duration-300" style={{width: `${videoLoadProgress}%`}} />
                      </span>
                    )}
                  </div>
                </div>
              )}
              {videoLoadError && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 px-6 text-center text-[13px] font-semibold text-white">
                  No pudimos cargar el video. Cerrá la vista e intentá nuevamente.
                </div>
              )}
              {videoPaused && !videoBuffering && !videoLoadError && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-sm">
                    <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
                  </span>
                </div>
              )}
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/generate/banner/${item.id}/imagen`}
              alt={item.titulo || 'Banner listo para Instagram'}
              className="aspect-[4/5] w-full object-contain"
            />
          )}
        </div>

        <div
          className="flex min-h-[260px] w-full flex-col border-t md:min-h-[450px] md:w-[400px] md:border-l md:border-t-0"
          style={{backgroundColor: 'var(--nieve)', borderColor: 'var(--linea)', color: 'var(--tinta)'}}
        >
          <div className="flex items-center gap-3 border-b p-4" style={{borderColor: 'var(--linea)'}}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{backgroundColor: 'var(--tinta)'}}>
              <span className="text-[10px] font-bold" style={{color: 'var(--nieve)'}}>BO</span>
            </div>
            <span className="text-[14px] font-semibold leading-none">{accountName}</span>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto whitespace-pre-wrap p-4 text-[14px] leading-relaxed">
            <span className="mr-2 font-semibold">{accountName}</span>
            {caption}
          </div>

          <div className="border-t p-4" style={{borderColor: 'var(--linea)'}}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Heart className="h-6 w-6" />
                <MessageCircle className="h-6 w-6" />
                <Send className="h-6 w-6" />
              </div>
              <Bookmark className="h-6 w-6" />
            </div>
            <p className="text-[11px] uppercase tracking-wide" style={{color: 'var(--piedra)'}}>Vista previa de publicación</p>
          </div>
          <SocialPublishingControls contenidoId={item.id} ready={item.render_status === 'rendered' && Boolean(item.render_folder_id)} />
        </div>
      </div>
    </div>
  )
}
