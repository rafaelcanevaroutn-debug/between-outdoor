'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mountain, Mail, Lock, User, Building2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import type { Niche } from '@/types'

const NICHE_OPTIONS: { value: Niche; label: string }[] = [
  { value: 'trekking', label: 'Trekking de montaÃ±a' },
  { value: 'running', label: 'Trail running' },
  { value: 'ciclismo', label: 'Ciclismo / MTB' },
  { value: 'turismo_aventura', label: 'Turismo aventura' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: '',
    company_name: '',
    email: '',
    password: '',
    niche: 'trekking' as Niche,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          company_name: form.company_name,
          niche: form.niche,
        },
      },
    })

    if (error) {
      console.error('Supabase signUp error:', error)
      setError(error.message || error.code || JSON.stringify(error))
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const inputStyle = {
    backgroundColor: 'var(--nieve)',
    border: '1px solid var(--linea)',
    color: 'var(--tinta)',
  }

  const inputClass = "w-full py-2.5 rounded-lg text-sm focus:outline-none transition-colors"

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--nieve)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(62, 92, 72, 0.1)', border: '1px solid rgba(62, 92, 72, 0.3)' }}>
            <Mountain className="w-8 h-8" style={{ color: 'var(--cardon)' }} />
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--tinta)' }}>Cuenta creada</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--piedra)' }}>
            RevisÃ¡ tu email para confirmar tu cuenta. Una vez confirmada podÃ©s ingresar.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--cardon)', color: 'var(--nieve)' }}
          >
            Ir al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--nieve)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--cardon)' }}>
            <Mountain className="w-5 h-5 text-[var(--nieve)]" />
          </div>
          <div>
            <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--piedra)' }}>Between</p>
            <p className="text-base font-bold leading-none" style={{ color: 'var(--tinta)' }}>Outdoor</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)' }}>
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--tinta)' }}>Crear cuenta</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--piedra)' }}>EmpezÃ¡ a generar contenido para tus salidas</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68,0.1)', border: '1px solid rgba(239, 68, 68,0.3)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--piedra)' }} />
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                  placeholder="Tu nombre"
                  className={`${inputClass} pl-10 pr-3`}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--cardon)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--linea)' }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Empresa / Agencia</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--piedra)' }} />
                <input
                  type="text"
                  name="company_name"
                  value={form.company_name}
                  onChange={handleChange}
                  placeholder="Nombre de tu empresa (opcional)"
                  className={`${inputClass} pl-10 pr-3`}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--cardon)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--linea)' }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Nicho</label>
              <select
                name="niche"
                value={form.niche}
                onChange={handleChange}
                className={`${inputClass} px-3`}
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--cardon)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--linea)' }}
              >
                {NICHE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--piedra)' }} />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="vos@aventura.com"
                  className={`${inputClass} pl-10 pr-3`}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--cardon)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--linea)' }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>ContraseÃ±a</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--piedra)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="MÃ­nimo 6 caracteres"
                  className={`${inputClass} pl-10 pr-10`}
                  style={inputStyle}
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

            <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
              Crear cuenta
            </Button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--piedra)' }}>
          Â¿Ya tenÃ©s cuenta?{' '}
          <Link href="/auth/login" className="font-medium hover:underline" style={{ color: 'var(--cardon)' }}>
            IngresÃ¡
          </Link>
        </p>
      </div>
    </div>
  )
}
