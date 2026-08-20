import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NICHE_LABELS } from '@/lib/constants'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { WeeklyActionCard } from '@/components/dashboard/WeeklyActionCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario'
  const nicheLabel = profile?.niche ? (NICHE_LABELS[profile.niche] ?? profile.niche) : 'Trekking'

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', minHeight: '72vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .manual-link { transition: border-color .14s, color .14s; }
        .manual-link:hover { border-color: rgba(92,230,160,.3) !important; color: #EAF2EC !important; }
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 0' }}>

        <DashboardHeader firstName={firstName} nicheLabel={nicheLabel} />

        <WeeklyActionCard />

      </div>
    </div>
  )
}
