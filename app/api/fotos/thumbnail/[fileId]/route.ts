import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDriveClient, downloadFileContent } from '@/lib/google-drive'

const TRANSPARENT_PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
type CachedThumbnail = {buffer: Buffer; contentType: string; cachedAt: number}

const runtimeCache = globalThis as typeof globalThis & {
  __betweenThumbnailCache?: Map<string, CachedThumbnail>
  __betweenThumbnailInflight?: Map<string, Promise<CachedThumbnail>>
}
const thumbnailCache = runtimeCache.__betweenThumbnailCache ??= new Map()
const thumbnailInflight = runtimeCache.__betweenThumbnailInflight ??= new Map()
const THUMBNAIL_CACHE_MS = 30 * 60 * 1000
const MAX_CACHED_THUMBNAILS = 48

function rememberThumbnail(fileId: string, value: CachedThumbnail) {
  thumbnailCache.delete(fileId)
  thumbnailCache.set(fileId, value)
  while (thumbnailCache.size > MAX_CACHED_THUMBNAILS) {
    const oldestKey = thumbnailCache.keys().next().value
    if (!oldestKey) break
    thumbnailCache.delete(oldestKey)
  }
}

async function loadThumbnail(fileId: string): Promise<CachedThumbnail> {
  const cached = thumbnailCache.get(fileId)
  if (cached && Date.now() - cached.cachedAt < THUMBNAIL_CACHE_MS) {
    rememberThumbnail(fileId, cached)
    return cached
  }

  const inflight = thumbnailInflight.get(fileId)
  if (inflight) return inflight

  const request = (async () => {
    try {
      const drive = getDriveClient()
      const meta = await drive.files.get({
        fileId,
        fields: 'thumbnailLink',
        supportsAllDrives: true,
      })

      if (meta.data.thumbnailLink) {
        const highResUrl = meta.data.thumbnailLink.replace(/=s\d+/, '=s1000')
        const response = await fetch(highResUrl)
        if (response.ok) {
          return {
            buffer: Buffer.from(await response.arrayBuffer()),
            contentType: response.headers.get('content-type') || 'image/jpeg',
            cachedAt: Date.now(),
          }
        }
      }
    } catch {
      console.warn(`[FOTOS/THUMBNAIL] No se pudo obtener thumbnailLink para ${fileId}, cayendo en fallback.`)
    }

    const {buffer, contentType} = await downloadFileContent(fileId)
    return {buffer, contentType, cachedAt: Date.now()}
  })()

  thumbnailInflight.set(fileId, request)
  try {
    const result = await request
    rememberThumbnail(fileId, result)
    return result
  } finally {
    thumbnailInflight.delete(fileId)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const strict = request.nextUrl.searchParams.get('strict') === '1'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse(TRANSPARENT_PIXEL as unknown as BodyInit, { headers: { 'Content-Type': 'image/png' } })

    const { fileId } = await params

    const {buffer, contentType} = await loadThumbnail(fileId)

    if (!buffer || buffer.length === 0) {
      console.warn(`[FOTOS/THUMBNAIL] Empty buffer received for fileId: ${fileId}`)
      if (strict) return new NextResponse('Miniatura vacía', {status: 502})
      return new NextResponse(TRANSPARENT_PIXEL as unknown as BodyInit, { headers: { 'Content-Type': 'image/png' } })
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        // El fileId de un render es inmutable. Cache privado para no compartir
        // contenido autenticado entre usuarios, pero persistente en el navegador.
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  } catch (err: any) {
    console.error(`[FOTOS/THUMBNAIL] Error loading image:`, err?.message || err)
    if (request.nextUrl.searchParams.get('strict') === '1') {
      return new NextResponse('No se pudo cargar la miniatura', {status: 502})
    }
    return new NextResponse(TRANSPARENT_PIXEL as unknown as BodyInit, { headers: { 'Content-Type': 'image/png' } })
  }
}
