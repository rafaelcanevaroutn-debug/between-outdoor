import type { Salida } from '@/types'
import { comparableVideoText as comparable } from './video-verified-places.ts'

// Corpus factual de una salida — usado por Familia 2 para validar que
// ningún número mencionado (en 2b, o en cada tip de 2c) sea inventado.
// Cubre los mismos campos que buildSalidaBlock ya le muestra a Gemini en
// el prompt (incluye que_incluye/que_no_incluye) — el corpus de validación
// no puede ser más angosto que lo que el modelo tiene permitido citar.
// Única fuente de verdad para "¿este número existe realmente en la salida?".

export function factualCorpus(salida: Salida): string {
  const values = [
    salida.nombre,
    salida.destino,
    salida.nivel,
    salida.itinerario ?? '',
    salida.punto_encuentro ?? '',
    salida.que_incluye ?? '',
    salida.que_no_incluye ?? '',
    ...salida.itinerario_dias.flatMap(day => [day.titulo, day.descripcion, day.horario ?? '', day.hito ?? '']),
    ...salida.puntos_interes.flatMap(point => [
      point.nombre,
      point.descripcion,
      point.ubicacion ?? '',
      point.distancia ?? '',
      point.duracion ?? '',
      point.dificultad ?? '',
    ]),
  ]
  return comparable(values.filter(Boolean).join(' | '))
}

export function numericClaims(value: string): string[] {
  return value.match(/\b\d+(?:[.,]\d+)?(?:\s*(?:km|m|metros?|horas?|hs|minutos?|min))?\b/giu) ?? []
}

export function unsupportedNumericClaims(value: string, salida: Salida): string[] {
  const corpus = factualCorpus(salida)
  return numericClaims(value).filter(claim => !corpus.includes(comparable(claim)))
}
