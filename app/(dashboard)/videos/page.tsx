import { createClient } from '@/lib/supabase/server'
import { ensureClientDriveFolders } from '@/lib/google-drive'
import FotosGallery from '@/components/fotos/FotosGallery'

export default async function VideosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Asegura que las carpetas del cliente en Drive existan automáticamente
  const folders = await ensureClientDriveFolders(user.id)
  const videosFolderId = folders.videos_folder_id

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Videos</h1>
        <p className="page-subtitle mt-2">
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
