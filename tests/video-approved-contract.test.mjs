import test from 'node:test'
import assert from 'node:assert/strict'
import { rebuildApprovedVideoContract } from '../lib/video-approved-contract.ts'
import { buildFamiliesVideoPayload } from '../lib/mati-families-video-dispatch.ts'

const technicalContract = {
  tipografia_id: 'Montserrat',
  duracion_estimada_segundos: 8.5,
}

function row(overrides = {}) {
  return {
    titulo: 'Título editado',
    subtitulo: null,
    bullets: ['Item editado 1', 'Item editado 2'],
    cta: 'CTA editado',
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '2a',
      video_contract: {
        titulo: 'Título original',
        items: ['Original'],
        cta: 'CTA original',
        ...technicalContract,
      },
    },
    ...overrides,
  }
}

test('2a reconstruye desde columnas editables y conserva datos técnicos', () => {
  assert.deepEqual(rebuildApprovedVideoContract(row()), {
    ok: true,
    subfamilia: '2a',
    contract: {
      titulo: 'Título editado',
      items: ['Item editado 1', 'Item editado 2'],
      cta: 'CTA editado',
      ...technicalContract,
    },
  })
})

test('2b usa título, bullets y CTA actuales con cierre opcional', () => {
  assert.deepEqual(rebuildApprovedVideoContract(row({
    titulo: 'Apertura editada',
    bullets: ['Desarrollo editado'],
    cta: null,
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '2b',
      video_contract: {
        apertura: 'Original',
        desarrollo: ['Original'],
        cierre: 'Original',
        ...technicalContract,
      },
    },
  })), {
    ok: true,
    subfamilia: '2b',
    contract: {
      apertura: 'Apertura editada',
      desarrollo: ['Desarrollo editado'],
      ...technicalContract,
    },
  })
})

test('Familias 3 toman copy de titulo editado', () => {
  for (const subfamilia of ['3a', '3b', '3c', '3d', '3e']) {
    const result = rebuildApprovedVideoContract(row({
      titulo: `Copy editado ${subfamilia}`,
      bullets: [],
      cta: null,
      generation_metadata: {
        video_motor: 'familias',
        video_subfamilia: subfamilia,
        video_contract: { copy: 'Original', ...technicalContract },
      },
    }))
    assert.deepEqual(result, {
      ok: true,
      subfamilia,
      contract: { copy: `Copy editado ${subfamilia}`, ...technicalContract },
    })
  }
})

test('Familia 1b toma copy de título editado, mismo shape que Familia 3', () => {
  const result = rebuildApprovedVideoContract(row({
    titulo: 'Copy editado 1b',
    bullets: [],
    cta: null,
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '1b',
      video_contract: { copy: 'Original', tipografia_id: 'Montserrat', duracion_estimada_segundos: 15 },
    },
  }))
  assert.deepEqual(result, {
    ok: true,
    subfamilia: '1b',
    contract: { copy: 'Copy editado 1b', tipografia_id: 'Montserrat', duracion_estimada_segundos: 15 },
  })
})

test('Familia 4 reconstruye copy y dato duro desde título y subtítulo editables', () => {
  const result = rebuildApprovedVideoContract(row({
    titulo: 'Vamos a Tafí. Escribinos.',
    subtitulo: '8 de agosto',
    bullets: [],
    cta: null,
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '4',
      video_contract: { copy: 'Original', dato_duro: 'Original', ...technicalContract },
    },
  }))
  assert.deepEqual(result, {
    ok: true,
    subfamilia: '4',
    contract: {
      copy: 'Vamos a Tafí. Escribinos.',
      dato_duro: '8 de agosto',
      ...technicalContract,
    },
  })
})

test('Familia 4 anterior exige regeneración en lugar de inferir el dato duro', () => {
  const result = rebuildApprovedVideoContract(row({
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '4',
      video_contract: { copy: 'Todo junto', ...technicalContract },
    },
  }))
  assert.equal(result.ok, false)
  assert.match(result.error, /contrato anterior/u)
})

test('Familia 4 local preserva layout fijo, agenda editable y CTA', () => {
  const result = rebuildApprovedVideoContract(row({
    titulo: 'Trekking en grupo · Tucumán',
    subtitulo: 'JUE · VIE · SÁB',
    bullets: ['18:30 h'],
    cta: 'Sumate desde el link de la bio.',
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '4',
      video_contract: {
        copy: 'Original',
        dato_duro: 'Original',
        layout: 'local_fixed_info',
        ...technicalContract,
      },
    },
  }))
  assert.deepEqual(result, {
    ok: true,
    subfamilia: '4',
    contract: {
      copy: 'Trekking en grupo · Tucumán',
      dato_duro: 'JUE · VIE · SÁB',
      layout: 'local_fixed_info',
      items: ['18:30 h'],
      cta: 'Sumate desde el link de la bio.',
      ...technicalContract,
    },
  })
})

test('Familia 5 aprueba desde el contrato estructurado original, no desde título y bullets editados', () => {
  const result = rebuildApprovedVideoContract(row({
    titulo: 'Lugar editado que no debe despacharse',
    bullets: ['Dato libre editado que no debe despacharse'],
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '5',
      video_contract: {
        lugar: 'Sendero Laguna de los Tres',
        datos: [
          { etiqueta: 'distancia', valor: '26 km i/v' },
          { etiqueta: 'desnivel', valor: '1000 m' },
          { etiqueta: 'dificultad', valor: 'Alta' },
        ],
        tipografia_id: 'Montserrat',
        duracion_estimada_segundos: 7,
      },
    },
  }))
  assert.deepEqual(result, {
    ok: true,
    subfamilia: '5',
    contract: {
      lugar: 'Sendero Laguna de los Tres',
      datos: [
        { etiqueta: 'distancia', valor: '26 km i/v' },
        { etiqueta: 'desnivel', valor: '1000 m' },
        { etiqueta: 'dificultad', valor: 'Alta' },
      ],
      tipografia_id: 'Montserrat',
      duracion_estimada_segundos: 7,
    },
  })
})

test('flujo stateless de Ficha despacha el contrato preservado y concatena solo para transporte', () => {
  const approved = rebuildApprovedVideoContract(row({
    titulo: 'Edición libre que Mati no debe recibir',
    bullets: ['Altitud inventada: 9000 m'],
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '5',
      video_contract: {
        lugar: 'Sendero Torre',
        datos: [
          { etiqueta: 'distancia', valor: '20 km i/v' },
          { etiqueta: 'desnivel', valor: '700 m' },
          { etiqueta: 'dificultad', valor: 'Media' },
        ],
        tipografia_id: 'Montserrat',
        duracion_estimada_segundos: 7,
      },
    },
  }))
  assert.equal(approved.ok, true)
  if (!approved.ok) return

  const built = buildFamiliesVideoPayload({
    id: 'ficha-aprobada',
    subfamilia: approved.subfamilia,
    contract: approved.contract,
    generationMetadata: { video_folder_id: 'folder-id' },
    videoCrudo: 'Videos Ficha',
    mes: null,
    fechaInicio: '2026-12-27',
    ownerProfile: { company_name: 'Between', full_name: null },
    brandIdentity: {
      mati_cliente_id: 'between-mati',
      color_primario: '#000000',
      color_texto: '#ffffff',
      font_body: 'Inter',
      videos_folder_id: null,
    },
  })
  assert.equal(built.ok, true)
  if (!built.ok) return
  assert.equal(built.payload.title, 'Sendero Torre')
  assert.deepEqual(built.payload.bullets, [
    'Distancia: 20 km i/v',
    'Desnivel: 700 m',
    'Dificultad: Media',
  ])
  assert.doesNotMatch(JSON.stringify(built.payload), /9000/u)
})

test('Familia 1a aprueba el discurso editado y conserva los datos técnicos', () => {
  const result = rebuildApprovedVideoContract(row({
    titulo: 'Un discurso completo con arco y edición final.',
    bullets: [],
    cta: null,
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '1a',
      video_contract: {
        discurso: 'Un discurso completo con arco.',
        tipografia_id: 'Montserrat',
        duracion_estimada_segundos: 8,
      },
    },
  }))
  assert.deepEqual(result, {
    ok: true,
    subfamilia: '1a',
    contract: {
      discurso: 'Un discurso completo con arco y edición final.',
      tipografia_id: 'Montserrat',
      duracion_estimada_segundos: 8,
    },
  })
})

test('2c reconstruye desde columnas editables y conserva datos técnicos — mismo shape que 2a, contrato ya confirmado con Mati', () => {
  assert.deepEqual(rebuildApprovedVideoContract(row({
    titulo: '5 tips para Tilcara editado',
    bullets: ['Tip editado 1'],
    cta: 'CTA editado',
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '2c',
      video_contract: {
        titulo: 'Título original',
        items: ['Original'],
        cta: 'CTA original',
        ...technicalContract,
      },
    },
  })), {
    ok: true,
    subfamilia: '2c',
    contract: {
      titulo: '5 tips para Tilcara editado',
      items: ['Tip editado 1'],
      cta: 'CTA editado',
      ...technicalContract,
    },
  })
})

test('2c exige items y CTA antes de aprobar, igual que 2a', () => {
  const result = rebuildApprovedVideoContract(row({
    titulo: '5 tips para Tilcara editado',
    bullets: [],
    cta: null,
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '2c',
      video_contract: { titulo: 'Original', items: ['Original'], cta: 'Original', ...technicalContract },
    },
  }))
  assert.equal(result.ok, false)
  assert.match(result.error, /Consejos requiere items y CTA/u)
})

test('rechaza legacy, metadata incompleta y columnas requeridas vacías', () => {
  assert.equal(rebuildApprovedVideoContract(row({
    generation_metadata: { video_motor: 'legacy' },
  })).ok, false)
  assert.equal(rebuildApprovedVideoContract(row({
    generation_metadata: {
      video_motor: 'familias',
      video_subfamilia: '2a',
      video_contract: {},
    },
  })).ok, false)
  assert.equal(rebuildApprovedVideoContract(row({ titulo: ' ' })).ok, false)
})
