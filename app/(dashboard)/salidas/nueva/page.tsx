import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SalidaForm from '@/components/salidas/SalidaForm'

export default async function NuevaSalidaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: branding } = await admin
    .from('brand_identity')
    .select('fotos_folder_id, videos_folder_id')
    .eq('user_id', user.id)
    .single()

  const fotosRootFolderId = branding?.fotos_folder_id?.trim() || null
  const videosRootFolderId = branding?.videos_folder_id?.trim() || null

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/salidas"
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-[var(--blanco-piedra)] border border-[var(--linea)] hover:bg-[var(--cardon-tenue)] text-[var(--piedra)] hover:text-[var(--cardon)]"
            aria-label="Volver a salidas"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--tinta)] tracking-tight">Nueva salida</h1>
            <p className="text-sm text-[var(--piedra)] mt-0.5">Cargá los datos reales que Between va a usar en el contenido.</p>
          </div>
        </div>
      </div>

      <SalidaForm
        fotosRootFolderId={fotosRootFolderId}
        videosRootFolderId={videosRootFolderId}
      />
    </div>
  )
}
