import { google } from 'googleapis'
import path from 'node:path'
import fs from 'node:fs'
import {selectVideoMaterialCandidate} from './material-context/video-material-selection.ts'

export {selectVideoMaterialCandidate} from './material-context/video-material-selection.ts'

export interface DriveFile {
  id:            string
  name:          string
  previewFileId: string | null  // ID del PNG de preview con el mismo nombre base
  webViewLink:   string | null
  htmlFileId:    string | null  // ID del HTML para proxiar y renderizar en iframe
}

function templateMatchKey(name: string): string {
  return name
    .replace(/\.(hbs|html|png)$/iu, '')
    .trim()
    .toLowerCase()
    .replace(/\s*_\s*/gu, '_')
    .replace(/\s+/gu, '_')
}

export function getDriveClient() {
  let oauthCreds: Record<string, unknown>
  let token: Record<string, unknown>

  // En Vercel (producción): leer desde variables de entorno
  if (process.env.GOOGLE_OAUTH_CREDENTIALS && process.env.GOOGLE_OAUTH_TOKEN) {
    oauthCreds = JSON.parse(process.env.GOOGLE_OAUTH_CREDENTIALS)
    token      = JSON.parse(process.env.GOOGLE_OAUTH_TOKEN)
  } else {
    // Local: leer desde archivos
    const oauthPath = path.join(process.cwd(), 'oauth-credentials.json')
    const tokenPath  = path.join(process.cwd(), 'token.json')
    oauthCreds = JSON.parse(fs.readFileSync(oauthPath, 'utf-8'))
    token      = JSON.parse(fs.readFileSync(tokenPath,  'utf-8'))
  }

  const { client_id, client_secret } = (oauthCreds.web ?? oauthCreds.installed ?? oauthCreds) as { client_id: string; client_secret: string }
  const oauth2 = new google.auth.OAuth2(client_id, client_secret)
  oauth2.setCredentials(token)

  return google.drive({ version: 'v3', auth: oauth2 })
}

type DriveClient = ReturnType<typeof getDriveClient>

// List all subfolders directly inside a given parent folder
async function listSubfolders(drive: DriveClient, parentId: string): Promise<{ id: string; name: string }[]> {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 50,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  return (res.data.files ?? []).map(f => ({ id: f.id!, name: f.name! }))
}

async function listSubfoldersPaged(drive: DriveClient, parentId: string, pageToken?: string, pageSize = 20): Promise<{ folders: { id: string; name: string }[]; nextPageToken: string | null }> {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'nextPageToken, files(id, name)',
    orderBy: 'name desc',
    pageSize,
    ...(pageToken ? { pageToken } : {}),
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  return {
    folders: (res.data.files ?? []).map(f => ({ id: f.id!, name: f.name! })),
    nextPageToken: res.data.nextPageToken ?? null
  }
}

const BRAND_GUIDELINES_FOLDER_NAMES = new Set([
  'brand_guidelines',
  'brandguidelines',
  'brand guidelines',
  'brandguidlines',
  'brandguilines',
])

// Busca las dos carpetas de recursos como roles, no como nombres literales.
// De ese modo una variante histórica de brand_guidelines no obliga a recorrer
// todo el árbol intentando encontrar también cada alias alternativo.
async function findTemplateResourceFolders(
  drive: DriveClient,
  parentId: string,
  maxDepth: number,
  currentDepth = 0,
): Promise<{ templates?: string; brandGuidelines?: string }> {
  if (maxDepth === 0) return {}

  const subfolders = await listSubfolders(drive, parentId)
  console.log(`[DRIVE] Nivel ${currentDepth} (parent: ${parentId}) — carpetas: [${subfolders.map(f => f.name).join(', ') || 'ninguna'}]`)

  const result: { templates?: string; brandGuidelines?: string } = {}

  for (const folder of subfolders) {
    const key = folder.name.toLowerCase()
    if (key === 'templates' && !result.templates) {
      console.log(`[DRIVE] Carpeta "${folder.name}" encontrada (id: ${folder.id})`)
      result.templates = folder.id
    }
    if (BRAND_GUIDELINES_FOLDER_NAMES.has(key) && !result.brandGuidelines) {
      console.log(`[DRIVE] Carpeta "${folder.name}" encontrada (id: ${folder.id})`)
      result.brandGuidelines = folder.id
    }
  }

  if (!result.templates || !result.brandGuidelines) {
    const orderedFolders = [...subfolders].sort((left, right) => {
      const leftPriority = left.name.toLowerCase() === 'recursos' ? 0 : 1
      const rightPriority = right.name.toLowerCase() === 'recursos' ? 0 : 1
      return leftPriority - rightPriority
    })
    for (const folder of orderedFolders) {
      const deeper = await findTemplateResourceFolders(drive, folder.id, maxDepth - 1, currentDepth + 1)
      result.templates ??= deeper.templates
      result.brandGuidelines ??= deeper.brandGuidelines
      if (result.templates && result.brandGuidelines) break
    }
  }

  return result
}

async function listFilesInFolder(drive: DriveClient, folderId: string): Promise<{ id: string; name: string; webViewLink: string | null }[]> {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name, webViewLink)',
    orderBy: 'name',
    pageSize: 100,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  return (res.data.files ?? []).map(f => ({ id: f.id!, name: f.name!, webViewLink: f.webViewLink ?? null }))
}

// ─── Fotos / galería ──────────────────────────────────────────────────────────

export interface DriveFolder {
  id:                 string
  name:               string
  mediaCount?:        number
  previewFileId?:     string | null
}

export interface DriveImage {
  id:            string
  name:          string
  mimeType:      string
  thumbnailLink?: string | null
  webViewLink?:  string | null
}

/**
 * Lista las subcarpetas directas de un folder (para navegación de galería).
 */
async function summarizeMediaFolder(
  drive: DriveClient,
  folderId: string,
  mediaType: 'fotos' | 'videos',
  depth = 0,
): Promise<{count: number; previewFileId: string | null}> {
  const mimeQuery = mediaType === 'videos'
    ? "mimeType contains 'video/'"
    : "mimeType contains 'image/'"
  const media = await drive.files.list({
    q: `'${folderId}' in parents and ${mimeQuery} and trashed = false`,
    fields: 'files(id)',
    pageSize: 100,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  const directFiles = media.data.files ?? []
  let count = directFiles.length
  let previewFileId = directFiles[0]?.id ?? null

  // Una experiencia puede tener variantes internas (por ejemplo, Coco Bongo /
  // Noche). La tarjeta resume también ese nivel sin exponer la estructura de Drive.
  if (depth < 1) {
    const children = await listSubfolders(drive, folderId)
    for (const child of children) {
      const nested = await summarizeMediaFolder(drive, child.id, mediaType, depth + 1)
      count += nested.count
      previewFileId ??= nested.previewFileId
    }
  }

  return {count, previewFileId}
}

export async function listSubfoldersPublic(
  folderId: string,
  mediaType?: 'fotos' | 'videos',
): Promise<DriveFolder[]> {
  const drive = getDriveClient()
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    orderBy: 'name',
    pageSize: 100,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  const folders = (res.data.files ?? []).map(f => ({ id: f.id!, name: f.name! }))
  if (!mediaType) return folders

  return Promise.all(folders.map(async folder => {
    const summary = await summarizeMediaFolder(drive, folder.id, mediaType)
    return {
      ...folder,
      mediaCount: summary.count,
      previewFileId: summary.previewFileId,
    }
  }))
}

/**
 * Lista las imágenes (mimeType image/*) de un folder.
 * Devuelve hasta `pageSize` (default 50). El token de página siguiente
 * se devuelve como `nextPageToken` para paginación futura.
 */
export async function listImagesInFolder(
  folderId: string,
  pageSize = 50,
  pageToken?: string,
): Promise<{ images: DriveImage[]; nextPageToken: string | null }> {
  const drive = getDriveClient()
  const res = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`,
    fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webViewLink)',
    orderBy: 'name',
    pageSize,
    ...(pageToken ? { pageToken } : {}),
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  return {
    images:        (res.data.files ?? []).map(f => ({ id: f.id!, name: f.name!, mimeType: f.mimeType!, thumbnailLink: f.thumbnailLink ?? null, webViewLink: f.webViewLink ?? null })),
    nextPageToken: res.data.nextPageToken ?? null,
  }
}

export interface CategorizedImage {
  id:            string
  name:          string
  mimeType:      string
  category:      string
  thumbnailLink?: string | null
  webViewLink?:  string | null
}

/**
 * Lista imágenes en la carpeta raíz y en sus subcarpetas directas (1 nivel de profundidad).
 * Asigna la categoría 'Principal' a las de la raíz, y el nombre de la subcarpeta al resto.
 */
export async function listImagesWithCategories(folderId: string): Promise<CategorizedImage[]> {
  const drive = getDriveClient()
  const results: CategorizedImage[] = []

  // 1. Obtener imágenes de la raíz
  const rootRes = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`,
    fields: 'files(id, name, mimeType, thumbnailLink, webViewLink)',
    pageSize: 100,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })

  for (const f of rootRes.data.files ?? []) {
    results.push({ id: f.id!, name: f.name!, mimeType: f.mimeType!, category: 'Principal', thumbnailLink: f.thumbnailLink ?? null, webViewLink: f.webViewLink ?? null })
  }

  // 2. Escaneo recursivo de subcarpetas (hasta 2 niveles de profundidad)
  async function scanSubfolders(parentId: string, parentPath: string, depth: number) {
    if (depth > 2) return
    const subfolders = await listSubfolders(drive, parentId)
    await Promise.all(subfolders.map(async (sub) => {
      const categoryName = parentPath ? `${parentPath}/${sub.name}` : sub.name
      const subRes = await drive.files.list({
        q: `'${sub.id}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`,
        fields: 'files(id, name, mimeType, thumbnailLink, webViewLink)',
        pageSize: 100,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      })
      for (const f of subRes.data.files ?? []) {
        results.push({ id: f.id!, name: f.name!, mimeType: f.mimeType!, category: categoryName, thumbnailLink: f.thumbnailLink ?? null, webViewLink: f.webViewLink ?? null })
      }
      await scanSubfolders(sub.id, categoryName, depth + 1)
    }))
  }

  await scanSubfolders(folderId, '', 1)
  return results
}

/**
 * Nombre real de una carpeta de Drive por su id. Usado por el batch de
 * calendario para resolver `brand_identity.fotos_folder_id` (un id) al
 * nombre de un solo nivel que espera `payload.carpeta` en Mati — el
 * flujo manual manda un path de 2 niveles ("L1/L2") elegido a mano en
 * FolderPicker; el batch solo tiene la carpeta banco raíz, así que manda
 * ese único nivel. Devuelve null en vez de tirar si falla — es un dato
 * opcional para el render, no debe tumbar el batch entero.
 */
export async function getFolderName(folderId: string): Promise<string | null> {
  try {
    const drive = getDriveClient()
    const res = await drive.files.get({ fileId: folderId, fields: 'name', supportsAllDrives: true })
    return res.data.name ?? null
  } catch {
    return null
  }
}

/**
 * Descarga el contenido binario de un archivo Drive (para proxy de miniaturas).
 * Devuelve el buffer y el content-type.
 */
export async function downloadFileContent(fileId: string): Promise<{ buffer: Buffer; contentType: string }> {
  const drive = getDriveClient()
  const meta = await drive.files.get({
    fileId,
    fields: 'mimeType',
    supportsAllDrives: true,
  })
  const contentType = meta.data.mimeType ?? 'application/octet-stream'

  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' },
  )
  return { buffer: Buffer.from(res.data as ArrayBuffer), contentType }
}

// ─── Banco de imágenes — CRUD ──────────────────────────────────────────────

/**
 * Encuentra una carpeta por nombre dentro de un parent.
 * Si no existe, la crea.
 */
export async function getOrCreateFolder(parentId: string, name: string): Promise<string> {
  const drive = getDriveClient()
  const safeName = name.replace(/'/g, "\\'")
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
    pageSize: 1,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  if (existing.data.files?.length) return existing.data.files[0].id!

  const created = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
    supportsAllDrives: true,
  })
  return created.data.id!
}

export const CLIENTS_ROOT_DRIVE_FOLDER_ID = process.env.DRIVE_CLIENTS_FOLDER_ID || '1ss6oC4VbGhpSduegjFNhAZ2A-x14TFhI'

export type ClientMediaLibraryRole = 'fotos' | 'videos'

function normalizeDriveFolderRole(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
}

const CLIENT_MEDIA_LIBRARY_NAMES: Record<ClientMediaLibraryRole, readonly string[]> = {
  fotos: [
    'destinos de imagenes',
    'banco de imagenes',
    'imagenes',
    'fotos',
  ],
  videos: [
    'videos crudos',
    'videos',
  ],
}

/**
 * Resuelve una carpeta de Drive por su función dentro del cliente. Los nombres
 * históricos pueden variar, pero nunca se debe usar la raíz completa del
 * cliente como biblioteca: allí también viven recursos y contenido generado.
 */
export function selectClientMediaLibraryFolder<T extends { id: string; name: string }>(
  folders: T[],
  role: ClientMediaLibraryRole,
): T | null {
  const aliases = CLIENT_MEDIA_LIBRARY_NAMES[role]
  const byName = new Map(folders.map(folder => [normalizeDriveFolderRole(folder.name), folder]))

  for (const alias of aliases) {
    const match = byName.get(alias)
    if (match) return match
  }

  return null
}

/**
 * Garantiza que el cliente tenga su carpeta raíz en Drive y sus subcarpetas obligatorias:
 * - "banco de imagenes" (fotos_folder_id)
 * - "videos crudos" (videos_folder_id)
 * - "recursos"
 * - "contenido generado"
 * Y persiste sus IDs en brand_identity en Supabase.
 */
export async function ensureClientDriveFolders(
  userId: string,
  preferredName?: string | null,
): Promise<{
  drive_folder_id: string | null
  fotos_folder_id: string | null
  videos_folder_id: string | null
}> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()

  // 1. Check existing brand_identity
  const { data: branding } = await admin
    .from('brand_identity')
    .select('drive_folder_id, fotos_folder_id, videos_folder_id')
    .eq('user_id', userId)
    .maybeSingle()

  const photosPointToClientRoot = Boolean(
    branding?.drive_folder_id
      && branding.fotos_folder_id === branding.drive_folder_id,
  )
  const videosPointToClientRoot = Boolean(
    branding?.drive_folder_id
      && branding.videos_folder_id === branding.drive_folder_id,
  )

  if (
    branding?.drive_folder_id
      && branding?.fotos_folder_id
      && branding?.videos_folder_id
      && !photosPointToClientRoot
      && !videosPointToClientRoot
  ) {
    return {
      drive_folder_id: branding.drive_folder_id,
      fotos_folder_id: branding.fotos_folder_id,
      videos_folder_id: branding.videos_folder_id,
    }
  }

  // 2. Resolve client name
  let name: string = preferredName?.trim() || ''
  if (!name) {
    const { data: profile } = await admin
      .from('profiles')
      .select('company_name, full_name')
      .eq('id', userId)
      .maybeSingle()
    name = profile?.company_name?.trim() || profile?.full_name?.trim() || 'cliente'
  }

  const clientName = name.toLowerCase()

  try {
    const clientFolderId = branding?.drive_folder_id || (await getOrCreateFolder(CLIENTS_ROOT_DRIVE_FOLDER_ID, clientName))

    const mustResolvePhotosRoot = !branding?.fotos_folder_id || branding.fotos_folder_id === clientFolderId
    const mustResolveVideosRoot = !branding?.videos_folder_id || branding.videos_folder_id === clientFolderId
    const clientSubfolders = mustResolvePhotosRoot || mustResolveVideosRoot
      ? await listSubfolders(getDriveClient(), clientFolderId)
      : []

    let fotosFolderId = branding?.fotos_folder_id
    if (mustResolvePhotosRoot) {
      fotosFolderId = selectClientMediaLibraryFolder(clientSubfolders, 'fotos')?.id
    }
    if (!fotosFolderId) {
      fotosFolderId = await getOrCreateFolder(clientFolderId, 'banco de imagenes')
    }

    let videosFolderId = branding?.videos_folder_id
    if (mustResolveVideosRoot) {
      videosFolderId = selectClientMediaLibraryFolder(clientSubfolders, 'videos')?.id
    }
    if (!videosFolderId) {
      videosFolderId = await getOrCreateFolder(clientFolderId, 'videos crudos')
    }

    // Subcarpetas complementarias
    await Promise.all([
      getOrCreateFolder(clientFolderId, 'recursos').catch(() => null),
      getOrCreateFolder(clientFolderId, 'contenido generado').catch(() => null),
    ])

    // 3. Upsert brand_identity
    await admin
      .from('brand_identity')
      .upsert(
        {
          user_id: userId,
          drive_folder_id: clientFolderId,
          fotos_folder_id: fotosFolderId,
          videos_folder_id: videosFolderId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )

    return {
      drive_folder_id: clientFolderId,
      fotos_folder_id: fotosFolderId,
      videos_folder_id: videosFolderId,
    }
  } catch (error) {
    console.error('[DRIVE] Error ensuring client folders for user %s:', userId, error)
    return {
      drive_folder_id: branding?.drive_folder_id ?? null,
      // Nunca devolver la raíz completa como biblioteca. Ante una falla es
      // preferible mostrar un estado reintentable que exponer carpetas internas.
      fotos_folder_id: branding?.fotos_folder_id === branding?.drive_folder_id
        ? null
        : branding?.fotos_folder_id ?? null,
      videos_folder_id: branding?.videos_folder_id === branding?.drive_folder_id
        ? null
        : branding?.videos_folder_id ?? null,
    }
  }
}

/**
 * Busca si la carpeta indicada contiene videos o imágenes directamente.
 * Si está vacía a nivel raíz pero tiene subcarpetas con material (ej: "Cancún/Paisajes", "Cancún/Actividades"),
 * selecciona una de las subcarpetas con contenido y devuelve su folderId y ruta completa.
 */
export async function resolveEffectiveVideoMaterial(
  folderId: string,
  baseFolderName?: string | null,
  options: {
    selectionIndex?: number
    salida?: Pick<import('@/types').Salida, 'destino' | 'puntos_interes' | 'itinerario_dias'> | null
  } = {},
): Promise<{
  folderId: string
  folderName: string
  materialContext: import('@/lib/material-context/video-material-context').VideoMaterialContext
}> {
  const buildResult = async (resolvedFolderId: string, resolvedFolderName: string) => {
    const {buildVideoMaterialContext} = await import('@/lib/material-context/video-material-context')
    return {
      folderId: resolvedFolderId,
      folderName: resolvedFolderName,
      materialContext: buildVideoMaterialContext({
        folderId: resolvedFolderId,
        folderName: resolvedFolderName,
        salida: options.salida,
      }),
    }
  }
  try {
    const drive = getDriveClient()

    // 1. Verificar si la carpeta tiene archivos de video o imagen directamente
    const directMedia = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'video/' or mimeType contains 'image/') and trashed = false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 5,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    })

    if ((directMedia.data.files ?? []).length > 0) {
      return buildResult(folderId, baseFolderName?.trim() || '')
    }

    // 2. Si no tiene archivos directos, buscar subcarpetas
    const subfoldersRes = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 30,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    })

    const subfolders = subfoldersRes.data.files ?? []
    if (subfolders.length === 0) {
      return buildResult(folderId, baseFolderName?.trim() || '')
    }

    // 3. Evaluar cuáles subcarpetas contienen videos/imágenes
    const candidateFolders: Array<{ id: string; name: string; hasVideos: boolean }> = []

    for (const sub of subfolders) {
      if (!sub.id) continue
      try {
        const filesRes = await drive.files.list({
          q: `'${sub.id}' in parents and (mimeType contains 'video/' or mimeType contains 'image/') and trashed = false`,
          fields: 'files(id, mimeType)',
          pageSize: 5,
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
        })
        const files = filesRes.data.files ?? []
        if (files.length > 0) {
          const hasVideos = files.some(f => f.mimeType?.startsWith('video/'))
          candidateFolders.push({ id: sub.id, name: sub.name || '', hasVideos })
        }
      } catch (subErr) {
        console.warn(`[DRIVE] Error escaneando subcarpeta ${sub.name}:`, subErr)
      }
    }

    if (candidateFolders.length > 0) {
      // Copy y render deben compartir la selección. La rotación determinística
      // evita que cada capa vuelva a elegir una subcarpeta diferente.
      const chosen = selectVideoMaterialCandidate(candidateFolders, options.selectionIndex ?? 0)
      if (!chosen) return buildResult(folderId, baseFolderName?.trim() || '')
      const resolvedName = baseFolderName?.trim()
        ? `${baseFolderName.trim()}/${chosen.name}`
        : chosen.name

      console.log(`[DRIVE] Carpeta raíz "${baseFolderName}" no contenía videos directos. Resuelto a subcarpeta: "${resolvedName}" (id: ${chosen.id})`)
      return buildResult(chosen.id, resolvedName)
    }

    return buildResult(folderId, baseFolderName?.trim() || '')
  } catch (err) {
    console.error('[DRIVE] Error resolviendo subcarpetas de video:', err)
    return buildResult(folderId, baseFolderName?.trim() || '')
  }
}

export async function resolveEffectiveVideoFolder(
  folderId: string,
  baseFolderName?: string | null,
): Promise<{ folderId: string; folderName: string }> {
  const resolved = await resolveEffectiveVideoMaterial(folderId, baseFolderName)
  return {folderId: resolved.folderId, folderName: resolved.folderName}
}

/**
 * Busca si la carpeta indicada contiene imágenes directamente.
 * Si está vacía a nivel raíz pero tiene subcarpetas con material (ej: "Cancún/Paisajes", "Cancún/Fotos"),
 * selecciona una de las subcarpetas con contenido y devuelve su folderId y ruta completa.
 */
export async function resolveEffectivePhotoFolder(
  folderId: string,
  baseFolderName?: string | null,
): Promise<{ folderId: string; folderName: string }> {
  try {
    const drive = getDriveClient()

    // 1. Verificar si la carpeta tiene archivos de imagen directamente
    const directMedia = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 5,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    })

    if ((directMedia.data.files ?? []).length > 0) {
      return { folderId, folderName: baseFolderName?.trim() || '' }
    }

    // 2. Si no tiene archivos directos, buscar subcarpetas
    const subfoldersRes = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 30,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    })

    const subfolders = subfoldersRes.data.files ?? []
    if (subfolders.length === 0) {
      return { folderId, folderName: baseFolderName?.trim() || '' }
    }

    // 3. Evaluar cuáles subcarpetas contienen imágenes
    const candidateFolders: Array<{ id: string; name: string }> = []

    for (const sub of subfolders) {
      if (!sub.id) continue
      try {
        const filesRes = await drive.files.list({
          q: `'${sub.id}' in parents and mimeType contains 'image/' and trashed = false`,
          fields: 'files(id, mimeType)',
          pageSize: 5,
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
        })
        const files = filesRes.data.files ?? []
        if (files.length > 0) {
          candidateFolders.push({ id: sub.id, name: sub.name || '' })
        }
      } catch (subErr) {
        console.warn(`[DRIVE] Error escaneando subcarpeta de fotos ${sub.name}:`, subErr)
      }
    }

    if (candidateFolders.length > 0) {
      const chosen = candidateFolders[Math.floor(Math.random() * candidateFolders.length)]
      const resolvedName = baseFolderName?.trim()
        ? `${baseFolderName.trim()}/${chosen.name}`
        : chosen.name

      console.log(`[DRIVE] Carpeta raíz "${baseFolderName}" no contenía fotos directas. Resuelto a subcarpeta: "${resolvedName}" (id: ${chosen.id})`)
      return { folderId: chosen.id, folderName: resolvedName }
    }

    return { folderId, folderName: baseFolderName?.trim() || '' }
  } catch (err) {
    console.error('[DRIVE] Error resolviendo subcarpetas de fotos:', err)
    return { folderId, folderName: baseFolderName?.trim() || '' }
  }
}

/**
 * Crea una carpeta nueva dentro de un parent (sin verificar duplicados).
 */
export async function createDriveFolder(parentId: string, name: string): Promise<DriveFolder> {
  const drive = getDriveClient()
  const res = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id, name',
    supportsAllDrives: true,
  })
  return { id: res.data.id!, name: res.data.name! }
}

/**
 * Sube un archivo a Drive.
 */
export async function uploadToDrive(
  parentId: string,
  name:     string,
  buffer:   Buffer,
  mimeType: string,
): Promise<{ id: string; name: string }> {
  const drive = getDriveClient()
  const { Readable } = await import('node:stream')
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id, name',
    supportsAllDrives: true,
  })
  return { id: res.data.id!, name: res.data.name! }
}

/** Verifica que una carpeta pertenezca al árbol del banco del cliente. */
export async function isFolderWithinRoot(folderId: string, rootId: string, maxDepth = 8): Promise<boolean> {
  if (folderId === rootId) return true
  const drive = getDriveClient()
  let currentIds = [folderId]
  const visited = new Set<string>()
  for (let depth = 0; depth < maxDepth && currentIds.length; depth++) {
    const next: string[] = []
    for (const id of currentIds) {
      if (visited.has(id)) continue
      visited.add(id)
      try {
        const response = await drive.files.get({ fileId: id, fields: 'parents', supportsAllDrives: true })
        for (const parent of response.data.parents ?? []) {
          if (parent === rootId) return true
          next.push(parent)
        }
      } catch {
        // Algunos elementos compartidos se pueden listar como hijos, pero no
        // consultar individualmente. En ese caso usamos el recorrido descendente.
        currentIds = []
        break
      }
    }
    currentIds = next
  }

  // En carpetas compartidas Drive puede omitir o recortar la cadena `parents`.
  // Como alternativa, recorremos hacia abajo exactamente el mismo árbol que
  // expone el selector de carpetas. Solo acepta IDs encontrados bajo la raíz.
  currentIds = [rootId]
  visited.clear()
  for (let depth = 0; depth < maxDepth && currentIds.length; depth++) {
    const next: string[] = []
    for (const id of currentIds) {
      if (visited.has(id)) continue
      visited.add(id)
      const children = await listSubfolders(drive, id)
      for (const child of children) {
        if (child.id === folderId) return true
        next.push(child.id)
      }
    }
    currentIds = next
  }
  return false
}

/**
 * Elimina un archivo o carpeta de Drive.
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.files.delete({ fileId, supportsAllDrives: true })
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lista los templates del cliente:
 * - HBS files come from the "templates/" subfolder
 * - HTML files (for opening in browser) come from the "brand_guidelines/" subfolder
 * - PNG files (for preview thumbnails) come from either folder, matched by base name
 * - Same base name = same template (e.g. brand_guidelines_2.hbs ↔ brand_guidelines_2.html)
 */
export async function listTemplatesForClient(driveFolderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient()

  const folders = await findTemplateResourceFolders(drive, driveFolderId, 4)

  const templatesFolderId = folders.templates
  const brandGuidelinesFolderId = folders.brandGuidelines

  if (!templatesFolderId) {
    console.warn(`[DRIVE] No se encontró subcarpeta "templates" dentro de ${driveFolderId}`)
    return []
  }

  // List HBS files from templates/
  const hbsFiles = await listFilesInFolder(drive, templatesFolderId)
  console.log(`[DRIVE] Archivos en templates/: ${hbsFiles.map(f => f.name).join(', ') || 'ninguno'}`)

  // Build maps from brand_guidelines/: base → HTML webViewLink, base → HTML fileId, base → PNG fileId
  const htmlLinkMap    = new Map<string, string>()  // base → HTML webViewLink
  const htmlFileIdMap  = new Map<string, string>()  // base → HTML fileId
  const previewMap     = new Map<string, string>()  // base → PNG fileId

  if (brandGuidelinesFolderId) {
    const guidelineFiles = await listFilesInFolder(drive, brandGuidelinesFolderId)
    console.log(`[DRIVE] Archivos en brand_guidelines/: ${guidelineFiles.map(f => f.name).join(', ') || 'ninguno'}`)

    for (const f of guidelineFiles) {
      const nameLower = f.name.toLowerCase()
      if (nameLower.endsWith('.html')) {
        const base = templateMatchKey(f.name)
        if (f.webViewLink) htmlLinkMap.set(base, f.webViewLink)
        htmlFileIdMap.set(base, f.id)
      }
      if (nameLower.endsWith('.png')) {
        const base = templateMatchKey(f.name)
        previewMap.set(base, f.id)
      }
    }
  }

  // Also check templates/ for PNGs (in case they're there too)
  for (const f of hbsFiles) {
    const nameLower = f.name.toLowerCase()
    if (nameLower.endsWith('.png')) {
      const base = templateMatchKey(f.name)
      if (!previewMap.has(base)) previewMap.set(base, f.id)
    }
  }

  // Build result: one card per HBS file, linked to its matching HTML
  const files: DriveFile[] = hbsFiles
    .filter(f => /\.hbs$/i.test(f.name))
    .map(f => {
      const base = templateMatchKey(f.name)
      return {
        id:           f.id,
        name:         f.name,
        previewFileId: previewMap.get(base) ?? null,
        webViewLink:  htmlLinkMap.get(base) ?? null,
        htmlFileId:   htmlFileIdMap.get(base) ?? null,
      }
    })

  console.log(`[DRIVE] ${files.length} template(s) encontrados, ${previewMap.size} preview(s) disponibles`)
  files.forEach(f => console.log(`[DRIVE]  → ${f.name} | preview: ${f.previewFileId ?? 'null'} | link: ${f.webViewLink ?? 'null'}`))
  return files
}

// ─── Renders (carruseles renderizados por Mati) ────────────────────────────────

export interface RenderCarpeta {
  folderId:      string
  name:          string
  firstFileId:   string | null
  mimeType?:     string
  thumbnailLink?: string | null
  webViewLink?:  string | null
}

/**
 * Navega la estructura de Drive de Mati y devuelve las subcarpetas de carruseles.
 * Ruta: drive_folder_id → "contenido generado" → "carruseles" → [subcarpetas]
 * Si no encuentra "contenido generado", busca "carruseles" directamente.
 */
export async function listRenderCarpetas(rootFolderId: string, pageToken?: string): Promise<{ carpetas: RenderCarpeta[]; nextPageToken: string | null }> {
  const drive = getDriveClient()

  // Paso 1: buscar "contenido generado" o "carruseles" directo en root
  const rootSubs = await listSubfolders(drive, rootFolderId)
  console.log(`[RENDERS] Root (${rootFolderId}) subfolders: [${rootSubs.map(f => f.name).join(', ')}]`)

  let carruselesId: string | null = null

  const contenidoFolder = rootSubs.find(f => f.name.toLowerCase().includes('contenido'))
  if (contenidoFolder) {
    const contenidoSubs = await listSubfolders(drive, contenidoFolder.id)
    console.log(`[RENDERS] "${contenidoFolder.name}" subfolders: [${contenidoSubs.map(f => f.name).join(', ')}]`)
    const carruselesFolder = contenidoSubs.find(f => f.name.toLowerCase().includes('carrusel'))
    if (carruselesFolder) carruselesId = carruselesFolder.id
  }

  if (!carruselesId) {
    // Buscar "carruseles" directamente en root
    const direct = rootSubs.find(f => f.name.toLowerCase().includes('carrusel'))
    if (direct) carruselesId = direct.id
  }

  if (!carruselesId) {
    console.warn(`[RENDERS] No se encontró carpeta de carruseles bajo ${rootFolderId}`)
    return { carpetas: [], nextPageToken: null }
  }

  console.log(`[RENDERS] Carpeta carruseles encontrada: ${carruselesId}`)

  // Paso 2: listar subcarpetas de carruseles
  const { folders: carruselSubs, nextPageToken } = await listSubfoldersPaged(drive, carruselesId, pageToken, 20)
  console.log(`[RENDERS] ${carruselSubs.length} carruseles encontrados en esta página`)

  // Paso 3: para cada subcarpeta, obtener el primer archivo (thumbnail)
  const results: RenderCarpeta[] = await Promise.all(
    carruselSubs.map(async sub => {
      const res = await drive.files.list({
        q: `'${sub.id}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'files(id, name)',
        orderBy: 'name',
        pageSize: 1,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      })
      const first = res.data.files?.[0]?.id ?? null
      return { folderId: sub.id, name: sub.name, firstFileId: first }
    }),
  )

  return { carpetas: results, nextPageToken }
}

/**
 * Devuelve metadata de carpetas de Drive por IDs específicos (para batch renders).
 * Mucho más rápido que listRenderCarpetas porque no recorre el árbol.
 */
export async function getRenderCarpetasByIds(folderIds: string[]): Promise<RenderCarpeta[]> {
  if (folderIds.length === 0) return []
  const drive = getDriveClient()

  const results = await Promise.all(
    folderIds.map(async (folderId): Promise<RenderCarpeta | null> => {
      try {
        const meta = await drive.files.get({
          fileId: folderId,
          fields: 'id, name, mimeType, thumbnailLink, webViewLink',
          supportsAllDrives: true,
        })

        let firstFileId = null
        if (meta.data.mimeType === 'application/vnd.google-apps.folder') {
          const files = await drive.files.list({
            q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
            fields: 'files(id, name)',
            orderBy: 'name',
            pageSize: 1,
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
          })
          firstFileId = files.data.files?.[0]?.id ?? null
        }

        return {
          folderId,
          name: meta.data.name ?? folderId,
          firstFileId,
          mimeType: meta.data.mimeType ?? undefined,
          thumbnailLink: meta.data.thumbnailLink ?? null,
          webViewLink: meta.data.webViewLink ?? null,
        }
      } catch (err: unknown) {
        console.error('API ERROR:', err instanceof Error ? err.message : err)
        return null
      }
    }),
  )

  return results.filter((r): r is RenderCarpeta => r !== null)
}

export interface RenderSlide {
  fileId: string
  name:   string
}

const renderSlidesCache = new Map<string, {expiresAt: number; value: Promise<RenderSlide[]>}>()
const RENDER_SLIDES_CACHE_MS = 10 * 60 * 1000

/**
 * Lista los slides (imágenes) de una carpeta de render de Mati.
 * Filtra solo archivos de imagen, ordena por nombre (slide1, slide2…).
 */
export async function listRenderSlides(folderId: string): Promise<RenderSlide[]> {
  const cached = renderSlidesCache.get(folderId)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const value = (async () => {
    const drive = getDriveClient()
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name)',
      orderBy: 'name',
      pageSize: 50,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    })
    return (res.data.files ?? []).map(f => ({ fileId: f.id!, name: f.name! }))
  })()

  renderSlidesCache.set(folderId, {expiresAt: Date.now() + RENDER_SLIDES_CACHE_MS, value})
  try {
    return await value
  } catch (error) {
    renderSlidesCache.delete(folderId)
    throw error
  }
}
