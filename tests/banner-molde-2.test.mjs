import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBannerMolde2 } from '../lib/generators/banner-molde-2.ts'

const baseSalida = {
  id: 'salida-1',
  user_id: 'user-1',
  nombre: 'Travesía Tilcara a Calilegua',
  destino: 'Tilcara, Jujuy',
  pais_codigo: 'AR',
  fecha_inicio: '2026-12-15',
  fecha_fin: '2026-12-20',
  precio_usd: 500,
  sena_usd: null,
  nivel: 'media',
  cupos: 10,
  link_inscripcion: null,
  tipo_viaje: 'grupal',
  itinerario: null,
  itinerario_dias: [],
  puntos_interes: [],
  que_incluye: null,
  que_no_incluye: null,
  estado: 'activa',
  moneda: 'USD',
  dias_semana: null,
  hora_encuentro: null,
  punto_encuentro: null,
  frecuencia: null,
  sheets_exported_at: null,
}

const baseParams = {
  salida: baseSalida,
  niche: 'trekking',
  clientName: 'Between',
  clientOnboarding: null,
  tipografiasPermitidas: ['Montserrat'],
  canalesHabilitados: [],
  cta: 'Guardalo para tu próxima salida',
  lugarMaxCharacters: 40,
  fechaMaxCharacters: 30,
  ctaMaxCharacters: 40,
}

const fichaResult5 = {
  formato: 'video',
  familia: '5',
  lugar: 'Sendero Laguna de los Tres',
  datos: [
    { etiqueta: 'distancia', valor: '26 km i/v' },
    { etiqueta: 'desnivel', valor: '1000 m' },
    { etiqueta: 'dificultad', valor: 'Alta' },
  ],
  tipografia_id: 'Montserrat',
  duracion_estimada_segundos: 7,
  metadata: { inputTokens: 100, outputTokens: 50, clipDurationSeconds: 15, knowledgeFile: 'video_ficha.md' },
}

test('compone lugar, fecha, ficha (vía Familia 5 inyectada) y CTA validado, sin generar copy nuevo propio', async () => {
  let calledWith = null
  const result = await buildBannerMolde2({
    ...baseParams,
    generateFicha: async params => {
      calledWith = params
      return fichaResult5
    },
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.content.contentKind, 'banner/molde-2')
  assert.equal(result.content.lugar, 'Tilcara, Jujuy')
  assert.equal(result.content.fecha, '15 de diciembre')
  assert.deepEqual(result.content.ficha, fichaResult5.datos)
  assert.equal(result.content.cta, 'Guardalo para tu próxima salida')
  assert.equal(result.content.typographyId, 'Montserrat')
  assert.equal(calledWith.salida, baseSalida)
})

test('si Familia 5 cae a fallback (no devuelve familia 5), Molde 2 no aplica — no inventa una ficha vacía', async () => {
  const result = await buildBannerMolde2({
    ...baseParams,
    generateFicha: async () => ({
      formato: 'video', familia: '4', copy: 'x', dato_duro: 'y',
      tipografia_id: 'Montserrat', duracion_estimada_segundos: 5,
      metadata: { inputTokens: 1, outputTokens: 1, clipDurationSeconds: 15, knowledgeFile: '', maxCharacters: 171 },
    }),
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /Molde 2 no aplica/u)
})

test('si Familia 5 devuelve null (descartada), Molde 2 no aplica', async () => {
  const result = await buildBannerMolde2({ ...baseParams, generateFicha: async () => null })
  assert.equal(result.ok, false)
})

test('rechaza CTA comercial, mismo patrón que 2a/2c', async () => {
  const result = await buildBannerMolde2({
    ...baseParams,
    cta: 'Reservá tu lugar por WhatsApp',
    generateFicha: async () => fichaResult5,
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /editorial y no comercial/u)
})

test('rechaza también reservar sin tilde, no solo Reservá', async () => {
  const result = await buildBannerMolde2({
    ...baseParams,
    cta: 'Reservar ahora y guardar tu lugar',
    generateFicha: async () => fichaResult5,
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /editorial y no comercial/u)
})

test('rechaza CTA que no invita a compartir/guardar/elegir', async () => {
  const result = await buildBannerMolde2({
    ...baseParams,
    cta: 'Un día especial para todos',
    generateFicha: async () => fichaResult5,
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /compartir, guardar o elegir/u)
})

test('rechaza CTA que supera el cap de banner por ancho', async () => {
  const result = await buildBannerMolde2({
    ...baseParams,
    ctaMaxCharacters: 10,
    cta: 'Guardalo para tu próxima salida',
    generateFicha: async () => fichaResult5,
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /cta no pasa el cap/u)
})

test('sin destino ni nombre verificado, falla explícito en vez de inventar un lugar', async () => {
  const result = await buildBannerMolde2({
    ...baseParams,
    salida: { ...baseSalida, destino: '', nombre: '' },
    generateFicha: async () => fichaResult5,
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /destino ni nombre/u)
})

test('fecha_inicio inválida falla explícito en vez de inventar una fecha', async () => {
  const result = await buildBannerMolde2({
    ...baseParams,
    salida: { ...baseSalida, fecha_inicio: 'no-es-una-fecha' },
    generateFicha: async () => fichaResult5,
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.match(result.error, /fecha_inicio válida/u)
})
