import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildVideoMaterialContext,
  videoMaterialCopyViolations,
  videoMaterialContextPromptBlock,
} from '../lib/material-context/video-material-context.ts'
import {selectVideoMaterialCandidate} from '../lib/material-context/video-material-selection.ts'

const salida = {
  destino: 'Cancún',
  puntos_interes: ['Playa Delfines'],
  itinerario_dias: [{dia: 3, titulo: 'Noche en Coco Bongo'}],
}

test('una colección raíz habilita destino pero no experiencias específicas', () => {
  const context = buildVideoMaterialContext({folderId: 'root', folderName: 'Cancún', salida})
  assert.equal(context.scope, 'destination')
  assert.equal(context.mentionPolicy, 'destination_only')
  assert.equal(context.destination, 'Cancún')
  assert.match(videoMaterialContextPromptBlock(context), /No nombres hoteles, playas, atracciones/)
})

test('una escena genérica describe lo visible sin transformarse en nombre propio', () => {
  const context = buildVideoMaterialContext({folderId: 'playa', folderName: 'Cancún/Playa de noche', salida})
  assert.equal(context.scope, 'scene')
  assert.equal(context.scene, 'Playa de noche')
  assert.equal(context.mentionPolicy, 'scene_only')
})

test('una experiencia específica solo se habilita cuando material e itinerario coinciden', () => {
  const context = buildVideoMaterialContext({folderId: 'coco', folderName: 'Cancún/Coco Bongo', salida})
  assert.equal(context.scope, 'specific')
  assert.equal(context.mentionPolicy, 'specific_allowed')
  assert.equal(context.verifiedSpecificName, 'Noche en Coco Bongo')

  const unverified = buildVideoMaterialContext({folderId: 'club', folderName: 'Cancún/Beach Club X', salida})
  assert.equal(unverified.scope, 'scene')
  assert.equal(unverified.mentionPolicy, 'scene_only')
})

test('rechaza un copy específico cuando la colección solo sostiene el destino', () => {
  const context = buildVideoMaterialContext({folderId: 'root', folderName: 'Cancún', salida})
  const errors = videoMaterialCopyViolations({copy: 'POV: 2 a.m. en Coco Bongo', context, salida}).join(' ')
  assert.match(errors, /Noche en Coco Bongo/u)
  assert.match(errors, /vida nocturna o boliche/u)
  assert.deepEqual(videoMaterialCopyViolations({copy: '📍 Cancún, México', context, salida}), [])
})

test('sin colección confirmada también rechaza escenas tomadas sólo del itinerario', () => {
  const errors = videoMaterialCopyViolations({copy: 'POV: 2 a.m. en Coco Bongo', context: null, salida}).join(' ')
  assert.match(errors, /Noche en Coco Bongo/u)
  assert.match(errors, /vida nocturna o boliche/u)
  assert.deepEqual(videoMaterialCopyViolations({copy: 'Vacaciones en Cancún 🌴', context: null, salida}), [])
})

test('una carpeta abreviada no convierte el nombre completo del destino en experiencia específica', () => {
  const completeDestination = {
    destino: 'Cancún, México',
    puntos_interes: [],
    itinerario_dias: [],
  }
  const context = buildVideoMaterialContext({
    folderId: 'folder-cancun',
    folderName: 'Cancún/grupo y paisajes',
    salida: completeDestination,
  })
  assert.deepEqual(videoMaterialCopyViolations({
    copy: '📍 Cancún, México 🇲🇽',
    context,
    salida: completeDestination,
  }), [])
})

test('una escena general no habilita hotel, actividades acuáticas ni contenido bajo el agua', () => {
  const general = buildVideoMaterialContext({
    folderId: 'folder-landscapes',
    folderName: 'Cancún/grupo y paisajes',
    salida,
  })
  const errors = videoMaterialCopyViolations({
    copy: 'Después, todo incluido, desayuno y fotos bajo el agua con cámara 360.',
    context: general,
    salida,
  }).join(' ')
  assert.match(errors, /hotel o all inclusive/u)
  assert.match(errors, /actividad bajo el agua/u)

  const hotel = buildVideoMaterialContext({
    folderId: 'folder-hotel',
    folderName: 'Cancún/hotel',
    salida,
  })
  assert.deepEqual(videoMaterialCopyViolations({
    copy: 'Una tarde en el hotel all inclusive.',
    context: hotel,
    salida,
  }), [])
})

test('la rotación de colecciones es determinística y prioriza video real', () => {
  const candidates = [
    {id: 'a', name: 'Hotel', hasVideos: false},
    {id: 'b', name: 'Playa', hasVideos: true},
    {id: 'c', name: 'Vida nocturna', hasVideos: true},
  ]
  assert.equal(selectVideoMaterialCandidate(candidates, 0)?.id, 'b')
  assert.equal(selectVideoMaterialCandidate(candidates, 1)?.id, 'c')
  assert.equal(selectVideoMaterialCandidate(candidates, 2)?.id, 'b')
})
