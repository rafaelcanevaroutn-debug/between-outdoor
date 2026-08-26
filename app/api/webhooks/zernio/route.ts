import {createHmac, timingSafeEqual} from 'node:crypto'
import {NextRequest, NextResponse} from 'next/server'
import {createAdminClient} from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type Payload = Record<string, unknown>

function validSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!/^[0-9a-f]{64}$/iu.test(signature) || !secret) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function stringAt(...values: unknown[]): string {
  return values.find((value): value is string => typeof value === 'string' && Boolean(value.trim()))?.trim() ?? ''
}

function postId(payload: Payload): string {
  const post = record(payload.post)
  const data = record(payload.data)
  return stringAt(post?._id, post?.id, payload.postId, data?.postId, data?._id)
}

function platformResults(payload: Payload): unknown[] {
  const post = record(payload.post)
  const data = record(payload.data)
  const candidate = post?.platforms ?? payload.platforms ?? data?.platforms
  return Array.isArray(candidate) ? candidate : []
}

function publicationStatus(event: string): 'scheduled' | 'published' | 'failed' | 'cancelled' | null {
  if (event === 'post.scheduled') return 'scheduled'
  if (event === 'post.published' || event === 'post.partial') return 'published'
  if (event === 'post.failed') return 'failed'
  if (event === 'post.cancelled') return 'cancelled'
  return null
}

async function processAccountEvent(admin: ReturnType<typeof createAdminClient>, event: string, payload: Payload) {
  const account = record(payload.account) ?? record(record(payload.data)?.account)
  if (!account) return
  const externalProfileId = stringAt(account.profileId, payload.profileId)
  const externalAccountId = stringAt(account.accountId, account._id, account.id)
  const platform = stringAt(account.platform)
  if (!externalProfileId || !externalAccountId || !['instagram', 'tiktok', 'facebook', 'youtube'].includes(platform)) return
  const {data: localProfile} = await admin.from('zernio_profiles')
    .select('id,user_id')
    .eq('external_profile_id', externalProfileId)
    .maybeSingle()
  if (!localProfile) return
  const now = new Date().toISOString()
  await admin.from('zernio_accounts').upsert({
    user_id: localProfile.user_id,
    zernio_profile_id: localProfile.id,
    external_account_id: externalAccountId,
    platform,
    username: stringAt(account.username) || null,
    display_name: stringAt(account.displayName, account.name) || null,
    status: event === 'account.disconnected' ? 'disconnected' : 'connected',
    metadata: account,
    connected_at: event === 'account.connected' ? now : null,
    last_synced_at: now,
    updated_at: now,
  }, {onConflict: 'external_account_id'})
}

async function processPostEvent(admin: ReturnType<typeof createAdminClient>, event: string, payload: Payload) {
  const status = publicationStatus(event)
  const externalPostId = postId(payload)
  if (!status || !externalPostId) return
  const now = new Date().toISOString()
  const message = stringAt(payload.error, record(payload.post)?.error, record(payload.data)?.error)
  await admin.from('content_publications').update({
    status,
    platform_results: platformResults(payload),
    response_payload: payload,
    last_error: status === 'failed' ? (message || 'Zernio informó un error de publicación') : null,
    synced_at: now,
    updated_at: now,
  }).eq('publisher', 'zernio').eq('external_post_id', externalPostId)
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-zernio-signature') ?? request.headers.get('x-late-signature') ?? ''
  const secret = process.env.ZERNIO_WEBHOOK_SECRET?.trim() ?? ''
  const rawBody = await request.text()
  if (!validSignature(rawBody, signature, secret)) {
    return NextResponse.json({error: 'Firma inválida'}, {status: 401})
  }
  let payload: Payload
  try {
    payload = JSON.parse(rawBody) as Payload
  } catch {
    return NextResponse.json({error: 'JSON inválido'}, {status: 400})
  }
  const eventId = stringAt(payload.id, request.headers.get('x-zernio-event-id'), request.headers.get('x-late-event-id'))
  const event = stringAt(payload.event)
  if (!eventId || !event) return NextResponse.json({error: 'Evento incompleto'}, {status: 400})

  const admin = createAdminClient()
  const {error: insertError} = await admin.from('zernio_webhook_events').insert({event_id: eventId, event_type: event, payload})
  if (insertError?.code === '23505') {
    const {data: existing} = await admin.from('zernio_webhook_events').select('processed_at').eq('event_id', eventId).maybeSingle()
    if (existing?.processed_at) return NextResponse.json({received: true, duplicate: true})
  } else if (insertError) {
    console.error('[ZERNIO/WEBHOOK/RESERVE]', insertError)
    return NextResponse.json({error: 'No se pudo registrar el evento'}, {status: 500})
  }

  try {
    if (event.startsWith('account.')) await processAccountEvent(admin, event, payload)
    if (event.startsWith('post.')) await processPostEvent(admin, event, payload)
    await admin.from('zernio_webhook_events').update({processed_at: new Date().toISOString(), last_error: null}).eq('event_id', eventId)
    return NextResponse.json({received: true})
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : 'Error procesando webhook'
    await admin.from('zernio_webhook_events').update({last_error: message}).eq('event_id', eventId)
    console.error('[ZERNIO/WEBHOOK]', error)
    return NextResponse.json({error: 'No se pudo procesar el evento'}, {status: 500})
  }
}
