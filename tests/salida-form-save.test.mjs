import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const form = fs.readFileSync(new URL('../components/salidas/SalidaForm.tsx', import.meta.url), 'utf8')
const route = fs.readFileSync(new URL('../app/api/salidas/[id]/route.ts', import.meta.url), 'utf8')

test('editar una salida libera el botón aunque la ruta no cambie', () => {
  assert.match(form, /finally\s*\{/u)
  assert.match(form, /setLoading\(false\)/u)
  assert.match(form, /if \(isEditing\) \{/u)
  assert.match(form, /router\.refresh\(\)/u)
  assert.match(form, /Los cambios se guardaron correctamente/u)
})

test('la actualización tiene timeout y conserva errores accionables', () => {
  assert.match(form, /AbortController/u)
  assert.match(form, /20_000/u)
  assert.match(form, /responseText/u)
})

test('un cliente sólo puede editar sus propias salidas', () => {
  assert.match(route, /callerProfile\?\.role !== 'admin'/u)
  assert.match(route, /\.eq\('user_id', user\.id\)/u)
  assert.match(route, /Salida no encontrada/u)
})
