'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SCREEN_TITLES: Record<string, { eyebrow: string; title: string; subtitle: string }> = {
  '/dashboard': { eyebrow: 'PANEL DE CONTROL', title: 'Inicio', subtitle: 'Todo lo que necesitás para publicar esta semana' },
  '/salidas': { eyebrow: 'VIAJES Y SALIDAS', title: 'Tus experiencias activas.', subtitle: 'Fechas, cupos y material' },
  '/salidas/nueva': { eyebrow: 'NUEVA SALIDA', title: 'Crear nueva salida.', subtitle: 'Cargá una vez los datos que tu contenido necesita' },
  '/calendario': { eyebrow: 'MI SEMANA', title: 'Tu contenido está listo.', subtitle: 'Tu contenido, listo para revisar y publicar' },
  '/contenido': { eyebrow: 'PUBLICACIONES', title: 'Todo tu contenido.', subtitle: 'Todas tus piezas listas en un solo lugar' },
  '/biblioteca': { eyebrow: 'ASSETS', title: 'Biblioteca de material.', subtitle: 'Todo tu material organizado por salida' },
  '/fotos': { eyebrow: 'FOTOGRAFÍA', title: 'Tu banco visual.', subtitle: 'Organizá tus fotos por carpeta para usarlos en los carruseles.' },
  '/videos': { eyebrow: 'VIDEOS', title: 'Material crudo.', subtitle: 'Organizá tus videos por carpeta para usarlos en la generación.' },
  '/mi-marca': { eyebrow: 'BRANDING', title: 'Tu identidad de marca.', subtitle: 'La identidad que Between aplica a cada pieza' },
  '/renders': { eyebrow: 'RENDERS', title: 'Contenido generado.', subtitle: 'Revisá y descargá las piezas terminadas' },
  '/admin/knowledge-base': { eyebrow: 'ADMIN', title: 'Base de conocimiento.', subtitle: 'Enseñale a la IA qué contenido te funciona' },
  '/admin/creative-lab': { eyebrow: 'ADMIN', title: 'Laboratorio creativo.', subtitle: 'Curá los moldes estáticos antes de habilitarlos' },
  '/admin/content-templates': { eyebrow: 'ADMIN', title: 'Biblioteca de piezas.', subtitle: 'Templates activos y feedback ordenado, por tipo, vertical y familia' },
  '/cuenta': { eyebrow: 'AJUSTES', title: 'Perfil y cuenta.', subtitle: 'Tu cuenta, plan y redes conectadas' },
}

function getScreenInfo(pathname: string) {
  if (SCREEN_TITLES[pathname]) return SCREEN_TITLES[pathname]
  if (pathname.startsWith('/salidas/') && pathname.endsWith('/contenido')) {
    return { eyebrow: 'SALIDAS', title: 'Contenido generado', subtitle: 'Editá cada pieza antes de publicar' }
  }
  if (pathname.startsWith('/salidas/')) {
    return { eyebrow: 'SALIDAS', title: 'Detalle de salida', subtitle: 'Centro de control de la salida' }
  }
  if (pathname.startsWith('/admin/clientes/') && pathname.endsWith('/calendario')) {
    return { eyebrow: 'ADMIN', title: 'Semana del cliente', subtitle: 'Cómo está armado su calendario, pieza por pieza' }
  }
  return { eyebrow: 'BETWEEN', title: 'Between Outdoor', subtitle: '' }
}

export default function Topbar() {
  const pathname = usePathname()

  if (pathname === '/dashboard' || pathname === '/calendario') return null

  // Ocultamos la Topbar en las páginas de detalle porque tienen su propio header con botón de volver
  if (
    pathname.startsWith('/salidas/') &&
    pathname !== '/salidas/nueva'
  ) {
    return null
  }

  const { eyebrow, title, subtitle } = getScreenInfo(pathname)

  return (
    <header className="mb-10">
      <div className="min-w-0">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.18em] text-[var(--piedra)]">
          {eyebrow}
        </p>
        <h1 className="text-[26px] font-bold leading-tight tracking-[-.03em] text-[var(--tinta)] sm:text-[28px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[13.5px] text-[var(--piedra)]">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  )
}
