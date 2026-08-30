import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { sumSpendLogRows, computeSpendDelta, validateCurationConfirmation } from '@/lib/admin-generation/openai-spend-log'
import {
  globalCheckpointUsage,
  resolveBeforeUsage,
  resolveCreativeLabInvocation,
  type CreativeLabMolde,
} from '@/lib/admin-generation/creative-lab-checkpoint'

// Wrapper solo-dev, confirmado con el usuario: scripts/run-creative-lab-*.ts
// dependen de un renderer en el repo hermano ../remotion-skill/remotion-template
// y de assets locales del dev — no alcanzables desde un deploy de Vercel. Esta
// ruta ejecuta esos scripts tal cual están (mismo comando que los npm scripts
// creative:molde-1 / creative:moldes-2-6), sin tocar ni reimplementar el
// pipeline. En producción queda deshabilitada con el motivo explicado.
//
// Solo moldes 1, 2 y 6 tienen script de curaduría hoy — moldes 3, 4 y 5 no
// usan IA (ver lib/generators/banner-moldes-commercial.ts) y no tienen
// contraparte en scripts/run-creative-lab-*.ts.
//
// Molde 2 y 6 comparten un único checkpoint/presupuesto encadenado, heredado
// de Molde 1 — ver lib/admin-generation/creative-lab-checkpoint.ts para el
// detalle. Esta ruta SIEMPRE deriva del checkpoint en disco si hace falta
// --resume, nunca confía en lo que mande el cliente, para que sea imposible
// abrir una autorización nueva por accidente mientras exista una vigente.

const SIBLING_RENDERER_PATH = path.resolve(process.cwd(), '../remotion-skill/remotion-template')
const CHECKPOINT_DIR = path.join(process.cwd(), '.creative-lab')
const VALID_MOLDES: CreativeLabMolde[] = ['1', '2', '6']

function isValidMolde(value: string): value is CreativeLabMolde {
  return (VALID_MOLDES as string[]).includes(value)
}

function checkAvailability(): { available: boolean; reason: string | null } {
  if (process.env.NODE_ENV === 'production') {
    return {
      available: false,
      reason: 'Deshabilitado en producción: el pipeline depende de rutas locales del dev (renderer del repo hermano y assets de imagen). Correlo local con `npm run dev`.',
    }
  }
  if (!fs.existsSync(SIBLING_RENDERER_PATH)) {
    return { available: false, reason: `No se encontró el repo hermano en ${SIBLING_RENDERER_PATH}, requerido por el renderer del pipeline.` }
  }
  return { available: true, reason: null }
}

async function fetchSpendRows() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('admin_openai_spend_log')
    .select('input_tokens, output_tokens, cost_usd, created_at, admin_user_id, molde')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function GET(request: NextRequest) {
  const authorization = await requireAdmin()
  if (authorization.error) return authorization.error
  try {
    const rows = await fetchSpendRows()
    const dbCumulative = sumSpendLogRows(rows)
    const checkpointGlobal = globalCheckpointUsage(CHECKPOINT_DIR)
    // El remanente mostrado nunca subestima lo ya gastado: toma lo que sea
    // mayor entre el ledger de la app y lo que el checkpoint en disco
    // reporta (que es la fuente real que va a usar el script al correr).
    const spentUsd = Math.max(dbCumulative.spentUsd, checkpointGlobal?.spentUsd ?? 0)
    const usedGlobal = checkpointGlobal && checkpointGlobal.spentUsd >= dbCumulative.spentUsd ? checkpointGlobal : dbCumulative
    const limitUsd = Number(process.env.OPENAI_CREATIVE_BUDGET_USD?.trim() || 2)

    const moldeParam = request.nextUrl.searchParams.get('molde')
    let target: { molde: CreativeLabMolde; willResume: boolean; sourceStatus: string | null; error?: string } | null = null
    if (moldeParam && isValidMolde(moldeParam)) {
      const resolved = resolveBeforeUsage(CHECKPOINT_DIR, moldeParam)
      target = resolved.ok
        ? { molde: moldeParam, willResume: resolved.willResume, sourceStatus: resolved.sourceStatus }
        : { molde: moldeParam, willResume: false, sourceStatus: null, error: resolved.error }
    }

    return NextResponse.json({
      snapshot: {
        limitUsd,
        spentUsd,
        remainingUsd: Math.max(0, limitUsd - spentUsd),
        responses: usedGlobal.responses,
      },
      target,
      history: rows.slice(0, 50),
      ...checkAvailability(),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 })
  }
}

function runCreativeLabScript(scriptArgs: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['node_modules/jiti/lib/jiti-cli.mjs', ...scriptArgs], {
      cwd: process.cwd(),
      env: process.env,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => resolve({ stdout, stderr, code }))
  })
}

export async function POST(request: NextRequest) {
  const authorization = await requireAdmin()
  if (authorization.error) return authorization.error

  const availability = checkAvailability()
  if (!availability.available) return NextResponse.json({ error: availability.reason }, { status: 403 })

  try {
    const body = await request.json().catch(() => null)
    const validated = validateCurationConfirmation(body)
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 })
    const { molde } = validated
    if (!isValidMolde(molde)) {
      return NextResponse.json({ error: `molde debe ser ${VALID_MOLDES.join(', ')} — moldes 3, 4 y 5 no tienen script de curaduría` }, { status: 400 })
    }

    const resolvedBefore = resolveBeforeUsage(CHECKPOINT_DIR, molde)
    if (!resolvedBefore.ok) return NextResponse.json({ error: resolvedBefore.error }, { status: 409 })
    const { usage: before, willResume } = resolvedBefore

    const scriptArgs = resolveCreativeLabInvocation(molde, willResume)
    const { stdout, stderr, code } = await runCreativeLabScript(scriptArgs)
    if (code !== 0) {
      return NextResponse.json(
        { error: stderr.trim().split('\n')[0] || `El script terminó con código ${code}`, stderr: stderr.slice(-4000), mode: willResume ? 'resume' : 'execute' },
        { status: 500 },
      )
    }

    const lastLine = stdout.trim().split('\n').filter(Boolean).pop()
    let parsed: { budget?: ReturnType<typeof sumSpendLogRows>; runId?: string; result?: unknown } = {}
    try {
      parsed = lastLine ? JSON.parse(lastLine) : {}
    } catch {
      return NextResponse.json({ error: 'No se pudo interpretar la salida del script', stdout: stdout.slice(-4000) }, { status: 500 })
    }
    if (!parsed.budget) {
      return NextResponse.json({ error: 'El script no reportó budget.snapshot()', stdout: stdout.slice(-2000) }, { status: 500 })
    }

    const delta = computeSpendDelta(before, parsed.budget)
    if (delta.cost_usd > 0 || delta.responses > 0) {
      const admin = createAdminClient()
      const { error: insertError } = await admin.from('admin_openai_spend_log').insert({
        admin_user_id: authorization.user.id,
        molde,
        model: process.env.OPENAI_CREATIVE_MODEL ?? 'desconocido',
        run_id: parsed.runId ?? `admin-${Date.now()}`,
        input_tokens: delta.input_tokens,
        output_tokens: delta.output_tokens,
        cost_usd: delta.cost_usd,
      })
      if (insertError) console.error('[ADMIN/OPENAI-CURATION] No se pudo registrar el gasto:', insertError.message)
    }

    return NextResponse.json({
      success: true,
      molde,
      mode: willResume ? 'resume' : 'execute',
      result: parsed.result,
      snapshot: parsed.budget,
      delta,
      noNewSpend: delta.cost_usd === 0 && delta.responses === 0,
    })
  } catch (error) {
    console.error('[ADMIN/OPENAI-CURATION] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al ejecutar la curaduría' },
      { status: 500 },
    )
  }
}
