'use client'

import { useState, useEffect, useRef } from 'react'
import { ImageIcon, Loader2, RefreshCw, ChevronRight } from 'lucide-react'
import SlideModal from './SlideModal'

interface RenderCarpeta {
  folderId:    string
  name:        string
  firstFileId: string | null
}

interface Slide {
  fileId: string
  name:   string
}

interface ModalState {
  folderId:     string
  carruselName: string
  slides:       Slide[]
}

interface Props {
  batchPiezaIds?: string[]
}

const POLL_INTERVAL = 8000

export default function RendersSection({ batchPiezaIds }: Props) {
  const isBatchMode = batchPiezaIds && batchPiezaIds.length > 0

  const [carpetas, setCarpetas]         = useState<RenderCarpeta[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [modal, setModal]               = useState<ModalState | null>(null)
  const [loadingModal, setLoadingModal] = useState<string | null>(null)
  const [pending, setPending]           = useState(0)
  const [timedOut, setTimedOut]         = useState(0)
  const [showAll, setShowAll]           = useState(false)
  const pollRef                         = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  async function fetchBatch() {
    if (!batchPiezaIds || batchPiezaIds.length === 0) return
    try {
      const res  = await fetch(`/api/renders/batch?piezaIds=${batchPiezaIds.join(',')}`)
      const data = await res.json() as { ready?: RenderCarpeta[]; pending?: number; timedOut?: number; error?: string }
      if (data.error) { setError(data.error); stopPolling(); return }
      setCarpetas(data.ready ?? [])
      setPending(data.pending ?? 0)
      setTimedOut(data.timedOut ?? 0)
      // Para el polling cuando no quedan piezas dentro del plazo de espera.
      // Las piezas expiradas (timedOut) no van a llegar nunca — no tiene sentido seguir.
      if ((data.pending ?? 0) === 0) stopPolling()
    } catch {
      setError('Error al cargar renders de la tanda')
      stopPolling()
    } finally {
      setLoading(false)
    }
  }

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/renders/carpetas')
      const data = await res.json() as { carpetas?: RenderCarpeta[]; error?: string }
      if (data.error && !data.carpetas) { setError(data.error); return }
      setCarpetas(data.carpetas ?? [])
    } catch {
      setError('Error al cargar carruseles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isBatchMode && !showAll) {
      fetchBatch()
      pollRef.current = setInterval(fetchBatch, POLL_INTERVAL)
      return () => stopPolling()
    } else {
      stopPolling()
      fetchAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll])

  async function openModal(c: RenderCarpeta) {
    setLoadingModal(c.folderId)
    try {
      const res  = await fetch(`/api/renders/${c.folderId}/slides`)
      const data = await res.json() as { slides: Slide[] }
      setModal({ folderId: c.folderId, carruselName: c.name, slides: data.slides ?? [] })
    } finally {
      setLoadingModal(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin mr-3" style={{ color: '#34D17E' }} />
        <p className="text-sm" style={{ color: '#6B8F71' }}>
          {isBatchMode && !showAll ? 'Buscando renders de esta tanda...' : 'Cargando carruseles desde Drive...'}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
      </div>
    )
  }

  const isActiveBatch = isBatchMode && !showAll

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" style={{ color: '#34D17E' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>
              {isActiveBatch ? 'Carruseles de esta tanda' : 'Carruseles renderizados'}
            </h3>
            {carpetas.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(52,209,126,0.1)', color: '#34D17E' }}>
                {carpetas.length}
              </span>
            )}
            {isActiveBatch && pending > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: '#FBB024' }}>
                <Loader2 className="w-3 h-3 animate-spin" />
                {pending} procesando
              </span>
            )}
            {isActiveBatch && timedOut > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                {timedOut} no disponible{timedOut > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isActiveBatch ? (
              <button
                onClick={() => setShowAll(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: '#6B8F71', border: '1px solid #1E2D1E', backgroundColor: '#0A0F0A' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F0FFF4' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B8F71' }}
              >
                Ver todos
                <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={fetchAll}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: '#6B8F71', border: '1px solid #1E2D1E', backgroundColor: '#0A0F0A' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F0FFF4' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B8F71' }}
              >
                <RefreshCw className="w-3 h-3" />
                Actualizar
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {carpetas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {isActiveBatch && pending > 0 ? (
              <>
                <Loader2 className="w-10 h-10 mb-3 animate-spin" style={{ color: '#1E2D1E' }} />
                <p className="text-sm font-semibold mb-1" style={{ color: '#F0FFF4' }}>Mati está renderizando</p>
                <p className="text-xs" style={{ color: '#6B8F71' }}>
                  {pending} {pending === 1 ? 'carrusel en proceso' : 'carruseles en proceso'} — esta vista se actualiza sola.
                </p>
              </>
            ) : isActiveBatch && timedOut > 0 ? (
              <>
                <ImageIcon className="w-12 h-12 mb-4" style={{ color: '#1E2D1E' }} />
                <p className="text-base font-semibold mb-2" style={{ color: '#F0FFF4' }}>Renders no disponibles</p>
                <p className="text-sm" style={{ color: '#6B8F71' }}>
                  {timedOut === 1 ? 'El carrusel tardó demasiado' : `${timedOut} carruseles tardaron demasiado`} — puede que Mati esté ocupado. Revisá más tarde en &quot;Ver todos&quot;.
                </p>
              </>
            ) : (
              <>
                <ImageIcon className="w-12 h-12 mb-4" style={{ color: '#1E2D1E' }} />
                <p className="text-base font-semibold mb-2" style={{ color: '#F0FFF4' }}>Sin carruseles todavía</p>
                <p className="text-sm" style={{ color: '#6B8F71' }}>
                  {isActiveBatch
                    ? 'Ningún carrusel de esta tanda fue renderizado aún.'
                    : 'Generá contenido en una salida y Mati va a renderizar los carruseles automáticamente.'}
                </p>
              </>
            )}
          </div>
        )}

        {/* Grid */}
        {carpetas.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {carpetas.map(c => {
              const isOpen = loadingModal === c.folderId
              return (
                <button
                  key={c.folderId}
                  onClick={() => openModal(c)}
                  disabled={isOpen}
                  className="flex flex-col rounded-xl overflow-hidden text-left transition-all group"
                  style={{ border: '1px solid #1E2D1E', backgroundColor: '#111A11', cursor: isOpen ? 'wait' : 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#34D17E' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2D1E' }}
                >
                  <div className="relative w-full flex items-center justify-center" style={{ aspectRatio: '1 / 1', backgroundColor: '#0A0F0A' }}>
                    {c.firstFileId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/fotos/thumbnail/${c.firstFileId}`}
                        alt={c.name}
                        className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8" style={{ color: '#1E2D1E' }} />
                    )}
                    {isOpen && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(10,15,10,0.7)' }}>
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#34D17E' }} />
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: '#C8DDD0' }}>
                      {c.name}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {modal && (
        <SlideModal
          folderId={modal.folderId}
          carruselName={modal.carruselName}
          initialSlides={modal.slides}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
