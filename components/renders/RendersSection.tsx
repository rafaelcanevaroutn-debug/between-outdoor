'use client'

import { useState, useEffect } from 'react'
import { ImageIcon, Loader2, RefreshCw } from 'lucide-react'
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

export default function RendersSection() {
  const [carpetas, setCarpetas]         = useState<RenderCarpeta[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [modal, setModal]               = useState<ModalState | null>(null)
  const [loadingModal, setLoadingModal] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/renders/carpetas')
      .then(r => r.json())
      .then((data: { carpetas?: RenderCarpeta[]; error?: string }) => {
        if (data.error && !data.carpetas) { setError(data.error); return }
        setCarpetas(data.carpetas ?? [])
      })
      .catch(() => setError('Error al cargar carruseles'))
      .finally(() => setLoading(false))
  }, [])

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
        <p className="text-sm" style={{ color: '#6B8F71' }}>Cargando carruseles desde Drive...</p>
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

  if (carpetas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ImageIcon className="w-12 h-12 mb-4" style={{ color: '#1E2D1E' }} />
        <p className="text-base font-semibold mb-2" style={{ color: '#F0FFF4' }}>Sin carruseles todavía</p>
        <p className="text-sm" style={{ color: '#6B8F71' }}>
          Generá contenido en una salida y Mati va a renderizar los carruseles automáticamente.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" style={{ color: '#34D17E' }} />
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>
              Carruseles renderizados
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(52,209,126,0.1)', color: '#34D17E' }}>
              {carpetas.length}
            </span>
          </div>
          <button
            onClick={() => { setLoading(true); setError(null); fetch('/api/renders/carpetas').then(r => r.json()).then((d: { carpetas?: RenderCarpeta[] }) => setCarpetas(d.carpetas ?? [])).finally(() => setLoading(false)) }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#6B8F71', border: '1px solid #1E2D1E', backgroundColor: '#0A0F0A' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F0FFF4' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6B8F71' }}
          >
            <RefreshCw className="w-3 h-3" />
            Actualizar
          </button>
        </div>

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
                {/* Thumbnail */}
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

                {/* Nombre */}
                <div className="px-3 py-2.5">
                  <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: '#C8DDD0' }}>
                    {c.name}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
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
