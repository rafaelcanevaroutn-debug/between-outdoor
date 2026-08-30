import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDriveClient } from '@/lib/google-drive'

interface CachedVideoRange {
  expiresAt: number
  body: Buffer
  status: number
  headers: Record<string, string>
}

interface CachedVideoFile {
  expiresAt: number
  body: Buffer
  size: number
  contentType: string
  filename: string
}

const runtimeCache = globalThis as typeof globalThis & {
  __betweenVideoRangeCache?: Map<string, CachedVideoRange>
  __betweenVideoFileCache?: Map<string, CachedVideoFile>
}
const videoRangeCache = runtimeCache.__betweenVideoRangeCache ??= new Map()
const videoFileCache = runtimeCache.__betweenVideoFileCache ??= new Map()
const VIDEO_RANGE_CACHE_MS = 5 * 60 * 1000
const MAX_VIDEO_RANGE_CACHE_ENTRIES = 12
const VIDEO_FILE_CACHE_MS = 5 * 60 * 1000
const MAX_VIDEO_FILE_CACHE_ENTRIES = 4
const MAX_VIDEO_FILE_CACHE_BYTES = 80 * 1024 * 1024

function cachedVideoRange(key: string): CachedVideoRange | null {
  const cached = videoRangeCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    videoRangeCache.delete(key)
    return null
  }
  videoRangeCache.delete(key)
  videoRangeCache.set(key, cached)
  return cached
}

function rememberVideoRange(key: string, value: CachedVideoRange) {
  videoRangeCache.delete(key)
  videoRangeCache.set(key, value)
  while (videoRangeCache.size > MAX_VIDEO_RANGE_CACHE_ENTRIES) {
    const oldest = videoRangeCache.keys().next().value
    if (!oldest) break
    videoRangeCache.delete(oldest)
  }
}

function getCachedVideoFile(key: string): CachedVideoFile | null {
  const cached = videoFileCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    videoFileCache.delete(key)
    return null
  }
  videoFileCache.delete(key)
  videoFileCache.set(key, cached)
  return cached
}

function rememberVideoFile(key: string, value: CachedVideoFile) {
  videoFileCache.delete(key)
  videoFileCache.set(key, value)
  while (videoFileCache.size > MAX_VIDEO_FILE_CACHE_ENTRIES) {
    const oldest = videoFileCache.keys().next().value
    if (!oldest) break
    videoFileCache.delete(oldest)
  }
}

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'video.mp4'
}

function parseRange(value: string, size: number): {start: number; end: number} | null {
  const match = /^bytes=(\d+)-(\d*)$/u.exec(value)
  if (!match) return null
  const start = Number(match[1])
  const requestedEnd = match[2] ? Number(match[2]) : Math.min(start + 4 * 1024 * 1024 - 1, size - 1)
  const end = Math.min(requestedEnd, size - 1)
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) return null
  return {start, end}
}

export async function GET(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})

  const {data: callerProfile} = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const admin = createAdminClient()
  const {data: row} = await admin.from('contenido_generado')
    .select('id,user_id,formato,titulo,render_status,render_folder_id')
    .eq('id', id)
    .maybeSingle()
  if (!row) return NextResponse.json({error: 'Video no encontrado'}, {status: 404})
  if (callerProfile?.role !== 'admin' && row.user_id !== user.id) {
    return NextResponse.json({error: 'No autorizado'}, {status: 403})
  }
  if (row.formato !== 'video' || row.render_status !== 'rendered' || !row.render_folder_id) {
    return NextResponse.json({error: 'El video todavía no está disponible'}, {status: 409})
  }

  const requestedRangeRaw = request.headers.get('range')
  const fullDelivery = request.nextUrl.searchParams.get('full') === '1'
  const requestedRange = requestedRangeRaw && !fullDelivery ? requestedRangeRaw : null
  const cacheKey = `${row.render_folder_id}:${requestedRange ?? 'full'}`

  if (requestedRange) {
    const cached = cachedVideoRange(cacheKey)
    if (cached) return new NextResponse(cached.body as unknown as BodyInit, {status: cached.status, headers: cached.headers})
  }

  if (!requestedRange && !fullDelivery) {
    const cached = getCachedVideoFile(row.render_folder_id)
    if (cached) {
      const bytes = cached.body
      const headers = {
        'Content-Type': cached.contentType,
        'Content-Length': String(bytes.length),
        'Content-Disposition': `${request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline'}; filename="${cached.filename}"`,
        'Cache-Control': 'private, max-age=300',
        'Accept-Ranges': 'bytes',
      }
      return new NextResponse(bytes as unknown as BodyInit, {status: 200, headers})
    }
  }

  try {
    const drive = getDriveClient()
    const metadata = await drive.files.get({
      fileId: row.render_folder_id,
      fields: 'name,mimeType,size',
      supportsAllDrives: true,
    })
    const size = Number(metadata.data.size ?? 0)
    if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Drive no informó el tamaño del video')

    const contentType = metadata.data.mimeType || 'video/mp4'
    const filename = safeFilename(metadata.data.name || `${row.titulo || 'video'}.mp4`)
    const range = requestedRange ? parseRange(requestedRange, size) : null
    if (requestedRange && !range) {
      return new NextResponse(null, {status: 416, headers: {'Content-Range': `bytes */${size}`}})
    }

    const driveResponse = await drive.files.get(
      {fileId: row.render_folder_id, alt: 'media', supportsAllDrives: true},
      {
        responseType: 'arraybuffer',
        signal: request.signal,
        ...(range ? {headers: {Range: `bytes=${range.start}-${range.end}`}} : {}),
      },
    )
    const body = Buffer.from(driveResponse.data as ArrayBuffer)
    const download = request.nextUrl.searchParams.get('download') === '1'
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': String(body.length),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'private, max-age=300',
      'Accept-Ranges': requestedRange ? 'bytes' : 'none',
    }
    if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`
    const status = range ? 206 : 200

    if (!range && !download && body.length <= MAX_VIDEO_FILE_CACHE_BYTES) {
      rememberVideoFile(row.render_folder_id, {
        expiresAt: Date.now() + VIDEO_FILE_CACHE_MS,
        body,
        size,
        contentType,
        filename,
      })
    }

    if (range && body.length <= 4 * 1024 * 1024) {
      rememberVideoRange(cacheKey, {
        expiresAt: Date.now() + VIDEO_RANGE_CACHE_MS,
        body,
        status,
        headers,
      })
    }
    return new NextResponse(body as unknown as BodyInit, {status, headers})
  } catch (error) {
    if (request.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      return new Response(null, {status: 499})
    }
    console.error('[VIDEO/MEDIA]', error)
    return NextResponse.json({error: 'No se pudo cargar el video desde Drive'}, {status: 502})
  }
}
