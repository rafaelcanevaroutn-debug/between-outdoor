import type { VideoKnowledgeFormat } from '@/types'

// Compartido entre GenerateButton (individual) y WeeklyBatchPanel (batch)
// — sin dependencias de servidor, seguro para bundlear en cliente.
export const VIDEO_SUBFAMILIA_OPTIONS: { value: VideoKnowledgeFormat; label: string }[] = [
  { value: '2a', label: 'Listicle' },
  { value: '2b', label: 'Storytelling' },
  { value: '2c', label: 'Consejos' },
  { value: '3a', label: 'Reflexivo' },
  { value: '3b', label: 'POV' },
  { value: '3c', label: 'Meme' },
  { value: '3d', label: 'Conversacional' },
  { value: '3e', label: 'Lugar' },
  { value: '4',  label: 'Comercial' },
]

export const CANAL_OPTIONS = ['WhatsApp', 'Instagram DM'] as const
