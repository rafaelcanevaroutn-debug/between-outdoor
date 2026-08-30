import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { missingReferenceFieldForScope } from '@/lib/content-feedback'
import type { FeedbackScope, FeedbackSeverity, FeedbackStatus } from '@/types'

const VALID_SCOPES: FeedbackScope[] = ['pieza', 'familia', 'motor', 'run']
const VALID_STATUSES: FeedbackStatus[] = ['open', 'in_progress', 'done']
const VALID_SEVERITIES: FeedbackSeverity[] = ['low', 'medium', 'high', 'block']

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function GET(request: NextRequest) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope')
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const templateId = searchParams.get('template_id')
    const runId = searchParams.get('run_id')

    let query = admin.from('content_feedback').select('*').order('created_at', { ascending: false })
    if (scope) {
      if (!VALID_SCOPES.includes(scope as FeedbackScope)) return NextResponse.json({ error: 'scope inválido' }, { status: 400 })
      query = query.eq('scope', scope)
    }
    if (status) {
      if (!VALID_STATUSES.includes(status as FeedbackStatus)) return NextResponse.json({ error: 'status inválido' }, { status: 400 })
      query = query.eq('status', status)
    }
    if (severity) {
      if (!VALID_SEVERITIES.includes(severity as FeedbackSeverity)) return NextResponse.json({ error: 'severity inválida' }, { status: 400 })
      query = query.eq('severity', severity)
    }
    if (templateId) query = query.eq('template_id', templateId)
    if (runId) query = query.eq('run_id', runId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ feedback: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}

interface CreateFeedbackBody {
  scope?: unknown
  piece_id?: unknown
  template_id?: unknown
  family_key?: unknown
  generator_key?: unknown
  run_id?: unknown
  note?: unknown
  severity?: unknown
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error || !authorization.user) return authorization.error

    const body = await request.json() as CreateFeedbackBody
    const scope = stringOrNull(body.scope) as FeedbackScope | null
    const note = stringOrNull(body.note)
    if (!scope || !VALID_SCOPES.includes(scope)) return NextResponse.json({ error: 'scope inválido' }, { status: 400 })
    if (!note) return NextResponse.json({ error: 'note requerida' }, { status: 400 })

    const pieceId = stringOrNull(body.piece_id)
    const templateId = stringOrNull(body.template_id)
    const familyKey = stringOrNull(body.family_key)
    const generatorKey = stringOrNull(body.generator_key)
    const runId = stringOrNull(body.run_id)

    const missingField = missingReferenceFieldForScope(scope, { piece_id: pieceId, family_key: familyKey, generator_key: generatorKey, run_id: runId })
    if (missingField) {
      return NextResponse.json({ error: `scope="${scope}" requiere su referencia correspondiente (${missingField})` }, { status: 400 })
    }

    const severity = (stringOrNull(body.severity) ?? 'medium') as FeedbackSeverity
    if (!VALID_SEVERITIES.includes(severity)) return NextResponse.json({ error: 'severity inválida' }, { status: 400 })

    const admin = createAdminClient()
    const { data: feedback, error } = await admin
      .from('content_feedback')
      .insert({
        scope,
        piece_id: pieceId,
        template_id: templateId,
        family_key: familyKey,
        generator_key: generatorKey,
        run_id: runId,
        note,
        severity,
        status: 'open',
        created_by: authorization.user.id,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ feedback }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}
