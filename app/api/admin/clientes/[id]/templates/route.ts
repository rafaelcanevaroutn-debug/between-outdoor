import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { listTemplatesForClient } from '@/lib/google-drive'
import { buildSkillPayload } from '@/lib/skill-payload'
import type { BrandIdentity } from '@/types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function uniqueTemplateNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean))]
}

async function loadClientContext(clientId: string) {
  const admin = createAdminClient()
  const [{ data: profile, error: profileError }, { data: branding, error: brandingError }] = await Promise.all([
    admin.from('profiles').select('id, full_name, company_name, calendario_asignado').eq('id', clientId).maybeSingle(),
    admin.from('brand_identity').select('*').eq('user_id', clientId).maybeSingle(),
  ])

  if (profileError) throw profileError
  if (!profile) return null
  if (brandingError) throw brandingError
  return { admin, profile, branding: branding as BrandIdentity | null }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const { id: clientId } = await context.params
    if (!UUID.test(clientId)) return NextResponse.json({ error: 'Cliente inválido' }, { status: 400 })

    const client = await loadClientContext(clientId)
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const libraryFolderId = process.env.DRIVE_RECURSOS_FOLDER_ID?.trim()
    if (!libraryFolderId) {
      return NextResponse.json({ error: 'DRIVE_RECURSOS_FOLDER_ID no configurado' }, { status: 500 })
    }

    const [library, installed] = await Promise.all([
      listTemplatesForClient(libraryFolderId),
      client.branding?.drive_folder_id
        ? listTemplatesForClient(client.branding.drive_folder_id)
        : Promise.resolve([]),
    ])

    return NextResponse.json({
      client: {
        id: client.profile.id,
        name: client.profile.company_name || client.profile.full_name || 'Cliente',
        calendarCode: client.profile.calendario_asignado || 'CAL-00',
        driveFolderId: client.branding?.drive_folder_id ?? null,
        logoUrl: client.branding?.logo_url ?? null,
      },
      selected: client.branding?.templates_elegidos ?? [],
      installed,
      library,
    })
  } catch (error) {
    console.error('[ADMIN/CLIENT-TEMPLATES] Error listando diseños:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron cargar los diseños' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const { id: clientId } = await context.params
    if (!UUID.test(clientId)) return NextResponse.json({ error: 'Cliente inválido' }, { status: 400 })

    const client = await loadClientContext(clientId)
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const body = await request.json() as { templates?: unknown }
    const selected = uniqueTemplateNames(body.templates)
    if (selected.length > 20) return NextResponse.json({ error: 'Podés asignar hasta 20 diseños por cliente' }, { status: 400 })

    const libraryFolderId = process.env.DRIVE_RECURSOS_FOLDER_ID?.trim()
    if (!libraryFolderId) return NextResponse.json({ error: 'DRIVE_RECURSOS_FOLDER_ID no configurado' }, { status: 500 })

    const library = await listTemplatesForClient(libraryFolderId)
    const allowedNames = new Set(library.map(item => item.name))
    const unknown = selected.filter(name => !allowedNames.has(name))
    if (unknown.length > 0) {
      return NextResponse.json({ error: `Estos diseños no pertenecen a la biblioteca Between: ${unknown.join(', ')}` }, { status: 400 })
    }

    const brandingPayload = {
      ...(client.branding ?? {}),
      user_id: clientId,
      templates_elegidos: selected,
      updated_at: new Date().toISOString(),
    }
    const { data: savedBranding, error: saveError } = await client.admin
      .from('brand_identity')
      .upsert(brandingPayload, { onConflict: 'user_id' })
      .select('*')
      .single()
    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })

    const configuredMatiUrl = process.env.MATI_SKILL_URL?.trim()
    if (!configuredMatiUrl) {
      return NextResponse.json({ success: true, selected, sync: 'pending', warning: 'MATI_SKILL_URL no configurada: la asignación quedó guardada, pero Drive todavía no fue sincronizado.' })
    }

    // MATI_SKILL_URL normally points at /api/generar-carrusel because that is
    // the hot path used by the calendar. Template assignment is an onboarding
    // operation, so always derive the dedicated endpoint from the configured
    // service base instead of posting the onboarding payload to the renderer.
    const matiBase = configuredMatiUrl.replace(/\/api\/[^/]+\/?$/u, '')
    const matiOnboardingUrl = `${matiBase}/api/onboarding-cliente`

    const payload = buildSkillPayload(savedBranding as BrandIdentity, client.profile)
    const matiToken = process.env.MATI_SKILL_TOKEN?.trim()
    const response = await fetch(matiOnboardingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(matiToken ? { Authorization: `Bearer ${matiToken}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    const responseText = await response.text()
    if (!response.ok) {
      console.error(`[ADMIN/CLIENT-TEMPLATES] Onboarding Mati HTTP ${response.status}: ${responseText.slice(0, 500)}`)
      return NextResponse.json({
        success: true,
        selected,
        sync: 'failed',
        syncError: response.status === 401 || response.status === 403 ? 'auth' : 'service',
        warning: 'La asignación quedó guardada, pero no se pudo sincronizar la carpeta del cliente. Podés reintentar sin perder la selección.',
      })
    }

    let result: Record<string, unknown> = {}
    try { result = JSON.parse(responseText) as Record<string, unknown> } catch {}
    const driveFolderId = typeof result.drive_folder_id === 'string' ? result.drive_folder_id : null
    if (driveFolderId && driveFolderId !== savedBranding.drive_folder_id) {
      await client.admin.from('brand_identity').update({ drive_folder_id: driveFolderId }).eq('user_id', clientId)
    }

    return NextResponse.json({ success: true, selected, sync: 'completed', driveFolderId })
  } catch (error) {
    console.error('[ADMIN/CLIENT-TEMPLATES] Error asignando diseños:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron asignar los diseños' }, { status: 500 })
  }
}
