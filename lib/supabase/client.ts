import { createBrowserClient } from '@supabase/ssr'
import { PREDEFINED_SLOTS } from '@/lib/verticals'

const isBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'
const DEMO_USER_ID = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'
  ? '00000000-0000-0000-0000-000000000001'
  : ''

// Browser mock — used in client components when auth is bypassed
function createMockBrowserClient() {
  function makeQuery(table: string) {
    const filters: Record<string, unknown> = {}
    let isSingle = false

    function resolve() {
      if (table === 'material_slots') {
        // Always return predefined slots for any salidaId
        const salidaId = filters['salida_id'] as string | undefined
        const slots = PREDEFINED_SLOTS.map(s => ({
          id: `slot-${s.key}-${salidaId || 'default'}`,
          salida_id: salidaId || '',
          slot_key: s.key,
          slot_label: s.label,
          slot_description: s.description,
          sort_order: s.order,
          created_at: new Date().toISOString(),
        }))
        return { data: isSingle ? slots[0] : slots, error: null }
      }
      if (table === 'slot_files') {
        return { data: [], error: null }
      }
      return { data: isSingle ? null : [], error: null }
    }

    const q: Record<string, unknown> = {}
    q.select = () => q
    q.eq = (k: string, v: unknown) => { filters[k] = v; return q }
    q.order = () => q
    q.limit = () => q
    q.single = () => { isSingle = true; return resolve() }
    q.then = (fn: (v: unknown) => unknown) => Promise.resolve(resolve()).then(fn)

    // Mutations — return a chainable builder so .select().single() works
    const mutationBuilder = {
      select: () => mutationBuilder,
      single: () => Promise.resolve({ data: { id: crypto.randomUUID(), salida_id: filters['salida_id'] }, error: null }),
      then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(fn),
    }
    q.insert = () => mutationBuilder
    q.update = () => ({ eq: () => mutationBuilder })
    q.delete = () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) })

    return q
  }

  return {
    auth: {
      getUser: async () => ({ data: { user: { id: DEMO_USER_ID } }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: (table: string) => makeQuery(table),
    storage: {
      from: () => ({
        upload: async (_path: string, _file: File) => ({ data: { path: _path }, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://placeholder.com/${path}` } }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  }
}

export function createClient() {
  if (isBypass) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createMockBrowserClient() as any
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
