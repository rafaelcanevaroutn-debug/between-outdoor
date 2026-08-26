import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {getMetricoolScheduledPost, metricoolPublicationState} from '@/lib/metricool'
import {getMetricoolConnection, metricoolConfigForConnection} from '@/lib/metricool-server'

export const dynamic = 'force-dynamic'

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({error: 'No autorizado'}, {status: 401})
  const {data, error} = await createAdminClient().from('content_publications')
    .select('id,contenido_id,scheduled_at,timezone,providers,status,metricool_post_id,metricool_post_uuid,last_error,synced_at,updated_at')
    .eq('user_id', userId)
    .order('scheduled_at', {ascending: true})
    .limit(100)
  if (error) return NextResponse.json({error: 'No se pudieron cargar las publicaciones'}, {status: 500})
  return NextResponse.json({publications: data ?? []})
}

export async function POST() {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({error: 'No autorizado'}, {status: 401})
  const admin = createAdminClient()
  try {
    const connection = await getMetricoolConnection(admin, userId)
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({error: 'Metricool no está conectado para este cliente'}, {status: 409})
    }
    const {data: publications, error} = await admin.from('content_publications')
      .select('id,metricool_post_id,status')
      .eq('user_id', userId)
      .not('metricool_post_id', 'is', null)
      .in('status', ['draft', 'scheduled'])
      .order('updated_at', {ascending: true})
      .limit(20)
    if (error) throw error

    const config = metricoolConfigForConnection(connection)
    const results: {id: string; status: string; error?: string}[] = []
    for (const publication of publications ?? []) {
      try {
        const post = await getMetricoolScheduledPost({config, postId: publication.metricool_post_id})
        const status = metricoolPublicationState(post)
        const syncedAt = new Date().toISOString()
        await admin.from('content_publications').update({
          status,
          response_payload: post,
          last_error: status === 'failed'
            ? (post.providers ?? []).find(provider => provider.status === 'ERROR')?.detailedStatus ?? 'Metricool informó un error'
            : null,
          synced_at: syncedAt,
          updated_at: syncedAt,
        }).eq('id', publication.id)
        results.push({id: publication.id, status})
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message.slice(0, 500) : 'Error de sincronización'
        await admin.from('content_publications').update({last_error: message, updated_at: new Date().toISOString()}).eq('id', publication.id)
        results.push({id: publication.id, status: publication.status, error: message})
      }
    }
    return NextResponse.json({synced: results.length, results})
  } catch (error) {
    console.error('[METRICOOL/PUBLICATIONS]', error)
    return NextResponse.json({error: 'No se pudieron sincronizar las publicaciones'}, {status: 502})
  }
}
