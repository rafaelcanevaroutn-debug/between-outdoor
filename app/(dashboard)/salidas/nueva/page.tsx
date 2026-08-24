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
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-[#111A11] border border-[#1E2D1E] hover:bg-[#1a291a] text-[#6B8F71] hover:text-[#F0FFF4]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#F0FFF4] tracking-tight">Nueva Salida</h1>
            <p className="text-sm text-[#6B8F71] mt-0.5">Completá los datos básicos para crearla</p>
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
