import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'

import {MOLDE_1_MOCK_TEXT} from '../lib/creative-lab/molde-1-lab.ts'
import {MOLDE_2_MOCK_TEXT} from '../lib/creative-lab/molde-2-lab.ts'
import {MOLDE_6_MOCK_TEXT} from '../lib/creative-lab/molde-6-lab.ts'
import {validateCreativeTemplateHtml, type CreativeTemplateContract} from '../lib/creative-lab/template-contract.ts'
import {createAdminClient} from '../lib/supabase/admin.ts'

const execute = process.argv.includes('--execute')
const referenceRoot = process.env.CREATIVE_REFERENCE_ROOT?.trim() || '/Users/mac/Documents/Codex/2026-08-18/actu-s-como-dise-ador-senior/outputs'
const rendererModule = process.env.CREATIVE_RENDERER_MODULE?.trim() || path.resolve(process.cwd(), '../remotion-skill/remotion-template/scripts/static_html_renderer.js')
const outputDirectory = process.env.CREATIVE_LOGO_OUTPUT_DIR?.trim() || path.join(process.cwd(), 'outputs', 'creative-lab-logo-refresh')
const logoPath = path.join(referenceRoot, 'caminantes-assets/caminantes-logo.webp')
const chaltenPhotoPath = path.join(referenceRoot, 'caminantes-assets/fitz-roy-clear.jpg')
const mexicoPhotoPath = path.join(referenceRoot, 'cancun-assets/cancun-beach.jpg')
const rivieraPhotoPath = path.join(referenceRoot, 'cancun-assets/playa-aerial.jpg')

const candidates = {
  '68585dde-7092-4153-b8a3-a7d3f7b8dc56': {
    output: 'molde-1-riviera-logo-grande.png',
    css: '.slide__logo{width:220px!important;height:92px!important;object-fit:contain!important;object-position:right center!important}',
    mock: {...MOLDE_1_MOCK_TEXT, lugar: 'RIVIERA MAYA', fecha: '8 AL 15 DE MARZO', copy: 'Días de mar turquesa, selva y caminos mayas.', item_1: 'Cenotes escondidos', item_2: 'Costa del Caribe', item_3: 'Viaje acompañado'},
    photo: rivieraPhotoPath,
  },
  '0e95676a-370c-4622-8e4b-88c2a02eb053': {
    output: 'molde-2-talon-logo-grande.png',
    css: '.brandline{min-height:76px!important}.brandline .brand{max-width:98px!important;font-size:15px!important}.brandline .logo{box-sizing:border-box!important;width:154px!important;height:62px!important;flex:0 0 154px!important;padding:8px 10px!important;background:var(--brand-bg)!important;object-fit:contain!important}',
    mock: MOLDE_2_MOCK_TEXT,
    photo: mexicoPhotoPath,
  },
  '9d9a5df3-941b-46e9-8d8d-9ddc3d37b26b': {
    output: 'molde-2-editorial-logo-grande.png',
    css: '.brand .logo{width:224px!important;height:96px!important;flex:0 0 224px!important;object-fit:contain!important;object-position:left center!important}',
    mock: {...MOLDE_2_MOCK_TEXT, lugar: 'EL CHALTÉN', fecha: '27 DIC — 02 ENE', ficha_1: 'DURACIÓN · 7 DÍAS', ficha_2: 'MODALIDAD · GRUPAL', ficha_3: 'NIVEL · INTERMEDIO', ficha_4: 'RUTA · LAGUNA DE LOS TRES', ficha_5: 'GUÍA · ACOMPAÑADA', ficha_6: 'REGIÓN · PATAGONIA', cta: 'CONOCÉ LA TRAVESÍA'},
    photo: chaltenPhotoPath,
  },
  'e486f653-c257-468a-9985-e239dc61bac2': {
    output: 'molde-6-horizonte-logo-grande.png',
    css: '.header .logo{width:210px!important;height:64px!important;flex:0 0 210px!important;object-fit:contain!important}',
    mock: MOLDE_6_MOCK_TEXT,
    photo: chaltenPhotoPath,
  },
  '726bbbcb-0ff8-4160-825f-d9ac68a170ee': {
    output: 'molde-6-umbral-logo-grande.png',
    css: '.brand-lockup{width:620px!important}.brand-lockup .logo{width:210px!important;height:72px!important;flex:0 0 210px!important;object-fit:contain!important;object-position:left center!important}',
    mock: {...MOLDE_6_MOCK_TEXT, mensaje: 'Lo mejor del camino es descubrir que nunca caminamos solos.', convocatoria: 'Encontrá tu próxima aventura en comunidad.'},
    photo: mexicoPhotoPath,
  },
} as const

function dataUrl(filePath: string, mime: string): string {
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`
}

function applyLogoOverride(html: string, css: string): string {
  const withoutPrevious = html.replace(/\n?\/\* between-logo-visibility \*\/[\s\S]*?\/\* \/between-logo-visibility \*\//u, '')
  return withoutPrevious.replace('</style>', `\n/* between-logo-visibility */${css}/* /between-logo-visibility */\n</style>`)
}

async function main(): Promise<void> {
  const ready = [rendererModule, logoPath, chaltenPhotoPath, mexicoPhotoPath, rivieraPhotoPath].every(filePath => fs.existsSync(filePath))
  if (!execute) {
    console.log(JSON.stringify({mode: 'dry-run', candidates: Object.keys(candidates).length, rendererAndAssets: ready, outputDirectory, next: 'Usar --execute; no llama a OpenAI.'}, null, 2))
    return
  }
  if (!ready) throw new Error('Faltan renderer, logo o fotografías de prueba')

const admin = createAdminClient()
const ids = Object.keys(candidates)
const {data: rows, error} = await admin.from('template_library')
  .select('id,template_id,version,piece_type,mold_type,width,height,variant,slots_schema,branding_tokens,html_template,preview_storage_path')
  .in('id', ids)
if (error) throw new Error(`No se pudieron cargar los moldes: ${error.message}`)
if ((rows ?? []).length !== ids.length) throw new Error(`Se esperaban ${ids.length} moldes y llegaron ${(rows ?? []).length}`)

fs.mkdirSync(outputDirectory, {recursive: true})
const logo = dataUrl(logoPath, 'image/webp')
const require = createRequire(import.meta.url)
const {renderStaticTemplatePreview} = require(rendererModule) as {renderStaticTemplatePreview: (payload: Record<string, unknown>) => Promise<Uint8Array>}
const results: Array<{id: string; output: string; previewStoragePath: string}> = []

for (const row of rows ?? []) {
  const candidate = candidates[row.id as keyof typeof candidates]
  const contract: CreativeTemplateContract = {template_id: row.template_id, version: row.version, piece_type: row.piece_type, mold_type: row.mold_type, dimensions: {width: row.width, height: row.height}, variant: row.variant, slots: row.slots_schema, branding_tokens: row.branding_tokens}
  const html = applyLogoOverride(row.html_template, candidate.css)
  const contractErrors = validateCreativeTemplateHtml(contract, html)
  if (contractErrors.length) throw new Error(`${row.id}: ${contractErrors.join('; ')}`)
  const branding = row.mold_type === 1
    ? {primary: '#D5FF36', secondary: '#315B4C', background: '#07100F', text: '#FFFFFF', font_title: 'Playfair Display', font_body: 'Inter'}
    : {primary: '#93B653', secondary: '#76D4D7', background: '#0A1715', text: '#F5F1E8', font_title: 'Inter', font_body: 'Inter'}
  const png = new Uint8Array(await renderStaticTemplatePreview({template: contract, html, mock_data: {...candidate.mock, logo, bg_image: dataUrl(candidate.photo, 'image/jpeg')}, branding, strict_layout: true}))
  const output = path.join(outputDirectory, candidate.output)
  fs.writeFileSync(output, png)
  const oldPath = row.preview_storage_path as string | null
  const newPath = `${row.template_id}/${row.version}-logo-v2.png`
  const {error: uploadError} = await admin.storage.from('creative-template-previews').upload(newPath, png, {contentType: 'image/png', upsert: true})
  if (uploadError) throw new Error(`${row.id}: no se pudo subir el nuevo preview: ${uploadError.message}`)
  const {error: updateError} = await admin.from('template_library').update({html_template: html, preview_storage_path: newPath, stress_tested_at: null, stress_test_passed: false, stress_test_error: 'Pendiente después de ampliar el logo'}).eq('id', row.id)
  if (updateError) {
    await admin.storage.from('creative-template-previews').remove([newPath])
    throw new Error(`${row.id}: no se pudo actualizar el molde: ${updateError.message}`)
  }
  if (oldPath && oldPath !== newPath) await admin.storage.from('creative-template-previews').remove([oldPath])
  results.push({id: row.id, output, previewStoragePath: newPath})
}

  console.log(JSON.stringify({updated: results.length, openAiCostUsd: 0, results}, null, 2))
}

void main()
