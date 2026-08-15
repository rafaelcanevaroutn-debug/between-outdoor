import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  canonicalizeVideoFamily5Candidate,
  normalizeVideoFamily5Difficulty,
  extractVideoFamily5SourceCandidates,
  validateVideoFamily5Output,
  VIDEO_FAMILY_5_VALUE_MAX_CHARACTERS,
} from '../lib/generators/video-family-5-contract.ts'

const source = fs.readFileSync(
  path.join(process.cwd(), 'lib/generators/video-familia-5.ts'),
  'utf8',
)

test('Familia 5 expone el generador con el contrato de parámetros del motor', () => {
  assert.match(source, /export interface GenerateVideoFamilia5Params/u)
  assert.match(source, /export async function generateVideoFamilia5/u)
})

const salidaChalten = {
  puntos_interes: [
    {
      nombre: 'Sendero Laguna de los Tres',
      descripcion: 'Vista cercana al Fitz Roy.',
      distancia: '25 km ida y vuelta desde El Chaltén.',
      duracion: 'Entre 8 y 9 horas ida y vuelta.',
      dificultad: 'Media a exigente.',
      ubicacion: 'Comienza al final de la Avenida San Martín en El Chaltén.',
    },
    {
      nombre: 'Sendero Torre',
      descripcion: 'Caminata a una laguna glaciar.',
      distancia: '19 km ida y vuelta.',
      duracion: 'Entre 7 y 8 horas ida y vuelta.',
      dificultad: 'Baja a moderada. Algunas fuentes indican un desnivel de 753 metros.',
      ubicacion: 'El sendero inicia en El Chaltén.',
    },
  ],
  itinerario_dias: [
    {
      numero: 2,
      titulo: 'Trekking Laguna de los Tres',
      descripcion: 'Distancia total 26 kilómetros con 1000 metros de desnivel+. Es de alta dificultad.',
    },
    {
      numero: 4,
      titulo: 'Caminata por Sendero Torre',
      descripcion: 'Distancia 20 kilómetros con 700 metros de desnivel+, es de dificultad media.',
    },
  ],
}

test('extrae datos reales por lugar y arbitra conflictos según la fuente definida', () => {
  const [lagunaTres, torre] = extractVideoFamily5SourceCandidates(salidaChalten)

  assert.deepEqual(lagunaTres, {
    lugar: 'Sendero Laguna de los Tres',
    datos: [
      { etiqueta: 'desnivel', valor: '1000 metros de desnivel+' },
      { etiqueta: 'distancia', valor: '26 kilómetros' },
      { etiqueta: 'duración', valor: 'Entre 8 y 9 horas ida y vuelta' },
      { etiqueta: 'dificultad', valor: 'alta' },
      { etiqueta: 'acceso', valor: 'Comienza al final de la Avenida San Martín en El Chaltén.' },
    ],
  })
  assert.deepEqual(torre?.datos, [
    { etiqueta: 'desnivel', valor: '700 metros de desnivel+' },
    { etiqueta: 'distancia', valor: '20 kilómetros' },
    { etiqueta: 'duración', valor: 'Entre 7 y 8 horas ida y vuelta' },
    { etiqueta: 'dificultad', valor: 'media' },
    { etiqueta: 'acceso', valor: 'El sendero inicia en El Chaltén.' },
  ])
})

test('omite etiquetas sin respaldo y no inventa datos para completar la ficha', () => {
  assert.deepEqual(
    extractVideoFamily5SourceCandidates({
      puntos_interes: [{
        nombre: 'Cerro Slalgi',
        descripcion: 'Cerro de 2500 msnm.',
        distancia: '5 km.',
      }],
      itinerario_dias: [],
    }),
    [{
      lugar: 'Cerro Slalgi',
      datos: [
        { etiqueta: 'altitud', valor: '2500 msnm' },
        { etiqueta: 'distancia', valor: '5 km' },
      ],
    }],
  )
})

test('normaliza dificultad a la escala cerrada y solo admite pares adyacentes', () => {
  assert.equal(normalizeVideoFamily5Difficulty('Fácil'), 'Baja')
  assert.equal(normalizeVideoFamily5Difficulty('moderada'), 'Media')
  assert.equal(normalizeVideoFamily5Difficulty('intermedia'), 'Media')
  assert.equal(normalizeVideoFamily5Difficulty('exigente'), 'Alta')
  assert.equal(normalizeVideoFamily5Difficulty('Fácil a intermedia'), 'Baja-Media')
  assert.equal(normalizeVideoFamily5Difficulty('Media a exigente'), 'Media-Alta')
  assert.equal(normalizeVideoFamily5Difficulty('Fácil a exigente'), null)
})

test('comprime magnitudes a la forma canónica sin tocar nombres propios', () => {
  assert.deepEqual(
    canonicalizeVideoFamily5Candidate({
      lugar: 'Sendero Laguna de los Tres',
      datos: [
        { etiqueta: 'altitud', valor: '2500 metros sobre el nivel del mar' },
        { etiqueta: 'desnivel', valor: '1000 metros de desnivel+' },
        { etiqueta: 'distancia', valor: '26 kilómetros ida y vuelta' },
        { etiqueta: 'duración', valor: 'Entre 8 y 9 horas ida y vuelta' },
        { etiqueta: 'dificultad', valor: 'alta' },
        { etiqueta: 'acceso', valor: 'Comienza en El Chaltén' },
      ],
    }),
    {
      lugar: 'Sendero Laguna de los Tres',
      datos: [
        { etiqueta: 'altitud', valor: '2500 msnm' },
        { etiqueta: 'desnivel', valor: '1000 m' },
        { etiqueta: 'distancia', valor: '26 km i/v' },
        { etiqueta: 'duración', valor: '8-9 h i/v' },
        { etiqueta: 'dificultad', valor: 'Alta' },
        { etiqueta: 'acceso', valor: 'Comienza en El Chaltén' },
      ],
    },
  )
})

test('valida vocabulario, forma canónica, respaldo literal y cap trimmeado de 18', () => {
  const candidates = extractVideoFamily5SourceCandidates(salidaChalten)
  const valid = {
    lugar: 'Sendero Laguna de los Tres',
    datos: [
      { etiqueta: 'desnivel', valor: '1000 m' },
      { etiqueta: 'distancia', valor: '26 km' },
      { etiqueta: 'duración', valor: '8-9 h i/v' },
      { etiqueta: 'dificultad', valor: 'Alta' },
      { etiqueta: 'acceso', valor: 'Desde El Chaltén' },
    ],
  }
  assert.deepEqual(validateVideoFamily5Output({ ...valid, candidates }), [])
  assert.equal('Desde El Chaltén'.length <= VIDEO_FAMILY_5_VALUE_MAX_CHARACTERS, true)

  assert.deepEqual(
    validateVideoFamily5Output({
      lugar: valid.lugar,
      datos: [
        ...valid.datos.slice(0, 4),
        { etiqueta: 'acceso', valor: 'Desde Avenida San Martin' },
      ],
      candidates,
    }),
    [
      'acceso supera 18 caracteres',
      'acceso no usa un ancla literal y verificada de la fuente',
    ],
  )
})

test('el generador deja la duración como placeholder explícito y no acepta el valor de Gemini', () => {
  assert.match(source, /PENDIENTE: fórmula de duración de Mati \(grilla fija \+ staggered entry\)/u)
  assert.match(source, /duracion_estimada_segundos:\s*0/u)
  assert.doesNotMatch(source, /raw\.duracion_estimada_segundos/u)
})
