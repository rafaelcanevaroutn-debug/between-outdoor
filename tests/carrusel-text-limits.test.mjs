import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EXEMPT_PILL_TEXT_HARD_LIMIT,
  LIMITS_BY_FORMAT,
  decideAdaptiveTextLimitAction,
  truncateAtWord,
  truncateSafeAdaptiveFields,
  validateAdaptiveTextLimits,
} from '../lib/generators/carrusel-text-limits.ts'

function slide(overrides = {}) {
  return {
    n_slide: 1,
    rol: 'portada',
    tipo: 'texto',
    pill_text: null,
    texto_principal: 'Texto breve',
    texto_apoyo: null,
    indicacion_imagen: 'Imagen general',
    hablante: null,
    ...overrides,
  }
}

function output(overrides = {}) {
  return {
    angulo: 'Ángulo breve',
    descripcion: 'Descripción breve.',
    cta: 'Comentá INFO y te enviamos toda la info.',
    slides: [slide()],
    ...overrides,
  }
}

test('define los límites editoriales base y descripciones por formato', () => {
  for (const limits of Object.values(LIMITS_BY_FORMAT)) {
    assert.equal(limits.pill_text, 18)
    assert.equal(limits.texto_principal, 60)
    assert.equal(limits.texto_apoyo, 180)
    assert.equal(limits.cta_comentario, 80)
    assert.equal(limits.angulo, 100)
  }
  assert.equal(LIMITS_BY_FORMAT.organico.descripcion_post, 650)
  assert.equal(LIMITS_BY_FORMAT.conversacion.descripcion_post, 300)
  assert.equal(LIMITS_BY_FORMAT.ascenso.descripcion_post, 500)
  assert.equal(LIMITS_BY_FORMAT.itinerario.descripcion_post, 750)
  assert.equal(LIMITS_BY_FORMAT.calendario.descripcion_post, 750)
  assert.equal(LIMITS_BY_FORMAT.lugar.descripcion_post, 750)
})

test('corta en palabra completa', () => {
  assert.equal(truncateAtWord('uno dos tres cuatro', 12), 'uno dos')
  assert.ok(truncateAtWord('palabralarguisima', 8).length <= 8)
})

test('reintenta antes de truncar un campo seguro y trunca solo al final', () => {
  const validation = validateAdaptiveTextLimits('organico', output({
    angulo: 'a'.repeat(120),
    slides: [slide({ texto_principal: 'Una frase orgánica deliberadamente extensa para comprobar el recorte seguro en palabra completa' })],
  }))
  assert.ok(validation.violations.every(item => item.strategy === 'truncate'))
  assert.equal(decideAdaptiveTextLimitAction(validation, 1, 2), 'retry')
  assert.equal(decideAdaptiveTextLimitAction(validation, 2, 2), 'truncate')
  const truncated = truncateSafeAdaptiveFields(output({
    angulo: 'a'.repeat(120),
    slides: [slide({ texto_principal: 'Una frase orgánica deliberadamente extensa para comprobar el recorte seguro en palabra completa' })],
  }), validation.violations)
  assert.ok(truncated.angulo.length <= 100)
  assert.ok((truncated.slides[0].texto_principal?.length ?? 0) <= 60)
})

test('CTA, descripción, fechas y datos técnicos son retry-only', () => {
  const validation = validateAdaptiveTextLimits('itinerario', output({
    cta: `Comentá ${'INFORMACION'.repeat(9)} y te enviamos toda la info.`,
    descripcion: 'x'.repeat(751),
    slides: [slide({
      rol: 'cierre',
      texto_principal: 'Salida confirmada el 27 de diciembre de 2026 con un recorrido de 25 km y dificultad media a exigente.',
      texto_apoyo: 'dato '.repeat(50),
    })],
  }))
  assert.ok(validation.violations.length >= 4)
  assert.ok(validation.violations.every(item => item.strategy === 'retry'))
  assert.equal(decideAdaptiveTextLimitAction(validation, 2, 2), 'reject')
})

test('conserva etiquetas verificadas hasta 60 caracteres y advierte si superan ese techo', () => {
  const acceptedLabel = 'Miradores de los Cóndores y de las Águilas'
  const accepted = validateAdaptiveTextLimits('lugar', output({
    slides: [slide({ rol: 'desarrollo', pill_text: acceptedLabel })],
  }), { protectedLabels: [acceptedLabel] })
  assert.equal(accepted.violations.length, 0)
  assert.equal(accepted.warnings.length, 0)

  const veryLongLabel = 'L'.repeat(EXEMPT_PILL_TEXT_HARD_LIMIT + 5)
  const warned = validateAdaptiveTextLimits('lugar', output({
    slides: [slide({ rol: 'desarrollo', pill_text: veryLongLabel })],
  }), { protectedLabels: [veryLongLabel] })
  assert.equal(warned.violations.length, 0)
  assert.equal(warned.warnings.length, 1)
})

test('no trunca nombres protegidos dentro de copy narrativo', () => {
  const name = 'Laguna de los Tres'
  const validation = validateAdaptiveTextLimits('ascenso', output({
    angulo: `${'Un ángulo factual sobre el recorrido '.repeat(4)}${name}`,
    slides: [slide({
      rol: 'desarrollo',
      texto_principal: `Caminamos hasta ${name} y seguimos el recorrido documentado durante toda la jornada.`,
    })],
  }), { protectedTerms: [name] })
  assert.ok(validation.violations.every(item => item.strategy === 'retry'))
})

test('permite hasta 125 caracteres en el diálogo acumulado', () => {
  const validation = validateAdaptiveTextLimits('conversacion', output({
    slides: [slide({ tipo: 'dialogo', rol: 'desarrollo', texto_principal: 'a'.repeat(120) })],
  }))
  assert.equal(validation.violations.length, 0)
})
