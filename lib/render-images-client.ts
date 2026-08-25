'use client'

const urlsByFolder = new Map<string, string[]>()
const inflightByFolder = new Map<string, Promise<string[]>>()

export function renderUrlsFromFileIds(fileIds: string[]): string[] {
  return fileIds.map(fileId => `/api/fotos/thumbnail/${fileId}?strict=1`)
}

export function primeRenderImageUrls(folderId: string, fileIds: string[]): string[] {
  const urls = renderUrlsFromFileIds(fileIds)
  if (urls.length > 0) urlsByFolder.set(folderId, urls)
  return urls
}

export async function getRenderImageUrls(folderId: string, {force = false}: {force?: boolean} = {}): Promise<string[]> {
  if (!force) {
    const cached = urlsByFolder.get(folderId)
    if (cached) return cached
    const inflight = inflightByFolder.get(folderId)
    if (inflight) return inflight
  } else {
    urlsByFolder.delete(folderId)
  }

  const request = fetch(`/api/renders/${encodeURIComponent(folderId)}/slides`, {
    cache: force ? 'no-store' : 'default',
  })
    .then(async response => {
      if (!response.ok) throw new Error(`No se pudieron cargar los renders (${response.status})`)
      const data = await response.json() as {slides?: {fileId: string}[]}
      const urls = renderUrlsFromFileIds((data.slides ?? []).map(slide => slide.fileId))
      if (urls.length === 0) throw new Error('La carpeta de render todavía no tiene imágenes')
      urlsByFolder.set(folderId, urls)
      return urls
    })
    .finally(() => {
      if (inflightByFolder.get(folderId) === request) inflightByFolder.delete(folderId)
    })

  inflightByFolder.set(folderId, request)
  return request
}
