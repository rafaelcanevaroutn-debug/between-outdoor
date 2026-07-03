import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { downloadFileContent } from '@/lib/google-drive'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('No autorizado', { status: 401 })

    const { fileId } = await params
    const filename = req.nextUrl.searchParams.get('filename') ?? `slide_${fileId}.png`

    const { buffer, contentType } = await downloadFileContent(fileId)

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (err) {
    console.error('[RENDERS/SLIDE/DOWNLOAD]', err)
    return new NextResponse('Error al descargar slide', { status: 500 })
  }
}
