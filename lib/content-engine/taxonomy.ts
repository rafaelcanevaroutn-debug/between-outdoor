import type {
  EstructuraNarrativa,
  FormatoCarrusel,
  TemaCarrusel,
  VideoKnowledgeFormat,
} from '@/types'

/**
 * Taxonomía canónica del motor de contenido.
 *
 * Separa conceptos que históricamente quedaron mezclados:
 * - tema: de qué habla la pieza;
 * - formato: cómo se presenta;
 * - estructura: cómo avanza la idea;
 * - medio: qué renderizador la produce.
 *
 * Los ids existentes se conservan para no romper calendarios ni filas viejas.
 */
export type ContentMedium = 'carousel' | 'video' | 'banner' | 'flyer'
export type ContentTheme = TemaCarrusel

export const CONTENT_THEMES = [
  'seguridad',
  'destinos',
  'preparacion_fisica',
  'equipo',
  'educacion_montana',
  'testimonios',
  'detras_del_guia',
  'motivacion',
  'logistica',
  'dudas_objeciones',
  'bienestar',
] as const satisfies readonly ContentTheme[]

export const CAROUSEL_FORMATS = [
  'editorial',
  'organico',
  'itinerario',
  'ascenso',
  'calendario',
  'lugar',
  'conversacion',
] as const satisfies readonly FormatoCarrusel[]

export const VIDEO_FORMATS = [
  '1a', '1b', '1c',
  '2a', '2b', '2c',
  '3a', '3b', '3c', '3d', '3e',
  '4', '5',
] as const satisfies readonly VideoKnowledgeFormat[]

export const NARRATIVE_STRUCTURES = [
  'problema_solucion',
  'lista_tips',
  'storytelling',
  'mito_vs_realidad',
  'antes_despues',
  'paso_a_paso',
  'pregunta_respuesta',
] as const satisfies readonly EstructuraNarrativa[]

export interface ThemeCompatibility {
  carousel: readonly FormatoCarrusel[]
  video: readonly VideoKnowledgeFormat[]
}

/**
 * Compatibilidad editorial inicial. Es una lista de opciones permitidas, no
 * una obligación de que el calendario use todas. El planificador sigue
 * decidiendo la mezcla y el registry del cliente puede reducirla.
 */
export const THEME_COMPATIBILITY: Record<ContentTheme, ThemeCompatibility> = {
  seguridad: {
    carousel: ['editorial', 'conversacion'],
    video: ['1a', '2a', '2c', '3d', '5'],
  },
  destinos: {
    carousel: ['editorial', 'organico', 'itinerario', 'ascenso', 'lugar', 'conversacion'],
    video: ['1c', '2b', '3b', '3e', '4', '5'],
  },
  preparacion_fisica: {
    carousel: ['editorial', 'organico', 'conversacion'],
    video: ['1a', '1c', '2a', '2c', '3d'],
  },
  equipo: {
    carousel: ['editorial', 'organico', 'conversacion'],
    video: ['1a', '2a', '2c', '3d', '5'],
  },
  educacion_montana: {
    carousel: ['editorial', 'organico', 'conversacion'],
    video: ['1a', '1c', '2a', '2c', '3d', '5'],
  },
  testimonios: {
    carousel: ['editorial', 'ascenso', 'conversacion'],
    video: ['1a', '1c', '2b', '3d'],
  },
  detras_del_guia: {
    carousel: ['editorial', 'ascenso', 'organico', 'conversacion'],
    video: ['1a', '1c', '2b', '3d'],
  },
  motivacion: {
    carousel: ['editorial', 'organico', 'conversacion'],
    video: ['1b', '1c', '2b', '3a', '3b', '3c', '3d'],
  },
  logistica: {
    carousel: ['editorial', 'itinerario', 'calendario', 'conversacion'],
    video: ['1a', '2a', '2c', '3d', '4', '5'],
  },
  dudas_objeciones: {
    carousel: ['editorial', 'organico', 'conversacion'],
    video: ['1a', '1c', '2c', '3c', '3d', '4'],
  },
  bienestar: {
    carousel: ['editorial', 'organico', 'conversacion'],
    video: ['1b', '1c', '2b', '3a', '3b', '3d'],
  },
}

export function supportsTheme(
  medium: 'carousel' | 'video',
  format: FormatoCarrusel | VideoKnowledgeFormat,
  theme: ContentTheme,
): boolean {
  return (THEME_COMPATIBILITY[theme][medium] as readonly string[]).includes(format)
}

