import type {DiaItinerario, PuntoInteres} from '@/types'

export interface SalidaMediaOption {
  id: string
  nombre: string
  destino: string
  fecha_inicio: string | null
  estado: string
  carpeta_fotos_id: string | null
  carpeta_fotos_nombre: string | null
  carpeta_videos_id: string | null
  carpeta_videos_nombre: string | null
  itinerario_dias: DiaItinerario[] | null
  puntos_interes: PuntoInteres[] | null
}

function cleanTopic(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().replace(/\s+/gu, ' ')
  return clean.length >= 2 && clean.length <= 80 ? clean : null
}

export function extractSalidaMaterialTopics(
  salida: Pick<SalidaMediaOption, 'itinerario_dias' | 'puntos_interes'>,
): string[] {
  const topics = [
    ...(salida.puntos_interes ?? []).map(point => cleanTopic(point?.nombre)),
    ...(salida.itinerario_dias ?? []).flatMap(day => [
      cleanTopic(day?.hito),
      cleanTopic(day?.titulo),
    ]),
  ].filter((topic): topic is string => Boolean(topic))

  const seen = new Set<string>()
  return topics.filter(topic => {
    const key = topic.toLocaleLowerCase('es')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 12)
}

export function preferredSalidaMediaFolderName(
  salida: Pick<SalidaMediaOption, 'nombre' | 'destino'>,
  configuredPath?: string | null,
): string {
  const configuredRoot = cleanTopic(configuredPath?.split('/')[0])
  return configuredRoot || cleanTopic(salida.destino) || cleanTopic(salida.nombre) || 'Material de la salida'
}
