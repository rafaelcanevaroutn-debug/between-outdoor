import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {getZernioAccountAnalytics, zernioConfigFromEnv} from '@/lib/zernio'

export const dynamic = 'force-dynamic'

function dateOnly(value: string | null): string {
  return value?.trim() ?? ''
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error: 'No autorizado'}, {status: 401})

  const accountId = request.nextUrl.searchParams.get('accountId')?.trim() ?? ''
  const startDate = dateOnly(request.nextUrl.searchParams.get('startDate'))
  const endDate = dateOnly(request.nextUrl.searchParams.get('endDate'))
  if (!accountId || !/^\d{4}-\d{2}-\d{2}$/u.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/u.test(endDate)) {
    return NextResponse.json({error: 'Cuenta y rango de fechas válidos son obligatorios'}, {status: 400})
  }
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  if (end < start || end.getTime() - start.getTime() > 366 * 24 * 60 * 60_000) {
    return NextResponse.json({error: 'El rango de fechas no es válido'}, {status: 400})
  }

  const {data: account, error} = await createAdminClient().from('zernio_accounts')
    .select('external_account_id,platform,username,display_name,status')
    .eq('user_id', user.id)
    .eq('external_account_id', accountId)
    .eq('status', 'connected')
    .maybeSingle()
  if (error) return NextResponse.json({error: 'No se pudo verificar la cuenta'}, {status: 500})
  if (!account) return NextResponse.json({error: 'Cuenta social no encontrada'}, {status: 404})

  try {
    const analytics = await getZernioAccountAnalytics({
      config: zernioConfigFromEnv(),
      accountId: account.external_account_id,
      startDate,
      endDate,
    })
    return NextResponse.json({account, startDate, endDate, analytics})
  } catch (analyticsError) {
    console.error('[ZERNIO/ANALYTICS]', analyticsError)
    return NextResponse.json({error: 'No se pudieron cargar las estadísticas'}, {status: 502})
  }
}
