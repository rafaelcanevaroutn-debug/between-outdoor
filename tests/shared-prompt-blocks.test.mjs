import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildClientBlock,
  buildSalidaBlock,
} from '../lib/generators/shared-prompt-blocks.ts'

test('buildClientBlock conserva exactamente el contrato usado por carrusel-formato', () => {
  const onboarding = {
    avatar_edad_genero: 'Personas de 30 a 45 años',
    avatar_experiencia: 'Nivel inicial',
    avatar_objeciones: 'No tener compañía',
    avatar_motor: ['aventura', 'comunidad'],
    marca_personalidad: 'Cercana y directa',
    marca_lineas_rojas: 'No hablar de épica',
    embudo_paso: 'whatsapp',
  }

  assert.equal(
    buildClientBlock('Andes Club', onboarding),
    `=== PERFIL DEL CLIENTE ===
- Marca pública: Andes Club
- Público: Personas de 30 a 45 años
- Experiencia del público: Nivel inicial
- Objeciones reales: No tener compañía
- Motivaciones: aventura, comunidad
- Voz de marca: Cercana y directa
- Líneas rojas: No hablar de épica
- Canal de conversión: whatsapp`,
  )
})

test('buildClientBlock omite campos ausentes sin agregar líneas vacías', () => {
  assert.equal(
    buildClientBlock('Andes Club', null),
    `=== PERFIL DEL CLIENTE ===
- Marca pública: Andes Club`,
  )
})

test('buildSalidaBlock conserva formato, exactitud y fallback de punto de encuentro', () => {
  const salida = {
    nombre: 'Cruce del Valle',
    destino: 'Tafí del Valle',
    fecha_inicio: '2026-08-14',
    fecha_fin: '2026-08-16',
    nivel: 'media',
    cupos: 12,
    moneda: 'ARS',
    precio_usd: 250000,
    que_incluye: 'Guía y traslados',
    link_inscripcion: 'https://example.com/reserva',
    punto_encuentro: null,
    hora_encuentro: '06:30',
  }

  assert.equal(
    buildSalidaBlock(salida),
    `=== DATOS VERIFICADOS DE LA SALIDA ===
- Nombre: Cruce del Valle
- Destino: Tafí del Valle
- Fecha: viernes 14 al domingo 16 de agosto de 2026
- Duración calendario exacta: 3 días (2 noches si la salida incluye todas las noches intermedias)
- Nivel: media
- Cupos: 12
- Precio: ARS 250000
- Incluye (dato exacto): Guía y traslados
- Inscripción: https://example.com/reserva
- Punto de encuentro: NO CARGADO. No inferirlo desde el inicio de un sendero, una ubicación o un destino.
- Hora de encuentro confirmada: 06:30`,
  )
})
