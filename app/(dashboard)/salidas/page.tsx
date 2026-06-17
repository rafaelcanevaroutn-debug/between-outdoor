import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PlusCircle, Map, ArrowRight, Sparkles, CheckCircle, Clock, FileEdit } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Salida } from '@/types'

const TIPO_LABELS: Record<string, string> = {
  expedicion_premium: 'Expedición Premium',
  escapada_fin_semana: 'Fin de semana',
  salida_un_dia: 'Un día',
}

const NIVEL_COLORS: Record<string, string> = {
  baja: '#34D17E',
  media: '#F59E0B',
  alta: '#EF4444',
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles = {
    activa: { bg: 'rgba(52,209,126,0.1)', color: '#34D17E' },
    borrador: { bg: 'rgba(107,143,113,0.1)', color: '#6B8F71' },
    completada: { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6' },
  }
  const style = styles[estado as keyof typeof styles] || styles.borrador

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium capitalize"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {estado === 'activa' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {estado}
    </span>
  )
}

export default async function SalidasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: salidas } = await supabase
    .from('salidas')
    .select('*')
    .eq('user_id', user.id)
    .order('fecha_inicio', { ascending: false })

  const { data: contenidoCounts } = await supabase
    .from('contenido_generado')
    .select('salida_id')
    .eq('user_id', user.id)

  const countMap = (contenidoCounts || []).reduce((acc, c) => {
    acc[c.salida_id] = (acc[c.salida_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F0FFF4' }}>Salidas</h1>
          <p className="text-sm mt-1" style={{ color: '#6B8F71' }}>
            {salidas?.length || 0} salida{salidas?.length !== 1 ? 's' : ''} registrada{salidas?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/salidas/nueva"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#34D17E', color: '#0A0F0A' }}
        >
          <PlusCircle className="w-4 h-4" />
          Nueva salida
        </Link>
      </div>

      {/* Empty state */}
      {(!salidas || salidas.length === 0) && (
        <div
          className="rounded-xl p-16 flex flex-col items-center justify-center text-center"
          style={{ backgroundColor: '#111A11', border: '1px dashed #1E2D1E' }}
        >
          <Map className="w-12 h-12 mb-4" style={{ color: '#1E2D1E' }} />
          <p className="text-base font-semibold mb-2" style={{ color: '#F0FFF4' }}>Sin salidas todavía</p>
          <p className="text-sm mb-8 max-w-sm" style={{ color: '#6B8F71' }}>
            Creá tu primera salida para empezar a generar contenido con IA para tus redes sociales
          </p>
          <Link
            href="/salidas/nueva"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#34D17E', color: '#0A0F0A' }}
          >
            <PlusCircle className="w-4 h-4" />
            Crear primera salida
          </Link>
        </div>
      )}

      {/* Grid */}
      {salidas && salidas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {salidas.map((salida: Salida) => {
            const contenidoCount = countMap[salida.id] || 0
            return (
              <div
                key={salida.id}
                className="rounded-xl overflow-hidden flex flex-col transition-all duration-150"
                style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}
              >
                {/* Card header */}
                <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid #1E2D1E' }}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <EstadoBadge estado={salida.estado} />
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: '#162216', color: '#6B8F71' }}
                    >
                      {TIPO_LABELS[salida.tipo_viaje] || salida.tipo_viaje}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold mb-1 leading-snug" style={{ color: '#F0FFF4' }}>
                    {salida.nombre}
                  </h3>
                  <p className="text-sm" style={{ color: '#6B8F71' }}>{salida.destino}</p>
                </div>

                {/* Details */}
                <div className="px-5 py-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: '#6B8F71' }}>Fecha</span>
                    <span style={{ color: '#F0FFF4' }}>
                      {format(new Date(salida.fecha_inicio), 'dd MMM', { locale: es })} —{' '}
                      {format(new Date(salida.fecha_fin), 'dd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: '#6B8F71' }}>Precio</span>
                    <span style={{ color: '#34D17E', fontWeight: 600 }}>USD {salida.precio_usd}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: '#6B8F71' }}>Nivel</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium capitalize"
                      style={{
                        backgroundColor: `${NIVEL_COLORS[salida.nivel]}15`,
                        color: NIVEL_COLORS[salida.nivel],
                      }}
                    >
                      {salida.nivel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: '#6B8F71' }}>Cupos</span>
                    <span style={{ color: '#F0FFF4' }}>{salida.cupos}</span>
                  </div>
                  {contenidoCount > 0 && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: '#34D17E' }}>
                      <Sparkles className="w-3 h-3" />
                      {contenidoCount} piezas generadas
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-5 py-4 flex items-center gap-2" style={{ borderTop: '1px solid #1E2D1E' }}>
                  <Link
                    href={`/salidas/${salida.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ backgroundColor: '#162216', color: '#F0FFF4', border: '1px solid #1E2D1E' }}
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    Editar
                  </Link>
                  {contenidoCount > 0 ? (
                    <Link
                      href={`/salidas/${salida.id}/contenido`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ backgroundColor: 'rgba(52,209,126,0.1)', color: '#34D17E', border: '1px solid rgba(52,209,126,0.2)' }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Contenido
                    </Link>
                  ) : (
                    <Link
                      href={`/salidas/${salida.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: '#34D17E', color: '#0A0F0A' }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Generar
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
