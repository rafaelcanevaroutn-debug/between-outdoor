import type {Salida} from '@/types'

export type VideoMaterialScope = 'general' | 'destination' | 'scene' | 'specific'

export interface VideoMaterialContext {
  scope: VideoMaterialScope
  destination: string | null
  scene: string | null
  variant: string | null
  path: string
  folderId: string
  mentionPolicy: 'general_only' | 'destination_only' | 'scene_only' | 'specific_allowed'
  verifiedSpecificName: string | null
}

const GENERAL_LABELS = new Set([
  'general',
  'material general',
  'videos',
  'videos crudos',
  'fotos',
  'fotos generales',
])

const GENERIC_SCENE_WORDS = [
  'playa',
  'playas',
  'paisaje',
  'paisajes',
  'hotel',
  'hoteles',
  'grupo',
  'gente',
  'aeropuerto',
  'traslado',
  'traslados',
  'excursion',
  'excursiones',
  'actividad',
  'actividades',
  'vida nocturna',
  'noche',
  'atardecer',
  'amanecer',
  'snorkel',
  'buceo',
  'jet ski',
  'gastronomia',
  'comidas',
]

const VISUAL_TOPIC_RULES: Array<{
  label: string
  copy: RegExp
  material: RegExp
}> = [
  {
    label: 'hotel o all inclusive',
    copy: /\b(?:hotel|resort|all\s+inclusive|todo\s+incluido|alojamiento|habitaci[oó]n(?:es)?|desayun(?:o|amos|an|ar|á|ás)?)\b/iu,
    material: /\b(?:hotel|resort|all\s+inclusive|todo\s+incluido|alojamiento|habitaci[oó]n(?:es)?)\b/iu,
  },
  {
    label: 'actividad bajo el agua',
    copy: /\b(?:snorkel|buceo|bajo\s+el\s+agua|c[aá]mara\s+360|insta\s*360)\b/iu,
    material: /\b(?:snorkel|buceo|bajo\s+el\s+agua|submarin|360)\b/iu,
  },
  {
    label: 'actividad acuática o embarcación',
    copy: /\b(?:actividades?\s+acu[aá]ticas?|jet\s*ski|moto\s+de\s+agua|yate|catamar[aá]n)\b/iu,
    material: /\b(?:acu[aá]tic|jet\s*ski|moto\s+de\s+agua|yate|catamar[aá]n)\b/iu,
  },
  {
    label: 'vida nocturna o boliche',
    copy: /\b(?:vida\s+nocturna|boliche|discoteca|beach\s*club|coco\s+bongo)\b/iu,
    material: /\b(?:noche|nocturn|boliche|discoteca|club|coco\s+bongo)\b/iu,
  },
  {
    label: 'excursión o cenote',
    copy: /\b(?:excursi[oó]n|tour|cenote)\b/iu,
    material: /\b(?:excursi[oó]n|tour|cenote)\b/iu,
  },
]

export function normalizeMaterialLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('es-AR')
    .replace(/[_-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

function splitMaterialPath(path: string): string[] {
  return path
    .split('/')
    .map(part => part.trim())
    .filter(Boolean)
}

function salidaVerifiedNames(salida?: Pick<Salida, 'destino' | 'puntos_interes' | 'itinerario_dias'> | null): string[] {
  if (!salida) return []
  const pointPlaces = (salida.puntos_interes ?? []).flatMap(point => {
    const rawPoint: unknown = point
    if (typeof rawPoint === 'string') return rawPoint.trim() ? [rawPoint.trim()] : []
    if (!rawPoint || typeof rawPoint !== 'object') return []
    const record = rawPoint as Record<string, unknown>
    const name = typeof record.nombre === 'string' ? record.nombre.trim() : ''
    const location = typeof record.ubicacion === 'string' ? record.ubicacion.trim() : ''
    return [name, location, name && location ? `${name}, ${location}` : ''].filter(Boolean)
  })
  const itineraryPlaces = (salida.itinerario_dias ?? []).flatMap(day => {
    if (!day || typeof day !== 'object') return []
    const record = day as unknown as Record<string, unknown>
    return [record.titulo, record.lugar, record.destino, record.actividad]
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
  })
  return [salida.destino, ...pointPlaces, ...itineraryPlaces]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
}

function isGenericScene(label: string): boolean {
  const normalized = normalizeMaterialLabel(label)
  return GENERIC_SCENE_WORDS.some(word => normalized === word || normalized.includes(`${word} `) || normalized.includes(` ${word}`))
}

function verifiedSpecificName(label: string, salida?: Pick<Salida, 'destino' | 'puntos_interes' | 'itinerario_dias'> | null): string | null {
  const normalizedLabel = normalizeMaterialLabel(label)
  if (!normalizedLabel) return null
  return salidaVerifiedNames(salida).find(name => {
    const normalizedName = normalizeMaterialLabel(name)
    return normalizedName === normalizedLabel
      || normalizedName.includes(normalizedLabel)
      || normalizedLabel.includes(normalizedName)
  }) ?? null
}

/**
 * Traduce la ruta técnica actual a un contrato semántico estable. El usuario
 * ve destino/escena/variante; Drive queda como un detalle intercambiable.
 */
export function buildVideoMaterialContext(params: {
  folderId: string
  folderName?: string | null
  salida?: Pick<Salida, 'destino' | 'puntos_interes' | 'itinerario_dias'> | null
}): VideoMaterialContext {
  const path = params.folderName?.trim() ?? ''
  const parts = splitMaterialPath(path)
  const destination = parts[0] ?? params.salida?.destino?.trim() ?? null
  const remaining = parts.slice(1).filter(part => !GENERAL_LABELS.has(normalizeMaterialLabel(part)))
  const scene = remaining[0] ?? null
  const variant = remaining.slice(1).join(' · ') || null
  const mostSpecificLabel = variant || scene
  const verifiedName = mostSpecificLabel ? verifiedSpecificName(mostSpecificLabel, params.salida) : null

  if (!destination) {
    return {
      scope: 'general', destination: null, scene: null, variant: null,
      path, folderId: params.folderId, mentionPolicy: 'general_only', verifiedSpecificName: null,
    }
  }
  if (!scene) {
    return {
      scope: 'destination', destination, scene: null, variant: null,
      path, folderId: params.folderId, mentionPolicy: 'destination_only', verifiedSpecificName: null,
    }
  }
  if (verifiedName && !isGenericScene(mostSpecificLabel ?? '')) {
    return {
      scope: 'specific', destination, scene, variant,
      path, folderId: params.folderId, mentionPolicy: 'specific_allowed', verifiedSpecificName: verifiedName,
    }
  }
  return {
    scope: 'scene', destination, scene, variant,
    path, folderId: params.folderId, mentionPolicy: 'scene_only', verifiedSpecificName: null,
  }
}

export function videoMaterialContextPromptBlock(context?: VideoMaterialContext | null): string {
  if (!context) {
    return `=== MATERIAL VISUAL DISPONIBLE ===
No hay una colección visual específica confirmada. Escribí contenido general compatible con la salida. No nombres hoteles, excursiones, playas, boliches ni experiencias concretas solo porque aparezcan en el itinerario.`
  }

  const base = `=== MATERIAL VISUAL CONFIRMADO PARA ESTA PIEZA ===
${JSON.stringify({
    alcance: context.scope,
    destino: context.destination,
    escena: context.scene,
    variante: context.variant,
    nombre_especifico_verificado: context.verifiedSpecificName,
  }, null, 2)}

El generador de copy y el renderizador usan ESTA MISMA colección. El copy debe poder sostenerse con este material.`

  if (context.mentionPolicy === 'general_only') {
    return `${base}
- Hablá de viajar, vacaciones o playa de forma general.
- No nombres ningún destino, hotel, atracción, excursión o experiencia específica.`
  }
  if (context.mentionPolicy === 'destination_only') {
    return `${base}
- Podés nombrar únicamente el destino confirmado: ${context.destination}.
- No nombres hoteles, playas, atracciones, boliches ni excursiones específicas.
- Aunque esos datos aparezcan en el itinerario, ignorá alojamiento, régimen de comidas, all inclusive, actividades acuáticas y experiencias puntuales: esta colección no permite mostrarlos.
- Para consejos o relatos, usá solamente el destino general, el viaje en grupo y logística verificable compatible con imágenes generales.`
  }
  if (context.mentionPolicy === 'scene_only') {
    return `${base}
- Podés hablar de la escena general “${context.scene}” y del destino “${context.destination}”.
- La etiqueta de escena describe qué se ve; no la conviertas en el nombre propio de un lugar.
- No inventes el hotel, playa, atracción o actividad exacta.
- Aunque esos datos aparezcan en el itinerario, ignorá alojamiento, régimen de comidas, all inclusive, actividades acuáticas y experiencias puntuales: esta colección no permite mostrarlos.
- Para consejos o relatos, usá solamente el destino general, lo que realmente se ve en la escena, el viaje en grupo y logística verificable compatible con esas imágenes.`
  }
  return `${base}
- Podés mencionar “${context.verifiedSpecificName}” porque coincide con el material y con datos verificados de la salida.
- No agregues características, precios, horarios ni promesas que no estén cargados en la salida.`
}

export function videoMaterialCopyViolations(params: {
  copy: string
  context?: VideoMaterialContext | null
  salida?: Pick<Salida, 'destino' | 'puntos_interes' | 'itinerario_dias'> | null
}): string[] {
  const {copy, context, salida} = params
  if (context?.mentionPolicy === 'specific_allowed') return []
  const normalizedCopy = normalizeMaterialLabel(copy)
  const destination = normalizeMaterialLabel(context?.destination ?? salida?.destino ?? '')
  const salidaDestination = normalizeMaterialLabel(salida?.destino ?? '')
  const forbiddenNames = salidaVerifiedNames(salida).filter(name => {
    const normalizedName = normalizeMaterialLabel(name)
    if (!normalizedName || normalizedName === destination || normalizedName === salidaDestination) return false
    const aliases = [
      normalizedName,
      ...normalizedName
        .split(/\b(?:en|a|de|del|desde|hacia|por)\b/gu)
        .map(value => value.trim())
        .filter(value => value.split(' ').length >= 2),
    ]
    return aliases.some(alias => normalizedCopy.includes(alias))
  })
  const errors = forbiddenNames.length > 0
    ? [`el copy nombra material específico no confirmado para esta pieza: ${forbiddenNames.join(', ')}`]
    : []
  const materialDescription = normalizeMaterialLabel([
    context?.scene,
    context?.variant,
    context?.verifiedSpecificName,
  ].filter(Boolean).join(' '))
  for (const rule of VISUAL_TOPIC_RULES) {
    if (rule.copy.test(copy) && !rule.material.test(materialDescription)) {
      errors.push(`el copy requiere material visual de ${rule.label}, pero la colección seleccionada no lo confirma`)
    }
  }
  return errors
}
