import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, company_name')
    .eq('id', user.id)
    .single()

  // Admins never go through onboarding
  if (profile?.role === 'admin') redirect('/salidas')

  // If already completed, skip to app
  const { data: existing } = await supabase
    .from('client_onboarding')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (existing?.completed_at) redirect('/salidas')

  const firstName = profile?.full_name?.split(' ')[0] || profile?.company_name?.split(' ')[0] || 'acá'

  return (
    <OnboardingWizard
      firstName={firstName}
      initialProfile={{ full_name: profile?.full_name ?? null, company_name: profile?.company_name ?? null }}
      initialAnswers={existing ?? null}
    />
  )
}
