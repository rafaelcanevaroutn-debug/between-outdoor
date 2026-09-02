import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../lib/google-drive.ts', import.meta.url), 'utf8')
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

const module = { exports: {} }
vm.runInNewContext(transpiled, {
  module,
  exports: module.exports,
  require(specifier) {
    if (specifier === 'googleapis') return { google: {} }
    if (specifier === 'node:path') return {}
    if (specifier === 'node:fs') return {}
    if (specifier === './material-context/video-material-selection.ts') {
      return { selectVideoMaterialCandidate() { return null } }
    }
    throw new Error(`Unexpected dependency: ${specifier}`)
  },
  process: { env: {} },
  console,
})

const { selectClientMediaLibraryFolder } = module.exports

test('elige la biblioteca de imágenes sin confundir recursos técnicos', () => {
  const folders = [
    { id: 'generated', name: 'contenido generado' },
    { id: 'resources', name: 'recursos' },
    { id: 'photos', name: 'Banco de Imágenes' },
    { id: 'videos', name: 'videos crudos' },
  ]

  assert.deepEqual(selectClientMediaLibraryFolder(folders, 'fotos'), folders[2])
})

test('elige la biblioteca de videos sin exponer las carpetas hermanas', () => {
  const folders = [
    { id: 'resources', name: 'RECURSOS' },
    { id: 'videos', name: 'Vídeos_Crudos' },
    { id: 'photos', name: 'destinos-de-imágenes' },
  ]

  assert.deepEqual(selectClientMediaLibraryFolder(folders, 'videos'), folders[1])
})

test('no inventa una biblioteca cuando no hay una carpeta compatible', () => {
  const folders = [
    { id: 'generated', name: 'contenido generado' },
    { id: 'resources', name: 'recursos' },
  ]

  assert.equal(selectClientMediaLibraryFolder(folders, 'fotos'), null)
  assert.equal(selectClientMediaLibraryFolder(folders, 'videos'), null)
})
