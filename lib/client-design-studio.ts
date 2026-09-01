import type { FormatoCarrusel, VideoKnowledgeFormat, VideoTypographyId } from '@/types'

export const CAROUSEL_FAMILY_OPTIONS: ReadonlyArray<{ key: FormatoCarrusel; label: string; hint: string }> = [
  { key: 'organico', label: 'Historia orgánica', hint: 'Fotos, experiencia y comunidad' },
  { key: 'lugar', label: 'Destino', hint: 'Presentar un lugar con claridad' },
  { key: 'itinerario', label: 'Itinerario', hint: 'Recorrido, etapas y logística' },
  { key: 'calendario', label: 'Agenda', hint: 'Fechas y próximas salidas' },
  { key: 'editorial', label: 'Autoridad', hint: 'Educación y criterio del guía' },
  { key: 'ascenso', label: 'Historia de ascenso', hint: 'Progreso, desafío y logro' },
  { key: 'conversacion', label: 'Conversación', hint: 'Diálogo breve y cercano' },
]

export const VIDEO_FAMILY_OPTIONS: ReadonlyArray<{ key: VideoKnowledgeFormat; label: string; hint: string; sample: string }> = [
  { key: '3a', label: 'Reflexivo', hint: 'Emoción, bienestar y naturaleza', sample: 'A veces no necesitás ir más rápido.' },
  { key: '3b', label: 'POV', hint: 'La experiencia en primera persona', sample: 'POV: encontraste tu plan del sábado.' },
  { key: '3e', label: 'Lugar', hint: 'El destino habla primero', sample: 'Cancún, México 📍' },
  { key: '4', label: 'Información directa', hint: 'Días, hora y punto de encuentro', sample: 'TREKKING EN GRUPO · JUEVES 18:30' },
  { key: '1c', label: 'Relato', hint: 'Una historia breve que conecta', sample: 'Llegaste por el sendero. Volviste por la gente.' },
  { key: '2b', label: 'Storytelling', hint: 'Viaje contado como una secuencia', sample: 'Todo empezó con una escapada.' },
  { key: '1b', label: 'Señal', hint: 'Una frase fuerte y reconocible', sample: 'ESTA ES TU SEÑAL PARA SALIR.' },
]

export const VIDEO_TYPOGRAPHY_OPTIONS: ReadonlyArray<{ key: VideoTypographyId; mood: string; stack: string }> = [
  { key: 'amiri', mood: 'Clásico', stack: 'Amiri, serif' },
  { key: 'classic', mood: 'Tradicional', stack: 'Georgia, serif' },
  { key: 'modern', mood: 'Minimalista', stack: 'Inter, sans-serif' },
  { key: 'editor', mood: 'Noticias', stack: 'Times New Roman, serif' },
  { key: 'typewrite', mood: 'Retro', stack: 'Courier New, monospace' },
  { key: 'aboreto', mood: 'Elegante', stack: 'Aboreto, display' },
  { key: 'elegant', mood: 'Refinado', stack: 'Playfair Display, serif' },
  { key: 'adorn slab', mood: 'Fuerte', stack: '"Adorn Slab", serif' },
  { key: 'asar', mood: 'Distintivo', stack: 'Asar, serif' },
  { key: 'balthazar', mood: 'Serio', stack: 'Balthazar, serif' },
  { key: 'cinzel', mood: 'Cinemático', stack: 'Cinzel, serif' },
  { key: 'crimson text', mood: 'Editorial', stack: '"Crimson Text", serif' },
  { key: 'cormorant', mood: 'Formal', stack: 'Cormorant, serif' },
  { key: 'oswald', mood: 'Impacto', stack: 'Oswald, sans-serif' },
  { key: 'plex', mood: 'Técnico', stack: '"IBM Plex Sans", sans-serif' },
  { key: 'poppins', mood: 'Geométrico', stack: 'Poppins, sans-serif' },
]

export const STATIC_FAMILY_LABELS: Record<number, { label: string; hint: string }> = {
  1: { label: 'Salida destacada', hint: 'Un destino o experiencia principal' },
  2: { label: 'Ficha de experiencia', hint: 'Información clara con tono editorial' },
  3: { label: 'Cupos y cierre', hint: 'Conversión y disponibilidad verificada' },
  4: { label: 'Próximas fechas', hint: 'Varias salidas en una sola pieza' },
  5: { label: 'Propuesta de viaje', hint: 'Presentación comercial de agencia' },
  6: { label: 'Comunidad', hint: 'Grupo, pertenencia y experiencia compartida' },
}

export const CLIENT_DESIGN_STUDIO_FLAG = 'client_design_studio'

