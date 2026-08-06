import test from 'node:test'
import assert from 'node:assert/strict'
import { validateVideoFamily4Copy } from '../lib/generators/video-family-4-contract.ts'

const salida = {
  destino: 'Tafí del Valle',
  fecha_inicio: '2026-08-08',
  precio_usd: 158000,
  moneda: 'ARS',
  cupos: 7,
  sena_usd: 50000,
  que_incluye: 'Guía y traslado',
}

test('acepta convocatoria, fecha real y CTA habilitado', () => {
  const errors = validateVideoFamily4Copy({
    copy: 'Este sábado vamos a Tafí del Valle. ¿Te sumás? Escribinos por WhatsApp.',
    salida,
    publicationDate: '2026-08-06',
    canalesHabilitados: ['WhatsApp'],
  })
  assert.deepEqual(errors, [])
})

test('rechaza ausencia de dato duro y canal no habilitado', () => {
  const errors = validateVideoFamily4Copy({
    copy: 'Vamos a Tafí del Valle. ¿Te sumás? Escribinos por WhatsApp.',
    salida,
    canalesHabilitados: [],
  })
  assert.ok(errors.some(error => error.includes('precio, fecha o cupos')))
  assert.ok(errors.some(error => error.includes('no está habilitado')))
})

test('rechaza una convocatoria que no identifica la salida real', () => {
  const errors = validateVideoFamily4Copy({
    copy: 'Vamos a Mendoza el 8 de agosto. Respondé me sumo.',
    salida,
    canalesHabilitados: ['comentarios'],
  })
  assert.ok(errors.some(error => error.includes('destino o nombre real')))
})

test('rechaza fecha relativa incompatible y todo incluido inventado', () => {
  const errors = validateVideoFamily4Copy({
    copy: 'Mañana vamos a Tafí del Valle con 7 cupos, todo incluido. Respondé me sumo.',
    salida,
    publicationDate: '2026-08-01',
    canalesHabilitados: ['comentarios'],
  })
  assert.ok(errors.some(error => error.includes('"mañana"')))
  assert.ok(errors.some(error => error.includes('todo incluido')))
})

test('rechaza precio, cupos y seña presentados con valores incorrectos', () => {
  const wrongPrice = validateVideoFamily4Copy({
    copy: 'Vamos a Tafí del Valle por ARS 999.000 el 8 de agosto. Escribinos.',
    salida,
    canalesHabilitados: ['web'],
  })
  assert.ok(wrongPrice.some(error => error.includes('precio que no coincide')))

  const wrongCapacity = validateVideoFamily4Copy({
    copy: 'Buscamos 9 personas para Tafí del Valle el 8 de agosto. Respondé me sumo.',
    salida,
    canalesHabilitados: ['comentarios'],
  })
  assert.ok(wrongCapacity.some(error => error.includes('distinta de 7')))

  const depositAsPrice = validateVideoFamily4Copy({
    copy: 'Vamos a Tafí del Valle por ARS 50.000 el 8 de agosto. Respondé me sumo.',
    salida,
    canalesHabilitados: ['comentarios'],
  })
  assert.ok(depositAsPrice.some(error => error.includes('seña como si fuera')))
})
