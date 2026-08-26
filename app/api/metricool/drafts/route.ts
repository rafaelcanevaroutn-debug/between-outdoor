import {createHash} from 'node:crypto'
import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {
  createMetricoolScheduledPost,
  MetricoolApiError,
  normalizeMetricoolMediaUrl,
  type MetricoolNetwork,
} from '@/lib/metricool'
import {buildMetricoolMediaUrls} from '@/lib/metricool-media'
import {
  dateTimeInZone,
  getMetricoolConnection,
  metricoolCaption,
  metricoolConfigForConnection,
} from '@/lib/metricool-server'
import type {ContenidoGenerado} from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SUPPORTED_NETWORKS = new Set<MetricoolNetwork>(['instagram', 'facebook', 'tiktok'])

function idempotencyKey(userId: string, contentId: string, scheduledAt: string, providers: MetricoolNetwork[]): string {
  return createHash('sha256')
    .update(`${userId}:${contentId}:${scheduledAt}:${[...providers].sort().join(',')}:draft`)
    .digest('hex')
    .slice(0, 48)
}

function safeError(error: unknown): string {
  if (error instanceof MetricoolApiError) return `${error.message}: ${error.responseBody}`.slice(0, 1_000)
  return error instanceof Error ? error.message.slice(0, 1_000) : 'Error desconocido'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})

  const body = await request.json().catch(() => null) as {
    contenidoId?: unknown
    scheduledAt?: unknown
    providers?: unknown
  } | null
  const contenidoId = typeof body?.contenidoId === 'string' ? body.contenidoId.trim() : ''
  const scheduledAt = typeof body?.scheduledAt === 'string' ? body.scheduledAt.trim() : ''
  const providers = Array.isArray(body?.providers)
    ? [...new Set(body.providers.filter((value): value is MetricoolNetwork => typeof value === 'string' && SUPPORTED_NETWORKS.has(value as MetricoolNetwork)))]
    : []
  if (!contenidoId || !scheduledAt || providers.length === 0) {
    return NextResponse.json({error: 'Faltan contenido, fecha o redes sociales'}, {status: 400})
  }
  const scheduledDate = new Date(scheduledAt)
  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now() + 5 * 60_000) {
    return NextResponse.json({error: 'La publicación debe programarse al menos 5 minutos hacia adelante'}, {status: 400})
  }

  const admin = createAdminClient()
  let publicationId: string | null = null
  let attemptCount = 1
  try {
    const [connection, pieceResult] = await Promise.all([
      getMetricoolConnection(admin, user.id),
      admin.from('contenido_generado').select('*').eq('id', contenidoId).eq('user_id', user.id).maybeSingle(),
    ])
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json({error: 'Metricool no está conectado para este cliente'}, {status: 409})
    }
    if (pieceResult.error || !pieceResult.data) return NextResponse.json({error: 'Contenido no encontrado'}, {status: 404})
    const piece = pieceResult.data as ContenidoGenerado
    if (piece.render_status !== 'rendered' || !piece.render_folder_id) {
      return NextResponse.json({error: 'La pieza todavía no tiene un render final'}, {status: 409})
    }
    if (providers.some(provider => !connection.enabled_networks.includes(provider))) {
      return NextResponse.json({error: 'Elegiste una red que no está habilitada para este cliente'}, {status: 400})
    }
    const caption = metricoolCaption(piece)
    if (!caption) return NextResponse.json({error: 'La pieza no tiene copy para publicar'}, {status: 409})

    const key = idempotencyKey(user.id, contenidoId, scheduledDate.toISOString(), providers)
    const {data: inserted, error: insertError} = await admin.from('content_publications').insert({
      contenido_id: contenidoId,
      user_id: user.id,
      scheduled_at: scheduledDate.toISOString(),
      timezone: connection.timezone,
      providers,
      status: 'preparing',
      idempotency_key: key,
    }).select('id,status,metricool_post_id,metricool_post_uuid').single()
    if (insertError?.code === '23505') {
      const {data: existing} = await admin.from('content_publications')
        .select('id,status,metricool_post_id,metricool_post_uuid,last_error,attempt_count')
        .eq('idempotency_key', key)
        .single()
      if (!existing) throw new Error('No se pudo recuperar la publicación existente')
      if (existing.status !== 'failed') return NextResponse.json({publication: existing, reused: true})
      publicationId = existing.id
      attemptCount = Number(existing.attempt_count ?? 0) + 1
      await admin.from('content_publications').update({
        status: 'preparing',
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq('id', publicationId)
    } else {
      if (insertError || !inserted) throw insertError ?? new Error('No se pudo reservar la publicación')
      publicationId = inserted.id
    }

    const config = metricoolConfigForConnection(connection)
    const publicMediaUrls = await buildMetricoolMediaUrls(piece)
    const normalizedMedia: string[] = []
    for (const publicUrl of publicMediaUrls) {
      normalizedMedia.push(await normalizeMetricoolMediaUrl({config, publicUrl}))
    }
    const post = {
      publicationDate: {
        dateTime: dateTimeInZone(scheduledDate, connection.timezone),
        timezone: connection.timezone,
      },
      text: caption,
      providers: providers.map(network => ({network})),
      media: normalizedMedia,
      autoPublish: false,
      draft: true,
      shortener: false,
      saveExternalMediaFiles: true,
      ...(providers.includes('instagram') ? {
        instagramData: {
          autoPublish: false,
          type: piece.formato === 'video' ? 'REEL' as const : 'POST' as const,
          ...(piece.formato === 'video' ? {showReelOnFeed: true} : {}),
        },
      } : {}),
    }
    await admin.from('content_publications').update({
      status: 'syncing',
      request_payload: post,
      attempt_count: attemptCount,
      updated_at: new Date().toISOString(),
    }).eq('id', publicationId)

    const result = await createMetricoolScheduledPost({config, post, idempotencyKey: key})
    const {data: completed, error: updateError} = await admin.from('content_publications').update({
      status: 'draft',
      metricool_post_id: typeof result.id === 'number' ? result.id : null,
      metricool_post_uuid: typeof result.uuid === 'string' ? result.uuid : null,
      response_payload: result,
      last_error: null,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', publicationId).select('id,status,metricool_post_id,metricool_post_uuid,synced_at').single()
    if (updateError) throw updateError
    return NextResponse.json({publication: completed, reused: false}, {status: 201})
  } catch (error) {
    const message = safeError(error)
    if (publicationId) {
      await admin.from('content_publications').update({
        status: 'failed',
        last_error: message,
        updated_at: new Date().toISOString(),
      }).eq('id', publicationId)
    }
    console.error('[METRICOOL/DRAFT]', message)
    return NextResponse.json({error: 'No se pudo preparar el borrador en Metricool'}, {status: 502})
  }
}
