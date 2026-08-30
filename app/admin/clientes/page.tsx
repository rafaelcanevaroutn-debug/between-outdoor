import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import NuevoClienteForm from '@/components/admin/NuevoClienteForm'
import CalendarAssignmentPopover from '@/components/admin/CalendarAssignmentPopover'
import ZernioConnectionPopover from '@/components/admin/ZernioConnectionPopover'
import CommercialProfilePopover from '@/components/admin/CommercialProfilePopover'
import type { CalendarCode, CampaignContext, ContentProfileCode } from '@/types'

const NICHE_LABELS: Record<string, string> = {
  trekking: 'Trekking',
  running: 'Running',
  ciclismo: 'Ciclismo',
  turismo_aventura: 'Turismo Aventura',
}

const NICHE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  trekking:        { bg: 'rgba(62, 92, 72, .1)',  text: 'var(--cardon)', border: 'rgba(62, 92, 72, .2)' },
  running:         { bg: 'rgba(251,146,60,.1)',   text: '#fb923c', border: 'rgba(251,146,60,.2)' },
  ciclismo:        { bg: 'rgba(96,165,250,.1)',   text: '#60a5fa', border: 'rgba(96,165,250,.2)' },
  turismo_aventura:{ bg: 'rgba(167,139,250,.1)',  text: '#a78bfa', border: 'rgba(167,139,250,.2)' },
}

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  // Get all client profiles
  const { data: clientes } = await admin
    .from('profiles')
    .select('id, full_name, company_name, niche, calendario_asignado, created_at')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  // Get salida counts per user in one query
  const { data: salidaCounts } = await admin
    .from('salidas')
    .select('user_id')

  const { data: onboardingRows } = await admin
    .from('client_onboarding')
    .select('user_id, content_profile, campaign_context')

  const onboardingMap = new Map((onboardingRows ?? []).map(row => [row.user_id, row]))

  const countMap: Record<string, number> = {}
  for (const row of salidaCounts ?? []) {
    countMap[row.user_id] = (countMap[row.user_id] ?? 0) + 1
  }

  // Get emails from auth.users via admin API
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap: Record<string, string> = {}
  for (const u of authUsers ?? []) {
    emailMap[u.id] = u.email ?? ''
  }

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#EAF2EC', letterSpacing: '-.02em', margin: 0 }}>
            Clientes
          </h2>
          <p style={{ fontSize: 13, color: '#7E9286', marginTop: 2 }}>
            {clientes?.length ?? 0} cliente{clientes?.length !== 1 ? 's' : ''} activo{clientes?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NuevoClienteForm />
      </div>

      {/* Table */}
      {!clientes || clientes.length === 0 ? (
        <div
          style={{
            borderRadius: 16,
            border: '1px dashed rgba(255,255,255,.08)',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 14, color: '#7E9286', margin: 0 }}>
            No hay clientes todavÃ­a. CreÃ¡ el primero.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto" style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,.06)' }}>
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(160px,1fr) minmax(160px,1fr) 105px 60px 140px 130px 110px 100px',
              minWidth: 1220,
              padding: '10px 20px',
              background: '#0A100B',
              borderBottom: '1px solid rgba(255,255,255,.06)',
              borderRadius: '16px 16px 0 0',
            }}
          >
            {['Cliente', 'Email', 'Nicho', 'Salidas', 'Calendario', 'Perfil comercial', 'Redes', 'Gestión'].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#445049', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {clientes.map((c, i) => {
            const email = emailMap[c.id] ?? 'â€”'
            const count = countMap[c.id] ?? 0
            const niche = c.niche ?? 'trekking'
            const colors = NICHE_COLORS[niche] ?? NICHE_COLORS.trekking
            const displayName = c.company_name || c.full_name || 'â€”'
            const initials = (c.full_name || c.company_name || '?')
              .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

            return (
              <div
                key={c.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(160px,1fr) minmax(160px,1fr) 105px 60px 140px 130px 110px 100px',
                  minWidth: 1220,
                  padding: '14px 20px',
                  alignItems: 'center',
                  background: i % 2 === 0 ? '#0D130E' : '#0B110C',
                  borderBottom: i < clientes.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                  borderRadius: i === clientes.length - 1 ? '0 0 16px 16px' : undefined,
                }}
              >
                {/* Name + avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,var(--cardon),#2FB3A0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#04130A',
                    flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#EAF2EC' }}>{displayName}</div>
                    {c.company_name && c.full_name && (
                      <div style={{ fontSize: 11, color: '#7E9286' }}>{c.full_name}</div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div style={{ fontSize: 13, color: '#7E9286', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
                  {email}
                </div>

                {/* Niche badge */}
                <div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                  }}>
                    {NICHE_LABELS[niche] ?? niche}
                  </span>
                </div>

                {/* Salida count */}
                <div style={{ fontSize: 13, fontWeight: 600, color: count > 0 ? '#EAF2EC' : '#445049' }}>
                  {count}
                </div>

                {/* Assigned editorial calendar */}
                <CalendarAssignmentPopover
                  clientId={c.id}
                  initialCalendar={(c.calendario_asignado ?? 'CAL-00') as CalendarCode}
                />

                <CommercialProfilePopover
                  clientId={c.id}
                  initialProfile={(onboardingMap.get(c.id)?.content_profile ?? 'standard_outdoor') as ContentProfileCode}
                  initialContext={(onboardingMap.get(c.id)?.campaign_context ?? {}) as CampaignContext}
                />

                <ZernioConnectionPopover clientId={c.id} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Link
                    href={`/admin/clientes/${c.id}/disenos`}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--cardon)',
                      border: '1px solid rgba(62,92,72,.3)',
                      background: 'rgba(62,92,72,.1)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      textDecoration: 'none',
                    }}
                  >
                    Diseños
                  </Link>
                  <Link
                    href={`/admin/clientes/${c.id}/calendario`}
                    style={{ fontSize: 10, fontWeight: 650, color: '#7E9286', textDecoration: 'none' }}
                  >
                    Semana
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
