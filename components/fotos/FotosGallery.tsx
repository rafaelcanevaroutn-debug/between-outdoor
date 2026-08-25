'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ExternalImageSearch from '@/components/fotos/ExternalImageSearch'
import imageCompression from 'browser-image-compression'

interface Folder { id: string; name: string }
interface Media  { id: string; name: string; mimeType: string; thumbnailLink?: string | null; webViewLink?: string | null }
interface BreadcrumbEntry { id: string; name: string }

interface UploadItem {
  id: string
  file: File
  name: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  errorMsg?: string
}
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
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Path copiado
  const [copied, setCopied] = useState(false)
  const [showExternalSearch, setShowExternalSearch] = useState(false)

  const currentFolderId = breadcrumb[breadcrumb.length - 1].id
  const isRoot = breadcrumb.length === 1

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

  // ── Gestor de Subidas ─────────────────────────────────────────────────────────────
  const processUploadQueue = useCallback(async (filesToUpload: File[]) => {
    const newItems: UploadItem[] = filesToUpload.map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      name: f.name,
      progress: 0,
      status: 'pending'
    }))
    
    setUploadQueue(prev => [...prev, ...newItems])

    // Limite de peso para videos/fotos grandes si va a Vercel/Drive (e.g. 100MB)
    const MAX_SIZE = 100 * 1024 * 1024

    for (const item of newItems) {
      setUploadQueue(prev => prev.map(u => u.id === item.id ? { ...u, status: 'uploading' } : u))

      if (item.file.size > MAX_SIZE) {
        setUploadQueue(prev => prev.map(u => u.id === item.id ? { ...u, status: 'error', errorMsg: 'Máximo 100MB permitido' } : u))
        continue
      }

      try {
        let finalFile = item.file
        
        // Comprimir si es imagen
        if (finalFile.type.startsWith('image/')) {
           finalFile = await imageCompression(item.file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true })
        }

        const params = new URLSearchParams({ parentId: currentFolderId, filename: finalFile.name })
        const res = await fetch(`/api/fotos/upload?${params}`, {
          method: 'POST',
          headers: { 'x-mime-type': finalFile.type || 'application/octet-stream' },
          body: finalFile,
        }).then(r => r.json())
        
        if (res.error) throw new Error(res.error)
        if (res.errors?.length) throw new Error(res.errors[0].error)
        
        setUploadQueue(prev => prev.map(u => u.id === item.id ? { ...u, status: 'done', progress: 100 } : u))
      } catch (err) {
        console.error(`[UPLOAD] Error subiendo ${item.name}:`, err)
        setUploadQueue(prev => prev.map(u => u.id === item.id ? { ...u, status: 'error', errorMsg: 'Error de conexión' } : u))
      }
    }

    // Al finalizar todos, refrescar galería
    const mediaRes = await fetch(`/api/fotos/archivos?folderId=${currentFolderId}`).then(r => r.json())
    setMedia(mediaRes.images ?? [])
    setNextToken(mediaRes.nextPageToken ?? null)
  }, [currentFolderId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    processUploadQueue(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processUploadQueue(files)
    }
  }

  function clearCompletedUploads() {
    setUploadQueue(prev => prev.filter(u => u.status !== 'done'))
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
    padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 500, border: '1px solid var(--linea)',
    background: 'var(--nieve)', color: 'var(--tinta)', transition: 'all .15s ease',
  }

  const primaryBtn: React.CSSProperties = {
    ...btnBase,
    background: 'var(--cardon)',
    borderColor: 'var(--cardon)',
    color: 'var(--nieve)',
    fontWeight: 600,
  }

  const iconBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
    background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.08)',
    color: '#7E9286', flexShrink: 0,
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{ position: 'relative', minHeight: '60vh' }}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(52,209,126,0.1)', border: '2px dashed #34D17E',
          borderRadius: 16, zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#34D17E" strokeWidth="1.5">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p style={{ color: '#34D17E', fontSize: 18, fontWeight: 600, marginTop: 16 }}>Soltá tus archivos aquí</p>
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, flexWrap: 'wrap',
        background: 'var(--nieve)', padding: '6px 14px', borderRadius: 8, border: '1px solid var(--linea)'
      }}>
        {breadcrumb.map((crumb, i) => {
          const isLast = i === breadcrumb.length - 1
          return (
            <span key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span style={{ color: 'var(--piedra)', fontSize: 13 }}>/</span>}
              <button
                onClick={() => !isLast && navigateTo(i)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 13, fontWeight: isLast ? 600 : 400,
                  color: isLast ? 'var(--tinta)' : 'var(--piedra)',
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
          style={{ ...btnBase, borderColor: showNewFolder ? 'var(--cardon)' : 'var(--linea)' }}
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 4v12M4 10h12" />
          </svg>
          Nuevo Destino
        </button>

        {!isRoot && (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={primaryBtn}
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M10 13V4M6 8l4-4 4 4M3 16h14" />
            </svg>
            Subir fotos / videos
          </button>
        )}

        {type === 'fotos' && (
          <button
            type="button"
            onClick={() => setShowExternalSearch(value => !value)}
            style={{ ...btnBase, borderColor: showExternalSearch ? 'var(--cardon)' : 'var(--linea)', color: showExternalSearch ? 'var(--cardon)' : 'var(--tinta)' }}
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
      </div>

      {showExternalSearch && <ExternalImageSearch parentId={currentFolderId} onImported={() => loadFolder(currentFolderId)} />}

      {/* Input nueva carpeta */}
      {showNewFolder && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 20, padding: '12px 14px', borderRadius: 10,
          background: 'var(--blanco-piedra)', border: '1px solid var(--linea)',
        }}>
          <input
            autoFocus
            type="text"
            placeholder="Nombre del destino (ej: Chaltén)"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--tinta)', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleCreateFolder}
            disabled={creatingFolder || !newFolderName.trim()}
            style={{
              ...btnBase,
              background: 'var(--cardon-tenue)', borderColor: 'var(--cardon)',
              color: 'var(--cardon)', opacity: creatingFolder || !newFolderName.trim() ? .5 : 1,
            }}
          >
            {creatingFolder ? 'Creando...' : 'Crear'}
          </button>
          <button onClick={() => setShowNewFolder(false)} style={{ ...btnBase, color: 'var(--piedra)' }}>
            Cancelar
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 14px', borderRadius: 10, marginBottom: 16,
          background: 'rgb(254, 242, 242)', border: '1px solid rgb(254, 202, 202)',
        }}>
          <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>
          <button onClick={() => setError(null)} style={{ fontSize: 12, color: 'var(--piedra)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>
            Cerrar
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--piedra)' }}>Cargando...</p>
        </div>
      ) : (
        <>
          {/* Carpetas */}
          {folders.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--piedra)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 12px' }}>
                Destinos
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {folders.map(f => (
                  <div key={f.id} style={{ display: 'flex', flexDirection: 'column', width: 170, position: 'relative', cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--linea)', transition: 'all .2s ease' }} onClick={() => navigateInto(f)} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cardon)'; e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--linea)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                    <div style={{
                      height: 100, background: 'var(--blanco-piedra)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--cardon)" strokeWidth="1" strokeLinecap="round">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 14px',
                      background: 'var(--nieve)', borderTop: '1px solid var(--linea)',
                      color: 'var(--tinta)', fontSize: 13, fontWeight: 500,
                    }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f); }}
                        disabled={deletingId === f.id}
                        title="Eliminar destino"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
                          background: 'none', border: 'none',
                          color: 'var(--piedra)', transition: 'all .15s ease',
                          opacity: deletingId === f.id ? .4 : 1,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--piedra)'; e.currentTarget.style.background = 'none' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M3 6h14M8 6V4h4v2M5 6l1 11h8l1-11" />
                        </svg>
                      </button>
                    </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: 'var(--blanco-piedra)', borderRadius: 12, border: '1px solid var(--linea)', marginTop: 20 }}>
              <svg width="40" height="40" fill="none" stroke="var(--linea)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 12 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p style={{ fontSize: 13, color: 'var(--piedra)', margin: 0, textAlign: 'center' }}>
                Aún no hay destinos creados.<br/>Creá un destino y subí los archivos ahí para organizar el material.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: 'var(--blanco-piedra)', borderRadius: 12, border: '1px solid var(--linea)', marginTop: 20 }}>
              <svg width="40" height="40" fill="none" stroke="var(--linea)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 12 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p style={{ fontSize: 13, color: 'var(--piedra)', margin: 0, textAlign: 'center' }}>
                Este álbum está vacío.<br/>Subí fotos o videos para empezar a usar este material.
              </p>
            </div>
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

      {/* Upload Queue Toast */}
      {uploadQueue.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          width: 340, background: 'var(--nieve)', border: '1px solid var(--linea)',
          borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '12px 16px', background: 'var(--blanco-piedra)', borderBottom: '1px solid var(--linea)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--tinta)' }}>
              Subiendo {uploadQueue.filter(u => u.status === 'done').length} de {uploadQueue.length}
            </p>
            <button onClick={clearCompletedUploads} style={{ background: 'none', border: 'none', color: 'var(--piedra)', cursor: 'pointer', fontSize: 12 }}>
              Limpiar listos
            </button>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: 8 }}>
            {uploadQueue.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
                {item.file.type.startsWith('image/') ? (
                  <svg width="16" height="16" fill="none" stroke="var(--piedra)" strokeWidth="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="var(--piedra)" strokeWidth="1.5"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                )}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--tinta)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                  <p style={{ margin: 0, fontSize: 10, color: item.status === 'error' ? '#ef4444' : item.status === 'done' ? 'var(--cardon)' : 'var(--piedra)' }}>
                    {item.status === 'uploading' ? 'Comprimiendo/Subiendo...' : item.status === 'error' ? item.errorMsg : item.status === 'done' ? 'Completado' : 'En cola'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
