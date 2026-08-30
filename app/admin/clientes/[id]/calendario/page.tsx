import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { CALENDAR_CATALOG } from '@/lib/calendar-catalog'
import WeeklyBatchPanel from '@/components/calendario/WeeklyBatchPanel'
import SemanaGenerada from '@/components/calendario/SemanaGenerada'
import type { CalendarBatchRun, CalendarCode } from '@/types'

export const dynamic = 'force-dynamic'

function isActiveRun(run: CalendarBatchRun | null) {
  return run?.status === 'pending' || run?.status === 'running'
}

export default async function ClientCalendarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
  const admin = createAdminClient()

  const [{ data: profile }, { data: runRows }, { data: salidasForPicker }] = await Promise.all([
    admin.from('profiles').select('id, full_name, company_name, calendario_asignado').eq('id', clientId).maybeSingle(),
    admin.from('calendar_batch_runs').select('*').eq('user_id', clientId).order('created_at', { ascending: false }).limit(5),
    admin.from('salidas').select('id, nombre, fecha_inicio, estado, tipo_viaje, carpeta_fotos_id, carpeta_videos_id').eq('user_id', clientId).order('fecha_inicio'),
  ])

  if (!profile) notFound()

  const calendarCode = (profile.calendario_asignado ?? 'CAL-00') as CalendarCode
  const calendar = CALENDAR_CATALOG[calendarCode]
  const runs = (runRows ?? []) as CalendarBatchRun[]
  const latestRun = runs[0] ?? null
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const startOfWeek = new Date(now.setDate(diff))
  startOfWeek.setHours(0, 0, 0, 0)

  const latestCompletedRun = runs.find(r => {
    if (r.status !== 'completed' || !r.result) return false
    const runDate = new Date(r.created_at)
    return runDate >= startOfWeek
  }) ?? null

  let verifiedRunToDisplay: CalendarBatchRun | null = null

  if (latestCompletedRun) {
    const contenidoIds = (latestCompletedRun.result?.slots ?? [])
      .filter(slot => slot.outcome === 'generated' && Boolean(slot.contenidoId))
      .map(slot => slot.contenidoId as string)

    if (contenidoIds.length > 0) {
      const { count } = await admin
        .from('contenido_generado')
        .select('*', { count: 'exact', head: true })
        .in('id', contenidoIds)

      if (count && count > 0) {
        verifiedRunToDisplay = latestCompletedRun
      }
    }
  }

  const displayName = profile.company_name || profile.full_name || 'Cliente'

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Link href="/admin/clientes" style={{ fontSize: 12, fontWeight: 600, color: '#7E9286', textDecoration: 'none' }}>
            ← Clientes
          </Link>
          <Link href={`/admin/clientes/${clientId}/disenos`} style={{ fontSize: 11, fontWeight: 700, color: '#34D17E', textDecoration: 'none' }}>
            Administrar diseños →
          </Link>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#EAF2EC', letterSpacing: '-.02em', margin: '6px 0 0' }}>
          Semana de {displayName}
        </h2>
        <p style={{ fontSize: 13, color: '#7E9286', margin: '3px 0 0' }}>
          Calendario {calendar.nombre} — mismo panel que ve el cliente, generando (si corresponde) para su cuenta, no la tuya.
        </p>
      </div>

      {verifiedRunToDisplay && !isActiveRun(latestRun) ? (
        <SemanaGenerada latestRun={verifiedRunToDisplay} />
      ) : (
        <WeeklyBatchPanel
          calendarCode={calendarCode}
          calendarName={calendar.nombre}
          initialRun={latestRun}
          salidas={salidasForPicker ?? []}
          clientId={clientId}
        />
      )}
    </div>
  )
}
