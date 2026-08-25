'use client'

import Link from 'next/link'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import type { Profile } from '@/types'
import BetweenLogo from '@/components/branding/BetweenLogo'

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
    href: '/calendario',
    label: 'Mi semana',
    iconPath: 'M4 5.5h12v11H4zM4 8.5h12M8 3.5v3M12 3.5v3',
    badge: false,
  },
  {
    href: '/salidas',
    label: 'Salidas',
    iconPath: 'M3 16l4-7 3 4 2.5-4.5L18 16z',
    badge: true,
  },
  {
    href: '/fotos',
    label: 'Fotos',
    iconPath: 'M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v9A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-9zM3 13l4-4 3 3 2.5-3 4 5',
    badge: false,
  },
  {
    href: '/videos',
    label: 'Videos',
    iconPath: 'M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z',
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
  {
    href: '/admin/creative-lab',
    label: 'Lab creativo',
    iconPath: 'M7 3h6M8 3v5l-4 7a1.5 1.5 0 0 0 1.3 2.2h9.4A1.5 1.5 0 0 0 16 15l-4-7V3M6.5 13h7',
  },
  {
    href: '/mesa',
    label: 'Fábrica',
    iconPath: 'M4 16V9M4 9l3-5h6l3 5M4 9h12M16 16V9M7 9v7M13 9v7M2 16h16',
  },
  {
    href: '/mesa/ornamentales',
    label: 'Herbario',
    iconPath: 'M10 3c0 6-4 9-4 9h8s-4-3-4-9zM7 16c0 1.7 1.3 3 3 3s3-1.3 3-3M10 12v7',
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
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setIsCollapsed(true)
  }, [])

  function toggleSidebar() {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
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
        width: isCollapsed ? 76 : 244,
        transition: 'width 0.2s ease',
        flexShrink: 0,
        background: 'var(--nieve)',
        borderRight: '1px solid var(--linea)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div style={{ padding: isCollapsed ? '20px 0 14px' : '20px 18px 14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, lineHeight: 1, cursor: isCollapsed ? 'pointer' : 'default' }} onClick={() => isCollapsed && toggleSidebar()} title={isCollapsed ? "Expandir menú" : ""}>
          {isCollapsed
            ? <BetweenLogo variant="mark" width={31} priority />
            : <BetweenLogo width={116} priority />}
        </div>
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            style={{
              background: 'transparent', border: '1px solid transparent', color: 'var(--piedra)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: 6, transition: 'all 0.15s ease',
            }}
            title="Colapsar menú"
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cardon-tenue)'; e.currentTarget.style.color = 'var(--cardon)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--piedra)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
              <path d="M9 3v18"></path>
            </svg>
          </button>
        )}
      </div>

      {/* OPERACIÓN section label */}
      {!isCollapsed ? (
        <div style={{ padding: '4px 14px 4px', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--piedra)' }}>
          Operación
        </div>
      ) : (
        <div style={{ margin: '8px auto', width: 20, height: 1, background: 'var(--linea)' }} />
      )}

      {/* OPERACIÓN nav */}
      <nav style={{ padding: '3px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {OPERACION.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? 0 : 11,
                padding: isCollapsed ? '12px 0' : '7px 11px',
                borderRadius: 9,
                cursor: 'pointer',
                transition: 'all .12s',
                color: active ? 'var(--cardon)' : 'var(--piedra)',
                background: active ? 'var(--cardon-tenue)' : 'transparent',
                boxShadow: active ? 'inset 0 0 0 1px var(--linea)' : 'none',
                textDecoration: 'none',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--blanco-piedra)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ display: 'flex', width: 17, flexShrink: 0, justifyContent: 'center' }}>
                <NavIcon d={item.iconPath} />
              </span>
              {!isCollapsed && <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>}
              {!isCollapsed && item.badge && salidaCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--cardon)',
                  background: 'var(--cardon-tenue)',
                  padding: '1px 7px',
                  borderRadius: 8,
                }}>
                  {salidaCount}
                </span>
              )}
              {isCollapsed && item.badge && salidaCount > 0 && (
                <div style={{ position: 'absolute', top: 8, right: 22, width: 6, height: 6, borderRadius: '50%', background: 'var(--cardon)' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ADMIN section — only visible to admins */}
      {profile?.role === 'admin' && (
        <>
          {!isCollapsed ? (
            <div style={{ padding: '12px 14px 4px', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--piedra)' }}>
              Admin
            </div>
          ) : (
            <div style={{ margin: '16px auto 8px', width: 20, height: 1, background: 'var(--linea)' }} />
          )}
          <nav style={{ padding: '3px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {ADMIN_LINKS.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: isCollapsed ? 0 : 11,
                    padding: isCollapsed ? '12px 0' : '7px 11px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    transition: 'all .12s',
                    color: active ? 'var(--cardon)' : 'var(--piedra)',
                    background: active ? 'var(--cardon-tenue)' : 'transparent',
                    boxShadow: active ? 'inset 0 0 0 1px var(--linea)' : 'none',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = 'var(--blanco-piedra)'
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{ display: 'flex', width: 17, flexShrink: 0, justifyContent: 'center' }}>
                    <NavIcon d={item.iconPath} />
                  </span>
                  {!isCollapsed && <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{item.label}</span>}
                </Link>
              )
            })}
          </nav>
        </>
      )}

      {/* Profile card + logout */}
      <div style={{ marginTop: 'auto', padding: isCollapsed ? '12px 8px' : 12 }}>
        <Link
          href="/cuenta"
          title={isCollapsed ? "Mi cuenta" : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: isCollapsed ? 0 : 10,
            padding: isCollapsed ? '8px 0' : 9,
            borderRadius: 12,
            background: 'var(--blanco-piedra)',
            border: '1px solid var(--linea)',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--cardon)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--linea)'
          }}
        >
          <div style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--cardon)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: 'var(--nieve)',
            fontSize: 13,
            flexShrink: 0,
          }}>
            {initials}
          </div>
          {!isCollapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--tinta)' }}>
                {displayName || 'Usuario'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                {nicheLabel && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--cardon)',
                    background: 'var(--cardon-tenue)',
                    border: '1px solid var(--linea)',
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
          )}
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
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: isCollapsed ? 0 : 7,
            padding: isCollapsed ? '10px 0' : '7px 11px',
            borderRadius: 9,
            border: 'none',
            background: 'transparent',
            color: 'var(--piedra)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all .12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--blanco-piedra)'
            e.currentTarget.style.color = 'var(--tinta)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--piedra)'
          }}
        >
          <span style={{ display: 'flex', width: 17, flexShrink: 0, justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d={LOGOUT_ICON} />
            </svg>
          </span>
          {!isCollapsed && 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )
}
