import { google } from 'googleapis'
import path from 'node:path'
import fs from 'node:fs'

export interface DriveFile {
  id:            string
  name:          string
  previewFileId: string | null  // ID del PNG de preview con el mismo nombre base
  webViewLink:   string | null
  htmlFileId:    string | null  // ID del HTML para proxiar y renderizar en iframe
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

// Recursively find folders by name up to `maxDepth` levels deep (returns all matches)
async function findFoldersByName(
  drive: DriveClient,
  parentId: string,
  targetNames: string[],
  maxDepth: number,
  currentDepth = 0,
): Promise<Record<string, string>> {
  if (maxDepth === 0) return {}

  const subfolders = await listSubfolders(drive, parentId)
  console.log(`[DRIVE] Nivel ${currentDepth} (parent: ${parentId}) — carpetas: [${subfolders.map(f => f.name).join(', ') || 'ninguna'}]`)

  const result: Record<string, string> = {}

  for (const folder of subfolders) {
    const key = folder.name.toLowerCase()
    if (targetNames.includes(key) && !(key in result)) {
      console.log(`[DRIVE] Carpeta "${folder.name}" encontrada (id: ${folder.id})`)
      result[key] = folder.id
    }
  }

  // If we still need more, recurse
  const stillNeeded = targetNames.filter(n => !(n in result))
  if (stillNeeded.length > 0) {
    for (const folder of subfolders) {
      const deeper = await findFoldersByName(drive, folder.id, stillNeeded, maxDepth - 1, currentDepth + 1)
      for (const [k, v] of Object.entries(deeper)) {
        if (!(k in result)) result[k] = v
      }
      if (Object.keys(result).length === targetNames.length) break
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
  id:   string
  name: string
}

export interface DriveImage {
  id:       string
  name:     string
  mimeType: string
}

/**
 * Lista las subcarpetas directas de un folder (para navegación de galería).
 */
export async function listSubfoldersPublic(folderId: string): Promise<DriveFolder[]> {
  const drive = getDriveClient()
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    orderBy: 'name',
    pageSize: 100,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  return (res.data.files ?? []).map(f => ({ id: f.id!, name: f.name! }))
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
    fields: 'nextPageToken, files(id, name, mimeType)',
    orderBy: 'name',
    pageSize,
    ...(pageToken ? { pageToken } : {}),
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  return {
    images:        (res.data.files ?? []).map(f => ({ id: f.id!, name: f.name!, mimeType: f.mimeType! })),
    nextPageToken: res.data.nextPageToken ?? null,
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

  const folders = await findFoldersByName(drive, driveFolderId, ['templates', 'brand_guidelines'], 4)

  const templatesFolderId     = folders['templates']
  const brandGuidelinesFolderId = folders['brand_guidelines']

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
        const base = f.name.replace(/\.html$/i, '').toLowerCase()
        if (f.webViewLink) htmlLinkMap.set(base, f.webViewLink)
        htmlFileIdMap.set(base, f.id)
      }
      if (nameLower.endsWith('.png')) {
        const base = f.name.replace(/\.png$/i, '').toLowerCase()
        previewMap.set(base, f.id)
      }
    }
  }

  // Also check templates/ for PNGs (in case they're there too)
  for (const f of hbsFiles) {
    const nameLower = f.name.toLowerCase()
    if (nameLower.endsWith('.png')) {
      const base = f.name.replace(/\.png$/i, '').toLowerCase()
      if (!previewMap.has(base)) previewMap.set(base, f.id)
    }
  }

  // Build result: one card per HBS file, linked to its matching HTML
  const files: DriveFile[] = hbsFiles
    .filter(f => /\.hbs$/i.test(f.name))
    .map(f => {
      const base = f.name.replace(/\.hbs$/i, '').toLowerCase()
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
      } catch (err: any) {
        console.error('API ERROR:', err.message || err)
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

/**
 * Lista los slides (imágenes) de una carpeta de render de Mati.
 * Filtra solo archivos de imagen, ordena por nombre (slide1, slide2…).
 */
export async function listRenderSlides(folderId: string): Promise<RenderSlide[]> {
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
}
