import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveWeeklyBatch } from '../lib/calendar-resolver.ts'

const TODAY = '2026-08-04'

function salida(overrides) {
  return {
    id: overrides.id,
    user_id: 'cliente-x',
    nombre: overrides.nombre ?? 'Salida',
    destino: 'Fitz Roy',
    pais_codigo: 'AR',
    fecha_inicio: overrides.fecha_inicio,
    fecha_fin: overrides.fecha_fin ?? overrides.fecha_inicio,
    precio_usd: 500,
    sena_usd: null,
    nivel: 'media',
    cupos: 10,
    link_inscripcion: null,
    tipo_viaje: 'expedicion_premium',
    itinerario: null,
    itinerario_dias: [],
    puntos_interes: [],
    que_incluye: null,
    que_no_incluye: null,
    estado: overrides.estado ?? 'activa',
    moneda: 'USD',
    dias_semana: null,
    hora_encuentro: null,
    punto_encuentro: null,
    frecuencia: null,
    sheets_exported_at: null,
    created_at: TODAY,
    updated_at: TODAY,
  }
}

test('cliente con 1 sola salida (CAL-00) — todos los slots genéricos comparten esa salida', () => {
  const unicaSalida = salida({ id: 'salida-unica', fecha_inicio: '2026-09-01' })
  const slots = resolveWeeklyBatch({ calendarCode: 'CAL-00', salidas: [unicaSalida], today: TODAY })

  assert.equal(slots.length, 4)
  for (const slot of slots) {
    assert.equal(slot.salidaId, 'salida-unica')
    assert.equal(slot.salidaAssignment, 'proxima_futura')
  }
  assert.deepEqual(
    slots.map(s => s.formatoCarrusel),
    ['organico', 'itinerario', 'editorial', 'calendario'],
  )
})

test('cliente con 1 sola salida y sin pasada (CAL-02) — Ascenso cae a Lugar', () => {
  const unicaSalida = salida({ id: 'salida-unica', fecha_inicio: '2026-09-01' })
  const slots = resolveWeeklyBatch({ calendarCode: 'CAL-02', salidas: [unicaSalida], today: TODAY })

  const ascenso = slots[0]
  assert.equal(ascenso.formatoCarrusel, 'lugar')
  assert.equal(ascenso.salidaAssignment, 'fallback_sin_salida_pasada')
  assert.equal(ascenso.salidaId, 'salida-unica')
})

test('cliente con 3 salidas (CAL-02) — Ascenso usa la pasada, el resto la futura más próxima', () => {
  const salidas = [
    salida({ id: 'futura-lejana', fecha_inicio: '2026-12-01' }),
    salida({ id: 'futura-cercana', fecha_inicio: '2026-08-20' }),
    salida({ id: 'pasada-reciente', fecha_inicio: '2026-06-01', fecha_fin: '2026-06-05', estado: 'completada' }),
  ]
  const slots = resolveWeeklyBatch({ calendarCode: 'CAL-02', salidas, today: TODAY })

  const [ascenso, ...resto] = slots
  assert.equal(ascenso.formatoCarrusel, 'ascenso')
  assert.equal(ascenso.salidaId, 'pasada-reciente')
  assert.equal(ascenso.salidaAssignment, 'pasada_mas_reciente')

  for (const slot of resto) {
    assert.equal(slot.salidaId, 'futura-cercana')
    assert.equal(slot.salidaAssignment, 'proxima_futura')
  }
})

test('cliente sin salidas cargadas (CAL-04) — slots genéricos quedan sin salida asignada', () => {
  const slots = resolveWeeklyBatch({ calendarCode: 'CAL-04', salidas: [], today: TODAY })
  for (const slot of slots) {
    assert.equal(slot.salidaId, null)
    assert.equal(slot.salidaAssignment, 'sin_salida_disponible')
  }
})

test('CAL-00 domingo — sin salida futura cargada, cae a Conversación', () => {
  const soloPasada = salida({ id: 'pasada-1', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-05', estado: 'completada' })
  const slots = resolveWeeklyBatch({ calendarCode: 'CAL-00', salidas: [soloPasada], today: TODAY })
  const domingo = slots[3]
  assert.equal(domingo.formatoCarrusel, 'conversacion')
  assert.equal(domingo.salidaAssignment, 'sin_salida_disponible')
})

test('CAL-03 — el slot comercial/editorial rota según la semana', () => {
  const futura = salida({ id: 'f1', fecha_inicio: '2026-09-01' })
  const semanaPar = resolveWeeklyBatch({ calendarCode: 'CAL-03', salidas: [futura], today: TODAY, weekIndex: 10 })
  const semanaImpar = resolveWeeklyBatch({ calendarCode: 'CAL-03', salidas: [futura], today: TODAY, weekIndex: 11 })
  assert.equal(semanaPar[4].formatoCarrusel, 'itinerario')
  assert.equal(semanaImpar[4].formatoCarrusel, 'editorial')
})
