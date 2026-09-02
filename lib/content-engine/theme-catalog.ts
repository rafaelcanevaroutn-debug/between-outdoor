import type { TemaCarrusel } from '@/types'

export interface ContentThemeDefinition {
  id: TemaCarrusel
  label: string
  purpose: string
}

export const CONTENT_THEME_CATALOG: Record<TemaCarrusel, ContentThemeDefinition> = {
  seguridad: {
    id: 'seguridad',
    label: 'Seguridad',
    purpose: 'Decisiones, prevención y criterios verificables para vivir la actividad con responsabilidad.',
  },
  destinos: {
    id: 'destinos',
    label: 'Destinos',
    purpose: 'El lugar, sus rasgos documentados y lo que permite hacer allí, sin convertirlo en folleto.',
  },
  preparacion_fisica: {
    id: 'preparacion_fisica',
    label: 'Preparación',
    purpose: 'Preparación previa, hábitos y progresión; no equipamiento ni barreras físicas inventadas.',
  },
  equipo: {
    id: 'equipo',
    label: 'Equipo',
    purpose: 'Qué llevar y por qué, únicamente cuando la salida o el cliente aportan información verificable.',
  },
  educacion_montana: {
    id: 'educacion_montana',
    label: 'Educación outdoor',
    purpose: 'Conocimiento práctico o técnico aplicable, explicado con claridad y sin credenciales inventadas.',
  },
  testimonios: {
    id: 'testimonios',
    label: 'Testimonios',
    purpose: 'Voces y experiencias reales aportadas por el cliente; nunca fabricar participantes ni resultados.',
  },
  detras_del_guia: {
    id: 'detras_del_guia',
    label: 'Detrás del guía',
    purpose: 'La persona, su criterio, proceso y trayectoria usando solamente información cargada.',
  },
  motivacion: {
    id: 'motivacion',
    label: 'Motivación',
    purpose: 'Una decisión, deseo o impulso humano concreto para salir, moverse o viajar.',
  },
  logistica: {
    id: 'logistica',
    label: 'Logística',
    purpose: 'Datos operativos exactos que facilitan entender, elegir o reservar la experiencia.',
  },
  dudas_objeciones: {
    id: 'dudas_objeciones',
    label: 'Dudas y objeciones',
    purpose: 'Una duda real resuelta con evidencia disponible, sin minimizarla ni prometer de más.',
  },
  bienestar: {
    id: 'bienestar',
    label: 'Bienestar',
    purpose: 'Movimiento, disfrute, descanso o naturaleza sin asumir profesión, rutina ni problema psicológico.',
  },
}

export function themePurpose(theme: TemaCarrusel): string {
  return CONTENT_THEME_CATALOG[theme].purpose
}

