import { createAdminClient } from '../lib/supabase/admin.ts'

async function main() {
  const admin = createAdminClient()
  const salidaId = 'f6acc161-94f2-4850-b464-551f8603275a'

  const { data: salida } = await admin
    .from('salidas')
    .select('*')
    .eq('id', salidaId)
    .single()

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', salida.user_id)
    .single()

  const { data: onboarding } = await admin
    .from('client_onboarding')
    .select('*')
    .eq('user_id', salida.user_id)
    .maybeSingle()

  console.log('Salida completa:', JSON.stringify(salida, null, 2))
  console.log('Profile:', JSON.stringify(profile, null, 2))
  console.log('Onboarding:', JSON.stringify(onboarding, null, 2))
}

main().catch(console.error)
