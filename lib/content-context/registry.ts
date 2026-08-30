export type ContentContextDimension = 'entorno' | 'clima' | 'actividad' | 'experiencia'

export interface ContentContextTagDefinition {
  id: string
  label: string
  dimension: ContentContextDimension
  copySignals: readonly string[]
  avoidSignals: readonly string[]
  musicKey?: string
}

/**
 * Registro único del contexto de una salida. Copy, música y validación consumen
 * estos IDs; ningún generador debe mantener su propia lista de zonas.
 */
export const CONTENT_CONTEXT_TAGS = [
  { id: 'entorno_caribe_playa', label: 'Caribe y playa', dimension: 'entorno', copySignals: ['mar', 'arena', 'agua cálida', 'vacaciones', 'vida costera'], avoidSignals: ['cumbre', 'refugio', 'nieve', 'expedición de montaña'], musicKey: 'caribe_playa' },
  { id: 'entorno_yungas_selva', label: 'Yungas y selva', dimension: 'entorno', copySignals: ['vegetación', 'senderos verdes', 'agua', 'biodiversidad', 'naturaleza húmeda'], avoidSignals: ['desierto', 'playa caribeña', 'nieve patagónica'], musicKey: 'yungas_selva' },
  { id: 'entorno_patagonia_nieve', label: 'Patagonia y nieve', dimension: 'entorno', copySignals: ['escala del paisaje', 'viento', 'bosque', 'lagos', 'nieve cuando esté verificada'], avoidSignals: ['Caribe', 'calor tropical', 'fiesta de playa'], musicKey: 'patagonia_nieve' },
  { id: 'entorno_montana_altura', label: 'Montaña y altura', dimension: 'entorno', copySignals: ['altura', 'relieve', 'amplitud', 'esfuerzo', 'paisaje de montaña'], avoidSignals: ['playa', 'vida nocturna costera'], musicKey: 'montana_altura' },
  { id: 'entorno_quebrada_desierto', label: 'Quebrada y desierto', dimension: 'entorno', copySignals: ['tierra', 'cardones', 'quebradas', 'altura', 'cultura local'], avoidSignals: ['selva húmeda', 'playa tropical'], musicKey: 'quebrada_desierto' },
  { id: 'entorno_bosque_lagos', label: 'Bosque y lagos', dimension: 'entorno', copySignals: ['bosque', 'lagos', 'agua', 'senderos', 'calma natural'], avoidSignals: ['desierto', 'ciudad'], musicKey: 'bosque_lagos' },
  { id: 'entorno_ciudad_cultura', label: 'Ciudad y cultura', dimension: 'entorno', copySignals: ['barrios', 'arquitectura', 'historia', 'movimiento urbano', 'vida local'], avoidSignals: ['cumbre', 'campamento'], musicKey: 'ciudad_cultura' },

  { id: 'clima_calido_humedo', label: 'Cálido y húmedo', dimension: 'clima', copySignals: ['calor', 'humedad', 'agua', 'ropa liviana', 'ritmo cálido'], avoidSignals: ['frío extremo', 'nieve', 'abrigo pesado'] },
  { id: 'clima_calido_seco', label: 'Cálido y seco', dimension: 'clima', copySignals: ['sol', 'aire seco', 'amplitud térmica', 'hidratación'], avoidSignals: ['humedad tropical', 'nieve'] },
  { id: 'clima_frio_nieve', label: 'Frío y nieve', dimension: 'clima', copySignals: ['frío', 'nieve cuando esté confirmada', 'abrigo', 'invierno'], avoidSignals: ['calor tropical', 'bronceado'] },
  { id: 'clima_frio_viento', label: 'Frío y viento', dimension: 'clima', copySignals: ['viento', 'frío', 'capas de abrigo', 'cambio de clima'], avoidSignals: ['calor húmedo'] },
  { id: 'clima_templado', label: 'Templado', dimension: 'clima', copySignals: ['clima amable', 'aire libre', 'recorrido cómodo'], avoidSignals: ['clima extremo no verificado'] },
  { id: 'clima_tropical_lluvia', label: 'Tropical y lluvioso', dimension: 'clima', copySignals: ['calor tropical', 'lluvia', 'vegetación', 'cambios rápidos'], avoidSignals: ['aire seco', 'nieve'] },

  { id: 'actividad_trekking', label: 'Trekking', dimension: 'actividad', copySignals: ['caminar', 'sendero', 'recorrido', 'equipo adecuado'], avoidSignals: ['hacer cumbre si no está cargado'] },
  { id: 'actividad_playa_descanso', label: 'Playa y descanso', dimension: 'actividad', copySignals: ['playa', 'descanso', 'mar', 'hotel', 'tiempo libre'], avoidSignals: ['trekking', 'ascenso', 'desnivel'] },
  { id: 'actividad_agua', label: 'Actividades acuáticas', dimension: 'actividad', copySignals: ['agua', 'mar', 'río o lago según la salida', 'movimiento'], avoidSignals: ['actividad técnica no cargada'] },
  { id: 'actividad_running', label: 'Running', dimension: 'actividad', copySignals: ['correr', 'ritmo', 'entrenamiento', 'recorrido'], avoidSignals: ['trekking técnico'] },
  { id: 'actividad_ciclismo', label: 'Ciclismo', dimension: 'actividad', copySignals: ['bicicleta', 'pedaleo', 'ruta', 'grupo'], avoidSignals: ['trekking'] },
  { id: 'actividad_nieve', label: 'Actividad en nieve', dimension: 'actividad', copySignals: ['nieve', 'invierno', 'actividad cargada'], avoidSignals: ['actividad técnica inventada'] },
  { id: 'actividad_cultura', label: 'Cultura y recorridos', dimension: 'actividad', copySignals: ['historia', 'cultura', 'barrios', 'visitas'], avoidSignals: ['expedición'] },
  { id: 'actividad_gastronomia', label: 'Gastronomía', dimension: 'actividad', copySignals: ['sabores', 'comidas', 'lugares para probar', 'experiencia local'], avoidSignals: ['comidas o restaurantes inventados'] },

  { id: 'experiencia_aventura', label: 'Aventura', dimension: 'experiencia', copySignals: ['descubrimiento', 'movimiento', 'experiencia activa'], avoidSignals: ['riesgo inventado'] },
  { id: 'experiencia_descanso', label: 'Descanso', dimension: 'experiencia', copySignals: ['bajar el ritmo', 'comodidad', 'tiempo libre', 'disfrutar'], avoidSignals: ['exigencia física inventada'] },
  { id: 'experiencia_fiesta', label: 'Fiesta y vida nocturna', dimension: 'experiencia', copySignals: ['música', 'baile', 'salir', 'amigos', 'noche'], avoidSignals: ['fiestas o entradas específicas no verificadas'], musicKey: 'fiesta' },
  { id: 'experiencia_bienestar', label: 'Bienestar', dimension: 'experiencia', copySignals: ['moverse', 'tomar aire', 'descansar la cabeza', 'naturaleza'], avoidSignals: ['cura', 'terapia como tratamiento'] },
  { id: 'experiencia_comunidad', label: 'Comunidad', dimension: 'experiencia', copySignals: ['grupo', 'compartir', 'conocer gente', 'acompañamiento'], avoidSignals: ['testimonios inventados'] },
  { id: 'experiencia_familia', label: 'Familiar', dimension: 'experiencia', copySignals: ['compartir', 'plan familiar', 'comodidad'], avoidSignals: ['apto para niños si no está confirmado'] },
  { id: 'experiencia_premium', label: 'Premium', dimension: 'experiencia', copySignals: ['servicio', 'comodidad', 'detalle', 'organización'], avoidSignals: ['lujo o categoría no verificada'] },
] as const satisfies readonly ContentContextTagDefinition[]

const TAG_BY_ID = new Map<string, ContentContextTagDefinition>(CONTENT_CONTEXT_TAGS.map(tag => [tag.id, tag]))

export const CONTENT_CONTEXT_DIMENSION_LABELS: Record<ContentContextDimension, string> = {
  entorno: 'Entorno',
  clima: 'Clima',
  actividad: 'Actividad',
  experiencia: 'Experiencia',
}

const LEGACY_ZONE_TAGS: Record<string, string[]> = {
  'caribe / playa': ['entorno_caribe_playa', 'clima_calido_humedo', 'actividad_playa_descanso'],
  'patagonia / nieve': ['entorno_patagonia_nieve', 'clima_frio_viento'],
  'norte argentino / desierto': ['entorno_quebrada_desierto', 'clima_calido_seco'],
  'naturaleza / selva': ['entorno_yungas_selva', 'clima_calido_humedo'],
  'ciudad / urbano': ['entorno_ciudad_cultura', 'actividad_cultura'],
  'europa / clásico': ['entorno_ciudad_cultura', 'actividad_cultura'],
}

export function normalizeContentContextTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && TAG_BY_ID.has(item)))]
}

export function resolveContentContextTags(value: { context_tags?: string[] | null; zona_geografica?: string | null }): string[] {
  const explicit = normalizeContentContextTags(value.context_tags)
  if (explicit.length) return explicit
  const legacy = value.zona_geografica?.trim().toLocaleLowerCase('es-AR')
  return legacy ? LEGACY_ZONE_TAGS[legacy] ?? [] : []
}

export function getContentContextDefinitions(ids: readonly string[]): ContentContextTagDefinition[] {
  return ids.flatMap(id => {
    const definition = TAG_BY_ID.get(id)
    return definition ? [definition] : []
  })
}

export function resolveContentMusicKeys(value: { context_tags?: string[] | null; zona_geografica?: string | null }): string[] {
  return [...new Set(
    getContentContextDefinitions(resolveContentContextTags(value))
      .flatMap(tag => tag.musicKey ? [tag.musicKey] : []),
  )]
}
