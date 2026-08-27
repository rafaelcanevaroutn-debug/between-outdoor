import test from 'node:test'
import assert from 'node:assert/strict'
import { editLugarContent } from '../lib/generators/lugar-editor.ts'

const points = [
  {
    etiqueta: 'Laguna de los Tres',
    descripcion: 'La vista clásica del Fitz Roy desde Laguna de los Tres.',
    distancia: '25 km ida y vuelta',
    duracion: 'Entre 8 y 9 horas',
    dificultad: 'Media a exigente. El último tramo tiene pendiente pronunciada.',
  },
  {
    etiqueta: 'Laguna y Glaciar Huemul',
    descripcion: 'Una caminata breve permite observar Laguna y Glaciar Huemul.',
    distancia: '2 km ida',
    duracion: '45 minutos',
    dificultad: 'Baja a media',
  },
  {
    etiqueta: 'Laguna Torre',
    descripcion: 'El sendero llega a Laguna Torre frente al Cerro Torre.',
    distancia: '19 km ida y vuelta',
    duracion: 'Entre 7 y 8 horas',
    dificultad: 'Baja a moderada',
  },
]

const badPhrases = [
  'La postal más buscada que te va a volar la cabeza.',
  'El glaciar homónimo está tan cerca que sentís el frío del hielo.',
  'Una experiencia única, majestuosa e imponente.',
  'Sumate ahora: últimos cupos disponibles.',
  'El lugar que tenés que conocer sí o sí.',
]

function draft(variant) {
  return {
    descripcion: `El Chaltén te va a volar la cabeza. Sumate a nuestra próxima expedición.\n\n¡Comentá CHALTÉN y te enviamos toda la información!\nSalida: 27 de diciembre de 2027 al 2 de enero de 2027.\nComentá CHALTÉN y te enviamos toda la información.`,
    rawCta: variant % 2 ? 'CHALTÉN' : 'Comentá CHALTÉN y te enviamos toda la información.',
    destino: 'El Chaltén',
    fechaInicio: '2026-12-27',
    fechaFin: '2027-01-02',
    activityEvidence: 'Trekking por senderos a lagunas y miradores.',
    points,
    slides: [
      { n_slide: 1, rol: 'portada', tipo: 'texto', pill_text: null, texto_principal: 'El Chaltén: un destino imperdible', texto_apoyo: 'USD 1100', indicacion_imagen: 'portada' },
      ...points.map((point, index) => ({ n_slide: index + 2, rol: 'desarrollo', tipo: 'texto', pill_text: index === 1 ? 'Glaciar homónimo' : 'Lugar', texto_principal: badPhrases[(variant + index) % badPhrases.length], texto_apoyo: 'Dato inventado', indicacion_imagen: `foto ${index + 1}` })),
      { n_slide: 5, rol: 'cierre', tipo: 'texto', pill_text: 'VENTA', texto_principal: 'Sumate ahora, últimos cupos', texto_apoyo: 'Fecha equivocada', indicacion_imagen: 'cierre' },
    ],
  }
}

test('contrato editorial de Lugar corrige diez borradores variables de El Chaltén', () => {
  for (let variant = 0; variant < 10; variant++) {
    const result = editLugarContent(draft(variant))
    assert.equal(result.slides.length, 5)
    assert.deepEqual(result.slides.slice(1, 4).map(slide => slide.pill_text), points.map(point => point.etiqueta))
    assert.equal((result.descripcion.match(/Comentá CHALTÉN y te enviamos toda la información\./g) ?? []).length, 1)
    assert.match(result.descripcion, /27 de diciembre de 2026 al 2 de enero de 2027/)
    assert.doesNotMatch(result.descripcion, /27 de diciembre de 2027/)
    assert.ok(result.descripcion.length <= 750)
    assert.equal(result.slides[4].texto_apoyo, 'Salida: 27 de diciembre de 2026 al 2 de enero de 2027.\nComentá CHALTÉN y te enviamos toda la información.')

    for (const [index, slide] of result.slides.entries()) {
      const text = `${slide.texto_principal ?? ''} ${slide.texto_apoyo ?? ''}`
      assert.doesNotMatch(text, /hom[oó]nimo|volar la cabeza|sent[ií]s el fr[ií]o|experiencia [uú]nica|m[aá]s buscada/i)
      if (index < 4) assert.doesNotMatch(text, /coment[aá]|usd|cupos|sumate|reserv[aá]/i)
      if (index > 0 && index < 4) {
        assert.ok((slide.texto_principal?.length ?? 0) <= 60)
        assert.ok((slide.texto_apoyo?.length ?? 0) <= 90)
      }
    }

    assert.match(result.slides[1].texto_apoyo ?? '', /25 km ida y vuelta.*8–9 h.*media–exigente/i)
    assert.match(result.slides[2].texto_apoyo ?? '', /2 km ida.*45 min.*baja–media/i)
    assert.match(result.slides[3].texto_apoyo ?? '', /19 km ida y vuelta.*7–8 h.*baja–moderada/i)
  }
})

test('rechaza estructuras que Mati no puede renderizar', () => {
  assert.throws(() => editLugarContent({ ...draft(0), slides: draft(0).slides.slice(0, 4) }), /exactamente 5 slides/)
})

test('deja un único CTA al final aunque el borrador use otra formulación', () => {
  const input = draft(0)
  input.descripcion = 'Tres senderos para conocer El Chaltén. Comentá CHALTÉN para recibir la información completa.'
  const result = editLugarContent(input)

  assert.equal((result.descripcion.match(/Comentá/g) ?? []).length, 1)
  assert.ok(result.descripcion.endsWith('Comentá CHALTÉN y te enviamos toda la información.'))
})

test('reemplaza promesas de cumbre, ascenso o escalada sin evidencia', () => {
  for (const closing of ['Tus próximas cumbres están en El Chaltén.', 'Tu próximo ascenso está acá.', 'Vení a escalar El Chaltén.']) {
    const input = draft(0)
    input.slides[4].texto_principal = closing
    const result = editLugarContent(input)
    assert.equal(result.slides[4].texto_principal, 'Conocé El Chaltén.', closing)
  }
})

test('conserva una actividad de ascenso cuando está documentada', () => {
  const input = draft(0)
  input.activityEvidence = 'Ascenso al Pico Argentino con subida hasta la cumbre.'
  input.slides[4].texto_principal = 'Tu próximo ascenso puede ser en El Chaltén.'
  const result = editLugarContent(input)

  assert.equal(result.slides[4].texto_principal, 'Tu próximo ascenso puede ser en El Chaltén.')
})

test('una salida recurrente comunica su frecuencia sin inventar una fecha', () => {
  const input = draft(0)
  input.fechaInicio = null
  input.fechaFin = null
  input.recurringSchedule = 'Salidas semanales: martes, jueves, sábado'

  const result = editLugarContent(input)

  assert.match(result.descripcion, /Salidas semanales: martes, jueves, sábado\./)
  assert.doesNotMatch(result.descripcion, /Salida:|Invalid Date|1970/)
  assert.equal(
    result.slides[4].texto_apoyo,
    'Salidas semanales: martes, jueves, sábado.\nComentá CHALTÉN y te enviamos toda la información.',
  )
})
