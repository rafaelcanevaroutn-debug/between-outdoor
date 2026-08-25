interface DashboardHeaderProps {
  firstName: string
  nicheLabel: string
}

export function DashboardHeader({ firstName, nicheLabel }: DashboardHeaderProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Between · {nicheLabel}
      </div>
      <h1 style={{ maxWidth: 720, fontSize: 'clamp(34px, 4vw, 52px)', fontWeight: 600, letterSpacing: '-.055em', lineHeight: .98, color: 'var(--tinta)', fontFamily: 'var(--font-bricolage), sans-serif' }}>
        Tu semana empieza acá, {firstName}.
      </h1>
      <div style={{ maxWidth: 590, fontSize: 16, lineHeight: 1.6, color: 'var(--piedra)', marginTop: 14 }}>
        Salidas, fotos y datos reales convertidos en contenido listo para mover tu próxima experiencia.
      </div>
    </div>
  )
}
