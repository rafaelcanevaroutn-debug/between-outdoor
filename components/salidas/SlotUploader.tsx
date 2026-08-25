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
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--linea)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--blanco-piedra)', borderBottom: hasFiles ? '1px solid var(--linea)' : 'none' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hasFiles ? 'var(--cardon)' : 'var(--linea)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>{slot.slot_label}</p>
          {hasFiles && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(62, 92, 72, 0.1)', color: 'var(--cardon)' }}>
              {slot.files.length}
            </span>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors"
          style={{ backgroundColor: 'var(--piedra-clara)', color: 'var(--piedra)', border: '1px solid var(--linea)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--tinta)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--piedra)' }}
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Subir
        </button>
      </div>

      {/* Description */}
      {slot.slot_description && (
        <div className="px-4 py-2" style={{ backgroundColor: 'var(--nieve)' }}>
          <p className="text-xs" style={{ color: 'var(--piedra)' }}>{slot.slot_description}</p>
        </div>
      )}

      {/* Drop zone */}
      <div
        className="px-4 py-3"
        style={{ backgroundColor: 'var(--nieve)' }}
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
                style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)' }}
              >
                <span style={{ color: 'var(--piedra)' }}>
                  <FileIcon type={file.file_type} />
                </span>
                <span className="flex-1 text-xs truncate" style={{ color: 'var(--tinta)' }}>{file.file_name}</span>
                {file.file_size && (
                  <span className="text-xs shrink-0" style={{ color: 'var(--piedra)' }}>{formatBytes(file.file_size)}</span>
                )}
                <button
                  onClick={() => handleDelete(file)}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors"
                  style={{ color: 'var(--piedra)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--piedra)' }}
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
            borderColor: dragOver ? 'var(--cardon)' : 'var(--linea)',
            backgroundColor: dragOver ? 'rgba(62, 92, 72, 0.05)' : 'transparent',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mb-1" style={{ color: dragOver ? 'var(--cardon)' : 'var(--piedra)' }} />
          <p className="text-xs" style={{ color: 'var(--piedra)' }}>
            {uploading ? 'Subiendo…' : 'Arrastrá o hacé clic para subir'}
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
