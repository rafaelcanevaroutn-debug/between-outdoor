import { getRenderCarpetasByIds } from '../lib/google-drive'
import * as fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=')
  if (key && val) acc[key.trim()] = val.join('=').trim()
  return acc
}, {} as Record<string, string>)
Object.assign(process.env, env)

import { getDriveClient } from '../lib/google-drive'

async function main() {
  try {
    const { getDriveClient } = await import('../lib/google-drive')
    const drive = getDriveClient()
    const res = await drive.files.list({
      q: "mimeType='video/mp4'",
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 5,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    })
    console.log('Recent videos:', res.data.files)
  } catch (err: any) {
    console.error('Failed:', err.message || err)
  }
}

main()
