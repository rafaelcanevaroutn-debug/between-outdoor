import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { downloadFileContent } from '@/lib/google-drive'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('No autorizado', { status: 401 })

    const { fileId } = await params
    const { buffer, contentType } = await downloadFileContent(fileId)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        // Cache 5 min en browser, 10 min en CDN — las fotos no cambian seguido
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    })
  } catch (err) {
    console.error('[FOTOS/THUMBNAIL]', err)
    return new NextResponse('Error al cargar imagen', { status: 500 })
  }
}
