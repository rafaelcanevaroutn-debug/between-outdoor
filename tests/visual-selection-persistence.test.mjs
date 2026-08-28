import test from 'node:test'
import assert from 'node:assert/strict'
import { mapPieceToInsertRow } from '../lib/contenido-insert.ts'

test('persiste los IDs reservados para que el renderer use esas fotos', () => {
  const row = mapPieceToInsertRow({
    formato: 'carrusel',
    formato_carrusel: 'organico',
    tema: 'grupo local',
    estructura_narrativa: 'directo',
    cantidad_slides: 5,
    angulo: 'Un lugar cerca',
    slides: Array.from({ length: 5 }, (_, index) => ({
      n_slide: index + 1,
      rol: index === 0 ? 'portada' : 'foto',
      texto_principal: index === 0 ? 'Horco Molle' : null,
      texto_apoyo: null,
      indicacion_imagen: 'foto real',
    })),
    cta_comentario: 'Comentá INFO',
    objetivo_interaccion: 'convertir',
    descripcion_post: 'Una caminata cerca.',
    carpeta_material: 'Tucuman/Horco-Molle',
    mes: 'grupo semanal',
  }, {
    salidaId: 'salida-1',
    userId: 'user-1',
    carpetaFotos: 'Tucuman/Horco-Molle',
    preferredImageFileIds: ['foto-1', 'foto-2', 'foto-3', 'foto-4', 'foto-5'],
    preferredImageFileNames: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg'],
    visualSelectionReused: false,
  })

  assert.deepEqual(row.generation_metadata.visual_selection, {
    preferred_image_file_ids: ['foto-1', 'foto-2', 'foto-3', 'foto-4', 'foto-5'],
    preferred_image_file_names: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg'],
    reused_after_exhaustion: false,
  })
})
