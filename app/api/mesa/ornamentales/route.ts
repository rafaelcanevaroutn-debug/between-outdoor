import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_UUID = '75a22462-2acf-4c27-b161-c54ea5b80269'

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_UUID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()

  const svgFile     = formData.get('svgFile') as File | null
  const speciesName = (formData.get('species_name') as string | null) ?? ''
  const componentKey= (formData.get('component_key') as string | null) ?? ''
  const regionId    = formData.get('region_id') as string | null
  const colorMode   = (formData.get('color_mode') as 'tint' | 'fixed') ?? 'tint'
  const colorMapRaw = formData.get('color_map') as string | null
  const tagsRaw     = formData.get('tags') as string | null
  const description = formData.get('description') as string | null

  if (!componentKey || !speciesName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const colorMap = colorMapRaw ? JSON.parse(colorMapRaw) : {}
  const tags = tagsRaw ? JSON.parse(tagsRaw) : []

  const admin = createAdminClient()
  const slug = componentKey.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  let assetUrl = (formData.get('asset_url') as string | null) ?? ''

  if (svgFile) {
    // Upload new SVG to storage
    const fileName = `${slug}.svg`
    const buffer = Buffer.from(await svgFile.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from('ornamentals')
      .upload(fileName, buffer, { contentType: 'image/svg+xml', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = admin.storage.from('ornamentals').getPublicUrl(fileName)
    assetUrl = urlData.publicUrl
  }

  if (!assetUrl) {
    return NextResponse.json({ error: 'No SVG file or asset_url provided' }, { status: 400 })
  }

  // Insert into elements
  const { data: element, error: dbError } = await admin
    .from('elements')
    .insert({
      kind: 'ornamental',
      type: 'svg',
      species_name: speciesName,
      region_id: regionId || null,
      component_key: slug,
      asset_url: assetUrl,
      preview_url: assetUrl,
      color_mode: colorMode,
      color_map: colorMap,
      tags,
      description: description || null,
      props_schema: { defaultW: 200, defaultH: 400 },
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ element }, { status: 201 })
}
