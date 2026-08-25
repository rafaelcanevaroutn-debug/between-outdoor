import { createClient } from '@/lib/supabase/server'
import BrandingForm from '@/components/branding/BrandingForm'
import type { BrandIdentity } from '@/types'

export default async function MiMarcaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: branding }, { data: profile }] = await Promise.all([
    supabase.from('brand_identity').select('*').eq('user_id', user!.id).single(),
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
  ])

  const isAdmin = profile?.role === 'admin'

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--tinta)', margin: '0 0 4px', letterSpacing: '-.02em' }}>
          Mi marca
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--piedra)', margin: 0 }}>
          Identidad visual que se usa para generar tus templates personalizados.
        </p>
      </div>
      <BrandingForm initialBranding={(branding as BrandIdentity) ?? null} isAdmin={isAdmin} />
    </div>
  )
}
