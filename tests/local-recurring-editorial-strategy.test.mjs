import test from 'node:test'
import assert from 'node:assert/strict'
import {
  detectLocalRecurringMotifs,
  localCopyRepeatsPrevious,
  localCopySimilarity,
  localAxisMismatch,
  localRecurringFallback,
  localRecurringWeeklyAxes,
} from '../lib/local-recurring-editorial-strategy.ts'

test('cada semana local distribuye diez intenciones y limita comunidad a una pieza', () => {
  for (let week = 0; week < 4; week += 1) {
    const axes = localRecurringWeeklyAxes(week)
    assert.equal(axes.length, 10)
    assert.equal(axes.filter(axis => axis === 'comunidad').length, 1)
    assert.ok(axes.includes('bienestar'))
    assert.ok(axes.includes('habito'))
    assert.ok(axes.includes('descubrimiento'))
  }
})

test('detecta paráfrasis de la misma promesa grupal aunque cambien algunas palabras', () => {
  const previous = ['Llegaste solo y volviste con tu grupo.']
  assert.ok(localCopySimilarity('Llegás solo. Volvés con grupo.', previous[0]) >= 0.46)
  assert.equal(localCopyRepeatsPrevious('POV: cambiaste pantalla por aire libre.', previous, 'bienestar'), false)
  assert.equal(localCopyRepeatsPrevious('POV: ahora salís acompañado con el grupo.', previous, 'bienestar'), true)
})

test('clasifica motivos editoriales distintos y limita el meme de terapia', () => {
  assert.deepEqual(detectLocalRecurringMotifs('Reservá un rato esta semana para caminar.'), ['habito', 'tiempo', 'plan_semana'])
  assert.equal(localCopyRepeatsPrevious('La terapia: caminar.', ['Hoy toca terapia de cerro.'], 'alcance'), true)
})

test('alcance no recicla el mismo recurso de humor en semanas seguidas', () => {
  assert.equal(
    localCopyRepeatsPrevious('POV: tu sillón no entiende por qué salís.', ['POV: el sillón ya no se acuerda de vos.'], 'alcance'),
    true,
  )
  assert.equal(
    localCopyRepeatsPrevious('POV: la alarma del finde sí se escucha.', ['POV: el sillón ya no se acuerda de vos.'], 'alcance'),
    false,
  )
})

test('los fallbacks locales respetan el eje en vez de volver siempre al grupo', () => {
  assert.match(localRecurringFallback('3b', 'bienestar', 0), /^POV:/)
  assert.doesNotMatch(localRecurringFallback('3b', 'bienestar', 0), /grupo|solo|acompañado/iu)
  assert.match(localRecurringFallback('3d', 'objeciones', 0), /nivel|ritmo/iu)
  assert.match(localRecurringFallback('3c', 'alcance', 0), /escaleras/iu)
})

test('rechaza cuando Gemini confunde hábito u objeciones con frases vagas de salud mental', () => {
  assert.match(localAxisMismatch('La cabeza da mil vueltas.', 'habito'), /HÁBITO/u)
  assert.equal(localAxisMismatch('Reservá un rato esta semana para caminar.', 'habito'), null)
  assert.match(localAxisMismatch('Mi escape es el cerro.', 'objeciones'), /OBJECIONES/u)
  assert.equal(localAxisMismatch('Consultá el nivel y empezá a tu ritmo.', 'objeciones'), null)
})
