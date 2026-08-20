'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ExternalImageSearch from '@/components/fotos/ExternalImageSearch'

interface Folder { id: string; name: string }
interface Media  { id: string; name: string; mimeType: string; thumbnailLink?: string | null; webViewLink?: string | null }
interface BreadcrumbEntry { id: string; name: string }

interface Props {
  rootFolderId: string
  type?: 'fotos' | 'videos'
}

export default function FotosGallery({ rootFolderId, type = 'fotos' }: Props) {
  const [breadcrumb,  setBreadcrumb]  = useState<BreadcrumbEntry[]>([{ id: rootFolderId, name: type === 'videos' ? 'Videos' : 'Banco de Imágenes' }])
  const [folders,     setFolders]     = useState<Folder[]>([])
  const [media,       setMedia]       = useState<Media[]>([])
  const [nextToken,   setNextToken]   = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const [previewItem, setPreviewItem] = useState<Media | null>(null)

  // Nueva carpeta
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading,   setUploading]   = useState(false)
  const [uploadMsg,   setUploadMsg]   = useState<string | null>(null)

  // Eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Path copiado
  const [copied, setCopied] = useState(false)
  const [showExternalSearch, setShowExternalSearch] = useState(false)

  const currentFolderId = breadcrumb[breadcrumb.length - 1].id

  // Ruta relativa para Mati: todo menos la entrada raíz
  const matiPath = breadcrumb.slice(1).map(e => e.name).join('/')

  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true)
    setError(null)
    setMedia([])
    setNextToken(null)

    try {
      const [foldersRes, mediaRes] = await Promise.all([
        fetch(`/api/fotos/carpetas?folderId=${folderId}`).then(r => r.json()),
        fetch(`/api/fotos/archivos?folderId=${folderId}`).then(r => r.json()),
      ])
      if (foldersRes.error) throw new Error(foldersRes.error)
      if (mediaRes.error)   throw new Error(mediaRes.error)

      setFolders(foldersRes.folders ?? [])
      setMedia(mediaRes.images       ?? [])
      setNextToken(mediaRes.nextPageToken ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar carpeta')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // La carga es el efecto que sincroniza la navegación de Drive con la galería.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFolder(currentFolderId)
  }, [currentFolderId, loadFolder])

  async function loadMore() {
    if (!nextToken || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/fotos/archivos?folderId=${currentFolderId}&pageToken=${nextToken}`).then(r => r.json())
      if (res.error) throw new Error(res.error)
      setMedia(prev => [...prev, ...(res.images ?? [])])
      setNextToken(res.nextPageToken ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar más')
    } finally {
      setLoadingMore(false)
    }
  }

  function navigateInto(folder: Folder) {
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }])
    setShowNewFolder(false)
  }

  function navigateTo(index: number) {
    setBreadcrumb(prev => prev.slice(0, index + 1))
    setShowNewFolder(false)
  }

  // ── Crear carpeta ────────────────────────────────────────────────────────────
  async function handleCreateFolder() {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      const res = await fetch('/api/fotos/carpetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: currentFolderId, name: newFolderName.trim() }),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error)

      setFolders(prev => [...prev, res.folder].sort((a, b) => a.name.localeCompare(b.name)))
      setNewFolderName('')
      setShowNewFolder(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear carpeta')
    } finally {
      setCreatingFolder(false)
    }
  }

  // ── Eliminar carpeta ─────────────────────────────────────────────────────────
  async function handleDeleteFolder(folder: Folder) {
    if (!confirm(`¿Eliminar la carpeta "${folder.name}" y todo su contenido?`)) return
    setDeletingId(folder.id)
    try {
      const res = await fetch(`/api/fotos/carpetas?folderId=${folder.id}`, { method: 'DELETE' }).then(r => r.json())
      if (res.error) throw new Error(res.error)
      setFolders(prev => prev.filter(f => f.id !== folder.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar carpeta')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Subir archivos (uno por request para evitar límites de body) ─────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setUploading(true)
    setError(null)

    const uploaded: string[] = []
    const failed:   string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadMsg(`Subiendo ${i + 1}/${files.length}: ${file.name}`)
      try {
        const params = new URLSearchParams({ parentId: currentFolderId, filename: file.name })
        const res = await fetch(`/api/fotos/upload?${params}`, {
          method: 'POST',
          headers: { 'x-mime-type': file.type || 'application/octet-stream' },
          body: file,
        }).then(r => r.json())
        if (res.error) throw new Error(res.error)
        if (res.errors?.length) throw new Error(res.errors[0].error)
        uploaded.push(file.name)
      } catch (err) {
        failed.push(file.name)
        console.error(`[UPLOAD] Error subiendo ${file.name}:`, err)
      }
    }

    if (failed.length > 0) {
      setError(`No se pudieron subir: ${failed.join(', ')}`)
    }

    if (uploaded.length > 0) {
      setUploadMsg(`✓ ${uploaded.length} archivo${uploaded.length > 1 ? 's' : ''} subido${uploaded.length > 1 ? 's' : ''}`)
      const mediaRes = await fetch(`/api/fotos/archivos?folderId=${currentFolderId}`).then(r => r.json())
      setMedia(mediaRes.images ?? [])
      setNextToken(mediaRes.nextPageToken ?? null)
      setTimeout(() => setUploadMsg(null), 3000)
    } else {
      setUploadMsg(null)
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Eliminar archivo ─────────────────────────────────────────────────────────
  async function handleDeleteFile(file: Media) {
    if (!confirm(`¿Eliminar "${file.name}"?`)) return
    setDeletingId(file.id)
    try {
      const res = await fetch(`/api/fotos/archivos?fileId=${file.id}`, { method: 'DELETE' }).then(r => r.json())
      if (res.error) throw new Error(res.error)
      setMedia(prev => prev.filter(m => m.id !== file.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar archivo')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Copiar path ──────────────────────────────────────────────────────────────
  async function copyMatiPath() {
    await navigator.clipboard.writeText(matiPath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Estilos base ─────────────────────────────────────────────────────────────
  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 13px', borderRadius: 8, cursor: 'pointer',
    fontSize: 12.5, fontWeight: 500, border: '1px solid rgba(255,255,255,.08)',
    background: '#0C120D', color: '#C8DDD0', transition: 'border-color .12s',
  }

  const iconBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
    background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.08)',
    color: '#7E9286', flexShrink: 0,
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {breadcrumb.map((crumb, i) => {
          const isLast = i === breadcrumb.length - 1
          return (
            <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span style={{ color: '#4A6B4A', fontSize: 13 }}>/</span>}
              <button
                onClick={() => !isLast && navigateTo(i)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 13, fontWeight: isLast ? 600 : 400,
                  color: isLast ? '#EAF2EC' : '#7E9286',
                  cursor: isLast ? 'default' : 'pointer',
                  textDecoration: isLast ? 'none' : 'underline',
                }}
              >
                {crumb.name}
              </button>
            </span>
          )
        })}
      </div>



      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setShowNewFolder(v => !v); setNewFolderName('') }}
          style={{ ...btnBase, borderColor: showNewFolder ? 'rgba(52,209,126,.4)' : 'rgba(255,255,255,.08)' }}
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 4v12M4 10h12" />
          </svg>
          Nueva carpeta
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ ...btnBase, opacity: uploading ? .5 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 13V4M6 8l4-4 4 4M3 16h14" />
          </svg>
          {uploading ? 'Subiendo...' : 'Subir fotos / videos'}
        </button>

        {type === 'fotos' && (
          <button
            type="button"
            onClick={() => setShowExternalSearch(value => !value)}
            style={{ ...btnBase, borderColor: showExternalSearch ? 'rgba(52,209,126,.4)' : 'rgba(255,255,255,.08)', color: showExternalSearch ? '#34D17E' : '#C8DDD0' }}
          >
            {showExternalSearch ? 'Cerrar banco externo' : 'Buscar fotos externas'}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={handleUpload}
        />

        {uploadMsg && (
          <span style={{ fontSize: 12.5, color: '#34D17E' }}>{uploadMsg}</span>
        )}
      </div>

      {showExternalSearch && <ExternalImageSearch parentId={currentFolderId} onImported={() => loadFolder(currentFolderId)} />}

      {/* Input nueva carpeta */}
      {showNewFolder && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 20, padding: '12px 14px', borderRadius: 10,
          background: '#0C120D', border: '1px solid rgba(255,255,255,.1)',
        }}>
          <input
            autoFocus
            type="text"
            placeholder="Nombre de la carpeta (ej: Tilcara)"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 13, color: '#EAF2EC', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleCreateFolder}
            disabled={creatingFolder || !newFolderName.trim()}
            style={{
              ...btnBase,
              background: 'rgba(52,209,126,.12)', borderColor: 'rgba(52,209,126,.3)',
              color: '#34D17E', opacity: creatingFolder || !newFolderName.trim() ? .5 : 1,
            }}
          >
            {creatingFolder ? 'Creando...' : 'Crear'}
          </button>
          <button onClick={() => setShowNewFolder(false)} style={{ ...btnBase, color: '#7E9286' }}>
            Cancelar
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 14px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
        }}>
          <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>
          <button onClick={() => setError(null)} style={{ fontSize: 12, color: '#7E9286', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>
            Cerrar
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#4A6B4A' }}>Cargando...</p>
        </div>
      ) : (
        <>
          {/* Carpetas */}
          {folders.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: '#4A6B4A', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 12px' }}>
                Carpetas
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {folders.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <button
                      onClick={() => navigateInto(f)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '9px 14px', borderRadius: '10px 0 0 10px', cursor: 'pointer',
                        background: '#0C120D', border: '1px solid rgba(255,255,255,.07)',
                        borderRight: 'none',
                        color: '#C8DDD0', fontSize: 13, fontWeight: 500,
                        transition: 'border-color .12s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(52,209,126,.3)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)')}
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#34D17E" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3.586a1 1 0 0 1 .707.293L9.5 5.5H16.5A1.5 1.5 0 0 1 18 7v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14V5.5z" />
                      </svg>
                      {f.name}
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(f)}
                      disabled={deletingId === f.id}
                      title="Eliminar carpeta"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: '100%', minHeight: 38,
                        borderRadius: '0 10px 10px 0', cursor: 'pointer',
                        background: '#0C120D', border: '1px solid rgba(255,255,255,.07)',
                        color: '#4A6B4A', transition: 'color .12s, border-color .12s',
                        opacity: deletingId === f.id ? .4 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,.3)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#4A6B4A'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M3 6h14M8 6V4h4v2M5 6l1 11h8l1-11" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media */}
          {media.length > 0 ? (
            <>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: '#4A6B4A', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 12px' }}>
                {media.length} archivo{media.length !== 1 ? 's' : ''}{nextToken ? '+' : ''}
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 10,
              }}>
                {media.map(item => {
                  const isVideo = item.mimeType.startsWith('video/')
                  const thumbSrc = item.thumbnailLink || (isVideo ? null : `/api/fotos/thumbnail/${item.id}`)

                  return (
                    <div
                      key={item.id}
                      title={item.name}
                      onClick={() => setPreviewItem(item)}
                      style={{
                        aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                        background: '#0C120D', border: '1px solid rgba(255,255,255,.06)',
                        position: 'relative', cursor: 'pointer'
                      }}
                    >
                      {thumbSrc ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumbSrc}
                            alt={item.name}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                          {isVideo && (
                            <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: 4 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                                <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
                              </svg>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{
                          width: '100%', height: '100%',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34D17E" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
                          </svg>
                          <span style={{ fontSize: 10, color: '#4A6B4A' }}>video</span>
                        </div>
                      )}

                      {/* Overlay: nombre + botón eliminar */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '18px 6px 6px',
                        background: 'linear-gradient(to top, rgba(0,0,0,.75), transparent)',
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                      }}>
                        <p style={{
                          margin: 0, fontSize: 10.5, color: 'rgba(255,255,255,.8)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          flex: 1, paddingRight: 4,
                        }}>
                          {item.name}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteFile(item); }}
                          disabled={deletingId === item.id}
                          title="Eliminar"
                          style={{
                            ...iconBtn,
                            opacity: deletingId === item.id ? .4 : 1,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,.3)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#7E9286'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}
                        >
                          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M3 6h14M8 6V4h4v2M5 6l1 11h8l1-11" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {nextToken && (
                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    style={{ ...btnBase, margin: '0 auto' }}
                  >
                    {loadingMore ? 'Cargando...' : 'Cargar más'}
                  </button>
                </div>
              )}
            </>
          ) : folders.length === 0 ? (
            <p style={{ fontSize: 13, color: '#4A6B4A' }}>
              Carpeta vacía. Creá una subcarpeta o subí fotos directamente.
            </p>
          ) : (
            <p style={{ fontSize: 13, color: '#4A6B4A' }}>Sin archivos en esta carpeta.</p>
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }} onClick={() => setPreviewItem(null)}>
          <div style={{ position: 'relative', width: '90%', height: '90%', maxWidth: 1200, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', color: '#fff' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{previewItem.name}</h3>
              <button onClick={() => setPreviewItem(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ flex: 1, background: '#000', borderRadius: 8, overflow: 'hidden' }}>
              {previewItem.webViewLink ? (
                <iframe
                  src={previewItem.webViewLink.replace('/view', '/preview')}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay"
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
                  No se puede previsualizar
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
