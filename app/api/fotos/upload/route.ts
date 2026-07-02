import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToDrive } from '@/lib/google-drive'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const parentId = request.nextUrl.searchParams.get('parentId')
    const filename  = request.nextUrl.searchParams.get('filename')
    if (!parentId) return NextResponse.json({ error: 'parentId requerido' }, { status: 400 })
    if (!filename)  return NextResponse.json({ error: 'filename requerido' },  { status: 400 })

    const mimeType = request.headers.get('x-mime-type') || 'application/octet-stream'
    const buffer   = Buffer.from(await request.arrayBuffer())

    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: 'Archivo vacío' }, { status: 400 })
    }

    const result = await uploadToDrive(parentId, filename, buffer, mimeType)
    return NextResponse.json({ uploaded: [result], errors: [] })
  } catch (err) {
    console.error('[FOTOS/UPLOAD]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al subir archivo' },
      { status: 500 },
    )
  }
}
