import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'

import {runCreativeLabBatch, type CreativeLabBatchDependencies, type CreativeLabBatchInput} from '../lib/creative-lab/batch.ts'
import {MOLDE_1_CREATIVE_BRAND_GUIDELINES, MOLDE_1_CREATIVE_BRIEF, MOLDE_1_CREATIVE_CONTRACT, MOLDE_1_CREATIVE_RUBRIC, MOLDE_1_MOCK_TEXT} from '../lib/creative-lab/molde-1-lab.ts'
import {MOLDE_3_CREATIVE_BRIEF, MOLDE_3_CREATIVE_CONTRACT, MOLDE_3_CREATIVE_RUBRIC, MOLDE_3_MOCK_TEXT} from '../lib/creative-lab/molde-3-lab.ts'
import {MOLDE_4_CREATIVE_BRIEF, MOLDE_4_CREATIVE_CONTRACT, MOLDE_4_CREATIVE_RUBRIC, MOLDE_4_MOCK_TEXT} from '../lib/creative-lab/molde-4-lab.ts'
import {MOLDE_5_CREATIVE_BRIEF, MOLDE_5_CREATIVE_CONTRACT, MOLDE_5_CREATIVE_RUBRIC, MOLDE_5_MOCK_TEXT} from '../lib/creative-lab/molde-5-lab.ts'
import {openAICreativeBudgetFromEnv, type OpenAICreativeBudgetSnapshot} from '../lib/creative-lab/openai-budget.ts'
import {critiqueCreativeCandidate, generateCreativeCandidates} from '../lib/creative-lab/openai-designer.ts'
import {createCreativeCandidatePersister} from '../lib/creative-lab/persistence.ts'

const execute = process.argv.includes('--execute')
const root = process.env.CREATIVE_REFERENCE_ROOT?.trim() || '/Users/mac/Documents/Codex/2026-08-18/actu-s-como-dise-ador-senior/outputs'
const rendererModule = process.env.CREATIVE_RENDERER_MODULE?.trim() || path.resolve(process.cwd(), '../renderer/remotion-template/scripts/static_html_renderer.js')
const ledgerRoot = process.env.CREATIVE_LEDGER_ROOT?.trim() || '/Users/mac/between-outdoor/.creative-lab'
const checkpointPath = path.join(process.cwd(), '.creative-lab/pre-metricool-closeout-paid-run.json')
const assets = {
  mountain: path.join(root, 'caminantes-assets/fitz-roy-sunset.jpg'),
  beach: path.join(root, 'cancun-assets/playa-aerial.jpg'),
  logo: path.join(root, 'caminantes-assets/caminantes-logo.webp'),
}

function dataUrl(file: string, mime: string): string { return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}` }
function historicalUsage(): Pick<OpenAICreativeBudgetSnapshot, 'spentUsd' | 'responses' | 'inputTokens' | 'outputTokens'> {
  const total = {spentUsd: 0, responses: 0, inputTokens: 0, outputTokens: 0}
  for (const name of ['molde-1-paid-run.json', 'moldes-2-6-paid-run.json']) {
    const file = path.join(ledgerRoot, name)
    if (!fs.existsSync(file)) continue
    const budget = (JSON.parse(fs.readFileSync(file, 'utf8')) as {budget?: Partial<typeof total>}).budget
    total.spentUsd += budget?.spentUsd ?? 0
    total.responses += budget?.responses ?? 0
    total.inputTokens += budget?.inputTokens ?? 0
    total.outputTokens += budget?.outputTokens ?? 0
  }
  if (fs.existsSync(checkpointPath)) {
    const budget = (JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as {budget?: Partial<typeof total>}).budget
    if (budget) return {spentUsd: budget.spentUsd ?? total.spentUsd, responses: budget.responses ?? total.responses, inputTokens: budget.inputTokens ?? total.inputTokens, outputTokens: budget.outputTokens ?? total.outputTokens}
  }
  return total
}

const initialUsage = historicalUsage()
const preflight = {
  mode: execute ? 'execute' : 'dry-run', renderer: fs.existsSync(rendererModule),
  assets: Object.fromEntries(Object.entries(assets).map(([key, file]) => [key, fs.existsSync(file)])),
  openai: Boolean(process.env.OPENAI_API_KEY?.trim()) && process.env.OPENAI_CREATIVE_MODEL === 'gpt-5.6-luna',
  historicalUsage: initialUsage,
  checkpointExists: fs.existsSync(checkpointPath),
}
if (!execute) { console.log(JSON.stringify(preflight, null, 2)); process.exit(0) }
if (!preflight.renderer || !Object.values(preflight.assets).every(Boolean) || !preflight.openai) throw new Error('Preflight incompleto; no se llamó a OpenAI')

const budget = openAICreativeBudgetFromEnv(process.env, initialUsage)
if (budget.limitUsd > 2 || budget.pricing.model !== 'gpt-5.6-luna' || budget.pricing.inputUsdPerMillion !== 0.20 || budget.pricing.outputUsdPerMillion !== 1.20) throw new Error('El tope/modelo/pricing no coincide con la autorización global de USD 2')
const require = createRequire(import.meta.url)
const {renderStaticTemplatePreview} = require(rendererModule) as {renderStaticTemplatePreview: (payload: Record<string, unknown>) => Promise<Uint8Array>}
const logo = dataUrl(assets.logo, 'image/webp')
const mountain = dataUrl(assets.mountain, 'image/jpeg')
const beach = dataUrl(assets.beach, 'image/jpeg')
const brandGuidelines = `${MOLDE_1_CREATIVE_BRAND_GUIDELINES} El resultado pertenece al cliente y usa sus tokens; no aplicar la identidad de interfaz Terreno de Between.`
const tasks = [
  {key: 'molde-1-minimo', contract: MOLDE_1_CREATIVE_CONTRACT, brief: `${MOLDE_1_CREATIVE_BRIEF} Dirección: composición mínima luminosa; el logo debe medir al menos 12% del ancho.`, rubric: MOLDE_1_CREATIVE_RUBRIC, mock: {...MOLDE_1_MOCK_TEXT, logo, bg_image: mountain}},
  {key: 'molde-3-comercial', contract: MOLDE_3_CREATIVE_CONTRACT, brief: `${MOLDE_3_CREATIVE_BRIEF} Dirección: lujo de viaje contemporáneo, precio claro sin estética de liquidación.`, rubric: MOLDE_3_CREATIVE_RUBRIC, mock: {...MOLDE_3_MOCK_TEXT, logo, bg_image: beach}},
  {key: 'molde-4-agenda', contract: MOLDE_4_CREATIVE_CONTRACT, brief: `${MOLDE_4_CREATIVE_BRIEF} Dirección: cartelera editorial con ritmo vertical y fotografía contenida.`, rubric: MOLDE_4_CREATIVE_RUBRIC, mock: {...MOLDE_4_MOCK_TEXT, logo, bg_image: mountain}},
  {key: 'molde-5-agencia', contract: MOLDE_5_CREATIVE_CONTRACT, brief: `${MOLDE_5_CREATIVE_BRIEF} Reservá cajas visibles para los SVG inyectados en slots *_icon.`, rubric: MOLDE_5_CREATIVE_RUBRIC, mock: {...MOLDE_5_MOCK_TEXT, logo, bg_image: beach}},
] as const
const branding = {primary: '#D5FF36', secondary: '#76D4D7', background: '#07100F', text: '#FFFFFF', font_title: 'Playfair Display' as const, font_body: 'Inter' as const}
const config = {apiKey: process.env.OPENAI_API_KEY!, model: process.env.OPENAI_CREATIVE_MODEL!, budget}
const checkpoint = fs.existsSync(checkpointPath) ? JSON.parse(fs.readFileSync(checkpointPath, 'utf8')) as {completed?: Record<string, unknown>} : {}
const completed = checkpoint.completed ?? {}
const failures: Array<{task: string; error: string}> = []
const runId = `closeout-${new Date().toISOString().replace(/[^0-9]/gu, '').slice(0, 14)}`
fs.mkdirSync(path.dirname(checkpointPath), {recursive: true})

for (const task of tasks) {
  if (completed[task.key]) continue
  for (let attempt = 1; attempt <= 2 && !completed[task.key]; attempt++) {
    try {
      const persist = createCreativeCandidatePersister({contract: task.contract, sourceModel: config.model, runId: `${runId}-${task.key}-${attempt}`})
      const input: CreativeLabBatchInput = {contract: task.contract, brief: task.brief, brandGuidelines, rubric: task.rubric, mockData: task.mock, branding, count: 1}
      const dependencies: CreativeLabBatchDependencies = {
        generate: value => generateCreativeCandidates({...value, approvedExamples: ['Referencias aprobadas: composición editorial premium, fotografía protagonista, jerarquía clara, logo con aire y sin apariencia de dashboard.'], config}),
        render: async value => new Uint8Array(await renderStaticTemplatePreview({template: value.contract, html: value.html, mock_data: value.mockData, branding: value.branding, strict_layout: value.strictLayout})),
        critique: value => critiqueCreativeCandidate({contract: value.contract, html: value.html, pngBase64: Buffer.from(value.previewPng).toString('base64'), rubric: value.rubric, config}),
        persist,
      }
      const result = await runCreativeLabBatch(input, dependencies)
      if (result.completed[0]) completed[task.key] = result.completed[0]
      failures.push(...result.failed.map(item => ({task: `${task.key}/${item.name}`, error: item.error})))
    } catch (error) {
      failures.push({task: `${task.key}/intento-${attempt}`, error: error instanceof Error ? error.message : 'Error desconocido'})
    }
    fs.writeFileSync(checkpointPath, JSON.stringify({runId, status: 'running', completed, failures, budget: budget.snapshot(), updatedAt: new Date().toISOString()}, null, 2))
  }
}
const missing = tasks.map(task => task.key).filter(key => !completed[key])
fs.writeFileSync(checkpointPath, JSON.stringify({runId, status: missing.length ? 'incomplete' : 'completed', completed, failures, missing, budget: budget.snapshot(), updatedAt: new Date().toISOString()}, null, 2))
console.log(JSON.stringify({completed, failures, missing, budget: budget.snapshot()}, null, 2))
if (missing.length) throw new Error(`Faltan candidatos: ${missing.join(', ')}`)
