import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, DEMO_USER_ID, DEMO_PROFILE } from '@/lib/supabase/admin'
import { generateContentForSalida } from '@/lib/gemini'
import { PREDEFINED_SLOTS } from '@/lib/verticals'
import type { Salida, MaterialSlot, SlotFile, KnowledgeBase, TikTokIntelligence, Niche } from '@/types'

const isBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'

export async function POST(request: NextRequest) {
  try {
    const { salidaId } = await request.json()
    if (!salidaId) return NextResponse.json({ error: 'salidaId requerido' }, { status: 400 })

    const supabase = createAdminClient()

    // In bypass mode use demo profile; otherwise get real user
    let userId = DEMO_USER_ID
    let profile: typeof DEMO_PROFILE & Record<string, unknown> = DEMO_PROFILE as any

    if (!isBypass) {
      // Real auth flow (future use)
      return NextResponse.json({ error: 'Auth requerido' }, { status: 401 })
    }

    // Ensure demo profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: userId,
        full_name: DEMO_PROFILE.full_name,
        company_name: DEMO_PROFILE.company_name,
        niche: DEMO_PROFILE.niche,
        role: DEMO_PROFILE.role,
      })
    } else {
      profile = existingProfile
    }

    // Get salida
    const { data: salida } = await supabase
      .from('salidas')
      .select('*')
      .eq('id', salidaId)
      .single()

    if (!salida) return NextResponse.json({ error: 'Salida no encontrada' }, { status: 404 })

    // Get or auto-create slots
    let { data: slotsRaw } = await supabase
      .from('material_slots')
      .select('*')
      .eq('salida_id', salidaId)
      .order('sort_order')

    if (!slotsRaw || slotsRaw.length === 0) {
      // Auto-create predefined slots for this salida
      const slotsToInsert = PREDEFINED_SLOTS.map(s => ({
        salida_id: salidaId,
        slot_key: s.key,
        slot_label: s.label,
        slot_description: s.description,
        sort_order: s.order,
      }))
      const { data: inserted } = await supabase.from('material_slots').insert(slotsToInsert).select()
      slotsRaw = inserted || []
    }

    const { data: filesRaw } = await supabase
      .from('slot_files')
      .select('*')
      .eq('salida_id', salidaId)

    const slots: (MaterialSlot & { files: SlotFile[] })[] = (slotsRaw || []).map(slot => ({
      ...slot,
      files: (filesRaw || []).filter((f: SlotFile) => f.slot_id === slot.id),
    }))

    // Get knowledge base
    const { data: knowledgeBase } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('niche', profile.niche)
      .eq('activo', true)
      .limit(10)

    // Strict niche filter — only use references from the exact same niche.
    // No fallback to other niches: wrong niche is worse than no reference.
    const nichoExacto = (profile.niche as string).toLowerCase().trim()
    const { data: tiktokRaw } = await supabase
      .from('tiktok_intelligence')
      .select('*')
      .eq('nicho', nichoExacto)
      .eq('es_referencia', true)
      .order('likes', { ascending: false })
      .limit(8)

    // Sort by engagement score (likes + comments*2 + shares*3)
    const tiktokExamples = ((tiktokRaw || []) as TikTokIntelligence[]).sort(
      (a, b) => (b.likes + b.comments * 2 + b.shares * 3) - (a.likes + a.comments * 2 + a.shares * 3)
    )

    console.log('[GENERATE] nichoExacto:', nichoExacto)
    console.log('[GENERATE] knowledge_base items:', knowledgeBase?.length ?? 0)
    console.log('[GENERATE] tiktok_intelligence items para este nicho:', tiktokExamples.length)
    if (tiktokExamples.length === 0) {
      console.log('[GENERATE] ⚠ no hay referencias para el nicho', nichoExacto, '— Gemini genera sin ejemplos')
    } else {
      console.log('[GENERATE] top caption:', String(tiktokExamples[0].caption ?? '').slice(0, 80))
    }

    // Generate content with Gemini
    const pieces = await generateContentForSalida(
      salida as Salida,
      slots,
      (knowledgeBase || []) as KnowledgeBase[],
      profile.niche as Niche,
      profile.company_name || profile.full_name || 'Cliente',
      tiktokExamples,
    )

    // Delete existing content for this salida
    await supabase
      .from('contenido_generado')
      .delete()
      .eq('salida_id', salidaId)

    // Insert generated content
    const toInsert = pieces.map(piece => ({
      salida_id: salidaId,
      user_id: userId,
      vertical: piece.vertical,
      slot_key: piece.slot_key,
      titulo: piece.titulo,
      subtitulo: piece.subtitulo,
      bullets: piece.bullets,
      cta: piece.cta,
      video_crudo: piece.video_crudo,
      mes: piece.mes,
      is_edited: false,
    }))

    const { error: insertError } = await supabase.from('contenido_generado').insert(toInsert)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: pieces.length })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar contenido' },
      { status: 500 }
    )
  }
}
