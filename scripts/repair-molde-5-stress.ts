import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {buildCreativeStressMockData} from '../lib/creative-lab/stress-mock.ts'
import {buildCreativeStressResult} from '../lib/creative-lab/stress-status.ts'
import {validateCreativeTemplateHtml, type CreativeTemplateContract} from '../lib/creative-lab/template-contract.ts'
import {createAdminClient} from '../lib/supabase/admin.ts'
import {MOLDE_5_MOCK_TEXT} from '../lib/creative-lab/molde-5-lab.ts'

const id = '4c1d5cca-2d83-4124-893e-ce22f32e8a34'
const referenceRoot = process.env.CREATIVE_REFERENCE_ROOT?.trim() || '/Users/mac/Documents/Codex/2026-08-18/actu-s-como-dise-ador-senior/outputs'
const rendererModule = process.env.CREATIVE_RENDERER_MODULE?.trim() || path.resolve(process.cwd(), '../renderer/remotion-template/scripts/static_html_renderer.js')
const logoPath = path.join(referenceRoot, 'caminantes-assets/caminantes-logo.webp')
const backgroundPath = path.join(referenceRoot, 'caminantes-assets/fitz-roy-clear.jpg')
const normalBackgroundPath = path.join(referenceRoot, 'cancun-assets/playa-aerial.jpg')
if (![rendererModule, logoPath, backgroundPath, normalBackgroundPath].every(fs.existsSync)) throw new Error('Faltan renderer o assets')
const admin = createAdminClient()
const {data: row, error} = await admin.from('template_library').select('*').eq('id', id).single()
if (error || !row) throw new Error(error?.message ?? 'Molde 5 no encontrado')
const oldPanel = `.info-panel {
  position: absolute;
  z-index: 4;
  right: 0;
  bottom: 0;
  left: 0;
  height: 635px;
  padding: 132px 68px 52px;`
const newPanel = `.info-panel {
  position: absolute;
  z-index: 4;
  right: 0;
  bottom: 0;
  left: 0;
  height: 720px;
  padding: 130px 68px 42px;`
if (!row.html_template.includes(oldPanel) && !row.html_template.includes(newPanel)) throw new Error('El HTML ya no coincide con la revisión visual esperada')
const html = row.html_template.includes(oldPanel) ? row.html_template.replace(oldPanel, newPanel) : row.html_template
const contract: CreativeTemplateContract = {template_id: row.template_id, version: row.version, piece_type: row.piece_type, mold_type: row.mold_type, dimensions: {width: row.width, height: row.height}, variant: row.variant, slots: row.slots_schema, branding_tokens: row.branding_tokens}
const contractErrors = validateCreativeTemplateHtml(contract, html)
if (contractErrors.length) throw new Error(contractErrors.join('; '))
const dataUrl = (file: string, mime: string) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`
const mockData = buildCreativeStressMockData({contract, logoDataUrl: dataUrl(logoPath, 'image/webp'), backgroundDataUrl: dataUrl(backgroundPath, 'image/jpeg')})
const require = createRequire(import.meta.url)
const {renderStaticTemplatePreview} = require(rendererModule) as {renderStaticTemplatePreview: (payload: Record<string, unknown>) => Promise<Uint8Array>}
await renderStaticTemplatePreview({template: contract, html, mock_data: mockData, branding: {primary: '#93B653', secondary: '#76D4D7', background: '#0A1715', text: '#F5F1E8', font_title: 'Inter', font_body: 'Inter'}, strict_layout: true})
const normalPng = await renderStaticTemplatePreview({template: contract, html, mock_data: {...MOLDE_5_MOCK_TEXT, logo: dataUrl(logoPath, 'image/webp'), bg_image: dataUrl(normalBackgroundPath, 'image/jpeg')}, branding: {primary: '#D5FF36', secondary: '#76D4D7', background: '#07100F', text: '#FFFFFF', font_title: 'Playfair Display', font_body: 'Inter'}, strict_layout: true})
const {error: uploadError} = await admin.storage.from('creative-template-previews').upload(row.preview_storage_path, normalPng, {contentType: 'image/png', upsert: true})
if (uploadError) throw new Error(`No se pudo reemplazar el PNG: ${uploadError.message}`)
const {error: updateError} = await admin.from('template_library').update({html_template: html, ...buildCreativeStressResult({ok: true}), updated_at: new Date().toISOString()}).eq('id', id)
if (updateError) throw new Error(`No se pudo persistir la reparación: ${updateError.message}`)
console.log(JSON.stringify({id, repaired: true, stressPassed: true, previewStoragePath: row.preview_storage_path}))
