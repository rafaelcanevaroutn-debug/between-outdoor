import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateFolder } from '@/lib/google-drive'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient()
    const { data: branding } = await admin
      .from('brand_identity')
      .select('drive_folder_id, fotos_folder_id')
      .eq('user_id', user.id)
      .single()

    if (!branding?.drive_folder_id) {
      return NextResponse.json(
        { error: 'Primero completá el onboarding en Mi Marca para crear tu carpeta en Drive.' },
        { status: 404 },
      )
    }

    // Cache hit — evita un round-trip a Drive en cada visita
    if (branding.fotos_folder_id) {
      return NextResponse.json({ folderId: branding.fotos_folder_id })
    }

    // Crear/encontrar "banco de imagenes/" dentro de la carpeta del cliente
    const folderId = await getOrCreateFolder(branding.drive_folder_id, 'banco de imagenes')

    await admin
      .from('brand_identity')
      .update({ fotos_folder_id: folderId })
      .eq('user_id', user.id)

    return NextResponse.json({ folderId })
  } catch (err) {
    console.error('[BANCO-ROOT]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al inicializar banco de imágenes' },
      { status: 500 },
    )
  }
}
