'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Sparkles, ChevronRight, ChevronDown, Plus, X } from 'lucide-react'
import FolderPicker from '@/components/fotos/FolderPicker'
import CarruselFormatPanel, { type RelatedSalidaOption } from '@/components/salidas/CarruselFormatPanel'
import { evaluateCarruselEligibility } from '@/lib/carrusel-eligibility'
import { buildCalendarOpportunities, type CalendarOpportunityHoliday } from '@/lib/calendar-opportunities'
import { assignDistinctTypographies } from '@/lib/generators/video-typography-assignment'
import { evaluateListicleEligibility } from '@/lib/generators/video-family-2-contract'
import { CANAL_OPTIONS, VIDEO_SUBFAMILIA_OPTIONS } from '@/lib/generators/video-subfamilia-options'
import type { FormatoCarrusel, ObjetivoInteraccion, Salida, VideoKnowledgeFormat } from '@/types'

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
type Formato       = 'carrusel' | 'video' | 'banner' | 'carrusel_promo'
type PromoVariante = 'promo_simple' | 'promo_cta' | 'promo_info' | 'todas'

const FORMATO_OPTIONS: { value: Formato; label: string }[] = [
  { value: 'carrusel',       label: 'Carrusel' },
  { value: 'video',          label: 'Video' },
  { value: 'banner',         label: 'Banner / Flyer' },
  { value: 'carrusel_promo', label: 'Promo' },
]

const BANNER_MOLD_OPTIONS = [
  {value: 1, label: 'Molde 1 · Salida mínima'},
  {value: 2, label: 'Molde 2 · Ficha técnica'},
  {value: 3, label: 'Molde 3 · Comercial'},
  {value: 4, label: 'Molde 4 · Próximas salidas'},
  {value: 5, label: 'Molde 5 · Agencia'},
  {value: 6, label: 'Molde 6 · Comunidad'},
] as const

interface DriveImageOption { id: string; name: string; mimeType: string }

function BannerImagePicker({folderId, value, onChange}: {
  folderId: string | null
  value: string | null
  onChange: (fileId: string | null) => void
}) {
  const [images, setImages] = useState<DriveImageOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    onChange(null)
    setImages([])
    setError('')
    if (!folderId) return () => { cancelled = true }
    setLoading(true)
    fetch(`/api/fotos/archivos?folderId=${encodeURIComponent(folderId)}`)
      .then(async response => {
        const data = await response.json()
        if (!response.ok || data.error) throw new Error(data.error || 'No se pudieron cargar las fotos')
        if (!cancelled) setImages(Array.isArray(data.images)
          ? data.images.filter((item: DriveImageOption) => item.mimeType.startsWith('image/'))
          : [])
      })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las fotos') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [folderId, onChange])

  if (!folderId) return <p className="text-xs text-[#4A6B4A]">Elegí primero una carpeta de fotos.</p>
  if (loading) return <p className="text-xs text-[#6B8F71]">Cargando fotos…</p>
  if (error) return <p className="text-xs text-[#F87171]">{error}</p>
  if (images.length === 0) return <p className="text-xs text-[#E8B45C]">La carpeta elegida no tiene imágenes.</p>
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {images.map(image => {
        const active = value === image.id
        return (
          <button key={image.id} type="button" onClick={() => onChange(active ? null : image.id)}
            className="relative aspect-[4/3] overflow-hidden rounded-lg"
            style={{border: `2px solid ${active ? '#34D17E' : '#1E2D1E'}`, backgroundColor: '#0A0F0A'}} title={image.name}>
            <Image src={`/api/fotos/thumbnail/${image.id}`} alt={image.name} fill unoptimized className="object-cover" />
            {active && <span className="absolute right-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#34D17E] text-[#0A0F0A]">ELEGIDA</span>}
          </button>
        )
      })}
    </div>
  )
}

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
  const [temasAuto, setTemasAuto]       = useState<string[]>(['destinos'])
  const [formatoCarrusel, setFormatoCarrusel] = useState<FormatoCarrusel>('editorial')
  const [objetivoInteraccion, setObjetivoInteraccion] = useState<ObjetivoInteraccion>('convertir')
  const [sourcePastSalidaId, setSourcePastSalidaId] = useState('')
  const [futureRelatedSalidaId, setFutureRelatedSalidaId] = useState('')
  const [calendarOpportunityId, setCalendarOpportunityId] = useState('')
  const [videoSubfamilias, setVideoSubfamilias] = useState<VideoKnowledgeFormat[]>([])
  const [canalesHabilitados, setCanalesHabilitados] = useState<string[]>([])
  const [publicationDate, setPublicationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [bannerMoldType, setBannerMoldType] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)
  const [bannerBackgroundFileId, setBannerBackgroundFileId] = useState<string | null>(null)
  const [bannerRelatedSalidaIds, setBannerRelatedSalidaIds] = useState<string[]>([])

  const isPromo    = formato === 'carrusel_promo'
  const isCarrusel = formato === 'carrusel'
  const isBanner = formato === 'banner'
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
  const listicleEligibility = evaluateListicleEligibility(salida)
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

  async function handleGenerateFamiliasVideo() {
    if (videoSubfamilias.length === 0) {
      setError('Elegí al menos una subfamilia')
      return
    }
    setError('')
    setLoading(true)

    const typographyAssignments = assignDistinctTypographies(videoSubfamilias.length)
    const ids: string[] = []

    try {
      for (let i = 0; i < videoSubfamilias.length; i++) {
        const subfamilia = videoSubfamilias[i]
        const body: Record<string, unknown> = {
          salidaId,
          formato: 'video',
          videoMotor: 'familias', // Keep passing this for backend compatibility if needed
          videoSubfamilia: subfamilia,
          tipografiasPermitidas: typographyAssignments[i],
          carpetaFotos: carpetaFotos ?? undefined,
          carpetaFotosId: carpetaFotosId ?? undefined,
          ...((subfamilia === '4' || subfamilia === '5') && { canalesHabilitados, publicationDate }),
        }

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()

        if (!res.ok) {
          const previo = ids.length > 0 ? ` (${ids.length} pieza${ids.length === 1 ? '' : 's'} generada${ids.length === 1 ? '' : 's'} exitosamente)` : ''
          setError(`Error al generar subfamilia ${subfamilia}: ${data.error || 'Intento fallido'}${previo}`)
          setLoading(false)
          if (ids.length > 0) {
            setTimeout(() => {
              router.refresh()
              router.push('/calendario')
            }, 3000)
          }
          return
        }
        ids.push(...(data.ids ?? []))
      }

      router.refresh()
      router.push('/calendario')
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  async function handleGenerateBanner() {
    if (!bannerBackgroundFileId) {
      setError('Elegí una foto concreta para el banner')
      return
    }
    if (bannerMoldType === 4 && bannerRelatedSalidaIds.length < 1) {
      setError('Molde 4 necesita al menos otra salida además de la actual')
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/generate/banner', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          salidaId,
          backgroundDriveFileId: bannerBackgroundFileId,
          moldType: bannerMoldType,
          canalesHabilitados,
          ...(bannerMoldType === 4 ? {salidaIds: [salidaId, ...bannerRelatedSalidaIds]} : {}),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'No se pudo generar el banner')
        return
      }
      const id = typeof data.banner?.id === 'string' ? data.banner.id : ''
      router.refresh()
      router.push(id ? `/calendario?pieza=${encodeURIComponent(id)}` : '/calendario')
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    if (isBanner) {
      await handleGenerateBanner()
      return
    }
    if (formato === 'video') {
      await handleGenerateFamiliasVideo()
      return
    }

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
      } else if (isCarrusel) {
        if (modoManual) {
          body.piezas = piezas
        } else {
          body.cantidad = cantidad
          // Si hay múltiples temas elegidos en Auto, los enviamos como piezas simplificadas
          if (cantidad > 1) {
            body.piezas = temasAuto.slice(0, cantidad).map(t => ({ tema: t, estructura: 'storytelling' }))
          }
        }
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

      router.refresh()
      router.push('/calendario')
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  const totalPiezas = isPromo
    ? (promoVariante === 'todas' ? 3 : 1)
    : isBanner ? 1
    : formato === 'video'
    ? videoSubfamilias.length
    : (isCarrusel && modoManual)
    ? piezas.length
    : cantidad

  return (
    <div className="flex flex-col gap-5">

      {/* 1. AJUSTES GENERALES (Formato y Enfoque) */}
      <div className="flex flex-col gap-4 bg-[#0D130E] p-4 rounded-xl border border-[#1E2D1E]">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium" style={{ color: '#6B8F71' }}>Formato</p>
          <div className="flex items-center gap-2 flex-wrap">
            {FORMATO_OPTIONS.map(o => {
              const active = formato === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setFormato(o.value);
                    setCarpetaFotos(null);
                    setCarpetaFotosId(null);
                    setBannerBackgroundFileId(null);
                    setBannerRelatedSalidaIds([]);
                    if (o.value !== 'video') {
                      setVideoSubfamilias([]);
                      setCanalesHabilitados([]);
                    }
                  }}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    backgroundColor: active ? '#1E2D1E' : '#111A11',
                    color: active ? '#F0FFF4' : '#6B8F71',
                    borderColor: active ? '#34D17E' : '#1E2D1E',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {!isPromo && !isBanner && (
          <div className="flex flex-col gap-2 pt-3 border-t border-[#1E2D1E]">
            <p className="text-sm font-medium" style={{ color: '#6B8F71' }}>Enfoque</p>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { value: 'vender_salida', label: 'Vender salida' },
                { value: 'mantener_cuenta', label: 'Mantener cuenta' }
              ].map(o => {
                const active = objetivo === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setObjetivo(o.value as Objetivo)}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border"
                    style={{
                      backgroundColor: active ? (o.value === 'mantener_cuenta' ? 'rgba(139,92,246,0.1)' : '#1E2D1E') : '#111A11',
                      color: active ? (o.value === 'mantener_cuenta' ? '#C4B5FD' : '#F0FFF4') : '#6B8F71',
                      borderColor: active ? (o.value === 'mantener_cuenta' ? '#8B5CF6' : '#34D17E') : '#1E2D1E',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {isBanner && (
        <div className="flex flex-col gap-3 rounded-xl p-4 bg-[#0D130E] border border-[#1E2D1E]">
          <label className="flex flex-col gap-1.5 text-xs text-[#6B8F71]">
            Molde
            <select value={bannerMoldType} onChange={event => setBannerMoldType(Number(event.target.value) as 1 | 2 | 3 | 4 | 5 | 6)}
              disabled={loading} style={selectStyle}>
              {BANNER_MOLD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {bannerMoldType === 4 && (
            <div>
              <p className="text-xs mb-2 text-[#6B8F71]">Sumá entre 1 y 3 salidas para la agenda:</p>
              <div className="flex flex-wrap gap-2">
                {relatedSalidas.map(related => {
                  const active = bannerRelatedSalidaIds.includes(related.id)
                  const disabled = !active && bannerRelatedSalidaIds.length >= 3
                  return <button key={related.id} type="button" disabled={loading || disabled}
                    onClick={() => setBannerRelatedSalidaIds(current => active ? current.filter(id => id !== related.id) : [...current, related.id])}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{backgroundColor: active ? 'rgba(52,209,126,.12)' : '#111A11', color: disabled ? '#3D4D3D' : active ? '#34D17E' : '#6B8F71', border: `1px solid ${active ? 'rgba(52,209,126,.3)' : '#1E2D1E'}`}}>
                    {related.nombre}
                  </button>
                })}
              </div>
              {relatedSalidas.length === 0 && <p className="text-xs text-[#E8B45C]">No hay otras salidas cargadas para armar este molde.</p>}
            </div>
          )}
          {(bannerMoldType === 3 || bannerMoldType === 5) && (
            <p className="text-xs text-[#E8B45C]">Este molde usa sólo datos comerciales verificados de la salida.</p>
          )}
        </div>
      )}

      {/* 2. CONFIGURACIÓN ESPECÍFICA DEL FORMATO */}
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

      {formato === 'video' && (
        <div className="flex flex-col gap-4 rounded-xl p-5" style={{ backgroundColor: '#0D130E', border: '1px solid #1E2D1E' }}>
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: '#6B8F71' }}>Seleccioná las subfamilias a generar:</p>
            <div className="flex flex-col gap-3">
              {['1', '2', '3', '4', '5'].map(groupPrefix => {
                const groupOptions = VIDEO_SUBFAMILIA_OPTIONS.filter(opt => opt.value.startsWith(groupPrefix))
                if (groupOptions.length === 0) return null
                return (
                  <div key={groupPrefix} className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-semibold w-5 shrink-0" style={{ color: '#4A6B4A' }}>F{groupPrefix}</span>
                    {groupOptions.map(opt => {
                      const active = videoSubfamilias.includes(opt.value)
                      const disabledByEligibility = opt.value === '2a' && !listicleEligibility.eligible
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setVideoSubfamilias(prev => active ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                          disabled={loading || disabledByEligibility}
                          title={disabledByEligibility ? `2a necesita al menos ${listicleEligibility.minRequired} lugares verificados cortos; esta salida tiene ${listicleEligibility.candidateCount}.` : undefined}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border"
                          style={{
                            backgroundColor: active ? 'rgba(52,209,126,.12)' : '#111A11',
                            color: disabledByEligibility ? '#3D4D3D' : active ? '#34D17E' : '#6B8F71',
                            borderColor: active ? 'rgba(52,209,126,.3)' : '#1E2D1E',
                            cursor: loading || disabledByEligibility ? 'not-allowed' : 'pointer',
                            opacity: disabledByEligibility ? 0.6 : 1,
                          }}
                        >
                          <span className="uppercase text-xs mr-1 opacity-70">{opt.value}</span> {opt.label}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            {!listicleEligibility.eligible && (
              <p className="text-xs mt-3 px-3 py-2 rounded" style={{ color: '#E8B45C', backgroundColor: 'rgba(232, 180, 92, 0.1)' }}>
                <strong>2A (Listicle) deshabilitado:</strong> necesita al menos {listicleEligibility.minRequired} lugares verificados de hasta 30 caracteres. Esta salida tiene {listicleEligibility.candidateCount}. Sumá puntos de interés cortos para habilitarlo.
              </p>
            )}
          </div>

          {(videoSubfamilias.includes('4') || videoSubfamilias.includes('5')) && (
            <div className="flex flex-col gap-2 pt-3" style={{ borderTop: '1px solid #1E2D1E' }}>
              <p className="text-xs" style={{ color: '#6B8F71' }}>Familia 4 y el fallback comercial de Familia 5 necesitan canal habilitado y fecha de publicación:</p>
              <div className="flex items-center gap-2 flex-wrap">
                {CANAL_OPTIONS.map(canal => {
                  const active = canalesHabilitados.includes(canal)
                  return (
                    <button
                      key={canal}
                      type="button"
                      onClick={() => setCanalesHabilitados(prev => active ? prev.filter(c => c !== canal) : [...prev, canal])}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: active ? 'rgba(52,209,126,.12)' : '#111A11',
                        color: active ? '#34D17E' : '#6B8F71',
                        border: `1px solid ${active ? 'rgba(52,209,126,.3)' : '#1E2D1E'}`,
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {canal}
                    </button>
                  )
                })}
                <input
                  type="date"
                  value={publicationDate}
                  onChange={e => setPublicationDate(e.target.value)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg text-xs focus:outline-none"
                  style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#F0FFF4' }}
                />
              </div>
              {canalesHabilitados.length === 0 && (
                <p className="text-xs" style={{ color: '#E8B45C' }}>Familia 4 y el fallback de Familia 5 no generan sin al menos un canal habilitado.</p>
              )}
            </div>
          )}
        </div>
      )}

      {isPromo && (
        <div className="flex flex-col gap-3 rounded-xl p-4 bg-[#0D130E] border border-[#1E2D1E]">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[#6B8F71]">Variante:</p>
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
        </div>
      )}

      {/* 3. ARMADO DE PIEZAS */}
      {!isPromo && !isBanner && formato !== 'video' && (
        <div className="flex flex-col gap-4 bg-[#0D130E] p-4 rounded-xl border border-[#1E2D1E]">

          {isCarrusel && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-[#6B8F71]">Tipo de armado</p>
              <div className="flex items-center gap-2 flex-wrap">
                {(['Automático', 'A medida'] as const).map(m => {
                  const active = m === 'A medida' ? modoManual : !modoManual
                  return (
                    <button
                      key={m}
                      onClick={() => setModoManual(m === 'A medida')}
                      disabled={loading}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border"
                      style={{
                        backgroundColor: active ? '#1E2D1E' : '#111A11',
                        color: active ? '#F0FFF4' : '#6B8F71',
                        borderColor: active ? '#34D17E' : '#1E2D1E',
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {!(isCarrusel && modoManual) && (
            <div className={`flex flex-col gap-3 ${isCarrusel ? 'pt-3 border-t border-[#1E2D1E]' : ''}`}>
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-medium text-[#6B8F71]">Cantidad de piezas</p>
                  <p className="text-xs text-[#4A6B4A]">(máx. 4)</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {CANTIDAD_OPTIONS.map(n => {
                    const active = cantidad === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          setCantidad(n);
                          setTemasAuto(prev => {
                            const newTemas = [...prev];
                            while (newTemas.length < n) newTemas.push('destinos');
                            return newTemas;
                          });
                        }}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border"
                        style={{
                          backgroundColor: active ? '#1E2D1E' : '#111A11',
                          color: active ? '#F0FFF4' : '#6B8F71',
                          borderColor: active ? '#34D17E' : '#1E2D1E',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          minWidth: '40px'
                        }}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isCarrusel && cantidad > 1 && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-xs font-medium text-[#6B8F71]">Elegí una temática para cada una (opcional):</p>
                  {Array.from({ length: cantidad }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs w-5 text-right shrink-0 text-[#4A6B4A]">{i + 1}</span>
                      <div className="relative flex-1">
                        <select
                          value={temasAuto[i] || 'destinos'}
                          onChange={e => setTemasAuto(prev => {
                            const next = [...prev];
                            next[i] = e.target.value;
                            return next;
                          })}
                          disabled={loading}
                          style={{ ...selectStyle, width: '100%', cursor: loading ? 'not-allowed' : 'pointer', padding: '4px 28px 4px 10px' }}
                        >
                          {TEMA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-[#6B8F71]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isCarrusel && modoManual && (
            <div className="flex flex-col gap-3 pt-3 border-t border-[#1E2D1E]">
              <p className="text-sm font-medium text-[#6B8F71]">Definí tema y estructura por pieza:</p>
              {piezas.map((pieza, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs w-5 text-right shrink-0 text-[#4A6B4A]">{i + 1}</span>

                  <div className="relative flex-1">
                    <select
                      value={pieza.tema}
                      onChange={e => updatePieza(i, 'tema', e.target.value)}
                      disabled={loading}
                      style={{ ...selectStyle, width: '100%', cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                      {TEMA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-[#6B8F71]" />
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
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-[#6B8F71]" />
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
        </div>
      )}

      {/* 4. MULTIMEDIA Y BOTÓN DE GENERACIÓN */}
      <div className="flex flex-col gap-4 mt-2">
        {((formato === 'video' && videosFolderId) || (formato !== 'video' && fotosFolderId)) && (
          <div>
            <p className="text-sm mb-2 text-[#6B8F71]">
              {formato === 'video' ? 'Carpeta de videos crudos:' : 'Carpeta de fotos:'}{' '}
              {carpetaFotos
                ? <span className="font-semibold text-[#5CE6A0]">{carpetaFotos}</span>
                : <span className="text-[#4A6B4A]">sin elegir (Mati usa su default)</span>
              }
            </p>
            <FolderPicker
              rootFolderId={formato === 'video' ? (videosFolderId as string) : (fotosFolderId as string)}
              salidaId={salidaId}
              value={carpetaFotos}
              onChange={setCarpetaFotos}
              onFolderIdChange={folderId => {
                setCarpetaFotosId(folderId)
                setBannerBackgroundFileId(null)
              }}
            />
          </div>
        )}

        {isBanner && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[#6B8F71]">Foto de fondo concreta:</p>
            <BannerImagePicker folderId={carpetaFotosId} value={bannerBackgroundFileId} onChange={setBannerBackgroundFileId} />
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={
            loading
            || (isCarrusel && !eligibility.eligible)
            || (isBanner && (!bannerBackgroundFileId || (bannerMoldType === 4 && bannerRelatedSalidaIds.length < 1)))
            || (formato === 'video' && (
              videoSubfamilias.length === 0
              || ((videoSubfamilias.includes('4') || videoSubfamilias.includes('5')) && canalesHabilitados.length === 0)
            ))
          }
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
              {isBanner
                ? `Generar banner · Molde ${bannerMoldType}`
                : isPromo
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
          <p className="text-xs text-center text-[#6B8F71]">
            {isBanner ? 'Generando el copy estructurado del banner…' : `Generando ${totalPiezas} ${totalPiezas === 1 ? 'pieza' : 'piezas'} — puede tomar hasta ${Math.round(totalPiezas * 4)} segundos. No cerrés la página.`}
          </p>
        )}
        {error && (
          <p className="text-xs text-center text-[#f87171]">{error}</p>
        )}
      </div>
    </div>
  )
}
