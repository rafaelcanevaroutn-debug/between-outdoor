'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ChevronRight, ChevronDown, Plus, X } from 'lucide-react'
import FolderPicker from '@/components/fotos/FolderPicker'
import CarruselFormatPanel, { type RelatedSalidaOption } from '@/components/salidas/CarruselFormatPanel'
import { evaluateCarruselEligibility } from '@/lib/carrusel-eligibility'
import { buildCalendarOpportunities, type CalendarOpportunityHoliday } from '@/lib/calendar-opportunities'
import type { FormatoCarrusel, ObjetivoInteraccion, Salida } from '@/types'

interface GenerateButtonProps {
  salidaId: string
  salida: Salida
  fotosFolderId?: string | null
  videosFolderId?: string | null
  relatedSalidas?: RelatedSalidaOption[]
  holidays?: CalendarOpportunityHoliday[]
}

const CANTIDAD_OPTIONS = [1, 2, 3, 4]
type Objetivo      = 'vender_salida' | 'mantener_cuenta'
type Formato       = 'carrusel' | 'video' | 'flyer' | 'carrusel_promo'
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
  { value: 'todas',        label: 'Las 3 variantes' },
]

const TEMA_OPTIONS = [
  { value: 'destinos',          label: 'Destinos y lugares' },
  { value: 'seguridad',         label: 'Seguridad' },
  { value: 'preparacion_fisica', label: 'Preparación' },
  { value: 'motivacion',        label: 'Motivación' },
  { value: 'equipo',            label: 'Equipo y gear' },
  { value: 'logistica',         label: 'Logística' },
  { value: 'testimonios',       label: 'Testimonios' },
  { value: 'detras_del_guia',   label: 'Detrás del guía' },
  { value: 'dudas_objeciones',  label: 'Objeciones' },
  { value: 'educacion_montana', label: 'Educación montaña' },
  { value: 'bienestar',         label: 'Bienestar' },
]

const ESTRUCTURA_OPTIONS = [
  { value: 'storytelling',      label: 'Storytelling' },
  { value: 'problema_solucion', label: 'Problema → Solución' },
  { value: 'mito_vs_realidad',  label: 'Mito vs Realidad' },
  { value: 'lista_tips',        label: 'Lista de tips' },
  { value: 'antes_despues',     label: 'Antes / Después' },
  { value: 'paso_a_paso',       label: 'Paso a paso' },
  { value: 'pregunta_respuesta', label: 'Pregunta → Respuesta' },
]

interface PiezaManual {
  tema:       string
  estructura: string
}

const DEFAULT_PIEZA: PiezaManual = { tema: 'destinos', estructura: 'storytelling' }

const selectStyle = {
  appearance: 'none' as const,
  backgroundColor: '#111A11',
  border: '1px solid #1E2D1E',
  color: '#F0FFF4',
  cursor: 'pointer',
  borderRadius: 8,
  padding: '6px 28px 6px 10px',
  fontSize: 13,
  fontWeight: 500,
}

export default function GenerateButton({ salidaId, salida, fotosFolderId, videosFolderId, relatedSalidas = [], holidays = [] }: GenerateButtonProps) {
  const router = useRouter()
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [formato, setFormato]           = useState<Formato>('carrusel')
  const [cantidad, setCantidad]         = useState(1)
  const [objetivo, setObjetivo]         = useState<Objetivo>('vender_salida')
  const [carpetaFotos, setCarpetaFotos] = useState<string | null>(null)
  const [carpetaFotosId, setCarpetaFotosId] = useState<string | null>(null)
  const [promoVariante, setPromoVariante] = useState<PromoVariante>('promo_simple')
  const [modoManual, setModoManual]     = useState(false)
  const [piezas, setPiezas]             = useState<PiezaManual[]>([{ ...DEFAULT_PIEZA }])
  const [formatoCarrusel, setFormatoCarrusel] = useState<FormatoCarrusel>('editorial')
  const [objetivoInteraccion, setObjetivoInteraccion] = useState<ObjetivoInteraccion>('convertir')
  const [sourcePastSalidaId, setSourcePastSalidaId] = useState('')
  const [futureRelatedSalidaId, setFutureRelatedSalidaId] = useState('')
  const [calendarOpportunityId, setCalendarOpportunityId] = useState('')

  const isPromo    = formato === 'carrusel_promo'
  const isCarrusel = formato === 'carrusel'
  const today = new Date().toISOString().slice(0, 10)
  const futureSalidasCount = relatedSalidas.filter(item => item.fecha_inicio >= today && item.estado !== 'completada' && (item.pais_codigo ?? 'AR') === (salida.pais_codigo ?? 'AR')).length
    + (salida.fecha_inicio >= today && salida.estado !== 'completada' ? 1 : 0)
  const selectedPast = relatedSalidas.find(item => item.id === sourcePastSalidaId)
  const calendarOpportunities = buildCalendarOpportunities({
    salidas: [salida, ...relatedSalidas].map(item => ({ id: item.id, nombre: item.nombre, destino: item.destino, fecha_inicio: item.fecha_inicio, fecha_fin: item.fecha_fin, estado: item.estado })),
    holidays,
    today,
  })
  const selectedCalendarOpportunity = calendarOpportunities.find(item => item.id === calendarOpportunityId) ?? calendarOpportunities[0]
  const eligibility = evaluateCarruselEligibility(formatoCarrusel, salida, {
    hasPhotos: Boolean(carpetaFotos),
    sourcePastSalidaId,
    sourcePastHasNarrativeData: Boolean(selectedPast?.itinerario?.trim() || selectedPast?.itinerario_dias?.length),
    futureRelatedSalidaId,
    futureSalidasCount,
    holidayCount: holidays.length,
  })

  function addPieza() {
    if (piezas.length >= 4) return
    setPiezas(prev => [...prev, { ...DEFAULT_PIEZA }])
  }

  function removePieza(i: number) {
    setPiezas(prev => prev.filter((_, idx) => idx !== i))
  }

  function updatePieza(i: number, field: keyof PiezaManual, value: string) {
    setPiezas(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  async function handleGenerate() {
    setError('')
    setLoading(true)

    try {
      const body: Record<string, unknown> = {
        salidaId,
        objetivo,
        formato,
        carpetaFotos: carpetaFotos ?? undefined,
        carpetaFotosId: carpetaFotosId ?? undefined,
        ...(isCarrusel && {
          formatoCarrusel,
          objetivoInteraccion,
          sourcePastSalidaId: sourcePastSalidaId || undefined,
          futureRelatedSalidaId: futureRelatedSalidaId || undefined,
          ...(formatoCarrusel === 'calendario' && selectedCalendarOpportunity && {
            calendarSalidaIds: selectedCalendarOpportunity.salidaIds,
            calendarHolidayDates: selectedCalendarOpportunity.holidayDates,
            calendarOpportunityType: selectedCalendarOpportunity.type,
          }),
        }),
      }

      if (isPromo) {
        body.cantidad      = promoVariante === 'todas' ? 3 : 1
        body.promoVariante = promoVariante
      } else if (isCarrusel && formatoCarrusel !== 'editorial') {
        body.cantidad = cantidad
      } else if (isCarrusel && modoManual) {
        body.piezas = piezas
      } else {
        body.cantidad = cantidad
      }

      const res  = await fetch('/api/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al generar contenido')
        setLoading(false)
        return
      }

      const ids: string[] = data.ids ?? []
      const dest = ids.length > 0
        ? `/salidas/${salidaId}/contenido?nuevos=${ids.join(',')}`
        : `/salidas/${salidaId}/contenido`
      router.refresh()
      router.push(dest)
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  const totalPiezas = isPromo
    ? (promoVariante === 'todas' ? 3 : 1)
    : isCarrusel && formatoCarrusel !== 'editorial'
    ? cantidad
    : isCarrusel && modoManual
    ? piezas.length
    : cantidad

  return (
    <div className="flex flex-col gap-3">
      {/* Fila 1: formato + modo + cantidad/promo */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm" style={{ color: '#6B8F71' }}>Formato:</p>
          <div className="relative">
            <select
              value={formato}
              onChange={e => setFormato(e.target.value as Formato)}
              disabled={loading}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
              style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#F0FFF4', cursor: loading ? 'not-allowed' : 'pointer' }}
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

        {/* Toggle Auto/Manual — solo para carrusel */}
        {isCarrusel && formatoCarrusel === 'editorial' && (
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #1E2D1E' }}>
            {(['Auto', 'Manual'] as const).map(m => {
              const active = m === 'Manual' ? modoManual : !modoManual
              return (
                <button
                  key={m}
                  onClick={() => setModoManual(m === 'Manual')}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: active ? '#1E2D1E' : '#111A11',
                    color: active ? '#F0FFF4' : '#6B8F71',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {m}
                </button>
              )
            })}
          </div>
        )}

        {/* Cantidad — auto carrusel o no-carrusel */}
        {!isPromo && !(isCarrusel && modoManual && formatoCarrusel === 'editorial') && (
          <div className="flex items-center gap-2">
            <p className="text-sm" style={{ color: '#6B8F71' }}>Piezas:</p>
            <div className="relative">
              <select
                value={cantidad}
                onChange={e => setCantidad(Number(e.target.value))}
                disabled={loading}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
                style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#F0FFF4', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {CANTIDAD_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#6B8F71' }} />
            </div>
            <p className="text-xs" style={{ color: '#4A6B4A' }}>máx. 4 para render</p>
          </div>
        )}

        {/* Variante promo */}
        {isPromo && (
          <div className="flex items-center gap-2">
            <p className="text-sm" style={{ color: '#6B8F71' }}>Variante:</p>
            <div className="relative">
              <select
                value={promoVariante}
                onChange={e => setPromoVariante(e.target.value as PromoVariante)}
                disabled={loading}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
                style={{ backgroundColor: '#111A11', border: '1px solid rgba(52,209,126,.3)', color: '#5CE6A0', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {PROMO_VARIANTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#5CE6A0' }} />
            </div>
          </div>
        )}
      </div>

      {/* Builder manual — solo cuando carrusel + manual */}
      {isCarrusel && (
        <CarruselFormatPanel
          formato={formatoCarrusel}
          objetivo={objetivoInteraccion}
          eligibility={eligibility}
          relatedSalidas={relatedSalidas}
          sourcePastSalidaId={sourcePastSalidaId}
            futureRelatedSalidaId={futureRelatedSalidaId}
            calendarOpportunities={calendarOpportunities}
            selectedCalendarOpportunityId={calendarOpportunityId}
          disabled={loading}
          onFormatoChange={setFormatoCarrusel}
          onObjetivoChange={setObjetivoInteraccion}
          onSourcePastChange={setSourcePastSalidaId}
            onFutureRelatedChange={setFutureRelatedSalidaId}
            onCalendarOpportunityChange={setCalendarOpportunityId}
        />
      )}

      {/* Builder manual — solo cuando carrusel editorial + manual */}
      {isCarrusel && formatoCarrusel === 'editorial' && modoManual && (
        <div className="flex flex-col gap-2 rounded-xl p-4" style={{ backgroundColor: '#0D130E', border: '1px solid #1E2D1E' }}>
          {piezas.map((pieza, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs w-5 text-right shrink-0" style={{ color: '#4A6B4A' }}>{i + 1}</span>

              <div className="relative flex-1">
                <select
                  value={pieza.tema}
                  onChange={e => updatePieza(i, 'tema', e.target.value)}
                  disabled={loading}
                  style={{ ...selectStyle, width: '100%', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {TEMA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: '#6B8F71' }} />
              </div>

              <div className="relative flex-1">
                <select
                  value={pieza.estructura}
                  onChange={e => updatePieza(i, 'estructura', e.target.value)}
                  disabled={loading}
                  style={{ ...selectStyle, width: '100%', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {ESTRUCTURA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: '#6B8F71' }} />
              </div>

              <button
                onClick={() => removePieza(i)}
                disabled={loading || piezas.length === 1}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors"
                style={{ color: piezas.length === 1 ? '#2A3D2A' : '#6B8F71', cursor: piezas.length === 1 ? 'default' : 'pointer' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {piezas.length < 4 && (
            <button
              onClick={addPieza}
              disabled={loading}
              className="flex items-center gap-1.5 mt-1 text-xs px-2 py-1 rounded-lg w-fit transition-colors"
              style={{ color: '#34D17E', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar pieza
            </button>
          )}
        </div>
      )}

      {/* Carpeta de fotos / videos */}
      {((formato === 'video' && videosFolderId) || (formato !== 'video' && fotosFolderId)) && (
        <div>
          <p className="text-sm" style={{ color: '#6B8F71', marginBottom: 8 }}>
            {formato === 'video' ? 'Carpeta de videos crudos:' : 'Carpeta de fotos:'}{' '}
            {carpetaFotos
              ? <span style={{ color: '#5CE6A0', fontWeight: 600 }}>{carpetaFotos}</span>
              : <span style={{ color: '#4A6B4A' }}>sin elegir (Mati usa su default)</span>
            }
          </p>
          <FolderPicker 
            rootFolderId={formato === 'video' ? (videosFolderId as string) : (fotosFolderId as string)} 
            salidaId={salidaId} 
            value={carpetaFotos} 
            onChange={setCarpetaFotos} 
            onFolderIdChange={setCarpetaFotosId} 
          />
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || (isCarrusel && !eligibility.eligible)}
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
              : `Generar ${totalPiezas} ${totalPiezas === 1 ? 'pieza' : 'piezas'} con IA`
            }
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
      {loading && (
        <p className="text-xs text-center" style={{ color: '#6B8F71' }}>
          Generando {totalPiezas} {totalPiezas === 1 ? 'pieza' : 'piezas'} — puede tomar hasta {Math.round(totalPiezas * 4)} segundos. No cerrés la página.
        </p>
      )}
      {error && (
        <p className="text-xs text-center" style={{ color: '#f87171' }}>{error}</p>
      )}
    </div>
  )
}
