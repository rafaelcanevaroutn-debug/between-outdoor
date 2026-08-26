import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {getMetricoolConnection} from '@/lib/metricool-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})

  try {
    const connection = await getMetricoolConnection(createAdminClient(), user.id)
    const missing: string[] = []
    if (!process.env.METRICOOL_API_TOKEN?.trim()) missing.push('METRICOOL_API_TOKEN')
    if (!process.env.METRICOOL_MEDIA_SIGNING_SECRET?.trim()) missing.push('METRICOOL_MEDIA_SIGNING_SECRET')
    if (!process.env.BETWEEN_PUBLIC_APP_URL?.trim()) missing.push('BETWEEN_PUBLIC_APP_URL')
    if (!connection) missing.push('conexión del cliente')

    return NextResponse.json({
      ready: missing.length === 0 && connection?.status === 'connected',
      connection: connection ? {
        status: connection.status,
        timezone: connection.timezone,
        enabledNetworks: connection.enabled_networks,
        lastVerifiedAt: connection.last_verified_at,
        lastError: connection.last_error,
      } : null,
      missing,
    })
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === '42P01') {
      return NextResponse.json({ready: false, connection: null, missing: ['migración 030_metricool_publications.sql']})
    }
    console.error('[METRICOOL/STATUS]', error)
    return NextResponse.json({error: 'No se pudo revisar Metricool'}, {status: 500})
  }
}
