import test from 'node:test'
import assert from 'node:assert/strict'
import { editConversationContent } from '../lib/generators/conversacion-editor.ts'

const badDraft = {
  destino: 'El Chaltén',
  fechaInicio: '2026-12-27',
  fechaFin: '2027-01-02',
  rawCta: 'Comentá CHALTÉN y te pasamos toda la info.',
  descripcion: `Llega fin de año y necesitás cortar. Siete días y seis noches en El Chaltén. Caminantes de Montaña te lleva con todo organizado. ¿Qué incluye? 6 noches de alojamiento, transfers, entradas, seguro y kit para los primeros 5. Comentá CHALTÉN y te pasamos toda la info.`,
  slides: [
    { n_slide: 1, rol: 'desarrollo', tipo: 'dialogo', hablante: 'Amigo A', pill_text: null, texto_principal: '¿Qué vas a hacer para fin de año?', texto_apoyo: null, indicacion_imagen: 'pregunta' },
    { n_slide: 2, rol: 'desarrollo', tipo: 'dialogo', hablante: 'Amigo B', pill_text: null, texto_principal: 'Cortar la señal. De la civilización.', texto_apoyo: null, indicacion_imagen: 'El Chaltén' },
    { n_slide: 3, rol: 'desarrollo', tipo: 'texto', hablante: null, pill_text: null, texto_principal: 'Siete días en El Chaltén.', texto_apoyo: null, indicacion_imagen: 'grupo' },
    { n_slide: 4, rol: 'datos', tipo: 'ficha', hablante: null, pill_text: null, texto_principal: 'Despedí el 2026 y arrancá el 2027', texto_apoyo: '7 días y 6 noches. Nivel medio. Desde USD 1100.', indicacion_imagen: 'ficha' },
  ],
}

test('elimina la promoción disfrazada y conserva el microdiálogo', () => {
  const result = editConversationContent(badDraft)
  assert.equal(result.slides.length, 4)
  assert.ok(result.slides.slice(0, 2).every(slide => slide.tipo === 'dialogo'))
  assert.ok(result.slides.slice(0, 2).every(slide => slide.hablante === 'CONVERSACIÓN'))
  assert.match(result.slides[0].texto_principal, /^— /)
  assert.match(result.slides[1].texto_principal, /^— .+[\s\S]+— /)
  assert.match(result.slides[1].texto_principal, /¿Qué vas a hacer para fin de año\?[\s\S]+Cortar la señal/)
  assert.equal(result.slides.at(-1).rol, 'cierre')
  assert.equal(result.slides[2].rol, 'foto')
  assert.equal(result.slides[2].texto_principal, 'El Chaltén')
  assert.match(result.slides.at(-1).texto_apoyo, /27 de diciembre de 2026 al 2 de enero de 2027/)
  assert.match(result.slides.at(-1).texto_apoyo, /Comentá CHALTÉN y te pasamos toda la info\./)
  assert.doesNotMatch(result.slides.map(slide => slide.texto_principal).join(' '), /usd|días|noches|precio|incluye|cupos/i)
  assert.doesNotMatch(result.descripcion, /alojamiento|transfer|seguro|kit|usd|¿qué incluye/i)
  assert.equal((result.descripcion.match(/Comentá CHALTÉN y te pasamos toda la info\./g) ?? []).length, 1)
})

test('fija la palabra CTA desde la salida y elimina descripción grandilocuente', () => {
  const result = editConversationContent({
    ...badDraft,
    rawCta: 'Comentá PATAGONIA SANTA CRUZ y te pasamos toda la info.',
    descripcion: 'Dale un giro épico a tus vacaciones. Los paisajes te dejan sin aliento. Viví una Patagonia diferente.',
  })
  assert.equal(result.cta, 'Comentá CHALTÉN y te pasamos toda la info.')
  assert.doesNotMatch(result.descripcion, /épico|sin aliento|viví una/i)
  assert.match(result.descripcion, /plan para El Chaltén/i)
})

test('rechaza metáforas turísticas y promesas de salud para que Gemini reintente', () => {
  assert.throws(() => editConversationContent({
    ...badDraft,
    slides: [
      { ...badDraft.slides[0], texto_principal: 'Quiero huir de la civilización.' },
      { ...badDraft.slides[1], texto_principal: 'Y saludar a los gigantes de piedra.' },
      { ...badDraft.slides[1], n_slide: 3, texto_principal: 'La montaña cura la ansiedad.' },
    ],
  }), /no suena a una charla cotidiana/)
})

test('rechaza dramatización en vez de insertar frases fijas', () => {
  assert.throws(() => editConversationContent({
    ...badDraft,
    destino: 'Chalten',
    slides: [
      { ...badDraft.slides[0], texto_principal: 'No doy más, en serio.' },
      { ...badDraft.slides[1], texto_principal: 'Necesito cambiar de aire urgente.' },
      { ...badDraft.slides[1], n_slide: 3, hablante: 'un amigo', texto_principal: '¿Pensaste en Chaltén?' },
      { ...badDraft.slides[1], n_slide: 4, texto_principal: 'Una semana entera para resetear.' },
    ],
  }), /no suena a una charla cotidiana/)
})

test('rechaza intervenciones ya usadas para evitar regeneraciones repetidas', () => {
  assert.throws(() => editConversationContent({
    ...badDraft,
    forbiddenLines: ['¿Qué vas a hacer para fin de año?'],
    slides: badDraft.slides.slice(0, 2),
  }), /usada anteriormente/)
})

test('rechaza clichés de bienestar y elimina llamados comerciales extra', () => {
  assert.throws(() => editConversationContent({
    ...badDraft,
    slides: [
      { ...badDraft.slides[0], texto_principal: 'Necesito algo que me vuele la cabeza.' },
      { ...badDraft.slides[1], texto_principal: 'Este viaje es un reset total.' },
    ],
  }), /no suena a una charla cotidiana/)

  const result = editConversationContent({
    ...badDraft,
    descripcion: 'Un plan simple para salir de la rutina. Envianos un mensaje con la palabra CHALTÉN y te contamos todo.',
    slides: badDraft.slides.slice(0, 2),
  })
  assert.doesNotMatch(result.descripcion, /envianos|te contamos todo/i)
  assert.equal((result.descripcion.match(/Comentá CHALTÉN/g) ?? []).length, 1)
})

test('reemplaza el remate visual del borrador por revelación y cierre determinísticos', () => {
  const result = editConversationContent({
    ...badDraft,
    slides: [
      badDraft.slides[0],
      badDraft.slides[1],
      { n_slide: 3, rol: 'foto', tipo: 'foto', texto_principal: null, texto_apoyo: null, pill_text: null, hablante: null, indicacion_imagen: 'Fitz Roy desde El Chaltén' },
    ],
  })
  assert.equal(result.slides.length, 4)
  assert.equal(result.slides[2].tipo, 'foto')
  assert.equal(result.slides[2].texto_principal, 'El Chaltén')
  assert.equal(result.slides[2].rol, 'foto')
  assert.equal(result.slides[3].tipo, 'ficha')
  assert.equal(result.slides[3].rol, 'cierre')
})

test('usa CTA de envío dentro del cierre cuando el objetivo es compartir', () => {
  const result = editConversationContent({
    ...badDraft,
    objetivo: 'compartir',
    slides: badDraft.slides.slice(0, 2),
  })
  assert.match(result.slides.at(-1).texto_apoyo, /Enviáselo a esa persona con la que harías este plan\./)
})

test('campaña recurrente puede cerrar sin fecha y con CTA propio', () => {
  const result = editConversationContent({
    ...badDraft,
    includeDate: false,
    ctaOverride: 'Sumate desde el link de la bio.',
    closingLabel: 'TREKKING EN GRUPO',
    slides: badDraft.slides.slice(0, 2),
  })
  assert.equal(result.cta, 'Sumate desde el link de la bio.')
  assert.equal(result.slides.at(-1).pill_text, 'TREKKING EN GRUPO')
  assert.equal(result.slides.at(-1).texto_apoyo, 'Sumate desde el link de la bio.')
  assert.doesNotMatch(result.slides.at(-1).texto_apoyo, /2026|2027|diciembre|enero/i)
})

test('rechaza una conversación sin intercambio mínimo', () => {
  assert.throws(() => editConversationContent({ ...badDraft, slides: badDraft.slides.slice(0, 1) }), /al menos 2 slides/)
})

test('agrega la revelación aunque el microdiálogo no nombre el destino', () => {
  const result = editConversationContent({
    ...badDraft,
    slides: [
      { ...badDraft.slides[0], texto_principal: '¿Pensaste dónde vas a despedir el año?', indicacion_imagen: 'persona en la ciudad' },
      { ...badDraft.slides[1], texto_principal: 'Sí. Quiero irme unos días.', indicacion_imagen: 'persona mirando una ventana' },
      { ...badDraft.slides[1], n_slide: 3, texto_principal: '¿Y adónde?', indicacion_imagen: 'expresión de curiosidad en un fondo neutro' },
    ],
  })
  assert.equal(result.slides.at(-2).rol, 'foto')
  assert.equal(result.slides.at(-2).texto_principal, 'El Chaltén')
  assert.equal(result.slides.at(-1).rol, 'cierre')
})

test('rechaza reservas inventadas y limpia emojis o markdown de la descripción', () => {
  assert.throws(() => editConversationContent({
    ...badDraft,
    slides: [
      { ...badDraft.slides[0], texto_principal: '¿Qué hacemos para Año Nuevo?' },
      { ...badDraft.slides[1], texto_principal: 'Ya saqué pasaje para Chaltén.' },
    ],
  }), /no suena a una charla cotidiana/)

  const result = editConversationContent({
    ...badDraft,
    descripcion: '**Un plan sencillo** 🧉 para compartir. Comentá CHALTÉN y te mandamos toda la info.',
    slides: badDraft.slides.slice(0, 2),
  })
  assert.doesNotMatch(result.descripcion, /\*|🧉|te mandamos/i)
  assert.equal((result.descripcion.match(/Comentá CHALTÉN/g) ?? []).length, 1)
})

test('rechaza giros que parecen copy fragmentado o habla artificial', () => {
  for (const phrase of [
    '¿Che, qué hacemos para fin de año?',
    'Estamos en modo piloto automático.',
    '¿Qué tal si nos vamos a caminar picos?',
    'Me vendría bien un aire, literal.',
  ]) {
    assert.throws(() => editConversationContent({
      ...badDraft,
      slides: [
        { ...badDraft.slides[0], texto_principal: phrase },
        { ...badDraft.slides[1], texto_principal: 'Dale, vamos a Chaltén.' },
      ],
    }), /no suena a una charla cotidiana/)
  }
})

test('rechaza remates vagos o gramaticalmente inconclusos', () => {
  for (const phrase of [
    'No, pensaba en otra postal.',
    'Hay que cortar por lo sano.',
    'Con la semana que nos queda...',
    'Ya estoy armando la mochila para…',
  ]) {
    assert.throws(() => editConversationContent({
      ...badDraft,
      slides: [
        { ...badDraft.slides[0], texto_principal: '¿Qué hacemos el finde?' },
        { ...badDraft.slides[1], texto_principal: phrase },
      ],
    }), /no suena a una charla cotidiana|gramaticalmente inconcluso/)
  }
})

test('rechaza personificaciones y cumbres que la salida no promete', () => {
  for (const phrase of [
    'Mi alarma suena cada vez más triste.',
    'Quiero terminar el año mirando la cima.',
  ]) {
    assert.throws(() => editConversationContent({
      ...badDraft,
      slides: [
        { ...badDraft.slides[0], texto_principal: '¿Qué plan hacemos?' },
        { ...badDraft.slides[1], texto_principal: phrase },
      ],
    }), /no suena a una charla cotidiana/)
  }
})

test('rechaza disponibilidad o composición inventada del grupo', () => {
  assert.throws(() => editConversationContent({
    ...badDraft,
    slides: [
      { ...badDraft.slides[0], texto_principal: 'No tengo con quién ir.' },
      { ...badDraft.slides[1], texto_principal: 'Justo nos falta uno para las caminatas.' },
    ],
  }), /no suena a una charla cotidiana/)
})
