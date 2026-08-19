import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../components/salidas/GenerateButton.tsx', import.meta.url), 'utf8')

test('la plataforma unifica banner y flyer en el motor productivo', () => {
  assert.match(source, /value: 'banner',\s+label: 'Banner \/ Flyer'/u)
  assert.doesNotMatch(source, /label: 'Flyer legado'/u)
  assert.match(source, /fetch\('\/api\/generate\/banner'/u)
})

test('permite elegir los seis moldes y envía el molde elegido', () => {
  for (let mold = 1; mold <= 6; mold += 1) {
    assert.match(source, new RegExp(`value: ${mold}, label: 'Molde ${mold}`))
  }
  assert.match(source, /moldType: bannerMoldType/u)
})

test('la foto es un archivo concreto de Drive y no una carpeta o URL libre', () => {
  assert.match(source, /api\/fotos\/archivos\?folderId=/u)
  assert.match(source, /mimeType\.startsWith\('image\/'\)/u)
  assert.match(source, /api\/fotos\/thumbnail\/\$\{image\.id\}/u)
  assert.match(source, /backgroundDriveFileId: bannerBackgroundFileId/u)
  assert.match(source, /!bannerBackgroundFileId/u)
})

test('Molde 4 exige otra salida y envía como máximo cuatro en total', () => {
  assert.match(source, /bannerRelatedSalidaIds\.length >= 3/u)
  assert.match(source, /bannerRelatedSalidaIds\.length < 1/u)
  assert.match(source, /salidaIds: \[salidaId, \.\.\.bannerRelatedSalidaIds\]/u)
})
