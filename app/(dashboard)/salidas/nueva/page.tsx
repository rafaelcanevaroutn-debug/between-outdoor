import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import NuevaSalidaForm from '@/components/salidas/NuevaSalidaForm'

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
    <NuevaSalidaForm
      fotosRootFolderId={fotosRootFolderId}
      videosRootFolderId={videosRootFolderId}
    />
  )
}
