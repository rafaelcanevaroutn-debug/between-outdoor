'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SCREEN_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Inicio', subtitle: 'Tu asistente de contenido outdoor' },
  '/crear': { title: 'Creación manual', subtitle: 'Creá una pieza puntual fuera del calendario semanal' },
  '/salidas': { title: 'Entrenos y salidas', subtitle: 'Tus entrenos, salidas y su contenido' },
  '/salidas/nueva': { title: 'Crear salida', subtitle: 'Cargá los datos de tu próximo entreno o salida' },
  '/calendario': { title: 'Mi semana', subtitle: 'Generá y revisá tu semana de contenido' },
  '/biblioteca': { title: 'Biblioteca', subtitle: 'Todo tu material organizado por slot' },
  '/admin/knowledge-base': { title: 'Base de conocimiento', subtitle: 'Enseñale a la IA qué contenido te funciona' },
  '/cuenta': { title: 'Perfil y cuenta', subtitle: 'Tu cuenta, plan y redes conectadas' },
}

function getScreenInfo(pathname: string) {
  if (SCREEN_TITLES[pathname]) return SCREEN_TITLES[pathname]
  if (pathname.startsWith('/salidas/') && pathname.endsWith('/contenido')) {
    return { title: 'Contenido generado', subtitle: 'Editá cada pieza antes de publicar' }
  }
  if (pathname.startsWith('/salidas/')) {
    return { title: 'Detalle de salida', subtitle: 'Centro de control de la salida' }
  }
  return { title: 'Between Outdoor', subtitle: '' }
}

export default function Topbar() {
  const pathname = usePathname()
  const { title, subtitle } = getScreenInfo(pathname)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 26px',
        background: 'rgba(10,15,10,.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,.05)',
      }}
    >
      {/* Page title */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em', color: '#EAF2EC' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: '#7E9286', marginTop: 1 }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* CTA button */}
      <Link
        href="/calendario"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '9px 16px',
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(135deg,#34D17E,#5CE6A0)',
          color: '#04130A',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'filter .12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.05)' }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none' }}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M10 4v12M4 10h12" />
        </svg>
        Generar mi semana
      </Link>
    </header>
  )
}
