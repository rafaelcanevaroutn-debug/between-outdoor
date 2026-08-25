import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDriveClient, downloadFileContent } from '@/lib/google-drive'

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

    // Optimización: Intentar obtener la miniatura optimizada de Drive
    // en lugar de descargar el archivo binario completo.
    try {
      const drive = getDriveClient()
      const meta = await drive.files.get({
        fileId,
        fields: 'thumbnailLink',
        supportsAllDrives: true,
      })

      if (meta.data.thumbnailLink) {
        // Reemplazar el tamaño por defecto (=s220) por algo de mejor calidad (=s1000)
        const highResUrl = meta.data.thumbnailLink.replace(/=s\d+/, '=s1000')

        const response = await fetch(highResUrl)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          return new NextResponse(arrayBuffer as unknown as BodyInit, {
            headers: {
              'Content-Type': response.headers.get('content-type') || 'image/jpeg',
              // Cache agresivo ya que es un proxy
              'Cache-Control': 'public, max-age=3600, s-maxage=86400',
            },
          })
        }
      }
    } catch (e) {
      console.warn(`[FOTOS/THUMBNAIL] No se pudo obtener thumbnailLink para ${fileId}, cayendo en fallback.`)
    }

    // Fallback: descargar archivo binario completo si falla lo de arriba
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
