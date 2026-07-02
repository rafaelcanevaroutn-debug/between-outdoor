'use client'

import { useState, useEffect } from 'react'

interface Folder { id: string; name: string }

interface Props {
  rootFolderId: string
  value: string | null
  onChange: (path: string | null) => void
}

export default function FolderPicker({ rootFolderId, value, onChange }: Props) {
  const [step, setStep] = useState<0 | 1>(0)
  const [l1Folders, setL1Folders] = useState<Folder[]>([])
  const [l2Folders, setL2Folders] = useState<Folder[]>([])
  const [selectedL1, setSelectedL1] = useState<Folder | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/fotos/carpetas?folderId=${rootFolderId}`)
      .then(r => r.json())
      .then(d => setL1Folders(d.folders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [rootFolderId])

  async function selectL1(folder: Folder) {
    setSelectedL1(folder)
    setLoading(true)
    try {
      const res = await fetch(`/api/fotos/carpetas?folderId=${folder.id}`).then(r => r.json())
      setL2Folders(res.folders ?? [])
    } catch {
      setL2Folders([])
    } finally {
      setLoading(false)
    }
    setStep(1)
  }

  function selectL2(sub: Folder) {
    if (!selectedL1) return
    const path = `${selectedL1.name}/${sub.name}`
    if (value === path) {
      onChange(null)
    } else {
      onChange(path)
    }
  }

  function goBack() {
    setStep(0)
    setSelectedL1(null)
    setL2Folders([])
  }

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
    fontSize: 12.5, fontWeight: 500, transition: 'border-color .1s',
    background: '#0C120D', border: '1px solid rgba(255,255,255,.08)',
    color: '#C8DDD0',
  }

  if (loading && step === 0) {
    return <p style={{ fontSize: 12, color: '#4A6B4A', margin: 0 }}>Cargando carpetas...</p>
  }

  if (l1Folders.length === 0 && !loading) {
    return <p style={{ fontSize: 12, color: '#4A6B4A', margin: 0 }}>Sin subcarpetas configuradas.</p>
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {step === 1 && (
          <button
            onClick={goBack}
            style={{ ...btnBase, padding: '4px 10px', color: '#7E9286', border: '1px solid rgba(255,255,255,.05)' }}
          >
            ← {selectedL1?.name}
          </button>
        )}
        {value && (
          <button
            onClick={() => onChange(null)}
            style={{ ...btnBase, padding: '4px 10px', color: '#f87171', border: '1px solid rgba(248,113,113,.2)', background: 'rgba(248,113,113,.06)' }}
          >
            ✕ Sin carpeta
          </button>
        )}
      </div>

      {/* Folder list */}
      {loading ? (
        <p style={{ fontSize: 12, color: '#4A6B4A', margin: 0 }}>Cargando...</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {(step === 0 ? l1Folders : l2Folders).map(f => {
            const path = step === 1 && selectedL1 ? `${selectedL1.name}/${f.name}` : null
            const isSelected = path !== null && value === path
            return (
              <button
                key={f.id}
                onClick={() => step === 0 ? selectL1(f) : selectL2(f)}
                style={{
                  ...btnBase,
                  borderColor: isSelected ? 'rgba(52,209,126,.5)' : 'rgba(255,255,255,.08)',
                  background: isSelected ? 'rgba(52,209,126,.1)' : '#0C120D',
                  color: isSelected ? '#5CE6A0' : '#C8DDD0',
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
            <p style={{ fontSize: 12, color: '#4A6B4A', margin: 0 }}>Sin subcarpetas.</p>
          )}
        </div>
      )}
    </div>
  )
}
