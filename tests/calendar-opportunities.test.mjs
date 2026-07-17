import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCalendarOpportunities } from '../lib/calendar-opportunities.ts'

const salida = (id, inicio, fin = inicio) => ({ id, nombre: `Salida ${id}`, destino: 'Patagonia', fecha_inicio: inicio, fecha_fin: fin, estado: 'publicada' })

test('prioriza una salida vinculada con un fin de semana largo', () => {
  const result = buildCalendarOpportunities({
    today: '2026-07-01',
    salidas: [salida('barreal', '2026-07-09', '2026-07-12'), salida('lanin', '2026-08-17')],
    holidays: [
      { fecha: '2026-07-09', nombre: 'Día de la Independencia' },
      { fecha: '2026-07-10', nombre: 'Día no laborable turístico' },
    ],
  })
  assert.equal(result[0].type, 'fecha_especial')
  assert.deepEqual(result[0].salidaIds, ['barreal'])
  assert.deepEqual(result[0].holidayDates, ['2026-07-09', '2026-07-10'])
})

test('propone un calendario mensual cuando hay varias salidas', () => {
  const result = buildCalendarOpportunities({
    today: '2026-08-01',
    salidas: [salida('a', '2026-09-03'), salida('b', '2026-09-12'), salida('c', '2026-09-25')],
    holidays: [],
  })
  assert.equal(result[0].type, 'mes')
  assert.deepEqual(result[0].salidaIds, ['a', 'b', 'c'])
})

test('usa próximas salidas como opción predeterminada sin fechas especiales', () => {
  const result = buildCalendarOpportunities({
    today: '2026-08-01',
    salidas: [salida('a', '2026-08-20'), salida('b', '2026-09-30')],
    holidays: [],
  })
  assert.equal(result[0].type, 'proximas')
  assert.deepEqual(result[0].salidaIds, ['a', 'b'])
})

test('limita cada oportunidad a tres salidas y el horizonte a sesenta días', () => {
  const result = buildCalendarOpportunities({
    today: '2026-01-01',
    salidas: [salida('a', '2026-01-10'), salida('b', '2026-01-11'), salida('c', '2026-01-12'), salida('d', '2026-01-13'), salida('fuera', '2026-04-01')],
    holidays: [],
  })
  assert.equal(result[0].salidaIds.length, 3)
  assert.ok(result.every(item => !item.salidaIds.includes('fuera')))
})
