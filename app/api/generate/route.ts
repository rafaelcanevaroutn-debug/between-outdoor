import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateContentForSalida } from '@/lib/gemini'
import type { Salida, KnowledgeBase, TikTokIntelligence, Niche, ObjetivoGeneracion, Vertical, SubVertical } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { salidaId, objetivo = 'vender_salida', subverticals = {}, carpetasPorVertical = {}, cantidad } = await request.json()
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

    // Get knowledge base and TikTok references
    const { data: knowledgeBase } = await admin
      .from('knowledge_base')
      .select('*')
      .eq('niche', profile.niche)
      .eq('activo', true)
      .limit(10)

    const nichoExacto = (profile.niche as string).toLowerCase().trim()
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

    // Generate content with Gemini
    const pieces = await generateContentForSalida(
      salida as Salida,
      carpetasPorVertical as Partial<Record<Vertical, string>>,
      (knowledgeBase || []) as KnowledgeBase[],
      profile.niche as Niche,
      profile.company_name || profile.full_name || 'Cliente',
      tiktokExamples,
      objetivo as ObjetivoGeneracion,
      subverticals as Partial<Record<Vertical, SubVertical>>,
      typeof cantidad === 'number' ? cantidad : undefined,
    )

    // Delete existing content and re-insert, reset export flag so button becomes active again
    await Promise.all([
      admin.from('contenido_generado').delete().eq('salida_id', salidaId),
      admin.from('salidas').update({ sheets_exported_at: null }).eq('id', salidaId),
    ])

    const toInsert = pieces.map(piece => ({
      salida_id: salidaId,
      user_id: salida.user_id,  // owner of the salida (admin generates on behalf of client)
      vertical: piece.vertical,
      slot_key: piece.subvertical ?? null,
      titulo: piece.titulo,
      subtitulo: piece.subtitulo,
      bullets: piece.bullets,
      cta: piece.cta,
      slides: piece.slides.length > 0 ? piece.slides : null,
      video_crudo: piece.video_crudo,
      mes: piece.mes,
      is_edited: false,
    }))

    const { error: insertError } = await admin.from('contenido_generado').insert(toInsert)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ success: true, count: pieces.length })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar contenido' },
      { status: 500 }
    )
  }
}
