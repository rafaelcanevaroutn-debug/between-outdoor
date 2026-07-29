'use client'

import { useState, useEffect, useRef } from 'react'
import { ImageIcon, Loader2, RefreshCw, ChevronRight, Trash2 } from 'lucide-react'
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
  allPiezaIds?:   string[]   // IDs de TODAS las piezas carrusel de esta salida
}

const POLL_INTERVAL = 8000

export default function RendersSection({ batchPiezaIds, allPiezaIds }: Props) {
  const isBatchMode  = batchPiezaIds && batchPiezaIds.length > 0
  const hasAllPiezas = allPiezaIds && allPiezaIds.length > 0

  const [carpetas, setCarpetas]         = useState<RenderCarpeta[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [modal, setModal]               = useState<ModalState | null>(null)
  const [loadingModal, setLoadingModal] = useState<string | null>(null)
  const [pending, setPending]           = useState(0)
  const [timedOut, setTimedOut]         = useState(0)
  const [showAll, setShowAll]           = useState(false)
  
  // Pagination & Delete state
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [loadingMore, setLoadingMore]     = useState(false)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  
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

  async function fetchAll(token?: string) {
    if (token) setLoadingMore(true)
    else { setLoading(true); setError(null) }

    try {
      if (hasAllPiezas) {
        // Filtrado por salida: usa batch con los IDs de todas las piezas carrusel de esta salida
        const res  = await fetch(`/api/renders/batch?piezaIds=${allPiezaIds!.join(',')}`)
        const data = await res.json() as { ready?: RenderCarpeta[]; error?: string }
        if (data.error) { setError(data.error); return }
        setCarpetas(data.ready ?? [])
        setNextPageToken(null)
      } else {
        // Fallback: fetch completo del Drive (cuando no hay contexto de salida)
        const url = token ? `/api/renders/carpetas?pageToken=${token}` : '/api/renders/carpetas'
        const res  = await fetch(url)
        const data = await res.json() as { carpetas?: RenderCarpeta[]; nextPageToken?: string | null; error?: string }
        if (data.error && !data.carpetas) { setError(data.error); return }
        
        if (token) {
          setCarpetas(prev => [...prev, ...(data.carpetas ?? [])])
        } else {
          setCarpetas(data.carpetas ?? [])
        }
        setNextPageToken(data.nextPageToken ?? null)
      }
    } catch {
      setError(token ? 'Error al cargar más carruseles' : 'Error al cargar carruseles')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  async function handleDelete(e: React.MouseEvent, folderId: string, name: string) {
    e.stopPropagation()
    if (!window.confirm(`¿Seguro que querés borrar el carrusel "${name}" de Drive?`)) return
    
    setDeletingId(folderId)
    try {
      const res = await fetch(`/api/renders/${folderId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setCarpetas(prev => prev.filter(c => c.folderId !== folderId))
    } catch (err: any) {
      alert(err.message || 'Error al borrar el carrusel')
    } finally {
      setDeletingId(null)
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
              {isActiveBatch ? 'Carruseles de esta tanda' : 'Todos los renders de esta salida'}
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
                onClick={() => fetchAll()}
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
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {carpetas.map(c => {
                const isOpen = loadingModal === c.folderId
                const isDeleting = deletingId === c.folderId
                return (
                  <button
                    key={c.folderId}
                    onClick={() => openModal(c)}
                    disabled={isOpen || isDeleting}
                    className="relative flex flex-col rounded-xl overflow-hidden text-left transition-all group"
                    style={{ border: '1px solid #1E2D1E', backgroundColor: '#111A11', cursor: isOpen || isDeleting ? 'wait' : 'pointer', opacity: isDeleting ? 0.5 : 1 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#34D17E' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2D1E' }}
                  >
                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div
                        role="button"
                        onClick={(e) => handleDelete(e, c.folderId, c.name)}
                        className="p-1.5 rounded-full bg-black/50 hover:bg-red-500/80 text-white backdrop-blur-sm transition-colors"
                        title="Borrar de Drive"
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </div>
                    </div>
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

            {!isActiveBatch && nextPageToken && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => fetchAll(nextPageToken)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 text-sm px-6 py-2.5 rounded-xl transition-all font-medium"
                  style={{ color: '#0A0F0A', backgroundColor: '#34D17E', opacity: loadingMore ? 0.7 : 1 }}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#0A0F0A' }} />
                      Cargando...
                    </>
                  ) : (
                    'Cargar más renders'
                  )}
                </button>
              </div>
            )}
          </>
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
