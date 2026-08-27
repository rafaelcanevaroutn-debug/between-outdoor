import test from 'node:test'
import assert from 'node:assert/strict'
import { validateVideoFamily4Copy } from '../lib/generators/video-family-4-contract.ts'
import { validateDatoDuroWidth } from '../lib/generators/video-text-limits.ts'

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
    copy: 'Vamos a Tafí del Valle. ¿Te sumás? Escribinos por WhatsApp.',
    datoDuro: 'Este sábado',
    salida,
    publicationDate: '2026-08-06',
    canalesHabilitados: ['WhatsApp'],
  })
  assert.deepEqual(errors, [])
})

test('Familia 4 original acepta CTA rioplatenses con vocal acentuada', () => {
  for (const cta of ['Reservá', 'Respondé']) {
    const errors = validateVideoFamily4Copy({
      copy: `Vamos a Tafí del Valle. ${cta}.`,
      datoDuro: '8 de agosto',
      salida,
      canalesHabilitados: ['web'],
    })
    assert.equal(errors.some(error => error.includes('CTA concreto')), false, cta)
  }
})

test('rechaza ausencia de dato duro y canal no habilitado', () => {
  const errors = validateVideoFamily4Copy({
    copy: 'Vamos a Tafí del Valle. ¿Te sumás? Escribinos por WhatsApp.',
    datoDuro: '',
    salida,
    canalesHabilitados: [],
  })
  assert.ok(errors.some(error => error.includes('precio, fecha o cupos')))
  assert.ok(errors.some(error => error.includes('no está habilitado')))
})

test('rechaza una convocatoria que no identifica la salida real', () => {
  const errors = validateVideoFamily4Copy({
    copy: 'Vamos a Mendoza. Respondé me sumo.',
    datoDuro: '8 de agosto',
    salida,
    canalesHabilitados: ['comentarios'],
  })
  assert.ok(errors.some(error => error.includes('destino o nombre real')))
})

test('rechaza fecha relativa incompatible y todo incluido inventado', () => {
  const errors = validateVideoFamily4Copy({
    copy: 'Vamos a Tafí del Valle, todo incluido. Respondé me sumo.',
    datoDuro: 'Mañana · 7 cupos',
    salida,
    publicationDate: '2026-08-01',
    canalesHabilitados: ['comentarios'],
  })
  assert.ok(errors.some(error => error.includes('"mañana"')))
  assert.ok(errors.some(error => error.includes('todo incluido')))
})

test('rechaza precio, cupos y seña presentados con valores incorrectos', () => {
  const wrongPrice = validateVideoFamily4Copy({
    copy: 'Vamos a Tafí del Valle. Escribinos.',
    datoDuro: 'ARS 999.000 · 8 de agosto',
    salida,
    canalesHabilitados: ['web'],
  })
  assert.ok(wrongPrice.some(error => error.includes('precio que no coincide')))

  const wrongCapacity = validateVideoFamily4Copy({
    copy: 'Buscamos personas para Tafí del Valle. Respondé me sumo.',
    datoDuro: '9 personas · 8 de agosto',
    salida,
    canalesHabilitados: ['comentarios'],
  })
  assert.ok(wrongCapacity.some(error => error.includes('distinta de 7')))

  const depositAsPrice = validateVideoFamily4Copy({
    copy: 'Vamos a Tafí del Valle. Respondé me sumo.',
    datoDuro: 'ARS 50.000 · 8 de agosto',
    salida,
    canalesHabilitados: ['comentarios'],
  })
  assert.ok(depositAsPrice.some(error => error.includes('seña como si fuera')))
})

test('rechaza repetir el dato duro dentro del copy principal', () => {
  const errors = validateVideoFamily4Copy({
    copy: 'Vamos a Tafí del Valle el 8 de agosto. Escribinos.',
    datoDuro: '8 de agosto',
    salida,
    canalesHabilitados: ['web'],
  })
  assert.ok(errors.some(error => error.includes('duplica el dato duro')))
})

test('rechaza últimos lugares aunque empiece con vocal acentuada', () => {
  const errors = validateVideoFamily4Copy({
    copy: 'Vamos a Tafí del Valle. ¿Te sumás? Escribinos.',
    datoDuro: 'Últimos lugares',
    salida,
    canalesHabilitados: ['web'],
  })
  assert.ok(errors.some(error => error.includes('urgencia o disponibilidad')))
})

test('regresión Familia 4: precio, fecha y cupos viven sólo en dato_duro', () => {
  for (const copy of [
    'Vamos a Tafí del Valle por ARS 158.000. Escribinos.',
    'Vamos a Tafí del Valle el 8 de agosto. Escribinos.',
    'Vamos a Tafí del Valle con 7 cupos. Escribinos.',
  ]) {
    const errors = validateVideoFamily4Copy({
      copy,
      datoDuro: 'ARS 158.000',
      salida,
      canalesHabilitados: ['web'],
    })
    assert.ok(errors.some(error => error.includes('únicamente en dato_duro')), copy)
  }
})

test('variante local reutiliza Familia 4 sin inventar fecha, precio ni cupos', () => {
  const campaignContext = {
    nombre_publico: 'Caminantes de Montaña',
    nombre_oferta: 'Salidas locales en grupo',
    actividad: 'trekking en grupo',
    territorio: 'Tucumán',
    destinos: ['Horco Molle'],
  }
  assert.deepEqual(validateVideoFamily4Copy({
    copy: 'Armamos grupo para caminar en Tucumán. Sumate desde el link de la bio.',
    datoDuro: 'Trekking en grupo',
    salida,
    canalesHabilitados: [],
    campaignContext,
  }), [])

  const errors = validateVideoFamily4Copy({
    copy: 'Armamos grupo para caminar en Tucumán. Sumate desde el link de la bio.',
    datoDuro: 'Todos los sábados · 8 cupos',
    salida,
    canalesHabilitados: [],
    campaignContext,
  })
  assert.ok(errors.some(error => error.includes('no contiene una actividad')))
  assert.ok(errors.some(error => error.includes('fecha, precio o cupos no habilitados')))
})

test('variante local acepta convocatoria directa y ancho específico sin relajar el molde original', () => {
  const campaignContext = {
    nombre_publico: 'Caminantes de Montaña',
    nombre_oferta: 'Salidas locales en grupo',
    actividad: 'trekking en grupo',
    territorio: 'Tucumán',
    destinos: ['Horco Molle'],
  }
  assert.deepEqual(validateVideoFamily4Copy({
    copy: 'Sumate al trekking en grupo en Tucumán desde el link de la bio.',
    datoDuro: 'Trekking en grupo',
    salida,
    canalesHabilitados: [],
    campaignContext,
  }), [])
  assert.deepEqual(validateDatoDuroWidth('Trekking en grupo', 22).violations, [])
  assert.deepEqual(validateDatoDuroWidth('Trekking en grupo').violations, ['characters'])
})

test('video local fijo separa encabezado, lugar y CTA sin inventar agenda', () => {
  const campaignContext = {
    nombre_publico: 'Caminantes de Montaña',
    nombre_oferta: 'Salidas locales en grupo',
    actividad: 'trekking en grupo',
    territorio: 'Tucumán',
    destinos: ['Horco Molle'],
    frecuencia_confirmada: false,
  }
  assert.deepEqual(validateVideoFamily4Copy({
    copy: 'Trekking en grupo · Tucumán',
    datoDuro: 'Horco Molle',
    cta: 'Sumate desde el link de la bio.',
    salida,
    canalesHabilitados: [],
    campaignContext,
  }), [])
})
