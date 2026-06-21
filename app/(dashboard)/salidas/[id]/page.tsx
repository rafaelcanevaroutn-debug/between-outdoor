import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient, DEMO_USER_ID } from '@/lib/supabase/admin'
import { ArrowLeft, Sparkles, FileText, Calendar, DollarSign, Users } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import SalidaEditForm from '@/components/salidas/SalidaEditForm'
import SlotsSection from '@/components/salidas/SlotsSection'
import GenerateButton from '@/components/salidas/GenerateButton'
import type { Salida } from '@/types'

const TIPO_LABELS: Record<string, string> = {
  expedicion_premium: 'Expedición Premium',
  escapada_fin_semana: 'Fin de semana',
  salida_un_dia: 'Un día',
}

export default async function SalidaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: salida } = await supabase
    .from('salidas')
    .select('*')
    .eq('id', id)
    .single()

  if (!salida) notFound()

  const { data: contenido } = await supabase
    .from('contenido_generado')
    .select('id')
    .eq('salida_id', id)

  const contenidoCount = contenido?.length || 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/salidas"
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#6B8F71' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs px-2 py-0.5 rounded font-medium"
              style={{ backgroundColor: 'rgba(107,143,113,0.1)', color: '#6B8F71' }}
            >
              {TIPO_LABELS[salida.tipo_viaje] || salida.tipo_viaje}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded font-medium capitalize"
              style={
                salida.estado === 'activa'
                  ? { backgroundColor: 'rgba(52,209,126,0.1)', color: '#34D17E' }
                  : { backgroundColor: 'rgba(107,143,113,0.1)', color: '#6B8F71' }
              }
            >
              {salida.estado}
            </span>
          </div>
          <h1 className="text-xl font-bold truncate" style={{ color: '#F0FFF4' }}>{salida.nombre}</h1>
          <p className="text-sm" style={{ color: '#6B8F71' }}>{salida.destino}</p>
        </div>
        {contenidoCount > 0 && (
          <Link
            href={`/salidas/${id}/contenido`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0"
            style={{ backgroundColor: 'rgba(52,209,126,0.1)', color: '#34D17E', border: '1px solid rgba(52,209,126,0.2)' }}
          >
            <FileText className="w-4 h-4" />
            Ver contenido ({contenidoCount})
          </Link>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: Calendar,
            label: 'Fecha',
            value: format(new Date(salida.fecha_inicio), 'dd MMM yyyy', { locale: es }),
            color: '#3B82F6',
          },
          {
            icon: DollarSign,
            label: 'Precio',
            value: `USD ${salida.precio_usd}`,
            color: '#34D17E',
          },
          {
            icon: Users,
            label: 'Cupos',
            value: salida.cupos,
            color: '#F59E0B',
          },
          {
            icon: Sparkles,
            label: 'Contenido',
            value: contenidoCount > 0 ? `${contenidoCount} piezas` : 'Sin generar',
            color: contenidoCount > 0 ? '#5CE6A0' : '#4A6B4A',
          },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                <p className="text-xs" style={{ color: '#6B8F71' }}>{stat.label}</p>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#F0FFF4' }}>{stat.value}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit form */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl p-6" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: '#6B8F71' }}>
              Datos de la salida
            </h2>
            <SalidaEditForm salida={salida as Salida} />
          </div>
        </div>

        {/* Right column: slots + generate */}
        <div className="flex flex-col gap-4">
          {/* Material slots */}
          <div className="rounded-xl p-6" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
            <div className="mb-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>
                Material multimedia
              </h2>
              <p className="text-xs mt-1" style={{ color: '#4A6B4A' }}>
                Subí fotos y videos para cada tipo de slot. La IA usará esta info para generar el contenido.
              </p>
            </div>
            <SlotsSection salidaId={id} userId={DEMO_USER_ID} />
          </div>

          {/* Generate content */}
          <div className="rounded-xl p-6" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B8F71' }}>
              Generar contenido
            </h2>
            <p className="text-xs mb-5" style={{ color: '#4A6B4A' }}>
              La IA va a generar piezas de contenido basadas en los datos de la salida y el material subido.
              {contenidoCount > 0 && ' Generarás nuevo contenido y reemplazarás el anterior.'}
            </p>
            <GenerateButton salidaId={id} />
          </div>
        </div>
      </div>
    </div>
  )
}
