import test from 'node:test'
import assert from 'node:assert/strict'
import { allocateCommercialAxes, planDynamicWeekly10Pieces, planWeeklyFormats } from '../lib/calendar-format-plan.ts'

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

test('grupo local combina un video informativo fijo con otro orgánico', () => {
  const localSlots = Array.from({ length: 5 }, (_, index) => ({
    ...slots[index % slots.length],
    index,
  }))
  const plan = planWeeklyFormats('CAL-05', localSlots, new Set(['salida-1']), {
    contentProfile: 'grupo_recurrente_local',
    rotationIndex: 0,
  })

  assert.deepEqual(plan.map(slot => slot.formatoContenido), ['banner', 'video', 'carrusel', 'carrusel', 'video'])
  assert.equal(plan[0].bannerMolde, 6)
  assert.equal(plan[4].videoSubfamilia, '3b')
  assert.equal(plan[1].videoSubfamilia, '4')
  assert.equal(plan[0].commercialContentAxis, 'conversion')
  assert.equal(plan[1].commercialContentAxis, 'comunidad')
  assert.equal(plan.filter(slot => slot.commercialContentAxis === 'conversion').length, 1)
  assert.equal(plan.filter(slot => slot.commercialContentAxis === 'comunidad').length, 1)
  assert.ok(plan.every(slot => Boolean(slot.commercialContentAxis)))
  assert.deepEqual(
    plan.filter(slot => slot.formatoContenido === 'carrusel').map(slot => slot.formatoCarrusel),
    ['organico', 'conversacion'],
  )
})

test('grupo local rota solo sus familias aprobadas durante cuatro semanas', () => {
  const localSlots = Array.from({ length: 5 }, (_, index) => ({
    ...slots[index % slots.length],
    index,
  }))
  const plans = Array.from({ length: 4 }, (_, rotationIndex) => (
    planWeeklyFormats('CAL-05', localSlots, new Set(['salida-1']), {
      contentProfile: 'grupo_recurrente_local',
      rotationIndex,
    })
  ))
  const allowedVideos = new Set(['3b', '3c', '3d', '4'])
  const allowedCarousels = new Set(['organico', 'conversacion', 'calendario'])

  for (const plan of plans) {
    const videos = plan.filter(slot => slot.formatoContenido === 'video').map(slot => slot.videoSubfamilia)
    const carousels = plan.filter(slot => slot.formatoContenido === 'carrusel').map(slot => slot.formatoCarrusel)
    assert.equal(videos.length, 2)
    assert.ok(videos.includes('4'))
    assert.ok(videos.every(value => allowedVideos.has(value)))
    assert.ok(carousels.every(value => allowedCarousels.has(value)))
    assert.deepEqual(plan.filter(slot => slot.formatoContenido === 'banner').map(slot => slot.bannerMolde), [6])
  }
  assert.deepEqual(plans.map(plan => plan.find(slot => slot.index === 4)?.videoSubfamilia), ['3b', '3c', '3d', '4'])
  assert.deepEqual(
    new Set(plans.flatMap(plan => plan.filter(slot => slot.formatoContenido === 'carrusel').map(slot => slot.formatoCarrusel))),
    allowedCarousels,
  )
})

test('convierte porcentajes comerciales en ejes concretos sin perder los minoritarios', () => {
  const axes = allocateCommercialAxes({ conversion: 40, comunidad: 30, descubrimiento: 20, confianza: 10 }, 5, 0)
  assert.equal(axes.length, 5)
  assert.equal(axes.filter(axis => axis === 'conversion').length, 2)
  assert.deepEqual(new Set(axes), new Set(['conversion', 'comunidad', 'descubrimiento', 'confianza']))
})

test('dupla internacional rota campañas sin alterar la cadencia', () => {
  const plan = planWeeklyFormats('CAL-02', slots, new Set(['salida-1']), {
    contentProfile: 'dupla_viajes_internacionales',
    rotationIndex: 2,
  })

  assert.equal(plan.length, 4)
  assert.equal(plan[3].bannerMolde, 5)
  assert.equal(plan[1].videoSubfamilia, '3c')
  assert.equal(plan[3].commercialContentAxis, 'conversion')
  assert.equal(plan[1].commercialContentAxis, 'personalidad')
  assert.deepEqual(
    plan.filter(slot => slot.formatoContenido === 'carrusel').map(slot => slot.formatoCarrusel),
    ['organico', 'conversacion'],
  )
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

test('el plan dinámico de grupo recurrente mantiene sólo formatos aprobados y prioriza la salida recurrente', () => {
  const salidas = [
    { id: 'viaje', fecha_inicio: '2026-09-01', estado: 'activa', tipo_viaje: 'multi_dia' },
    { id: 'grupo', fecha_inicio: null, estado: 'activa', tipo_viaje: 'salida_recurrente' },
  ]
  const plan = planDynamicWeekly10Pieces(salidas, '2026-08-26', {
    contentProfile: 'grupo_recurrente_local',
    rotationIndex: 2,
  })
  const allowedVideos = new Set(['3b', '3c', '3d', '4'])
  const allowedCarousels = new Set(['organico', 'conversacion', 'calendario'])

  assert.equal(plan.length, 10)
  assert.ok(plan.every(piece => piece.salidaId === 'grupo'))
  assert.ok(plan.filter(piece => piece.formatoContenido === 'video').every(piece => allowedVideos.has(piece.videoSubfamilia)))
  assert.ok(plan.filter(piece => piece.formatoContenido === 'carrusel').every(piece => allowedCarousels.has(piece.formatoCarrusel)))
  assert.deepEqual(plan.filter(piece => piece.formatoContenido === 'banner').map(piece => piece.bannerMolde), [6, 6])
  assert.ok(plan.every(piece => Boolean(piece.commercialContentAxis)))
  assert.equal(plan.filter(piece => piece.commercialContentAxis === 'comunidad').length, 1)
  assert.ok(plan.some(piece => piece.commercialContentAxis === 'bienestar'))
  assert.ok(plan.some(piece => piece.commercialContentAxis === 'habito'))
})
