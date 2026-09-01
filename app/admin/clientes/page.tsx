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



export default async function ClientesPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const page = searchParams?.page ? parseInt(searchParams.page as string) : 1
  const pageSize = 10
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  // Get total count for pagination
  const { count: totalClientes } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'client')

  const totalPages = Math.ceil((totalClientes ?? 0) / pageSize)

  // Get paginated client profiles
  const { data: clientes } = await admin
    .from('profiles')
    .select('id, full_name, company_name, niche, calendario_asignado, created_at')
    .eq('role', 'client')
    .order('created_at', { ascending: false })
    .range(from, to)

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
    <div className="flex w-full flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="page-title">
            Clientes
          </h2>
          <p className="page-subtitle mt-1">
            {totalClientes ?? 0} cliente{(totalClientes ?? 0) !== 1 ? 's' : ''} activo{(totalClientes ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <NuevoClienteForm />
      </div>

      {/* Table */}
      {!clientes || clientes.length === 0 ? (
        <div
          className="surface-card"
          style={{
            border: '1px dashed var(--piedra-clara)',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 14, color: 'var(--piedra)', margin: 0 }}>
            No hay clientes todavÃ­a. CreÃ¡ el primero.
          </p>
        </div>
      ) : (
        <div className="surface-card">
          <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--nieve)', borderBottom: '1px solid var(--linea)' }}>
              <tr>
                {['Cliente', 'Email', 'Nicho', 'Salidas', 'Calendario', 'Perfil comercial', 'Redes', 'Gestión'].map(h => (
                  <th key={h} className="eyebrow" style={{ padding: '12px 20px', margin: 0, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
          {clientes.map((c, i) => {
            const email = emailMap[c.id] ?? 'â€”'
            const count = countMap[c.id] ?? 0
            const niche = c.niche ?? 'trekking'
            const colors = NICHE_COLORS[niche] ?? NICHE_COLORS.trekking
            const displayName = c.company_name || c.full_name || 'â€”'
            const initials = (c.full_name || c.company_name || '?')
              .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

            return (
              <tr
                key={c.id}
                style={{
                  background: i % 2 === 0 ? 'var(--nieve)' : 'var(--blanco-piedra)',
                  borderBottom: i < clientes.length - 1 ? '1px solid var(--linea)' : 'none',
                }}
              >
                {/* Name + avatar */}
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--cardon-tenue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--cardon-oscuro)',
                    flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tinta)' }}>{displayName}</div>
                    {c.company_name && c.full_name && (
                      <div style={{ fontSize: 11, color: 'var(--piedra)' }}>{c.full_name}</div>
                    )}
                  </div>
                </div>
                </td>

                {/* Email */}
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: 13, color: 'var(--piedra)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                    {email}
                  </div>
                </td>

                {/* Niche badge */}
                <td style={{ padding: '14px 20px' }}>
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
                </td>

                {/* Salida count */}
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: count > 0 ? 'var(--tinta)' : 'var(--piedra)' }}>
                    {count}
                  </div>
                </td>

                {/* Assigned editorial calendar */}
                <td style={{ padding: '14px 20px' }}>
                  <CalendarAssignmentPopover
                  clientId={c.id}
                  initialCalendar={(c.calendario_asignado ?? 'CAL-00') as CalendarCode}
                  />
                </td>

                <td style={{ padding: '14px 20px' }}>
                  <CommercialProfilePopover
                    clientId={c.id}
                    initialProfile={(onboardingMap.get(c.id)?.content_profile ?? 'standard_outdoor') as ContentProfileCode}
                    initialContext={(onboardingMap.get(c.id)?.campaign_context ?? {}) as CampaignContext}
                  />
                </td>

                <td style={{ padding: '14px 20px' }}>
                  <ZernioConnectionPopover clientId={c.id} />
                </td>

                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Link
                    href={`/admin/clientes/${c.id}/disenos`}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--tinta)',
                      border: '1px solid var(--piedra-clara)',
                      background: 'var(--nieve)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      textDecoration: 'none',
                    }}
                  >
                    Diseños
                  </Link>
                  <Link
                    href={`/admin/clientes/${c.id}/calendario`}
                    style={{ fontSize: 10, fontWeight: 650, color: 'var(--piedra)', textDecoration: 'none' }}
                  >
                    Semana
                  </Link>
                </div>
                </td>
              </tr>
            )
          })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 mt-4 px-2">
          <div className="text-sm" style={{ color: 'var(--piedra)' }}>
            Mostrando {from + 1} a {Math.min(to + 1, totalClientes ?? 0)} de {totalClientes}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/clientes?page=${page - 1}`} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}>
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/admin/clientes?page=${page + 1}`} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13 }}>
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
