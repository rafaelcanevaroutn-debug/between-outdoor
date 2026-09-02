import type { ContenidoGenerado, FormatoContenido, VideoKnowledgeFormat } from '@/types'

export const CALENDAR_TIMEZONE = 'America/Argentina/Buenos_Aires'
export const MIN_SLOT_SEPARATION_MINUTES = 18

/**
 * Franjas horarias de alto engagement recomendadas para Instagram y TikTok en Argentina (UTC-3).
 */
export const RECOMMENDED_PUBLISH_SLOTS = {
  weekdayLunch: ['12:15', '12:45', '13:15'],
  weekdayEvening: ['18:30', '19:15', '19:45', '20:15', '20:45'],
  weekendAfternoon: ['16:45', '17:45', '18:45', '19:30', '20:15'],
}

/**
 * Horarios canónicos asignados a cada uno de los 10 slots semanales estándar.
 * - Día 0 (Hoy): Video 1 -> 19:15 (Tarde / Prime)
 * - Día 1: Carrusel 1 -> 12:30 (Mediodía) | Banner 2 (Slot 7) -> 18:45 (Tarde) [Diferencia: 6h 15m]
 * - Día 2: Video 2 -> 18:30 (Tarde)
 * - Día 3: Banner 1 -> 12:45 (Mediodía) | Video 5 (Slot 8) -> 19:15 (Tarde) [Diferencia: 6h 30m]
 * - Día 4: Video 3 -> 19:45 (Tarde)
 * - Día 5: Carrusel 2 -> 13:15 (Mediodía) | Carrusel 3 (Slot 9) -> 18:30 (Tarde) [Diferencia: 5h 15m]
 * - Día 6: Video 4 -> 18:15 (Tarde)
 */
export const DEFAULT_SLOT_CONFIGS: Record<number, { dayOffset: number; defaultTime: string; format: FormatoContenido }> = {
  0: { dayOffset: 0, defaultTime: '19:15', format: 'video' },
  1: { dayOffset: 1, defaultTime: '12:30', format: 'carrusel' },
  2: { dayOffset: 2, defaultTime: '18:30', format: 'video' },
  3: { dayOffset: 3, defaultTime: '12:45', format: 'banner' },
  4: { dayOffset: 4, defaultTime: '19:45', format: 'video' },
  5: { dayOffset: 5, defaultTime: '13:15', format: 'carrusel' },
  6: { dayOffset: 6, defaultTime: '18:15', format: 'video' },
  7: { dayOffset: 1, defaultTime: '18:45', format: 'banner' },
  8: { dayOffset: 3, defaultTime: '19:15', format: 'video' },
  9: { dayOffset: 5, defaultTime: '18:30', format: 'carrusel' },
}

/**
 * Extrae fecha (YYYY-MM-DD) y hora (HH:mm) en 24 horas según la zona de Argentina.
 */
export function localParts24h(iso: string | null | undefined): { date: string; time: string } {
  const value = iso ? new Date(iso) : new Date()
  const date = Number.isNaN(value.getTime()) ? new Date() : value
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CALENDAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

/**
 * Convierte fecha local argentina (YYYY-MM-DD) y hora 24h (HH:mm) a ISO string (UTC).
 */
export function dateTimeIsoArgentina(dateIso: string, time24h: string): string {
  const trimmed = time24h.trim()
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (!match) throw new Error(`Formato de hora inválido: ${time24h}`)
  const hour = match[1].padStart(2, '0')
  const minute = match[2]
  return new Date(`${dateIso}T${hour}:${minute}:00-03:00`).toISOString()
}

/**
 * Valida si un string corresponde a una hora válida en formato 24h (00:00 a 23:59).
 */
export function isValidTime24h(time: string): boolean {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())) return false
  return true
}

/**
 * Suma días a una fecha ISO en formato YYYY-MM-DD.
 */
export function addDaysToIso(baseDateIso: string, dayOffset: number): string {
  const [year, month, day] = baseDateIso.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  d.setUTCDate(d.getUTCDate() + dayOffset)
  return d.toISOString().split('T')[0]
}

/**
 * Calcula el timestamp inicial de publicación para un slot generado durante el batch semanal.
 * Garantiza:
 * 1. Horarios diferenciados por formato.
 * 2. En días con múltiples piezas, separación amplia (5+ horas).
 * 3. Si es el día de hoy y el horario por defecto ya pasó, selecciona una franja posterior o ajusta al futuro.
 */
export function getInitialSlotSchedule(params: {
  todayIso: string
  dayOffset: number
  slotIndex: number
  nowMs?: number
}): string {
  const { todayIso, dayOffset, slotIndex, nowMs = Date.now() } = params
  const targetDayIso = addDaysToIso(todayIso, dayOffset)
  const config = DEFAULT_SLOT_CONFIGS[slotIndex] ?? { defaultTime: '18:30' }
  const defaultCandidateIso = dateTimeIsoArgentina(targetDayIso, config.defaultTime)
  const candidateTimeMs = new Date(defaultCandidateIso).getTime()

  // Si no es el día de hoy, el horario canónico es seguro hacia el futuro
  if (dayOffset > 0 && candidateTimeMs > nowMs + 10 * 60_000) {
    return defaultCandidateIso
  }

  // Si es hoy o cayó en el pasado (por ej. si el batch se corre tarde hoy):
  if (candidateTimeMs > nowMs + 10 * 60_000) {
    return defaultCandidateIso
  }

  // Buscar el próximo slot disponible para hoy
  const emergencySlotsToday = ['18:30', '19:15', '20:00', '20:45']
  for (const slot of emergencySlotsToday) {
    const candidate = dateTimeIsoArgentina(targetDayIso, slot)
    if (new Date(candidate).getTime() > nowMs + 10 * 60_000) {
      return candidate
    }
  }

  // Si hoy ya es de noche (> 20:30), desplazar a mañana en horario óptimo
  const nextDayIso = addDaysToIso(todayIso, Math.max(1, dayOffset + 1))
  return dateTimeIsoArgentina(nextDayIso, config.defaultTime)
}

/**
 * Estructura de actualización generada para reacomodar una pieza con horario vencido.
 */
export interface ScheduleRealignmentUpdate {
  pieceId: string
  scheduledAt: string
  dayIso: string
  time: string
}

/**
 * Algoritmo determinista para reacomodar piezas vencidas o sin horario en la ventana visible del calendario.
 * - Respeta un mínimo de 18 minutos entre piezas del mismo día.
 * - Prioriza días con menor cantidad de piezas (0 o 1).
 * - Utiliza las franjas recomendadas de Instagram/TikTok.
 * - Garantiza que nunca quede bloqueado ni devuelva null.
 */
export function realignExpiredCalendarPieces(params: {
  pieces: ContenidoGenerado[]
  days: { isoDate: string }[]
  referenceTimeMs?: number
}): ScheduleRealignmentUpdate[] {
  const { pieces, days, referenceTimeMs = Date.now() } = params
  if (days.length === 0 || pieces.length === 0) return []

  const minFutureTime = referenceTimeMs + 5 * 60_000
  const visibleDaySet = new Set(days.map(d => d.isoDate))

  // Mapear horarios ya ocupados por día para piezas que SÍ tienen fecha válida futura y visible
  const occupiedByDay = new Map<string, Array<{ id: string; timeMs: number; timeStr: string }>>()
  for (const day of days) {
    occupiedByDay.set(day.isoDate, [])
  }

  const expiredPieces: ContenidoGenerado[] = []

  for (const piece of pieces) {
    if (!piece.scheduled_at) {
      expiredPieces.push(piece)
      continue
    }
    const pieceTimeMs = new Date(piece.scheduled_at).getTime()
    const { date: pieceDate, time: pieceTime } = localParts24h(piece.scheduled_at)

    if (Number.isNaN(pieceTimeMs) || pieceTimeMs <= minFutureTime || !visibleDaySet.has(pieceDate)) {
      expiredPieces.push(piece)
    } else {
      const list = occupiedByDay.get(pieceDate) ?? []
      list.push({ id: piece.id, timeMs: pieceTimeMs, timeStr: pieceTime })
      occupiedByDay.set(pieceDate, list)
    }
  }

  if (expiredPieces.length === 0) return []

  const updates: ScheduleRealignmentUpdate[] = []

  for (const piece of expiredPieces) {
    let candidateFound: { dayIso: string; time: string; iso: string } | null = null

    // Ordenar los días por menor carga de publicaciones
    const sortedDays = [...days].sort((a, b) => {
      const countA = (occupiedByDay.get(a.isoDate) ?? []).length
      const countB = (occupiedByDay.get(b.isoDate) ?? []).length
      return countA - countB
    })

    for (const day of sortedDays) {
      const existingInDay = occupiedByDay.get(day.isoDate) ?? []
      if (existingInDay.length >= 3) continue // Máximo 3 por día para no saturar

      const dateObj = new Date(`${day.isoDate}T12:00:00-03:00`)
      const dayOfWeek = dateObj.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

      const candidateTimes = isWeekend
        ? RECOMMENDED_PUBLISH_SLOTS.weekendAfternoon
        : [...RECOMMENDED_PUBLISH_SLOTS.weekdayEvening, ...RECOMMENDED_PUBLISH_SLOTS.weekdayLunch]

      for (const timeStr of candidateTimes) {
        const candidateIso = dateTimeIsoArgentina(day.isoDate, timeStr)
        const candidateMs = new Date(candidateIso).getTime()

        if (candidateMs <= minFutureTime) continue

        // Validar separación de al menos MIN_SLOT_SEPARATION_MINUTES con piezas existentes del día
        const hasCollision = existingInDay.some(existing => {
          const diffMinutes = Math.abs(candidateMs - existing.timeMs) / (60 * 1000)
          return diffMinutes < MIN_SLOT_SEPARATION_MINUTES
        })

        if (!hasCollision) {
          candidateFound = { dayIso: day.isoDate, time: timeStr, iso: candidateIso }
          existingInDay.push({ id: piece.id, timeMs: candidateMs, timeStr })
          break
        }
      }

      if (candidateFound) break
    }

    // Fallback de emergencia si todos los slots ideales tenían colisión:
    // Generar un horario desfasado en el día con menos piezas
    if (!candidateFound) {
      const day = sortedDays[0]
      const existingInDay = occupiedByDay.get(day.isoDate) ?? []
      const baseHour = 19
      const baseMinute = (existingInDay.length * 25) % 60
      const timeStr = `${baseHour.toString().padStart(2, '0')}:${baseMinute.toString().padStart(2, '0')}`
      const candidateIso = dateTimeIsoArgentina(day.isoDate, timeStr)
      candidateFound = { dayIso: day.isoDate, time: timeStr, iso: candidateIso }
      existingInDay.push({ id: piece.id, timeMs: new Date(candidateIso).getTime(), timeStr })
    }

    updates.push({
      pieceId: piece.id,
      scheduledAt: candidateFound.iso,
      dayIso: candidateFound.dayIso,
      time: candidateFound.time,
    })
  }

  return updates
}
