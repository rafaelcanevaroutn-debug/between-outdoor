'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ChevronDown } from 'lucide-react'
import FolderPicker from '@/components/fotos/FolderPicker'

interface Props {
  salidaId: string
  fotosFolderId?: string | null
}

const CANTIDAD_OPTIONS = [1, 2, 3, 4]
type Objetivo = 'vender_salida' | 'mantener_cuenta'
type Formato = 'carrusel' | 'video' | 'flyer' | 'carrusel_promo'
type PromoVariante = 'promo_simple' | 'promo_cta' | 'promo_info' | 'todas'

const FORMATO_OPTIONS: { value: Formato; label: string }[] = [
  { value: 'carrusel',       label: 'Carrusel' },
  { value: 'video',          label: 'Video' },
  { value: 'flyer',          label: 'Flyer' },
  { value: 'carrusel_promo', label: 'Promo' },
]

const PROMO_VARIANTE_OPTIONS: { value: PromoVariante; label: string }[] = [
  { value: 'promo_simple', label: 'Simple' },
  { value: 'promo_cta',    label: 'Con CTA' },
  { value: 'promo_info',   label: 'Con info' },
  { value: 'todas',        label: 'Las 3' },
]

export default function RegenerarButton({ salidaId, fotosFolderId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formato, setFormato] = useState<Formato>('carrusel')
  const [cantidad, setCantidad] = useState(6)
  const [objetivo, setObjetivo] = useState<Objetivo>('vender_salida')
  const [carpetaFotos, setCarpetaFotos] = useState<string | null>(null)
  const [promoVariante, setPromoVariante] = useState<PromoVariante>('promo_simple')

  const isPromo = formato === 'carrusel_promo'

  async function handleRegenerar() {
    const confirmMsg = isPromo
      ? `¿Agregar ${promoVariante === 'todas' ? '3 variantes promo' : promoVariante.replace('promo_', '')} a este contenido? (no borra el contenido existente)`
      : `¿Borrar el contenido actual y generar ${cantidad} piezas en modo "${objetivo}"?`
    if (!confirm(confirmMsg)) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salidaId,
          cantidad: isPromo && promoVariante === 'todas' ? 3 : cantidad,
          objetivo,
          formato,
          promoVariante: isPromo ? promoVariante : undefined,
          carpetaFotos: carpetaFotos ?? undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar')

      const ids: string[] = data.ids ?? []
      const dest = ids.length > 0
        ? `/salidas/${salidaId}/contenido?nuevos=${ids.join(',')}`
        : `/salidas/${salidaId}/contenido`
      router.refresh()   // invalida el router cache antes de navegar
      router.push(dest)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {fotosFolderId && (
        <div style={{ width: '100%' }}>
          <p className="text-xs" style={{ color: '#6B8F71', marginBottom: 6 }}>
            Fotos:{' '}
            {carpetaFotos
              ? <span style={{ color: '#5CE6A0', fontWeight: 600 }}>{carpetaFotos}</span>
              : <span style={{ color: '#4A6B4A' }}>default de Mati</span>
            }
          </p>
          <FolderPicker rootFolderId={fotosFolderId} value={carpetaFotos} onChange={setCarpetaFotos} />
        </div>
      )}
      <div className="flex items-center gap-2">
        {/* Selector de formato */}
        <div className="relative">
          <select
            value={formato}
            onChange={e => setFormato(e.target.value as Formato)}
            disabled={loading}
            className="appearance-none pl-3 pr-7 py-2 rounded-lg text-sm font-medium focus:outline-none"
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

        {/* Selector de modo — oculto en modo promo */}
        {!isPromo && (
          <div className="relative">
            <select
              value={objetivo}
              onChange={e => setObjetivo(e.target.value as Objetivo)}
              disabled={loading}
              className="appearance-none pl-3 pr-7 py-2 rounded-lg text-sm font-medium focus:outline-none"
              style={{
                backgroundColor: '#111A11',
                border: `1px solid ${objetivo === 'mantener_cuenta' ? '#8B5CF6' : '#1E2D1E'}`,
                color: objetivo === 'mantener_cuenta' ? '#C4B5FD' : '#6B8F71',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="vender_salida">Vender salida</option>
              <option value="mantener_cuenta">Mantener cuenta</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#6B8F71' }} />
          </div>
        )}

        {/* Selector de variante promo — solo en modo promo */}
        {isPromo && (
          <div className="relative">
            <select
              value={promoVariante}
              onChange={e => setPromoVariante(e.target.value as PromoVariante)}
              disabled={loading}
              className="appearance-none pl-3 pr-7 py-2 rounded-lg text-sm font-medium focus:outline-none"
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
        )}

        {/* Selector de cantidad — oculto en modo promo */}
        {!isPromo && (
          <>
            <div className="relative">
              <select
                value={cantidad}
                onChange={e => setCantidad(Number(e.target.value))}
                disabled={loading}
                className="appearance-none pl-3 pr-7 py-2 rounded-lg text-sm font-medium focus:outline-none"
                style={{
                  backgroundColor: '#111A11',
                  border: '1px solid #1E2D1E',
                  color: '#6B8F71',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {CANTIDAD_OPTIONS.map(n => (
                  <option key={n} value={n}>{n} piezas</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#6B8F71' }} />
            </div>
            <p className="text-xs" style={{ color: '#4A6B4A' }}>máx. 4</p>
          </>
        )}

        {/* Botón */}
        <button
          onClick={handleRegenerar}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0 transition-colors"
          style={{
            backgroundColor: loading ? '#162216' : '#111A11',
            border: `1px solid ${loading ? '#34D17E' : '#1E2D1E'}`,
            color: loading ? '#34D17E' : '#6B8F71',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generando...' : 'Regenerar'}
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
      )}
    </div>
  )
}
