import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ContentFeedback, FeedbackScope } from '@/types'

const SCOPE_LABELS: Record<FeedbackScope, string> = {
  pieza: 'Piezas',
  familia: 'Familias',
  motor: 'Motores',
  run: 'Corridas',
}
const SCOPE_ORDER: FeedbackScope[] = ['run', 'motor', 'familia', 'pieza']

function referenceLabel(item: ContentFeedback): string {
  if (item.scope === 'pieza') return `pieza ${item.piece_id}`
  if (item.scope === 'familia') return `familia ${item.family_key}`
  if (item.scope === 'motor') return `motor ${item.generator_key}`
  return `corrida ${item.run_id}`
}

function toMarkdown(items: ContentFeedback[]): string {
  const bySeverity = { block: 'BLOQUEANTE', high: 'alta', medium: 'media', low: 'baja' } as const
  const lines = ['# Feedback abierto — biblioteca de piezas', '']
  for (const scope of SCOPE_ORDER) {
    const scoped = items.filter(item => item.scope === scope)
    if (scoped.length === 0) continue
    lines.push(`## ${SCOPE_LABELS[scope]}`, '')
    for (const item of scoped) {
      lines.push(`- [${bySeverity[item.severity]}] (${item.status}) ${referenceLabel(item)}${item.template_id ? ` — template ${item.template_id}` : ''}`)
      lines.push(`  ${item.note.replace(/\n/gu, '\n  ')}`)
    }
    lines.push('')
  }
  if (items.length === 0) lines.push('_Sin notas abiertas._')
  return lines.join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('content_feedback')
      .select('*')
      .neq('status', 'done')
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const items = (data ?? []) as ContentFeedback[]

    const { searchParams } = new URL(request.url)
    if (searchParams.get('format') === 'json') {
      return NextResponse.json({ feedback: items })
    }

    return new NextResponse(toMarkdown(items), {
      status: 200,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}
