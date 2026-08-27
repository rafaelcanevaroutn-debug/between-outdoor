import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSalidaPayload } from '../lib/salida-payload.ts'

test('grupo recurrente no persiste fechas ni itinerario', () => {
  const payload = normalizeSalidaPayload({
    tipo_viaje: 'salida_recurrente',
    fecha_inicio: '2026-09-01',
    fecha_fin: '2026-09-03',
    itinerario: 'Día por día',
    itinerario_dias: [{ numero: 1 }],
    lugares_recurrentes: [' Horco Molle ', 'Horco Molle', 'Río Noque'],
    grupo_info: { actividad: 'trekking', propuesta: ' Salidas semanales ' },
  })

  assert.equal(payload.fecha_inicio, null)
  assert.equal(payload.fecha_fin, null)
  assert.equal(payload.itinerario, null)
  assert.deepEqual(payload.itinerario_dias, [])
  assert.deepEqual(payload.lugares_recurrentes, ['Horco Molle', 'Río Noque'])
  assert.equal(payload.grupo_info.actividad, 'trekking')
  assert.equal(payload.grupo_info.propuesta, 'Salidas semanales')
})

test('viaje puntual elimina configuración de grupo', () => {
  const payload = normalizeSalidaPayload({
    tipo_viaje: 'escapada_fin_semana',
    fecha_inicio: '2026-09-01',
    dias_semana: ['sábado'],
    lugares_recurrentes: ['Horco Molle'],
    grupo_info: { actividad: 'trekking' },
  })

  assert.equal(payload.fecha_inicio, '2026-09-01')
  assert.deepEqual(payload.dias_semana, [])
  assert.deepEqual(payload.lugares_recurrentes, [])
  assert.equal(payload.grupo_info, null)
})
