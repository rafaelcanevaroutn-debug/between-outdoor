/**
 * Visual references recovered from the first Caminantes static-design study.
 *
 * These are deliberately not templates. The source demos contain hardcoded copy,
 * local image paths and three layouts per HTML document. This catalog preserves
 * the useful design decisions as portable prompt input without allowing a legacy
 * artifact to enter the production template library by accident.
 */

export type CreativeVisualSeedId =
  | 'chalten-editorial-clear'
  | 'chalten-cinematic-rail'
  | 'chalten-modular-journal'
  | 'cancun-editorial-coast'
  | 'cancun-aerial-ticket'
  | 'cancun-premium-resort'

export interface CreativeVisualSeed {
  id: CreativeVisualSeedId
  name: string
  campaign: 'el_chalten' | 'cancun_playa_del_carmen'
  legacySource: {
    htmlFile: string
    layout: 1 | 2 | 3
    previewFile: string
  }
  compatibleMolds: Array<1 | 2 | 3 | 6>
  archetype: string
  composition: string
  imageTreatment: string
  hierarchy: string
  signatureDetails: string[]
  reusablePrinciples: string[]
  antiPatterns: string[]
}

export const CREATIVE_VISUAL_SEEDS: readonly CreativeVisualSeed[] = [
  {
    id: 'chalten-editorial-clear',
    name: 'Editorial claro asimétrico',
    campaign: 'el_chalten',
    legacySource: {
      htmlFile: 'caminantes-el-chalten-demo.html',
      layout: 1,
      previewFile: 'caminantes-banner-1.png',
    },
    compatibleMolds: [2, 3],
    archetype: 'Portada editorial clara con grilla asimétrica y gran área de aire.',
    composition: 'Información concentrada arriba; fotografía panorámica en el tercio inferior; CTA pequeño en el borde.',
    imageTreatment: 'Imagen horizontal limpia, sin competir con el título y con recorte paisajístico reconocible.',
    hierarchy: 'Destino dominante, fecha como segundo ancla, ficha breve en columnas y detalles en microtipografía.',
    signatureDetails: ['fondo marfil', 'acento verde puntual', 'reglas finas', 'numeración editorial'],
    reusablePrinciples: [
      'Reservar aire real alrededor del título.',
      'Separar datos de viaje con una grilla, no con cajas repetidas.',
      'Usar el color de marca como acento y no como relleno dominante.',
    ],
    antiPatterns: ['llenar el área superior con badges', 'superponer texto importante sobre una imagen ruidosa'],
  },
  {
    id: 'chalten-cinematic-rail',
    name: 'Cinemático oscuro con riel',
    campaign: 'el_chalten',
    legacySource: {
      htmlFile: 'caminantes-el-chalten-demo.html',
      layout: 2,
      previewFile: 'caminantes-banner-2.png',
    },
    compatibleMolds: [1, 6],
    archetype: 'Póster cinematográfico oscuro con fotografía inmersiva y riel vertical de fecha.',
    composition: 'Foto a sangre; título y ficha anclados abajo; fecha aislada en una banda lateral estrecha.',
    imageTreatment: 'Gradiente oscuro localizado para legibilidad, preservando la montaña como protagonista.',
    hierarchy: 'Título monumental, fecha de lectura secundaria y tarjeta compacta con los datos indispensables.',
    signatureDetails: ['riel verde vertical', 'contraste alto', 'bloque inferior profundo', 'CTA discreto'],
    reusablePrinciples: [
      'Oscurecer solamente la zona que recibe texto.',
      'Dar a un único dato secundario un gesto gráfico memorable.',
      'Mantener la ficha pequeña frente a la emoción de la fotografía.',
    ],
    antiPatterns: ['aplicar overlay opaco sobre toda la foto', 'usar más de un riel o gesto lateral'],
  },
  {
    id: 'chalten-modular-journal',
    name: 'Journal modular premium',
    campaign: 'el_chalten',
    legacySource: {
      htmlFile: 'caminantes-el-chalten-demo.html',
      layout: 3,
      previewFile: 'caminantes-banner-3.png',
    },
    compatibleMolds: [2, 3],
    archetype: 'Página de revista de aventura organizada como un ledger de módulos editoriales.',
    composition: 'Fotografía superior, título central y banda inferior dividida en fecha, ficha, rutas y CTA.',
    imageTreatment: 'Recorte hero superior con transición limpia hacia una superficie editorial clara.',
    hierarchy: 'El destino abre la lectura; luego fecha y valor; los puntos de interés funcionan como cierre informativo.',
    signatureDetails: ['módulos con reglas', 'microetiquetas', 'ritmo de columnas', 'acabado de revista'],
    reusablePrinciples: [
      'Agrupar por significado antes de dibujar módulos.',
      'Variar anchos de columna para evitar apariencia de dashboard.',
      'Usar reglas y espacio para separar, evitando sombras decorativas.',
    ],
    antiPatterns: ['convertir todos los datos en tarjetas iguales', 'sobrecargar la franja inferior'],
  },
  {
    id: 'cancun-editorial-coast',
    name: 'Editorial costero luminoso',
    campaign: 'cancun_playa_del_carmen',
    legacySource: {
      htmlFile: 'caminantes-cancun-demo.html',
      layout: 1,
      previewFile: 'caminantes-cancun-banner-1.png',
    },
    compatibleMolds: [2, 3, 6],
    archetype: 'Portada de viaje luminosa con fotografía costera y panel editorial marfil.',
    composition: 'Foto dominante en diagonal visual; panel de información sólido; título quebrado en dos escalas.',
    imageTreatment: 'Color natural y luminoso, con separación nítida entre imagen y contenido.',
    hierarchy: 'Destino principal grande, extensión del destino más liviana, fecha destacada y beneficios comprimidos.',
    signatureDetails: ['aqua como acento', 'panel marfil', 'título quebrado', 'líneas de itinerario'],
    reusablePrinciples: [
      'Permitir que un destino compuesto tenga dos niveles tipográficos.',
      'Tomar un color de la foto como acento secundario.',
      'Comprimir beneficios en una línea de lectura rápida.',
    ],
    antiPatterns: ['usar estética tropical genérica', 'agregar ilustraciones playeras decorativas'],
  },
  {
    id: 'cancun-aerial-ticket',
    name: 'Ticket aéreo con riel',
    campaign: 'cancun_playa_del_carmen',
    legacySource: {
      htmlFile: 'caminantes-cancun-demo.html',
      layout: 2,
      previewFile: 'caminantes-cancun-banner-2.png',
    },
    compatibleMolds: [2, 3],
    archetype: 'Pieza inspirada en ticket de viaje con imagen aérea y columna de control.',
    composition: 'Imagen vertical amplia; riel lateral para identidad; bloque inferior para título, fecha y ficha.',
    imageTreatment: 'Vista aérea geométrica que aporta textura sin necesitar elementos decorativos.',
    hierarchy: 'La imagen capta; el título confirma el destino; fecha y ficha resuelven la decisión.',
    signatureDetails: ['columna tipo talón', 'marcadores técnicos', 'reglas de ticket', 'base profunda'],
    reusablePrinciples: [
      'Usar la metáfora de ticket mediante estructura, no mediante iconos literales.',
      'Aislar identidad y folio en un riel de baja anchura.',
      'Reservar un bloque de color estable para el contenido variable.',
    ],
    antiPatterns: ['imitar un boarding pass de forma literal', 'multiplicar sellos, códigos o pictogramas'],
  },
  {
    id: 'cancun-premium-resort',
    name: 'Resort premium por bloques',
    campaign: 'cancun_playa_del_carmen',
    legacySource: {
      htmlFile: 'caminantes-cancun-demo.html',
      layout: 3,
      previewFile: 'caminantes-cancun-banner-3.png',
    },
    compatibleMolds: [1, 2, 3, 6],
    archetype: 'Composición premium de resort con bloques amplios y fotografía contenida.',
    composition: 'Cabecera fotográfica, fecha en chip independiente, gran zona tipográfica y cierre modular.',
    imageTreatment: 'Foto contenida con bordes precisos; el diseño no depende de texto superpuesto.',
    hierarchy: 'Fecha visible sin competir, título amplio, mensaje corto y lista final de atributos.',
    signatureDetails: ['chip de fecha', 'bloques profundos', 'contraste marfil/aqua', 'lista editorial'],
    reusablePrinciples: [
      'Tratar la fecha como objeto gráfico autónomo.',
      'Construir lujo mediante proporción, aire y tipografía, no con ornamentos.',
      'Dejar una zona de contenido estable que tolere copys de distinta longitud.',
    ],
    antiPatterns: ['usar dorado como atajo de lujo', 'hacer que cada bloque compita por atención'],
  },
] as const

export function selectCreativeVisualSeeds(params: {
  moldType?: 1 | 2 | 3 | 6
  ids?: CreativeVisualSeedId[]
  limit?: number
} = {}): CreativeVisualSeed[] {
  const idSet = params.ids ? new Set(params.ids) : undefined
  const limit = params.limit ?? CREATIVE_VISUAL_SEEDS.length
  if (!Number.isInteger(limit) || limit < 1 || limit > CREATIVE_VISUAL_SEEDS.length) {
    throw new Error(`limit debe estar entre 1 y ${CREATIVE_VISUAL_SEEDS.length}`)
  }
  return CREATIVE_VISUAL_SEEDS
    .filter((seed) => !idSet || idSet.has(seed.id))
    .filter((seed) => params.moldType === undefined || seed.compatibleMolds.includes(params.moldType))
    .slice(0, limit)
}

export function formatCreativeVisualSeedsForPrompt(seeds: readonly CreativeVisualSeed[]): string[] {
  return seeds.map((seed) => [
    `Referencia visual: ${seed.name}.`,
    `Arquetipo: ${seed.archetype}`,
    `Composición: ${seed.composition}`,
    `Imagen: ${seed.imageTreatment}`,
    `Jerarquía: ${seed.hierarchy}`,
    `Recursos distintivos: ${seed.signatureDetails.join('; ')}.`,
    `Principios a reinterpretar: ${seed.reusablePrinciples.join(' ')}`,
    `Evitar: ${seed.antiPatterns.join('; ')}.`,
    'No copies la pieza literalmente ni inventes slots: reinterpretá sus principios dentro del contrato recibido.',
  ].join('\n'))
}
