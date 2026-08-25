'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

    const isBypass = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'
    if (isBypass) {
      router.push('/dashboard')
      return
    }

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
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--nieve)' }}
    >
      {/* Radial glows */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-15%', left: '-10%', width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(62, 92, 72, 0.12) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-20%', right: '-10%', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(201,163,94,0.10) 0%, transparent 70%)',
        }}
      />

      {/* Contours background */}
      <img
        src="/contours.svg"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover opacity-[0.06] mix-blend-screen pointer-events-none"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div style={{
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 800, color: 'var(--cardon)', flexShrink: 0,
            letterSpacing: '-.04em'
          }}>
            B
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest leading-none mb-1" style={{ color: 'var(--piedra)' }}>between</p>
            <p className="text-base font-bold leading-none" style={{ color: 'var(--tinta)' }}>outdoors</p>
          </div>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: 'var(--blanco-piedra)',
            border: '1px solid var(--linea)',
            boxShadow: 'var(--sombra-reposo)',
          }}
        >
          <h1 className="text-[22px] font-bold mb-1" style={{ color: 'var(--tinta)', letterSpacing: '-0.02em' }}>
            Bienvenido de nuevo
          </h1>
          <p className="text-[13px] mb-7" style={{ color: 'var(--piedra)' }}>Ingresá a tu cuenta para continuar</p>

          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-[10px] text-[13px]"
              style={{ backgroundColor: 'rgba(239, 68, 68,0.1)', border: '1px solid rgba(239, 68, 68,0.3)', color: '#f87171' }}
            >
              {error}
            </div>
          )}

          {/* Google button */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2.5 py-[10px] rounded-[10px] text-[13px] font-medium mb-4 transition-colors"
            style={{
              backgroundColor: 'var(--nieve)',
              border: '1px solid var(--linea)',
              color: 'var(--tinta)',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--blanco-piedra)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--nieve)' }}
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.1 0 5.8 1.1 8 2.9l6-6C34.5 3.1 29.6 1 24 1 14.9 1 7.1 6.6 3.6 14.5l7 5.4C12.4 13.6 17.7 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3.1-2.3 5.7-4.8 7.5l7.4 5.7c4.3-4 6.8-9.9 6.8-17.2z"/>
              <path fill="#FBBC05" d="M10.6 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.1.7-4.6l-7-5.4A23.5 23.5 0 0 0 .5 24c0 3.8.9 7.4 2.5 10.6l7.6-6z"/>
              <path fill="#34A853" d="M24 46.5c5.9 0 10.9-2 14.5-5.3l-7.4-5.7c-2 1.4-4.6 2.2-7.1 2.2-6.3 0-11.6-4.2-13.5-9.9l-7.6 6c3.5 7.9 11.3 12.7 21.1 12.7z"/>
            </svg>
            Continuar con Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--linea)' }} />
            <span className="text-[11px]" style={{ color: 'var(--piedra)' }}>o</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--linea)' }} />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: 'var(--tinta)' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--piedra)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="vos@aventura.com"
                  className="w-full pl-10 pr-3 py-[10px] rounded-[10px] text-[13px] outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--nieve)',
                    border: '1px solid var(--linea)',
                    color: 'var(--tinta)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--cardon)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--linea)' }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: 'var(--tinta)' }}>Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--piedra)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-[10px] rounded-[10px] text-[13px] outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--nieve)',
                    border: '1px solid var(--linea)',
                    color: 'var(--tinta)',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--cardon)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--linea)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--piedra)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-[11px] rounded-[10px] text-[14px] font-semibold transition-all mt-1"
              style={{
                backgroundColor: loading ? 'var(--cardon-tenue)' : 'var(--cardon)',
                color: loading ? 'var(--cardon)' : 'var(--nieve)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] mt-5" style={{ color: 'var(--piedra)' }}>
          ¿No tenés cuenta?{' '}
          <Link href="/auth/register" className="font-medium hover:underline" style={{ color: 'var(--cardon)' }}>
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  )
}

