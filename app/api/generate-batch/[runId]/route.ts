import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!callerProfile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const admin = createAdminClient()
  const { data: run } = await admin
    .from('calendar_batch_runs')
    .select('id, user_id, calendar_code, status, result, error, created_at, updated_at')
    .eq('id', runId)
    .single()

  if (!run) return NextResponse.json({ error: 'Corrida no encontrada' }, { status: 404 })
  if (run.user_id !== user.id && callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  return NextResponse.json(run)
}
