import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})

  const {id} = await params
  const body = await request.json().catch(() => null) as {scheduledAt?: unknown} | null
  const scheduledAt = typeof body?.scheduledAt === 'string' ? body.scheduledAt.trim() : ''
  const scheduledDate = new Date(scheduledAt)
  if (!scheduledAt || Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json({error: 'Elegí una fecha y hora válidas'}, {status: 400})
  }
  if (scheduledDate.getTime() <= Date.now() + 5 * 60_000) {
    return NextResponse.json({error: 'La publicación debe quedar al menos 5 minutos hacia adelante'}, {status: 400})
  }

  const admin = createAdminClient()
  const {data: activePublication, error: publicationError} = await admin
    .from('content_publications')
    .select('id,status')
    .eq('contenido_id', id)
    .eq('user_id', user.id)
    .in('status', ['preparing', 'syncing', 'scheduled', 'published'])
    .limit(1)
    .maybeSingle()
  if (publicationError) return NextResponse.json({error: 'No se pudo verificar la programación'}, {status: 500})
  if (activePublication) {
    return NextResponse.json({error: 'Esta pieza ya fue enviada a las redes y no puede moverse desde el calendario'}, {status: 409})
  }

  const {data, error} = await admin
    .from('contenido_generado')
    .update({scheduled_at: scheduledDate.toISOString(), updated_at: new Date().toISOString()})
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id,scheduled_at')
    .maybeSingle()
  if (error) return NextResponse.json({error: 'No se pudo guardar el nuevo horario'}, {status: 500})
  if (!data) return NextResponse.json({error: 'Pieza no encontrada'}, {status: 404})

  return NextResponse.json({piece: data})
}
