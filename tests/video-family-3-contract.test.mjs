import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeVideoFamily3Copy,
  validateVideoFamily3Copy,
} from '../lib/generators/video-family-3-contract.ts'
import { verifiedVideoPlaces } from '../lib/generators/video-verified-places.ts'

function salida(overrides = {}) {
  return {
    destino: 'Tafí del Valle',
    puntos_interes: [
      {
        nombre: 'Cerro de la Cruz',
        ubicacion: 'Tafí del Valle',
      },
      {
        nombre: 'La Ciénega',
        ubicacion: null,
      },
    ],
    ...overrides,
  }
}

test('normaliza cualquier variante inicial a POV literal', () => {
  assert.equal(normalizeVideoFamily3Copy('3b', 'Pov — cuando aparece la nieve...'), 'POV: cuando aparece la nieve...')
  assert.equal(normalizeVideoFamily3Copy('3b', 'POV: cuando aparece la nieve...'), 'POV: cuando aparece la nieve...')
})

test('3a, 3b y 3c rechazan lugares verificados', () => {
  for (const subfamilia of ['3a', '3b', '3c']) {
    const errors = validateVideoFamily3Copy({
      subfamilia,
      copy: `${subfamilia === '3b' ? 'POV: ' : ''}un día en Tafí del Valle`,
      salida: salida(),
    })
    assert.ok(errors.some(error => error.includes('atemporal')), subfamilia)
  }
})

test('3c permite autoironía pero bloquea consejo de salud y riesgo', () => {
  assert.deepEqual(validateVideoFamily3Copy({
    subfamilia: '3c',
    copy: 'Cuando me dicen que necesito terapia:\nLa terapia:',
    salida: salida(),
  }), [])
  assert.ok(validateVideoFamily3Copy({
    subfamilia: '3c',
    copy: 'Dejá la terapia y andá a la montaña',
    salida: salida(),
  }).some(error => error.includes('salud')))
  assert.ok(validateVideoFamily3Copy({
    subfamilia: '3c',
    copy: 'Sin equipo porque así tiene más emoción',
    salida: salida(),
  }).some(error => error.includes('peligrosa')))
})

test('3d exige pregunta y remate de una sola voz', () => {
  assert.deepEqual(validateVideoFamily3Copy({
    subfamilia: '3d',
    copy: '¿Dónde estás que no respondés?\nDonde ando: Tafí del Valle',
    salida: salida(),
  }), [])
  assert.ok(validateVideoFamily3Copy({
    subfamilia: '3d',
    copy: '¿Dónde estás?\nEn Tafí del Valle',
    salida: salida(),
  }).some(error => error.includes('dos puntos')))
})

test('regresión 3d: rechaza narración dirigida a vos y exige los dos bloques', () => {
  const audienceNarration = validateVideoFamily3Copy({
    subfamilia: '3d',
    copy: '¿Vos también necesitás salir de la rutina?\nTu próxima aventura: Tafí del Valle',
    salida: salida(),
  })
  assert.ok(audienceNarration.some(error => error.includes('espectador')))

  const missingAnswer = validateVideoFamily3Copy({
    subfamilia: '3d',
    copy: '¿Dónde estás que no te llegan los mensajes?',
    salida: salida(),
  })
  assert.ok(missingAnswer.some(error => error.includes('exactamente')))
})

test('3e acepta sólo nombres y combinaciones verificadas', () => {
  const source = salida()
  assert.ok(verifiedVideoPlaces(source).some(place => place.value === 'Cerro de la Cruz — Tafí del Valle'))
  assert.deepEqual(validateVideoFamily3Copy({
    subfamilia: '3e',
    copy: 'Cerro de la Cruz — Tafí del Valle',
    salida: source,
  }), [])
  assert.deepEqual(validateVideoFamily3Copy({
    subfamilia: '3e',
    copy: 'La Ciénega 📍',
    salida: source,
  }), [])
  assert.ok(validateVideoFamily3Copy({
    subfamilia: '3e',
    copy: 'Bariloche',
    salida: source,
  }).some(error => error.includes('verificada')))
})

test('todas las subfamilias rechazan venta y fechas', () => {
  for (const subfamilia of ['3a', '3b', '3c', '3d', '3e']) {
    const errors = validateVideoFamily3Copy({
      subfamilia,
      copy: 'Reservá tu lugar en agosto',
      salida: salida(),
    })
    assert.ok(errors.some(error => error.includes('comercial')), subfamilia)
  }
})
