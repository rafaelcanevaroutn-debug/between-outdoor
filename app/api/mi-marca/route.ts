import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSkillPayload } from '@/lib/skill-payload'
import type { BrandIdentity } from '@/types'

const SKILL_TIMEOUT_MS = 90_000

type MatiOnboardingResult =
  | { ok: true;  drive_folder_id: string | null }
  | { ok: false; reason: 'no_url' | 'timeout' | 'http_error' | 'parse_error' | 'network_error'; status?: number; body?: string; message?: string }

async function callMatiOnboarding(
  branding: BrandIdentity | null,
  ownerProfile: { company_name: string | null; full_name: string | null },
): Promise<MatiOnboardingResult> {
  const url = process.env.MATI_SKILL_URL
  if (!url) {
    console.warn('[MATI/ONBOARDING] MATI_SKILL_URL no configurada — saltando envío')
    return { ok: false, reason: 'no_url' }
  }

  const payload = buildSkillPayload(branding, ownerProfile)
  const token   = process.env.MATI_SKILL_TOKEN?.trim()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  console.log('[MATI/ONBOARDING] ── PAYLOAD ──────────────────────────────────────')
  console.log(`[MATI/ONBOARDING] URL:     ${url}`)
  console.log(`[MATI/ONBOARDING] Auth:    ${token ? 'Bearer ***' : 'sin token'}`)
  console.log('[MATI/ONBOARDING] Body:   ', JSON.stringify(payload, null, 2))
  console.log('[MATI/ONBOARDING] ────────────────────────────────────────────────')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SKILL_TIMEOUT_MS)

  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal })
    const rawBody = await res.text()

    console.log(`[MATI/ONBOARDING] HTTP ${res.status} | body: ${rawBody.slice(0, 500)}`)

    if (!res.ok) {
      const reason = res.status >= 500 ? 'http_error' : 'http_error'
      console.error(`[MATI/ONBOARDING] ✗ Error HTTP ${res.status} — ${res.statusText}`)
      console.error(`[MATI/ONBOARDING] Respuesta: ${rawBody}`)
      if (res.status === 400) console.error('[MATI/ONBOARDING] 400 Bad Request — revisar campos del payload (cliente, branding, templates_elegidos)')
      if (res.status === 401 || res.status === 403) console.error('[MATI/ONBOARDING] Auth rechazada — revisar MATI_SKILL_TOKEN')
      if (res.status === 404) console.error('[MATI/ONBOARDING] 404 — la URL del endpoint puede ser incorrecta')
      if (res.status >= 500) console.error('[MATI/ONBOARDING] Error del servidor de Mati — no es problema nuestro')
      return { ok: false, reason, status: res.status, body: rawBody }
    }

    let data: Record<string, unknown>
    try {
      data = JSON.parse(rawBody)
    } catch {
      console.error('[MATI/ONBOARDING] ✗ Respuesta OK pero no es JSON válido:', rawBody)
      return { ok: false, reason: 'parse_error', body: rawBody }
    }

    const drive_folder_id = (data?.drive_folder_id as string) ?? null
    console.log(`[MATI/ONBOARDING] ✓ OK | drive_folder_id: ${drive_folder_id ?? '(no devuelto)'}`)
    if (!drive_folder_id) console.warn('[MATI/ONBOARDING] Respuesta sin drive_folder_id — el branding se guardó pero no hay carpeta Drive asociada')

    return { ok: true, drive_folder_id }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.error(`[MATI/ONBOARDING] ✗ Timeout — sin respuesta después de ${SKILL_TIMEOUT_MS / 1000}s`)
      return { ok: false, reason: 'timeout' }
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error('[MATI/ONBOARDING] ✗ Error de red:', message)
    return { ok: false, reason: 'network_error', message }
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { color_primario, color_secundario, color_acento, color_texto, color_fondo, font_title, font_body, mati_cliente_id, fotos_folder_id, videos_folder_id } = await request.json()

    const admin = createAdminClient()

    // 1. Guardar branding en la plataforma
    const { error } = await admin
      .from('brand_identity')
      .upsert(
        { user_id: user.id, color_primario, color_secundario, color_acento, color_texto, color_fondo, font_title, font_body, mati_cliente_id: mati_cliente_id ?? null, fotos_folder_id: typeof fotos_folder_id === 'string' ? fotos_folder_id.trim() || null : null, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 2. Traer el branding completo + perfil del cliente
    const [{ data: fullBranding }, { data: ownerProfile }] = await Promise.all([
      admin.from('brand_identity').select('*').eq('user_id', user.id).single(),
      admin.from('profiles').select('company_name, full_name').eq('id', user.id).single(),
    ])

    // 3. Llamar al onboarding de Mati en background — no bloquea al usuario
    after(async () => {
      console.log('[MATI/ONBOARDING] Estado en DB antes de llamar a Mati:')
      console.log(`  logo_url:            ${fullBranding?.logo_url ?? '(null)'}`)
      console.log(`  templates_elegidos:  ${JSON.stringify(fullBranding?.templates_elegidos ?? null)}`)
      console.log(`  mati_cliente_id:     ${fullBranding?.mati_cliente_id ?? '(null)'}`)
      console.log(`  color_primario:      ${fullBranding?.color_primario ?? '(null)'}`)
      console.log(`  font_title:          ${fullBranding?.font_title ?? '(null)'}`)
      console.log(`  company_name:        ${ownerProfile?.company_name ?? '(null)'}`)

      const matiResult = await callMatiOnboarding(
        fullBranding as BrandIdentity | null,
        ownerProfile ?? { company_name: null, full_name: null },
      )

      if (matiResult.ok && matiResult.drive_folder_id) {
        await admin
          .from('brand_identity')
          .update({ drive_folder_id: matiResult.drive_folder_id })
          .eq('user_id', user.id)
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
