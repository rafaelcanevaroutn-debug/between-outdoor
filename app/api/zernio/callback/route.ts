import {NextRequest, NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {syncZernioAccountsForProfile, type StoredZernioProfile} from '@/lib/zernio-server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', request.url))
  const localProfileId = request.nextUrl.searchParams.get('localProfileId')?.trim() ?? ''
  const admin = createAdminClient()
  let outcome = 'error'
  if (localProfileId) {
    const {data: profile} = await admin.from('zernio_profiles')
      .select('id,user_id,external_profile_id,label,timezone,is_primary,status,last_synced_at,last_error')
      .eq('id', localProfileId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (profile) {
      try {
        await syncZernioAccountsForProfile({admin, profile: profile as StoredZernioProfile})
        outcome = 'connected'
      } catch (error) {
        console.error('[ZERNIO/CALLBACK]', error)
      }
    }
  }
  const redirect = new URL('/cuenta', request.url)
  redirect.searchParams.set('redes', outcome)
  return NextResponse.redirect(redirect)
}
