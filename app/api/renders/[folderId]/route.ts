import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteDriveFile, isFolderWithinRoot } from '@/lib/google-drive'

export const maxDuration = 30

export async function DELETE(
  request: Request,
  context: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: branding } = await createAdminClient()
      .from('brand_identity')
      .select('drive_folder_id')
      .eq('user_id', user.id)
      .single()

    const rootFolderId = branding?.drive_folder_id
    if (!rootFolderId) {
      return NextResponse.json({ error: 'Sin carpeta Drive configurada' }, { status: 400 })
    }

    // Seguridad: verificar que la carpeta pertenece a este usuario
    const isWithin = await isFolderWithinRoot(folderId, rootFolderId)
    if (!isWithin) {
      return NextResponse.json({ error: 'Carpeta no encontrada o no pertenece al usuario' }, { status: 403 })
    }

    await deleteDriveFile(folderId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(`[RENDERS/DELETE]`, err)
    return NextResponse.json({ error: 'Error al eliminar el render' }, { status: 500 })
  }
}
