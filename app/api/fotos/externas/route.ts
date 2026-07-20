import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFolderWithinRoot, uploadToDrive } from '@/lib/google-drive'

export const maxDuration = 60

interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  alt: string
  src: { original: string; large2x: string; large: string; medium: string }
}

function getApiKey(): string {
  const key = process.env.PEXELS_API_KEY?.trim()
  if (!key) throw new Error('Falta configurar PEXELS_API_KEY en .env.local')
  return key
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')
  return user
}

async function pexelsFetch(path: string) {
  return fetch(`https://api.pexels.com/v1/${path}`, {
    headers: { Authorization: getApiKey() },
    signal: AbortSignal.timeout(20_000),
  })
}

export async function GET(request: NextRequest) {
  try {
    await requireUser()
    const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (query.length < 2) return NextResponse.json({ error: 'Escribí qué lugar o paisaje querés buscar.' }, { status: 400 })
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') ?? 1))
    const response = await pexelsFetch(`search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=15&page=${page}`)
    if (!response.ok) throw new Error(`Pexels respondió HTTP ${response.status}`)
    const data = await response.json() as { photos?: PexelsPhoto[]; total_results?: number; next_page?: string }
    return NextResponse.json({
      provider: 'Pexels',
      photos: (data.photos ?? []).map(photo => ({
        id: photo.id,
        width: photo.width,
        height: photo.height,
        pageUrl: photo.url,
        previewUrl: photo.src.medium,
        importUrl: photo.src.large2x || photo.src.large || photo.src.original,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        alt: photo.alt,
      })),
      total: data.total_results ?? 0,
      hasNext: Boolean(data.next_page),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo consultar Pexels'
    return NextResponse.json({ error: message }, { status: message === 'No autorizado' ? 401 : 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const { photoId, parentId, salidaId } = await request.json() as { photoId?: number; parentId?: string; salidaId?: string }
    if (!Number.isInteger(photoId) || !parentId) return NextResponse.json({ error: 'Foto o carpeta inválida' }, { status: 400 })

    const admin = createAdminClient()
    let brandingUserId = user.id
    if (salidaId) {
      // Esta lectura usa RLS: solo permite usar la marca de una salida que el
      // usuario autenticado ya tiene autorización para consultar en la app.
      const supabase = await createClient()
      const { data: salida } = await supabase.from('salidas').select('user_id').eq('id', salidaId).single()
      if (!salida?.user_id) return NextResponse.json({ error: 'No tenés acceso a esta salida' }, { status: 403 })
      brandingUserId = salida.user_id
    }
    const { data: branding } = await admin.from('brand_identity').select('fotos_folder_id').eq('user_id', brandingUserId).single()
    const bankRootId = branding?.fotos_folder_id?.trim()
    const targetFolderId = parentId.trim()
    if (!bankRootId || !targetFolderId || !(await isFolderWithinRoot(targetFolderId, bankRootId))) {
      return NextResponse.json({ error: 'La carpeta no pertenece al banco de imágenes del usuario' }, { status: 403 })
    }

    const detailsResponse = await pexelsFetch(`photos/${photoId}`)
    if (!detailsResponse.ok) throw new Error(`Pexels respondió HTTP ${detailsResponse.status}`)
    const photo = await detailsResponse.json() as PexelsPhoto
    const imageUrl = photo.src.large2x || photo.src.large || photo.src.original
    const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) })
    if (!imageResponse.ok) throw new Error('No se pudo descargar la imagen seleccionada')
    const buffer = Buffer.from(await imageResponse.arrayBuffer())
    if (buffer.byteLength > 20 * 1024 * 1024) throw new Error('La imagen supera el máximo de 20 MB')

    const safeAlt = (photo.alt || 'foto').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).toLowerCase()
    const filename = `pexels-${photo.id}-${safeAlt || 'imagen'}.jpg`
    const uploaded = await uploadToDrive(targetFolderId, filename, buffer, imageResponse.headers.get('content-type') || 'image/jpeg')
    const attribution = {
      provider: 'Pexels',
      photoId: photo.id,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      sourceUrl: photo.url,
      licenseInfo: 'https://www.pexels.com/license/',
      importedAt: new Date().toISOString(),
      fileName: filename,
    }
    await uploadToDrive(targetFolderId, `${filename}.source.json`, Buffer.from(JSON.stringify(attribution, null, 2)), 'application/json')

    return NextResponse.json({ uploaded, attribution })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo importar la imagen'
    return NextResponse.json({ error: message }, { status: message === 'No autorizado' ? 401 : 500 })
  }
}
