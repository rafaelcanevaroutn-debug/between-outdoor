// Pure data — no server-side imports. Safe to use in Client Components.
import type { TemaCarrusel } from '@/types'

export const TEMA_LABELS: Record<TemaCarrusel, string> = {
  seguridad:          'Seguridad y prevención',
  destinos:           'Destinos y rutas',
  preparacion_fisica: 'Preparación física',
  equipo:             'Equipo y gear',
  educacion_montana:  'Educación de montaña',
  testimonios:        'Testimonios y transformaciones',
  detras_del_guia:    'Detrás del guía',
  motivacion:         'Motivación e inspiración',
  logistica:          'Logística del servicio',
  dudas_objeciones:   'Dudas y objeciones',
  bienestar:          'Bienestar y salud en la montaña',
}
