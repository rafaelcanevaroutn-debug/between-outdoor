'use client'

import { Salida } from '@/types'
import { X, Calendar, MapPin, Users, Edit2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function SalidaDetailModalClient({ salida }: { salida: Salida }) {
  const router = useRouter()

  const handleClose = () => {
    router.push('/salidas')
  }

  const fmtFecha = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d 'de' MMMM yyyy", { locale: es })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="relative w-full max-w-2xl bg-[var(--nieve)] border border-[var(--linea)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--linea)] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--cardon)] bg-[var(--cardon-tenue)] px-2 py-1 rounded">
                {salida.tipo_viaje?.replace(/_/g, ' ') || 'Trekking'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--tinta)] mb-1 font-['Bricolage_Grotesque',_sans-serif]">{salida.nombre}</h2>
            <div className="flex items-center gap-4 text-sm text-[var(--piedra)]">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {salida.destino}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {fmtFecha(salida.fecha_inicio)}</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {salida.cupos} cupos</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-[var(--piedra)] hover:text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {salida.itinerario_dias && salida.itinerario_dias.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[var(--tinta)] mb-4 font-['Bricolage_Grotesque',_sans-serif]">Itinerario</h3>
              <div className="space-y-4">
                {salida.itinerario_dias.map(dia => (
                  <div key={dia.numero} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-[var(--cardon-tenue)] flex items-center justify-center text-xs font-bold text-[var(--cardon)] shrink-0">
                        {dia.numero}
                      </div>
                      <div className="w-px h-full bg-[var(--linea)] my-1" />
                    </div>
                    <div className="pb-4">
                      <h4 className="font-bold text-[var(--tinta)] text-sm">{dia.titulo}</h4>
                      <p className="text-sm text-[var(--piedra)] mt-1 whitespace-pre-wrap">{dia.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(salida.que_incluye || salida.que_no_incluye) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {salida.que_incluye && (
                <div className="bg-[var(--blanco-piedra)] p-5 rounded-xl border border-[var(--linea)]">
                  <h3 className="text-sm font-bold text-[var(--cardon)] mb-3 flex items-center gap-2">
                    <span className="text-lg font-normal">+</span> Incluye
                  </h3>
                  <p className="text-sm text-[var(--piedra)] whitespace-pre-wrap leading-relaxed">{salida.que_incluye}</p>
                </div>
              )}

              {salida.que_no_incluye && (
                <div className="bg-[var(--blanco-piedra)] p-5 rounded-xl border border-[var(--linea)]">
                  <h3 className="text-sm font-bold text-[#DC2626] mb-3 flex items-center gap-2">
                    <span className="text-lg font-normal">-</span> No incluye
                  </h3>
                  <p className="text-sm text-[var(--piedra)] whitespace-pre-wrap leading-relaxed">{salida.que_no_incluye}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--linea)] bg-[var(--nieve)] flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-[var(--piedra)] hover:text-[var(--tinta)] transition-colors"
          >
            Cerrar
          </button>
          <Link
            href={`/salidas/${salida.id}`}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[var(--cardon)] text-[var(--nieve)] text-sm font-bold hover:bg-[var(--cardon)]/90 transition-all shadow-[0_4px_14px_rgba(62,92,72,0.25)] hover:-translate-y-0.5"
          >
            <Edit2 className="w-4 h-4" />
            Editar salida
          </Link>
        </div>
      </div>
    </div>
  )
}
