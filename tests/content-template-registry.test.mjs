import test from 'node:test'
import assert from 'node:assert/strict'
import { applyContentTemplateRegistry } from '../lib/content-template-registry.ts'

const salida = {
  id: 'salida-1',
  tipo_viaje: 'expedicion',
  punto_encuentro: null,
  dias_semana: [],
  hora_encuentro: null,
  puntos_interes: [],
  carpeta_fotos_id: 'fotos-1',
  carpeta_videos_id: 'videos-1',
  context_tags: ['entorno_patagonia_nieve'],
}

function slot(overrides = {}) {
  return {
    index: 0,
    label: 'Video',
    formatoContenido: 'video',
    videoSubfamilia: '3a',
    salidaId: salida.id,
    dayOffset: 0,
    scheduledAt: '2026-08-29T12:00:00.000Z',
    ...overrides,
  }
}

function template(overrides = {}) {
  return {
    id: 'template-1',
    name: 'Template productivo',
    type: 'video',
    status: 'productiva',
    generator_key: 'video_familia_3_3b',
    template_library_id: null,
    compatibility: {},
    style_profile: {},
    copy_profile: {},
    cta_mode: null,
    rotation_weight: 1,
    repeat_guard_window: 0,
    is_main_default: false,
    metadata: {},
    created_by: null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
    verticals: [],
    families: [],
    requirements: [],
    overrides: [],
    ...overrides,
  }
}

function apply(slots, templates) {
  return applyContentTemplateRegistry({
    slots,
    templates,
    salidasById: new Map([[salida.id, salida]]),
    profile: 'standard_outdoor',
    rotationIndex: 10,
    today: '2026-08-29',
  })
}

test('sin templates conserva exactamente el plan actual', () => {
  const original = [slot()]
  const result = apply(original, [])
  assert.deepEqual(result.slots, original)
  assert.equal(result.selections.size, 0)
})

test('un template productivo y compatible reemplaza solo la familia del slot', () => {
  const original = slot()
  const result = apply([original], [template()])
  assert.equal(result.slots[0].videoSubfamilia, '3b')
  assert.equal(result.slots[0].scheduledAt, original.scheduledAt)
  assert.equal(result.selections.get(0).templateId, 'template-1')
})

test('un override deshabilitado conserva el motor actual', () => {
  const disabled = template({
    overrides: [{
      id: 'override-1', template_id: 'template-1', client_id: 'client-1', salida_id: salida.id,
      enabled: false, custom_rules: {}, vigente_desde: null, vigente_hasta: null,
      created_at: '2026-08-29T00:00:00.000Z', updated_at: '2026-08-29T00:00:00.000Z',
    }],
  })
  assert.equal(apply([slot()], [disabled]).slots[0].videoSubfamilia, '3a')
})

test('si el elegido no cumple requisitos cae al main default válido', () => {
  const requiresMeeting = template({
    requirements: [{ id: 'req-1', template_id: 'template-1', input_key: 'punto_encuentro', required: true, hints: null }],
  })
  const main = template({
    id: 'template-main',
    name: 'Main video',
    generator_key: 'video_familia_1_1c',
    is_main_default: true,
  })
  const result = apply([slot()], [requiresMeeting, main])
  assert.equal(result.slots[0].videoSubfamilia, '1c')
  assert.equal(result.selections.get(0).fallbackToMain, true)
})

test('una generator_key inválida no altera el slot ni reduce la semana', () => {
  const slots = Array.from({ length: 10 }, (_, index) => slot({ index }))
  const result = apply(slots, [template({ generator_key: 'video_familia_inexistente' })])
  assert.equal(result.slots.length, 10)
  assert.deepEqual(result.slots, slots)
  assert.equal(result.selections.size, 0)
})

test('repeat guard excluye un template usado dentro de su ventana', () => {
  const guarded = template({ repeat_guard_window: 2 })
  const result = applyContentTemplateRegistry({
    slots: [slot()],
    templates: [guarded],
    salidasById: new Map([[salida.id, salida]]),
    profile: 'standard_outdoor',
    rotationIndex: 10,
    today: '2026-08-29',
    recentUsage: [{ templateId: guarded.id, usedAt: '2026-08-25T00:00:00.000Z' }],
  })
  assert.equal(result.slots[0].videoSubfamilia, '3a')
  assert.equal(result.selections.size, 0)
})

test('una asignación visual de cliente no se filtra a clientes sin override', () => {
  const scoped = template({ metadata: { client_scoped: true } })
  const result = apply([slot()], [scoped])
  assert.equal(result.slots[0].videoSubfamilia, '3a')
  assert.equal(result.selections.size, 0)
})

test('un diseño compatible preserva la familia de copy y expone sus reglas visuales', () => {
  const visual = template({
    type: 'carrusel',
    generator_key: 'carrusel_organico',
    metadata: { client_scoped: true, preserve_slot_family: true },
    overrides: [{
      id: 'override-visual', template_id: 'template-1', client_id: 'client-1', salida_id: salida.id,
      enabled: true,
      custom_rules: { families: ['lugar'], drive_template_name: 'main.hbs' },
      vigente_desde: null, vigente_hasta: null,
      created_at: '2026-08-29T00:00:00.000Z', updated_at: '2026-08-29T00:00:00.000Z',
    }],
  })
  const original = slot({ formatoContenido: 'carrusel', videoSubfamilia: undefined, formatoCarrusel: 'lugar' })
  const result = apply([original], [visual])
  assert.equal(result.slots[0].formatoCarrusel, 'lugar')
  assert.equal(result.selections.get(0).customRules.drive_template_name, 'main.hbs')
})

test('una asignación explícita del cliente tiene prioridad sobre templates globales', () => {
  const global = template({
    id: 'global-template',
    type: 'carrusel',
    generator_key: 'carrusel_organico',
    rotation_weight: 100,
  })
  const client = template({
    id: 'client-template',
    type: 'carrusel',
    generator_key: 'carrusel_organico',
    metadata: { client_scoped: true, preserve_slot_family: true },
    overrides: [{
      id: 'client-override', template_id: 'client-template', client_id: 'client-1', salida_id: salida.id,
      enabled: true, custom_rules: { families: ['lugar'], drive_template_name: 'brand_guidelines_23.hbs' },
      vigente_desde: null, vigente_hasta: null,
      created_at: '2026-08-29T00:00:00.000Z', updated_at: '2026-08-29T00:00:00.000Z',
    }],
  })
  const carouselSlot = slot({ formatoContenido: 'carrusel', videoSubfamilia: undefined, formatoCarrusel: 'lugar' })
  const result = apply([carouselSlot], [global, client])
  assert.equal(result.selections.get(0).templateId, 'client-template')
})

test('dos slots de la misma familia agotan diseños distintos antes de repetir', () => {
  const first = template({
    id: 'banner-a',
    type: 'banner',
    generator_key: 'banner_molde_6',
    overrides: [{
      id: 'override-a', template_id: 'banner-a', client_id: 'client-1', salida_id: salida.id,
      enabled: true, custom_rules: { families: ['molde_6'], template_library_id: 'library-a' },
      vigente_desde: null, vigente_hasta: null,
      created_at: '2026-08-29T00:00:00.000Z', updated_at: '2026-08-29T00:00:00.000Z',
    }],
  })
  const second = template({
    id: 'banner-b',
    type: 'banner',
    generator_key: 'banner_molde_6',
    overrides: [{
      id: 'override-b', template_id: 'banner-b', client_id: 'client-1', salida_id: salida.id,
      enabled: true, custom_rules: { families: ['molde_6'], template_library_id: 'library-b' },
      vigente_desde: null, vigente_hasta: null,
      created_at: '2026-08-29T00:00:00.000Z', updated_at: '2026-08-29T00:00:00.000Z',
    }],
  })
  const slots = [3, 7].map(index => slot({
    index,
    formatoContenido: 'banner',
    videoSubfamilia: undefined,
    bannerMolde: 6,
  }))
  const result = apply(slots, [first, second])
  assert.equal(result.selections.size, 2)
  assert.notEqual(result.selections.get(3).templateId, result.selections.get(7).templateId)
})
