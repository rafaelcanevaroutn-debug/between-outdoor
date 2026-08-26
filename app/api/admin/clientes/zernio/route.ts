import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})
  const {data: profile} = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({error: 'Acceso denegado'}, {status: 403})
  return null
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const clientId = request.nextUrl.searchParams.get('clientId')?.trim() ?? ''
  if (!clientId) return NextResponse.json({error: 'clientId es obligatorio'}, {status: 400})

  const admin = createAdminClient()
  const [{data: profiles, error: profilesError}, {data: accounts, error: accountsError}] = await Promise.all([
    admin.from('zernio_profiles')
      .select('id,label,is_primary,status,last_synced_at,last_error')
      .eq('user_id', clientId)
      .order('is_primary', {ascending: false}),
    admin.from('zernio_accounts')
      .select('id,zernio_profile_id,platform,username,display_name,status,last_synced_at')
      .eq('user_id', clientId)
      .order('platform'),
  ])

  const migrationMissing = profilesError?.code === '42P01' || accountsError?.code === '42P01'
  if (migrationMissing) return NextResponse.json({error: 'Falta aplicar la migración de Zernio'}, {status: 409})
  if (profilesError || accountsError) {
    return NextResponse.json({error: profilesError?.message || accountsError?.message}, {status: 500})
  }

  return NextResponse.json({
    profiles: (profiles ?? []).map(profile => ({
      ...profile,
      accounts: (accounts ?? []).filter(account => account.zernio_profile_id === profile.id),
    })),
  })
}
