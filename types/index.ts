export type Niche = 'trekking' | 'running' | 'ciclismo' | 'turismo_aventura'

// Calendario editorial asignado al cliente (ver lib/calendar-catalog.ts)
export type CalendarCode = 'CAL-00' | 'CAL-01' | 'CAL-02' | 'CAL-03' | 'CAL-04' | 'CAL-05'

// ─── Batch semanal de calendario (ver lib/orchestrators/weekly-batch.ts) ──────

export type CalendarBatchSlotOutcome = 'generated' | 'ineligible' | 'error' | 'sin_salida_disponible'
export type CalendarBatchRenderStatus = 'render_pending' | 'rendered' | 'render_failed'

export interface CalendarBatchSlotResult {
  index: number
  label: string
  formatoCarrusel: FormatoCarrusel
  salidaId: string | null
  outcome: CalendarBatchSlotOutcome
  contenidoId?: string
  renderStatus?: CalendarBatchRenderStatus
  reason?: string
}

export interface CalendarBatchResult {
  calendarCode: CalendarCode
  generated: number
  failed: number
  slots: CalendarBatchSlotResult[]
  // Video-familias del batch — opcional, elegido a mano por el usuario,
  // completamente aparte de los slots de carrusel (ver WeeklyBatchPanel).
  videoGenerated?: number
  videoFailed?: number
}

export interface CalendarBatchRun {
  id: string
  user_id: string
  calendar_code: CalendarCode
  status: 'pending' | 'running' | 'completed' | 'error'
  result: CalendarBatchResult | null
  error: string | null
  created_at: string
  updated_at: string
}

// ─── Carrusel estructurado ────────────────────────────────────────────────────

export type TemaCarrusel =
  | 'seguridad'
  | 'destinos'
  | 'preparacion_fisica'
  | 'equipo'
  | 'educacion_montana'
  | 'testimonios'
  | 'detras_del_guia'
  | 'motivacion'
  | 'logistica'
  | 'dudas_objeciones'
  | 'bienestar'

export type TemaVideo = 'motivacional' | 'pov' | 'comercial'
export type VideoFamilia1Subfamilia = '1a'
export type VideoFamilia2Subfamilia = '2a' | '2b'
export type VideoFamilia3Subfamilia = '3a' | '3b' | '3c' | '3d' | '3e'
export type VideoKnowledgeFormat = VideoFamilia1Subfamilia | VideoFamilia2Subfamilia | VideoFamilia3Subfamilia | '4'

// Catálogo cerrado de tipografías confirmado por Mati — aplica parejo a
// las 4 familias de video, sin excepción (ver lib/generators/video-typography.ts).
export type VideoTypographyId =
  | 'Montserrat'
  | 'Inter'
  | 'Oswald'
  | 'Bangers'
  | 'Playfair Display'

export type EstructuraNarrativa =
  | 'problema_solucion'
  | 'lista_tips'
  | 'storytelling'
  | 'mito_vs_realidad'
  | 'antes_despues'
  | 'paso_a_paso'
  | 'pregunta_respuesta'

export type RolSlide = 'portada' | 'desarrollo' | 'datos' | 'foto' | 'cierre'

export type FormatoCarrusel =
  | 'editorial'
  | 'organico'
  | 'itinerario'
  | 'ascenso'
  | 'calendario'
  | 'lugar'
  | 'conversacion'

export type ObjetivoInteraccion = 'comentar' | 'guardar' | 'compartir' | 'convertir'
export type TipoSlideCarrusel = 'texto' | 'foto' | 'dialogo' | 'ficha'

export interface FuenteContenido {
  tipo: 'salida' | 'itinerario' | 'punto_interes' | 'feriado' | 'foto' | 'knowledge_base'
  referencia: string
  detalle?: string | null
}

export interface DiaItinerario {
  numero: number
  titulo: string
  descripcion: string
  horario?: string | null
  hito?: string | null
}

export interface PuntoInteres {
  nombre: string
  descripcion: string
  ubicacion?: string | null
  distancia?: string | null
  duracion?: string | null
  dificultad?: string | null
  fuente?: string | null
}

export interface SlideCarrusel {
  n_slide:           number
  rol:               RolSlide
  tipo?:              TipoSlideCarrusel
  pill_text?:        string | null  // 1-3 palabras EN MAYÚSCULAS, etiqueta visual sobre el título
  subtitle_highlight?: string | null // solo en cierre: segunda etiqueta apilada bajo pill_text (ej: "ÚLTIMOS LUGARES")
  texto_principal:   string | null   // null en slides que son solo foto
  texto_apoyo:       string | null  // máx. 140 chars
  indicacion_imagen: string
  hablante?:          string | null
}
export type TipoViaje = 'expedicion_premium' | 'escapada_fin_semana' | 'salida_un_dia' | 'salida_recurrente'
export type DiaSemana = 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' | 'domingo'
export type Frecuencia = 'semanal' | 'quincenal' | 'mensual'
export type Moneda = 'USD' | 'ARS'
export type NivelDificultad = 'baja' | 'media' | 'alta'
export type Vertical = 'promocional' | 'conversion' | 'aspiracional' | 'pov' | 'autoridad' | 'salud_mental' | 'transformacion' | 'prueba_social' | 'comunidad' | 'objeciones'
export type ObjetivoGeneracion = 'vender_salida' | 'mantener_cuenta'
export type FormatoContenido = 'video' | 'carrusel' | 'flyer' | 'historia' | 'carrusel_promo'
export type PromoVariante = 'promo_simple' | 'promo_cta' | 'promo_info'

// Subverticales de salud_mental y comunidad
export type SubVertical =
  | 'desconexion'
  | 'naturaleza_terapia'
  | 'bienestar_fisico'
  | 'reflexion'
  | 'ansiedad_depresion'
  | 'conexion_humana'
  | 'critica_vida_moderna'
  | 'la_tribu'
  | 'convivencia'
  | 'logros_grupo'

export interface Profile {
  id: string
  full_name: string | null
  company_name: string | null
  niche: Niche
  role: 'admin' | 'client'
  calendario_asignado: CalendarCode
  created_at: string
  updated_at: string
}

export interface Salida {
  id: string
  user_id: string
  nombre: string
  destino: string
  pais_codigo: string
  fecha_inicio: string
  fecha_fin: string
  precio_usd: number
  sena_usd: number | null
  nivel: NivelDificultad
  cupos: number
  link_inscripcion: string | null
  tipo_viaje: TipoViaje
  itinerario: string | null
  itinerario_dias: DiaItinerario[]
  puntos_interes: PuntoInteres[]
  que_incluye: string | null
  que_no_incluye: string | null
  estado: 'borrador' | 'activa' | 'completada'
  moneda: Moneda
  dias_semana: DiaSemana[] | null
  hora_encuentro: string | null
  punto_encuentro: string | null
  frecuencia: Frecuencia | null
  sheets_exported_at: string | null
  created_at: string
  updated_at: string
}

export interface MaterialSlot {
  id: string
  salida_id: string
  slot_key: string
  slot_label: string
  slot_description: string | null
  sort_order: number
  created_at: string
  files?: SlotFile[]
}

export interface SlotFile {
  id: string
  slot_id: string
  salida_id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number | null
  storage_url: string | null
  created_at: string
}

export interface ContenidoGenerado {
  id: string
  salida_id: string
  user_id: string
  vertical: Vertical
  slot_key: string | null
  // formato explícito — 'video' | 'flyer' | 'historia' | 'carrusel'
  formato: string | null
  formato_carrusel: FormatoCarrusel | null
  objetivo_interaccion: ObjetivoInteraccion | null
  descripcion_post: string | null
  generation_metadata: Record<string, unknown>
  source_salida_ids: string[]
  titulo: string | null
  subtitulo: string | null
  bullets: string[] | null
  cta: string | null
  // legacy carrusel (string[]) — pre-rediseño
  slides: string[] | null
  // carrusel estructurado nuevo
  tema: string | null
  estructura_narrativa: string | null
  angulo: string | null
  cta_comentario: string | null
  slides_data: SlideCarrusel[] | null
  video_crudo: string | null
  mes: string | null
  is_edited: boolean
  render_folder_id: string | null
  render_status: RenderApprovalStatus | null
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

// ─── Generated pieces (Gemini output) ────────────────────────────────────────

// Compartido entre video-familias y carrusel — gate de aprobación
// explícita antes de disparar a Mati. 'approved_pending_contract' es
// legacy, solo aplica al flujo de video (reconstrucción de contrato).
export type RenderApprovalStatus =
  | 'pending_review'
  | 'approved_pending_contract'
  | 'dispatching'
  | 'rendering'
  | 'rendered'
  | 'failed'

export interface GeneratedCarrusel {
  formato:              'carrusel'
  formato_carrusel?:    FormatoCarrusel
  vertical?:            Vertical   // opcional — informativo, no organiza el carrusel
  tema:                 TemaCarrusel
  estructura_narrativa: EstructuraNarrativa
  cantidad_slides:      number
  angulo:               string
  slides:               SlideCarrusel[]
  cta_comentario:       string | null
  objetivo_interaccion?: ObjetivoInteraccion
  descripcion_post?:    string
  fuentes?:             FuenteContenido[]
  metadata?:            Record<string, unknown>
  carpeta_material:     string
  mes:                  string
}

export interface GeneratedAdaptiveCarrusel {
  formato:               'carrusel'
  formato_carrusel:      Exclude<FormatoCarrusel, 'editorial'>
  tema:                  TemaCarrusel | null
  estructura_narrativa:  EstructuraNarrativa | null
  cantidad_slides:       number
  angulo:                string
  slides:                SlideCarrusel[]
  cta_comentario:        string | null
  objetivo_interaccion:  ObjetivoInteraccion
  descripcion_post:      string
  fuentes:               FuenteContenido[]
  metadata:              Record<string, unknown>
  carpeta_material:      string
  mes:                   string
}

export interface GeneratedCarruselPromo {
  formato:          'carrusel_promo'
  variante:         PromoVariante
  slides:           SlideCarrusel[]
  carpeta_material: string
  mes:              string
}

export interface GeneratedPieceLegacy {
  formato:          'video' | 'flyer' | 'historia'
  vertical:         Vertical
  subvertical?:     SubVertical
  carpeta_material: string
  titulo:           string
  subtitulo:        string
  bullets:          string[]
  cta:              string
  video_crudo:      string
  mes:              string
}

export interface GeneratedVideo {
  formato:          'video'
  tema:             TemaVideo
  vertical?:        Vertical
  carpeta_material: string
  titulo:           string
  subtitulo:        string
  bullets:          string[]
  cta:              string
  video_crudo:      string
  mes:              string
  metadata?:        Record<string, unknown>
}

export interface GeneratedVideoFamilia3 {
  formato:                       'video'
  subfamilia:                    VideoFamilia3Subfamilia
  copy:                          string
  tipografia_id:                 VideoTypographyId
  duracion_estimada_segundos:    number
  metadata: {
    inputTokens:                 number
    outputTokens:                number
    clipDurationSeconds:         number
    maxCharacters:               number
    knowledgeFile:               string
  }
}

export interface VideoGenerationMetadata {
  inputTokens:         number
  outputTokens:        number
  clipDurationSeconds: number
  knowledgeFile:       string
}

export interface GeneratedVideoListicle {
  formato:                       'video'
  subfamilia:                    '2a'
  titulo:                        string
  items:                         string[]
  cta:                           string
  tipografia_id:                 VideoTypographyId
  duracion_estimada_segundos:    number
  metadata:                      VideoGenerationMetadata
}

export interface GeneratedVideoStorytelling {
  formato:                       'video'
  subfamilia:                    '2b'
  apertura:                      string
  desarrollo:                    string[]
  cierre?:                       string
  tipografia_id:                 VideoTypographyId
  duracion_estimada_segundos:    number
  metadata:                      VideoGenerationMetadata
}

export type GeneratedVideoFamilia2 = GeneratedVideoListicle | GeneratedVideoStorytelling

export interface GeneratedVideoFamilia4 {
  formato:                       'video'
  familia:                       '4'
  copy:                          string
  dato_duro:                     string
  tipografia_id:                 VideoTypographyId
  duracion_estimada_segundos:    number
  metadata:                      VideoGenerationMetadata & {
    maxCharacters:               number
  }
}

export type AnyGeneratedPiece =
  | GeneratedCarrusel
  | GeneratedAdaptiveCarrusel
  | GeneratedCarruselPromo
  | GeneratedVideo
  | GeneratedPieceLegacy
  | GeneratedVideoFamilia2
  | GeneratedVideoFamilia3
  | GeneratedVideoFamilia4

export interface KnowledgeBase {
  id: string
  niche: Niche
  vertical: Vertical
  titulo: string
  contenido: string
  tags: string[] | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface TikTokIntelligence {
  id: string
  nicho: Niche
  plataforma: string
  caption: string | null
  views: number
  likes: number
  comments: number
  shares: number
  hashtags: string[] | null
  duracion: number | null
  video_url: string | null
  thumbnail_url: string | null
  texto_miniatura: string | null
  source_query: string | null
  es_referencia: boolean
  scrapeado_en: string
}

export interface BrandIdentity {
  id:               string
  user_id:          string
  color_primario:   string | null
  color_secundario: string | null
  color_acento:     string | null
  color_texto:      string | null
  color_fondo:      string | null
  font_title:       string | null
  font_body:        string | null
  logo_url:         string | null
  drive_folder_id:     string | null
  templates_elegidos:  string[] | null
  mati_cliente_id:     string | null
  fotos_folder_id:     string | null
  videos_folder_id:    string | null
  updated_at:          string
  created_at:          string
}

export interface ClientOnboarding {
  user_id:               string
  // Bloque 1
  avatar_edad_genero:    string | null
  avatar_experiencia:    string | null
  avatar_objeciones:     string | null
  avatar_motor:          string[] | null
  // Bloque 2
  marca_personalidad:    string | null
  marca_lineas_rojas:    string | null
  marca_autoridad:       string | null
  marca_testimonios:     string | null
  // Bloque 3
  objetivos_corto_plazo: string | null
  servicios_estrella:    string | null
  servicios_moneda:      string | null
  calendario:            string | null
  // Bloque 4
  embudo_paso:           string | null
  material_visual:       string[] | null
  completed_at:          string | null
}

export interface CSVRow {
  Cliente: string
  Mes: string
  Formato: string
  'Formato Carrusel': string
  Objetivo: string
  Ángulo: string
  'Descripción Post': string
  'Video Crudo': string
  Título: string
  Subtítulo: string
  Bullets: string
  CTA: string
  Slides: string
  Fuentes: string
}
