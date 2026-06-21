import { createAdminClient, DEMO_PROFILE, DEMO_USER_ID } from '@/lib/supabase/admin'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'
import type { Profile } from '@/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createAdminClient()

  const [{ data: profile }, { count: salidaCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', DEMO_USER_ID).single(),
    supabase.from('salidas').select('*', { count: 'exact', head: true }).eq('user_id', DEMO_USER_ID),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0A0F0A' }}>
      <Sidebar
        profile={(profile as Profile | null) ?? DEMO_PROFILE as unknown as Profile}
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
