import test from 'node:test'
import assert from 'node:assert/strict'
import { planWeeklyFormats, planDynamicWeekly10Pieces } from '../lib/calendar-format-plan.ts'

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

test('planDynamicWeekly10Pieces genera exactamente 10 piezas (5 videos + 5 estáticas) distribuidas en 7 días', () => {
  const salidas = [{
    id: 'salida-futura-1',
    fecha_inicio: '2026-09-01',
    estado: 'activa',
  }]
  const plan = planDynamicWeekly10Pieces(salidas, '2026-08-26')
  assert.equal(plan.length, 10)

  const videos = plan.filter(p => p.formatoContenido === 'video')
  const banners = plan.filter(p => p.formatoContenido === 'banner')
  const carruseles = plan.filter(p => p.formatoContenido === 'carrusel')

  assert.equal(videos.length, 5)
  assert.equal(banners.length, 2)
  assert.equal(carruseles.length, 3)
  assert.equal(banners.length + carruseles.length, 5)

  // Verifica que las 5 familias de video pedidas estén presentes
  const videoFamilias = videos.map(v => v.videoSubfamilia)
  assert.deepEqual(videoFamilias, ['3b', '3a', '3c', '1c', '1b'])

  // Verifica que los 7 días (offsets 0..6) tengan contenido
  const dayOffsets = new Set(plan.map(p => p.dayOffset))
  assert.equal(dayOffsets.size, 7)
  for (let i = 0; i <= 6; i++) {
    assert.ok(dayOffsets.has(i), `Día ${i} debe tener contenido`)
  }

  // Verifica que todas las piezas tengan scheduledAt en formato ISO correcto
  for (const piece of plan) {
    assert.ok(piece.scheduledAt)
    assert.match(piece.scheduledAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  }
})
