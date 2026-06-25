import { google } from 'googleapis'
import fs from 'node:fs'
import path from 'node:path'

const OAUTH_CREDS_PATH = path.join(process.cwd(), 'oauth-credentials.json')
const TOKEN_PATH = path.join(process.cwd(), 'token.json')

export function getOAuthClient() {
  const { installed } = JSON.parse(fs.readFileSync(OAUTH_CREDS_PATH, 'utf-8'))
  const oauth2 = new google.auth.OAuth2(
    installed.client_id,
    installed.client_secret,
    installed.redirect_uris[0],
  )
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
  oauth2.setCredentials(token)

  // Auto-save refreshed tokens
  oauth2.on('tokens', updated => {
    const current = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
    fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...current, ...updated }, null, 2))
  })

  return oauth2
}

export function getDriveClient() {
  return google.drive({ version: 'v3', auth: getOAuthClient() })
}
