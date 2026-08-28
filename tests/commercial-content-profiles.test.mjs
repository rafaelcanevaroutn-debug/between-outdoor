import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertCommercialMediaSource,
  auditCommercialCopy,
  buildCommercialProfilePrompt,
  buildLocalCampaignBanner,
  getCommercialWeekRecipe,
  normalizeCampaignContext,
  resolveContentProfile,
  assertCommercialCopy,
  projectSalidaForCommercialProfile,
  withLocalRecurringCtaRotation,
  withSalidaCommercialFacts,
} from '../lib/commercial-content-profiles.ts'

function onboarding(overrides = {}) {
  return {
    user_id: 'test',
    avatar_edad_genero: null,
    avatar_experiencia: null,
    avatar_objeciones: null,
    avatar_motor: null,
    marca_personalidad: null,
    marca_lineas_rojas: null,
    marca_autoridad: null,
    marca_testimonios: null,
    objetivos_corto_plazo: null,
    servicios_estrella: null,
    servicios_moneda: null,
    calendario: null,
    embudo_paso: null,
    material_visual: null,
    completed_at: null,
    ...overrides,
  }
}

test('perfil desconocido cae al motor estándar', () => {
  assert.equal(resolveContentProfile(onboarding({ content_profile: 'inventado' })), 'standard_outdoor')
  assert.equal(buildCommercialProfilePrompt(onboarding()), '')
})

test('normaliza el contexto y descarta valores no admitidos', () => {
  const context = normalizeCampaignContext({
    territorio: ' Tucumán ',
    dias_confirmados: ['martes', 'martes', 'octubre'],
    cta_primario: 'telepatia',
    destinos: ['Horco Molle', '', 'Horco Molle'],
    protagonistas: [{ nombre: ' Renzo ', rol: 'montaña' }, { nombre: '' }],
  })
  assert.equal(context.territorio, 'Tucumán')
  assert.deepEqual(context.dias_confirmados, ['martes'])
  assert.deepEqual(context.destinos, ['Horco Molle'])
  assert.equal(context.cta_primario, null)
  assert.deepEqual(context.protagonistas, [{ nombre: 'Renzo', rol: 'montaña', autoridad_verificada: null }])
})

test('local sin agenda confirmada prohíbe inventar días y frecuencia', () => {
  const data = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: {
      territorio: 'Tucumán',
      actividad: 'trekking en grupo',
      destinos: ['Horco Molle'],
      frecuencia_confirmada: false,
      cta_primario: 'link_bio',
    },
  })
  const prompt = buildCommercialProfilePrompt(data)
  assert.match(prompt, /trekking en grupo/i)
  assert.match(prompt, /no menciones martes/i)
  assert.match(prompt, /link de la bio/i)
  assert.deepEqual(
    auditCommercialCopy('Salimos todos los fines de semana, martes y sábado.', data),
    ['Días no confirmados: martes, sábado', 'Frecuencia o fin de semana no confirmado'],
  )
  assert.ok(auditCommercialCopy('Nos vemos el 12 de septiembre de 2026. USD 50.', data).includes('Fecha no confirmada'))
  assert.ok(auditCommercialCopy('Nos vemos el 12 de septiembre de 2026. USD 50.', data).includes('Dato comercial no confirmado para la campaña local'))
})

test('local sin agenda confirmada tampoco promete un plan de fin de semana', () => {
  const onboarding = {
    content_profile: 'grupo_recurrente_local',
    campaign_context: { frecuencia_confirmada: false },
  }
  assert.ok(auditCommercialCopy('Un plan para el finde.', onboarding).some(issue => issue.includes('no confirmado')))
})

test('inyecta en el prompt la intención comercial asignada a la pieza', () => {
  const data = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: {
      actividad: 'trekking en grupo',
      content_axis: 'objeciones',
    },
  })
  const prompt = buildCommercialProfilePrompt(data)
  assert.match(prompt, /INTENCIÓN DE ESTA PIEZA: OBJECIONES/)
  assert.match(prompt, /Respondé una duda o freno real/)
})

test('local permite únicamente los días confirmados', () => {
  const data = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: {
      frecuencia_confirmada: true,
      dias_confirmados: ['martes', 'sábado'],
    },
  })
  assert.deepEqual(auditCommercialCopy('Salimos martes y sábado.', data), [])
  assert.deepEqual(auditCommercialCopy('Salimos el jueves.', data), ['Días no confirmados: jueves'])
})

test('dupla separa marca y credenciales no verificadas', () => {
  const data = onboarding({
    content_profile: 'dupla_viajes_internacionales',
    campaign_context: {
      campania_principal: 'México: Cancún y Playa del Carmen',
      protagonistas: [
        { nombre: 'Renzo', rol: 'montaña y aventura' },
        { nombre: 'Franco', rol: 'playa y viajes internacionales' },
      ],
      marcas_prohibidas: ['Caminantes de Montaña'],
      terminos_prohibidos: ['Chaltén'],
    },
  })
  const prompt = buildCommercialProfilePrompt(data)
  assert.match(prompt, /México: Cancún y Playa del Carmen/)
  assert.match(prompt, /No atribuyas cargos/)
  assert.deepEqual(
    auditCommercialCopy('Un viaje de Caminantes de Montaña', data),
    ['Marca prohibida: Caminantes de Montaña'],
  )
  assert.throws(
    () => assertCommercialCopy({ titulo: 'Nos vamos a Chaltén' }, data),
    /Término prohibido: Chaltén/,
  )
  assert.doesNotThrow(() => assertCommercialCopy({
    titulo: 'Cancún y Playa del Carmen',
    metadata: { sourceFolder: 'Chaltén/material-crudo' },
    fuentes: ['Chaltén'],
  }, data))
})

test('cada perfil comercial rota cuatro semanas de recetas existentes', () => {
  const local = Array.from({ length: 4 }, (_, index) => getCommercialWeekRecipe('grupo_recurrente_local', index))
  const duo = Array.from({ length: 4 }, (_, index) => getCommercialWeekRecipe('dupla_viajes_internacionales', index))
  assert.deepEqual(local.map(recipe => recipe?.videoSubfamilia), ['3b', '3c', '3d', '4'])
  assert.deepEqual(duo.map(recipe => recipe?.videoSubfamilia), ['2b', '4', '3c', '3d'])
  assert.deepEqual(getCommercialWeekRecipe('grupo_recurrente_local', 4), local[0])
})

test('el CTA local alterna bio y comentario sin cambiar la palabra clave', () => {
  const data = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: { cta_primario: 'link_bio', keyword_comentario: 'INFO' },
  })
  const salida = { tipo_viaje: 'salida_recurrente' }
  const bio = withLocalRecurringCtaRotation(data, salida, 0)
  const comment = withLocalRecurringCtaRotation(data, salida, 1)
  assert.equal(bio.campaign_context.cta_primario, 'link_bio')
  assert.equal(comment.campaign_context.cta_primario, 'comentario')
  assert.equal(comment.campaign_context.keyword_comentario, 'INFO')
})

test('el flyer local usa también CTA por comentario', () => {
  const data = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: {
      territorio: 'Tucumán',
      actividad: 'Trekking en grupo',
      cta_primario: 'comentario',
      keyword_comentario: 'INFO',
    },
  })
  assert.match(
    buildLocalCampaignBanner(data, { destino: 'Horco Molle' }, 0)?.convocatoria,
    /Comentá INFO/i,
  )
})

test('la campaña local conserva el banco pero reemplaza los hechos editoriales', () => {
  const source = {
    id: 'salida-source',
    nombre: 'Chaltén 2027',
    destino: 'Chaltén',
    tipo_viaje: 'expedicion_premium',
    carpeta_fotos_nombre: 'Chalten/Paisajes',
    carpeta_videos_nombre: 'Chalten/Grupo',
    puntos_interes: [],
    itinerario_dias: [],
  }
  const data = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: {
      territorio: 'Tucumán',
      actividad: 'trekking en grupo',
      nombre_oferta: 'Salidas locales en grupo',
      destinos: ['Horco Molle'],
      frecuencia_confirmada: false,
    },
  })
  const projected = projectSalidaForCommercialProfile(source, data)
  assert.equal(projected.id, source.id)
  assert.equal(projected.carpeta_videos_nombre, 'Chalten/Grupo')
  assert.equal(projected.nombre, 'Salidas locales en grupo')
  assert.equal(projected.destino, 'Horco Molle')
  assert.deepEqual(projected.dias_semana, [])
})

test('una salida recurrente cargada alimenta al motor con sus días, horario y lugares reales', () => {
  const data = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: {
      territorio: 'Tucumán',
      frecuencia_confirmada: false,
      destinos: ['Pendiente'],
    },
  })
  const salida = {
    tipo_viaje: 'salida_recurrente',
    destino: 'Tucumán',
    dias_semana: ['jueves', 'sábado'],
    hora_encuentro: '08:30:00',
    lugares_recurrentes: ['Horco Molle', 'Río Noque'],
  }

  const enriched = withSalidaCommercialFacts(data, salida)
  assert.equal(enriched.campaign_context.frecuencia_confirmada, true)
  assert.deepEqual(enriched.campaign_context.dias_confirmados, ['jueves', 'sábado'])
  assert.deepEqual(enriched.campaign_context.horarios_confirmados, ['08:30'])
  assert.deepEqual(enriched.campaign_context.destinos, ['Horco Molle', 'Río Noque'])
  assert.doesNotThrow(() => assertCommercialCopy('Jueves y sábado a las 08:30.', enriched))
  assert.equal(projectSalidaForCommercialProfile(salida, enriched), salida)
})

test('bloquea un banco visual de otra campaña antes del render', () => {
  const data = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: {
      territorio: 'Tucumán',
      terminos_prohibidos: ['Chaltén'],
    },
  })
  assert.throws(
    () => assertCommercialMediaSource('Chalten/Paisajes', data),
    /Vinculá material compatible/u,
  )
  assert.doesNotThrow(() => assertCommercialMediaSource('Tucuman/Horco-Molle', data))
})

test('el flyer local conserva una propuesta y CTA informativos', () => {
  const data = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: {
      territorio: 'Tucumán',
      actividad: 'Trekking en grupo',
      cta_primario: 'link_bio',
    },
  })
  assert.deepEqual(buildLocalCampaignBanner(data, { destino: 'Horco Molle' }), {
    contentKind: 'banner/molde-6',
    mensaje: 'Trekking en grupo en Tucumán',
    convocatoria: 'Sumate desde el link de la bio',
    typographyId: 'Inter',
  })
})

test('el flyer local rota cinco discursos de grupo realmente distintos', () => {
  const data = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: {
      territorio: 'Tucumán',
      actividad: 'Trekking en grupo',
      cta_primario: 'link_bio',
    },
  })
  const variants = Array.from({ length: 5 }, (_, index) => (
    buildLocalCampaignBanner(data, { destino: 'Horco Molle' }, index)
  ))
  assert.equal(new Set(variants.map(item => item?.mensaje)).size, 5)
  assert.match(variants[1].mensaje, /lugar nuevo|conocer caminando/i)
  assert.match(variants[2].mensaje, /semana/i)
  assert.match(variants[3].mensaje, /aire libre/i)
  assert.match(variants[4].mensaje, /nivel|ritmo/i)
  assert.equal(variants.filter(item => /grupo|no tenés con quién|solo/iu.test(item.mensaje)).length, 1)
  assert.deepEqual(buildLocalCampaignBanner(data, { destino: 'Horco Molle' }, 5), variants[0])
})

test('el flyer explicita grupo aunque la actividad cargada sea solo trekking', () => {
  const data = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: {
      territorio: 'Tucumán',
      actividad: 'trekking',
      cta_primario: 'link_bio',
    },
  })
  assert.equal(
    buildLocalCampaignBanner(data, { destino: 'Horco Molle' }, 0)?.mensaje,
    'trekking en grupo en Tucumán',
  )
})

test('el flyer respeta el eje asignado y no vuelve siempre a grupo', () => {
  const base = onboarding({
    content_profile: 'grupo_recurrente_local',
    campaign_context: {
      territorio: 'Tucumán',
      actividad: 'trekking',
      destinos: ['Horco Molle'],
      cta_primario: 'link_bio',
    },
  })
  const forAxis = axis => buildLocalCampaignBanner({
    ...base,
    campaign_context: { ...base.campaign_context, content_axis: axis },
  }, { destino: 'Horco Molle' }, 0)?.mensaje

  assert.match(forAxis('descubrimiento'), /Horco Molle|senderos|cascadas/iu)
  assert.match(forAxis('habito'), /semana|moverte/iu)
  assert.match(forAxis('utilidad'), /nivel|datos/iu)
  assert.doesNotMatch(forAxis('bienestar'), /grupo|no tenés con quién/iu)
})
