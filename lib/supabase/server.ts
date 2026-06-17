import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  DEMO_USER,
  DEMO_PROFILE,
  DEMO_SALIDAS,
  DEMO_CONTENIDO,
  DEMO_SLOTS,
  DEMO_KNOWLEDGE_BASE,
} from '@/lib/demo-data'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const isConfigured = SUPABASE_URL.startsWith('http') && SUPABASE_KEY.length > 20 && process.env.BYPASS_AUTH !== 'true'

// Chainable mock query builder for demo mode
function mockQuery(table: string) {
  const filters: Record<string, unknown> = {}
  let isSingle = false

  const DATA_MAP: Record<string, unknown[]> = {
    profiles: [DEMO_PROFILE],
    salidas: DEMO_SALIDAS,
    contenido_generado: DEMO_CONTENIDO,
    material_slots: DEMO_SLOTS,
    slot_files: DEMO_SLOTS.flatMap((s) => (s as { files: unknown[] }).files || []),
    knowledge_base: DEMO_KNOWLEDGE_BASE,
  }

  function resolve() {
    let rows = [...((DATA_MAP[table] || []) as Record<string, unknown>[])]
    for (const [key, val] of Object.entries(filters)) {
      rows = rows.filter((r) => r[key] === val)
    }
    if (isSingle) return { data: rows[0] ?? null, error: null }
    return { data: rows, error: null }
  }

  const builder: Record<string, unknown> = {}
  builder.select = () => builder
  builder.eq = (key: string, val: unknown) => { filters[key] = val; return builder }
  builder.neq = () => builder
  builder.order = () => builder
  builder.limit = () => builder
  builder.single = () => { isSingle = true; return resolve() }
  builder.insert = () => Promise.resolve({ data: null, error: null })
  builder.update = () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) })
  builder.delete = () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) })
  // Make builder awaitable (returns resolved query)
  builder.then = (fn: (v: unknown) => unknown) => Promise.resolve(resolve()).then(fn)

  return builder
}

function createMockClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: DEMO_USER }, error: null }),
      signInWithPassword: async () => ({ data: { user: DEMO_USER }, error: null }),
      signUp: async () => ({ data: { user: DEMO_USER }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: (table: string) => mockQuery(table),
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: 'demo/file.jpg' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  }
}

export async function createClient() {
  if (!isConfigured) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createMockClient() as any
  }

  const cookieStore = await cookies()
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
