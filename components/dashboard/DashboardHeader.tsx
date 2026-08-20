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
        background: 'linear-gradient(135deg,#34D17E,#5CE6A0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 22px -10px rgba(52,209,126,.55)',
      }}>
        <SparkleIcon size={24} stroke="#04130A" />
      </div>
      <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.025em', color: '#EAF2EC' }}>
        Hola, {firstName}
      </div>
      <div style={{ fontSize: 15, color: '#7E9286', marginTop: 6 }}>
        Tu contenido de {nicheLabel}, organizado semana a semana
      </div>
    </div>
  )
}
