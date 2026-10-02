export const MOUNTAIN_PHOTOS = [
  'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=500&q=70',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=500&q=70',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=500&q=70',
]

import { NICHE_CATALOG } from './config/niche-catalog'

export const NICHE_LABELS: Record<string, string> = Object.fromEntries(
  NICHE_CATALOG.map(n => [n.id, n.label])
)
