import test from 'node:test'
import assert from 'node:assert/strict'
import {validateLogoUpload} from '../lib/logo-upload.ts'

const bytes = (...values) => new Uint8Array([...values, ...new Array(16).fill(0)])

test('acepta firmas reales PNG, JPEG y WebP', () => {
  assert.equal(validateLogoUpload(bytes(137,80,78,71,13,10,26,10), 'image/png').extension, 'png')
  assert.equal(validateLogoUpload(bytes(255,216,255), 'image/jpeg').extension, 'jpg')
  assert.equal(validateLogoUpload(new Uint8Array(Buffer.from('RIFF0000WEBP0000')), 'image/webp').extension, 'webp')
})

test('rechaza SVG, MIME falso y archivos sobredimensionados', () => {
  assert.throws(() => validateLogoUpload(new Uint8Array(Buffer.from('<svg></svg>')), 'image/svg+xml'), /PNG, JPG o WebP/u)
  assert.throws(() => validateLogoUpload(bytes(0,0,0), 'image/png'), /no coincide/u)
  assert.throws(() => validateLogoUpload(new Uint8Array(2_000_001), 'image/png'), /menos de 2 MB/u)
})
