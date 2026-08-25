import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Sparkles, FileText, Calendar, DollarSign, Users, RefreshCw } from 'lucide-react'
import { formatFechaSalida } from '@/lib/utils/dates'
import { getOrCreateFolder } from '@/lib/google-drive'
import SalidaForm from '@/components/salidas/SalidaForm'
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
  }
) {
  const { id } = await props.params
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
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors bg-[var(--nieve)] border border-[var(--linea)] text-[var(--piedra)] hover:text-[var(--tinta)] hover:bg-[var(--blanco-piedra)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs px-2 py-0.5 rounded font-medium bg-[var(--linea)] text-[var(--piedra)]"
            >
              {TIPO_LABELS[salida.tipo_viaje] || salida.tipo_viaje}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${salida.estado === 'activa' ? 'bg-[var(--cardon-tenue)] text-[var(--cardon)]' : 'bg-[var(--linea)] text-[var(--piedra)]'}`}
            >
              {salida.estado}
            </span>
          </div>
          <h1 className="text-xl font-bold truncate text-[var(--tinta)] font-['Bricolage_Grotesque',_sans-serif]">{salida.nombre}</h1>
          <p className="text-sm text-[var(--piedra)]">{salida.destino}</p>
        </div>
        {contenidoCount > 0 && (
          <Link
            href="/calendario"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0 bg-[var(--nieve)] text-[var(--cardon)] border border-[var(--linea)] hover:bg-[var(--cardon-tenue)] transition-colors"
          >
            <FileText className="w-4 h-4" />
            Ver contenido ({contenidoCount})
          </Link>
        )}
      </div>

      {/* Recurrente: banner de horario */}
      {isRecurrente && (
        <div className="rounded-xl px-5 py-4 flex items-center gap-3 bg-[var(--cardon-tenue)] border border-[var(--cardon)]/20">
          <RefreshCw className="w-4 h-4 shrink-0 text-[var(--cardon)]" />
          <p className="text-sm text-[var(--cardon)]">
            {formatRecurrente(salida as Salida)}
          </p>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-col mx-auto w-full max-w-2xl">
        <SalidaForm
          salida={salida as Salida}
          fotosRootFolderId={fotosFolderId}
          videosRootFolderId={videosFolderId}
        />
      </div>
    </div>
  )
}
