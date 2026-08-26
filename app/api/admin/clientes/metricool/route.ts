import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {listMetricoolScheduledPosts, type MetricoolNetwork} from '@/lib/metricool'
import {metricoolConfigForConnection} from '@/lib/metricool-server'

const NETWORKS = new Set<MetricoolNetwork>(['instagram', 'facebook', 'tiktok'])

async function requireAdmin() {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})
  const {data: profile} = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({error: 'Acceso denegado'}, {status: 403})
  return null
}

function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('es-AR', {timeZone: timezone}).format(new Date())
    return true
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const clientId = request.nextUrl.searchParams.get('clientId')?.trim() ?? ''
  if (!clientId) return NextResponse.json({error: 'clientId es obligatorio'}, {status: 400})
  const {data, error} = await createAdminClient().from('metricool_connections')
    .select('metricool_user_id,blog_id,timezone,enabled_networks,status,last_verified_at,last_error')
    .eq('user_id', clientId)
    .maybeSingle()
  if (error?.code === '42P01') return NextResponse.json({error: 'Falta aplicar la migración de Metricool'}, {status: 409})
  if (error) return NextResponse.json({error: error.message}, {status: 500})
  return NextResponse.json({connection: data ? {
    metricoolUserId: data.metricool_user_id,
    blogId: data.blog_id,
    timezone: data.timezone,
    enabledNetworks: data.enabled_networks,
    status: data.status,
    lastVerifiedAt: data.last_verified_at,
    lastError: data.last_error,
  } : null})
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : ''
  const metricoolUserId = Number(body?.metricoolUserId)
  const blogId = Number(body?.blogId)
  const timezone = typeof body?.timezone === 'string' ? body.timezone.trim() : 'America/Argentina/Buenos_Aires'
  const enabledNetworks = Array.isArray(body?.enabledNetworks)
    ? [...new Set(body.enabledNetworks.filter((value): value is MetricoolNetwork => typeof value === 'string' && NETWORKS.has(value as MetricoolNetwork)))]
    : ['instagram'] satisfies MetricoolNetwork[]
  if (!clientId || !Number.isSafeInteger(metricoolUserId) || metricoolUserId < 1 || !Number.isSafeInteger(blogId) || blogId < 1) {
    return NextResponse.json({error: 'clientId, metricoolUserId y blogId válidos son obligatorios'}, {status: 400})
  }
  if (!validTimezone(timezone) || enabledNetworks.length === 0) {
    return NextResponse.json({error: 'Zona horaria o redes inválidas'}, {status: 400})
  }

  const admin = createAdminClient()
  const {data: profile} = await admin.from('profiles').select('id').eq('id', clientId).maybeSingle()
  if (!profile) return NextResponse.json({error: 'Cliente no encontrado'}, {status: 404})

  const connection = {
    user_id: clientId,
    metricool_user_id: metricoolUserId,
    blog_id: blogId,
    timezone,
    enabled_networks: enabledNetworks,
    status: 'pending',
    last_error: null,
    updated_at: new Date().toISOString(),
  }
  const {error: upsertError} = await admin.from('metricool_connections').upsert(connection, {onConflict: 'user_id'})
  if (upsertError) return NextResponse.json({error: upsertError.message}, {status: 500})

  try {
    const now = new Date()
    const end = new Date(now.getTime() + 24 * 60 * 60_000)
    await listMetricoolScheduledPosts({
      config: metricoolConfigForConnection(connection),
      query: {start: now.toISOString(), end: end.toISOString(), timezone},
    })
    const verifiedAt = new Date().toISOString()
    await admin.from('metricool_connections').update({
      status: 'connected',
      last_verified_at: verifiedAt,
      last_error: null,
      updated_at: verifiedAt,
    }).eq('user_id', clientId)
    return NextResponse.json({success: true, status: 'connected', verifiedAt})
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'No se pudo verificar la conexión'
    await admin.from('metricool_connections').update({
      status: 'error',
      last_error: message,
      updated_at: new Date().toISOString(),
    }).eq('user_id', clientId)
    return NextResponse.json({success: false, status: 'error', error: message}, {status: 502})
  }
}
