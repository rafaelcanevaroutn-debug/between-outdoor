import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Sparkles, FileText, Calendar, DollarSign, Users, RefreshCw } from 'lucide-react'
import { formatFechaSalida } from '@/lib/utils/dates'
import { getOrCreateFolder } from '@/lib/google-drive'
import SalidaEditForm from '@/components/salidas/SalidaEditForm'
import GenerateButton from '@/components/salidas/GenerateButton'
import type { Salida } from '@/types'

const TIPO_LABELS: Record<string, string> = {
  expedicion_premium:  'Expedición Premium',
  escapada_fin_semana: 'Fin de semana',
  salida_un_dia:       'Un día',
  salida_recurrente:   'Salida Recurrente',
}

function formatRecurrente(salida: Salida): string {
  const partes: string[] = []
  if (salida.dias_semana && salida.dias_semana.length > 0) {
    partes.push(salida.dias_semana.join(', '))
  }
  if (salida.hora_encuentro) {
    partes.push(`a las ${salida.hora_encuentro.slice(0, 5)}`)
  }
  if (salida.punto_encuentro) {
    partes.push(`en ${salida.punto_encuentro}`)
  }
  return partes.length > 0 ? partes.join(' ') : '—'
}

export default async function SalidaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: salida } = await supabase
    .from('salidas')
    .select('*')
    .eq('id', id)
    .single()

  if (!salida) notFound()

  const admin = createAdminClient()
  const [{ data: contenido }, { data: branding }, { data: relatedSalidas }, { data: holidays }] = await Promise.all([
    supabase.from('contenido_generado').select('id').eq('salida_id', id),
    admin.from('brand_identity').select('drive_folder_id, fotos_folder_id, videos_folder_id').eq('user_id', salida.user_id).single(),
    admin.from('salidas').select('id, nombre, destino, fecha_inicio, fecha_fin, estado, pais_codigo, itinerario, itinerario_dias').eq('user_id', salida.user_id).neq('id', id).order('fecha_inicio'),
    admin.from('feriados').select('fecha, nombre, tipo').eq('pais', salida.pais_codigo ?? 'AR').gte('fecha', new Date().toISOString().slice(0, 10)).order('fecha'),
  ])

  const contenidoCount = contenido?.length || 0
  const fotosFolderId = branding?.fotos_folder_id?.trim() || null
  let videosFolderId = branding?.videos_folder_id?.trim() || null

  if (!videosFolderId && branding?.drive_folder_id) {
    try {
      videosFolderId = await getOrCreateFolder(branding.drive_folder_id, 'videos crudos')
      if (videosFolderId) {
        await admin
          .from('brand_identity')
          .update({ videos_folder_id: videosFolderId })
          .eq('user_id', salida.user_id)
      }
    } catch (e) {
      console.error('Error creando carpeta videos crudos:', e)
    }
  }

  const moneda = salida.moneda ?? 'USD'
  const isRecurrente = salida.tipo_viaje === 'salida_recurrente'

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
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <div className="flex items-center gap-2 mb-2">
            {isRecurrente
              ? <RefreshCw className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} />
              : <Calendar className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} />
            }
            <p className="text-xs" style={{ color: '#6B8F71' }}>{isRecurrente ? 'Frecuencia' : 'Fecha'}</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#F0FFF4' }}>
            {isRecurrente
              ? (salida.frecuencia
                  ? salida.frecuencia.charAt(0).toUpperCase() + salida.frecuencia.slice(1)
                  : '—')
              : formatFechaSalida(salida.fecha_inicio, salida.fecha_fin)
            }
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-3.5 h-3.5" style={{ color: '#34D17E' }} />
            <p className="text-xs" style={{ color: '#6B8F71' }}>Precio</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#F0FFF4' }}>
            {moneda} {salida.precio_usd}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />
            <p className="text-xs" style={{ color: '#6B8F71' }}>Cupos</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#F0FFF4' }}>{salida.cupos}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: contenidoCount > 0 ? '#5CE6A0' : '#4A6B4A' }} />
            <p className="text-xs" style={{ color: '#6B8F71' }}>Contenido</p>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#F0FFF4' }}>
            {contenidoCount > 0 ? `${contenidoCount} piezas` : 'Sin generar'}
          </p>
        </div>
      </div>

      {/* Recurrente: banner de horario */}
      {isRecurrente && (
        <div className="rounded-xl px-5 py-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <RefreshCw className="w-4 h-4 shrink-0" style={{ color: '#60A5FA' }} />
          <p className="text-sm" style={{ color: '#93C5FD' }}>
            {formatRecurrente(salida as Salida)}
          </p>
        </div>
      )}

      {/* Main layout: form izquierda (3/5), generar derecha (2/5) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 rounded-xl p-6" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: '#6B8F71' }}>
            Datos de la salida
          </h2>
          <SalidaEditForm salida={salida as Salida} />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="rounded-xl p-6" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B8F71' }}>
              Generar contenido
            </h2>
            <p className="text-xs mb-5" style={{ color: '#4A6B4A' }}>
              La IA va a generar piezas de contenido basadas en los datos de la salida.
              {contenidoCount > 0 && ' Generarás nuevo contenido adicional al existente.'}
            </p>
            <GenerateButton
              salidaId={id}
              salida={salida as Salida}
              fotosFolderId={fotosFolderId}
              videosFolderId={videosFolderId}
              relatedSalidas={relatedSalidas ?? []}
              holidays={holidays ?? []}
            />
          </div>

          {contenidoCount > 0 && (
            <Link
              href={`/salidas/${id}/contenido`}
              className="rounded-xl p-5 flex items-center gap-3 transition-colors"
              style={{ backgroundColor: 'rgba(52,209,126,0.05)', border: '1px solid rgba(52,209,126,0.15)' }}
            >
              <FileText className="w-5 h-5 shrink-0" style={{ color: '#34D17E' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#34D17E' }}>
                  {contenidoCount} {contenidoCount === 1 ? 'pieza generada' : 'piezas generadas'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#4A6B4A' }}>Ver y editar contenido →</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
