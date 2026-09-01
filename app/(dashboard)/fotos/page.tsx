import { createClient } from '@/lib/supabase/server'
import { ensureClientDriveFolders } from '@/lib/google-drive'
import FotosGallery from '@/components/fotos/FotosGallery'

export default async function FotosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Asegura que las carpetas del cliente en Drive existan automáticamente
  const folders = await ensureClientDriveFolders(user.id)
  const fotosFolderId = folders.fotos_folder_id

  return (
    <div style={{ maxWidth: 1100 }}>

      {!fotosFolderId ? (
        <div style={{
          padding: '32px 24px', borderRadius: 16, textAlign: 'center',
          border: '1px solid var(--linea)', background: 'var(--nieve)',
        }}>
          <p style={{ fontSize: 14, color: 'var(--tinta)', margin: 0 }}>
            No se pudo inicializar el banco de imágenes. Intentá recargar la página.
          </p>
        </div>
      ) : (
        <FotosGallery rootFolderId={fotosFolderId} />
      )}
    </div>
  )
}
