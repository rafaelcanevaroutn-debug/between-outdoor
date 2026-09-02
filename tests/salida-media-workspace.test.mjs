import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../lib/salida-media-workspace.ts', import.meta.url), 'utf8')
const transpiled = ts.transpileModule(source, {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText
const module = {exports: {}}
vm.runInNewContext(transpiled, {module, exports: module.exports})

const {extractSalidaMaterialTopics, preferredSalidaMediaFolderName} = module.exports

test('propone lugares reales del itinerario y puntos de interés sin duplicarlos', () => {
  const topics = extractSalidaMaterialTopics({
    puntos_interes: [
      {nombre: 'Coco Bongo'},
      {nombre: 'Isla Mujeres'},
    ],
    itinerario_dias: [
      {titulo: 'Coco Bongo', hito: 'Noche en Coco Bongo'},
      {titulo: 'Hotel Riu', hito: null},
    ],
  })

  assert.deepEqual([...topics], ['Coco Bongo', 'Isla Mujeres', 'Noche en Coco Bongo', 'Hotel Riu'])
})

test('usa el destino como raíz si la salida antes apuntaba a una escena específica', () => {
  assert.equal(
    preferredSalidaMediaFolderName(
      {nombre: 'Caribe 2027', destino: 'Cancún'},
      'Cancún/Coco Bongo',
    ),
    'Cancún',
  )
})

test('sin ruta previa usa destino y luego nombre como fallback', () => {
  assert.equal(preferredSalidaMediaFolderName({nombre: 'Caribe 2027', destino: 'Cancún'}), 'Cancún')
  assert.equal(preferredSalidaMediaFolderName({nombre: 'Caribe 2027', destino: ''}), 'Caribe 2027')
})
