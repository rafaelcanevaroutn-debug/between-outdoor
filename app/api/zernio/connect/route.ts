import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {getZernioConnectUrl, type ZernioPlatform, zernioConfigFromEnv} from '@/lib/zernio'

const PLATFORMS = new Set<ZernioPlatform>(['instagram', 'tiktok', 'facebook', 'youtube'])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})
  const body = await request.json().catch(() => null) as {profileId?: unknown; platform?: unknown} | null
  const profileId = typeof body?.profileId === 'string' ? body.profileId.trim() : ''
  const platform = typeof body?.platform === 'string' && PLATFORMS.has(body.platform as ZernioPlatform)
    ? body.platform as ZernioPlatform
    : null
  if (!profileId || !platform) return NextResponse.json({error: 'Perfil o red inválidos'}, {status: 400})

  const admin = createAdminClient()
  const {data: profile, error} = await admin.from('zernio_profiles')
    .select('id,external_profile_id')
    .eq('id', profileId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !profile) return NextResponse.json({error: 'Grupo de redes no encontrado'}, {status: 404})

  try {
    const configuredBase = process.env.BETWEEN_PUBLIC_APP_URL?.trim()
    const base = configuredBase ? new URL(configuredBase).origin : request.nextUrl.origin
    const callback = new URL('/api/zernio/callback', base)
    callback.searchParams.set('localProfileId', profile.id)
    const authUrl = await getZernioConnectUrl({
      config: zernioConfigFromEnv(),
      platform,
      profileId: profile.external_profile_id,
      redirectUrl: callback.toString(),
    })
    return NextResponse.json({authUrl})
  } catch (connectError) {
    console.error('[ZERNIO/CONNECT]', connectError)
    return NextResponse.json({error: connectError instanceof Error ? connectError.message : 'No se pudo iniciar la conexión'}, {status: 502})
  }
}
