import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ContentTemplateStatus, ContentTemplateType } from '@/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const VALID_TYPES: ContentTemplateType[] = ['video', 'carrusel', 'banner', 'flyer']
const VALID_STATUSES: ContentTemplateStatus[] = ['borrador', 'aprobada', 'productiva']

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
    const [templateResult, verticalsResult, familiesResult, requirementsResult] = await Promise.all([
      admin.from('content_templates').select('*').eq('id', id).maybeSingle(),
      admin.from('content_template_verticals').select('vertical_key').eq('template_id', id),
      admin.from('content_template_families').select('family_key').eq('template_id', id),
      admin.from('content_template_requirements').select('*').eq('template_id', id),
    ])

    if (templateResult.error) return NextResponse.json({ error: templateResult.error.message }, { status: 500 })
    if (!templateResult.data) return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 })

    return NextResponse.json({
      template: templateResult.data,
      verticals: (verticalsResult.data ?? []).map(row => row.vertical_key),
      families: (familiesResult.data ?? []).map(row => row.family_key),
      requirements: requirementsResult.data ?? [],
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}

interface PatchTemplateBody {
  name?: unknown
  status?: unknown
  generator_key?: unknown
  template_library_id?: unknown
  compatibility?: unknown
  style_profile?: unknown
  copy_profile?: unknown
  cta_mode?: unknown
  rotation_weight?: unknown
  repeat_guard_window?: unknown
  is_main_default?: unknown
  metadata?: unknown
  verticals?: unknown
  families?: unknown
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))]
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const { id } = await context.params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })

    const body = await request.json() as PatchTemplateBody
    const admin = createAdminClient()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) {
      const name = stringOrNull(body.name)
      if (!name) return NextResponse.json({ error: 'name inválido' }, { status: 400 })
      updates.name = name
    }
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status as ContentTemplateStatus)) {
        return NextResponse.json({ error: 'status inválido' }, { status: 400 })
      }
      updates.status = body.status
    }
    if (body.generator_key !== undefined) {
      const generatorKey = stringOrNull(body.generator_key)
      if (!generatorKey) return NextResponse.json({ error: 'generator_key inválido' }, { status: 400 })
      updates.generator_key = generatorKey
    }
    if (body.template_library_id !== undefined) updates.template_library_id = stringOrNull(body.template_library_id)
    if (body.compatibility !== undefined && typeof body.compatibility === 'object') updates.compatibility = body.compatibility
    if (body.style_profile !== undefined && typeof body.style_profile === 'object') updates.style_profile = body.style_profile
    if (body.copy_profile !== undefined && typeof body.copy_profile === 'object') updates.copy_profile = body.copy_profile
    if (body.cta_mode !== undefined) updates.cta_mode = stringOrNull(body.cta_mode)
    if (typeof body.rotation_weight === 'number' && body.rotation_weight >= 0) updates.rotation_weight = body.rotation_weight
    if (typeof body.repeat_guard_window === 'number' && body.repeat_guard_window >= 0) updates.repeat_guard_window = body.repeat_guard_window
    if (typeof body.is_main_default === 'boolean') updates.is_main_default = body.is_main_default
    if (body.metadata !== undefined && typeof body.metadata === 'object') updates.metadata = body.metadata

    const { data: template, error: updateError } = await admin
      .from('content_templates')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    if (!template) return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 })

    const verticals = stringArray(body.verticals)
    if (verticals) {
      const { error: deleteError } = await admin.from('content_template_verticals').delete().eq('template_id', id)
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
      if (verticals.length > 0) {
        const { error } = await admin
          .from('content_template_verticals')
          .insert(verticals.map(vertical_key => ({ template_id: id, vertical_key })))
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
    const families = stringArray(body.families)
    if (families) {
      const { error: deleteError } = await admin.from('content_template_families').delete().eq('template_id', id)
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
      if (families.length > 0) {
        const { error } = await admin
          .from('content_template_families')
          .insert(families.map(family_key => ({ template_id: id, family_key })))
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ template })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const { id } = await context.params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })

    const admin = createAdminClient()
    const { data: template, error: findError } = await admin
      .from('content_templates')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()

    if (findError) return NextResponse.json({ error: findError.message }, { status: 500 })
    if (!template) return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 })
    if (template.status !== 'borrador') {
      return NextResponse.json(
        { error: 'Solo se puede borrar un template en borrador. Cambiá el status a "borrador" antes, o desactivalo dejando de referenciarlo en overrides.' },
        { status: 409 },
      )
    }

    const { error: deleteError } = await admin.from('content_templates').delete().eq('id', id)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}
