import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listImagesInFolder, deleteDriveFile } from '@/lib/google-drive'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const folderId  = request.nextUrl.searchParams.get('folderId')
    const pageToken = request.nextUrl.searchParams.get('pageToken') ?? undefined
    if (!folderId) return NextResponse.json({ error: 'folderId requerido' }, { status: 400 })

    const result = await listImagesInFolder(folderId, 50, pageToken)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[FOTOS/ARCHIVOS GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al listar archivos' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const fileId = request.nextUrl.searchParams.get('fileId')
    if (!fileId) return NextResponse.json({ error: 'fileId requerido' }, { status: 400 })

    await deleteDriveFile(fileId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[FOTOS/ARCHIVOS DELETE]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al eliminar archivo' }, { status: 500 })
  }
}
