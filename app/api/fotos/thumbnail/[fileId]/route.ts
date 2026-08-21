import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { downloadFileContent } from '@/lib/google-drive'

const TRANSPARENT_PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse(TRANSPARENT_PIXEL as unknown as BodyInit, { headers: { 'Content-Type': 'image/png' } })

    const { fileId } = await params
    const { buffer, contentType } = await downloadFileContent(fileId)

    if (!buffer || buffer.length === 0) {
      console.warn(`[FOTOS/THUMBNAIL] Empty buffer received for fileId: ${fileId}`)
      return new NextResponse(TRANSPARENT_PIXEL as unknown as BodyInit, { headers: { 'Content-Type': 'image/png' } })
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        // Cache 5 min en browser, 10 min en CDN — las fotos no cambian seguido
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    })
  } catch (err: any) {
    console.error(`[FOTOS/THUMBNAIL] Error loading image:`, err?.message || err)
    return new NextResponse(TRANSPARENT_PIXEL as unknown as BodyInit, { headers: { 'Content-Type': 'image/png' } })
  }
}
