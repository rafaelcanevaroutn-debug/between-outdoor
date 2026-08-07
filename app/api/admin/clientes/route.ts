import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CalendarCode, Niche } from '@/types'

const VALID_NICHES: Niche[] = ['trekking', 'running', 'ciclismo', 'turismo_aventura']
const VALID_CALENDARS: CalendarCode[] = ['CAL-00', 'CAL-01', 'CAL-02', 'CAL-03', 'CAL-04', 'CAL-05']

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
  }

  return { error: null }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify session
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

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

export async function PATCH(request: NextRequest) {
  try {
    const authorization = await requireAdmin()
    if (authorization.error) return authorization.error

    const { clientId, calendario_asignado } = await request.json()

    if (typeof clientId !== 'string' || !clientId) {
      return NextResponse.json({ error: 'clientId es requerido' }, { status: 400 })
    }
    if (!VALID_CALENDARS.includes(calendario_asignado)) {
      return NextResponse.json({ error: 'Calendario inválido' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: targetProfile, error: targetError } = await admin
      .from('profiles')
      .select('id, role')
      .eq('id', clientId)
      .maybeSingle()

    if (targetError) {
      return NextResponse.json({ error: targetError.message }, { status: 500 })
    }
    if (!targetProfile || targetProfile.role !== 'client') {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ calendario_asignado })
      .eq('id', clientId)
      .eq('role', 'client')

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      clientId,
      calendario_asignado,
    })
  } catch (error) {
    console.error('[ADMIN] Error asignando calendario:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 },
    )
  }
}
