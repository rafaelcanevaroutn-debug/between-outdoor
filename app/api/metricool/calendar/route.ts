import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {listMetricoolScheduledPosts} from '@/lib/metricool'
import {getMetricoolConnection, metricoolConfigForConnection} from '@/lib/metricool-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})

  const start = request.nextUrl.searchParams.get('start') ?? ''
  const end = request.nextUrl.searchParams.get('end') ?? ''
  if (!start || !end) return NextResponse.json({error: 'Faltan start y end'}, {status: 400})

  try {
    const connection = await getMetricoolConnection(createAdminClient(), user.id)
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({error: 'Metricool no está conectado para este cliente'}, {status: 409})
    }
    const timezone = request.nextUrl.searchParams.get('timezone') || connection.timezone
    const posts = await listMetricoolScheduledPosts({
      config: metricoolConfigForConnection(connection),
      query: {start, end, timezone},
    })
    return NextResponse.json({posts, timezone})
  } catch (error) {
    console.error('[METRICOOL/CALENDAR]', error)
    return NextResponse.json({error: 'No se pudo sincronizar el calendario de Metricool'}, {status: 502})
  }
}
