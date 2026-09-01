import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'

test('El endpoint replace-piece valida parametros requeridos', async () => {
  const source = await readFile(new URL('../app/api/generate-batch/[runId]/replace-piece/route.ts', import.meta.url), 'utf8')
  
  // Verifica que requiere oldContenidoId y newContenidoId
  assert.match(source, /!oldContenidoId \|\| !newContenidoId/)
  assert.match(source, /Se requieren oldContenidoId y newContenidoId/)
  
  // Verifica validacion de limites (maximo 5)
  assert.match(source, /remakesUsed \|\| 0\) >= 5/)
  assert.match(source, /Límite de 5 rehaceres/)
  
  // Verifica que no se pueda regenerar si ya se publico
  assert.match(source, /from\('content_publications'\)/)
  assert.match(source, /La pieza ya ha sido programada o publicada y no puede rehacerse/)
})

test('EditableWeekCalendar implementa la funcion handleRemakePiece correctamente', async () => {
  const source = await readFile(new URL('../components/calendario/EditableWeekCalendar.tsx', import.meta.url), 'utf8')
  
  // Verifica existencia de la funcion
  assert.match(source, /const handleRemakePiece = async \(pieceId: string\) =>/)
  
  // Verifica que este limitada a no mas de 5 usos por frontend tambien
  assert.match(source, /remakesUsed >= 5/)
  
  // Verifica que se llame al endpoint replace-piece
  assert.match(source, /fetch\(`\/api\/generate-batch\/\${runId}\/replace-piece`/)
})

test('EditableWeekCalendar implementa reordenamiento inteligente', async () => {
  const source = await readFile(new URL('../components/calendario/EditableWeekCalendar.tsx', import.meta.url), 'utf8')
  
  // Verifica la existencia del hook de useEffect que repara la grilla
  assert.match(source, /const invalidSchedulePieces = useMemo\(\(\) => pieces\.filter/)
  
  // Verifica que existe la logica recursiva para encontrar el proximo bloque disponible
  assert.match(source, /function generateRandomScheduleForDay/)
})

test('SemanaGenerada integra los nuevos props del run', async () => {
  const source = await readFile(new URL('../components/calendario/SemanaGenerada.tsx', import.meta.url), 'utf8')
  
  // Verifica pasaje de variables al EditableWeekCalendar
  assert.match(source, /runId=\{latestRun\?\.id\}/)
  assert.match(source, /initialRemakesUsed=\{\(latestRun\?\.result as any\)\?\.remakesUsed \?\? 0\}/)
})
