import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ADAPTIVE_VIDEO_TEMPLATE,
  readVideoVisualContract,
  resolveVideoVisualContract,
  supportsAdaptiveVideoTemplate,
} from '../lib/video-visual-contract.ts'

test('las familias especiales quedan fuera del rollout adaptativo', () => {
  assert.equal(supportsAdaptiveVideoTemplate('1a'), false)
  assert.equal(supportsAdaptiveVideoTemplate('1b'), false)
  assert.equal(supportsAdaptiveVideoTemplate('1c'), false)
})

test('lugar genera un formato geográfico premium, determinístico y sin assets externos', () => {
  const contract = resolveVideoVisualContract({
    subfamilia: '3e',
    typographyId: 'cormorant',
    secondaryTypographyId: 'plex',
    seed: 'piece-cancun',
  })
  assert.equal(contract.template_id, ADAPTIVE_VIDEO_TEMPLATE)
  assert.equal(contract.format, 'geo_minimal')
  assert.equal(contract.visual_language, 'premium_editorial')
  assert.equal(contract.presentation_mode, 'fixed_full_clip')
  assert.equal(contract.typography.primary_id, 'cormorant')
  assert.equal(contract.layout.zone, 'center')
  assert.deepEqual(contract.layout.preferred_zones, ['center'])
  assert.equal(contract.assets.scope, 'uploaded_material_only')
  assert.equal(readVideoVisualContract(contract)?.seed, 'piece-cancun')
})

test('un contrato incompleto no se considera válido', () => {
  assert.equal(readVideoVisualContract({contract_version: 2}), null)
})

test('información directa conserva el bloque centrado', () => {
  const contract = resolveVideoVisualContract({
    subfamilia: '4',
    typographyId: 'oswald',
    secondaryTypographyId: 'plex',
    seed: 'piece-directa-cancun',
  })
  assert.equal(contract?.format, 'direct_information')
  assert.equal(contract?.layout.zone, 'center')
  assert.deepEqual(contract?.layout.preferred_zones, ['center'])
})

test('storytelling usa un bloque central protegido del fondo', () => {
  const contract = resolveVideoVisualContract({
    subfamilia: '2b',
    typographyId: 'poppins',
    secondaryTypographyId: 'plex',
    seed: 'piece-story-cancun',
  })
  assert.equal(contract?.format, 'short_itinerary')
  assert.equal(contract?.layout.zone, 'center')
  assert.deepEqual(contract?.layout.preferred_zones, ['center'])
})
