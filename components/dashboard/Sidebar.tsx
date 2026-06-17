'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Mountain,
  LayoutDashboard,
  Map,
  PlusCircle,
  BookOpen,
  LogOut,
  ChevronRight,
  Settings,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface SidebarProps {
  profile: Profile | null
  isAdmin?: boolean
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/salidas', label: 'Salidas', icon: Map },
  { href: '/salidas/nueva', label: 'Nueva salida', icon: PlusCircle },
]

const ADMIN_ITEMS = [
  { href: '/admin/knowledge-base', label: 'Base de conocimiento', icon: BookOpen },
]

export default function Sidebar({ profile, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="flex flex-col h-screen w-64 shrink-0 sticky top-0"
      style={{ backgroundColor: '#111A11', borderRight: '1px solid #1E2D1E' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid #1E2D1E' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#34D17E' }}>
          <Mountain className="w-4 h-4 text-[#0A0F0A]" />
        </div>
        <div>
          <p className="text-xs font-medium tracking-widest uppercase leading-none mb-0.5" style={{ color: '#6B8F71' }}>Between</p>
          <p className="text-sm font-bold leading-none" style={{ color: '#F0FFF4' }}>Outdoor</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: '#4A6B4A' }}>Principal</p>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group"
              style={{
                backgroundColor: active ? 'rgba(52,209,126,0.1)' : 'transparent',
                color: active ? '#34D17E' : '#6B8F71',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = '#162216'
                  e.currentTarget.style.color = '#F0FFF4'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#6B8F71'
                }
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider px-3 mt-4 mb-2" style={{ color: '#4A6B4A' }}>Admin</p>
            {ADMIN_ITEMS.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    backgroundColor: active ? 'rgba(52,209,126,0.1)' : 'transparent',
                    color: active ? '#34D17E' : '#6B8F71',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = '#162216'
                      e.currentTarget.style.color = '#F0FFF4'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#6B8F71'
                    }
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User & Logout */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid #1E2D1E' }}>
        {profile && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ backgroundColor: 'rgba(52,209,126,0.15)', color: '#34D17E' }}>
              {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#F0FFF4' }}>{profile.full_name || 'Usuario'}</p>
              <p className="text-xs truncate" style={{ color: '#6B8F71' }}>{profile.company_name || profile.niche}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
          style={{ color: '#6B8F71' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'
            e.currentTarget.style.color = '#f87171'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#6B8F71'
          }}
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
