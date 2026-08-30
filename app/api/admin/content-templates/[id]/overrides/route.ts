import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const { id } = await context.params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('content_template_overrides')
      .select('*')
      .eq('template_id', id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ overrides: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}

interface OverrideBody {
  client_id?: unknown
  salida_id?: unknown
  enabled?: unknown
  custom_rules?: unknown
  vigente_desde?: unknown
  vigente_hasta?: unknown
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const { id } = await context.params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })

    const body = await request.json() as OverrideBody
    const clientId = stringOrNull(body.client_id)
    if (!clientId || !UUID.test(clientId)) return NextResponse.json({ error: 'client_id inválido' }, { status: 400 })
    const salidaId = stringOrNull(body.salida_id)
    if (salidaId && !UUID.test(salidaId)) return NextResponse.json({ error: 'salida_id inválido' }, { status: 400 })

    const admin = createAdminClient()

    const { data: template } = await admin.from('content_templates').select('id').eq('id', id).maybeSingle()
    if (!template) return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 })

    // upsert manual por (template_id, client_id, salida_id): los índices
    // únicos parciales de la migración no admiten un solo onConflict target
    // limpio para el caso salida_id null vs not-null, así que se resuelve acá.
    let existingQuery = admin
      .from('content_template_overrides')
      .select('id')
      .eq('template_id', id)
      .eq('client_id', clientId)
    existingQuery = salidaId ? existingQuery.eq('salida_id', salidaId) : existingQuery.is('salida_id', null)
    const { data: existing } = await existingQuery.maybeSingle()

    const payload = {
      template_id: id,
      client_id: clientId,
      salida_id: salidaId,
      enabled: body.enabled !== false,
      custom_rules: body.custom_rules && typeof body.custom_rules === 'object' ? body.custom_rules : {},
      vigente_desde: stringOrNull(body.vigente_desde),
      vigente_hasta: stringOrNull(body.vigente_hasta),
      updated_at: new Date().toISOString(),
    }

    const { data: override, error } = existing
      ? await admin.from('content_template_overrides').update(payload).eq('id', existing.id).select('*').single()
      : await admin.from('content_template_overrides').insert(payload).select('*').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ override }, { status: existing ? 200 : 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}
