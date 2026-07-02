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

function getDriveClient() {
  const oauthPath = path.join(process.cwd(), 'oauth-credentials.json')
  const tokenPath  = path.join(process.cwd(), 'token.json')
  const oauthCreds = JSON.parse(fs.readFileSync(oauthPath, 'utf-8'))
  const token      = JSON.parse(fs.readFileSync(tokenPath,  'utf-8'))

  const { client_id, client_secret } = oauthCreds.web ?? oauthCreds.installed ?? oauthCreds
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
