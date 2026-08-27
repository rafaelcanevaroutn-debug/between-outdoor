import test from 'node:test'
import assert from 'node:assert/strict'
import {
  descriptionNeedsDirectedRewrite,
  editableDescriptionBody,
  finalizeDirectedDescription,
  mergeConversationEditorialReview,
  normalizeOrganicDraft,
  localOrganicEditorialCopy,
} from '../lib/generators/adaptive-format-normalizers.ts'

const organicSlides = Array.from({ length: 5 }, (_, index) => ({
  n_slide: index + 1,
  rol: index === 0 ? 'portada' : index === 4 ? 'datos' : 'foto',
  tipo: index === 0 ? 'texto' : index === 4 ? 'ficha' : 'foto',
  texto_principal: index === 0 ? 'Una portada' : index === 4 ? 'Chaltén / 27 dic al 2 ene 2027 / Solo 20 lugares' : null,
  texto_apoyo: null,
}))

test('Orgánico normaliza fecha cruzada y capacidad sin escasez', () => {
  const result = normalizeOrganicDraft({
    angulo: 'Un ángulo',
    descripcion_post: 'Una semana para caminar. Salida del 27 de diciembre al 2 de enero de 2027. Hay solo 20 lugares. Comentá CHALTÉN y te enviamos toda la info.',
    cta_comentario: 'CHALTÉN',
    slides: organicSlides,
  }, {
    destination: 'Chaltén',
    exactDateRange: '27 dic 2026 al 2 ene 2027',
    capacity: 20,
    canonicalCta: 'Comentá CHALTÉN y te enviamos toda la info.',
    descriptionLimit: 650,
  })

  assert.ok(Array.isArray(result.slides))
  assert.equal(result.slides[4].texto_principal, 'Chaltén')
  assert.equal(result.slides[4].texto_apoyo, '27 dic 2026 al 2 ene 2027 · Capacidad total: 20 personas')
  assert.doesNotMatch(`${result.slides[4].texto_principal} ${result.slides[4].texto_apoyo}`, /solo|quedan|[uú]ltimos|limitados/i)
  assert.match(result.descripcion_post, /Salida: 27 dic 2026 al 2 ene 2027\. Capacidad total: 20 personas\./)
  assert.equal((result.descripcion_post.match(/Comentá CHALTÉN y te enviamos toda la info\./g) ?? []).length, 1)
  assert.equal(result.cta_comentario, 'Comentá CHALTÉN y te enviamos toda la info.')
  assert.ok(result.descripcion_post.length <= 650)
})

test('Orgánico preserva estructura y usa una fecha exacta de un solo día', () => {
  const result = normalizeOrganicDraft({
    descripcion_post: 'Un día para caminar.',
    slides: organicSlides,
  }, {
    destination: 'Tafí del Valle',
    exactDateRange: '10 jul 2026',
    capacity: 12,
    canonicalCta: 'Comentá TAFÍ y te enviamos toda la info.',
    descriptionLimit: 650,
  })

  assert.equal(result.slides.length, 5)
  assert.equal(result.slides[4].rol, 'datos')
  assert.equal(result.slides[4].tipo, 'ficha')
  assert.match(result.slides[4].texto_apoyo, /^10 jul 2026 · Capacidad total: 12 personas$/)
})

test('Orgánico local conserva cinco slides pero omite fecha y capacidad no confirmadas', () => {
  const result = normalizeOrganicDraft({
    descripcion_post: 'Caminar cerca también puede ser un gran plan.',
    slides: organicSlides,
  }, {
    destination: 'Horco Molle',
    exactDateRange: 'dato que no debe mostrarse',
    capacity: 20,
    canonicalCta: 'Sumate desde el link de la bio.',
    descriptionLimit: 650,
    includeCommercialFacts: false,
  })
  assert.equal(result.slides[4].texto_principal, 'Horco Molle')
  assert.equal(result.slides[4].texto_apoyo, 'Sumate desde el link de la bio.')
  assert.doesNotMatch(result.descripcion_post, /capacidad|salida:|2026|2027/i)
  assert.ok(result.descripcion_post.endsWith('Sumate desde el link de la bio.'))
})

test('Orgánico local usa lenguaje directo y cambia el gancho según el eje comercial', () => {
  const objection = localOrganicEditorialCopy({
    axis: 'objeciones',
    territory: 'Tucumán',
    destination: 'Horco Molle',
    publicName: 'Caminantes de Montaña',
  })
  assert.equal(objection.cover, '¿Querés hacer trekking y no tenés con quién?')
  assert.match(objection.description, /hacemos trekking en grupo por Tucumán/u)
  assert.doesNotMatch(objection.description, /reset|energía|desconectá|aventura/iu)

  const discovery = localOrganicEditorialCopy({
    axis: 'descubrimiento',
    territory: 'Tucumán',
    destination: 'Horco Molle',
  })
  assert.equal(discovery.cover, 'Horco Molle, caminando en grupo.')
})

test('el reviewer de Conversación reemplaza solo slides y preserva metadata base', () => {
  const draft = {
    angulo: 'Ángulo original',
    descripcion_post: 'Descripción original.',
    cta_comentario: 'Comentá CHALTÉN y te pasamos toda la info.',
    slides: [{ texto_principal: 'Borrador' }],
  }
  const reviewedSlides = [
    { texto_principal: '¿Llevamos mate?' },
    { texto_principal: 'Sí, y las mochilas.' },
  ]
  const result = mergeConversationEditorialReview(draft, {
    angulo: null,
    descripcion_post: null,
    cta_comentario: null,
    slides: reviewedSlides,
  })

  assert.equal(result.angulo, draft.angulo)
  assert.equal(result.descripcion_post, draft.descripcion_post)
  assert.equal(result.cta_comentario, draft.cta_comentario)
  assert.deepEqual(result.slides, reviewedSlides)
})

test('el reviewer de Conversación debe entregar slides', () => {
  assert.throws(
    () => mergeConversationEditorialReview({ descripcion_post: 'Base' }, { descripcion_post: 'Revisión' }),
    /debe devolver slides revisados/,
  )
})

test('detecta las abstracciones pedidas y no marca copy concreto', () => {
  for (const phrase of [
    'Este viaje es un reset.',
    'Volvés con otra energía.',
    'La mejor forma de cambiar la sintonía.',
    'Un viaje para vivir el fin del mundo.',
    'Una experiencia para reconectar y transformarte.',
  ]) {
    assert.equal(descriptionNeedsDirectedRewrite(phrase), true, phrase)
  }
  assert.equal(descriptionNeedsDirectedRewrite('Caminamos por Laguna Torre y Glaciar Huemul.'), false)
})

test('extrae solamente el cuerpo editable y protege datos y CTA de Orgánico', () => {
  const description = 'Texto narrativo.\n\nSalida: 27 dic 2026 al 2 ene 2027. Capacidad total: 20 personas.\n\nComentá CHALTÉN y te enviamos toda la info.'
  assert.equal(
    editableDescriptionBody('organico', description, 'Comentá CHALTÉN y te enviamos toda la info.'),
    'Texto narrativo.',
  )
})

test('reconstruye Orgánico con hechos protegidos aunque el editor repita o altere datos', () => {
  const result = finalizeDirectedDescription({
    format: 'organico',
    originalDescription: 'Un reset para volver con otra energía.',
    rewrittenBody: 'Laguna de los Tres y Laguna Torre. Salida 2028. Comentá INFO y te contamos todo.',
    destination: 'Chaltén',
    exactDateRange: '27 dic 2026 al 2 ene 2027',
    capacity: 20,
    canonicalCta: 'Comentá CHALTÉN y te enviamos toda la info.',
    descriptionLimit: 650,
    verifiedPlaces: ['Laguna de los Tres', 'Laguna Torre'],
  })

  assert.match(result, /^Laguna de los Tres y Laguna Torre\./)
  assert.match(result, /Salida: 27 dic 2026 al 2 ene 2027\. Capacidad total: 20 personas\./)
  assert.doesNotMatch(result, /2028|reset|energía|Comentá INFO/i)
  assert.equal((result.match(/Comentá CHALTÉN y te enviamos toda la info\./g) ?? []).length, 1)
  assert.ok(result.length <= 650)
})

test('fallback local elimina abstracciones sin rechazar y conserva el CTA de Conversación', () => {
  const result = finalizeDirectedDescription({
    format: 'conversacion',
    originalDescription: 'Ese calendario avanza sin freno. Es hora de cambiar la sintonía.',
    rewrittenBody: 'Un reset para volver a vos.',
    destination: 'Chaltén',
    canonicalCta: 'Comentá CHALTÉN y te pasamos toda la info.',
    descriptionLimit: 300,
  })

  assert.equal(result, 'Una charla cotidiana terminó en un plan para caminar por Chaltén.\n\nComentá CHALTÉN y te pasamos toda la info.')
  assert.doesNotMatch(result, /reset|energía|sintonía|fin del mundo/i)
  assert.ok(result.length <= 300)
})
