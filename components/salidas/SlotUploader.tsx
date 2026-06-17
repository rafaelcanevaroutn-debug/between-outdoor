'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileImage, FileVideo, File, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { MaterialSlot, SlotFile } from '@/types'

interface SlotUploaderProps {
  slot: MaterialSlot & { files: SlotFile[] }
  userId: string
  salidaId: string
  onUpdate: () => void
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <FileImage className="w-4 h-4" />
  if (type.startsWith('video/')) return <FileVideo className="w-4 h-4" />
  return <File className="w-4 h-4" />
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SlotUploader({ slot, userId, salidaId, onUpdate }: SlotUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError('')
    setUploading(true)

    const supabase = createClient()

    for (const file of Array.from(files)) {
      const filePath = `${userId}/${salidaId}/${slot.slot_key}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`

      const { data: uploaded, error: uploadError } = await supabase.storage
        .from('slot-files')
        .upload(filePath, file, { upsert: false })

      if (uploadError) {
        setError(uploadError.message)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('slot-files')
        .getPublicUrl(filePath)

      await supabase.from('slot_files').insert({
        slot_id: slot.id,
        salida_id: salidaId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        storage_url: publicUrl,
      })
    }

    setUploading(false)
    onUpdate()
  }

  async function handleDelete(slotFile: SlotFile) {
    const supabase = createClient()
    await supabase.storage.from('slot-files').remove([slotFile.file_path])
    await supabase.from('slot_files').delete().eq('id', slotFile.id)
    onUpdate()
  }

  const hasFiles = slot.files.length > 0

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1E2D1E' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#111A11', borderBottom: hasFiles ? '1px solid #1E2D1E' : 'none' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hasFiles ? '#34D17E' : '#1E2D1E' }} />
          <p className="text-sm font-medium" style={{ color: '#F0FFF4' }}>{slot.slot_label}</p>
          {hasFiles && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(52,209,126,0.1)', color: '#34D17E' }}>
              {slot.files.length}
            </span>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors"
          style={{ backgroundColor: '#162216', color: '#6B8F71', border: '1px solid #1E2D1E' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F0FFF4' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6B8F71' }}
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Subir
        </button>
      </div>

      {/* Description */}
      {slot.slot_description && (
        <div className="px-4 py-2" style={{ backgroundColor: '#0A0F0A' }}>
          <p className="text-xs" style={{ color: '#4A6B4A' }}>{slot.slot_description}</p>
        </div>
      )}

      {/* Drop zone */}
      <div
        className="px-4 py-3"
        style={{ backgroundColor: '#0A0F0A' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
      >
        {/* Files list */}
        {slot.files.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {slot.files.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}
              >
                <span style={{ color: '#6B8F71' }}>
                  <FileIcon type={file.file_type} />
                </span>
                <span className="flex-1 text-xs truncate" style={{ color: '#F0FFF4' }}>{file.file_name}</span>
                {file.file_size && (
                  <span className="text-xs shrink-0" style={{ color: '#4A6B4A' }}>{formatBytes(file.file_size)}</span>
                )}
                <button
                  onClick={() => handleDelete(file)}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors"
                  style={{ color: '#4A6B4A' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#4A6B4A' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drop area */}
        <div
          className="border border-dashed rounded-lg px-4 py-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
          style={{
            borderColor: dragOver ? '#34D17E' : '#1E2D1E',
            backgroundColor: dragOver ? 'rgba(52,209,126,0.05)' : 'transparent',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mb-1" style={{ color: dragOver ? '#34D17E' : '#4A6B4A' }} />
          <p className="text-xs" style={{ color: '#6B8F71' }}>
            {uploading ? 'Subiendo...' : 'Arrastrá o hacé clic para subir'}
          </p>
        </div>

        {error && <p className="text-xs mt-2" style={{ color: '#f87171' }}>{error}</p>}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}
