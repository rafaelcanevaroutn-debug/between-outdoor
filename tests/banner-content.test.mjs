import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createBanner1Content,
  createBanner2Content,
  createBanner6Content,
} from '../lib/generators/banner-content.ts'

test('Molde 1: contenido neutral sin ninguna noción de video, duración o render', () => {
  const content = createBanner1Content({
    lugar: 'Tilcara',
    fecha: '15 de diciembre',
    copy: 'Vamos a Tilcara. ¿Te sumás?',
    items: ['Llevá agua', 'Salí temprano'],
    typographyId: 'Montserrat',
  })
  assert.deepEqual(content, {
    contentKind: 'banner/molde-1',
    lugar: 'Tilcara',
    fecha: '15 de diciembre',
    copy: 'Vamos a Tilcara. ¿Te sumás?',
    items: ['Llevá agua', 'Salí temprano'],
    typographyId: 'Montserrat',
  })
  assert.equal('duracion_estimada_segundos' in content, false)
})

test('Molde 1 exige al menos un ítem y descarta vacíos', () => {
  assert.throws(() => createBanner1Content({
    lugar: 'Tilcara', fecha: '15 de diciembre', copy: 'Vamos a Tilcara.', items: ['   ', ''], typographyId: 'Inter',
  }), /al menos un ítem/u)
})

test('Molde 2: compone lugar, fecha, ficha (3+ datos) y CTA sin fusionarlos en un string', () => {
  const content = createBanner2Content({
    lugar: 'Sendero Laguna de los Tres',
    fecha: '15 de diciembre',
    ficha: [
      { etiqueta: 'distancia', valor: '26 km i/v' },
      { etiqueta: 'desnivel', valor: '1000 m' },
      { etiqueta: 'dificultad', valor: 'Alta' },
    ],
    cta: 'Guardalo para tu próxima salida',
    typographyId: 'Montserrat',
  })
  assert.equal(content.contentKind, 'banner/molde-2')
  assert.equal(content.ficha.length, 3)
  assert.equal(content.cta, 'Guardalo para tu próxima salida')
})

test('Molde 2 exige al menos tres datos de ficha, igual que Familia 5', () => {
  assert.throws(() => createBanner2Content({
    lugar: 'Sendero Torre',
    fecha: '15 de diciembre',
    ficha: [{ etiqueta: 'distancia', valor: '20 km i/v' }],
    cta: 'Guardalo',
    typographyId: 'Inter',
  }), /al menos tres datos/u)
})

test('Molde 6: mensaje aspiracional y convocatoria como campos separados, no fusionados', () => {
  const content = createBanner6Content({
    mensaje: 'La montaña no te cambia, te muestra quién ya eras.',
    convocatoria: 'Sumate al grupo.',
    typographyId: 'Playfair Display',
  })
  assert.deepEqual(content, {
    contentKind: 'banner/molde-6',
    mensaje: 'La montaña no te cambia, te muestra quién ya eras.',
    convocatoria: 'Sumate al grupo.',
    typographyId: 'Playfair Display',
  })
})

test('los 3 moldes rechazan campos vacíos o solo espacios', () => {
  assert.throws(() => createBanner1Content({ lugar: '  ', fecha: 'x', copy: 'x', items: ['a'], typographyId: 'Inter' }), /lugar/u)
  assert.throws(() => createBanner2Content({
    lugar: 'x', fecha: '  ', ficha: [
      { etiqueta: 'distancia', valor: '1 km' },
      { etiqueta: 'duración', valor: '1 h' },
      { etiqueta: 'dificultad', valor: 'Baja' },
    ], cta: 'x', typographyId: 'Inter',
  }), /fecha/u)
  assert.throws(() => createBanner6Content({ mensaje: 'x', convocatoria: '   ', typographyId: 'Inter' }), /convocatoria/u)
})
