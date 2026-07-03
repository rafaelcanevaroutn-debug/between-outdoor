import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RendersSection from '@/components/renders/RendersSection'

export default async function RendersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#F0FFF4' }}>Contenido generado</h1>
        <p className="text-sm mt-1" style={{ color: '#6B8F71' }}>
          Carruseles renderizados por Mati — hacé click para ver los slides y descargar
        </p>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
        <RendersSection />
      </div>
    </div>
  )
}
