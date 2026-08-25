import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { User, Building2, Tag, Shield } from 'lucide-react'
import ProfileEditForm from '@/components/cuenta/ProfileEditForm'

export default async function CuentaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const p = profile ?? { full_name: null, company_name: null, niche: null, role: null }

  const rows = [
    { label: 'Nombre', value: p.full_name || '—', icon: User },
    { label: 'Empresa', value: p.company_name || '—', icon: Building2 },
    { label: 'Nicho', value: (p.niche || '—').replace(/_/g, ' '), icon: Tag },
    { label: 'Rol', value: p.role || 'user', icon: Shield },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="page-title">Cuenta</h1>
        <p className="page-subtitle mt-2">Perfil y configuración del negocio</p>
      </div>

      {/* Profile card */}
      <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--nieve)', border: '1px solid var(--linea)' }}>
        {/* Header with gradient */}
        <div
          className="relative px-6 py-8 flex items-center gap-4"
          style={{ background: 'var(--nieve)', borderBottom: '1px solid var(--linea)' }}
        >
          <img src="/contours.svg" alt="" aria-hidden className="absolute right-0 top-0 h-full opacity-40 mix-blend-screen pointer-events-none" style={{ width: 'auto' }} />
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-[20px] font-bold shrink-0 relative z-10"
            style={{ background: 'linear-gradient(135deg,var(--cardon),var(--cardon-tenue))', color: 'var(--nieve)' }}
          >
            {p.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="relative z-10">
            <p className="text-[18px] font-bold" style={{ color: 'var(--tinta)', letterSpacing: '-0.02em' }}>{p.full_name || 'Usuario'}</p>
            <p className="text-[13px] capitalize" style={{ color: 'var(--piedra)' }}>{p.company_name || p.niche?.replace(/_/g, ' ') || ''}</p>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: 'var(--linea)' }}>
          {rows.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 px-6 py-4">
              <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--piedra)' }} />
              <span className="text-[13px] w-24 shrink-0" style={{ color: 'var(--piedra)' }}>{label}</span>
              <span className="text-[13px] font-medium capitalize" style={{ color: 'var(--tinta)' }}>{value}</span>
            </div>
          ))}
          <div className="px-6 py-4">
            <ProfileEditForm fullName={p.full_name} companyName={p.company_name} />
          </div>
        </div>
      </div>

      {/* Plan card */}
      <div
        className="rounded-[18px] px-6 py-5 flex items-center justify-between"
        style={{ background: 'var(--nieve)', border: '1px solid var(--linea)' }}
      >
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--tinta)' }}>Plan Cumbre</p>
          <p className="text-[12px]" style={{ color: 'var(--piedra)' }}>USD 49 / mes · Acceso completo</p>
        </div>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: 'var(--cardon-tenue)', color: 'var(--cardon)', border: '1px solid var(--cardon)' }}
        >
          Activo
        </span>
      </div>
    </div>
  )
}
