import type { GrupoInfo } from '@/types'

const GROUP_FIELDS: Array<keyof GrupoInfo> = [
  'tipo_organizacion',
  'actividad',
  'propuesta',
  'dirigido_a',
  'dinamica',
  'responsables',
  'requisitos',
  'equipamiento',
]

function cleanGroupInfo(value: unknown): GrupoInfo {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  return Object.fromEntries(GROUP_FIELDS.map(field => {
    const raw = input[field]
    return [field, typeof raw === 'string' && raw.trim() ? raw.trim() : null]
  })) as unknown as GrupoInfo
}

function cleanPlaces(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(item => typeof item === 'string' ? item.trim() : '').filter(Boolean))]
}

/** Impone en servidor la diferencia entre un viaje y una unidad recurrente. */
export function normalizeSalidaPayload(value: unknown): Record<string, unknown> {
  const body = value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
  const recurring = body.tipo_viaje === 'salida_recurrente'

  if (recurring) {
    return {
      ...body,
      fecha_inicio: null,
      fecha_fin: null,
      itinerario: null,
      itinerario_dias: [],
      lugares_recurrentes: cleanPlaces(body.lugares_recurrentes),
      grupo_info: cleanGroupInfo(body.grupo_info),
    }
  }

  return {
    ...body,
    dias_semana: [],
    hora_encuentro: null,
    punto_encuentro: null,
    frecuencia: null,
    lugares_recurrentes: [],
    grupo_info: null,
  }
}
