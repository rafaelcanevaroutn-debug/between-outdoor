import test from 'node:test'
import assert from 'node:assert/strict'
import { generateSlotPieces } from '../lib/orchestrators/generate-slot-pieces.ts'
import { resolveWeeklyBatch } from '../lib/calendar-resolver.ts'
import { markGeneratedSlotsRenderPending, reconcileSlotRenderStatuses } from '../lib/calendar-render-status.ts'
import { formatCalendarPrimaryLine } from '../lib/generators/calendar-copy.ts'

function salida(overrides) {
  return {
    id: overrides.id,
    user_id: 'cliente-x',
    nombre: overrides.nombre ?? 'Salida',
    destino: overrides.destino ?? 'Fitz Roy',
    pais_codigo: 'AR',
    fecha_inicio: overrides.fecha_inicio,
    fecha_fin: overrides.fecha_fin ?? overrides.fecha_inicio,
    precio_usd: 500,
    sena_usd: null,
    nivel: 'media',
    cupos: 10,
    link_inscripcion: null,
    tipo_viaje: 'expedicion_premium',
    itinerario: overrides.itinerario ?? null,
    itinerario_dias: overrides.itinerario_dias ?? [],
    puntos_interes: overrides.puntos_interes ?? [],
    que_incluye: null,
    que_no_incluye: null,
    estado: overrides.estado ?? 'activa',
    moneda: 'USD',
    dias_semana: null,
    hora_encuentro: null,
    punto_encuentro: null,
    frecuencia: null,
    sheets_exported_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  }
}

function slot(overrides) {
  return {
    index: 0,
    label: 'Slot',
    dia: null,
    formatoCarrusel: 'organico',
    salidaId: null,
    salidaAssignment: 'proxima_futura',
    ...overrides,
  }
}

function fakeAdaptivePiece(formato, angulo) {
  return {
    formato: 'carrusel',
    formato_carrusel: formato,
    tema: null,
    estructura_narrativa: null,
    cantidad_slides: 1,
    angulo,
    slides: [{ n_slide: 1, rol: 'portada', texto_principal: `linea de ${angulo}`, texto_apoyo: null, indicacion_imagen: '' }],
    cta_comentario: null,
    objetivo_interaccion: 'convertir',
    descripcion_post: 'desc',
    fuentes: [],
    metadata: {},
    carpeta_material: '',
    mes: 'agosto',
  }
}

function makeDeps() {
  const calls = { adaptive: [], editorial: [], eligibility: [] }
  let adaptiveCallCount = 0
  const deps = {
    generateAdaptiveCarrusel: async params => {
      // Snapshot: avoidAngles/avoidConversationLines son el mismo array
      // mutado en el resto del loop — copiarlos para no ver el estado
      // final "desde el futuro" al inspeccionar `calls` después.
      calls.adaptive.push({ ...params, avoidAngles: [...(params.avoidAngles ?? [])], avoidConversationLines: params.avoidConversationLines ? [...params.avoidConversationLines] : params.avoidConversationLines })
      adaptiveCallCount += 1
      if (params.formato === 'itinerario' && params.salida.id === 'salida-falla') {
        throw new Error('Gemini devolvió una respuesta inválida después de todos los reintentos')
      }
      return fakeAdaptivePiece(params.formato, `angulo-${adaptiveCallCount}`)
    },
    generateContentForSalida: async (...args) => {
      calls.editorial.push(args)
      return [{
        formato: 'carrusel',
        formato_carrusel: 'editorial',
        tema: 'seguridad',
        estructura_narrativa: 'lista_tips',
        cantidad_slides: 1,
        angulo: 'angulo-editorial',
        slides: [],
        cta_comentario: null,
        carpeta_material: '',
        mes: 'agosto',
      }]
    },
    evaluateCarruselEligibility: (formato, salidaArg, ctx) => {
      calls.eligibility.push({ formato, ctx })
      if (formato === 'lugar' && (salidaArg.puntos_interes ?? []).length < 3) {
        return { eligible: false, errors: ['Cargá al menos 3 puntos de interés verificados antes de generar este formato.'], warnings: [] }
      }
      return { eligible: true, errors: [], warnings: [] }
    },
  }
  return { deps, calls }
}

const baseParams = {
  salidasById: new Map(),
  niche: 'trekking',
  clientName: 'Cliente Test',
  clientOnboarding: null,
  vozSlug: undefined,
  hasPhotosBySalidaId: new Map(),
  imageFilesBySalidaId: new Map(),
  carpetaNombreBySalidaId: new Map(),
  calendarEnrichment: null,
  avoidConversationLinesSeed: [],
  knowledgeBase: [],
  tiktokExamples: [],
  objetivoGeneracion: 'vender_salida',
  antiPatternsText: '',
  formatoTexts: {},
}

test('sin salida asignada — sin_salida_disponible, no llama elegibilidad ni generador', async () => {
  const { deps, calls } = makeDeps()
  const outcomes = await generateSlotPieces({ ...baseParams, slots: [slot({ salidaId: null })] }, deps)

  assert.equal(outcomes[0].outcome, 'sin_salida_disponible')
  assert.equal(calls.eligibility.length, 0)
  assert.equal(calls.adaptive.length, 0)
})

test('slot inelegible — no llama al generador, pero el batch sigue con el resto', async () => {
  const { deps, calls } = makeDeps()
  const salidaSinPuntos = salida({ id: 's1', fecha_inicio: '2026-09-01', puntos_interes: [] })
  const salidasById = new Map([['s1', salidaSinPuntos]])
  const slots = [
    slot({ index: 0, label: 'Lugar', formatoCarrusel: 'lugar', salidaId: 's1' }),
    slot({ index: 1, label: 'Orgánico', formatoCarrusel: 'organico', salidaId: 's1' }),
  ]

  const outcomes = await generateSlotPieces({ ...baseParams, salidasById, slots }, deps)

  assert.equal(outcomes[0].outcome, 'ineligible')
  assert.match(outcomes[0].reason, /puntos de interés/)

  // el batch siguió: el segundo slot sí se generó, y el generador solo
  // se llamó una vez en total (nunca para el slot inelegible)
  assert.equal(outcomes[1].outcome, 'generated')
  assert.equal(calls.adaptive.length, 1)
  assert.equal(calls.adaptive[0].formato, 'organico')
})

test('un slot que falla en generación no aborta el batch — el resto sigue y se reporta el error', async () => {
  const { deps } = makeDeps()
  const salidaFalla = salida({ id: 'salida-falla', fecha_inicio: '2026-09-01', itinerario_dias: [{ numero: 1, titulo: 'Día 1', descripcion: 'Trekking' }] })
  const salidaOk = salida({ id: 's2', fecha_inicio: '2026-09-05' })
  const salidasById = new Map([['salida-falla', salidaFalla], ['s2', salidaOk]])

  const slots = [
    slot({ index: 0, label: 'Itinerario', formatoCarrusel: 'itinerario', salidaId: 'salida-falla' }),
    slot({ index: 1, label: 'Orgánico', formatoCarrusel: 'organico', salidaId: 's2' }),
  ]

  const outcomes = await generateSlotPieces({ ...baseParams, salidasById, slots }, deps)

  assert.equal(outcomes[0].outcome, 'error')
  assert.match(outcomes[0].reason, /reintentos/)
  assert.equal(outcomes[1].outcome, 'generated')
  assert.ok(outcomes[1].piece)
})

test('slot Editorial llama a generateContentForSalida con cantidad=1 e índice de lote', async () => {
  const { deps, calls } = makeDeps()
  const salidaOk = salida({ id: 's1', fecha_inicio: '2026-09-01' })
  const salidasById = new Map([['s1', salidaOk]])
  const slots = [slot({ formatoCarrusel: 'editorial', salidaId: 's1' })]

  const outcomes = await generateSlotPieces({ ...baseParams, salidasById, slots, editorialBatchIndex: 7 }, deps)

  assert.equal(outcomes[0].outcome, 'generated')
  assert.equal(calls.editorial.length, 1)
  assert.equal(calls.editorial[0][8], 1) // posición del parámetro `cantidad`
  assert.equal(calls.editorial[0][14], 7) // posición del parámetro `batchIndex`
})

test('el nombre de carpeta resuelto una vez se pasa igual a todas las piezas adaptativas (no queda en \'\')', async () => {
  const { deps, calls } = makeDeps()
  const s1 = salida({ id: 's1', fecha_inicio: '2026-09-01' })
  const s2 = salida({ id: 's2', fecha_inicio: '2026-09-05' })
  const salidasById = new Map([['s1', s1], ['s2', s2]])
  const slots = [
    slot({ index: 0, formatoCarrusel: 'organico', salidaId: 's1' }),
    slot({ index: 1, formatoCarrusel: 'conversacion', salidaId: 's2' }),
  ]

  await generateSlotPieces({
    ...baseParams,
    salidasById,
    slots,
    carpetaNombreBySalidaId: new Map([['s1', 'Banco de fotos'], ['s2', 'Banco de fotos']]),
  }, deps)

  assert.equal(calls.adaptive[0].carpeta, 'Banco de fotos')
  assert.equal(calls.adaptive[1].carpeta, 'Banco de fotos')
})

test('sin carpeta resuelta (carpetaNombre null), cae a string vacío en vez de undefined', async () => {
  const { deps, calls } = makeDeps()
  const s1 = salida({ id: 's1', fecha_inicio: '2026-09-01' })
  const salidasById = new Map([['s1', s1]])
  const slots = [slot({ formatoCarrusel: 'organico', salidaId: 's1' })]

  await generateSlotPieces({
    ...baseParams,
    salidasById,
    slots,
    carpetaNombreBySalidaId: new Map([['s1', null]]),
  }, deps)

  assert.equal(calls.adaptive[0].carpeta, '')
})

test('cada slot lleva su eje comercial al prompt sin modificar el onboarding base', async () => {
  const { deps, calls } = makeDeps()
  const s1 = salida({ id: 's1', fecha_inicio: '2026-09-01' })
  const originalOnboarding = {
    ...baseParams.clientOnboarding,
    content_profile: 'grupo_recurrente_local',
    campaign_context: { actividad: 'trekking en grupo' },
  }

  await generateSlotPieces({
    ...baseParams,
    clientOnboarding: originalOnboarding,
    salidasById: new Map([['s1', s1]]),
    slots: [slot({ formatoCarrusel: 'conversacion', salidaId: 's1', commercialContentAxis: 'objeciones' })],
  }, deps)

  assert.equal(calls.adaptive[0].clientOnboarding.campaign_context.content_axis, 'objeciones')
  assert.equal(originalOnboarding.campaign_context.content_axis, undefined)
})

test('avoidAngles se acumula a lo largo de toda la semana, no por formato', async () => {
  const { deps, calls } = makeDeps()
  const s1 = salida({ id: 's1', fecha_inicio: '2026-09-01' })
  const s2 = salida({ id: 's2', fecha_inicio: '2026-09-05', itinerario_dias: [{ numero: 1, titulo: 'Día 1', descripcion: 'Trekking' }] })
  const salidasById = new Map([['s1', s1], ['s2', s2]])
  const slots = [
    slot({ index: 0, formatoCarrusel: 'organico', salidaId: 's1' }),
    slot({ index: 1, formatoCarrusel: 'itinerario', salidaId: 's2' }),
  ]

  await generateSlotPieces({ ...baseParams, salidasById, slots }, deps)

  assert.equal(calls.adaptive[0].avoidAngles.length, 0)
  assert.deepEqual(calls.adaptive[1].avoidAngles, ['angulo-1'])
})

test('integración con el resolver real — Ascenso sin pasada cae a Lugar, y si Lugar tampoco es elegible el batch sigue con el resto', async () => {
  const { deps } = makeDeps()
  const unicaSalida = salida({ id: 'salida-unica', fecha_inicio: '2026-09-01', puntos_interes: [] })
  const salidasById = new Map([['salida-unica', unicaSalida]])
  const slots = resolveWeeklyBatch({ calendarCode: 'CAL-02', salidas: [unicaSalida], today: '2026-08-04' })

  const outcomes = await generateSlotPieces({ ...baseParams, salidasById, slots }, deps)

  // slots[0] = Ascenso -> sin pasada -> cae a "lugar", pero esa salida no tiene puntos de interés
  assert.equal(outcomes[0].slot.formatoCarrusel, 'lugar')
  assert.equal(outcomes[0].outcome, 'ineligible')

  // el resto de la semana (conversación, calendario) igual se generó
  const restOutcomes = outcomes.slice(1)
  assert.ok(restOutcomes.every(o => o.outcome === 'generated'))
})

test('los slots generados con contenido quedan pendientes mientras Mati renderiza', () => {
  const slots = [
    { index: 0, label: 'Orgánico', formatoCarrusel: 'organico', salidaId: 's1', outcome: 'generated', contenidoId: 'c1' },
    { index: 1, label: 'Editorial', formatoCarrusel: 'editorial', salidaId: 's1', outcome: 'error', reason: 'falló texto' },
  ]

  const pending = markGeneratedSlotsRenderPending(slots)

  assert.equal(pending[0].renderStatus, 'render_pending')
  assert.equal(pending[1].renderStatus, undefined)
})

test('la reconciliación distingue render exitoso de render fallido por render_folder_id', () => {
  const slots = markGeneratedSlotsRenderPending([
    { index: 0, label: 'Orgánico', formatoCarrusel: 'organico', salidaId: 's1', outcome: 'generated', contenidoId: 'c-rendered' },
    { index: 1, label: 'Editorial', formatoCarrusel: 'editorial', salidaId: 's1', outcome: 'generated', contenidoId: 'c-failed' },
    { index: 2, label: 'Lugar', formatoCarrusel: 'lugar', salidaId: 's1', outcome: 'ineligible' },
  ])

  const reconciled = reconcileSlotRenderStatuses(slots, new Set(['c-rendered']))

  assert.equal(reconciled[0].renderStatus, 'rendered')
  assert.equal(reconciled[1].renderStatus, 'render_failed')
  assert.equal(reconciled[2].renderStatus, undefined)
})

test('Calendario hace converger una línea de 61 caracteres sin perder fecha ni nombre', () => {
  const dateLabel = '4 al 10 ago 2026'
  const salidaLabel = 'Travesía completa por senderos del Chaltén'
  const previous = `${dateLabel} — ${salidaLabel}`
  assert.equal(previous.length, 61)

  const converged = formatCalendarPrimaryLine(dateLabel, salidaLabel)

  assert.equal(converged.length, 59)
  assert.ok(converged.includes(dateLabel))
  assert.ok(converged.includes(salidaLabel))
})
