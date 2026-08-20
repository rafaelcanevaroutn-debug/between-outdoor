import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  evaluateBannerMolde1ItemsEligibility,
  MAX_BANNER_ITEMS,
  MIN_BANNER_ITEMS,
} from '../lib/generators/banner-molde-1-items-contract.ts'

const generatorSource = fs.readFileSync(
  path.join(process.cwd(), 'lib/generators/banner-molde-1-items.ts'),
  'utf8',
)
const contractSource = fs.readFileSync(
  path.join(process.cwd(), 'lib/generators/banner-molde-1-items-contract.ts'),
  'utf8',
)

test('objetivo 2-3 ítems, no 4-5 como 2a', () => {
  assert.equal(MIN_BANNER_ITEMS, 2)
  assert.equal(MAX_BANNER_ITEMS, 3)
})

test('reusa el mecanismo de lista cerrada de 2a — lugares verificados atómicos, no texto libre', () => {
  assert.match(generatorSource, /from '\.\/video-family-2-contract\.ts'/)
  assert.match(generatorSource, /normalizeListicleItems/)
  assert.match(generatorSource, /Copialos EXACTAMENTE como están/)
  assert.match(contractSource, /verifiedVideoPlaces/)
  assert.match(contractSource, /isAtomicVerifiedPlace/)
})

test('es una sola etapa con máximo dos intentos y corrección dirigida', () => {
  assert.match(generatorSource, /const MAX_GENERATION_ATTEMPTS = 2/)
  assert.equal((generatorSource.match(/generateWithRetryTracked\(/g) ?? []).length, 1)
  assert.match(generatorSource, /CORRECCIÓN DIRIGIDA/)
})

test('evaluateBannerMolde1ItemsEligibility filtra candidatos por el cap de banner (parámetro), no por WINDOW_MAX_CHARACTERS de video', () => {
  const salidaConLugaresCortos = {
    puntos_interes: [
      { nombre: 'Ojo del Albino', descripcion: '', ubicacion: null, distancia: null, duracion: null, dificultad: null },
      { nombre: 'Cerro Mogote', descripcion: '', ubicacion: null, distancia: null, duracion: null, dificultad: null },
      { nombre: 'Mirador del Valle de los Cóndores', descripcion: '', ubicacion: null, distancia: null, duracion: null, dificultad: null },
    ],
    itinerario_dias: [],
  }
  const wideCap = evaluateBannerMolde1ItemsEligibility(salidaConLugaresCortos, 40)
  assert.equal(wideCap.eligible, true)
  assert.equal(wideCap.candidateCount, 3)

  const narrowCap = evaluateBannerMolde1ItemsEligibility(salidaConLugaresCortos, 5)
  assert.equal(narrowCap.eligible, false)
  assert.equal(narrowCap.candidateCount, 0)
})

test('no toca ni importa el generador legado de video ni video-familia-2.ts', () => {
  assert.doesNotMatch(generatorSource, /from '\.\/video-familia-2\.ts'/)
  assert.doesNotMatch(generatorSource, /generators\/video['"]/)
})
