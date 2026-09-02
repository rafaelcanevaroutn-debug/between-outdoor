import fs from 'node:fs'
import path from 'node:path'
import type { FormatoCarrusel, VideoFamilia3Subfamilia, VideoKnowledgeFormat } from '@/types'

const KNOWLEDGE_ROOT = path.join(process.cwd(), 'lib/knowledge')

export const VIDEO_FAMILY_3_FILE_MAP: Record<VideoFamilia3Subfamilia, string> = {
  '3a': 'formatos/video/video_reflexivo.md',
  '3b': 'formatos/video/video_pov.md',
  '3c': 'formatos/video/video_meme.md',
  '3d': 'formatos/video/video_conversacional.md',
  '3e': 'formatos/video/video_lugar.md',
}

export const VIDEO_KNOWLEDGE_FILE_MAP: Record<VideoKnowledgeFormat, string> = {
  '1a': 'formatos/video/video_discurso.md',
  '1b': 'formatos/video/video_barras_senal.md',
  '1c': 'formatos/video/video_barras_senal.md',
  '2a': 'formatos/video/video_listicle.md',
  '2b': 'formatos/video/video_storytelling.md',
  '2c': 'formatos/video/video_consejos.md',
  ...VIDEO_FAMILY_3_FILE_MAP,
  '4': 'formatos/video/video_comercial.md',
  '5': 'formatos/video/video_ficha.md',
}

const EDITORIAL_TEMA_FORMATO_MAP: Record<string, string> = {
  testimonios: 'formatos/carrusel_storytelling.md',
  detras_del_guia: 'formatos/carrusel_storytelling.md',
  destinos: 'formatos/carrusel_storytelling.md',
  motivacion: 'formatos/reflexion.md',
  bienestar: 'formatos/reflexion.md',
}

const CAROUSEL_FORMAT_FILE_MAP: Record<Exclude<FormatoCarrusel, 'editorial'>, string> = {
  organico: 'formatos/carrusel_organico.md',
  itinerario: 'formatos/carrusel_itinerario.md',
  ascenso: 'formatos/carrusel_ascenso.md',
  calendario: 'formatos/carrusel_calendario.md',
  lugar: 'formatos/carrusel_lugar.md',
  conversacion: 'formatos/carrusel_conversacion.md',
}

const THEME_FILE_ALIASES: Record<string, string> = {
  preparacion_fisica: 'preparacion',
  dudas_objeciones: 'objeciones',
}

export type KnowledgeLayerKey =
  | 'lineamiento'
  | 'anti_patterns'
  | 'mundo'
  | 'patrones'
  | 'voz'
  | 'formato'
  | 'tema'

export interface KnowledgeLayer {
  key: KnowledgeLayerKey
  source: string
  text: string
}

function read(relativePath: string): string {
  try {
    return fs.readFileSync(path.join(KNOWLEDGE_ROOT, relativePath), 'utf-8').trim()
  } catch {
    return ''
  }
}

function layer(key: KnowledgeLayerKey, source: string): KnowledgeLayer | null {
  const text = read(source)
  return text ? { key, source: `lib/knowledge/${source}`, text } : null
}

function sharedLayers(niche: string, vozSlug?: string): KnowledgeLayer[] {
  const voiceSource = vozSlug && read(`nichos/${niche}/voz/${vozSlug}.md`)
    ? `nichos/${niche}/voz/${vozSlug}.md`
    : `nichos/${niche}/voz/default.md`
  return [
    layer('lineamiento', 'global/lineamiento.md'),
    layer('anti_patterns', 'global/anti-patterns.md'),
    layer('mundo', `nichos/${niche}/mundo.md`),
    layer('patrones', `nichos/${niche}/patrones.md`),
    layer('voz', voiceSource),
  ].filter((item): item is KnowledgeLayer => Boolean(item))
}

export function resolveCarouselKnowledge(input: {
  niche: string
  theme: string
  format: FormatoCarrusel
  voiceSlug?: string
}): KnowledgeLayer[] {
  const formatSource = input.format === 'editorial'
    ? EDITORIAL_TEMA_FORMATO_MAP[input.theme]
    : CAROUSEL_FORMAT_FILE_MAP[input.format]
  const themeFile = THEME_FILE_ALIASES[input.theme] ?? input.theme
  return [
    ...sharedLayers(input.niche, input.voiceSlug),
    ...(formatSource ? [layer('formato', formatSource)] : []),
    layer('tema', `temas/${input.niche}/${themeFile}.md`),
  ].filter((item): item is KnowledgeLayer => Boolean(item))
}

export function resolveVideoKnowledge(input: {
  niche: string
  format: VideoKnowledgeFormat
  voiceSlug?: string
}): KnowledgeLayer[] {
  return [
    ...sharedLayers(input.niche, input.voiceSlug),
    layer('formato', VIDEO_KNOWLEDGE_FILE_MAP[input.format]),
  ].filter((item): item is KnowledgeLayer => Boolean(item))
}

export function layerText(layers: readonly KnowledgeLayer[], key: KnowledgeLayerKey): string {
  return layers.find(item => item.key === key)?.text ?? ''
}
