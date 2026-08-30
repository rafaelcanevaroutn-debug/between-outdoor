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
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const developmentPreview = process.env.NODE_ENV === 'development'
    && request.headers.get('referer')?.includes('/auth/design-studio-preview')
  if (!developmentPreview) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('No autorizado', { status: 401 })
  }

  const { fileId } = await params

  try {
    const drive = getDriveClient()
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' },
    )

    return new NextResponse(res.data as string, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Between-Template-Preview': '1',
        // Allow iframe embedding from same origin
        'X-Frame-Options': 'SAMEORIGIN',
      },
    })
  } catch (err) {
    console.error('[TEMPLATE-HTML] Error descargando HTML:', err)
    return new NextResponse('Error al cargar template', { status: 500 })
  }
}
