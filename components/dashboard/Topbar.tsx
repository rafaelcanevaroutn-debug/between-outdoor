'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SCREEN_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Inicio', subtitle: 'Todo lo que necesitás para publicar esta semana' },
  '/salidas': { title: 'Salidas', subtitle: 'Experiencias, fechas, cupos y material' },
  '/salidas/nueva': { title: 'Nueva salida', subtitle: 'Cargá una vez los datos que tu contenido necesita' },
  '/calendario': { title: 'Mi semana', subtitle: 'Tu contenido, listo para revisar y publicar' },
  '/contenido': { title: 'Contenido', subtitle: 'Todas tus piezas listas en un solo lugar' },
  '/biblioteca': { title: 'Biblioteca', subtitle: 'Todo tu material organizado por salida' },
  '/fotos': { title: 'Fotos', subtitle: 'Tu banco visual para crear contenido' },
  '/videos': { title: 'Videos', subtitle: 'Material crudo listo para convertirse en piezas' },
  '/mi-marca': { title: 'Mi marca', subtitle: 'La identidad que Between aplica a cada pieza' },
  '/renders': { title: 'Contenido generado', subtitle: 'Revisá y descargá las piezas terminadas' },
  '/admin/knowledge-base': { title: 'Base de conocimiento', subtitle: 'Enseñale a la IA qué contenido te funciona' },
  '/admin/creative-lab': { title: 'Laboratorio creativo', subtitle: 'Curá los moldes estáticos antes de habilitarlos' },
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

  // Ocultamos la Topbar en las páginas de detalle porque tienen su propio header con botón de volver
  if (
    pathname.startsWith('/salidas/') &&
    pathname !== '/salidas/nueva'
  ) {
    return null
  }

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
        minHeight: 74,
        padding: '13px clamp(22px, 3vw, 42px)',
        background: 'rgba(250,250,247,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--linea)',
      }}
    >
      {/* Page title */}
      <div>
        <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: '-.035em', lineHeight: 1.05, color: 'var(--tinta)', fontFamily: 'var(--font-bricolage), sans-serif' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12.5, color: 'var(--piedra)', marginTop: 2 }}>
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
          padding: '10px 18px',
          borderRadius: 999,
          border: 'none',
          background: 'var(--cardon)',
          color: 'var(--nieve)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          textDecoration: 'none',
          boxShadow: '0 8px 24px rgba(62,92,72,.18)',
          transition: 'transform .2s, filter .2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(.92)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none' }}
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M10 4v12M4 10h12" />
        </svg>
        Generar mi semana
      </Link>
    </header>
  )
}
