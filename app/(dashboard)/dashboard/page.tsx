import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardGenerateAction from '@/components/dashboard/DashboardGenerateAction'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: salidas } = await supabase
    .from('salidas')
    .select('id, estado, fecha_inicio, carpeta_fotos_id')
    .eq('user_id', user.id)

  const today = new Date().toISOString().slice(0, 10)
  const activeSalidas = (salidas ?? []).filter(salida => salida.estado !== 'completada' && salida.fecha_inicio >= today)
  const hasSalidas = activeSalidas.length > 0
  const hasMissingPhotos = activeSalidas.some(salida => !salida.carpeta_fotos_id)

  return (
    <div className="flex min-h-[calc(100vh-150px)] items-center justify-center py-10">
      <DashboardGenerateAction hasSalidas={hasSalidas} hasMissingPhotos={hasMissingPhotos} />
    </div>
  )
}
