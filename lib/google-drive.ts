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
