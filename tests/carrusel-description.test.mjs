import test from 'node:test'
import assert from 'node:assert/strict'
import { mapPieceToInsertRow } from '../lib/contenido-insert.ts'
import { generateEngagementDescription } from '../lib/generators/engagement-description.ts'

test('generateEngagementDescription con isCarousel genera descripción completa', () => {
  const desc = generateEngagementDescription({
    destino: 'Yerba Buena, Tucuman',
    tipoViaje: 'salida_recurrente',
    mainText: "Tu semana merece un 'modo avión'.",
    isCarousel: true,
    hashtags: '#YerbaBuenaTucuman #Trekking',
  })

  assert.ok(desc.includes("Tu semana merece un 'modo avión'."))
  assert.ok(desc.includes('Caminatas en grupo por Yerba Buena, Tucuman'))
  assert.ok(desc.includes('Comentá YERBA BUENA o unite al grupo con el link en la bio.'))
  assert.ok(desc.includes('#YerbaBuenaTucuman'))
})

test('mapPieceToInsertRow genera descripcion_post si la pieza no la trae', () => {
  const piece = {
    formato: 'carrusel',
    formato_carrusel: 'editorial',
    tema: 'testimonios',
    estructura_narrativa: 'storytelling',
    cantidad_slides: 5,
    angulo: 'Modo avión en la semana',
    slides: [
      {
        n_slide: 1,
        rol: 'portada',
        tipo: 'texto',
        pill_text: null,
        texto_principal: "Tu semana merece un 'modo avión'.",
        texto_apoyo: null,
        indicacion_imagen: 'Foto grupo',
      },
      {
        n_slide: 5,
        rol: 'cierre',
        tipo: 'texto',
        pill_text: 'PRÓXIMAS FECHAS',
        texto_principal: 'Vení a caminar',
        texto_apoyo: 'Martes y jueves 16hs',
        indicacion_imagen: 'Foto grupo',
      },
    ],
    cta_comentario: 'Comentá YERBA BUENA',
    carpeta_material: 'fotos-yerba-buena',
    mes: 'grupo semanal',
  }

  const row = mapPieceToInsertRow(piece, {
    salidaId: 'salida-1',
    userId: 'user-1',
    destino: 'Yerba Buena, Tucuman',
    tipoViaje: 'salida_recurrente',
    zonaGeografica: 'Tucumán',
    contentContextTags: ['actividad_trekking'],
  })

  assert.ok(row.descripcion_post, 'descripcion_post no debe ser null')
  assert.equal(typeof row.descripcion_post, 'string')
  assert.ok(row.descripcion_post.includes("Tu semana merece un 'modo avión'."))
  assert.ok(row.descripcion_post.includes('#Trekking') || row.descripcion_post.includes('#YerbaBuenaTucuman'))
})

test('mapPieceToInsertRow agrega hashtags a carrusel que ya tiene texto si faltan hashtags', () => {
  const piece = {
    formato: 'carrusel',
    formato_carrusel: 'organico',
    tema: 'motivacion',
    estructura_narrativa: 'directo',
    cantidad_slides: 5,
    angulo: 'Sendero cercano',
    slides: [],
    cta_comentario: 'Comentá INFO',
    descripcion_post: 'Después aparece Senderos de las yungas: uno de esos lugares cercanos.\n\nComentá INFO para sumarte.',
    carpeta_material: 'fotos',
    mes: 'grupo semanal',
  }

  const row = mapPieceToInsertRow(piece, {
    salidaId: 'salida-1',
    userId: 'user-1',
    destino: 'Horco Molle',
    tipoViaje: 'salida_recurrente',
    zonaGeografica: 'Tucumán',
    contentContextTags: ['actividad_trekking'],
  })

  assert.ok(row.descripcion_post.includes('Después aparece Senderos de las yungas'))
  assert.ok(row.descripcion_post.includes('#HorcoMolle') || row.descripcion_post.includes('#Trekking'))
})
