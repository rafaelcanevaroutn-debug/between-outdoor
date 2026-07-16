import test from 'node:test'
import assert from 'node:assert/strict'
import { editConversationContent } from '../lib/generators/conversacion-editor.ts'

const badDraft = {
  destino: 'El Chaltén',
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
  assert.equal(result.slides.length, 2)
  assert.ok(result.slides.every(slide => slide.tipo === 'dialogo'))
  assert.ok(result.slides.every(slide => slide.hablante === 'CONVERSACIÓN'))
  assert.match(result.slides[0].texto_principal, /^— /)
  assert.match(result.slides[1].texto_principal, /^— .+[\s\S]+— /)
  assert.match(result.slides[1].texto_principal, /¿Qué vas a hacer para fin de año\?[\s\S]+Cortar la señal/)
  assert.equal(result.slides.at(-1).rol, 'cierre')
  assert.equal(result.slides.at(-1).texto_apoyo, 'Comentá CHALTÉN y te pasamos toda la info.')
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

test('acepta un remate visual sin convertirlo en ficha', () => {
  const result = editConversationContent({
    ...badDraft,
    slides: [
      badDraft.slides[0],
      badDraft.slides[1],
      { n_slide: 3, rol: 'foto', tipo: 'foto', texto_principal: null, texto_apoyo: null, pill_text: null, hablante: null, indicacion_imagen: 'Fitz Roy desde El Chaltén' },
    ],
  })
  assert.equal(result.slides.length, 3)
  assert.equal(result.slides[2].tipo, 'foto')
  assert.match(result.slides[2].texto_principal, /Cortar la señal/)
  assert.equal(result.slides[2].rol, 'cierre')
})

test('usa CTA de envío dentro del cierre cuando el objetivo es compartir', () => {
  const result = editConversationContent({
    ...badDraft,
    objetivo: 'compartir',
    slides: badDraft.slides.slice(0, 2),
  })
  assert.equal(result.slides.at(-1).texto_apoyo, 'Enviáselo a esa persona con la que harías este plan.')
})

test('rechaza una conversación sin intercambio mínimo', () => {
  assert.throws(() => editConversationContent({ ...badDraft, slides: badDraft.slides.slice(0, 1) }), /al menos 2 slides/)
})

test('rechaza una conversación que termina sin revelar el plan', () => {
  assert.throws(() => editConversationContent({
    ...badDraft,
    slides: [
      { ...badDraft.slides[0], texto_principal: '¿Pensaste dónde vas a despedir el año?', indicacion_imagen: 'persona en la ciudad' },
      { ...badDraft.slides[1], texto_principal: 'Sí. Quiero irme unos días.', indicacion_imagen: 'persona mirando una ventana' },
      { ...badDraft.slides[1], n_slide: 3, texto_principal: '¿Y adónde?', indicacion_imagen: 'expresión de curiosidad en un fondo neutro' },
    ],
  }), /no revela el plan outdoor/)
})
