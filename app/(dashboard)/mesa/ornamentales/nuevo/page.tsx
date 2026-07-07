import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DBRegion, DBToken } from '@/types/fabrica'
import NuevoOrnamentalClient from './NuevoOrnamentalClient'

export default async function NuevoOrnamentalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const [{ data: regions }, { data: tokens }] = await Promise.all([
    admin.from('regions').select('id, slug, name, mood').order('name'),
    admin.from('tokens').select('id, region_id, category, role, value').order('role'),
  ])

  return (
    <NuevoOrnamentalClient
      regions={(regions ?? []) as DBRegion[]}
      tokens={(tokens ?? []) as DBToken[]}
    />
  )
}
