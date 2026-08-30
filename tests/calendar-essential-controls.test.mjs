import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('el calendario mantiene el control para borrar toda la semana', () => {
  const calendar = fs.readFileSync('components/calendario/SemanaGenerada.tsx', 'utf8')
  const clearButton = fs.readFileSync('components/calendario/ClearCalendarButton.tsx', 'utf8')
  assert.match(calendar, /<ClearCalendarButton/)
  assert.match(clearButton, /Borrar calendario/)
  assert.match(clearButton, /clear-week/)
})

test('el preview de video inicia muteado y permite activar el sonido', () => {
  const preview = fs.readFileSync('components/contenido/SocialPostPreviewModal.tsx', 'utf8')
  assert.match(preview, /useState\(true\)/)
  assert.match(preview, /muted=\{videoMuted\}/)
  assert.match(preview, /Activar sonido/)
  assert.match(preview, /Silenciar video/)
})

test('las miniaturas no descargan todos los videos completos al abrir el calendario', () => {
  const pieceCell = fs.readFileSync('components/calendario/SemanaGeneradaPieceCell.tsx', 'utf8')
  assert.match(pieceCell, /preload="metadata"/)
  assert.doesNotMatch(pieceCell, /media\?full=1/)
})
