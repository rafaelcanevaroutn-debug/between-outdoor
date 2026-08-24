'use client'

import { useState } from 'react'

interface ExternalPhoto {
  id: number
  pageUrl: string
  previewUrl: string
  photographer: string
  photographerUrl: string
  alt: string
}

export default function ExternalImageSearch({ parentId, salidaId, onImported }: { parentId: string; salidaId?: string; onImported: () => void }) {
  const [query, setQuery] = useState('')
  const [photos, setPhotos] = useState<ExternalPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function search() {
    if (query.trim().length < 2) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/fotos/externas?q=${encodeURIComponent(query.trim())}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo buscar')
      const found = result.photos ?? []
      setPhotos(found)
      setMessage(found.length > 0
        ? `Encontramos ${found.length} fotos. Elegí una para importarla a esta carpeta.`
        : 'No encontramos fotos para esa búsqueda. Probá con "Fitz Roy Patagonia" o "El Chaltén".')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo buscar')
    } finally {
      setLoading(false)
    }
  }

  async function importPhoto(photo: ExternalPhoto) {
    setImporting(photo.id)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/fotos/externas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photo.id, parentId, salidaId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo importar')
      setMessage(`✓ Foto de ${photo.photographer} importada a esta carpeta con su atribución.`)
      onImported()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo importar')
    } finally {
      setImporting(null)
    }
  }

  return (
    <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: '#0C120D', border: '1px solid rgba(52,209,126,.2)' }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: '0 0 4px', color: '#EAF2EC', fontSize: 14, fontWeight: 700 }}>Banco externo · Pexels</p>
        <p style={{ margin: 0, color: '#6B8F71', fontSize: 12 }}>Buscá una imagen licenciada e importala a la carpeta actual. Guardamos autor, enlace y licencia junto al archivo.</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === 'Enter' && search()} placeholder="Ej: Laguna de los Tres Patagonia" style={{ flex: 1, padding: '9px 11px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: '#080D09', color: '#EAF2EC', outline: 'none' }} />
        <button type="button" onClick={search} disabled={loading || query.trim().length < 2} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(52,209,126,.3)', background: 'rgba(52,209,126,.12)', color: '#34D17E', fontWeight: 700, opacity: loading ? .5 : 1 }}>{loading ? 'Buscando…' : 'Buscar'}</button>
      </div>
      {error && <p style={{ color: '#FCA5A5', fontSize: 12, margin: '10px 0 0' }}>{error}</p>}
      {message && <p role="status" style={{ color: '#34D17E', fontSize: 12, margin: '10px 0 0' }}>{message}</p>}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}>
          {photos.map(photo => (
            <article key={photo.id} style={{ overflow: 'hidden', borderRadius: 10, background: '#080D09', border: '1px solid rgba(255,255,255,.08)' }}>
              {/* URL dinámica del proveedor; se muestra sin proxy para respetar su CDN. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt={photo.alt || `Foto de ${photo.photographer}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block', background: '#111A11' }}
              />
              <div style={{ padding: 9 }}>
                <a href={photo.photographerUrl} target="_blank" rel="noreferrer" style={{ display: 'block', color: '#A3D4AE', fontSize: 11, marginBottom: 3 }}>Foto: {photo.photographer}</a>
                <a href={photo.pageUrl} target="_blank" rel="noreferrer" style={{ display: 'block', color: '#4A6B4A', fontSize: 10, marginBottom: 8 }}>Ver en Pexels</a>
                <button type="button" onClick={() => importPhoto(photo)} disabled={importing !== null} style={{ width: '100%', padding: '7px 8px', borderRadius: 7, border: '1px solid rgba(52,209,126,.25)', background: 'rgba(52,209,126,.1)', color: '#34D17E', fontSize: 11, fontWeight: 700 }}>{importing === photo.id ? 'Importando…' : 'Importar a la carpeta'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p style={{ margin: '12px 0 0', color: '#4A6B4A', fontSize: 10 }}>Fotos provistas por <a href="https://www.pexels.com" target="_blank" rel="noreferrer" style={{ color: '#6B8F71' }}>Pexels</a>. Revisá que la imagen corresponda realmente al lugar antes de usarla.</p>
    </div>
  )
}
