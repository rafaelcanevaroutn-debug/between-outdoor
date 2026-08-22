import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'

import {runCreativeLabBatch, type CreativeLabBatchDependencies, type CreativeLabBatchInput} from '../lib/creative-lab/batch.ts'
import {MOLDE_2_CREATIVE_BRAND_GUIDELINES, MOLDE_2_CREATIVE_BRIEF, MOLDE_2_CREATIVE_CONTRACT, MOLDE_2_CREATIVE_RUBRIC, MOLDE_2_CREATIVE_SKELETON, MOLDE_2_MOCK_TEXT} from '../lib/creative-lab/molde-2-lab.ts'
import {MOLDE_6_CREATIVE_BRAND_GUIDELINES, MOLDE_6_CREATIVE_BRIEF, MOLDE_6_CREATIVE_CONTRACT, MOLDE_6_CREATIVE_RUBRIC, MOLDE_6_CREATIVE_SKELETON, MOLDE_6_MOCK_TEXT} from '../lib/creative-lab/molde-6-lab.ts'
import {openAICreativeBudgetFromEnv, type OpenAICreativeBudgetSnapshot} from '../lib/creative-lab/openai-budget.ts'
import {critiqueCreativeCandidate, generateCreativeCandidatesFromSkeleton, type CreativeVisualReference} from '../lib/creative-lab/openai-designer.ts'
import {createCreativeCandidatePersister} from '../lib/creative-lab/persistence.ts'
import {formatCreativeVisualSeedsForPrompt, selectCreativeVisualSeeds, type CreativeVisualSeedId} from '../lib/creative-lab/reference-seeds.ts'
import {createAdminClient} from '../lib/supabase/admin.ts'
import type {CreativeTemplateContract} from '../lib/creative-lab/template-contract.ts'

type Mold = 2 | 6
type InitialUsage = Pick<OpenAICreativeBudgetSnapshot, 'spentUsd' | 'responses' | 'inputTokens' | 'outputTokens'>
type Task = {key: string; mold: Mold; contract: CreativeTemplateContract; brief: string; brandGuidelines: string; rubric: string; seedId: CreativeVisualSeedId; visualReferencePath: string; visualReferenceLabel: string; mockData: Record<string, string>}
type StoredCheckpoint = {runId: string; status: string; completedTasks: Record<string, {id: string; name: string; corrected: boolean}>; failures: Array<{task: string; error: string}>; budget: InitialUsage}

const execute = process.argv.includes('--execute')
const resume = process.argv.includes('--resume')
const moldArg = process.argv.find(value => value.startsWith('--mold='))?.slice('--mold='.length) ?? 'all'
if (!['2', '6', 'all'].includes(moldArg)) throw new Error('--mold debe ser 2, 6 o all')

const referenceRoot = process.env.CREATIVE_REFERENCE_ROOT?.trim() || '/Users/mac/Documents/Codex/2026-08-18/actu-s-como-dise-ador-senior/outputs'
const rendererModule = process.env.CREATIVE_RENDERER_MODULE?.trim() || path.resolve(process.cwd(), '../skill-carruseles/scripts/static_html_renderer.js')
const checkpointDirectory = path.join(process.cwd(), '.creative-lab')
const checkpointPath = path.join(checkpointDirectory, 'moldes-2-6-paid-run.json')
const previousMolde1CheckpointPath = path.join(checkpointDirectory, 'molde-1-paid-run.json')
const logoPath = path.join(referenceRoot, 'caminantes-assets/caminantes-logo.webp')
const chaltenPhotoPath = path.join(referenceRoot, 'caminantes-assets/fitz-roy-clear.jpg')
const mexicoPhotoPath = path.join(referenceRoot, 'cancun-assets/cancun-beach.jpg')

function configured(name: string): boolean { return Boolean(process.env[name]?.trim()) }
function dataUrl(filePath: string, mime: string): string { return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}` }
function readJson(filePath: string): unknown { return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown }
function budgetUsageFrom(value: unknown): InitialUsage | undefined {
  if (!value || typeof value !== 'object') return undefined
  const budget = 'budget' in value ? (value as {budget?: unknown}).budget : value
  if (!budget || typeof budget !== 'object') return undefined
  const candidate = budget as Partial<InitialUsage>
  if (typeof candidate.spentUsd !== 'number' || typeof candidate.responses !== 'number' || typeof candidate.inputTokens !== 'number' || typeof candidate.outputTokens !== 'number') return undefined
  return {spentUsd: candidate.spentUsd, responses: candidate.responses, inputTokens: candidate.inputTokens, outputTokens: candidate.outputTokens}
}
async function databaseReady(): Promise<{ok: boolean; detail: string}> {
  if (!configured('NEXT_PUBLIC_SUPABASE_URL') || !configured('SUPABASE_SERVICE_ROLE_KEY')) return {ok: false, detail: 'faltan variables Supabase'}
  const client = createAdminClient()
  const [{error: tableError}, {data: bucket, error: bucketError}] = await Promise.all([client.from('template_library').select('id,preview_storage_path').limit(1), client.storage.getBucket('creative-template-previews')])
  if (tableError) return {ok: false, detail: `tabla/columna: ${tableError.message}`}
  if (bucketError || !bucket) return {ok: false, detail: `bucket: ${bucketError?.message ?? 'no existe'}`}
  return {ok: true, detail: 'tabla, columna y bucket disponibles'}
}

const branding = {primary: '#93B653', secondary: '#76D4D7', background: '#0A1715', text: '#F5F1E8', font_title: 'Inter' as const, font_body: 'Inter' as const}
const logo = dataUrl(logoPath, 'image/webp')
const chaltenPhoto = dataUrl(chaltenPhotoPath, 'image/jpeg')
const mexicoPhoto = dataUrl(mexicoPhotoPath, 'image/jpeg')
const allTasks: Task[] = [
  {key: 'molde-2-editorial-claro', mold: 2, contract: MOLDE_2_CREATIVE_CONTRACT, brief: `${MOLDE_2_CREATIVE_BRIEF}\nDirección asignada: portada editorial CLARA y asimétrica. Usá var(--brand-text) como superficie clara mayoritaria (mínimo 55% del lienzo) y var(--brand-bg) para texto o bandas; foto contenida en el tercio inferior o lateral, aire, reglas finas y ficha integrada como revista. Prohibido fondo oscuro mayoritario, foto a sangre y textos estáticos entre corchetes. El CTA debe ser una caja sólida sin transparencia: fondo var(--brand-bg), texto var(--brand-text), claramente legible y separada de la foto.`, brandGuidelines: MOLDE_2_CREATIVE_BRAND_GUIDELINES, rubric: `${MOLDE_2_CREATIVE_RUBRIC} Debe ser inequívocamente clara, no una reinterpretación oscura. El CTA debe tener contraste alto comprobable. Comparar además el nivel de dirección de arte con la captura aprobada adjunta.`, seedId: 'chalten-editorial-clear', visualReferencePath: path.join(referenceRoot, 'caminantes-banner-1.png'), visualReferenceLabel: 'El Chaltén — editorial claro aprobado', mockData: {...MOLDE_2_MOCK_TEXT, lugar: 'EL CHALTÉN', fecha: '27 DIC — 02 ENE', ficha_1: 'DURACIÓN · 7 DÍAS', ficha_2: 'MODALIDAD · GRUPAL', ficha_3: 'NIVEL · INTERMEDIO', ficha_4: 'RUTA · LAGUNA DE LOS TRES', ficha_5: 'GUÍA · ACOMPAÑADA', ficha_6: 'REGIÓN · PATAGONIA', cta: 'CONOCÉ LA TRAVESÍA', logo, bg_image: chaltenPhoto}},
  {key: 'molde-2-ticket-aereo', mold: 2, contract: MOLDE_2_CREATIVE_CONTRACT, brief: `${MOLDE_2_CREATIVE_BRIEF}\nDirección asignada: pieza inspirada en ticket de viaje, construida mediante proporciones, columna de control y reglas; sin iconografía literal ni apariencia de dashboard.`, brandGuidelines: MOLDE_2_CREATIVE_BRAND_GUIDELINES, rubric: `${MOLDE_2_CREATIVE_RUBRIC} Comparar además el nivel de dirección de arte con la captura aprobada adjunta.`, seedId: 'cancun-aerial-ticket', visualReferencePath: path.join(referenceRoot, 'caminantes-cancun-banner-2.png'), visualReferenceLabel: 'Cancún — ticket aéreo aprobado', mockData: {...MOLDE_2_MOCK_TEXT, logo, bg_image: mexicoPhoto}},
  {key: 'molde-6-cinematico-humano', mold: 6, contract: MOLDE_6_CREATIVE_CONTRACT, brief: `${MOLDE_6_CREATIVE_BRIEF}\nDirección asignada: póster cinematográfico humano y sobrio. La frase domina con un gesto tipográfico memorable; evitar ficha técnica, precio, fecha o estética de venta.`, brandGuidelines: MOLDE_6_CREATIVE_BRAND_GUIDELINES, rubric: `${MOLDE_6_CREATIVE_RUBRIC} Comparar además el nivel de dirección de arte con la captura aprobada adjunta.`, seedId: 'chalten-cinematic-rail', visualReferencePath: path.join(referenceRoot, 'caminantes-banner-2.png'), visualReferenceLabel: 'El Chaltén — composición cinematográfica aprobada', mockData: {...MOLDE_6_MOCK_TEXT, logo, bg_image: chaltenPhoto}},
  {key: 'molde-6-editorial-bloques', mold: 6, contract: MOLDE_6_CREATIVE_CONTRACT, brief: `${MOLDE_6_CREATIVE_BRIEF}\nDirección asignada: editorial luminoso por grandes bloques y espacio negativo. La convocatoria funciona como remate; evitar overlay oscuro total y riel de fecha.`, brandGuidelines: MOLDE_6_CREATIVE_BRAND_GUIDELINES, rubric: `${MOLDE_6_CREATIVE_RUBRIC} Comparar además el nivel de dirección de arte con la captura aprobada adjunta.`, seedId: 'cancun-premium-resort', visualReferencePath: path.join(referenceRoot, 'caminantes-cancun-banner-3.png'), visualReferenceLabel: 'Cancún — composición premium por bloques aprobada', mockData: {...MOLDE_6_MOCK_TEXT, mensaje: 'Lo mejor del camino es descubrir que nunca caminamos solos.', convocatoria: 'Encontrá tu próxima aventura en comunidad.', logo, bg_image: mexicoPhoto}},
]
const tasks = allTasks.filter(task => moldArg === 'all' || String(task.mold) === moldArg)

const hasVerifiedPricing = process.env.OPENAI_CREATIVE_MODEL?.trim() === 'gpt-5.6-luna'
const assetPaths = [rendererModule, logoPath, chaltenPhotoPath, mexicoPhotoPath, ...tasks.map(task => task.visualReferencePath)]
const preflight = {mode: execute ? 'execute' : 'dry-run', mold: moldArg, tasks: tasks.map(task => task.key), assets: assetPaths.every(filePath => fs.existsSync(filePath)), openai: {apiKey: configured('OPENAI_API_KEY'), model: hasVerifiedPricing, budget: configured('OPENAI_CREATIVE_BUDGET_USD')}, database: await databaseReady(), paidRunAvailable: !fs.existsSync(checkpointPath) || resume}
if (!execute) { console.log(JSON.stringify({preflight, next: 'Usar --execute para continuar el mismo tope acumulado de USD 2.'}, null, 2)); process.exit(0) }
if (!preflight.assets) throw new Error('Faltan renderer, fotos, logo o capturas aprobadas')
if (!Object.values(preflight.openai).every(Boolean)) throw new Error('Configuración OpenAI incompleta')
if (!preflight.database.ok) throw new Error(`Persistencia no disponible: ${preflight.database.detail}`)
if (!preflight.paidRunAvailable) throw new Error('La tanda ya tiene checkpoint; usá --resume para continuar sin reiniciar el presupuesto')

fs.mkdirSync(checkpointDirectory, {recursive: true})
const previous = resume && fs.existsSync(checkpointPath) ? readJson(checkpointPath) as StoredCheckpoint : undefined
const inheritedUsage = previous?.budget ?? (fs.existsSync(previousMolde1CheckpointPath) ? budgetUsageFrom(readJson(previousMolde1CheckpointPath)) : undefined)
if (!inheritedUsage) throw new Error('No se encontró el gasto acumulado de la tanda anterior; no se reinició el tope')
const budget = openAICreativeBudgetFromEnv(process.env, inheritedUsage)
if (budget.limitUsd > 2 || budget.pricing.model !== 'gpt-5.6-luna' || budget.pricing.inputUsdPerMillion !== 0.20 || budget.pricing.outputUsdPerMillion !== 1.20) throw new Error('Modelo, pricing o tope no coinciden con la allowlist verificada')
const checkpoint: StoredCheckpoint = previous ?? {runId: new Date().toISOString().replace(/[^0-9]/gu, '').slice(0, 14), status: 'started', completedTasks: {}, failures: [], budget: inheritedUsage}
const require = createRequire(import.meta.url)
const {renderStaticTemplatePreview} = require(rendererModule) as {renderStaticTemplatePreview: (payload: Record<string, unknown>) => Promise<Uint8Array>}
const config = {apiKey: process.env.OPENAI_API_KEY!, model: process.env.OPENAI_CREATIVE_MODEL!, budget}
function save(status: string): void { checkpoint.status = status; checkpoint.budget = budget.snapshot(); fs.writeFileSync(checkpointPath, JSON.stringify({...checkpoint, updatedAt: new Date().toISOString()}, null, 2)) }

save('running')
try {
  for (const task of tasks) {
    if (checkpoint.completedTasks[task.key]) continue
    const seedPrompt = formatCreativeVisualSeedsForPrompt(selectCreativeVisualSeeds({ids: [task.seedId], limit: 1}))
    const visualReferences: CreativeVisualReference[] = [{label: task.visualReferenceLabel, dataUrl: dataUrl(task.visualReferencePath, 'image/png')}]
    const input: CreativeLabBatchInput = {contract: task.contract, brief: task.brief, brandGuidelines: task.brandGuidelines, rubric: task.rubric, mockData: task.mockData, branding, count: 1}
    const dependencies: CreativeLabBatchDependencies = {
      generate: batch => generateCreativeCandidatesFromSkeleton({...batch, htmlSkeleton: task.mold === 2 ? MOLDE_2_CREATIVE_SKELETON : MOLDE_6_CREATIVE_SKELETON, approvedExamples: seedPrompt, visualReferences, count: 1, config}),
      render: async renderInput => new Uint8Array(await renderStaticTemplatePreview({template: renderInput.contract, html: renderInput.html, mock_data: renderInput.mockData, branding: renderInput.branding, strict_layout: renderInput.strictLayout})),
      critique: critiqueInput => critiqueCreativeCandidate({contract: critiqueInput.contract, html: critiqueInput.html, pngBase64: Buffer.from(critiqueInput.previewPng).toString('base64'), rubric: critiqueInput.rubric, config}),
      persist: createCreativeCandidatePersister({contract: task.contract, sourceModel: config.model, runId: `${checkpoint.runId}-${task.key}-${Date.now().toString(36)}`}),
    }
    let completed = false
    for (let attempt = 1; attempt <= 3 && !completed; attempt++) {
      try {
        const result = await runCreativeLabBatch(input, dependencies)
        const first = result.completed[0]
        if (!first) throw new Error(result.failed.map(failure => failure.error).join(' | ') || 'El candidato no completó el loop')
        checkpoint.completedTasks[task.key] = first
        completed = true
      } catch (error) {
        checkpoint.failures.push({task: `${task.key}/intento-${attempt}`, error: error instanceof Error ? error.message : 'Error desconocido'})
        save('running')
        if (error instanceof Error && error.name === 'OpenAICreativeBudgetExceededError') throw error
      }
    }
    if (!completed) throw new Error(`No se obtuvo un candidato válido para ${task.key}`)
    save('running')
  }
  save('completed')
  console.log(JSON.stringify({runId: checkpoint.runId, completedTasks: checkpoint.completedTasks, failures: checkpoint.failures, budget: budget.snapshot()}, null, 2))
} catch (error) { save('stopped'); throw error }
