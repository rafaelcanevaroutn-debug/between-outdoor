import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBannerMolde6 } from '../lib/generators/banner-molde-6.ts'

const baseParams = {
  mensaje: 'La montaña no te cambia, te muestra quién ya eras.',
  convocatoria: 'Sumate al grupo que camina con nosotros.',
  typographyId: 'Playfair Display',
  mensajeMaxCharacters: 80,
  convocatoriaMaxCharacters: 60,
}

test('compone mensaje (re-envuelto vía createReflexiveVideoContent) y convocatoria validada, sin generar texto propio', () => {
  const result = buildBannerMolde6(baseParams)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.content.contentKind, 'banner/molde-6')
  assert.equal(result.content.mensaje, baseParams.mensaje)
  assert.equal(result.content.convocatoria, baseParams.convocatoria)
  assert.equal(result.content.typographyId, 'Playfair Display')
})

test('sin mensaje o tipografía, falla explícito (mismo comportamiento que createReflexiveVideoContent)', () => {
  const result = buildBannerMolde6({ ...baseParams, mensaje: '   ' })
  assert.equal(result.ok, false)
})

test('rechaza convocatoria que inventa urgencia, mismo patrón que Familia 4', () => {
  const result = buildBannerMolde6({ ...baseParams, convocatoria: 'Sumate ya, últimos lugares disponibles' })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /urgencia/u)
})

test('rechaza convocatoria con promesa de transformación/sanación', () => {
  const result = buildBannerMolde6({ ...baseParams, convocatoria: 'Sumate y transforma tu vida para siempre' })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /promete sanar, curar, arreglar, transformar/u)
})

test('rechaza un slogan aspiracional que no convoca a la comunidad', () => {
  const result = buildBannerMolde6({ ...baseParams, convocatoria: 'La aventura nos encuentra juntos.' })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /invitar explícitamente/u)
})

test('rechaza captación comercial o atada a una salida', () => {
  const result = buildBannerMolde6({ ...baseParams, convocatoria: 'Sumate y reservá tu lugar por WhatsApp.' })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /lenguaje comercial/u)
})

test('rechaza convocatoria que supera el cap de banner por ancho', () => {
  const result = buildBannerMolde6({ ...baseParams, convocatoriaMaxCharacters: 5 })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /convocatoria no pasa el cap/u)
})

test('rechaza mensaje que supera el cap de banner por ancho', () => {
  const result = buildBannerMolde6({ ...baseParams, mensajeMaxCharacters: 5 })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /mensaje no pasa el cap/u)
})
