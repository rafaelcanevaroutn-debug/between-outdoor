import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { answers, complete = false } = await request.json()

    const upsertData = {
      user_id: user.id,
      ...answers,
      updated_at: new Date().toISOString(),
      ...(complete ? { completed_at: new Date().toISOString() } : {}),
    }

    const { error } = await supabase
      .from('client_onboarding')
      .upsert(upsertData, { onConflict: 'user_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, complete })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 },
    )
  }
}
