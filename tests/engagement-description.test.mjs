import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateEngagementDescription,
  enforceCharacterLimit,
  cleanRedundantInfoPhrases,
} from '../lib/generators/engagement-description.ts'

test('generateEngagementDescription: no repite el copy del video en el pie de foto', () => {
  const videoCopy = 'Vení a caminar en Senderos de las Yungas'
  const result = generateEngagementDescription({
    destino: 'Yerba Buena',
    tipoViaje: 'salida_recurrente',
    isVideo: true,
    videoCopy,
    hashtags: '#trekking #yerbabuena',
  })

  // No debe contener el videoCopy como cuerpo repetido
  assert.ok(!result.includes(videoCopy), `El pie de foto no debe repetir "${videoCopy}"`)
  assert.ok(result.includes('Caminatas en grupo por Yerba Buena'), 'Debe generar texto complementario de valor')
  assert.ok(result.includes('Comentá YERBA BUENA o unite al grupo con el link en la bio.'), 'Debe tener CTA limpio')
  assert.ok(result.includes('#trekking #yerbabuena'), 'Debe incluir los hashtags si hay espacio')
})

test('generateEngagementDescription: si la descripción orgánica empieza con el copy del video, lo remueve', () => {
  const videoCopy = '¿Sabías que caminar en la selva reduce el estrés?'
  const organic = `${videoCopy}. Cada semana nos juntamos en Horco Molle para desconectar de la rutina.`
  const result = generateEngagementDescription({
    destino: 'Horco Molle',
    tipoViaje: 'salida_recurrente',
    isVideo: true,
    videoCopy,
    organicDescription: organic,
    hashtags: '#naturaleza',
  })

  // No debe tener el videoCopy repetido
  assert.ok(!result.startsWith(videoCopy), 'Debe remover el copy duplicado al inicio')
  assert.ok(result.includes('Cada semana nos juntamos en Horco Molle'), 'Conserva el texto orgánico complementario')
})

test('cleanRedundantInfoPhrases: limpia redundancias de "comentá INFO y te paso la info"', () => {
  const dirty = 'Si te interesa, comentá INFO y te paso toda la info. Nos vemos en el sendero.'
  const cleaned = cleanRedundantInfoPhrases(dirty, 'INFO')
  assert.ok(!cleaned.includes('te paso toda la info'), 'No debe tener redundancia de te paso info')
  assert.ok(cleaned.includes('Comentá INFO para sumarte.'), 'Reemplaza por invitación limpia')
})

test('enforceCharacterLimit: no corta palabras por la mitad (ej: Sender...) y omite hashtags si falta espacio', () => {
  const cta = 'Comentá YERBA BUENA o unite al grupo con el link en la bio.'
  const body = 'Vení a caminar en Senderos de las Yungas para conectar con la naturaleza y salir de la rutina.'
  const full = `${body}\n\n${cta}\n\n#trekking #naturaleza #argentina`

  // Con un límite donde hashtags no entran, debe omitir hashtags antes de recortar el cuerpo
  const limitedToBodyAndCta = enforceCharacterLimit(full, 160)
  assert.ok(!limitedToBodyAndCta.includes('#trekking'), 'Omite hashtags primero para preservar texto y CTA')
  assert.ok(limitedToBodyAndCta.includes(cta), 'Conserva el CTA intacto')

  // Con un límite muy apretado, no debe cortar palabras a la mitad tipo "Sender..."
  const tightLimit = enforceCharacterLimit(full, 85)
  // 85 caracteres con un CTA de ~60 chars: si el cuerpo no entra con al menos 15 caracteres limpios, devuelve el CTA completo
  assert.ok(!tightLimit.includes('Sender...'), 'No debe dejar palabras incompletas')
  assert.ok(tightLimit.includes(cta), 'Conserva el CTA limpio')
})

test('enforceCharacterLimit: respeta palabra completa al recortar párrafos únicos', () => {
  const singleParagraph = 'Salida de trekking grupal por los hermosos senderos tucumanos con guías especializados'
  const truncated = enforceCharacterLimit(singleParagraph, 40)
  // No debe cortar en "hermo..." ni nada por el estilo
  assert.ok(!truncated.endsWith('hermo...'), 'No corta a la mitad de una palabra')
  assert.ok(truncated.length <= 40, 'Respeta el límite numérico')
  assert.ok(truncated.endsWith('...'), 'Termina con puntos suspensivos en una palabra completa')
})
