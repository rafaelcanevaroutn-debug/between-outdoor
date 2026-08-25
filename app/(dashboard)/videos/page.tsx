import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateFolder } from '@/lib/google-drive'
import FotosGallery from '@/components/fotos/FotosGallery'

export default async function VideosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: branding } = await admin
    .from('brand_identity')
    .select('drive_folder_id, videos_folder_id')
    .eq('user_id', user!.id)
    .single()

  // Sin carpeta de cliente en Drive — el onboarding de Mi Marca no se completó
  if (!branding?.drive_folder_id) {
    return (
      <div style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--tinta)', margin: '0 0 4px', letterSpacing: '-.02em' }}>
            Videos
          </h1>
        </div>
        <div style={{
          padding: '32px 24px', borderRadius: 16, textAlign: 'center',
          border: '1px solid var(--linea)', background: 'var(--blanco-piedra)', boxShadow: 'var(--sombra-reposo)',
        }}>
          <p style={{ fontSize: 14, color: 'var(--tinta)', margin: '0 0 8px' }}>
            Primero completá el onboarding en Mi Marca.
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--piedra)', margin: 0 }}>
            Necesitamos crear tu carpeta en Drive antes de poder subir material.
          </p>
        </div>
      </div>
    )
  }

  // Auto-crear "videos crudos" si no existe todavía
  let videosFolderId = branding.videos_folder_id?.trim() || null
  if (!videosFolderId) {
    try {
      videosFolderId = await getOrCreateFolder(branding.drive_folder_id, 'videos crudos')
      await admin
        .from('brand_identity')
        .update({ videos_folder_id: videosFolderId })
        .eq('user_id', user!.id)
    } catch (err) {
      console.error('[VIDEOS/PAGE] Error creando videos crudos:', err)
    }
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="text-xl font-bold" style={{ color: 'var(--tinta)' }}>Videos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--piedra)' }}>
          Organizá tus videos por carpeta para usarlos en la generación.
        </p>
      </div>

      {!videosFolderId ? (
        <div style={{
          padding: '32px 24px', borderRadius: 16, textAlign: 'center',
          border: '1px solid var(--linea)', background: 'var(--blanco-piedra)', boxShadow: 'var(--sombra-reposo)',
        }}>
          <p style={{ fontSize: 14, color: 'var(--tinta)', margin: 0 }}>
            No se pudo inicializar la carpeta de videos. Intentá recargar la página.
          </p>
        </div>
      ) : (
        <FotosGallery rootFolderId={videosFolderId} type="videos" />
      )}
    </div>
  )
}
