import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import MesaClient from './MesaClient'
import type { DBRegion, DBTemplate, DBToken, DBElement } from '@/types/fabrica'

export default async function MesaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const [{ data: templates }, { data: regions }, { data: tokens }, { data: elements }] = await Promise.all([
    admin.from('templates').select('id, name, archetype, region_id, composition').order('name'),
    admin.from('regions').select('id, slug, name, mood').order('name'),
    admin.from('tokens').select('id, region_id, category, role, value').order('category'),
    admin.from('elements')
      .select('id, kind, type, species_name, region_id, component_key, asset_url, color_mode, props_schema, preview_url')
      .order('species_name'),
  ])

  return (
    <MesaClient
      templates={(templates ?? []) as DBTemplate[]}
      regions={(regions ?? []) as DBRegion[]}
      tokens={(tokens ?? []) as DBToken[]}
      elements={(elements ?? []) as DBElement[]}
    />
  )
}
