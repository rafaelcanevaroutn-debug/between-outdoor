import type { Salida } from '@/types'

// lugar y fecha verificados de una salida — compartido entre los moldes de
// banner que los necesitan (Molde 1 y Molde 2), para no duplicar la misma
// lógica de resolución dos veces. Mismo criterio de identidad que ya usa
// Familia 4 (preferir destino, caer a nombre).

export function resolveVerifiedLugar(salida: Salida): string | null {
  const destino = salida.destino.trim()
  if (destino) return destino
  const nombre = salida.nombre.trim()
  return nombre || null
}

export function formatVerifiedFecha(fechaInicio: string): string | null {
  const date = new Date(`${fechaInicio.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

// Fecha relativa (mañana/este sábado/etc.) vs. publicationDate — mismo
// patrón de Familia 4 (video-family-4-contract.ts), duplicado acá porque
// ese archivo no exporta su regex y no se toca. formatVerifiedFecha nunca
// produce una frase relativa, así que hoy esto es una guarda defensiva sin
// rama alcanzable — no se le agregó lógica que no se puede ejercitar
// todavía.
export const RELATIVE_DATE_PATTERN = /\b(?:mañana|este sábado|este finde|semana santa)\b/iu
