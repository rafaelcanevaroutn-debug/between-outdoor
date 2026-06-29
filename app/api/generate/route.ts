import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateContentForSalida } from '@/lib/gemini'
import type { Salida, KnowledgeBase, TikTokIntelligence, Niche, ObjetivoGeneracion, Vertical, SubVertical, ClientOnboarding, BrandIdentity, GeneratedCarrusel, GeneratedPieceLegacy } from '@/types'
import { buildSkillPayload } from '@/lib/skill-payload'

export async function POST(request: NextRequest) {
  try {
    const { salidaId, objetivo = 'vender_salida', subverticals = {}, carpetasPorVertical = {}, cantidad, formato } = await request.json()
    if (!salidaId) return NextResponse.json({ error: 'salidaId requerido' }, { status: 400 })
    if (objetivo !== 'vender_salida' && objetivo !== 'mantener_cuenta') {
      return NextResponse.json({ error: 'objetivo debe ser vender_salida o mantener_cuenta' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    console.log(`[API/generate] objetivo=${objetivo} | cantidad=${cantidad ?? 'default'} | salidaId=${salidaId} | userId=${user.id}`)

    // Get profile (RLS: user sees own profile)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    const admin = createAdminClient()

    // Get salida via admin client (allows admin to generate for any client's salida)
    const { data: salida } = await admin
      .from('salidas')
      .select('*')
      .eq('id', salidaId)
      .single()

    if (!salida) return NextResponse.json({ error: 'Salida no encontrada' }, { status: 404 })

    // Always use the SALIDA OWNER's profile for niche — not the calling user's.
    // This ensures admin generates with the client's niche knowledge, not their own.
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', salida.user_id)
      .single()

    if (!ownerProfile) return NextResponse.json({ error: 'Perfil del cliente no encontrado' }, { status: 404 })

    console.log(`[GENERATE] caller=${user.id} | owner=${salida.user_id} | niche=${ownerProfile.niche}`)

    // Get client onboarding profile for the salida owner (optional — graceful if missing)
    const { data: clientOnboarding } = await admin
      .from('client_onboarding')
      .select('*')
      .eq('user_id', salida.user_id)
      .single()

    if (clientOnboarding) {
      console.log(`[GENERATE] Perfil cliente inyectado: avatar="${clientOnboarding.avatar_edad_genero ?? '—'}" | tono="${(clientOnboarding.marca_personalidad ?? '').slice(0, 60)}..." | embudo=${clientOnboarding.embudo_paso ?? '—'} | lineas_rojas="${clientOnboarding.marca_lineas_rojas ?? '—'}"`)
    } else {
      console.log('[GENERATE] Sin perfil de onboarding — generando con contexto de nicho únicamente')
    }

    // Get brand identity for the salida owner (optional — graceful if missing)
    const { data: brandIdentity } = await admin
      .from('brand_identity')
      .select('*')
      .eq('user_id', salida.user_id)
      .single()

    if (brandIdentity) {
      console.log(`[GENERATE] Branding cargado: font="${brandIdentity.font_family ?? '—'}" | colores=${[brandIdentity.color_primario, brandIdentity.color_secundario, brandIdentity.color_acento].filter(Boolean).join(', ') || '—'} | logo=${brandIdentity.logo_url ? 'sí' : 'no'}`)
    } else {
      console.log('[GENERATE] Sin branding — la skill recibirá branding null cuando se integre')
    }

    // ── Skill integration point (pendiente URL pública + token de Mati) ─────────
    // El payload ya está armado con los nombres exactos del contrato.
    // Cuando Mati pase la URL pública y el token, descomentar el fetch:
    //
    // const skillPayload = buildSkillPayload(brandIdentity as BrandIdentity | null, ownerProfile)
    // console.log('[GENERATE] Skill payload:', JSON.stringify(skillPayload, null, 2))
    //
    // const skillRes = await fetch('MATI_SKILL_URL', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer MATI_SKILL_TOKEN`,
    //   },
    //   body: JSON.stringify(skillPayload),
    // })
    // if (!skillRes.ok) console.error('[GENERATE] Skill error:', await skillRes.text())
    // ──────────────────────────────────────────────────────────────────────────

    // Get knowledge base and TikTok references using the OWNER's niche
    const { data: knowledgeBase } = await admin
      .from('knowledge_base')
      .select('*')
      .eq('niche', ownerProfile.niche)
      .eq('activo', true)
      .limit(10)

    const nichoExacto = (ownerProfile.niche as string).toLowerCase().trim()
    const { data: tiktokRaw } = await admin
      .from('tiktok_intelligence')
      .select('*')
      .eq('nicho', nichoExacto)
      .eq('es_referencia', true)
      .order('likes', { ascending: false })
      .limit(8)

    const tiktokExamples = ((tiktokRaw || []) as TikTokIntelligence[]).sort(
      (a, b) => (b.likes + b.comments * 2 + b.shares * 3) - (a.likes + a.comments * 2 + a.shares * 3)
    )

    console.log('[GENERATE] nichoExacto:', nichoExacto)
    console.log('[GENERATE] knowledge_base items:', knowledgeBase?.length ?? 0)
    console.log('[GENERATE] tiktok_intelligence items:', tiktokExamples.length)

    // Generate content with Gemini using the OWNER's niche and client profile
    const pieces = await generateContentForSalida(
      salida as Salida,
      carpetasPorVertical as Partial<Record<Vertical, string>>,
      (knowledgeBase || []) as KnowledgeBase[],
      ownerProfile.niche as Niche,
      ownerProfile.company_name || ownerProfile.full_name || 'Cliente',
      tiktokExamples,
      objetivo as ObjetivoGeneracion,
      subverticals as Partial<Record<Vertical, SubVertical>>,
      typeof cantidad === 'number' ? cantidad : undefined,
      (clientOnboarding as ClientOnboarding) ?? null,
      formato as 'carrusel' | 'video' | 'flyer' | 'historia' | undefined,
    )

    // Delete existing content and re-insert, reset export flag so button becomes active again
    await Promise.all([
      admin.from('contenido_generado').delete().eq('salida_id', salidaId),
      admin.from('salidas').update({ sheets_exported_at: null }).eq('id', salidaId),
    ])

    const toInsert = pieces.map(piece => {
      if (piece.formato === 'carrusel') {
        const c = piece as GeneratedCarrusel
        return {
          salida_id:            salidaId,
          user_id:              salida.user_id,
          formato:              'carrusel',
          vertical:             c.vertical ?? null,
          slot_key:             null,
          tema:                 c.tema,
          estructura_narrativa: c.estructura_narrativa,
          angulo:               c.angulo,
          cta_comentario:       c.cta_comentario,
          slides_data:          c.slides,
          video_crudo:          c.carpeta_material,
          mes:                  c.mes,
          is_edited:            false,
          // legacy fields — null para carruseles nuevos
          titulo: null, subtitulo: null, bullets: null, cta: null, slides: null,
        }
      } else {
        const l = piece as GeneratedPieceLegacy
        return {
          salida_id:   salidaId,
          user_id:     salida.user_id,
          formato:     l.formato,
          vertical:    l.vertical,
          slot_key:    l.subvertical ?? null,
          titulo:      l.titulo,
          subtitulo:   l.subtitulo,
          bullets:     l.bullets,
          cta:         l.cta,
          slides:      null,
          video_crudo: l.video_crudo,
          mes:         l.mes,
          is_edited:   false,
          // new carrusel fields — null para piezas legacy
          tema: null, estructura_narrativa: null, angulo: null, cta_comentario: null, slides_data: null,
        }
      }
    })

    const { data: inserted, error: insertError } = await admin
      .from('contenido_generado')
      .insert(toInsert)
      .select('id, formato, tema, angulo, slides_data, video_crudo')
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // ── POST a Mati por cada carrusel nuevo ────────────────────────────────────
    const matiBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+$/, '')
    const matiCarruselUrl = matiBase ? `${matiBase}/api/generar-carrusel` : null
    const matiClienteId   = brandIdentity?.mati_cliente_id ?? null

    if (matiCarruselUrl && matiClienteId && inserted) {
      const carruselRows = inserted.filter(r => r.formato === 'carrusel' && r.slides_data)

      if (carruselRows.length > 0) {
        console.log(`[MATI] Enviando ${carruselRows.length} carrusel(es) a ${matiCarruselUrl}`)

        const matiToken = process.env.MATI_SKILL_TOKEN?.trim()
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(matiToken ? { Authorization: `Bearer ${matiToken}` } : {}),
        }

        const matiResults = await Promise.allSettled(
          carruselRows.map(async row => {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 30_000)

            try {
              const slidesClean = (row.slides_data as { n_slide: number; rol: string; texto_principal: string; texto_apoyo: string | null; indicacion_imagen?: string }[])
                .map(s => ({ n_slide: s.n_slide, rol: s.rol, texto_principal: s.texto_principal, texto_apoyo: s.texto_apoyo ?? null }))

              const payload = {
                cliente:          matiClienteId,
                tema:             row.tema,
                carpeta_material: row.video_crudo,
                angulo:           row.angulo,
                branding: {
                  primaryColor:   brandIdentity?.color_primario   ?? null,
                  secondaryColor: brandIdentity?.color_secundario ?? null,
                  bgColor:        brandIdentity?.color_fondo      ?? null,
                  textColor:      brandIdentity?.color_texto      ?? null,
                  titleFont:      brandIdentity?.font_title       ?? null,
                  bodyFont:       brandIdentity?.font_body        ?? null,
                },
                slides: slidesClean,
              }

              console.log(`[MATI] POST carrusel id=${row.id} | tema=${row.tema} | slides=${slidesClean.length}`)
              const res = await fetch(matiCarruselUrl, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal })

              if (!res.ok) {
                const txt = await res.text().catch(() => '(sin cuerpo)')
                console.error(`[MATI] Error HTTP ${res.status} para id=${row.id}: ${txt}`)
                return
              }

              const data = await res.json()
              const renderFolderId = data?.drive_folder_id ?? null
              console.log(`[MATI] ✓ id=${row.id} | drive_folder_id=${renderFolderId ?? '(no devuelto)'}`)

              if (renderFolderId) {
                await admin.from('contenido_generado').update({ render_folder_id: renderFolderId }).eq('id', row.id)
              }
            } catch (err) {
              if ((err as Error).name === 'AbortError') {
                console.error(`[MATI] Timeout (30s) para carrusel id=${row.id}`)
              } else {
                console.error(`[MATI] Error para id=${row.id}:`, err instanceof Error ? err.message : err)
              }
            } finally {
              clearTimeout(timer)
            }
          })
        )

        const ok  = matiResults.filter(r => r.status === 'fulfilled').length
        const err = matiResults.filter(r => r.status === 'rejected').length
        console.log(`[MATI] Lote completo — OK: ${ok} | Errores: ${err}`)
      }
    } else {
      if (!matiCarruselUrl) console.warn('[MATI] MATI_SKILL_URL no configurada — saltando renderizado')
      else if (!matiClienteId) console.warn('[MATI] mati_cliente_id no configurado para este cliente — saltando renderizado')
    }
    // ──────────────────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true, count: pieces.length })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar contenido' },
      { status: 500 }
    )
  }
}
