import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { auditCommercialCopy } from '../lib/commercial-content-profiles.ts'
import { resolveRecurringMeetingDetails } from '../lib/recurring-meeting-details.ts'

const salida = {
  id: 'grupo-1',
  tipo_viaje: 'salida_recurrente',
  punto_encuentro: 'Rotonda Av. Perón',
  dias_semana: ['martes', 'jueves', 'sábado'],
  hora_encuentro: '08:00:00',
}

const onboarding = {
  content_profile: 'grupo_recurrente_local',
  campaign_context: {
    nombre_publico: 'Caminantes de Montaña',
    territorio: 'Tucumán',
    actividad: 'trekking',
    cta_primario: 'link_bio',
    frecuencia_confirmada: true,
    dias_confirmados: ['martes', 'jueves', 'sábado'],
  },
}

const carruselSource = fs.readFileSync('lib/generators/carrusel-formato.ts', 'utf8')
const videoSource = fs.readFileSync('lib/generators/video-familia-4.ts', 'utf8')

test('el encuentro recurrente produce siempre el bloque logístico completo', () => {
  const meeting = resolveRecurringMeetingDetails(onboarding, salida)
  assert.equal(meeting.complete, true)
  assert.equal(meeting.label, '📍 Rotonda Av. Perón · 🗓️ Martes · Jueves · Sábado · ⏰ 08:00')
  assert.deepEqual(meeting.visualItems, ['🗓️ MAR · JUE · SÁB', '⏰ 08:00', '📍 Rotonda Av. Perón'])
})

test('sin días u hora no habilita mostrar el punto de encuentro', () => {
  const meeting = resolveRecurringMeetingDetails(null, { ...salida, dias_semana: [], hora_encuentro: null })
  assert.equal(meeting.complete, false)
  assert.equal(meeting.label, null)
  assert.deepEqual(meeting.visualItems, [])
})

test('la auditoría rechaza el punto solo y acepta punto, días, hora y emojis', () => {
  assert.deepEqual(
    auditCommercialCopy('📍 Rotonda Av. Perón', onboarding, salida),
    ['Punto de encuentro mencionado sin sus días y hora completos'],
  )
  assert.deepEqual(
    auditCommercialCopy('📍 Rotonda Av. Perón · 🗓️ Martes · Jueves · Sábado · ⏰ 08:00', onboarding, salida),
    [],
  )
})

test('calendario e itinerario recurrentes usan el builder grupal determinista', () => {
  assert.match(carruselSource, /p\.formato === 'calendario' \|\| p\.formato === 'itinerario'/u)
  assert.match(carruselSource, /return buildRecurringGroupInfoCarrusel\(p, p\.formato\)/u)
  assert.match(carruselSource, /formato_carrusel: outputFormat/u)
})

test('el carrusel conserva cinco slides y el encuentro no se presenta como paisaje', () => {
  assert.match(carruselSource, /cantidad_slides: slides\.length/u)
  assert.match(carruselSource, /PUNTO DE ENCUENTRO/u)
  assert.match(carruselSource, /sin presentar el punto de encuentro como destino o paisaje/u)
})

test('Familia 4 recurrente resuelve el video fijo antes de llamar a Gemini', () => {
  const localBranch = videoSource.indexOf("if (contentProfile === 'grupo_recurrente_local')")
  const geminiLoop = videoSource.indexOf('for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++)')
  assert.ok(localBranch >= 0)
  assert.ok(geminiLoop > localBranch)
  assert.match(videoSource, /const scheduleItems = meeting\.complete \? meeting\.visualItems : \[\]/u)
  assert.match(videoSource, /datoDuro: scheduleLabel/u)
})
