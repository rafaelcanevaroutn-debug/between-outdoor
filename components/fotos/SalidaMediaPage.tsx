import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {createAdminClient} from '@/lib/supabase/admin'
import {ensureClientDriveFolders, getOrCreateFolder, listSubfoldersPublic} from '@/lib/google-drive'
import SalidaMediaWorkspace from '@/components/fotos/SalidaMediaWorkspace'
import {
  extractSalidaMaterialTopics,
  preferredSalidaMediaFolderName,
  type SalidaMediaOption,
} from '@/lib/salida-media-workspace'

interface Props {
  type: 'fotos' | 'videos'
  requestedSalidaId?: string
}

function normalizeName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/gu, '').trim().toLowerCase()
}

export default async function SalidaMediaPage({type, requestedSalidaId}: Props) {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const {data: rawSalidas} = await supabase
    .from('salidas')
    .select('id,nombre,destino,fecha_inicio,estado,carpeta_fotos_id,carpeta_fotos_nombre,carpeta_videos_id,carpeta_videos_nombre,itinerario_dias,puntos_interes')
    .eq('user_id', user.id)
    .not('estado', 'eq', 'cancelada')
    .order('created_at', {ascending: false})

  const salidas = (rawSalidas ?? []) as SalidaMediaOption[]
  const selected = salidas.find(salida => salida.id === requestedSalidaId) ?? salidas[0] ?? null
  const clientFolders = await ensureClientDriveFolders(user.id)
  const libraryRootId = type === 'videos' ? clientFolders.videos_folder_id : clientFolders.fotos_folder_id

  let salidaFolderId: string | null = null
  if (selected && libraryRootId) {
    const idField = type === 'videos' ? 'carpeta_videos_id' : 'carpeta_fotos_id'
    const nameField = type === 'videos' ? 'carpeta_videos_nombre' : 'carpeta_fotos_nombre'
    const configuredId = selected[idField]
    const configuredName = selected[nameField]
    const desiredName = preferredSalidaMediaFolderName(selected, configuredName)

    // Una selección histórica podía apuntar a una escena concreta. El espacio
    // de la salida siempre debe abrir en su destino raíz para mostrar General +
    // todas las experiencias, no quedar encerrado en una sola subcarpeta.
    const topLevelFolders = await listSubfoldersPublic(libraryRootId)
    const desiredFolder = topLevelFolders.find(folder => normalizeName(folder.name) === normalizeName(desiredName))
    salidaFolderId = desiredFolder?.id
      ?? (configuredId && configuredId !== libraryRootId && !configuredName?.includes('/') ? configuredId : null)
      ?? await getOrCreateFolder(libraryRootId, desiredName)

    if (configuredId !== salidaFolderId || configuredName !== desiredName) {
      const admin = createAdminClient()
      await admin
        .from('salidas')
        .update({[idField]: salidaFolderId, [nameField]: desiredName, updated_at: new Date().toISOString()})
        .eq('id', selected.id)
        .eq('user_id', user.id)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <SalidaMediaWorkspace
        type={type}
        salidas={salidas.map(salida => ({
          id: salida.id,
          nombre: salida.nombre,
          destino: salida.destino,
          fechaInicio: salida.fecha_inicio,
          estado: salida.estado,
        }))}
        selectedSalidaId={selected?.id ?? null}
        selectedSalidaName={selected?.nombre ?? null}
        selectedDestino={selected ? selected.destino || selected.nombre : null}
        rootFolderId={salidaFolderId}
        suggestedTopics={selected ? extractSalidaMaterialTopics(selected) : []}
      />
    </div>
  )
}
