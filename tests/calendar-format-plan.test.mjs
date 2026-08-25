import test from 'node:test'
import assert from 'node:assert/strict'
import { planWeeklyFormats } from '../lib/calendar-format-plan.ts'

const slots = Array.from({ length: 4 }, (_, index) => ({
  index,
  label: `Slot ${index + 1}`,
  dia: null,
  formatoCarrusel: 'organico',
  salidaId: 'salida-1',
  salidaAssignment: 'proxima_futura',
}))

test('mantiene la cadencia y mezcla carrusel, banner y video', () => {
  const plan = planWeeklyFormats('CAL-00', slots, new Set(['salida-1']))
  assert.equal(plan.length, slots.length)
  assert.deepEqual(plan.map(slot => slot.formatoContenido), ['video', 'banner', 'carrusel', 'carrusel'])
  assert.equal(plan[0].videoSubfamilia, '3e')
  assert.equal(plan[1].bannerMolde, 1)
})

test('si faltan videos conserva el carrusel y no rompe la semana', () => {
  const plan = planWeeklyFormats('CAL-00', slots, new Set())
  assert.deepEqual(plan.map(slot => slot.formatoContenido), ['carrusel', 'banner', 'carrusel', 'carrusel'])
})

test('Cumbre toma el video de la salida futura y reserva el cierre para el flyer', () => {
  const cumbreSlots = slots.map((slot, index) => ({
    ...slot,
    salidaId: index === 0 ? 'salida-pasada' : 'salida-futura',
  }))
  const plan = planWeeklyFormats('CAL-02', cumbreSlots, new Set(['salida-futura']))
  assert.deepEqual(plan.map(slot => slot.formatoContenido), ['carrusel', 'video', 'carrusel', 'banner'])
  assert.equal(plan[1].videoSubfamilia, '2b')
  assert.equal(plan[3].bannerMolde, 3)
})
