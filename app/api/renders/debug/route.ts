import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { google } from 'googleapis'
import path from 'node:path'
import fs from 'node:fs'

function getDriveDebug() {
  let oauthCreds: Record<string, unknown>
  let token: Record<string, unknown>

  if (process.env.GOOGLE_OAUTH_CREDENTIALS && process.env.GOOGLE_OAUTH_TOKEN) {
    oauthCreds = JSON.parse(process.env.GOOGLE_OAUTH_CREDENTIALS)
    token      = JSON.parse(process.env.GOOGLE_OAUTH_TOKEN)
  } else {
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

async function listAll(drive: ReturnType<typeof getDriveDebug>, parentId: string, depth = 0): Promise<unknown[]> {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name',
    pageSize: 50,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  const files = res.data.files ?? []
  if (depth === 0) return files
  return Promise.all(files.map(async f => {
    if (f.mimeType === 'application/vnd.google-apps.folder' && depth > 0) {
      const children = await listAll(drive, f.id!, depth - 1)
      return { ...f, children }
    }
    return f
  }))
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const folderId = req.nextUrl.searchParams.get('folderId')
  const deep = req.nextUrl.searchParams.get('deep') === '1'

  // Show root folder structure from brand_identity
  const { data: branding } = await createAdminClient()
    .from('brand_identity')
    .select('drive_folder_id, fotos_folder_id, mati_cliente_id')
    .eq('user_id', user.id)
    .single()

  if (!folderId) {
    const rootFolderId = branding?.drive_folder_id
    if (!rootFolderId) {
      return NextResponse.json({ branding, error: 'drive_folder_id no configurado' })
    }

    try {
      const drive = getDriveDebug()
      const tree = await listAll(drive, rootFolderId, deep ? 2 : 0)
      return NextResponse.json({ branding, rootFolderId, items: tree })
    } catch (err) {
      return NextResponse.json({ branding, error: String(err) }, { status: 500 })
    }
  }

  // List all files in a specific folder
  try {
    const drive = getDriveDebug()
    const tree = await listAll(drive, folderId, deep ? 2 : 0)
    return NextResponse.json({ folderId, files: tree })
  } catch (err) {
    return NextResponse.json({ folderId, error: String(err) }, { status: 500 })
  }
}
