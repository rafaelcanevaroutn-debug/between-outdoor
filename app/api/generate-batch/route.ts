import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runWeeklyBatch } from '@/lib/orchestrators/weekly-batch'

export async function POST(request: NextRequest) {
  try {
    const { clientId, carpetaFotos, carpetaFotosId } = await request.json().catch(() => ({}))

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!callerProfile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    if (clientId && clientId !== user.id && callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado para generar el calendario de otro cliente' }, { status: 403 })
    }
    if (typeof carpetaFotos !== 'string' || !carpetaFotos.trim() || typeof carpetaFotosId !== 'string' || !carpetaFotosId.trim()) {
      return NextResponse.json({ error: 'Elegí una carpeta con imágenes para generar la semana' }, { status: 400 })
    }

    const targetClientId: string = clientId || user.id
    const admin = createAdminClient()

    const { data: targetProfile } = await admin.from('profiles').select('id, calendario_asignado').eq('id', targetClientId).single()
    if (!targetProfile) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const { data: run, error: insertError } = await admin
      .from('calendar_batch_runs')
      .insert({ user_id: targetClientId, calendar_code: targetProfile.calendario_asignado, status: 'pending' })
      .select('id')
      .single()

    if (insertError || !run) {
      return NextResponse.json({ error: insertError?.message ?? 'No se pudo crear la corrida del batch' }, { status: 500 })
    }

    // El batch entero (generación + inserción + render) corre en background,
    // no sincrónico con esta respuesta — el cliente pollea GET /api/generate-batch/[runId].
    after(() => runWeeklyBatch({
      runId: run.id,
      clientId: targetClientId,
      admin,
      carpetaFotos: carpetaFotos.trim(),
      carpetaFotosId: carpetaFotosId.trim(),
    }))

    return NextResponse.json({ runId: run.id, status: 'pending' }, { status: 202 })
  } catch (error) {
    console.error('Generate-batch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al iniciar el batch' },
      { status: 500 },
    )
  }
}
