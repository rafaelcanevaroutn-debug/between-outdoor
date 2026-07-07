import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DBElement, DBRegion, DBToken } from '@/types/fabrica'
import NuevoOrnamentalClient from '../../nuevo/NuevoOrnamentalClient'

export default async function EditarOrnamentalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const [{ data: element }, { data: regions }, { data: tokens }] = await Promise.all([
    admin.from('elements')
      .select('id, kind, type, species_name, region_id, component_key, asset_url, color_mode, color_map, props_schema, preview_url, tags, description, archived_at')
      .eq('id', id)
      .single(),
    admin.from('regions').select('id, slug, name, mood').order('name'),
    admin.from('tokens').select('id, region_id, category, role, value').order('role'),
  ])

  if (!element) notFound()

  return (
    <NuevoOrnamentalClient
      regions={(regions ?? []) as DBRegion[]}
      tokens={(tokens ?? []) as DBToken[]}
      initialElement={element as DBElement}
    />
  )
}
