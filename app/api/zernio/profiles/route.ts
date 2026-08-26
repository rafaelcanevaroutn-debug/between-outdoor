import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {ensureZernioProfile, getZernioProfiles, syncZernioAccountsForProfile} from '@/lib/zernio-server'

export const dynamic = 'force-dynamic'

function errorCode(error: unknown): string {
  return typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
}

function migrationMissing(error: unknown): boolean {
  return ['42P01', 'PGRST205'].includes(errorCode(error))
}

async function currentUser() {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})
  try {
    const admin = createAdminClient()
    const profiles = await getZernioProfiles(admin, user.id)
    const result = await Promise.all(profiles.map(async profile => {
      try {
        return {...profile, accounts: await syncZernioAccountsForProfile({admin, profile})}
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 500) : 'No se pudieron sincronizar las cuentas'
        await admin.from('zernio_profiles').update({status: 'error', last_error: message, updated_at: new Date().toISOString()}).eq('id', profile.id)
        return {...profile, status: 'error' as const, last_error: message, accounts: []}
      }
    }))
    return NextResponse.json({profiles: result})
  } catch (error) {
    if (migrationMissing(error)) return NextResponse.json({error: 'Falta aplicar las migraciones 030 y 031 en Supabase'}, {status: 409})
    console.error('[ZERNIO/PROFILES/GET]', error)
    return NextResponse.json({error: 'No se pudieron cargar las redes sociales'}, {status: 502})
  }
}

export async function POST(request: NextRequest) {
  const user = await currentUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})
  if (!process.env.ZERNIO_API_KEY?.trim()) return NextResponse.json({error: 'Falta configurar ZERNIO_API_KEY'}, {status: 409})
  const body = await request.json().catch(() => null) as {label?: unknown} | null
  const label = typeof body?.label === 'string' && body.label.trim() ? body.label.trim() : 'Redes principales'
  try {
    const profile = await ensureZernioProfile({admin: createAdminClient(), userId: user.id, label})
    return NextResponse.json({profile}, {status: 201})
  } catch (error) {
    console.error('[ZERNIO/PROFILES/POST]', error)
    if (migrationMissing(error)) return NextResponse.json({error: 'Falta aplicar las migraciones 030 y 031 en Supabase'}, {status: 409})
    return NextResponse.json({error: error instanceof Error ? error.message : 'No se pudo preparar la conexión'}, {status: 502})
  }
}
