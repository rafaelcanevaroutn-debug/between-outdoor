import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'

import {createAdminClient} from '../lib/supabase/admin.ts'
import {MOLDE_4_CREATIVE_CONTRACT, MOLDE_4_MOCK_TEXT} from '../lib/creative-lab/molde-4-lab.ts'
import {addPricesToApprovedMolde4} from '../lib/creative-lab/upgrade-molde-4-template.ts'

const execute = process.argv.includes('--execute')
const refresh = process.argv.includes('--refresh')
const sourceId = process.env.MOLDE_4_SOURCE_TEMPLATE_ID?.trim()
const rendererModule = process.env.CREATIVE_RENDERER_MODULE?.trim() || path.resolve(process.cwd(), '../renderer/remotion-template/scripts/static_html_renderer.js')
const assetRoot = process.env.CREATIVE_REFERENCE_ROOT?.trim() || '/Users/mac/Documents/Codex/2026-08-18/actu-s-como-dise-ador-senior/outputs'
const logoPath = path.join(assetRoot, 'caminantes-assets/caminantes-logo.webp')
const photoPath = path.join(assetRoot, 'caminantes-assets/fitz-roy-sunset.jpg')
const dataUrl = (file: string, mime: string) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`

if (!fs.existsSync(rendererModule) || !fs.existsSync(logoPath) || !fs.existsSync(photoPath)) throw new Error('Faltan renderer o assets de prueba')
const admin = createAdminClient()
let query = admin.from('template_library').select('*').eq('mold_type', 4).eq('status', 'approved').eq('stress_test_passed', true)
if (sourceId) query = query.eq('id', sourceId)
const {data: rows, error: sourceError} = await query.order('approved_at', {ascending: false}).limit(1)
if (sourceError || !rows?.[0]) throw new Error(`No se encontró Molde 4 aprobado: ${sourceError?.message ?? 'sin filas'}`)
const source = rows[0]
const templateId = `${source.template_id}-price`
const {data: existing, error: existingError} = await admin.from('template_library').select('id,status,preview_storage_path').eq('template_id', templateId).eq('version', MOLDE_4_CREATIVE_CONTRACT.version).maybeSingle()
if (existingError) throw new Error(`No se pudo revisar Molde 4 v2: ${existingError.message}`)
if (existing && !refresh) { console.log(JSON.stringify({mode: 'existing', ...existing}, null, 2)); process.exit(0) }

const html = addPricesToApprovedMolde4(source.html_template as string)
const require = createRequire(import.meta.url)
const {renderStaticTemplatePreview} = require(rendererModule) as {renderStaticTemplatePreview: (payload: Record<string, unknown>) => Promise<Uint8Array>}
const mock = {...MOLDE_4_MOCK_TEXT, logo: dataUrl(logoPath, 'image/webp'), bg_image: dataUrl(photoPath, 'image/jpeg')}
const branding = {primary: '#315B4C', secondary: '#76D4D7', background: '#FAFAF7', text: '#161915', font_title: 'Playfair Display', font_body: 'Inter'}
const preview = new Uint8Array(await renderStaticTemplatePreview({template: MOLDE_4_CREATIVE_CONTRACT, html, mock_data: mock, branding, strict_layout: true}))
const stress = {...mock, titulo: 'AGENDA DE PRÓXIMAS AVENTURAS', salida_1_lugar: 'PARQUE NACIONAL LOS GLACIARES', salida_1_fecha: '15 AL 24 DE NOVIEMBRE', salida_1_precio: 'DESDE USD 12.990'}
await renderStaticTemplatePreview({template: MOLDE_4_CREATIVE_CONTRACT, html, mock_data: stress, branding, strict_layout: true})
const localPreview = process.env.CREATIVE_PREVIEW_OUTPUT?.trim() || '/tmp/between-molde-4-v2.png'
fs.mkdirSync(path.dirname(localPreview), {recursive: true})
fs.writeFileSync(localPreview, preview)
if (!execute) { console.log(JSON.stringify({mode: 'dry-run', sourceId: source.id, templateId, localPreview, bytes: preview.byteLength}, null, 2)); process.exit(0) }

const storagePath = `${templateId}/${MOLDE_4_CREATIVE_CONTRACT.version}.png`
const {error: uploadError} = await admin.storage.from('creative-template-previews').upload(storagePath, preview, {contentType: 'image/png', upsert: Boolean(existing)})
if (uploadError) throw new Error(`No se pudo guardar preview Molde 4 v2: ${uploadError.message}`)
const now = new Date().toISOString()
if (existing) {
  const {data: updated, error: updateError} = await admin.from('template_library').update({
    html_template: html, slots_schema: MOLDE_4_CREATIVE_CONTRACT.slots, preview_storage_path: storagePath,
    stress_test_passed: true, stress_test_error: null, stress_tested_at: now, updated_at: now,
  }).eq('id', existing.id).eq('status', 'experimental').select('id,status,preview_storage_path').single()
  if (updateError || !updated) throw new Error(`No se pudo actualizar Molde 4 v2: ${updateError?.message ?? 'sin respuesta'}`)
  console.log(JSON.stringify({mode: 'refreshed', ...updated, localPreview}, null, 2))
  process.exit(0)
}
const {data: inserted, error: insertError} = await admin.from('template_library').insert({
  template_id: templateId, version: MOLDE_4_CREATIVE_CONTRACT.version, piece_type: 'banner', mold_type: 4,
  width: 1080, height: 1350, variant: source.variant, status: 'experimental', slots_schema: MOLDE_4_CREATIVE_CONTRACT.slots,
  branding_tokens: MOLDE_4_CREATIVE_CONTRACT.branding_tokens, html_template: html, preview_storage_path: storagePath,
  source_model: 'deterministic-upgrade', parent_template_id: source.id, critique_summary: JSON.stringify({rationale: 'Agrega precio verificado a cada salida sin cambiar la dirección visual aprobada.'}),
  stress_test_passed: true, stress_test_error: null, stress_tested_at: now, updated_at: now,
}).select('id,status,preview_storage_path').single()
if (insertError || !inserted) {
  await admin.storage.from('creative-template-previews').remove([storagePath])
  throw new Error(`No se pudo guardar Molde 4 v2: ${insertError?.message ?? 'sin respuesta'}`)
}
console.log(JSON.stringify({mode: 'created', ...inserted, localPreview}, null, 2))
