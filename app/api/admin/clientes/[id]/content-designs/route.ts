import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import {
  CAROUSEL_FAMILY_OPTIONS,
  CLIENT_DESIGN_STUDIO_FLAG,
  VIDEO_FAMILY_OPTIONS,
  VIDEO_TYPOGRAPHY_OPTIONS,
} from '@/lib/client-design-studio'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ContentTemplate, ContentTemplateOverride } from '@/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const carouselFamilies = new Set(CAROUSEL_FAMILY_OPTIONS.map(item => item.key))
const videoFamilies = new Set(VIDEO_FAMILY_OPTIONS.map(item => item.key))
const typographyIds = new Set(VIDEO_TYPOGRAPHY_OPTIONS.map(item => item.key))

type StudioTemplate = ContentTemplate & { metadata: Record<string, unknown> }

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean))]
}

function metadataValue(template: StudioTemplate, key: string): string | null {
  const value = template.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function loadContext(clientId: string) {
  const admin = createAdminClient()
  const [{ data: profile, error: profileError }, { data: branding, error: brandingError }] = await Promise.all([
    admin.from('profiles').select('id,full_name,company_name,calendario_asignado').eq('id', clientId).maybeSingle(),
    admin.from('brand_identity').select('templates_elegidos').eq('user_id', clientId).maybeSingle(),
  ])
  if (profileError) throw profileError
  if (brandingError) throw brandingError
  return profile ? { admin, profile, branding } : null
}

async function loadStudioTemplates(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin.from('content_templates').select('*').contains('metadata', { [CLIENT_DESIGN_STUDIO_FLAG]: true })
  if (error) throw error
  return (data ?? []) as StudioTemplate[]
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error
    const { id: clientId } = await context.params
    if (!UUID.test(clientId)) return NextResponse.json({ error: 'Cliente inválido' }, { status: 400 })
    const client = await loadContext(clientId)
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    const [templates, overridesResult, libraryResult] = await Promise.all([
      loadStudioTemplates(client.admin),
      client.admin.from('content_template_overrides').select('*').eq('client_id', clientId),
      client.admin.from('template_library')
        .select('id,template_id,piece_type,mold_type,width,height,variant,preview_storage_path')
        .eq('status', 'approved').eq('stress_test_passed', true)
        .in('piece_type', ['banner', 'flyer']).order('approved_at', { ascending: false }),
    ])
    if (overridesResult.error) throw overridesResult.error
    if (libraryResult.error) throw libraryResult.error
    const overrides = (overridesResult.data ?? []) as ContentTemplateOverride[]
    const activeByTemplate = new Map(overrides.filter(row => row.enabled && row.salida_id === null).map(row => [row.template_id, row]))

    const previewUrls = new Map<string, string>()
    await Promise.all((libraryResult.data ?? []).map(async row => {
      if (!row.preview_storage_path) return
      const { data } = await client.admin.storage.from('creative-template-previews').createSignedUrl(row.preview_storage_path, 60 * 30)
      if (data?.signedUrl) previewUrls.set(row.id, data.signedUrl)
    }))

    return NextResponse.json({
      client: {
        id: client.profile.id,
        name: client.profile.company_name || client.profile.full_name || 'Cliente',
        calendarCode: client.profile.calendario_asignado || 'CAL-00',
      },
      installedCarouselNames: client.branding?.templates_elegidos ?? [],
      carouselAssignments: templates.flatMap(template => {
        const override = activeByTemplate.get(template.id)
        const designName = metadataValue(template, 'drive_template_name')
        if (template.type !== 'carrusel' || !override || !designName) return []
        return [{ designName, families: strings(override.custom_rules?.families) }]
      }),
      videoAssignments: templates.flatMap(template => {
        const override = activeByTemplate.get(template.id)
        const family = metadataValue(template, 'video_family')
        if (template.type !== 'video' || !override || !family) return []
        return [{ family, typographyIds: strings(override.custom_rules?.typography_ids) }]
      }),
      staticAssignments: templates.flatMap(template => {
        const override = activeByTemplate.get(template.id)
        if ((template.type !== 'banner' && template.type !== 'flyer') || !override || !template.template_library_id) return []
        return [{ templateLibraryId: template.template_library_id }]
      }),
      staticLibrary: (libraryResult.data ?? []).map(row => ({ ...row, previewUrl: previewUrls.get(row.id) ?? null })),
    })
  } catch (error) {
    console.error('[ADMIN/CONTENT-DESIGNS] Error cargando estudio:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar el sistema visual' }, { status: 500 })
  }
}

interface SaveBody {
  carousels?: unknown
  videos?: unknown
  statics?: unknown
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error || !authorization.user) return authorization.error
    const { id: clientId } = await context.params
    if (!UUID.test(clientId)) return NextResponse.json({ error: 'Cliente inválido' }, { status: 400 })
    const client = await loadContext(clientId)
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    const loadedClient = client
    const adminUser = authorization.user!
    const body = await request.json() as SaveBody
    const carousels = Array.isArray(body.carousels) ? body.carousels : []
    const videos = Array.isArray(body.videos) ? body.videos : []
    const statics = Array.isArray(body.statics) ? body.statics : []
    const installed = new Set(loadedClient.branding?.templates_elegidos ?? [])

    const normalizedCarousels = carousels.flatMap(value => {
      if (!value || typeof value !== 'object') return []
      const row = value as Record<string, unknown>
      const designName = typeof row.designName === 'string' ? row.designName.trim() : ''
      const families = strings(row.families).filter(key => carouselFamilies.has(key as never))
      return designName && installed.has(designName) && families.length > 0 ? [{ designName, families }] : []
    })
    const normalizedVideos = videos.flatMap(value => {
      if (!value || typeof value !== 'object') return []
      const row = value as Record<string, unknown>
      const family = typeof row.family === 'string' ? row.family.trim() : ''
      const fonts = strings(row.typographyIds).filter(key => typographyIds.has(key as never))
      return videoFamilies.has(family as never) && fonts.length > 0 ? [{ family, typographyIds: fonts }] : []
    })
    const staticIds = strings(statics)
    const { data: approvedStatics, error: staticsError } = staticIds.length > 0
      ? await loadedClient.admin.from('template_library').select('id,template_id,piece_type,mold_type').in('id', staticIds).eq('status', 'approved').eq('stress_test_passed', true)
      : { data: [], error: null }
    if (staticsError) throw staticsError
    if ((approvedStatics ?? []).length !== staticIds.length) return NextResponse.json({ error: 'Hay banners o flyers que ya no están aprobados' }, { status: 400 })

    const existing = await loadStudioTemplates(loadedClient.admin)
    const existingByKey = new Map(existing.map(template => [metadataValue(template, 'studio_key'), template]))
    const activeKeys = new Set<string>()

    async function ensureTemplate(input: {
      studioKey: string
      name: string
      type: 'video' | 'carrusel' | 'banner' | 'flyer'
      generatorKey: string
      templateLibraryId?: string | null
      metadata: Record<string, unknown>
      rules: Record<string, unknown>
    }) {
      let template = existingByKey.get(input.studioKey)
      if (!template) {
        const { data, error } = await loadedClient.admin.from('content_templates').insert({
          name: input.name,
          type: input.type,
          status: 'productiva',
          generator_key: input.generatorKey,
          template_library_id: input.templateLibraryId ?? null,
          compatibility: {}, style_profile: {}, copy_profile: {},
          rotation_weight: 1, repeat_guard_window: 0, is_main_default: false,
          metadata: { [CLIENT_DESIGN_STUDIO_FLAG]: true, client_scoped: true, studio_key: input.studioKey, ...input.metadata },
          created_by: adminUser.id,
        }).select('*').single()
        if (error) throw error
        template = data as StudioTemplate
        existingByKey.set(input.studioKey, template)
      }
      activeKeys.add(input.studioKey)
      const currentOverride = await loadedClient.admin.from('content_template_overrides')
        .select('id').eq('template_id', template.id).eq('client_id', clientId).is('salida_id', null).maybeSingle()
      if (currentOverride.error) throw currentOverride.error
      const values = { enabled: true, custom_rules: input.rules, updated_at: new Date().toISOString() }
      const result = currentOverride.data
        ? await loadedClient.admin.from('content_template_overrides').update(values).eq('id', currentOverride.data.id)
        : await loadedClient.admin.from('content_template_overrides').insert({ template_id: template.id, client_id: clientId, salida_id: null, ...values })
      if (result.error) throw result.error
    }

    for (const item of normalizedCarousels) {
      await ensureTemplate({
        studioKey: `drive:${item.designName}`,
        name: item.designName.replace(/\.hbs$/iu, '').replaceAll('_', ' '),
        type: 'carrusel', generatorKey: 'carrusel_organico',
        metadata: { drive_template_name: item.designName, preserve_slot_family: true },
        rules: { families: item.families, drive_template_name: item.designName },
      })
    }
    for (const item of normalizedVideos) {
      await ensureTemplate({
        studioKey: `video:${item.family}`, name: `Video ${item.family}`,
        type: 'video', generatorKey: `video_familia_${item.family}`,
        metadata: { video_family: item.family },
        rules: { families: [item.family], typography_ids: item.typographyIds },
      })
    }
    for (const item of approvedStatics ?? []) {
      const mold = Number(item.mold_type)
      await ensureTemplate({
        studioKey: `creative:${item.id}`, name: item.template_id,
        type: item.piece_type === 'flyer' ? 'flyer' : 'banner',
        generatorKey: `${item.piece_type === 'flyer' ? 'flyer' : 'banner'}_molde_${mold}`,
        templateLibraryId: item.id,
        metadata: { creative_template_id: item.id },
        rules: { families: [`molde_${mold}`], template_library_id: item.id },
      })
    }

    const existingIdsToDisable = existing
      .filter(template => {
        const key = metadataValue(template, 'studio_key')
        return key && !activeKeys.has(key)
      })
      .map(template => template.id)
    if (existingIdsToDisable.length > 0) {
      const { error } = await loadedClient.admin.from('content_template_overrides')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('client_id', clientId).is('salida_id', null).in('template_id', existingIdsToDisable)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN/CONTENT-DESIGNS] Error guardando estudio:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar el sistema visual' }, { status: 500 })
  }
}
