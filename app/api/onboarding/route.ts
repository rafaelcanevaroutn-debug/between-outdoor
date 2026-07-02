import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { answers, profile, complete = false } = await request.json()

    // 1. Save profile fields (full_name, company_name) to profiles table
    if (profile && (profile.full_name || profile.company_name)) {
      const profileUpdate: Record<string, string> = {}
      if (profile.full_name)    profileUpdate.full_name    = profile.full_name
      if (profile.company_name) profileUpdate.company_name = profile.company_name
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id)
      if (profileError) console.error('[ONBOARDING] Error al guardar perfil:', profileError.message)
    }

    // 2. Save onboarding answers to client_onboarding
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
