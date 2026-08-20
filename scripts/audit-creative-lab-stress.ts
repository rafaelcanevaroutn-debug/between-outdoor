import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'

import {buildCreativeStressMockData} from '../lib/creative-lab/stress-mock.ts'
import {buildCreativeStressResult} from '../lib/creative-lab/stress-status.ts'
import {validateCreativeTemplateHtml, type CreativeTemplateContract} from '../lib/creative-lab/template-contract.ts'
import {createAdminClient} from '../lib/supabase/admin.ts'

const execute = process.argv.includes('--execute')
const referenceRoot = process.env.CREATIVE_REFERENCE_ROOT?.trim() || '/Users/mac/Documents/Codex/2026-08-18/actu-s-como-dise-ador-senior/outputs'
const rendererModule = process.env.CREATIVE_RENDERER_MODULE?.trim() || path.resolve(process.cwd(), '../skill-carruseles/scripts/static_html_renderer.js')
const logoPath = path.join(referenceRoot, 'caminantes-assets/caminantes-logo.webp')
const backgroundPath = path.join(referenceRoot, 'caminantes-assets/fitz-roy-clear.jpg')
const ready = [rendererModule, logoPath, backgroundPath].every(filePath => fs.existsSync(filePath))
if (!execute) {
  console.log(JSON.stringify({mode: 'dry-run', rendererAndAssets: ready, next: 'Usar --execute; no llama a OpenAI ni modifica estados.'}, null, 2))
  process.exit(0)
}
if (!ready) throw new Error('Faltan renderer o assets de estrés')

const dataUrl = (filePath: string, mime: string) => `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`
const logoDataUrl = dataUrl(logoPath, 'image/webp')
const backgroundDataUrl = dataUrl(backgroundPath, 'image/jpeg')
const admin = createAdminClient()
const {data: rows, error} = await admin.from('template_library')
  .select('id,template_id,version,piece_type,mold_type,width,height,variant,slots_schema,branding_tokens,html_template,status,stress_tested_at,stress_test_passed,stress_test_error')
  .eq('status', 'experimental')
  .in('mold_type', [1, 2, 3, 4, 5, 6])
if (error) throw new Error(`No se pudieron cargar candidatos experimentales: ${error.message}`)
const require = createRequire(import.meta.url)
const {renderStaticTemplatePreview} = require(rendererModule) as {renderStaticTemplatePreview: (payload: Record<string, unknown>) => Promise<Uint8Array>}
const results: Array<{id: string; moldType: number; ok: boolean; error?: string}> = []
for (const row of rows ?? []) {
  const contract: CreativeTemplateContract = {template_id: row.template_id, version: row.version, piece_type: row.piece_type, mold_type: row.mold_type, dimensions: {width: row.width, height: row.height}, variant: row.variant, slots: row.slots_schema, branding_tokens: row.branding_tokens}
  try {
    const contractErrors = validateCreativeTemplateHtml(contract, row.html_template)
    if (contractErrors.length) throw new Error(contractErrors.join('; '))
    const mockData = buildCreativeStressMockData({contract, logoDataUrl, backgroundDataUrl})
    await renderStaticTemplatePreview({template: contract, html: row.html_template, mock_data: mockData, branding: {primary: '#93B653', secondary: '#76D4D7', background: '#0A1715', text: '#F5F1E8', font_title: 'Inter', font_body: 'Inter'}, strict_layout: true})
    const stressResult = buildCreativeStressResult({ok: true})
    const {error: updateError} = await admin.from('template_library').update(stressResult).eq('id', row.id)
    if (updateError) throw new Error(`El render pasó, pero no se pudo guardar el resultado: ${updateError.message}`)
    results.push({id: row.id, moldType: row.mold_type, ok: true})
  } catch (auditError) {
    const message = auditError instanceof Error ? auditError.message : 'Error desconocido'
    const {error: updateError} = await admin.from('template_library').update(buildCreativeStressResult({ok: false, error: message})).eq('id', row.id)
    if (updateError) throw new Error(`Falló la auditoría y tampoco se pudo guardar el resultado de ${row.id}: ${updateError.message}`)
    results.push({id: row.id, moldType: row.mold_type, ok: false, error: message})
  }
}
console.log(JSON.stringify({audited: results.length, passed: results.filter(item => item.ok).length, failed: results.filter(item => !item.ok).length, results}, null, 2))
