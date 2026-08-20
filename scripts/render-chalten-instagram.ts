import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'

import {getDriveClient} from '../lib/google-drive.ts'

const DRIVE_PHOTO_ID = process.env.CHALTEN_DRIVE_PHOTO_ID?.trim() || '1ip82GoHnQItd41TpaN5mi2xbqsj09u1E'
const referenceRoot = process.env.CREATIVE_REFERENCE_ROOT?.trim() || '/Users/mac/Documents/Codex/2026-08-18/actu-s-como-dise-ador-senior/outputs'
const sourcePath = path.join(referenceRoot, 'caminantes-el-chalten-demo.html')
const logoPath = path.join(referenceRoot, 'caminantes-assets/caminantes-logo.webp')
const outputPath = process.env.CHALTEN_BANNER_OUTPUT?.trim() || path.resolve(process.cwd(), 'outputs/banner-instagram-fin-de-ano-el-chalten.png')

const drive = getDriveClient()
const photoResponse = await drive.files.get(
  {fileId: DRIVE_PHOTO_ID, alt: 'media', supportsAllDrives: true},
  {responseType: 'arraybuffer'},
)
const photo = Buffer.from(photoResponse.data as ArrayBuffer)
if (photo.byteLength < 10_000 || photo.byteLength > 8_000_000) throw new Error('La foto de Drive tiene un tamaño inválido')

const photoUrl = `data:image/jpeg;base64,${photo.toString('base64')}`
const logoUrl = `data:image/webp;base64,${fs.readFileSync(logoPath).toString('base64')}`
let html = fs.readFileSync(sourcePath, 'utf8')
html = html
  .replace(/<script>[\s\S]*?<\/script>/gu, '')
  .replaceAll('src="caminantes-assets/caminantes-logo.webp"', `src="${logoUrl}"`)
  .replace('url("caminantes-assets/fitz-roy-clear.jpg")', `url("${photoUrl}")`)
  .replace('Nueva fecha · Patagonia', 'Fin de Año · Patagonia')
  .replace('Quiero viajar <span class="arrow">↗</span>', 'GUARDÁ ESTA SALIDA')
  .replace('</head>', `<style>
    .layout { display: none !important; }
    .l2 { display: block !important; }
    .l2__photo { background-position: 50% 43% !important; }
    .l2__cta {
      margin-top: 22px !important;
      height: auto !important;
      min-height: 0 !important;
      padding: 18px 0 0 !important;
      border-top: 1px solid rgba(255,255,255,.45) !important;
      background: transparent !important;
      color: var(--white) !important;
      display: block !important;
    }
  </style></head>`)

const requireFromRenderer = createRequire('/Users/mac/remotion-skill/remotion-template/package.json')
const puppeteer = requireFromRenderer('puppeteer-core') as {
  launch: (options: Record<string, unknown>) => Promise<{
    newPage: () => Promise<{
      setJavaScriptEnabled: (enabled: boolean) => Promise<void>
      setViewport: (viewport: Record<string, number>) => Promise<void>
      setContent: (content: string, options: Record<string, string>) => Promise<void>
      evaluate: (callback: () => Promise<void>) => Promise<void>
      screenshot: (options: Record<string, unknown>) => Promise<unknown>
    }>
    close: () => Promise<void>
  }>
}
const {ensureBrowser} = requireFromRenderer('@remotion/renderer') as {ensureBrowser: (options: {logLevel: string}) => Promise<{path?: string}>}
const browserStatus = await ensureBrowser({logLevel: 'error'})
if (!browserStatus.path) throw new Error('Chromium no está disponible')
const browser = await puppeteer.launch({executablePath: browserStatus.path, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']})
try {
  const page = await browser.newPage()
  await page.setJavaScriptEnabled(false)
  await page.setViewport({width: 1080, height: 1350, deviceScaleFactor: 1})
  await page.setContent(html, {waitUntil: 'load'})
  await page.evaluate(async () => { await document.fonts.ready })
  fs.mkdirSync(path.dirname(outputPath), {recursive: true})
  await page.screenshot({path: outputPath as `${string}.png`, type: 'png', clip: {x: 0, y: 0, width: 1080, height: 1350}})
} finally {
  await browser.close()
}

console.log(JSON.stringify({outputPath, drivePhotoId: DRIVE_PHOTO_ID, width: 1080, height: 1350}, null, 2))
