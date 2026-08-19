import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {}
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const admin = createAdminClient()
  const { data: row } = await admin.from('contenido_generado')
    .select('id,user_id,formato,render_status,generation_metadata').eq('id', id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Banner no encontrado' }, { status: 404 })
  if (callerProfile?.role !== 'admin' && row.user_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (row.formato !== 'banner' || row.render_status !== 'rendered') {
    return NextResponse.json({ error: 'El banner todavía no está renderizado' }, { status: 409 })
  }
  const metadata = objectValue(row.generation_metadata)
  const downloadPath = typeof metadata.banner_render_download_path === 'string'
    ? metadata.banner_render_download_path : ''
  if (!/^\/api\/banner\/drive\/[a-z0-9_-]+\/[a-z0-9_-]+\/[a-z0-9_-]+$/iu.test(downloadPath)) {
    return NextResponse.json({ error: 'El banner no tiene una descarga privada válida' }, { status: 409 })
  }
  const configuredBannerUrl = process.env.MATI_SKILL_BANNERS_URL?.trim()
  const configuredBase = (process.env.MATI_SKILL_URL ?? '').replace(/\/api\/[^/]+\/?$/u, '')
  const matiBase = configuredBannerUrl?.replace(/\/api\/generar-banner\/?$/u, '') ?? configuredBase
  if (!matiBase) return NextResponse.json({ error: 'Renderer de banners no configurado' }, { status: 503 })
  const token = process.env.MATI_SKILL_TOKEN?.trim()
  const response = await fetch(`${matiBase}${downloadPath}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok || !response.body) return NextResponse.json({ error: 'No se pudo descargar el PNG' }, { status: 502 })
  return new NextResponse(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="banner-${row.id}.png"`,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
