import { NextResponse } from 'next/server'

import { validateCreativeTemplateHtml, type CreativeTemplateContract, type CreativeTemplateStatus } from '@/lib/creative-lab/template-contract'
import { creativeTemplateApprovalBlocker } from '@/lib/creative-lab/stress-status'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const ALLOWED_STATUSES = new Set<CreativeTemplateStatus>(['experimental', 'approved', 'archived', 'rejected'])

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return { user: null, error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }

  return { user, error: null }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error || !authorization.user) return authorization.error

    const { id } = await context.params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })

    const body = await request.json() as { status?: CreativeTemplateStatus }
    if (!body.status || !ALLOWED_STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: template, error: findError } = await admin
      .from('template_library')
      .select('id, template_id, version, piece_type, mold_type, width, height, variant, slots_schema, branding_tokens, html_template, preview_storage_path, stress_tested_at, stress_test_passed, stress_test_error')
      .eq('id', id)
      .maybeSingle()

    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 })
    if (!template) return NextResponse.json({ error: 'Molde no encontrado' }, { status: 404 })

    if (body.status === 'approved') {
      const stressBlocker = creativeTemplateApprovalBlocker(template)
      if (stressBlocker) {
        return NextResponse.json({ error: stressBlocker }, { status: 422 })
      }
      if (!template.preview_storage_path) {
        return NextResponse.json({ error: 'El molde no tiene el PNG final validado' }, { status: 422 })
      }
      const contract: CreativeTemplateContract = {
        template_id: template.template_id,
        version: template.version,
        piece_type: template.piece_type,
        mold_type: template.mold_type ?? undefined,
        dimensions: { width: template.width, height: template.height },
        variant: template.variant,
        slots: template.slots_schema,
        branding_tokens: template.branding_tokens,
      }
      const errors = validateCreativeTemplateHtml(contract, template.html_template)
      if (errors.length > 0) {
        return NextResponse.json({ error: 'El molde no cumple el contrato', details: errors }, { status: 422 })
      }
    }

    const approval = body.status === 'approved'
      ? { approved_by: authorization.user.id, approved_at: new Date().toISOString() }
      : { approved_by: null, approved_at: null }

    const { data: updated, error: updateError } = await admin
      .from('template_library')
      .update({ status: body.status, ...approval, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, status, approved_by, approved_at, updated_at')
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ template: updated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 },
    )
  }
}
