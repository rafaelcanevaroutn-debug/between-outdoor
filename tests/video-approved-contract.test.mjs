import test from 'node:test'
import assert from 'node:assert/strict'
import { rebuildApprovedVideoContract } from '../lib/video-approved-contract.ts'

const technicalContract = {
  tipografia_id: 'font-a',
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

test('Familias 3 y 4 toman copy de titulo editado', () => {
  for (const subfamilia of ['3a', '3b', '3c', '3d', '3e', '4']) {
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
