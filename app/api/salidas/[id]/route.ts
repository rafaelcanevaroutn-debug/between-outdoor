import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeSalidaPayload } from '@/lib/salida-payload'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = normalizeSalidaPayload(await request.json())
    const admin = createAdminClient()

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    // Update salida
    let updateQuery = admin
      .from('salidas')
      .update(body)
      .eq('id', id)

    if (callerProfile?.role !== 'admin') {
      updateQuery = updateQuery.eq('user_id', user.id)
    }

    const { data: salida, error } = await updateQuery
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!salida) return NextResponse.json({ error: 'Salida no encontrada' }, { status: 404 })

    return NextResponse.json({ data: salida })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar salida' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const admin = createAdminClient()
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    let deleteQuery = admin
      .from('salidas')
      .delete()
      .eq('id', id)

    if (callerProfile?.role !== 'admin') {
      deleteQuery = deleteQuery.eq('user_id', user.id)
    }
    
    // Attempt to delete related content first just in case there's no CASCADE
    await admin.from('contenido_generado').delete().eq('salida_id', id)
    await admin.from('content_template_overrides').delete().eq('salida_id', id)
    
    const { data: slots } = await admin.from('material_slots').select('id').eq('salida_id', id)
    if (slots && slots.length > 0) {
      await admin.from('slot_files').delete().in('slot_id', slots.map(s => s.id))
      await admin.from('material_slots').delete().eq('salida_id', id)
    }

    const { error } = await deleteQuery

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al borrar salida' },
      { status: 500 }
    )
  }
}
