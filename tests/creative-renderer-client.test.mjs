import test from 'node:test'
import assert from 'node:assert/strict'
import {renderCreativePreview} from '../lib/creative-lab/renderer-client.ts'

const contract = {
  template_id: 'banner_molde_1', version: '1.0.0', piece_type: 'banner', mold_type: 1,
  dimensions: {width: 1080, height: 1350}, variant: 'dark',
  slots: {titulo: {type: 'text', required: true, max_chars: 40}},
  branding_tokens: ['--brand-primary', '--brand-secondary', '--brand-bg', '--brand-text', '--font-title', '--font-body'],
}
const branding = {primary: '#123456', secondary: '#234567', background: '#000000', text: '#ffffff', font_title: 'Inter', font_body: 'Inter'}

test('envía el contrato al endpoint seguro y devuelve PNG', async () => {
  let request
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])
  const result = await renderCreativePreview({
    contract, html: '<main></main>', mockData: {titulo: 'Tilcara'}, branding,
    config: {baseUrl: 'https://renderer.test/api/generar-video', token: 'secret', fetchImpl: async (url, init) => {
      request = {url, init, body: JSON.parse(init.body)}
      return new Response(png, {status: 200, headers: {'Content-Type': 'image/png'}})
    }},
  })
  assert.equal(request.url, 'https://renderer.test/api/render-preview')
  assert.equal(request.init.headers.Authorization, 'Bearer secret')
  assert.equal(request.body.mock_data.titulo, 'Tilcara')
  assert.deepEqual(result, png)
})

test('rechaza errores JSON y respuestas que no son PNG', async () => {
  await assert.rejects(() => renderCreativePreview({
    contract, html: 'x', mockData: {}, branding,
    config: {baseUrl: 'https://renderer.test', fetchImpl: async () => new Response('{"error":"overflow"}', {status: 422})},
  }), /HTTP 422.*overflow/u)
  await assert.rejects(() => renderCreativePreview({
    contract, html: 'x', mockData: {}, branding,
    config: {baseUrl: 'https://renderer.test', fetchImpl: async () => new Response('ok', {status: 200, headers: {'Content-Type': 'text/plain'}})},
  }), /formato inesperado/u)
})
