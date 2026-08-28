import {createHash} from 'node:crypto'
import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {buildSocialMediaUrls} from '@/lib/metricool-media'
import {createZernioPost, type ZernioPlatform, ZernioApiError, zernioConfigFromEnv} from '@/lib/zernio'
import {zernioCaption, type StoredZernioAccount} from '@/lib/zernio-server'
import type {ContenidoGenerado} from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function publicationKey(userId: string, contentId: string, scheduledAt: string, accountIds: string[]): string {
  return createHash('sha256')
    .update(`${userId}:${contentId}:${scheduledAt}:${[...accountIds].sort().join(',')}:zernio`)
    .digest('hex')
    .slice(0, 48)
}

function safeError(error: unknown): string {
  if (error instanceof ZernioApiError) return `${error.message}: ${error.responseBody}`.slice(0, 1_000)
  return error instanceof Error ? error.message.slice(0, 1_000) : 'Error desconocido'
}

export async function GET() {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})
  const {data, error} = await createAdminClient().from('content_publications')
    .select('id,contenido_id,scheduled_at,timezone,providers,status,publisher,external_post_id,platform_results,last_error,synced_at,updated_at')
    .eq('user_id', user.id)
    .eq('publisher', 'zernio')
    .order('scheduled_at', {ascending: true})
    .limit(100)
  if (error) return NextResponse.json({error: 'No se pudieron cargar las publicaciones'}, {status: 500})
  return NextResponse.json({publications: data ?? []})
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})
  const body = await request.json().catch(() => null) as {contenidoId?: unknown; scheduledAt?: unknown; accountIds?: unknown} | null
  const contenidoId = typeof body?.contenidoId === 'string' ? body.contenidoId.trim() : ''
  const scheduledAt = typeof body?.scheduledAt === 'string' ? body.scheduledAt.trim() : ''
  const accountIds = Array.isArray(body?.accountIds)
    ? [...new Set(body.accountIds.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).map(value => value.trim()))]
    : []
  const scheduledDate = new Date(scheduledAt)
  if (!contenidoId || accountIds.length === 0 || Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json({error: 'Faltan contenido, fecha o cuentas sociales'}, {status: 400})
  }
  if (scheduledDate.getTime() <= Date.now() + 5 * 60_000) {
    return NextResponse.json({error: 'La publicación debe programarse al menos 5 minutos hacia adelante'}, {status: 400})
  }

  const admin = createAdminClient()
  let publicationId: string | null = null
  try {
    const [{data: pieceData, error: pieceError}, {data: accountData, error: accountError}] = await Promise.all([
      admin.from('contenido_generado').select('*').eq('id', contenidoId).eq('user_id', user.id).maybeSingle(),
      admin.from('zernio_accounts')
        .select('id,user_id,zernio_profile_id,external_account_id,platform,username,display_name,status,metadata')
        .eq('user_id', user.id)
        .eq('status', 'connected')
        .in('external_account_id', accountIds),
    ])
    if (pieceError || !pieceData) return NextResponse.json({error: 'Contenido no encontrado'}, {status: 404})
    if (accountError) throw accountError
    const accounts = (accountData ?? []) as StoredZernioAccount[]
    if (accounts.length !== accountIds.length) return NextResponse.json({error: 'Alguna cuenta no está conectada o no pertenece al cliente'}, {status: 400})
    const piece = pieceData as ContenidoGenerado
    if (piece.render_status !== 'rendered' || !piece.render_folder_id) {
      return NextResponse.json({error: 'La pieza todavía no tiene un render final'}, {status: 409})
    }
    const caption = zernioCaption(piece)
    if (!caption) return NextResponse.json({error: 'La pieza no tiene copy para publicar'}, {status: 409})
    const {data: profile} = await admin.from('zernio_profiles')
      .select('timezone')
      .eq('id', accounts[0].zernio_profile_id)
      .single()
    const timezone = profile?.timezone ?? 'America/Argentina/Buenos_Aires'
    const key = publicationKey(user.id, contenidoId, scheduledDate.toISOString(), accountIds)
    const providers = [...new Set(accounts.map(account => account.platform))]
    const externalProfileIds = [...new Set(accounts.map(account => account.zernio_profile_id))]
    const {data: inserted, error: insertError} = await admin.from('content_publications').insert({
      contenido_id: contenidoId,
      user_id: user.id,
      scheduled_at: scheduledDate.toISOString(),
      timezone,
      providers,
      status: 'preparing',
      idempotency_key: key,
      publisher: 'zernio',
      external_profile_ids: externalProfileIds,
    }).select('id,status,external_post_id').single()
    if (insertError?.code === '23505') {
      const {data: existing} = await admin.from('content_publications')
        .select('id,contenido_id,scheduled_at,status,external_post_id,last_error')
        .eq('idempotency_key', key)
        .single()
      if (!existing) throw new Error('No se pudo recuperar la publicación existente')
      if (existing.status !== 'failed') return NextResponse.json({publication: existing, reused: true})
      publicationId = existing.id
    } else {
      if (insertError || !inserted) throw insertError ?? new Error('No se pudo reservar la publicación')
      publicationId = inserted.id
    }

    const mediaUrls = await buildSocialMediaUrls(piece)
    const mediaType = piece.formato === 'video' ? 'video' as const : 'image' as const
    const post = {
      title: piece.titulo || undefined,
      content: caption,
      mediaItems: mediaUrls.map(url => ({type: mediaType, url})),
      platforms: accounts.map(account => ({platform: account.platform as ZernioPlatform, accountId: account.external_account_id})),
      scheduledFor: scheduledDate.toISOString(),
      timezone,
    }
    await admin.from('content_publications').update({status: 'syncing', request_payload: post, updated_at: new Date().toISOString()}).eq('id', publicationId)
    const remote = await createZernioPost({config: zernioConfigFromEnv(), post, requestId: key})
    const now = new Date().toISOString()
    const {data: completed, error: updateError} = await admin.from('content_publications').update({
      status: 'scheduled',
      external_post_id: remote._id,
      response_payload: remote,
      platform_results: remote.platforms ?? [],
      last_error: null,
      synced_at: now,
      updated_at: now,
    }).eq('id', publicationId).select('id,contenido_id,scheduled_at,status,publisher,external_post_id,last_error,synced_at').single()
    if (updateError) throw updateError
    await admin.from('contenido_generado').update({
      scheduled_at: scheduledDate.toISOString(),
      updated_at: now,
    }).eq('id', contenidoId).eq('user_id', user.id)
    return NextResponse.json({publication: completed, reused: false}, {status: 201})
  } catch (error) {
    const message = safeError(error)
    if (publicationId) await admin.from('content_publications').update({status: 'failed', last_error: message, updated_at: new Date().toISOString()}).eq('id', publicationId)
    console.error('[ZERNIO/PUBLICATIONS]', message)
    return NextResponse.json({error: error instanceof ZernioApiError ? error.message : 'No se pudo programar la publicación en Zernio'}, {status: 502})
  }
}
