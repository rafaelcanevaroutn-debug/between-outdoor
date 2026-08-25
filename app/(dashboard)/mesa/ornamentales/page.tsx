import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import type { DBElement, DBRegion, DBToken } from '@/types/fabrica'
import OrnamentalesClient from './OrnamentalesClient'

export default async function OrnamentalesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const [{ data: elements }, { data: regions }, { data: tokens }] = await Promise.all([
    admin.from('elements')
      .select('id, kind, type, species_name, region_id, component_key, asset_url, color_mode, color_map, props_schema, preview_url, tags, description, archived_at')
      .eq('kind', 'ornamental')
      .is('archived_at', null)
      .order('species_name'),
    admin.from('regions').select('id, slug, name, mood').order('name'),
    admin.from('tokens').select('id, region_id, category, role, value').order('role'),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: 'var(--tinta)', fontSize: 18, fontWeight: 700, margin: 0 }}>Herbario</h1>
          <p style={{ color: 'var(--piedra)', fontSize: 13, margin: '2px 0 0' }}>
            CatÃ¡logo visual de ornamentales Â· {(elements ?? []).length} especies
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href="/mesa"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--linea)',
              borderRadius: 8,
              padding: '8px 16px',
              color: 'var(--piedra)',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            â† Mesa
          </Link>
          <Link
            href="/mesa/ornamentales/nuevo"
            style={{
              backgroundColor: 'var(--cardon)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              color: 'var(--nieve)',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            + Nueva especie
          </Link>
        </div>
      </div>

      <OrnamentalesClient
        elements={(elements ?? []) as DBElement[]}
        regions={(regions ?? []) as DBRegion[]}
        tokens={(tokens ?? []) as DBToken[]}
      />
    </div>
  )
}

