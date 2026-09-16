import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EXEMPT_PILL_TEXT_HARD_LIMIT,
  LIMITS_BY_FORMAT,
  resolveAdaptiveTextLimits,
  truncateAtWord,
  truncateDescriptionPreservingCta,
  truncateOptionalLabel,
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
  assert.equal(LIMITS_BY_FORMAT.itinerario.descripcion_post, 1500)
  assert.equal(LIMITS_BY_FORMAT.calendario.descripcion_post, 750)
  assert.equal(LIMITS_BY_FORMAT.lugar.descripcion_post, 750)
})

test('corta en palabra completa', () => {
  assert.equal(truncateAtWord('uno dos tres cuatro', 12), 'uno dos')
  assert.ok(truncateAtWord('palabralarguisima', 8).length <= 8)
})

test('el truncado opcional de pill nunca deja preguntas o exclamaciones abiertas', () => {
  assert.equal(truncateOptionalLabel('¿LO MÁS IMPORTANTE?', 18), null)
  assert.equal(truncateOptionalLabel('¡ESTO ES MUY IMPORTANTE!', 18), null)
})

test('el truncado opcional de pill elimina conectores finales y no corta un único token', () => {
  assert.equal(truncateOptionalLabel('PREGUNTA SOBRE EL EQUIPO COMPLETO', 20), 'PREGUNTA')
  assert.equal(truncateOptionalLabel('DETALLES PARA EL VIAJE COMPLETO', 18), 'DETALLES')
  assert.equal(truncateOptionalLabel('PALABRAEXCESIVAMENTELARGA', 18), null)
  assert.equal(truncateOptionalLabel('PASO 1', 18), 'PASO 1')
})

test('el ángulo se trunca y se acepta sin consumir reintentos en los seis formatos', () => {
  for (const format of ['organico', 'conversacion', 'itinerario', 'ascenso', 'calendario', 'lugar']) {
    const candidate = output({
      angulo: `Laguna de los Tres ${'contexto interno '.repeat(10)}`,
    })
    const validation = validateAdaptiveTextLimits(format, candidate, {
      protectedTerms: ['Laguna de los Tres'],
    })
    const resolution = resolveAdaptiveTextLimits(candidate, validation, 1, 5)

    assert.equal(validation.violations.find(item => item.field === 'angulo')?.strategy, 'truncate', format)
    assert.equal(resolution.action, 'accept', format)
    assert.equal(resolution.validation.violations.length, 0, format)
    assert.ok(resolution.output.angulo.length <= LIMITS_BY_FORMAT[format].angulo, format)
  }
})

test('reintenta un texto principal levemente excedido y lo trunca solo al final', () => {
  const principal = 'frase '.repeat(12).trim()
  assert.ok(principal.length > 60 && principal.length <= 72)
  const candidate = output({ slides: [slide({ texto_principal: principal })] })
  const validation = validateAdaptiveTextLimits('organico', candidate)

  assert.equal(validation.violations[0]?.strategy, 'truncate')
  const firstAttempt = resolveAdaptiveTextLimits(candidate, validation, 1, 2)
  assert.equal(firstAttempt.action, 'retry')
  assert.equal(firstAttempt.output.slides[0].texto_principal, principal)

  const finalAttempt = resolveAdaptiveTextLimits(candidate, validation, 2, 2)
  assert.equal(finalAttempt.action, 'accept')
  assert.ok((finalAttempt.output.slides[0].texto_principal?.length ?? 0) <= 60)
  assert.equal(finalAttempt.output.slides[0].texto_principal, 'frase frase frase frase frase frase frase frase frase frase')
})

test('el recorte del principal no deja conectores ni puntuación colgados', () => {
  const principal = 'Incluye una pausa clara, un sendero breve, y contenido adicional'
  assert.ok(principal.length > 60 && principal.length <= 72)
  const candidate = output({ slides: [slide({ texto_principal: principal })] })
  const validation = validateAdaptiveTextLimits('organico', candidate)
  const resolution = resolveAdaptiveTextLimits(candidate, validation, 2, 2)

  assert.equal(resolution.action, 'accept')
  assert.doesNotMatch(resolution.output.slides[0].texto_principal ?? '', /(?:[,;:\-–—]|\b(?:y|o|e|u|de|con|para|a|en|por|sin))$/iu)
})

test('CTA, fechas y datos técnicos siguen siendo retry-only', () => {
  const validation = validateAdaptiveTextLimits('itinerario', output({
    cta: `Comentá ${'INFORMACION'.repeat(9)} y te enviamos toda la info.`,
    slides: [slide({
      rol: 'cierre',
      texto_principal: 'Salida confirmada el 27 de diciembre de 2026 con un recorrido de 25 km y dificultad media a exigente.',
      texto_apoyo: 'dato '.repeat(50),
    })],
  }))
  assert.ok(validation.violations.length >= 3)
  assert.ok(validation.violations.every(item => item.strategy === 'retry'))
  assert.equal(resolveAdaptiveTextLimits(output({
    cta: `Comentá ${'INFORMACION'.repeat(9)} y te enviamos toda la info.`,
    slides: [slide({
      rol: 'cierre',
      texto_principal: 'Salida confirmada el 27 de diciembre de 2026 con un recorrido de 25 km y dificultad media a exigente.',
      texto_apoyo: 'dato '.repeat(50),
    })],
  }), validation, 2, 2).action, 'reject')
})

test('Itinerario reintenta una descripción larga y al final la trunca preservando el CTA', () => {
  const cta = 'Comentá CHALTÉN y te enviamos toda la info.'
  const longDescription = `${'Recorremos senderos y puntos cargados por el cliente sin sumar datos inventados. '.repeat(20)}\n\n${cta}`
  const candidate = output({ descripcion: longDescription, cta })
  const validation = validateAdaptiveTextLimits('itinerario', candidate)
  assert.deepEqual(validation.violations.map(item => item.field), ['descripcion_post'])
  assert.equal(validation.violations[0].strategy, 'truncate')
  assert.equal(resolveAdaptiveTextLimits(candidate, validation, 1, 5).action, 'retry')
  assert.equal(resolveAdaptiveTextLimits(candidate, validation, 4, 5).action, 'retry')

  const finalAttempt = resolveAdaptiveTextLimits(candidate, validation, 5, 5)
  assert.equal(finalAttempt.action, 'accept')
  assert.ok(finalAttempt.output.descripcion.length <= LIMITS_BY_FORMAT.itinerario.descripcion_post)
  assert.ok(finalAttempt.output.descripcion.endsWith(cta))
  assert.match(finalAttempt.output.descripcion.slice(0, -cta.length).trimEnd(), /[.!?]$/u)
})

test('en el último intento trunca la descripción aunque persistan otros errores duros', () => {
  const cta = 'Comentá CHALTÉN y te enviamos toda la info.'
  const candidate = output({
    descripcion: `${'Detalle fiel del recorrido cargado. '.repeat(50)}\n\n${cta}`,
    cta,
    slides: [slide({
      texto_principal: 'Salida confirmada el 27 de diciembre de 2026 con un recorrido de 25 km y dificultad media a exigente.',
    })],
  })
  const validation = validateAdaptiveTextLimits('itinerario', candidate)
  const resolution = resolveAdaptiveTextLimits(candidate, validation, 5, 5)

  assert.equal(resolution.action, 'reject')
  assert.ok(resolution.output.descripcion.length <= LIMITS_BY_FORMAT.itinerario.descripcion_post)
  assert.ok(resolution.output.descripcion.endsWith(cta))
  assert.ok(resolution.applied.some(item => item.field === 'descripcion_post'))
  assert.ok(resolution.validation.violations.every(item => item.field !== 'descripcion_post'))
  assert.ok(resolution.validation.violations.some(item => item.field.endsWith('.texto_principal')))
})

test('el truncado de descripción conserva literalmente el CTA configurado', () => {
  const cta = 'Escribinos por WhatsApp y te enviamos la información.'
  const value = `${'Detalle real del recorrido y de la salida. '.repeat(30)}\n\n${cta}`
  const result = truncateDescriptionPreservingCta(value, cta, 300)
  assert.ok(result.length <= 300)
  assert.ok(result.endsWith(cta))
  assert.equal(result.match(new RegExp(cta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))?.length, 1)
})

test('el truncado nunca cierra el cuerpo con una conjunción o preposición', () => {
  const cta = 'Comentá CHALTÉN y te enviamos toda la info.'
  const connectors = ['y', 'o', 'e', 'u', 'de', 'con', 'para', 'a', 'en', 'por', 'sin']
  for (const connector of connectors) {
    const body = `Incluye alojamiento, entradas y seguro ${connector} contenido que queda fuera del límite.`
    const bodyCut = body.indexOf('contenido')
    const limit = bodyCut + 2 + cta.length + 1
    const result = truncateDescriptionPreservingCta(`${body}\n\n${cta}`, cta, limit)
    const truncatedBody = result.slice(0, -cta.length).trimEnd()
    assert.doesNotMatch(truncatedBody, new RegExp(`\\b${connector}\\.$`, 'iu'), connector)
    assert.ok(result.endsWith(cta), connector)
  }
})

test('al sacar un conector también elimina la coma que queda expuesta', () => {
  const cta = 'Comentá CHALTÉN y te enviamos toda la info.'
  const body = 'Incluye alojamiento, seguro, y contenido descartable que no entra.'
  const bodyCut = body.indexOf('contenido')
  const limit = bodyCut + 2 + cta.length + 1
  const result = truncateDescriptionPreservingCta(`${body}\n\n${cta}`, cta, limit)
  assert.equal(result, `Incluye alojamiento, seguro.\n\n${cta}`)
})

test('sin CTA conserva un punto final válido', () => {
  const value = 'Incluye alojamiento. Texto adicional que queda fuera del límite.'
  const result = truncateDescriptionPreservingCta(value, null, value.indexOf('Texto') + 1)
  assert.equal(result, 'Incluye alojamiento.')
})

test('las descripciones de los seis formatos se truncan al final sin rechazar la pieza', () => {
  const cta = 'Comentá INFO y te enviamos toda la info.'
  for (const format of ['organico', 'conversacion', 'itinerario', 'ascenso', 'calendario', 'lugar']) {
    const limit = LIMITS_BY_FORMAT[format].descripcion_post
    const candidate = output({ descripcion: `${'Texto de contexto real. '.repeat(80)}\n\n${cta}`, cta })
    const validation = validateAdaptiveTextLimits(format, candidate)
    const descriptionViolation = validation.violations.find(item => item.field === 'descripcion_post')
    assert.equal(descriptionViolation?.strategy, 'truncate', format)
    const resolution = resolveAdaptiveTextLimits(candidate, validation, 2, 2)
    assert.equal(resolution.action, 'accept', format)
    assert.ok(resolution.output.descripcion.length <= limit, format)
    assert.ok(resolution.output.descripcion.endsWith(cta), format)
  }
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
  const candidate = output({
    angulo: `${'Un ángulo factual sobre el recorrido '.repeat(4)}${name}`,
    slides: [slide({
      rol: 'desarrollo',
      texto_principal: `Caminamos hasta ${name} y seguimos el recorrido documentado durante toda la jornada.`,
    })],
  })
  const validation = validateAdaptiveTextLimits('ascenso', candidate, { protectedTerms: [name] })
  assert.equal(validation.violations.find(item => item.field === 'angulo')?.strategy, 'truncate')
  assert.equal(validation.violations.find(item => item.field.endsWith('.texto_principal'))?.strategy, 'retry')

  const resolution = resolveAdaptiveTextLimits(candidate, validation, 2, 2)
  assert.equal(resolution.action, 'reject')
  assert.ok(resolution.output.angulo.length <= 100)
  assert.equal(resolution.output.slides[0].texto_principal, candidate.slides[0].texto_principal)
})

test('no trunca un principal que supera el margen del veinte por ciento', () => {
  const principal = 'frase '.repeat(13).trim()
  assert.ok(principal.length > 72)
  const candidate = output({ slides: [slide({ texto_principal: principal })] })
  const validation = validateAdaptiveTextLimits('organico', candidate)

  assert.equal(validation.violations[0]?.strategy, 'retry')
  assert.equal(resolveAdaptiveTextLimits(candidate, validation, 2, 2).action, 'reject')
})

test('permite hasta 125 caracteres en el diálogo acumulado', () => {
  const validation = validateAdaptiveTextLimits('conversacion', output({
    slides: [slide({ tipo: 'dialogo', rol: 'desarrollo', texto_principal: 'a'.repeat(120) })],
  }))
  assert.equal(validation.violations.length, 0)
})
