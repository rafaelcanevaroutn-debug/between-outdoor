import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS, server-side only, never expose to browser
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export const DEMO_USER_ID = process.env.DEMO_USER_ID || '00000000-0000-0000-0000-000000000001'

export const DEMO_PROFILE = {
  id: DEMO_USER_ID,
  full_name: 'Usuario Demo',
  company_name: 'Between Outdoor',
  niche: 'trekking',
  role: 'admin',
}
