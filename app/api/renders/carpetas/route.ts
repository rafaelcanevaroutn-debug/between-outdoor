import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listRenderCarpetas } from '@/lib/google-drive'

export const maxDuration = 30

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: branding } = await createAdminClient()
      .from('brand_identity')
      .select('drive_folder_id')
      .eq('user_id', user.id)
      .single()

    const rootFolderId = branding?.drive_folder_id
    if (!rootFolderId) {
      return NextResponse.json({ carpetas: [], error: 'Sin carpeta Drive configurada' })
    }

    const { searchParams } = new URL(request.url)
    const pageToken = searchParams.get('pageToken') ?? undefined

    const { carpetas, nextPageToken } = await listRenderCarpetas(rootFolderId, pageToken)
    return NextResponse.json({ carpetas, nextPageToken })
  } catch (err) {
    console.error('[RENDERS/CARPETAS]', err)
    return NextResponse.json({ error: 'Error al listar carruseles' }, { status: 500 })
  }
}
