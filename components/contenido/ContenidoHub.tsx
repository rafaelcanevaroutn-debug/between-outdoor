'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import ContenidoTable from '@/components/contenido/ContenidoTable'
import type { ContenidoGenerado } from '@/types'

interface SalidaSummary {
  id: string
  nombre: string
  sheets_exported_at: string | null
}

interface ContenidoHubProps {
  contenido: ContenidoGenerado[]
  salidas: SalidaSummary[]
  initialIds: string[] | null
}

const FORMAT_LABELS: Record<string, string> = {
  carrusel: 'Carrusel',
  video: 'Video',
  flyer: 'Flyer',
  historia: 'Historia',
  editorial: 'Editorial',
  organico: 'Orgánico',
  itinerario: 'Itinerario',
  ascenso: 'Ascenso',
  calendario: 'Calendario',
  lugar: 'Lugar',
  conversacion: 'Conversación',
}

function formatKey(item: ContenidoGenerado): string {
  return item.formato_carrusel ?? item.formato ?? 'otro'
}

export default function ContenidoHub({ contenido, salidas, initialIds }: ContenidoHubProps) {
  const [salidaFilter, setSalidaFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')
  const [renderFilter, setRenderFilter] = useState('all')
  const initialIdSet = useMemo(() => initialIds ? new Set(initialIds) : null, [initialIds])

  const formats = useMemo(
    () => [...new Set(contenido.map(formatKey))].sort((a, b) => (FORMAT_LABELS[a] ?? a).localeCompare(FORMAT_LABELS[b] ?? b)),
    [contenido],
  )

  const filtered = useMemo(() => contenido.filter(item => {
    if (initialIdSet && !initialIdSet.has(item.id)) return false
    if (salidaFilter !== 'all' && item.salida_id !== salidaFilter) return false
    if (formatFilter !== 'all' && formatKey(item) !== formatFilter) return false
    if (renderFilter === 'rendered' && !item.render_folder_id) return false
    if (renderFilter === 'pending' && item.render_folder_id) return false
    return true
  }), [contenido, formatFilter, initialIdSet, renderFilter, salidaFilter])

  const groups = salidas
    .map(salida => ({
      salida,
      contenido: filtered.filter(item => item.salida_id === salida.id),
    }))
    .filter(group => group.contenido.length > 0)

  const renderedCount = filtered.filter(item => Boolean(item.render_folder_id)).length

  const selectStyle = {
    backgroundColor: '#0D130E',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#C8DDD0',
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold" style={{ color: '#EAF2EC' }}>
            {initialIdSet ? 'Contenido de esta semana' : 'Todo tu contenido'}
          </h2>
          <p className="text-[12.5px] mt-1" style={{ color: '#7E9286' }}>
            {filtered.length} piezas · {renderedCount} renderizadas
          </p>
        </div>
        {initialIdSet && (
          <Link href="/contenido" className="text-[12.5px] font-semibold" style={{ color: '#5CE6A0' }}>
            Ver todo el contenido →
          </Link>
        )}
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl p-4"
        style={{ backgroundColor: '#0D130E', border: '1px solid #1E2D1E' }}
      >
        <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#6F8377' }}>
          Salida
          <select value={salidaFilter} onChange={event => setSalidaFilter(event.target.value)} className="rounded-lg px-3 py-2 text-[13px] normal-case" style={selectStyle}>
            <option value="all">Todas las salidas</option>
            {salidas.map(salida => <option key={salida.id} value={salida.id}>{salida.nombre}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#6F8377' }}>
          Formato
          <select value={formatFilter} onChange={event => setFormatFilter(event.target.value)} className="rounded-lg px-3 py-2 text-[13px] normal-case" style={selectStyle}>
            <option value="all">Todos los formatos</option>
            {formats.map(format => <option key={format} value={format}>{FORMAT_LABELS[format] ?? format}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#6F8377' }}>
          Render
          <select value={renderFilter} onChange={event => setRenderFilter(event.target.value)} className="rounded-lg px-3 py-2 text-[13px] normal-case" style={selectStyle}>
            <option value="all">Todos los estados</option>
            <option value="rendered">Renderizadas</option>
            <option value="pending">Sin render</option>
          </select>
        </label>
      </div>

      {groups.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groups.map(({ salida, contenido: salidaContenido }) => (
            <section key={salida.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[13.5px] font-semibold" style={{ color: '#5CE6A0' }}>{salida.nombre}</h3>
                <span className="text-[11px]" style={{ color: '#64776B' }}>{salidaContenido.length} piezas</span>
              </div>
              <ContenidoTable
                key={`${salida.id}-${formatFilter}-${renderFilter}-${initialIds?.join(',') ?? 'all'}`}
                contenido={salidaContenido}
                salidaId={salida.id}
                salidaNombre={salida.nombre}
                sheetsExportedAt={salida.sheets_exported_at}
              />
            </section>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl py-16 px-6 flex flex-col items-center text-center"
          style={{ backgroundColor: '#0D130E', border: '1px dashed rgba(255,255,255,0.08)' }}
        >
          <FileText className="w-8 h-8 mb-3" style={{ color: '#405247' }} />
          <p className="text-[14px] font-semibold" style={{ color: '#C8DDD0' }}>No hay piezas para estos filtros</p>
          <p className="text-[12.5px] mt-1" style={{ color: '#64776B' }}>Probá otra combinación o generá una nueva semana.</p>
        </div>
      )}
    </div>
  )
}
