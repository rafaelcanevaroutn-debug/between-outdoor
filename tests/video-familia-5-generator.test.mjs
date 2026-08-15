import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  extractVideoFamily5SourceCandidates,
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
