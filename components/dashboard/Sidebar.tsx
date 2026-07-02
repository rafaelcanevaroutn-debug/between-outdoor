'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface SidebarProps {
  profile: Profile | null
  salidaCount?: number
}

const OPERACION = [
  {
    href: '/dashboard',
    label: 'Inicio',
    iconPath: 'M3 9.5 10 4l7 5.5V17a1 1 0 0 1-1 1h-3v-5H8v5H5a1 1 0 0 1-1-1z',
    badge: false,
  },
  {
    href: '/crear',
    label: 'Crear contenido',
    iconPath: 'M10 3l1.5 4.4L16 9l-4.5 1.6L10 15l-1.5-4.4L4 9l4.5-1.6z',
    badge: false,
  },
  {
    href: '/salidas',
    label: 'Entrenos',
    iconPath: 'M3 16l4-7 3 4 2.5-4.5L18 16z',
    badge: true,
  },
  {
    href: '/calendario',
    label: 'Calendario',
    iconPath: 'M4 5.5h12v11H4zM4 8.5h12M8 3.5v3M12 3.5v3',
    badge: false,
  },
  {
    href: '/biblioteca',
    label: 'Biblioteca',
    iconPath: 'M4 5h12v10H4zM4 12l3-3 3 3 2-2 4 4',
    badge: false,
  },
  {
    href: '/fotos',
    label: 'Fotos',
    iconPath: 'M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v9A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-9zM3 13l4-4 3 3 2.5-3 4 5',
    badge: false,
  },
  {
    href: '/mi-marca',
    label: 'Mi marca',
    iconPath: 'M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM14 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM14 13.5V17M12 15.5h4',
    badge: false,
  },
]

const ADMIN_LINKS = [
  {
    href: '/admin/clientes',
    label: 'Clientes',
    iconPath: 'M7 9.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1.5 16.5c0-2.8 2.7-4.5 5.5-4.5M13.5 8a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zM18.5 16.5c0-2.3-2.2-3.7-4.5-4',
  },
  {
    href: '/admin/knowledge-base',
    label: 'Conocimiento',
    iconPath: 'M5 4h10v12l-5-2-5 2z',
  },
]

const CUENTA = [
  {
    href: '/cuenta',
    label: 'Cuenta',
    iconPath: 'M10 9.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4.5 16.5c0-2.8 2.7-4.5 5.5-4.5s5.5 1.7 5.5 4.5',
  },
]

const LOGOUT_ICON = 'M13 6V4.5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V14M9 10h8m0 0-2.5-2.5M17 10l-2.5 2.5'

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

export default function Sidebar({ profile, salidaCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/crear') return pathname === '/crear'
    if (href === '/salidas') return pathname.startsWith('/salidas') && pathname !== '/salidas/nueva' && !pathname.startsWith('/salidas/nueva')
    return pathname.startsWith(href)
  }

  const displayName = profile?.full_name || profile?.company_name || null

  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const firstName = displayName?.split(' ')[0] || 'Usuario'

  const NICHE_LABELS: Record<string, string> = {
    trekking: 'Trekking',
    running: 'Running',
    ciclismo: 'Ciclismo',
    turismo_aventura: 'Turismo Aventura',
  }
  const nicheLabel = profile?.niche ? (NICHE_LABELS[profile.niche] ?? profile.niche) : null

  return (
    <aside
      style={{
        width: 244,
        flexShrink: 0,
        background: '#0B100C',
        borderRight: '1px solid rgba(255,255,255,.05)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 18px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, lineHeight: 1 }}>
          <Image src="/bo-symbol.png" alt="Between Outdoor" width={30} height={30} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#EAF2EC', lineHeight: 1 }}>between</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#5CE6A0', lineHeight: 1, marginTop: 2 }}>outdoors</div>
          </div>
        </div>
      </div>

      {/* OPERACIÓN section label */}
      <div style={{ padding: '4px 14px 4px', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#445049' }}>
        Operación
      </div>

      {/* OPERACIÓN nav */}
      <nav style={{ padding: '3px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {OPERACION.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '7px 11px',
                borderRadius: 9,
                cursor: 'pointer',
                transition: 'all .12s',
                color: active ? '#EAF2EC' : '#86998E',
                background: active ? 'rgba(52,209,126,.11)' : 'transparent',
                boxShadow: active ? 'inset 0 0 0 1px rgba(92,230,160,.18)' : 'none',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.035)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ display: 'flex', width: 17, flexShrink: 0 }}>
                <NavIcon d={item.iconPath} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>
              {item.badge && salidaCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#5CE6A0',
                  background: 'rgba(52,209,126,.14)',
                  padding: '1px 7px',
                  borderRadius: 8,
                }}>
                  {salidaCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ADMIN section — only visible to admins */}
      {profile?.role === 'admin' && (
        <>
          <div style={{ padding: '12px 14px 4px', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#445049' }}>
            Admin
          </div>
          <nav style={{ padding: '3px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {ADMIN_LINKS.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: '7px 11px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    transition: 'all .12s',
                    color: active ? '#EAF2EC' : '#86998E',
                    background: active ? 'rgba(52,209,126,.11)' : 'transparent',
                    boxShadow: active ? 'inset 0 0 0 1px rgba(92,230,160,.18)' : 'none',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.035)'
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{ display: 'flex', width: 17, flexShrink: 0 }}>
                    <NavIcon d={item.iconPath} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </>
      )}

      {/* CUENTA section label */}
      <div style={{ padding: '12px 14px 4px', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#445049' }}>
        Cuenta
      </div>

      {/* CUENTA nav */}
      <nav style={{ padding: '3px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {CUENTA.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '7px 11px',
                borderRadius: 9,
                cursor: 'pointer',
                transition: 'all .12s',
                color: active ? '#EAF2EC' : '#86998E',
                background: active ? 'rgba(52,209,126,.11)' : 'transparent',
                boxShadow: active ? 'inset 0 0 0 1px rgba(92,230,160,.18)' : 'none',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.035)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ display: 'flex', width: 17, flexShrink: 0 }}>
                <NavIcon d={item.iconPath} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Profile card + logout */}
      <div style={{ marginTop: 'auto', padding: 12 }}>
        <Link
          href="/cuenta"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 9,
            borderRadius: 12,
            background: '#0E140F',
            border: '1px solid rgba(255,255,255,.05)',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(92,230,160,.22)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)'
          }}
        >
          <div style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#34D17E,#2FB3A0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: '#04130A',
            fontSize: 13,
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#EAF2EC' }}>
              {displayName || 'Usuario'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              {nicheLabel && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#34D17E',
                  background: 'rgba(52,209,126,.1)',
                  border: '1px solid rgba(52,209,126,.2)',
                  borderRadius: 5,
                  padding: '1px 5px',
                  lineHeight: 1.4,
                  letterSpacing: '.02em',
                }}>
                  {nicheLabel}
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          style={{
            width: '100%',
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '7px 11px',
            borderRadius: 9,
            border: 'none',
            background: 'transparent',
            color: '#445049',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all .12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,.035)'
            e.currentTarget.style.color = '#9DB0A4'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#445049'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d={LOGOUT_ICON} />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
