import type { CalendarCode, DiaSemana, FormatoCarrusel, Salida } from '@/types'
import { getCalendarDefinition, type CalendarSlotDef } from './calendar-catalog.ts'

/**
 * Resolver de composición → slots concretos para un batch semanal.
 *
 * Reglas de asignación salida→slot (v1, deliberadamente simple):
 * - Slots genéricos (Orgánico, Itinerario, Lugar, Editorial, Calendario,
 *   Conversación): se les asigna la salida futura más próxima entre las
 *   cargadas del cliente. Si hay una sola salida, todos los slots
 *   genéricos la comparten — la variedad la da el ángulo/formato, no la
 *   salida.
 * - Slot de Ascenso: requiere una salida marcada como pasada
 *   (`fecha_inicio < hoy` y `estado === 'completada'`). Si no hay
 *   ninguna, el slot cae al formato de `fallbackFormatoSinSalidaPasada`
 *   definido en el catálogo (hoy: Lugar) y sigue la regla genérica de
 *   asignación de salida.
 * - Sin heurística "inteligente" todavía — esto se refina con datos
 *   reales de los primeros clientes.
 */

export type SalidaAssignmentReason =
  | 'proxima_futura'
  | 'pasada_mas_reciente'
  | 'fallback_sin_salida_pasada'
  | 'sin_salida_disponible'

export interface ResolvedSlot {
  index: number
  label: string
  dia: DiaSemana | null
  formatoCarrusel: FormatoCarrusel
  salidaId: string | null
  salidaAssignment: SalidaAssignmentReason
}

export interface ResolveWeeklyBatchParams {
  calendarCode: CalendarCode
  /** Todas las salidas cargadas del cliente (pasadas y futuras). */
  salidas: Salida[]
  /** Fecha ISO (YYYY-MM-DD) usada como "hoy" para separar pasado/futuro. Default: hoy real. */
  today?: string
  /** Fuerza el número de semana ISO (para tests). Default: semana ISO de `today`. */
  weekIndex?: number
}

export function resolveWeeklyBatch(params: ResolveWeeklyBatchParams): ResolvedSlot[] {
  const { calendarCode, salidas } = params
  const todayIso = params.today ?? new Date().toISOString().slice(0, 10)
  const weekIndex = params.weekIndex ?? getIsoWeekNumber(todayIso)
  const def = getCalendarDefinition(calendarCode)

  const futuras = salidas
    .filter(s => s.fecha_inicio >= todayIso)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
  const pasadas = salidas
    .filter(s => s.fecha_inicio < todayIso && s.estado === 'completada')
    .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))

  const proximaFutura = futuras[0] ?? null
  const pasadaMasReciente = pasadas[0] ?? null

  const usageCounts = new Map<FormatoCarrusel, number>()
  const pickMenosUsado = (opciones: FormatoCarrusel[]): FormatoCarrusel => {
    let chosen = opciones[0]
    let lowest = usageCounts.get(chosen) ?? 0
    for (const opcion of opciones.slice(1)) {
      const count = usageCounts.get(opcion) ?? 0
      if (count < lowest) {
        chosen = opcion
        lowest = count
      }
    }
    usageCounts.set(chosen, (usageCounts.get(chosen) ?? 0) + 1)
    return chosen
  }

  const resolveFormato = (slot: CalendarSlotDef): FormatoCarrusel => {
    if (slot.rotacionSemanal && slot.rotacionSemanal.length > 0) {
      return slot.rotacionSemanal[weekIndex % slot.rotacionSemanal.length]
    }
    if (slot.condicion === 'tiene_salida_futura' && !proximaFutura) {
      return slot.formatoSiNoCumpleCondicion ?? pickMenosUsado(slot.formatosCarrusel)
    }
    return pickMenosUsado(slot.formatosCarrusel)
  }

  return def.slots.map((slot, index) => {
    const formatoPreferido = resolveFormato(slot)

    if (slot.requiereSalidaPasada) {
      if (pasadaMasReciente) {
        return buildSlot(index, slot, formatoPreferido, pasadaMasReciente.id, 'pasada_mas_reciente')
      }
      const formatoFallback = slot.fallbackFormatoSinSalidaPasada ?? formatoPreferido
      if (formatoFallback !== formatoPreferido) {
        // El fallback no pasó por pickMenosUsado — registrarlo igual para
        // que los slots siguientes no lo vuelvan a elegir por empate
        // (ej. CAL-02 sin pasada: Ascenso cae a Lugar, y el slot
        // "Lugar/Itinerario" debe preferir Itinerario, no repetir Lugar).
        usageCounts.set(formatoFallback, (usageCounts.get(formatoFallback) ?? 0) + 1)
      }
      return buildSlot(
        index,
        slot,
        formatoFallback,
        proximaFutura?.id ?? null,
        proximaFutura ? 'fallback_sin_salida_pasada' : 'sin_salida_disponible',
      )
    }

    return buildSlot(
      index,
      slot,
      formatoPreferido,
      proximaFutura?.id ?? null,
      proximaFutura ? 'proxima_futura' : 'sin_salida_disponible',
    )
  })
}

function buildSlot(
  index: number,
  slot: CalendarSlotDef,
  formatoCarrusel: FormatoCarrusel,
  salidaId: string | null,
  salidaAssignment: SalidaAssignmentReason,
): ResolvedSlot {
  return { index, label: slot.label, dia: slot.dia ?? null, formatoCarrusel, salidaId, salidaAssignment }
}

/** Número de semana ISO-8601 (lunes a domingo, semana 1 = la que contiene el primer jueves del año). */
export function getIsoWeekNumber(dateIso: string): number {
  const date = new Date(`${dateIso}T00:00:00Z`)
  const dayNum = (date.getUTCDay() + 6) % 7 // lunes=0 ... domingo=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3) // jueves de esa semana
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDay + 3)
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000))
}
