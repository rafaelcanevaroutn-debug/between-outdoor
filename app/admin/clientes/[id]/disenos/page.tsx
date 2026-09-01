import Link from 'next/link'
import { notFound } from 'next/navigation'
import ClientCalendarDesignStudio from '@/components/admin/ClientCalendarDesignStudio'
import { CALENDAR_CATALOG } from '@/lib/calendar-catalog'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CalendarCode } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ClientDesignsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, company_name, calendario_asignado')
    .eq('id', clientId)
    .maybeSingle()

  if (!profile) notFound()

  const calendarCode = (profile.calendario_asignado ?? 'CAL-00') as CalendarCode
  const calendar = CALENDAR_CATALOG[calendarCode] ?? CALENDAR_CATALOG['CAL-00']
  const clientName = profile.company_name || profile.full_name || 'Cliente'

  return (
    <div style={{ maxWidth: 1180, display: 'grid', gap: 22 }}>
      <div>
        <Link href="/admin/clientes" className="text-piedra font-semibold" style={{ textDecoration: 'none', fontSize: 14 }}>
          ← Clientes
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
          <div>
            <p className="eyebrow" style={{ color: 'var(--cardon)', margin: 0 }}>Diseños del cliente</p>
            <h2 className="font-display font-semibold text-3xl" style={{ margin: '3px 0 0' }}>{clientName}</h2>
            <p className="text-piedra" style={{ fontSize: 15, margin: '4px 0 0' }}>Definí su calendario visual: qué diseños usa cada tema y cómo se ven sus videos.</p>
          </div>
          <Link href={`/admin/clientes/${clientId}/calendario`} style={{ color: 'var(--piedra)', border: '1px solid var(--linea)', borderRadius: 9, padding: '8px 11px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
            Ver semana generada
          </Link>
        </div>
      </div>

      <ClientCalendarDesignStudio
        clientId={clientId}
        clientName={clientName}
        calendarCode={calendar.code}
        calendarName={calendar.nombre}
      />
    </div>
  )
}
