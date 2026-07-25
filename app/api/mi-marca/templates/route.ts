import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listTemplatesForClient, deleteDriveFile } from '@/lib/google-drive'
import { buildSkillPayload } from '@/lib/skill-payload'
import type { BrandIdentity } from '@/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const recursosFolderId = process.env.DRIVE_RECURSOS_FOLDER_ID
    if (!recursosFolderId) {
      return NextResponse.json({ error: 'DRIVE_RECURSOS_FOLDER_ID no configurado' }, { status: 500 })
    }

    const files = await listTemplatesForClient(recursosFolderId)
    return NextResponse.json({ templates: files })
  } catch (err) {
    console.error('[TEMPLATES] Error listando Drive:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al listar templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { templates_elegidos } = await request.json()

    if (!Array.isArray(templates_elegidos)) {
      return NextResponse.json({ error: 'templates_elegidos debe ser un array' }, { status: 400 })
    }
    if (templates_elegidos.length > 5) {
      return NextResponse.json({ error: 'Máximo 5 templates' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 1. Guardar templates en DB
    const { error } = await admin
      .from('brand_identity')
      .update({ templates_elegidos, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    console.log(`[TEMPLATES] Guardados en DB: ${JSON.stringify(templates_elegidos)}`)

    // 2. Leer branding completo + perfil para notificar a Mati
    const [{ data: fullBranding }, { data: ownerProfile }] = await Promise.all([
      admin.from('brand_identity').select('*').eq('user_id', user.id).single(),
      admin.from('profiles').select('company_name, full_name').eq('id', user.id).single(),
    ])

    // 3. Notificar a Mati en background — no bloquea al usuario
    const matiUrl   = process.env.MATI_SKILL_URL
    const matiToken = process.env.MATI_SKILL_TOKEN?.trim()

    if (!matiUrl) {
      console.warn('[TEMPLATES] MATI_SKILL_URL no configurada — templates guardados en DB pero Mati no notificado')
    } else {
      after(async () => {
        console.log('[TEMPLATES] Estado en DB antes de llamar a Mati:')
        console.log(`  logo_url:           ${fullBranding?.logo_url ?? '(null)'}`)
        console.log(`  templates_elegidos: ${JSON.stringify(fullBranding?.templates_elegidos ?? null)}`)
        console.log(`  mati_cliente_id:    ${fullBranding?.mati_cliente_id ?? '(null)'}`)

        const payload = buildSkillPayload(fullBranding as BrandIdentity | null, ownerProfile ?? { company_name: null, full_name: null })
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(matiToken ? { Authorization: `Bearer ${matiToken}` } : {}),
        }

        // 3.1. Limpiar templates deseleccionados de Drive
        if (fullBranding?.drive_folder_id) {
          try {
            const currentDriveTemplates = await listTemplatesForClient(fullBranding.drive_folder_id)
            const toDelete = currentDriveTemplates.filter(t => {
              // templates_elegidos tiene el formato "nombre.hbs" igual que t.name
              return !templates_elegidos.includes(t.name)
            })

            if (toDelete.length > 0) {
              console.log(`[TEMPLATES] Borrando ${toDelete.length} templates deseleccionados de Drive...`)
              for (const t of toDelete) {
                try {
                  await deleteDriveFile(t.id)
                  if (t.htmlFileId) await deleteDriveFile(t.htmlFileId)
                  if (t.previewFileId) await deleteDriveFile(t.previewFileId)
                  console.log(`[TEMPLATES] ✓ Borrado de Drive: ${t.name}`)
                } catch (err) {
                  console.error(`[TEMPLATES] ✗ Error borrando ${t.name} de Drive:`, err)
                }
              }
            }
          } catch (err) {
            console.error('[TEMPLATES] Error al limpiar templates viejos en Drive:', err)
          }
        }

        console.log('[TEMPLATES/MATI] Enviando onboarding con templates:')
        console.log('[TEMPLATES/MATI] Body:', JSON.stringify(payload, null, 2))

        try {
          const res     = await fetch(matiUrl, { method: 'POST', headers, body: JSON.stringify(payload) })
          const rawBody = await res.text()

          console.log(`[TEMPLATES/MATI] HTTP ${res.status} | body: ${rawBody.slice(0, 500)}`)

          if (!res.ok) {
            console.error(`[TEMPLATES/MATI] ✗ HTTP ${res.status} — ${rawBody}`)
            if (res.status === 404) console.error('[TEMPLATES/MATI] 404 → cliente no existe en Drive todavía')
            return
          }

          let data: Record<string, unknown> = {}
          try { data = JSON.parse(rawBody) } catch {}

          const driveFolderId = (data?.drive_folder_id as string) ?? null
          console.log(`[TEMPLATES/MATI] ✓ OK | drive_folder_id: ${driveFolderId ?? '(no devuelto)'}`)

          if (driveFolderId) {
            await admin.from('brand_identity').update({ drive_folder_id: driveFolderId }).eq('user_id', user.id)
          }
        } catch (err) {
          console.error('[TEMPLATES/MATI] ✗ Error de red:', err instanceof Error ? err.message : err)
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
