export type Niche = 'trekking' | 'running' | 'ciclismo' | 'turismo_aventura'

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

export type EstructuraNarrativa =
  | 'problema_solucion'
  | 'lista_tips'
  | 'storytelling'
  | 'mito_vs_realidad'
  | 'antes_despues'
  | 'paso_a_paso'
  | 'pregunta_respuesta'

export type RolSlide = 'portada' | 'desarrollo' | 'cierre'

export interface SlideCarrusel {
  n_slide:           number
  rol:               RolSlide
  texto_principal:   string   // máx. 72 chars
  texto_apoyo:       string | null  // máx. 140 chars
  indicacion_imagen: string
}
export type TipoViaje = 'expedicion_premium' | 'escapada_fin_semana' | 'salida_un_dia'
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
  created_at: string
  updated_at: string
}

export interface Salida {
  id: string
  user_id: string
  nombre: string
  destino: string
  fecha_inicio: string
  fecha_fin: string
  precio_usd: number
  sena_usd: number | null
  nivel: NivelDificultad
  cupos: number
  link_inscripcion: string | null
  tipo_viaje: TipoViaje
  itinerario: string | null
  que_incluye: string | null
  que_no_incluye: string | null
  estado: 'borrador' | 'activa' | 'completada'
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
  created_at: string
  updated_at: string
}

// ─── Generated pieces (Gemini output) ────────────────────────────────────────

export interface GeneratedCarrusel {
  formato:              'carrusel'
  vertical?:            Vertical   // opcional — informativo, no organiza el carrusel
  tema:                 TemaCarrusel
  estructura_narrativa: EstructuraNarrativa
  cantidad_slides:      number
  angulo:               string
  slides:               SlideCarrusel[]
  cta_comentario:       string | null
  carpeta_material:     string
  mes:                  string
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

export type AnyGeneratedPiece = GeneratedCarrusel | GeneratedPieceLegacy

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
  'Video Crudo': string
  Título: string
  Subtítulo: string
  Bullets: string
  CTA: string
}
