'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Download, Package } from 'lucide-react'

interface Slide {
  fileId: string
  name:   string
}

interface SlideModalProps {
  folderId:      string
  carruselName:  string
  initialSlides: Slide[]
  onClose:       () => void
}

export default function SlideModal({ folderId, carruselName, initialSlides, onClose }: SlideModalProps) {
  const [slides]       = useState<Slide[]>(initialSlides)
  const [current, setCurrent] = useState(0)
  const [zipping, setZipping] = useState(false)

  const prev = useCallback(() => setCurrent(i => (i - 1 + slides.length) % slides.length), [slides.length])
  const next = useCallback(() => setCurrent(i => (i + 1) % slides.length), [slides.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, onClose])

  const slide = slides[current]

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Revocar después de un tick para que el browser inicie la descarga
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  async function downloadSlide() {
    const res = await fetch(`/api/renders/slide/${slide.fileId}?filename=${encodeURIComponent(slide.name)}`)
    const blob = await res.blob()
    triggerDownload(blob, slide.name)
  }

  async function downloadZip() {
    setZipping(true)
    try {
      const res  = await fetch(`/api/renders/${folderId}/zip`)
      const blob = await res.blob()
      triggerDownload(blob, `${carruselName}.zip`)
    } finally {
      setZipping(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden w-full max-w-2xl"
        style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #1E2D1E' }}>
          <div>
            <p className="text-sm font-semibold truncate max-w-[320px]" style={{ color: '#F0FFF4' }}>
              {carruselName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#6B8F71' }}>
              Slide {current + 1} de {slides.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadSlide}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: '#0A0F0A', border: '1px solid #1E2D1E', color: '#F0FFF4' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#34D17E'; e.currentTarget.style.color = '#34D17E' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2D1E'; e.currentTarget.style.color = '#F0FFF4' }}
              title="Descargar este slide"
            >
              <Download className="w-3.5 h-3.5" />
              Slide
            </button>
            <button
              onClick={downloadZip}
              disabled={zipping}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: '#0A0F0A', border: '1px solid #1E2D1E', color: zipping ? '#4A6B4A' : '#F0FFF4', cursor: zipping ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!zipping) { e.currentTarget.style.borderColor = '#34D17E'; e.currentTarget.style.color = '#34D17E' } }}
              onMouseLeave={e => { if (!zipping) { e.currentTarget.style.borderColor = '#1E2D1E'; e.currentTarget.style.color = '#F0FFF4' } }}
              title="Descargar todos los slides como ZIP"
            >
              <Package className="w-3.5 h-3.5" />
              {zipping ? 'Generando...' : 'ZIP'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: '#6B8F71' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F0FFF4' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#6B8F71' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Imagen principal */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden" style={{ minHeight: 0, backgroundColor: '#0A0F0A' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={slide.fileId}
            src={`/api/fotos/thumbnail/${slide.fileId}`}
            alt={slide.name}
            className="max-w-full max-h-full object-contain"
            style={{ maxHeight: 'calc(90vh - 130px)' }}
          />

          {/* Flechas de navegación */}
          {slides.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: 'rgba(17,26,17,0.85)', border: '1px solid #1E2D1E', color: '#6B8F71' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F0FFF4'; e.currentTarget.style.borderColor = '#34D17E' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B8F71'; e.currentTarget.style.borderColor = '#1E2D1E' }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: 'rgba(17,26,17,0.85)', border: '1px solid #1E2D1E', color: '#6B8F71' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F0FFF4'; e.currentTarget.style.borderColor = '#34D17E' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6B8F71'; e.currentTarget.style.borderColor = '#1E2D1E' }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Tira de miniaturas */}
        {slides.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto shrink-0" style={{ borderTop: '1px solid #1E2D1E' }}>
            {slides.map((s, i) => (
              <button
                key={s.fileId}
                onClick={() => setCurrent(i)}
                className="shrink-0 rounded overflow-hidden transition-all"
                style={{
                  width: 52, height: 52,
                  border: i === current ? '2px solid #34D17E' : '2px solid transparent',
                  opacity: i === current ? 1 : 0.5,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/fotos/thumbnail/${s.fileId}`}
                  alt={s.name}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
