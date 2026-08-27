import test from 'node:test'
import assert from 'node:assert/strict'
import { generateAdaptiveCarrusel } from '../lib/generators/carrusel-formato.ts'
import { generateVideoFamilia4 } from '../lib/generators/video-familia-4.ts'
import { withLocalRecurringCtaRotation } from '../lib/commercial-content-profiles.ts'

const salida = {
  id: 'grupo-1',
  user_id: 'cliente-1',
  nombre: 'Trekking semanales',
  destino: 'Horco Molle',
  fecha_inicio: null,
  fecha_fin: null,
  tipo_viaje: 'salida_recurrente',
  estado: 'activa',
  frecuencia: 'semanal',
  dias_semana: ['martes', 'jueves', 'sábado'],
  lugares_recurrentes: ['Horco Molle', 'Aguas Chiquitas', 'Cascada de los Alisos'],
  punto_encuentro: 'Rotonda Av. Perón',
  grupo_info: {
    tipo_organizacion: 'grupo',
    actividad: 'trekking',
    requisitos: 'No necesitás experiencia previa',
    equipamiento: 'Calzado cómodo y agua',
  },
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
    destinos: ['Horco Molle', 'Aguas Chiquitas', 'Cascada de los Alisos'],
  },
}

test('calendario recurrente se convierte en información semanal del grupo', async () => {
  const output = await generateAdaptiveCarrusel({
    formato: 'calendario',
    salida,
    niche: 'trekking',
    clientName: 'Caminantes de Montaña',
    clientOnboarding: onboarding,
    objetivo: 'convertir',
    carpeta: 'Tucuman/Caminatas',
    mesAnio: 'grupo semanal',
    variantIndex: 1,
    variantCount: 2,
  })

  assert.equal(output.cantidad_slides, 5)
  assert.equal(output.metadata.strategy, 'recurring_group_info')
  assert.match(output.slides[1].texto_principal, /Martes · Jueves · Sábado/)
  assert.match(output.descripcion_post, /Salimos martes, jueves, sábado/)
  assert.match(output.cta_comentario, /link de la bio/)
  assert.doesNotMatch(JSON.stringify(output), /Invalid Date|1970|USD|itinerario/i)
})

test('las dos variantes cambian el ángulo sin cambiar datos comerciales', async () => {
  const common = {
    formato: 'calendario',
    salida,
    niche: 'trekking',
    clientName: 'Caminantes de Montaña',
    clientOnboarding: onboarding,
    objetivo: 'convertir',
    carpeta: 'Tucuman/Caminatas',
    mesAnio: 'grupo semanal',
    variantCount: 2,
  }
  const first = await generateAdaptiveCarrusel({ ...common, variantIndex: 1 })
  const second = await generateAdaptiveCarrusel({ ...common, variantIndex: 2 })

  assert.notEqual(first.angulo, second.angulo)
  assert.notEqual(first.slides[0].texto_principal, second.slides[0].texto_principal)
  assert.equal(first.slides[1].texto_principal, second.slides[1].texto_principal)
})

test('las cinco variantes del video fijo pasan y alternan bio/comentario', async () => {
  const outputs = []
  for (let index = 0; index < 5; index++) {
    try {
      outputs.push(await generateVideoFamilia4({
        salida,
        niche: 'trekking',
        clientName: 'Caminantes de Montaña',
        clientOnboarding: withLocalRecurringCtaRotation(onboarding, salida, index),
        tipografiasPermitidas: ['Inter'],
        canalesHabilitados: [],
        clipDurationSeconds: 10,
        rotationIndex: index,
      }))
    } catch (error) {
      throw new Error(`Variante ${index + 1}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  assert.equal(outputs.length, 5)
  assert.equal(new Set(outputs.map(output => output.copy)).size, 5)
  assert.match(outputs[0].cta, /link de la bio/i)
  assert.match(outputs[1].cta, /Comentá INFO/i)
  assert.match(outputs[3].copy, /Sumate/i)
  assert.match(outputs[3].cta, /Comentá INFO/i)
})
