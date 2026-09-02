import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CALENDAR_TIMEZONE,
  DEFAULT_SLOT_CONFIGS,
  MIN_SLOT_SEPARATION_MINUTES,
  dateTimeIsoArgentina,
  getInitialSlotSchedule,
  isValidTime24h,
  localParts24h,
  realignExpiredCalendarPieces,
} from '../lib/calendar-schedule-strategy.ts'

test('localParts24h devuelve siempre fecha YYYY-MM-DD y hora HH:mm en 24 horas', () => {
  // 15:30 UTC = 12:30 en Buenos Aires (UTC-3)
  const iso = '2026-09-03T15:30:00.000Z'
  const parts = localParts24h(iso)
  assert.equal(parts.date, '2026-09-03')
  assert.equal(parts.time, '12:30')

  // 22:15 UTC = 19:15 en Buenos Aires (UTC-3)
  const isoNight = '2026-09-03T22:15:00.000Z'
  const partsNight = localParts24h(isoNight)
  assert.equal(partsNight.date, '2026-09-03')
  assert.equal(partsNight.time, '19:15')
})

test('isValidTime24h valida estrictamente formato HH:mm entre 00:00 y 23:59', () => {
  assert.equal(isValidTime24h('09:00'), true)
  assert.equal(isValidTime24h('19:15'), true)
  assert.equal(isValidTime24h('23:59'), true)
  assert.equal(isValidTime24h('00:00'), true)

  assert.equal(isValidTime24h('9:00 AM'), false)
  assert.equal(isValidTime24h('24:00'), false)
  assert.equal(isValidTime24h('12:60'), false)
  assert.equal(isValidTime24h('invalid'), false)
})

test('dateTimeIsoArgentina convierte fecha y hora 24h a ISO string UTC correspondiente a Buenos Aires', () => {
  const iso = dateTimeIsoArgentina('2026-09-03', '19:15')
  assert.equal(iso, '2026-09-03T22:15:00.000Z')
})

test('getInitialSlotSchedule distribuye los 10 slots en horarios diferenciados y con separación adecuada', () => {
  const todayIso = '2026-09-03'
  // Simulamos que el batch se ejecuta por la mañana a las 10:00 (13:00 UTC)
  const nowMs = new Date('2026-09-03T13:00:00.000Z').getTime()

  const schedules = Array.from({ length: 10 }, (_, slotIndex) => {
    const dayOffset = DEFAULT_SLOT_CONFIGS[slotIndex].dayOffset
    return {
      slotIndex,
      dayOffset,
      scheduledAt: getInitialSlotSchedule({ todayIso, dayOffset, slotIndex, nowMs }),
    }
  })

  // Verificar que todas las fechas generadas son futuras respecto a nowMs
  for (const item of schedules) {
    const itemMs = new Date(item.scheduledAt).getTime()
    assert.ok(itemMs > nowMs + 10 * 60_000, `Slot ${item.slotIndex} debe ser futuro`)
  }

  // Verificar videos: los 5 videos (slots 0, 2, 4, 6, 8) no deben compartir la misma hora exacta
  const videoTimes = [0, 2, 4, 6, 8].map(idx => localParts24h(schedules[idx].scheduledAt).time)
  const uniqueVideoTimes = new Set(videoTimes)
  assert.ok(uniqueVideoTimes.size >= 4, 'Los videos deben tener horarios diferenciados')

  // Verificar días con múltiples piezas (Día 1: slots 1 y 7; Día 3: slots 3 y 8; Día 5: slots 5 y 9)
  const day1Slots = [schedules[1], schedules[7]]
  const diffDay1Minutes = Math.abs(
    new Date(day1Slots[0].scheduledAt).getTime() - new Date(day1Slots[1].scheduledAt).getTime()
  ) / (60 * 1000)
  assert.ok(diffDay1Minutes >= MIN_SLOT_SEPARATION_MINUTES, 'Día 1 debe tener separación >= 18m')

  const day3Slots = [schedules[3], schedules[8]]
  const diffDay3Minutes = Math.abs(
    new Date(day3Slots[0].scheduledAt).getTime() - new Date(day3Slots[1].scheduledAt).getTime()
  ) / (60 * 1000)
  assert.ok(diffDay3Minutes >= MIN_SLOT_SEPARATION_MINUTES, 'Día 3 debe tener separación >= 18m')

  const day5Slots = [schedules[5], schedules[9]]
  const diffDay5Minutes = Math.abs(
    new Date(day5Slots[0].scheduledAt).getTime() - new Date(day5Slots[1].scheduledAt).getTime()
  ) / (60 * 1000)
  assert.ok(diffDay5Minutes >= MIN_SLOT_SEPARATION_MINUTES, 'Día 5 debe tener separación >= 18m')
})

test('realignExpiredCalendarPieces reubica piezas vencidas en la ventana visible actual con separación mínima', () => {
  const days = [
    { isoDate: '2026-09-03' },
    { isoDate: '2026-09-04' },
    { isoDate: '2026-09-05' },
    { isoDate: '2026-09-06' },
    { isoDate: '2026-09-07' },
    { isoDate: '2026-09-08' },
    { isoDate: '2026-09-09' },
  ]
  // Supongamos que ahora son las 15:00 en Argentina del 2026-09-03
  const referenceTimeMs = new Date('2026-09-03T18:00:00.000Z').getTime()

  const pieces = [
    // Pieza 1: vencida (de ayer 2026-09-02)
    { id: 'piece-yesterday', scheduled_at: '2026-09-02T22:00:00.000Z', formato: 'video' },
    // Pieza 2: vencida (hoy a las 11:00, ya pasó)
    { id: 'piece-past-today', scheduled_at: '2026-09-03T14:00:00.000Z', formato: 'banner' },
    // Pieza 3: válida futura hoy a las 19:15 (22:15 UTC)
    { id: 'piece-valid-today', scheduled_at: '2026-09-03T22:15:00.000Z', formato: 'video' },
    // Pieza 4: válida futura mañana a las 18:30 (21:30 UTC)
    { id: 'piece-valid-tomorrow', scheduled_at: '2026-09-04T21:30:00.000Z', formato: 'carrusel' },
  ]

  const updates = realignExpiredCalendarPieces({
    pieces,
    days,
    referenceTimeMs,
  })

  assert.equal(updates.length, 2, 'Debe reacomodar exactamente las 2 piezas vencidas')
  const updatedIds = updates.map(u => u.pieceId)
  assert.ok(updatedIds.includes('piece-yesterday'))
  assert.ok(updatedIds.includes('piece-past-today'))

  // Verificar que los nuevos horarios son futuros y caen dentro de la ventana de días
  const validDayDates = new Set(days.map(d => d.isoDate))
  for (const update of updates) {
    const updateMs = new Date(update.scheduledAt).getTime()
    assert.ok(updateMs > referenceTimeMs + 5 * 60_000, 'Debe ser futuro')
    const { date, time } = localParts24h(update.scheduledAt)
    assert.ok(validDayDates.has(date), `Debe pertenecer a uno de los días visibles: ${date}`)
    assert.equal(isValidTime24h(time), true, `Hora debe ser 24h válida: ${time}`)
  }
})
