'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ChevronRight, ChevronDown } from 'lucide-react'
import FolderPicker from '@/components/fotos/FolderPicker'

interface GenerateButtonProps {
  salidaId: string
  fotosFolderId?: string | null
}

const CANTIDAD_OPTIONS = [1, 2, 3, 6, 10, 15, 20, 30]
type Objetivo = 'vender_salida' | 'mantener_cuenta'
type Formato = 'carrusel' | 'video' | 'flyer' | 'carrusel_promo'
type PromoVariante = 'promo_simple' | 'promo_cta' | 'promo_info' | 'todas'

const FORMATO_OPTIONS: { value: Formato; label: string }[] = [
  { value: 'carrusel',      label: 'Carrusel' },
  { value: 'video',         label: 'Video' },
  { value: 'flyer',         label: 'Flyer' },
  { value: 'carrusel_promo', label: 'Promo' },
]

const PROMO_VARIANTE_OPTIONS: { value: PromoVariante; label: string }[] = [
  { value: 'promo_simple', label: 'Simple' },
  { value: 'promo_cta',    label: 'Con CTA' },
  { value: 'promo_info',   label: 'Con info' },
  { value: 'todas',        label: 'Las 3 variantes' },
]

export default function GenerateButton({ salidaId, fotosFolderId }: GenerateButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formato, setFormato] = useState<Formato>('carrusel')
  const [cantidad, setCantidad] = useState(6)
  const [objetivo, setObjetivo] = useState<Objetivo>('vender_salida')
  const [carpetaFotos, setCarpetaFotos] = useState<string | null>(null)
  const [promoVariante, setPromoVariante] = useState<PromoVariante>('promo_simple')

  const isPromo = formato === 'carrusel_promo'
  const promoCount = isPromo && promoVariante === 'todas' ? 3 : isPromo ? cantidad : cantidad

  async function handleGenerate() {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salidaId,
          cantidad: isPromo ? (promoVariante === 'todas' ? 3 : 1) : cantidad,
          objetivo,
          formato,
          promoVariante: isPromo ? promoVariante : undefined,
          carpetaFotos: carpetaFotos ?? undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al generar contenido')
        setLoading(false)
        return
      }

      router.push(`/salidas/${salidaId}/contenido`)
    } catch (err) {
      setError('Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Selectores de formato, modo y cantidad */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm" style={{ color: '#6B8F71' }}>Formato:</p>
          <div className="relative">
            <select
              value={formato}
              onChange={e => setFormato(e.target.value as Formato)}
              disabled={loading}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
              style={{
                backgroundColor: '#111A11',
                border: '1px solid #1E2D1E',
                color: '#F0FFF4',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {FORMATO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#6B8F71' }} />
          </div>
        </div>
        {!isPromo && (
          <div className="flex items-center gap-2">
            <p className="text-sm" style={{ color: '#6B8F71' }}>Modo:</p>
            <div className="relative">
              <select
                value={objetivo}
                onChange={e => setObjetivo(e.target.value as Objetivo)}
                disabled={loading}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
                style={{
                  backgroundColor: '#111A11',
                  border: `1px solid ${objetivo === 'mantener_cuenta' ? '#8B5CF6' : '#1E2D1E'}`,
                  color: objetivo === 'mantener_cuenta' ? '#C4B5FD' : '#F0FFF4',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <option value="vender_salida">Vender salida</option>
                <option value="mantener_cuenta">Mantener cuenta</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#6B8F71' }} />
            </div>
          </div>
        )}
        {!isPromo && (
          <div className="flex items-center gap-2">
            <p className="text-sm" style={{ color: '#6B8F71' }}>Piezas:</p>
            <div className="relative">
              <select
                value={cantidad}
                onChange={e => setCantidad(Number(e.target.value))}
                disabled={loading}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
                style={{
                  backgroundColor: '#111A11',
                  border: '1px solid #1E2D1E',
                  color: '#F0FFF4',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {CANTIDAD_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#6B8F71' }} />
            </div>
          </div>
        )}
        {isPromo && (
          <div className="flex items-center gap-2">
            <p className="text-sm" style={{ color: '#6B8F71' }}>Variante:</p>
            <div className="relative">
              <select
                value={promoVariante}
                onChange={e => setPromoVariante(e.target.value as PromoVariante)}
                disabled={loading}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
                style={{
                  backgroundColor: '#111A11',
                  border: '1px solid rgba(52,209,126,.3)',
                  color: '#5CE6A0',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {PROMO_VARIANTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#5CE6A0' }} />
            </div>
          </div>
        )}
      </div>

      {/* Carpeta de fotos — solo si está configurada */}
      {fotosFolderId && (
        <div>
          <p className="text-sm" style={{ color: '#6B8F71', marginBottom: 8 }}>
            Carpeta de fotos:{' '}
            {carpetaFotos
              ? <span style={{ color: '#5CE6A0', fontWeight: 600 }}>{carpetaFotos}</span>
              : <span style={{ color: '#4A6B4A' }}>sin elegir (Mati usa su default)</span>
            }
          </p>
          <FolderPicker rootFolderId={fotosFolderId} value={carpetaFotos} onChange={setCarpetaFotos} />
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-all duration-150 disabled:opacity-70"
        style={{ backgroundColor: '#34D17E', color: '#0A0F0A' }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#5CE6A0' }}
        onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#34D17E' }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generando con IA...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            {isPromo
              ? promoVariante === 'todas'
                ? 'Generar 3 variantes promo'
                : `Generar promo ${promoVariante.replace('promo_', '')}`
              : `Generar ${cantidad} piezas con IA`
            }
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
      {loading && (
        <p className="text-xs text-center" style={{ color: '#6B8F71' }}>
          Generando {isPromo ? (promoVariante === 'todas' ? 3 : 1) : cantidad} piezas — puede tomar hasta {Math.round((isPromo ? (promoVariante === 'todas' ? 3 : 1) : cantidad) * 4)} segundos. No cerrés la página.
        </p>
      )}
      {error && (
        <p className="text-xs text-center" style={{ color: '#f87171' }}>{error}</p>
      )}
    </div>
  )
}
