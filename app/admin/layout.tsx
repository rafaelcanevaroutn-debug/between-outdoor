import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import Topbar from '@/components/dashboard/Topbar'
import type { Profile } from '@/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { count: salidaCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('salidas').select('*', { count: 'exact', head: true }),
  ])

  // Solo admin puede acceder a rutas /admin
  if (profile?.role !== 'admin') redirect('/salidas')

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--nieve)' }}>
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
