import { getDriveClient } from '@/lib/drive-oauth'
import { PREDEFINED_SLOTS } from '@/lib/verticals'

// ID de la carpeta raíz en Drive donde se crean las salidas.
// Configurar con el ID de la carpeta "Between Outdoor" del Drive del usuario.
// Si está vacío, se crea en la raíz del Drive.
const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID || ''

export interface SalidaFolderResult {
  rootFolderId: string
  rootFolderUrl: string
  subfolders: Array<{
    slotKey: string
    label: string
    folderId: string
    folderUrl: string
  }>
}

export async function createSalidaFolderStructure(
  salidaNombre: string,
  destino: string,
  fechaInicio: string | null,
): Promise<SalidaFolderResult> {
  const drive = getDriveClient()

  // Nombre de la carpeta raíz: "Nombre Salida — Destino (Mes Año)"
  const fecha = fechaInicio ? new Date(fechaInicio) : null
  const hasValidDate = fecha && !Number.isNaN(fecha.getTime())
  const suffix = hasValidDate
    ? fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    : 'grupo recurrente'
  const rootName = `${salidaNombre} — ${destino} (${suffix})`

  // Crear carpeta raíz
  const rootMetadata: Record<string, unknown> = {
    name: rootName,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (ROOT_FOLDER_ID) rootMetadata.parents = [ROOT_FOLDER_ID]

  const rootRes = await drive.files.create({
    requestBody: rootMetadata,
    fields: 'id, name, webViewLink',
  })

  const rootFolderId = rootRes.data.id!
  const rootFolderUrl = rootRes.data.webViewLink!
  console.log(`[DRIVE] Carpeta raíz creada: "${rootName}" → ${rootFolderId}`)

  // Crear subcarpetas para cada slot de material
  const subfolders: SalidaFolderResult['subfolders'] = []

  for (const slot of PREDEFINED_SLOTS) {
    const subRes = await drive.files.create({
      requestBody: {
        name: slot.label,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootFolderId],
      },
      fields: 'id, name, webViewLink',
    })

    subfolders.push({
      slotKey: slot.key,
      label: slot.label,
      folderId: subRes.data.id!,
      folderUrl: subRes.data.webViewLink!,
    })
    console.log(`[DRIVE]   ↳ "${slot.label}" → ${subRes.data.id}`)
  }

  return { rootFolderId, rootFolderUrl, subfolders }
}
