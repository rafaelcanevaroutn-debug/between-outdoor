'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SCREEN_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Inicio', subtitle: 'Tu asistente de contenido outdoor' },
  '/crear': { title: 'Crear contenido', subtitle: 'Elegí qué pieza querés crear hoy' },
  '/salidas': { title: 'Entrenos y salidas', subtitle: 'Tus entrenos, salidas y su contenido' },
  '/salidas/nueva': { title: 'Crear salida', subtitle: 'Cargá los datos de tu próximo entreno o salida' },
  '/calendario': { title: 'Calendario', subtitle: 'Tu plan de publicación hasta el día de la salida' },
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

      {/* Search box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 13px',
          borderRadius: 10,
          background: '#0E140F',
          border: '1px solid rgba(255,255,255,.06)',
          width: 200,
          color: '#5a6b61',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="9" cy="9" r="6" />
          <path d="m17 17-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          placeholder="Buscar…"
          style={{
            background: 'none',
            border: 'none',
            color: '#EAF2EC',
            fontSize: 13,
            width: '100%',
            outline: 'none',
          }}
        />
      </div>

      {/* Bell button */}
      <button
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: '#0E140F',
          border: '1px solid rgba(255,255,255,.06)',
          color: '#9DB0A4',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'border-color .12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(92,230,160,.22)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)' }}
      >
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M10 3a4 4 0 0 0-4 4c0 4-2 5-2 5h12s-2-1-2-5a4 4 0 0 0-4-4Z" strokeLinejoin="round" />
          <path d="M8.5 16a1.7 1.7 0 0 0 3 0" strokeLinecap="round" />
        </svg>
        <span style={{
          position: 'absolute',
          top: 8,
          right: 9,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#5CE6A0',
          boxShadow: '0 0 0 2px #0E140F',
        }} />
      </button>

      {/* CTA button */}
      <Link
        href="/crear"
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
        Crear contenido
      </Link>
    </header>
  )
}
