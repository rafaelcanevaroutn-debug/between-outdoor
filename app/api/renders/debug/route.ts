import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { google } from 'googleapis'
import path from 'node:path'
import fs from 'node:fs'

function getDrive() {
  const oauthPath = path.join(process.cwd(), 'oauth-credentials.json')
  const tokenPath  = path.join(process.cwd(), 'token.json')
  const oauthCreds = JSON.parse(fs.readFileSync(oauthPath, 'utf-8'))
  const token      = JSON.parse(fs.readFileSync(tokenPath,  'utf-8'))
  const { client_id, client_secret } = oauthCreds.web ?? oauthCreds.installed ?? oauthCreds
  const oauth2 = new google.auth.OAuth2(client_id, client_secret)
  oauth2.setCredentials(token)
  return google.drive({ version: 'v3', auth: oauth2 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const folderId = req.nextUrl.searchParams.get('folderId')
  if (!folderId) {
    // Listar render_folder_ids del usuario
    const { data } = await createAdminClient()
      .from('contenido_generado')
      .select('id, formato, render_folder_id, angulo, created_at')
      .eq('user_id', user.id)
      .not('render_folder_id', 'is', null)
      .order('created_at', { ascending: false })
    return NextResponse.json({ rows: data })
  }

  // Listar TODO lo que hay en ese folder (sin filtro de mimeType)
  const drive = getDrive()
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
    orderBy: 'name',
    pageSize: 100,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  return NextResponse.json({ folderId, files: res.data.files ?? [] })
}
