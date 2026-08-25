'use client'

import { useState, useEffect } from 'react'
import ExternalImageSearch from '@/components/fotos/ExternalImageSearch'

interface Folder { id: string; name: string }

interface Props {
  rootFolderId: string
  salidaId?: string
  value: string | null
  onChange: (path: string | null) => void
  onFolderIdChange?: (folderId: string | null) => void
}

export default function FolderPicker({ rootFolderId, salidaId, value, onChange, onFolderIdChange }: Props) {
  const [step, setStep] = useState<0 | 1>(0)
  const [l1Folders, setL1Folders] = useState<Folder[]>([])
  const [l2Folders, setL2Folders] = useState<Folder[]>([])
  const [selectedL1, setSelectedL1] = useState<Folder | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [showExternalSearch, setShowExternalSearch] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Sincroniza el selector con la carpeta raíz configurada en Drive.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/fotos/carpetas?folderId=${rootFolderId}`)
      .then(r => r.json())
      .then(d => {
        setL1Folders(d.folders ?? [])
        setStep(0)
        setSelectedL1(null)
        setSelectedFolder(null)
        setL2Folders([])
        setShowExternalSearch(false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [rootFolderId])

  async function selectL1(folder: Folder) {
    setSelectedL1(folder)
    const savedSubfolderName = value?.startsWith(`${folder.name}/`)
      ? value.slice(folder.name.length + 1)
      : null

    if (!savedSubfolderName) {
      onChange(folder.name)
      onFolderIdChange?.(folder.id)
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/fotos/carpetas?folderId=${folder.id}`).then(r => r.json())
      const folders = (res.folders ?? []) as Folder[]
      setL2Folders(folders)
      setSelectedFolder(savedSubfolderName
        ? folders.find(item => item.name === savedSubfolderName) ?? null
        : null)
    } catch {
      setL2Folders([])
    } finally {
      setLoading(false)
    }
    setStep(1)
  }

  function selectL2(sub: Folder) {
    if (!selectedL1) return
    if (selectedFolder?.id === sub.id) {
      setSelectedFolder(null)
      setShowExternalSearch(false)
      onChange(selectedL1.name)
      onFolderIdChange?.(selectedL1.id)
    } else {
      setSelectedFolder(sub)
      setShowExternalSearch(false)
      onChange(`${selectedL1.name}/${sub.name}`)
      onFolderIdChange?.(sub.id)
    }
  }

  function goBack() {
    setStep(0)
    setSelectedL1(null)
    setSelectedFolder(null)
    setShowExternalSearch(false)
    setL2Folders([])
    // Al volver atrás limpiamos la selección si el usuario quiere cambiar de carpeta principal, o podemos dejarla.
    // Lo mejor es dejarla para que no se borre accidentalmente.
  }

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
    fontSize: 12.5, fontWeight: 500, transition: 'border-color .1s',
    background: 'var(--nieve)', border: '1px solid var(--linea)',
    color: 'var(--tinta)',
  }

  if (loading && step === 0) {
    return <p style={{ fontSize: 12, color: 'var(--piedra)', margin: 0 }}>Cargando carpetas...</p>
  }

  if (l1Folders.length === 0 && !loading) {
    return <p style={{ fontSize: 12, color: 'var(--piedra)', margin: 0 }}>Sin subcarpetas configuradas.</p>
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {step === 1 && (
          <button
            onClick={goBack}
            style={{ ...btnBase, padding: '4px 10px', color: 'var(--piedra)', border: '1px solid var(--linea)' }}
          >
            ← {selectedL1?.name}
          </button>
        )}
        {value && (
          <button
            onClick={() => { onChange(null); onFolderIdChange?.(null); setSelectedFolder(null); setShowExternalSearch(false) }}
            style={{ ...btnBase, padding: '4px 10px', color: '#ef4444', border: '1px solid #fecaca', background: '#fef2f2' }}
          >
            ✕ Sin carpeta
          </button>
        )}
      </div>
      {value && (
        <p style={{ fontSize: 12, color: 'var(--cardon)', margin: '0 0 9px', fontWeight: 600 }}>
          Material: {value}
        </p>
      )}

      {/* Folder list */}
      {loading ? (
        <p style={{ fontSize: 12, color: 'var(--piedra)', margin: 0 }}>Cargando...</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {(step === 0 ? l1Folders : l2Folders).map(f => {
            const isSelected = step === 0
              ? value === f.name || value?.startsWith(`${f.name}/`)
              : selectedFolder?.id === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => step === 0 ? selectL1(f) : selectL2(f)}
                style={{
                  ...btnBase,
                  borderColor: isSelected ? 'var(--cardon)' : 'var(--linea)',
                  background: isSelected ? 'var(--cardon-tenue)' : 'var(--nieve)',
                  color: isSelected ? 'var(--cardon)' : 'var(--piedra)',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  {step === 0
                    ? <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3.586a1 1 0 0 1 .707.293L9.5 5.5H16.5A1.5 1.5 0 0 1 18 7v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14V5.5z" />
                    : <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v9A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-9zM3 13l4-4 3 3 2.5-3 4 5" />
                  }
                </svg>
                {f.name}
                {step === 0 && (
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M7 4l6 6-6 6" />
                  </svg>
                )}
              </button>
            )
          })}
          {step === 1 && l2Folders.length === 0 && !loading && (
            <p style={{ fontSize: 12, color: 'var(--piedra)', margin: 0 }}>Sin subcarpetas.</p>
          )}
        </div>
      )}

      {step === 1 && selectedFolder && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setShowExternalSearch(current => !current)}
            style={{
              ...btnBase,
              borderColor: showExternalSearch ? 'var(--cardon)' : 'var(--cardon)',
              background: showExternalSearch ? 'var(--cardon-tenue)' : 'var(--nieve)',
              color: 'var(--cardon)',
            }}
          >
            {showExternalSearch ? 'Cerrar Pexels' : `Buscar fotos en Pexels para ${selectedFolder.name}`}
          </button>

          {showExternalSearch && (
            <div style={{ marginTop: 10 }}>
              <ExternalImageSearch parentId={selectedFolder.id} salidaId={salidaId} onImported={() => {}} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
