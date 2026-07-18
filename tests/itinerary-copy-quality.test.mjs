import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findForbiddenItineraryCopy,
  itineraryAngleMatchesCover,
} from '../lib/generators/itinerary-copy-quality.ts'

test('detecta los clichés prohibidos con tilde, género, número y mayúsculas', () => {
  const cases = [
    'un lugar ÚNICO',
    'vistas únicas',
    'un paisaje increíble',
    'jornadas inolvidables',
    'un sendero épico',
    'aventuras épicas',
    'recargar energías',
    'VALE LA PENA',
  ]
  for (const value of cases) assert.ok(findForbiddenItineraryCopy(value), value)
})

test('no confunde palabras más largas con los términos prohibidos', () => {
  for (const value of ['únicamente datos', 'el epicentro del recorrido', 'un valor increíblemente alto']) {
    assert.equal(findForbiddenItineraryCopy(value), null, value)
  }
})

test('compara ángulo y portada sin puntuación ni tildes, pero sin borrar palabras', () => {
  assert.equal(
    itineraryAngleMatchesCover('El Chaltén: 7 días de trekking', '¿EL CHALTEN — 7 DÍAS DE TREKKING?'),
    true,
  )
  assert.equal(
    itineraryAngleMatchesCover('Laguna de los Tres', 'Laguna Tres'),
    false,
  )
  assert.equal(
    itineraryAngleMatchesCover('Tensión entre rutina y montaña', '¿Cuántos días tardás en olvidarte del reloj?'),
    false,
  )
})
