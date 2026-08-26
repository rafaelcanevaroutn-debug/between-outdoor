import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createZernioWebhook, zernioConfigFromEnv} from '@/lib/zernio'

export async function POST() {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})
  const {data: profile} = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({error: 'Acceso denegado'}, {status: 403})
  const secret = process.env.ZERNIO_WEBHOOK_SECRET?.trim() ?? ''
  const publicUrl = process.env.BETWEEN_PUBLIC_APP_URL?.trim() ?? ''
  if (secret.length < 32 || !publicUrl) {
    return NextResponse.json({error: 'Faltan ZERNIO_WEBHOOK_SECRET o BETWEEN_PUBLIC_APP_URL'}, {status: 409})
  }
  try {
    const webhookUrl = new URL('/api/webhooks/zernio', publicUrl).toString()
    const webhook = await createZernioWebhook({
      config: zernioConfigFromEnv(),
      name: 'Between publishing',
      url: webhookUrl,
      secret,
      events: [
        'account.connected',
        'account.disconnected',
        'post.scheduled',
        'post.published',
        'post.partial',
        'post.failed',
        'post.cancelled',
      ],
    })
    return NextResponse.json({configured: true, webhook})
  } catch (error) {
    console.error('[ZERNIO/SETUP]', error)
    return NextResponse.json({error: error instanceof Error ? error.message : 'No se pudo configurar el webhook'}, {status: 502})
  }
}
