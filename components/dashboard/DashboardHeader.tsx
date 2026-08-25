import { SparkleIcon } from '@/components/ui/icons/SparkleIcon'

interface DashboardHeaderProps {
  firstName: string
  nicheLabel: string
}

export function DashboardHeader({ firstName, nicheLabel }: DashboardHeaderProps) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 22 }}>
      <div style={{
        width: 46,
        height: 46,
        borderRadius: 14,
        margin: '0 auto 16px',
        background: 'var(--cardon)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 22px -10px rgba(62,92,72,.35)',
      }}>
        <SparkleIcon size={24} stroke="var(--nieve)" />
      </div>
      <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.025em', color: 'var(--tinta)', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
        Hola, {firstName}
      </div>
      <div style={{ fontSize: 15, color: 'var(--piedra)', marginTop: 6 }}>
        Tu contenido de {nicheLabel}, organizado semana a semana
      </div>
    </div>
  )
}
