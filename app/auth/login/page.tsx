'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mountain, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0A0F0A' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#34D17E' }}>
            <Mountain className="w-5 h-5 text-[#0A0F0A]" />
          </div>
          <div>
            <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#6B8F71' }}>Between</p>
            <p className="text-base font-bold leading-none" style={{ color: '#F0FFF4' }}>Outdoor</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <h1 className="text-xl font-semibold mb-1" style={{ color: '#F0FFF4' }}>Bienvenido de vuelta</h1>
          <p className="text-sm mb-8" style={{ color: '#6B8F71' }}>Ingresá a tu cuenta para continuar</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#F0FFF4' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4A6B4A' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="vos@aventura.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: '#0A0F0A',
                    border: '1px solid #1E2D1E',
                    color: '#F0FFF4',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#34D17E' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1E2D1E' }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#F0FFF4' }}>Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4A6B4A' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: '#0A0F0A',
                    border: '1px solid #1E2D1E',
                    color: '#F0FFF4',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#34D17E' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#1E2D1E' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#4A6B4A' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
              Ingresar
            </Button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: '#6B8F71' }}>
          ¿No tenés cuenta?{' '}
          <Link href="/auth/register" className="font-medium hover:underline" style={{ color: '#34D17E' }}>
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
