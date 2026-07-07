import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_UUID = '75a22462-2acf-4c27-b161-c54ea5b80269'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_UUID) return null
  return user
}

// PATCH: update fields (optionally re-upload SVG)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const svgFile     = formData.get('svgFile') as File | null
    const speciesName = formData.get('species_name') as string | null
    const componentKey= formData.get('component_key') as string | null
    const regionId    = formData.get('region_id') as string | null
    const colorMode   = formData.get('color_mode') as 'tint' | 'fixed' | null
    const colorMapRaw = formData.get('color_map') as string | null
    const tagsRaw     = formData.get('tags') as string | null
    const description = formData.get('description') as string | null

    const updates: Record<string, unknown> = {}
    if (speciesName)  updates.species_name  = speciesName
    if (componentKey) updates.component_key = componentKey
    if (regionId)     updates.region_id     = regionId
    if (colorMode)    updates.color_mode    = colorMode
    if (colorMapRaw)  updates.color_map     = JSON.parse(colorMapRaw)
    if (tagsRaw)      updates.tags          = JSON.parse(tagsRaw)
    if (description !== null) updates.description = description

    if (svgFile) {
      const slug = (componentKey ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '-') || id
      const fileName = `${slug}.svg`
      const buffer = Buffer.from(await svgFile.arrayBuffer())
      await admin.storage.from('ornamentals').upload(fileName, buffer, { contentType: 'image/svg+xml', upsert: true })
      const { data: urlData } = admin.storage.from('ornamentals').getPublicUrl(fileName)
      updates.asset_url   = urlData.publicUrl
      updates.preview_url = urlData.publicUrl
    }

    const { data: element, error } = await admin.from('elements').update(updates).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ element })
  }

  // JSON body
  const body = await req.json() as Record<string, unknown>
  const { data: element, error } = await admin.from('elements').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ element })
}

// DELETE: soft-archive
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { error } = await admin
    .from('elements')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
