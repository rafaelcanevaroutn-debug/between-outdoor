import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'
import path from 'node:path'
import fs from 'node:fs'

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { fileId } = await params

  try {
    const drive = getDriveClient()
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    )

    const buffer = Buffer.from(res.data as ArrayBuffer)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[PREVIEW] Error descargando imagen:', err)
    return new NextResponse('Error al cargar preview', { status: 500 })
  }
}
