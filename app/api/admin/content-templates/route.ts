import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ContentTemplateStatus, ContentTemplateType } from '@/types'

const VALID_TYPES: ContentTemplateType[] = ['video', 'carrusel', 'banner', 'flyer']
const VALID_STATUSES: ContentTemplateStatus[] = ['borrador', 'aprobada', 'productiva']

export async function GET(request: NextRequest) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const admin = createAdminClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const vertical = searchParams.get('vertical')
    const family = searchParams.get('family')

    let query = admin
      .from('content_templates')
      .select(vertical || family
        ? '*, content_template_verticals!inner(vertical_key), content_template_families!inner(family_key)'
        : '*, content_template_verticals(vertical_key), content_template_families(family_key)')
      .order('created_at', { ascending: false })

    if (type) {
      if (!VALID_TYPES.includes(type as ContentTemplateType)) {
        return NextResponse.json({ error: 'type inválido' }, { status: 400 })
      }
      query = query.eq('type', type)
    }
    if (status) {
      if (!VALID_STATUSES.includes(status as ContentTemplateStatus)) {
        return NextResponse.json({ error: 'status inválido' }, { status: 400 })
      }
      query = query.eq('status', status)
    }
    if (vertical) query = query.eq('content_template_verticals.vertical_key', vertical)
    if (family) query = query.eq('content_template_families.family_key', family)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ templates: data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}

interface CreateTemplateBody {
  name?: unknown
  type?: unknown
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
  requirements?: unknown
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))]
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error || !authorization.user) return authorization.error

    const body = await request.json() as CreateTemplateBody
    const name = stringOrNull(body.name)
    const type = stringOrNull(body.type) as ContentTemplateType | null
    const generatorKey = stringOrNull(body.generator_key)

    if (!name) return NextResponse.json({ error: 'name requerido' }, { status: 400 })
    if (!type || !VALID_TYPES.includes(type)) return NextResponse.json({ error: 'type inválido' }, { status: 400 })
    if (!generatorKey) return NextResponse.json({ error: 'generator_key requerido' }, { status: 400 })

    const admin = createAdminClient()
    const { data: template, error: insertError } = await admin
      .from('content_templates')
      .insert({
        name,
        type,
        generator_key: generatorKey,
        status: 'borrador',
        template_library_id: stringOrNull(body.template_library_id),
        compatibility: body.compatibility && typeof body.compatibility === 'object' ? body.compatibility : {},
        style_profile: body.style_profile && typeof body.style_profile === 'object' ? body.style_profile : {},
        copy_profile: body.copy_profile && typeof body.copy_profile === 'object' ? body.copy_profile : {},
        cta_mode: stringOrNull(body.cta_mode),
        rotation_weight: typeof body.rotation_weight === 'number' && body.rotation_weight >= 0 ? body.rotation_weight : 1,
        repeat_guard_window: typeof body.repeat_guard_window === 'number' && body.repeat_guard_window >= 0 ? body.repeat_guard_window : 0,
        is_main_default: body.is_main_default === true,
        metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
        created_by: authorization.user.id,
      })
      .select('*')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    const verticals = stringArray(body.verticals)
    const families = stringArray(body.families)
    const requirements = Array.isArray(body.requirements) ? body.requirements : []

    if (verticals.length > 0) {
      const { error } = await admin
        .from('content_template_verticals')
        .insert(verticals.map(vertical_key => ({ template_id: template.id, vertical_key })))
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (families.length > 0) {
      const { error } = await admin
        .from('content_template_families')
        .insert(families.map(family_key => ({ template_id: template.id, family_key })))
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (requirements.length > 0) {
      const rows = requirements
        .filter((item): item is { input_key: string; required?: boolean; hints?: string } =>
          Boolean(item) && typeof item === 'object' && typeof (item as Record<string, unknown>).input_key === 'string')
        .map(item => ({
          template_id: template.id,
          input_key: item.input_key,
          required: item.required !== false,
          hints: typeof item.hints === 'string' ? item.hints : null,
        }))
      if (rows.length > 0) {
        const { error } = await admin.from('content_template_requirements').insert(rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ template, verticals, families }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}
