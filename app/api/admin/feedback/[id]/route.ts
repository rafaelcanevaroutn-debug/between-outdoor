import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FeedbackSeverity, FeedbackStatus } from '@/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const VALID_STATUSES: FeedbackStatus[] = ['open', 'in_progress', 'done']
const VALID_SEVERITIES: FeedbackSeverity[] = ['low', 'medium', 'high', 'block']

interface PatchFeedbackBody {
  note?: unknown
  status?: unknown
  severity?: unknown
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const { id } = await context.params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })

    const body = await request.json() as PatchFeedbackBody
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.note !== undefined) {
      if (typeof body.note !== 'string' || !body.note.trim()) return NextResponse.json({ error: 'note inválida' }, { status: 400 })
      updates.note = body.note.trim()
    }
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status as FeedbackStatus)) return NextResponse.json({ error: 'status inválido' }, { status: 400 })
      updates.status = body.status
    }
    if (body.severity !== undefined) {
      if (!VALID_SEVERITIES.includes(body.severity as FeedbackSeverity)) return NextResponse.json({ error: 'severity inválida' }, { status: 400 })
      updates.severity = body.severity
    }

    const admin = createAdminClient()
    const { data: feedback, error } = await admin
      .from('content_feedback')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!feedback) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })

    return NextResponse.json({ feedback })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}
