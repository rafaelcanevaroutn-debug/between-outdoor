import { createAdminClient, DEMO_USER_ID, DEMO_PROFILE } from '@/lib/supabase/admin'

const isBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'

export async function createClient() {
  if (isBypass) {
    const admin = createAdminClient()

    // Wrap the admin client with a fake auth.getUser() that returns the demo user
    return {
      auth: {
        getUser: async () => ({
          data: { user: { id: DEMO_USER_ID, email: 'demo@betweenoutdoor.com' } },
          error: null,
        }),
        signOut: async () => ({ error: null }),
      },
      from: (table: string) => admin.from(table),
      storage: admin.storage,
    } as ReturnType<typeof admin.from> extends never ? never : any  // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  // Real auth client (used when auth is properly configured)
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
