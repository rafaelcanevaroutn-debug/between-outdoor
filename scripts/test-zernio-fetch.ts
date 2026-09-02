import { createClient } from '@supabase/supabase-js'
import { loadEnvFile } from 'node:process'
import { zernioConfigFromEnv, listZernioPosts } from '../lib/zernio'

loadEnvFile('.env.local')

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: zernioProfile } = await supabase
    .from('zernio_profiles')
    .select('external_profile_id, user_id')
    .not('external_profile_id', 'is', null)
    .limit(1)
    .single()

  if (!zernioProfile) {
    console.log('No zernio profile found')
    return
  }

  console.log('Found profile:', zernioProfile.external_profile_id)

  const config = zernioConfigFromEnv(process.env)
  
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - 14)
  const endOfWeek = new Date()
  
  try {
    const postsResponse = await listZernioPosts({
      config,
      profileId: zernioProfile.external_profile_id,
      startDate: startOfWeek.toISOString().slice(0, 10),
      endDate: endOfWeek.toISOString().slice(0, 10)
    })
    
    console.log('Posts:', JSON.stringify(postsResponse, null, 2))
  } catch (error) {
    console.error('Error fetching:', error)
  }
}

main()
