import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'

import {createAdminClient} from '../lib/supabase/admin.ts'

const execute = process.argv.includes('--execute')
const rendererModule = process.env.CREATIVE_RENDERER_LIBRARY_MODULE?.trim() || path.resolve(process.cwd(), '../skill-carruseles/scripts/approved_template_library.js')
const referenceRoot = process.env.CREATIVE_REFERENCE_ROOT?.trim() || '/Users/mac/Documents/Codex/2026-08-18/actu-s-como-dise-ador-senior/outputs'
const backgroundPath = path.join(referenceRoot, 'caminantes-assets/fitz-roy-sunset.jpg')
const outputPath = process.env.CREATIVE_PRODUCTION_PREVIEW_PATH?.trim() || path.join(process.cwd(), 'outputs', 'approved-library-production-preview.png')

function dataUrl(filePath: string, mime: string): string {
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`
}

async function main(): Promise<void> {
  const assetsReady = [rendererModule, backgroundPath].every(filePath => fs.existsSync(filePath))
  if (!execute) {
    console.log(JSON.stringify({mode: 'dry-run', assetsReady, outputPath, openAiCostUsd: 0, next: 'Usar --execute para reutilizar un molde aprobado con copy y foto distintos.'}, null, 2))
    return
  }
  if (!assetsReady) throw new Error('Falta el renderer de biblioteca o la foto alternativa')

  const admin = createAdminClient()
  const [{data: templates, error: templateError}, {data: brands, error: brandError}] = await Promise.all([
    admin.from('template_library').select('id').eq('status', 'approved').eq('stress_test_passed', true).eq('mold_type', 6).order('approved_at', {ascending: false}).limit(1),
    admin.from('brand_identity').select('logo_url,color_acento').not('logo_url', 'is', null).limit(1),
  ])
  if (templateError || brandError) throw new Error(templateError?.message ?? brandError?.message)
  const template = templates?.[0]
  const brand = brands?.[0]
  if (!template?.id) throw new Error('No existe un Molde 6 aprobado')
  if (!brand?.logo_url) throw new Error('No existe un logo de marca configurado')

  const require = createRequire(import.meta.url)
  const {renderApprovedLibraryPreview} = require(rendererModule) as {
    renderApprovedLibraryPreview: (payload: Record<string, unknown>, options: Record<string, unknown>) => Promise<Uint8Array>
  }
  const payload = {
    templateRecordId: template.id,
    templateId: 'banner/molde-6@1',
    requestId: `production-reuse-${Date.now()}`,
    content: {
      contentKind: 'banner/molde-6',
      mensaje: 'Hay paisajes que cambian cuando aprendemos a mirarlos juntos.',
      convocatoria: 'Volvé a elegir el camino compartido.',
      typographyId: 'Inter',
    },
    backgroundDriveFileId: 'local-production-check',
    brand: {
      clientId: 'caminantes',
      clientDriveFolderId: 'local-production-check',
      name: 'CAMINANTES VIAJES',
      logoUrl: brand.logo_url,
      accentColor: brand.color_acento || '#93B653',
    },
  }
  const png = new Uint8Array(await renderApprovedLibraryPreview(payload, {
    env: process.env,
    getBackgroundDataUrl: async () => dataUrl(backgroundPath, 'image/jpeg'),
  }))
  fs.mkdirSync(path.dirname(outputPath), {recursive: true})
  fs.writeFileSync(outputPath, png)
  console.log(JSON.stringify({templateRecordId: template.id, outputPath, pngBytes: png.byteLength, openAiCostUsd: 0}, null, 2))
}

void main()
