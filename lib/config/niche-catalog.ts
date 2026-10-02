import type { Niche } from '@/types'

export interface NicheMeta {
  id: Niche
  label: string
  folder: string
  ui: { bg: string; text: string; border: string }
}

export const NICHE_CATALOG: NicheMeta[] = [
  { 
    id: 'turismo_aventura', 
    label: 'Turismo Aventura', 
    folder: 'turismo-aventura',
    ui: { bg: 'rgba(167,139,250,.1)', text: '#a78bfa', border: 'rgba(167,139,250,.2)' }
  },
  { 
    id: 'montañismo', 
    label: 'Montañismo', 
    folder: 'montanismo',
    ui: { bg: 'rgba(239,68,68,.1)', text: '#ef4444', border: 'rgba(239,68,68,.2)' }
  },
  { 
    id: 'trekking', 
    label: 'Trekking', 
    folder: 'trekking',
    ui: { bg: 'rgba(34,197,94,.1)', text: '#22c55e', border: 'rgba(34,197,94,.2)' }
  },
  { 
    id: 'running', 
    label: 'Running', 
    folder: 'running',
    ui: { bg: 'rgba(59,130,246,.1)', text: '#3b82f6', border: 'rgba(59,130,246,.2)' }
  },
  { 
    id: 'ciclismo', 
    label: 'Ciclismo', 
    folder: 'ciclismo',
    ui: { bg: 'rgba(249,115,22,.1)', text: '#f97316', border: 'rgba(249,115,22,.2)' }
  },
  { 
    id: 'cabalgata', 
    label: 'Cabalgata', 
    folder: 'cabalgata',
    ui: { bg: 'rgba(161,98,7,.1)', text: '#a16207', border: 'rgba(161,98,7,.2)' }
  },
  { 
    id: 'kayak', 
    label: 'Kayak', 
    folder: 'kayak',
    ui: { bg: 'rgba(6,182,212,.1)', text: '#06b6d4', border: 'rgba(6,182,212,.2)' }
  },
  { 
    id: 'parapente', 
    label: 'Parapente', 
    folder: 'parapente',
    ui: { bg: 'rgba(168,85,247,.1)', text: '#a855f7', border: 'rgba(168,85,247,.2)' }
  },
  { 
    id: 'escalada', 
    label: 'Escalada', 
    folder: 'escalada',
    ui: { bg: 'rgba(100,116,139,.1)', text: '#64748b', border: 'rgba(100,116,139,.2)' }
  },
  { 
    id: 'rappel', 
    label: 'Rappel', 
    folder: 'rappel',
    ui: { bg: 'rgba(71,85,105,.1)', text: '#475569', border: 'rgba(71,85,105,.2)' }
  },
  { 
    id: 'tirolesa', 
    label: 'Tirolesa', 
    folder: 'tirolesa',
    ui: { bg: 'rgba(234,179,8,.1)', text: '#eab308', border: 'rgba(234,179,8,.2)' }
  }
]

export const NICHE_OPTIONS = NICHE_CATALOG.map(n => ({ value: n.id, label: n.label }))
export const VALID_NICHES = NICHE_CATALOG.map(n => n.id)

export function getNicheMeta(id: string): NicheMeta {
  return NICHE_CATALOG.find(n => n.id === id) || NICHE_CATALOG[0]
}
