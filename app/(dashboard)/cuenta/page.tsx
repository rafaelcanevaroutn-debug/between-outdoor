import { createAdminClient, DEMO_PROFILE, DEMO_USER_ID } from '@/lib/supabase/admin'
import { User, Building2, Tag, Shield } from 'lucide-react'

export default async function CuentaPage() {
  const supabase = createAdminClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', DEMO_USER_ID).single()
  const p = profile ?? DEMO_PROFILE

  const rows = [
    { label: 'Nombre', value: p.full_name || '—', icon: User },
    { label: 'Empresa', value: p.company_name || '—', icon: Building2 },
    { label: 'Nicho', value: (p.niche || '—').replace(/_/g, ' '), icon: Tag },
    { label: 'Rol', value: p.role || 'user', icon: Shield },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="text-[20px] font-bold" style={{ color: '#EAF2EC', letterSpacing: '-0.02em' }}>Cuenta</h2>
        <p className="text-[13px] mt-0.5" style={{ color: '#7E9286' }}>Perfil y configuración del negocio</p>
      </div>

      {/* Profile card */}
      <div className="rounded-[18px] overflow-hidden" style={{ backgroundColor: '#0D130E', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Header with gradient */}
        <div
          className="relative px-6 py-8 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg,#10180f,#0c120d)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <img src="/contours.svg" alt="" aria-hidden className="absolute right-0 top-0 h-full opacity-40 mix-blend-screen pointer-events-none" style={{ width: 'auto' }} />
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-[20px] font-bold shrink-0 relative z-10"
            style={{ background: 'linear-gradient(135deg,#34D17E,#5CE6A0)', color: '#04130A' }}
          >
            {p.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="relative z-10">
            <p className="text-[18px] font-bold" style={{ color: '#EAF2EC', letterSpacing: '-0.02em' }}>{p.full_name || 'Usuario'}</p>
            <p className="text-[13px] capitalize" style={{ color: '#7E9286' }}>{p.company_name || p.niche?.replace(/_/g, ' ') || ''}</p>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {rows.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 px-6 py-4">
              <Icon className="w-4 h-4 shrink-0" style={{ color: '#445049' }} />
              <span className="text-[13px] w-24 shrink-0" style={{ color: '#7E9286' }}>{label}</span>
              <span className="text-[13px] font-medium capitalize" style={{ color: '#EAF2EC' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plan card */}
      <div
        className="rounded-[18px] px-6 py-5 flex items-center justify-between"
        style={{ backgroundColor: '#0D130E', border: '1px solid rgba(52,209,126,0.2)' }}
      >
        <div>
          <p className="text-[13px] font-semibold" style={{ color: '#EAF2EC' }}>Plan Cumbre</p>
          <p className="text-[12px]" style={{ color: '#7E9286' }}>USD 49 / mes · Acceso completo</p>
        </div>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'rgba(52,209,126,0.12)', color: '#34D17E', border: '1px solid rgba(52,209,126,0.25)' }}
        >
          Activo
        </span>
      </div>
    </div>
  )
}
