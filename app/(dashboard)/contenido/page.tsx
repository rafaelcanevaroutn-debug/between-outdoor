export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ContenidoHub from '@/components/contenido/ContenidoHub'
import type { ContenidoGenerado } from '@/types'

export default async function ContenidoPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevos?: string }>
}) {
  const { nuevos } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: contenidoRows }, { data: salidaRows }] = await Promise.all([
    supabase
      .from('contenido_generado')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('salidas')
      .select('id, nombre, sheets_exported_at')
      .eq('user_id', user.id)
      .order('fecha_inicio', { ascending: false }),
  ])

  return (
    <ContenidoHub
      contenido={(contenidoRows ?? []) as ContenidoGenerado[]}
      salidas={salidaRows ?? []}
      initialIds={nuevos?.split(',').filter(Boolean) ?? null}
    />
  )
}
