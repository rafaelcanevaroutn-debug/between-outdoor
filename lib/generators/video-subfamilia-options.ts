import type { VideoKnowledgeFormat } from '@/types'

// Compartido entre GenerateButton (individual) y WeeklyBatchPanel (batch)
// — sin dependencias de servidor, seguro para bundlear en cliente.
export const VIDEO_SUBFAMILIA_OPTIONS: { value: VideoKnowledgeFormat; label: string }[] = [
  { value: '1a', label: 'Hablando a cámara (Discurso)' },
  { value: '1b', label: 'Video texto con fondo (Barras)' },
  { value: '1c', label: 'Voz en off relatando' },
  { value: '2a', label: 'Tips enumerados' },
  { value: '2b', label: 'Contando una historia' },
  { value: '2c', label: 'Consejos rápidos' },
  { value: '3a', label: 'Frase reflexiva' },
  { value: '3b', label: 'Punto de vista (POV)' },
  { value: '3c', label: 'Humor (Meme)' },
  { value: '3d', label: 'Pregunta a la audiencia' },
  { value: '3e', label: 'Mostrando un lugar' },
  { value: '4',  label: 'Venta directa' },
  { value: '5',  label: 'Ficha técnica' },
]

export const CANAL_OPTIONS = ['WhatsApp', 'Instagram DM'] as const
