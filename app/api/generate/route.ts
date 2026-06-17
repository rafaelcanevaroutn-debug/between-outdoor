import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContentForSalida } from '@/lib/gemini'
import type { Salida, MaterialSlot, SlotFile, KnowledgeBase, Niche } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { salidaId } = await request.json()
    if (!salidaId) return NextResponse.json({ error: 'salidaId requerido' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    // Get salida
    const { data: salida } = await supabase
      .from('salidas')
      .select('*')
      .eq('id', salidaId)
      .eq('user_id', user.id)
      .single()

    if (!salida) return NextResponse.json({ error: 'Salida no encontrada' }, { status: 404 })

    // Get slots with files
    const { data: slotsRaw } = await supabase
      .from('material_slots')
      .select('*')
      .eq('salida_id', salidaId)
      .order('sort_order')

    const { data: filesRaw } = await supabase
      .from('slot_files')
      .select('*')
      .eq('salida_id', salidaId)

    const slots: (MaterialSlot & { files: SlotFile[] })[] = (slotsRaw || []).map(slot => ({
      ...slot,
      files: (filesRaw || []).filter(f => f.slot_id === slot.id),
    }))

    // Get knowledge base for this niche
    const { data: knowledgeBase } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('niche', profile.niche)
      .eq('activo', true)
      .limit(10)

    // Generate content
    const pieces = await generateContentForSalida(
      salida as Salida,
      slots,
      (knowledgeBase || []) as KnowledgeBase[],
      profile.niche as Niche,
      profile.company_name || profile.full_name || 'Cliente',
    )

    // Delete existing content for this salida
    await supabase
      .from('contenido_generado')
      .delete()
      .eq('salida_id', salidaId)
      .eq('user_id', user.id)

    // Insert new content
    const toInsert = pieces.map(piece => ({
      salida_id: salidaId,
      user_id: user.id,
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

    const { error: insertError } = await supabase
      .from('contenido_generado')
      .insert(toInsert)

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
