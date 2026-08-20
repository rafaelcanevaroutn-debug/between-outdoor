import Link from 'next/link'

export function WeeklyActionCard() {
  return (
    <>
      <div style={{
        borderRadius: 16,
        background: '#0E140F',
        border: '1px solid rgba(255,255,255,.1)',
        padding: '22px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#EAF2EC' }}>Generá tu semana de contenido</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: '#7E9286', marginTop: 5 }}>
            Usamos tus salidas, tu calendario asignado y tus imágenes para crear todas las piezas de una vez.
          </div>
        </div>
        <Link
          href="/calendario"
          style={{
            padding: '11px 18px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg,#34D17E,#5CE6A0)',
            color: '#04130A',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 5.5h12v11H4zM4 8.5h12M8 3.5v3M12 3.5v3" />
          </svg>
          Ir a Mi semana
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
        <Link
          href="/crear"
          className="manual-link"
          style={{ color: '#7E9286', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}
        >
          ¿Necesitás una pieza puntual? Abrir creación manual →
        </Link>
      </div>
    </>
  )
}
