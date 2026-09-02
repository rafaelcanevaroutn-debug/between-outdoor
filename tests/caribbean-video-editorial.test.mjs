import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  buildCaribbeanEditorialPrompt,
  buildCaribbeanLocationFallbackCopy,
  caribbeanLocationCopyViolations,
  caribbeanContextViolations,
  caribbeanCopyRepeatsNarrativePattern,
  caribbeanEmergencyCopy,
  caribbeanVideoCopyViolations,
  countryFlagEmoji,
  detectCaribbeanNarrativePatterns,
  isCaribbeanBeachSalida,
  rotateCaribbeanCommercialEmoji,
} from '../lib/content-context/caribbean-editorial.ts'

const salida = {
  id: 'cancun-2027',
  user_id: 'renzo-franco',
  nombre: 'Cancún + Playa del Carmen 2027',
  destino: 'Cancún, México',
  pais_codigo: 'MX',
  tipo_viaje: 'viaje_playa_caribe',
  context_tags: ['entorno_caribe_playa', 'clima_calido_humedo', 'actividad_playa_descanso'],
  zona_geografica: 'Caribe / Playa',
  fecha_inicio: '2027-01-09',
  fecha_fin: '2027-01-17',
  precio_usd: 1000,
  sena_usd: 200,
  moneda: 'USD',
  cupos: 20,
  nivel: 'Inicial',
  puntos_interes: [],
  itinerario_dias: [],
  que_incluye: 'Alojamiento y traslados',
}

test('detecta Caribe por tipo o etiquetas y deriva la bandera del país', () => {
  assert.equal(isCaribbeanBeachSalida(salida), true)
  assert.equal(countryFlagEmoji('MX'), '🇲🇽')
  assert.equal(countryFlagEmoji(null), '')
})

test('el pack Caribe contiene los formatos observados y protege la especificidad del material', () => {
  const prompt = buildCaribbeanEditorialPrompt(salida)
  assert.match(prompt, /Ubicación mínima/)
  assert.match(prompt, /Bienvenida premium/)
  assert.match(prompt, /Destino \+ fecha/)
  assert.match(prompt, /dinero reservado para viajar/)
  assert.match(prompt, /Hotel, boliche, beach club/)
  assert.match(prompt, /prohibidos: montaña, cumbre/)
})

test('el fallback factual rota sin perder el destino verificado', () => {
  const copies = Array.from({length: 8}, (_, rotationIndex) => buildCaribbeanLocationFallbackCopy({
    destination: salida.destino,
    countryCode: salida.pais_codigo,
    rotationIndex,
  }))
  assert.equal(new Set(copies).size, 8)
  assert.ok(copies.every(copy => /Cancún/u.test(copy)))
  assert.match(copies[0], /^📍 Cancún, México 🇲🇽$/u)
  assert.match(copies[1], /^Welcome to\nCancún 🇲🇽$/u)
  assert.match(copies[2], /^🌴🐬🐚🌺\nCancún, México$/u)
})

test('la convocatoria comercial rota íconos sin alterar el copy', () => {
  const copies = Array.from({length: 7}, (_, rotationIndex) => rotateCaribbeanCommercialEmoji({
    copy: 'Armamos grupo para Cancún 🌴.',
    countryCode: 'MX',
    rotationIndex,
  }))
  assert.equal(new Set(copies).size, 7)
  assert.ok(copies.every(copy => copy.startsWith('Armamos grupo para Cancún ')))
  assert.match(copies[6], /🇲🇽\.$/u)
})

test('el validador permite creatividad pero exige destino, emoji y bandera correcta', () => {
  assert.deepEqual(caribbeanLocationCopyViolations({
    salida,
    copy: 'Por fin: Cancún 🐚',
  }), [])
  assert.match(caribbeanLocationCopyViolations({
    salida,
    copy: 'Welcome to Cancún 🇧🇷',
  }).join(' '), /bandera/u)
  assert.match(caribbeanLocationCopyViolations({
    salida,
    copy: 'Welcome to México 🇲🇽',
  }).join(' '), /destino verificado/u)
})

test('la salida Caribe rechaza contaminación de montaña pero admite lenguaje de playa', () => {
  assert.deepEqual(
    caribbeanContextViolations(salida, 'Cuando tu guía de montaña dice all inclusive'),
    ['una salida de playa/Caribe no puede heredar lenguaje de montaña o trekking'],
  )
  assert.deepEqual(caribbeanContextViolations(salida, 'El plan salió del chat y llegó al mar 🌴'), [])
})

test('POV y meme Caribe exigen emoji y los fallbacks cumplen el contrato', () => {
  assert.deepEqual(caribbeanVideoCopyViolations({
    salida,
    subfamilia: '3b',
    copy: 'POV: por fin llegaste al mar',
  }), ['Familia 3b requiere un emoji pertinente en esta rotación Caribe'])
  assert.match(caribbeanEmergencyCopy({subfamilia: '3b'}), /^POV: .+\p{Extended_Pictographic}$/u)
  assert.match(caribbeanEmergencyCopy({subfamilia: '3c'}), /\p{Extended_Pictographic}/u)
})

test('el meme Caribe necesita premisa y remate comprensibles sin depender del clip', () => {
  assert.deepEqual(caribbeanVideoCopyViolations({
    salida,
    subfamilia: '3c',
    copy: 'Necesito despejar la mente.\nCómo necesito despejarla: 🌊',
    rotationIndex: 6,
  }), [])
  assert.match(caribbeanVideoCopyViolations({
    salida,
    subfamilia: '3c',
    copy: 'No subo nada a redes.\nYo a los cinco minutos en la playa: 😂',
  }).join(' '), /reacción genérica/u)
  assert.match(caribbeanVideoCopyViolations({
    salida,
    subfamilia: '3c',
    copy: 'Necesito despejar la mente 🌊',
  }).join(' '), /exactamente dos líneas/u)
  assert.match(caribbeanVideoCopyViolations({
    salida,
    subfamilia: '3c',
    copy: 'Cuando prometí no subir nada del viaje.\nYo al primer día: 😂',
    rotationIndex: 3,
  }).join(' '), /poco natural/u)
  assert.match(caribbeanVideoCopyViolations({
    salida,
    subfamilia: '3c',
    copy: 'Antes odiaba el calor.\nAhora busco un vuelo al Caribe 🌴',
    rotationIndex: 6,
  }).join(' '), /desvió del mecanismo editorial/u)
  assert.deepEqual(caribbeanVideoCopyViolations({
    salida,
    subfamilia: '3c',
    copy: 'Necesito despejar la mente.\nCómo necesito despejarla: 🌊',
    rotationIndex: 6,
  }), [])
})

test('el fallback Caribe evita repetir un meme reciente aunque se repita la rotación', () => {
  const first = caribbeanEmergencyCopy({subfamilia: '3c', rotationIndex: 0})
  const second = caribbeanEmergencyCopy({subfamilia: '3c', rotationIndex: 0, avoidCopies: [first]})
  assert.notEqual(second, first)
})

test('la memoria Caribe reconoce el mismo mecanismo aunque cambie familia y redacción', () => {
  const previous = 'POV: el plan salió del chat y llegó al Caribe 🌴'
  const repeated = '¿Y el plan que no salía del chat?\nSalió: Cancún 🌊'
  assert.deepEqual(detectCaribbeanNarrativePatterns(previous), ['plan_salio_del_chat'])
  assert.deepEqual(detectCaribbeanNarrativePatterns(repeated), ['plan_salio_del_chat'])
  assert.equal(caribbeanCopyRepeatsNarrativePattern(repeated, [previous]), true)
  assert.match(caribbeanVideoCopyViolations({
    salida,
    subfamilia: '3d',
    copy: repeated,
    rotationIndex: 1,
    avoidCopies: [previous],
  }).join(' '), /repite un mecanismo narrativo/u)
})

test('el fallback cruza de mecanismo si otra familia ya usó plan + chat', () => {
  const copy = caribbeanEmergencyCopy({
    subfamilia: '3d',
    rotationIndex: 1,
    avoidCopies: ['POV: el plan salió del chat y llegó al Caribe 🌴'],
  })
  assert.equal(detectCaribbeanNarrativePatterns(copy).includes('plan_salio_del_chat'), false)
})

test('las primeras rotaciones de lugar exigen composiciones distintas', () => {
  assert.deepEqual(caribbeanVideoCopyViolations({
    salida, subfamilia: '3e', copy: '📍 Cancún, México 🇲🇽', rotationIndex: 0,
  }), [])
  assert.match(caribbeanVideoCopyViolations({
    salida, subfamilia: '3e', copy: '📍 Cancún 🇲🇽', rotationIndex: 1,
  }).join(' '), /bienvenida/u)
  assert.deepEqual(caribbeanVideoCopyViolations({
    salida, subfamilia: '3e', copy: 'Welcome to\nCancún 🇲🇽', rotationIndex: 1,
  }), [])
  assert.deepEqual(caribbeanVideoCopyViolations({
    salida, subfamilia: '3e', copy: 'Cancún\nMéxico 🇲🇽', rotationIndex: 3,
  }), [])
})

test('la ubicación con pin exige ciudad y país verificados', () => {
  const errors = caribbeanVideoCopyViolations({
    salida,
    subfamilia: '3e',
    copy: '📍 Cancún 🇲🇽',
    rotationIndex: 0,
  })
  assert.ok(errors.some(error => error.includes('país verificado')))
})

test('conversación Caribe debe responder la premisa que abre', () => {
  assert.match(caribbeanVideoCopyViolations({
    salida,
    subfamilia: '3d',
    copy: '¿Y el plan que no salía del chat?\nDonde ando: Cancún 🌴',
    rotationIndex: 1,
  }).join(' '), /resolver la pregunta sobre el plan/u)
  assert.deepEqual(caribbeanVideoCopyViolations({
    salida,
    subfamilia: '3d',
    copy: '¿Y el plan que no salía del chat?\nSalió: Cancún 🌴',
    rotationIndex: 1,
  }), [])
})

test('los generadores conectan el pack Caribe y la geografía de la salida', () => {
  const family2 = readFileSync(new URL('../lib/generators/video-familia-2.ts', import.meta.url), 'utf8')
  const family3 = readFileSync(new URL('../lib/generators/video-familia-3.ts', import.meta.url), 'utf8')
  const family4 = readFileSync(new URL('../lib/generators/video-familia-4.ts', import.meta.url), 'utf8')
  const places = readFileSync(new URL('../lib/generators/video-verified-places.ts', import.meta.url), 'utf8')
  assert.match(family2, /buildCaribbeanEditorialPrompt\(p\.salida\)/u)
  assert.match(family3, /buildCaribbeanFamily3Direction/u)
  assert.match(family3, /buildCaribbeanLocationFallbackVideo/u)
  assert.equal(family3.includes('return buildCaribbeanLocationFallbackVideo(p, typographyIds, clipDurationSeconds)\n  }'), false)
  assert.match(family4, /caribbeanEmergencyFixedInfoVideo/u)
  assert.match(places, /profile !== 'grupo_recurrente_local'/u)
})
