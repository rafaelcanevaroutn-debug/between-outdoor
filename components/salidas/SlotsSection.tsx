'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import SlotUploader from './SlotUploader'
import type { MaterialSlot, SlotFile } from '@/types'

interface SlotsSectionProps {
  salidaId: string
  userId: string
}

export default function SlotsSection({ salidaId, userId }: SlotsSectionProps) {
  const [slots, setSlots] = useState<(MaterialSlot & { files: SlotFile[] })[]>([])
  const [loading, setLoading] = useState(true)

  async function loadSlots() {
    const supabase = createClient()
    const { data: slotsData } = await supabase
      .from('material_slots')
      .select('*')
      .eq('salida_id', salidaId)
      .order('sort_order')

    if (!slotsData) { setLoading(false); return }

    const { data: filesData } = await supabase
      .from('slot_files')
      .select('*')
      .eq('salida_id', salidaId)

    const slotsWithFiles = slotsData.map((slot: MaterialSlot) => ({
      ...slot,
      files: (filesData || []).filter((f: SlotFile) => f.slot_id === slot.id),
    }))

    setSlots(slotsWithFiles)
    setLoading(false)
  }

  useEffect(() => { loadSlots() }, [salidaId])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--blanco-piedra)' }} />
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="py-8 text-center" style={{ color: 'var(--piedra)' }}>
        <p className="text-sm">No hay slots de material disponibles</p>
      </div>
    )
  }

  const totalFiles = slots.reduce((acc, s) => acc + s.files.length, 0)
  const slotsWithFiles = slots.filter(s => s.files.length > 0).length

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--piedra)' }}>
        <span>{totalFiles} archivo{totalFiles !== 1 ? 's' : ''} subido{totalFiles !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{slotsWithFiles}/{slots.length} slots con material</span>
      </div>

      {/* Slots grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {slots.map(slot => (
          <SlotUploader
            key={slot.id}
            slot={slot}
            userId={userId}
            salidaId={salidaId}
            onUpdate={loadSlots}
          />
        ))}
      </div>
    </div>
  )
}
