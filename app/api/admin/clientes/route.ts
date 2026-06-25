import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Niche } from '@/types'

const VALID_NICHES: Niche[] = ['trekking', 'running', 'ciclismo', 'turismo_aventura']

export async function POST(request: NextRequest) {
  try {
    // 1. Verify session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // 2. Double-check role in DB (never trust client-side claims)
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // 3. Validate input
    const { email, full_name, company_name, niche, password } = await request.json()

    if (!email || !full_name || !niche || !password) {
      return NextResponse.json({ error: 'email, full_name, niche y password son requeridos' }, { status: 400 })
    }
    if (!VALID_NICHES.includes(niche)) {
      return NextResponse.json({ error: 'Nicho inválido' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 4. Create user in Supabase Auth (service role — triggers handle_new_user)
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? 'Error al crear usuario' }, { status: 500 })
    }

    // 5. Update profile with real data (trigger may have set defaults — overwrite them)
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        full_name,
        company_name: company_name || null,
        niche,
        role: 'client',
      })
      .eq('id', created.user.id)

    if (profileError) {
      // User was created but profile update failed — clean up to avoid orphan
      await admin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: `Usuario creado pero perfil falló: ${profileError.message}` }, { status: 500 })
    }

    console.log(`[ADMIN] Cliente creado: ${email} | niche=${niche} | id=${created.user.id}`)

    return NextResponse.json({
      success: true,
      user: { id: created.user.id, email, full_name, company_name, niche },
    })
  } catch (error) {
    console.error('[ADMIN] Error creando cliente:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 },
    )
  }
}
