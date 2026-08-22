import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'

import {runCreativeLabBatch, type CreativeLabBatchDependencies, type CreativeLabBatchInput} from '../lib/creative-lab/batch.ts'
import {
  MOLDE_1_CREATIVE_BRAND_GUIDELINES,
  MOLDE_1_CREATIVE_BRIEF,
  MOLDE_1_CREATIVE_CONTRACT,
  MOLDE_1_CREATIVE_RUBRIC,
  MOLDE_1_MOCK_TEXT,
} from '../lib/creative-lab/molde-1-lab.ts'
import {openAICreativeBudgetFromEnv} from '../lib/creative-lab/openai-budget.ts'
import {critiqueCreativeCandidate, generateCreativeCandidates} from '../lib/creative-lab/openai-designer.ts'
import {createCreativeCandidatePersister} from '../lib/creative-lab/persistence.ts'
import {formatCreativeVisualSeedsForPrompt, selectCreativeVisualSeeds} from '../lib/creative-lab/reference-seeds.ts'
import {createAdminClient} from '../lib/supabase/admin.ts'

const execute = process.argv.includes('--execute')
const resume = process.argv.includes('--resume')
const countArg = process.argv.find(value => value.startsWith('--count='))
const count = countArg ? Number(countArg.slice('--count='.length)) : 2
if (!Number.isInteger(count) || count < 1 || count > 2) throw new Error('--count debe ser 1 o 2')

const outputRoot = process.env.CREATIVE_REFERENCE_ROOT?.trim()
  || '/Users/mac/Documents/Codex/2026-08-18/actu-s-como-dise-ador-senior/outputs'
const rendererModule = process.env.CREATIVE_RENDERER_MODULE?.trim()
  || path.resolve(process.cwd(), '../skill-carruseles/scripts/static_html_renderer.js')
const photoPath = path.join(outputRoot, 'caminantes-assets/fitz-roy-laguna.jpg')
const chaltenPhotoPath = path.join(outputRoot, 'caminantes-assets/fitz-roy-sunset.jpg')
const mexicoPhotoPath = path.join(outputRoot, 'cancun-assets/playa-aerial.jpg')
const logoPath = path.join(outputRoot, 'caminantes-assets/caminantes-logo.webp')
const hasVerifiedPricing = process.env.OPENAI_CREATIVE_MODEL?.trim() === 'gpt-5.6-luna'
const checkpointDirectory = path.join(process.cwd(), '.creative-lab')
const checkpointPath = path.join(checkpointDirectory, 'molde-1-paid-run.json')

function configured(name: string): boolean {
  return Boolean(process.env[name]?.trim())
}

function dataUrl(filePath: string, mime: string): string {
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`
}

async function databaseReady(): Promise<{ok: boolean; detail: string}> {
  if (!configured('NEXT_PUBLIC_SUPABASE_URL') || !configured('SUPABASE_SERVICE_ROLE_KEY')) {
    return {ok: false, detail: 'faltan variables Supabase'}
  }
  const client = createAdminClient()
  const [{error: tableError}, {data: bucket, error: bucketError}] = await Promise.all([
    client.from('template_library').select('id,preview_storage_path').limit(1),
    client.storage.getBucket('creative-template-previews'),
  ])
  if (tableError) return {ok: false, detail: `tabla/columna: ${tableError.message}`}
  if (bucketError || !bucket) return {ok: false, detail: `bucket: ${bucketError?.message ?? 'no existe'}`}
  return {ok: true, detail: 'tabla, columna y bucket disponibles'}
}

const preflight = {
  mode: execute ? 'execute' : 'dry-run',
  count,
  rendererModule: fs.existsSync(rendererModule),
  photo: fs.existsSync(photoPath),
  chaltenPhoto: fs.existsSync(chaltenPhotoPath),
  mexicoPhoto: fs.existsSync(mexicoPhotoPath),
  logo: fs.existsSync(logoPath),
  openai: {
    apiKey: configured('OPENAI_API_KEY'),
    model: hasVerifiedPricing,
    budget: configured('OPENAI_CREATIVE_BUDGET_USD'),
    inputPricing: configured('OPENAI_CREATIVE_INPUT_USD_PER_1M') || hasVerifiedPricing,
    outputPricing: configured('OPENAI_CREATIVE_OUTPUT_USD_PER_1M') || hasVerifiedPricing,
  },
  database: await databaseReady(),
  paidRunAvailable: !fs.existsSync(checkpointPath) || resume,
}

if (!execute) {
  console.log(JSON.stringify({preflight, next: 'Usar --execute únicamente cuando todos los checks estén verdes.'}, null, 2))
  process.exit(0)
}

if (!preflight.rendererModule || !preflight.photo || !preflight.chaltenPhoto || !preflight.mexicoPhoto || !preflight.logo) throw new Error('Faltan renderer o assets aprobados')
if (!Object.values(preflight.openai).every(Boolean)) throw new Error('Configuración OpenAI incompleta; no se realizó ninguna llamada')
if (!preflight.database.ok) throw new Error(`Persistencia no disponible: ${preflight.database.detail}`)
if (!preflight.paidRunAvailable) throw new Error('Esta autorización paga ya tiene un checkpoint; usá --resume para continuar el mismo presupuesto')

type StoredCheckpoint = {
  runId?: string
  status?: string
  budget?: {spentUsd: number; responses: number; inputTokens: number; outputTokens: number}
}
const previousCheckpoint: StoredCheckpoint | undefined = resume && fs.existsSync(checkpointPath)
  ? JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as StoredCheckpoint
  : undefined
if (resume && !previousCheckpoint?.budget) {
  throw new Error('El checkpoint no es reanudable o no contiene el gasto liquidado')
}
const budget = openAICreativeBudgetFromEnv(process.env, previousCheckpoint?.budget)
if (budget.limitUsd > 2) throw new Error('El runner de Molde 1 no admite un tope mayor a USD 2')
if (budget.pricing.model !== 'gpt-5.6-luna' || budget.pricing.inputUsdPerMillion !== 0.20 || budget.pricing.outputUsdPerMillion !== 1.20) {
  throw new Error('Modelo o pricing no coinciden con la allowlist verificada')
}
const require = createRequire(import.meta.url)
const {renderStaticTemplatePreview} = require(rendererModule) as {
  renderStaticTemplatePreview: (payload: Record<string, unknown>) => Promise<Uint8Array>
}
const scenarios = [
  {
    ...MOLDE_1_MOCK_TEXT,
    lugar: 'EL CHALTÉN',
    fecha: '6 AL 10 DE DICIEMBRE',
    copy: 'Seguí el viento hasta las agujas de granito.',
    item_1: 'Laguna de los Tres',
    item_2: 'Pliegue Tumbado',
    item_3: 'Grupo reducido',
    bg_image: dataUrl(chaltenPhotoPath, 'image/jpeg'),
    logo: dataUrl(logoPath, 'image/webp'),
  },
  {
    ...MOLDE_1_MOCK_TEXT,
    lugar: 'RIVIERA MAYA',
    fecha: '8 AL 15 DE MARZO',
    copy: 'Días de mar turquesa, selva y caminos mayas.',
    item_1: 'Cenotes escondidos',
    item_2: 'Costa del Caribe',
    item_3: 'Viaje acompañado',
    bg_image: dataUrl(mexicoPhotoPath, 'image/jpeg'),
    logo: dataUrl(logoPath, 'image/webp'),
  },
]
const branding = {
  primary: '#D5FF36', secondary: '#315B4C', background: '#07100F', text: '#FFFFFF',
  font_title: 'Playfair Display' as const, font_body: 'Inter' as const,
}
const config = {
  apiKey: process.env.OPENAI_API_KEY!,
  model: process.env.OPENAI_CREATIVE_MODEL!,
  budget,
}
const runId = previousCheckpoint?.runId || new Date().toISOString().replace(/[^0-9]/gu, '').slice(0, 14)
const {data: previousRows, error: previousRowsError} = await createAdminClient()
  .from('template_library')
  .select('id,template_id,status')
  .eq('source_model', config.model)
if (previousRowsError) throw new Error(`No se pudo recuperar el avance previo: ${previousRowsError.message}`)
const previousCompleted = (previousRows ?? [])
  .filter(row => row.status !== 'rejected' && typeof row.template_id === 'string' && row.template_id.includes(runId))
  .map(row => ({id: row.id as string, name: 'candidato persistido previamente', corrected: true}))
const persistenceRunId = `${runId}-${Date.now().toString(36)}`
const persist = createCreativeCandidatePersister({
  contract: MOLDE_1_CREATIVE_CONTRACT,
  sourceModel: config.model,
  runId: persistenceRunId,
})
const batchInput: CreativeLabBatchInput = {
  contract: MOLDE_1_CREATIVE_CONTRACT,
  brief: MOLDE_1_CREATIVE_BRIEF,
  brandGuidelines: MOLDE_1_CREATIVE_BRAND_GUIDELINES,
  rubric: MOLDE_1_CREATIVE_RUBRIC,
  mockData: scenarios[0],
  branding,
  count: 1,
}
const dependencies: CreativeLabBatchDependencies = {
  generate: input => generateCreativeCandidates({
    ...input,
    approvedExamples: formatCreativeVisualSeedsForPrompt(selectCreativeVisualSeeds({moldType: 1, limit: 2})),
    config,
  }),
  render: async input => {
    const png = await renderStaticTemplatePreview({
      template: input.contract,
      html: input.html,
      mock_data: input.mockData,
      branding: input.branding,
      strict_layout: input.strictLayout,
    })
    return new Uint8Array(png)
  },
  critique: input => critiqueCreativeCandidate({
    contract: input.contract,
    html: input.html,
    pngBase64: Buffer.from(input.previewPng).toString('base64'),
    rubric: input.rubric,
    config,
  }),
  persist,
}

fs.mkdirSync(checkpointDirectory, {recursive: true})
if (!resume) {
  const checkpoint = fs.openSync(checkpointPath, 'wx')
  fs.writeFileSync(checkpoint, JSON.stringify({runId, status: 'started', limitUsd: budget.limitUsd, startedAt: new Date().toISOString()}, null, 2))
  fs.closeSync(checkpoint)
}

const result = {completed: previousCompleted, failed: [] as Array<{name: string; error: string}>}
try {
  // Un candidato por llamada: si el segundo HTML fuera inválido, el primero ya
  // quedó renderizado y persistido en vez de perder toda la respuesta paga.
  const maxAttempts = Math.max(3, (count - result.completed.length) * 3)
  for (let attempt = 1; attempt <= maxAttempts && result.completed.length < count; attempt++) {
    try {
      const scenarioInput = {...batchInput, mockData: scenarios[result.completed.length % scenarios.length]}
      const partial = await runCreativeLabBatch(scenarioInput, dependencies)
      result.completed.push(...partial.completed)
      result.failed.push(...partial.failed)
    } catch (error) {
      if (error instanceof Error && error.name === 'OpenAICreativeBudgetExceededError') throw error
      result.failed.push({name: `intento-${attempt}`, error: error instanceof Error ? error.message : 'Error desconocido'})
    }
    fs.writeFileSync(checkpointPath, JSON.stringify({runId, status: 'running', result, budget: budget.snapshot(), updatedAt: new Date().toISOString()}, null, 2))
  }
  if (result.completed.length < count) throw new Error(`No se lograron ${count} candidatos válidos en ${maxAttempts} intentos`)
  fs.writeFileSync(checkpointPath, JSON.stringify({runId, status: 'completed', result, budget: budget.snapshot(), completedAt: new Date().toISOString()}, null, 2))
  console.log(JSON.stringify({runId, result, budget: budget.snapshot()}, null, 2))
} catch (error) {
  fs.writeFileSync(checkpointPath, JSON.stringify({runId, status: 'stopped', error: error instanceof Error ? error.message : 'Error desconocido', result, budget: budget.snapshot(), stoppedAt: new Date().toISOString()}, null, 2))
  throw error
}
