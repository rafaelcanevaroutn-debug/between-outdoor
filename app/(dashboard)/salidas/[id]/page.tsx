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

export default async function SalidaDetailPage(
  props: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const { id } = await props.params
  const searchParams = await props.searchParams
  const tab = searchParams.tab === 'datos' ? 'datos' : 'generar'
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

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const isCompletada = salida.estado === 'completada' || (salida.estado === 'activa' && new Date(salida.fecha_inicio) < now)

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
            href="/calendario"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0"
            style={{ backgroundColor: 'rgba(52,209,126,0.1)', color: '#34D17E', border: '1px solid rgba(52,209,126,0.2)' }}
          >
            <FileText className="w-4 h-4" />
            Ver contenido ({contenidoCount})
          </Link>
        )}
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

      {/* Main layout: 1 col central o full width según prefiramos, propongo un ancho maximo holgado */}
      <div className="flex flex-col max-w-5xl mx-auto w-full">
        {/* Pestañas (Tabs) Navigation */}
        <div className="flex items-center gap-6 border-b mb-6" style={{ borderColor: '#1E2D1E' }}>
          <Link
            href={`/salidas/${id}?tab=generar`}
            className={`pb-3 text-sm font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              tab === 'generar'
                ? 'border-[#34D17E] text-[#34D17E]'
                : 'border-transparent text-[#6B8F71] hover:text-[#A3B8A6]'
            }`}
          >
            Generar Contenido
          </Link>
          <Link
            href={`/salidas/${id}?tab=datos`}
            className={`pb-3 text-sm font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              tab === 'datos'
                ? 'border-[#34D17E] text-[#34D17E]'
                : 'border-transparent text-[#6B8F71] hover:text-[#A3B8A6]'
            }`}
          >
            Datos de la Salida
          </Link>
        </div>

        {/* Contenido de la Pestaña Activa */}
        <div className="flex flex-col gap-6">
          {tab === 'datos' && (
            <div className="rounded-xl p-6" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
              <SalidaEditForm
                salida={salida as Salida}
                fotosRootFolderId={fotosFolderId}
                videosRootFolderId={videosFolderId}
              />
            </div>
          )}

          {tab === 'generar' && (
            <div className="flex flex-col gap-6">
              <div className="rounded-xl p-6" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
                {isCompletada ? (
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    <p className="text-[#F0FFF4] font-medium mb-2">Viaje completado</p>
                    <p className="text-sm text-[#6B8F71] max-w-md">
                      No podés generar contenido nuevo para una salida con fecha pasada. Si es un error o el viaje se reprogramó, actualizá la fecha en la pestaña &quot;Datos de la Salida&quot;.
                    </p>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {contenidoCount > 0 && (
                <Link
                  href="/calendario"
                  className="rounded-xl p-5 flex items-center gap-3 transition-colors hover:bg-white/5"
                  style={{ backgroundColor: 'rgba(52,209,126,0.05)', border: '1px solid rgba(52,209,126,0.15)' }}
                >
                  <FileText className="w-5 h-5 shrink-0" style={{ color: '#34D17E' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#34D17E' }}>
                      {contenidoCount} {contenidoCount === 1 ? 'pieza generada' : 'piezas generadas'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#4A6B4A' }}>Ver y editar contenido en calendario →</p>
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
