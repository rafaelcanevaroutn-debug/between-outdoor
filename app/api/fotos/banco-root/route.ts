import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureClientDriveFolders } from '@/lib/google-drive'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const folders = await ensureClientDriveFolders(user.id)
    if (!folders.fotos_folder_id) {
      return NextResponse.json(
        { error: 'No se pudo inicializar la carpeta en Drive' },
        { status: 500 },
      )
    }

    return NextResponse.json({ folderId: folders.fotos_folder_id })
  } catch (err) {
    console.error('[BANCO-ROOT]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al inicializar banco de imágenes' },
      { status: 500 },
    )
  }
}
