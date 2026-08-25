import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateFolder } from '@/lib/google-drive'
import FotosGallery from '@/components/fotos/FotosGallery'

export default async function FotosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: branding } = await admin
    .from('brand_identity')
    .select('drive_folder_id, fotos_folder_id')
    .eq('user_id', user!.id)
    .single()

  // Sin carpeta de cliente en Drive — el onboarding de Mi Marca no se completó
  if (!branding?.drive_folder_id) {
    return (
      <div style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 className="page-title" style={{ margin: '0 0 6px' }}>
            Banco de Imágenes
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

  // Auto-crear "banco de imagenes/" si no existe todavía
  let fotosFolderId = branding.fotos_folder_id?.trim() || null
  if (!fotosFolderId) {
    try {
      fotosFolderId = await getOrCreateFolder(branding.drive_folder_id, 'banco de imagenes')
      await admin
        .from('brand_identity')
        .update({ fotos_folder_id: fotosFolderId })
        .eq('user_id', user!.id)
    } catch (err) {
      console.error('[FOTOS/PAGE] Error creando banco de imagenes:', err)
    }
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">Banco de imágenes</h1>
        <p className="page-subtitle mt-2">
          Organizá tus fotos y videos por carpeta para usarlos en los carruseles.
        </p>
      </div>

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
