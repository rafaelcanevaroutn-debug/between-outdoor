import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'
import type { Profile } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // RLS: user sees own profile; admin sees all (but eq narrows to self here)
  const [{ data: profile }, { count: salidaCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('salidas').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0A0F0A' }}>
      <Sidebar
        profile={profile as Profile}
        salidaCount={salidaCount ?? 0}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div style={{ padding: '22px 26px 44px' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
