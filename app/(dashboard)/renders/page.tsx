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
        <h1 className="text-xl font-bold" style={{ color: 'var(--tinta)' }}>Contenido generado</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--piedra)' }}>
          Revisá las piezas listas, abrí cada carrusel y descargá sus slides.
        </p>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)' }}>
        <RendersSection />
      </div>
    </div>
  )
}
