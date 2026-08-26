import type {SupabaseClient} from '@supabase/supabase-js'
import type {ContenidoGenerado} from '@/types'
import {
  createZernioProfile,
  listZernioAccounts,
  type ZernioAccount,
  zernioConfigFromEnv,
} from '@/lib/zernio'

export interface StoredZernioProfile {
  id: string
  user_id: string
  external_profile_id: string
  label: string
  timezone: string
  is_primary: boolean
  status: 'active' | 'error' | 'disabled'
  last_synced_at: string | null
  last_error: string | null
}

export interface StoredZernioAccount {
  id: string
  user_id: string
  zernio_profile_id: string
  external_account_id: string
  platform: 'instagram' | 'tiktok' | 'facebook' | 'youtube'
  username: string | null
  display_name: string | null
  status: 'connected' | 'disconnected' | 'error'
  metadata: Record<string, unknown>
}

const SUPPORTED_PLATFORMS = new Set(['instagram', 'tiktok', 'facebook', 'youtube'])

export function zernioCaption(piece: Pick<ContenidoGenerado, 'titulo' | 'subtitulo' | 'bullets' | 'cta' | 'descripcion_post'>): string {
  return [piece.titulo, piece.subtitulo, ...(piece.bullets ?? []), piece.cta, piece.descripcion_post]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join('\n\n')
    .trim()
}

export async function getZernioProfiles(admin: SupabaseClient, userId: string): Promise<StoredZernioProfile[]> {
  const {data, error} = await admin.from('zernio_profiles')
    .select('id,user_id,external_profile_id,label,timezone,is_primary,status,last_synced_at,last_error')
    .eq('user_id', userId)
    .order('is_primary', {ascending: false})
    .order('created_at', {ascending: true})
  if (error) throw error
  return (data ?? []) as StoredZernioProfile[]
}

export async function ensureZernioProfile(params: {
  admin: SupabaseClient
  userId: string
  label: string
  timezone?: string
}): Promise<StoredZernioProfile> {
  const label = params.label.trim().slice(0, 80)
  if (!label) throw new Error('El nombre del grupo de cuentas es obligatorio')
  const {data: existing, error: existingError} = await params.admin.from('zernio_profiles')
    .select('id,user_id,external_profile_id,label,timezone,is_primary,status,last_synced_at,last_error')
    .eq('user_id', params.userId)
    .eq('label', label)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return existing as StoredZernioProfile

  const {count, error: countError} = await params.admin.from('zernio_profiles')
    .select('id', {count: 'exact', head: true})
    .eq('user_id', params.userId)
  if (countError) throw countError
  const remote = await createZernioProfile({
    config: zernioConfigFromEnv(),
    name: label,
    description: `Between · ${params.userId}`,
    color: '#3E5C48',
  })
  const now = new Date().toISOString()
  const {data, error} = await params.admin.from('zernio_profiles').insert({
    user_id: params.userId,
    external_profile_id: remote._id,
    label,
    timezone: params.timezone ?? 'America/Argentina/Buenos_Aires',
    is_primary: (count ?? 0) === 0,
    status: 'active',
    last_synced_at: now,
    updated_at: now,
  }).select('id,user_id,external_profile_id,label,timezone,is_primary,status,last_synced_at,last_error').single()
  if (error || !data) throw error ?? new Error('No se pudo guardar el perfil Zernio')
  return data as StoredZernioProfile
}

function externalAccountId(account: ZernioAccount): string {
  return String(account._id ?? account.accountId ?? '').trim()
}

export async function syncZernioAccountsForProfile(params: {
  admin: SupabaseClient
  profile: StoredZernioProfile
}): Promise<StoredZernioAccount[]> {
  const remote = await listZernioAccounts({
    config: zernioConfigFromEnv(),
    profileId: params.profile.external_profile_id,
  })
  const now = new Date().toISOString()
  const valid = remote.filter(account => externalAccountId(account) && SUPPORTED_PLATFORMS.has(String(account.platform)))
  for (const account of valid) {
    const accountId = externalAccountId(account)
    const connected = account.isActive !== false && account.status !== 'disconnected'
    const {error} = await params.admin.from('zernio_accounts').upsert({
      user_id: params.profile.user_id,
      zernio_profile_id: params.profile.id,
      external_account_id: accountId,
      platform: account.platform,
      username: typeof account.username === 'string' ? account.username : null,
      display_name: typeof account.displayName === 'string' ? account.displayName : null,
      status: connected ? 'connected' : 'disconnected',
      metadata: account,
      connected_at: connected ? now : null,
      last_synced_at: now,
      updated_at: now,
    }, {onConflict: 'external_account_id'})
    if (error) throw error
  }
  const {data: storedAccounts, error: storedAccountsError} = await params.admin
    .from('zernio_accounts')
    .select('external_account_id')
    .eq('zernio_profile_id', params.profile.id)
  if (storedAccountsError) throw storedAccountsError

  const remoteIds = new Set(valid.map(externalAccountId))
  const disconnectedIds = (storedAccounts ?? [])
    .map(account => String(account.external_account_id))
    .filter(accountId => !remoteIds.has(accountId))
  if (disconnectedIds.length > 0) {
    const {error: disconnectError} = await params.admin
      .from('zernio_accounts')
      .update({status: 'disconnected', updated_at: now})
      .eq('zernio_profile_id', params.profile.id)
      .in('external_account_id', disconnectedIds)
    if (disconnectError) throw disconnectError
  }
  await params.admin.from('zernio_profiles').update({last_synced_at: now, last_error: null, status: 'active', updated_at: now})
    .eq('id', params.profile.id)
  const {data, error} = await params.admin.from('zernio_accounts')
    .select('id,user_id,zernio_profile_id,external_account_id,platform,username,display_name,status,metadata')
    .eq('zernio_profile_id', params.profile.id)
    .order('platform')
  if (error) throw error
  return (data ?? []) as StoredZernioAccount[]
}

export async function getZernioAccounts(admin: SupabaseClient, userId: string): Promise<StoredZernioAccount[]> {
  const {data, error} = await admin.from('zernio_accounts')
    .select('id,user_id,zernio_profile_id,external_account_id,platform,username,display_name,status,metadata')
    .eq('user_id', userId)
    .order('platform')
  if (error) throw error
  return (data ?? []) as StoredZernioAccount[]
}
