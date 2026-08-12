import type { Salida } from '@/types'
import { comparableVideoText as comparable } from './video-verified-places.ts'

// Corpus factual de una salida — compartido entre Familia 2 (storytelling
// de 2b valida que ningún número mencionado sea inventado) y Familia 5
// (consejos: todo dato técnico numérico citado debe existir acá). Única
// fuente de verdad para "¿este número existe realmente en la salida?".

export function factualCorpus(salida: Salida): string {
  const values = [
    salida.nombre,
    salida.destino,
    salida.nivel,
    salida.itinerario ?? '',
    salida.punto_encuentro ?? '',
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
