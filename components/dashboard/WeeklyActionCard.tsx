'use client'

import Link from 'next/link'

export function WeeklyActionCard() {
  return (
    <>
      <div style={{
        borderRadius: 16,
        background: 'var(--nieve)',
        border: '1px solid var(--linea)',
        padding: '22px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        boxShadow: 'var(--sombra-reposo)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tinta)' }}>Generá tu semana de contenido</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--piedra)', marginTop: 5 }}>
            Usamos tus salidas, tu calendario asignado y tus imágenes para crear todas las piezas de una vez.
          </div>
        </div>
        <Link
          href="/calendario"
          style={{
            padding: '11px 18px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--cardon)',
            color: 'var(--nieve)',
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
    </>
  )
}
