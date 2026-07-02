import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listSubfoldersPublic, createDriveFolder, deleteDriveFile } from '@/lib/google-drive'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const folderId = request.nextUrl.searchParams.get('folderId')
    if (!folderId) return NextResponse.json({ error: 'folderId requerido' }, { status: 400 })

    const folders = await listSubfoldersPublic(folderId)
    return NextResponse.json({ folders })
  } catch (err) {
    console.error('[FOTOS/CARPETAS GET]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al listar carpetas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { parentId, name } = await request.json()
    if (!parentId) return NextResponse.json({ error: 'parentId requerido' }, { status: 400 })
    if (!name?.trim()) return NextResponse.json({ error: 'name requerido' }, { status: 400 })

    const folder = await createDriveFolder(parentId, name.trim())
    return NextResponse.json({ folder })
  } catch (err) {
    console.error('[FOTOS/CARPETAS POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al crear carpeta' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const folderId = request.nextUrl.searchParams.get('folderId')
    if (!folderId) return NextResponse.json({ error: 'folderId requerido' }, { status: 400 })

    await deleteDriveFile(folderId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[FOTOS/CARPETAS DELETE]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al eliminar carpeta' }, { status: 500 })
  }
}
