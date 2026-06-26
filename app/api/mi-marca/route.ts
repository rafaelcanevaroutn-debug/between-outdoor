import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSkillPayload } from '@/lib/skill-payload'
import type { BrandIdentity } from '@/types'

const SKILL_TIMEOUT_MS = 30_000

async function callMatiSkill(
  branding: BrandIdentity | null,
  ownerProfile: { company_name: string | null; full_name: string | null },
): Promise<string | null> {
  const url = process.env.MATI_SKILL_URL
  if (!url) {
    console.warn('[SKILL] MATI_SKILL_URL no configurada — saltando envío')
    return null
  }

  const payload = buildSkillPayload(branding, ownerProfile)
  const token   = process.env.MATI_SKILL_TOKEN?.trim()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SKILL_TIMEOUT_MS)

  try {
    console.log('[SKILL] Enviando branding a Mati:', JSON.stringify(payload, null, 2))
    const res = await fetch(url, {
      method:  'POST',
      headers,
      body:    JSON.stringify(payload),
      signal:  controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '(sin cuerpo)')
      console.error(`[SKILL] Error HTTP ${res.status}: ${text}`)
      return null
    }

    const data = await res.json()
    const folderId = data?.drive_folder_id ?? null
    console.log(`[SKILL] Respuesta OK — drive_folder_id: ${folderId ?? '(no devuelto)'}`)
    return folderId
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.error(`[SKILL] Timeout después de ${SKILL_TIMEOUT_MS / 1000}s — skill no respondió`)
    } else {
      console.error('[SKILL] Error al llamar la skill:', err instanceof Error ? err.message : err)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { color_primario, color_secundario, color_acento, color_texto, color_fondo, font_title, font_body } = await request.json()

    const admin = createAdminClient()

    // 1. Guardar branding en la plataforma
    const { error } = await admin
      .from('brand_identity')
      .upsert(
        { user_id: user.id, color_primario, color_secundario, color_acento, color_texto, color_fondo, font_title, font_body, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 2. Traer el branding completo (incluye logo_url si ya fue subido)
    //    y el perfil del cliente (para "cliente" en el payload de Mati)
    const [{ data: fullBranding }, { data: ownerProfile }] = await Promise.all([
      admin.from('brand_identity').select('*').eq('user_id', user.id).single(),
      admin.from('profiles').select('company_name, full_name').eq('id', user.id).single(),
    ])

    // 3. Llamar a la skill de Mati (no bloquea si falla)
    const driveFolderId = await callMatiSkill(
      fullBranding as BrandIdentity | null,
      ownerProfile ?? { company_name: null, full_name: null },
    )

    // 4. Si la skill devolvió drive_folder_id, guardarlo
    if (driveFolderId) {
      await admin
        .from('brand_identity')
        .update({ drive_folder_id: driveFolderId })
        .eq('user_id', user.id)
    }

    return NextResponse.json({ success: true, drive_folder_id: driveFolderId })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
