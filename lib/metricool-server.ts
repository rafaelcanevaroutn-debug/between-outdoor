import type {SupabaseClient} from '@supabase/supabase-js'
import type {ContenidoGenerado} from '@/types'
import type {MetricoolConfig, MetricoolNetwork} from '@/lib/metricool'

export interface MetricoolConnection {
  user_id: string
  metricool_user_id: number
  blog_id: number
  timezone: string
  enabled_networks: MetricoolNetwork[]
  status: 'pending' | 'connected' | 'error' | 'disabled'
  last_verified_at: string | null
  last_error: string | null
}
export async function getMetricoolConnection(admin: SupabaseClient, userId: string): Promise<MetricoolConnection | null> {
  const {data, error} = await admin
    .from('metricool_connections')
    .select('user_id,metricool_user_id,blog_id,timezone,enabled_networks,status,last_verified_at,last_error')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as MetricoolConnection | null
}

export function metricoolConfigForConnection(
  connection: Pick<MetricoolConnection, 'metricool_user_id' | 'blog_id'>,
  env: Record<string, string | undefined> = process.env,
): MetricoolConfig {
  const token = env.METRICOOL_API_TOKEN?.trim() ?? ''
  if (!token) throw new Error('Falta METRICOOL_API_TOKEN')
  return {token, userId: connection.metricool_user_id, blogId: connection.blog_id}
}

export function metricoolCaption(piece: Pick<ContenidoGenerado, 'titulo' | 'subtitulo' | 'bullets' | 'cta' | 'descripcion_post'>): string {
  return [piece.titulo, piece.subtitulo, ...(piece.bullets ?? []), piece.cta, piece.descripcion_post]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join('\n\n')
    .trim()
}

export function dateTimeInZone(date: Date, timezone: string): string {
  if (Number.isNaN(date.getTime())) throw new Error('Fecha de publicación inválida')
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`
  } catch {
    throw new Error('Zona horaria inválida')
  }
}
