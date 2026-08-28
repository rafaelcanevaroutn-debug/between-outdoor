import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-generation/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

// Lista liviana de salidas reales de un cliente, para el selector
// MOCK/REAL del modo admin — no expone más que lo necesario para elegir.
export async function GET(request: NextRequest) {
  const authorization = await requireAdmin()
  if (authorization.error) return authorization.error

  const clienteId = request.nextUrl.searchParams.get('clienteId')
  if (!clienteId) return NextResponse.json({ error: 'clienteId es requerido' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('salidas')
    .select('id, nombre, destino, fecha_inicio, estado')
    .eq('user_id', clienteId)
    .order('fecha_inicio', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ salidas: data ?? [] })
}
