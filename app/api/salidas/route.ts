import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, DEMO_USER_ID } from '@/lib/supabase/admin'
import { PREDEFINED_SLOTS } from '@/lib/verticals'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    // Ensure demo profile exists
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', DEMO_USER_ID).single()
    if (!existing) {
      await supabase.from('profiles').insert({
        id: DEMO_USER_ID,
        full_name: 'Usuario Demo',
        company_name: 'Between Outdoor',
        niche: 'trekking',
        role: 'admin',
      })
    }

    // Insert salida
    const { data: salida, error } = await supabase
      .from('salidas')
      .insert({ ...body, user_id: DEMO_USER_ID })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Auto-create predefined slots for this salida
    const slots = PREDEFINED_SLOTS.map(s => ({
      salida_id: salida.id,
      slot_key: s.key,
      slot_label: s.label,
      slot_description: s.description,
      sort_order: s.order,
    }))
    await supabase.from('material_slots').insert(slots)

    return NextResponse.json({ data: salida })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear salida' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('salidas')
      .select('*')
      .eq('user_id', DEMO_USER_ID)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener salidas' }, { status: 500 })
  }
}
