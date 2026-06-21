export type Niche = 'trekking' | 'running' | 'ciclismo' | 'turismo_aventura'
export type TipoViaje = 'expedicion_premium' | 'escapada_fin_semana' | 'salida_un_dia'
export type NivelDificultad = 'baja' | 'media' | 'alta'
export type Vertical = 'conversion' | 'aspiracional' | 'pov' | 'autoridad' | 'salud_mental' | 'transformacion' | 'prueba_social' | 'comunidad' | 'objeciones'

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
  titulo: string | null
  subtitulo: string | null
  bullets: string[] | null
  cta: string | null
  video_crudo: string | null
  mes: string | null
  is_edited: boolean
  created_at: string
  updated_at: string
}

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

export interface CSVRow {
  Cliente: string
  Mes: string
  'Video Crudo': string
  Título: string
  Subtítulo: string
  Bullets: string
  CTA: string
}
