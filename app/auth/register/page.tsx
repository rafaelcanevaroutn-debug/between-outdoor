'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Building2, Eye, EyeOff, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import type { Niche } from '@/types'
import BetweenLogo from '@/components/branding/BetweenLogo'
import AuthBrandPanel from '@/components/auth/AuthBrandPanel'

const NICHE_OPTIONS: { value: Niche; label: string }[] = [
  { value: 'trekking', label: 'Trekking de montaña' },
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
          <BetweenLogo width={154} priority className="mx-auto mb-10" />
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'var(--cardon-tenue)', border: '1px solid var(--linea)' }}>
            <Check className="w-8 h-8" style={{ color: 'var(--cardon)' }} />
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--tinta)' }}>Cuenta creada</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--piedra)' }}>
            Revisá tu email para confirmar tu cuenta. Una vez confirmada podés ingresar.
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
    <div className="relative grid min-h-screen p-4 lg:grid-cols-[1.08fr_.92fr] lg:gap-4" style={{ backgroundColor: 'var(--nieve)' }}>
      <AuthBrandPanel />
      <div className="mx-auto flex w-full max-w-[500px] items-center justify-center px-3 py-10 sm:px-8">
      <div className="w-full max-w-[430px]">
        {/* Logo */}
        <div className="flex items-center justify-center mb-10">
          <BetweenLogo width={154} priority />
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'rgba(255,255,255,.72)', border: '1px solid var(--linea)', boxShadow: '0 22px 70px rgba(22,25,21,.08)' }}>
          <h1 className="text-[28px] font-semibold mb-2" style={{ color: 'var(--tinta)' }}>Crear cuenta</h1>
          <p className="text-[14px] leading-relaxed mb-8" style={{ color: 'var(--piedra)' }}>Empezá a convertir tus salidas en contenido listo para publicar.</p>

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
              <label className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--piedra)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
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
          ¿Ya tenés cuenta?{' '}
          <Link href="/auth/login" className="font-medium hover:underline" style={{ color: 'var(--cardon)' }}>
            Ingresá
          </Link>
        </p>
      </div>
      </div>
    </div>
  )
}
