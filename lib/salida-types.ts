import type { TipoViaje } from '@/types'

export interface SalidaTypeDefinition {
  value: TipoViaje
  label: string
  shortLabel: string
  description: string
}

export const SALIDA_TYPES: readonly SalidaTypeDefinition[] = [
  {
    value: 'salida_recurrente',
    label: 'Grupo o academia outdoor',
    shortLabel: 'Grupo / academia',
    description: 'Trekking, running, ciclismo u otra actividad que funciona de forma recurrente en uno o varios lugares.',
  },
  {
    value: 'salida_un_dia',
    label: 'Salida regional de un día',
    shortLabel: 'Regional · un día',
    description: 'Una salida puntual, con fecha definida, dentro de la provincia o la región.',
  },
  {
    value: 'escapada_fin_semana',
    label: 'Viaje regional de varios días',
    shortLabel: 'Viaje regional',
    description: 'Una escapada o travesía con fecha de inicio y fin.',
  },
  {
    value: 'expedicion_premium',
    label: 'Aventura larga o expedición',
    shortLabel: 'Expedición',
    description: 'Una experiencia de montaña más larga, técnica o exigente.',
  },
  {
    value: 'viaje_playa_caribe',
    label: 'Playa y Caribe',
    shortLabel: 'Playa y Caribe',
    description: 'Viajes internacionales de playa, descanso y experiencias en el Caribe.',
  },
] as const

export const SALIDA_TYPE_LABELS = Object.fromEntries(
  SALIDA_TYPES.map(type => [type.value, type.shortLabel]),
) as Record<TipoViaje, string>

export function getSalidaTypeLabel(value: string | null | undefined): string {
  if (!value) return 'Salida'
  return SALIDA_TYPE_LABELS[value as TipoViaje] ?? value.replace(/_/g, ' ')
}
