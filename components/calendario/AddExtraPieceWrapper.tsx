'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Plus, Loader2 } from 'lucide-react'
import { CANAL_OPTIONS, VIDEO_SUBFAMILIA_OPTIONS } from '@/lib/generators/video-subfamilia-options'
import {
  LOCAL_RECURRING_CAROUSEL_FORMATS,
  LOCAL_RECURRING_VIDEO_SUBFAMILIES,
} from '@/lib/local-recurring-content-policy'
import type { Frecuencia, ObjetivoInteraccion, TemaCarrusel, TipoViaje, VideoKnowledgeFormat } from '@/types'

const CARRUSEL_THEME_OPTIONS: { value: TemaCarrusel; label: string }[] = [
  { value: 'destinos', label: 'Destino y lugares' },
  { value: 'seguridad', label: 'Seguridad en la actividad' },
  { value: 'preparacion_fisica', label: 'Preparación física' },
  { value: 'equipo', label: 'Equipo recomendado' },
  { value: 'educacion_montana', label: 'Educación de montaña' },
  { value: 'dudas_objeciones', label: 'Dudas y objeciones' },
  { value: 'logistica', label: 'Logística de la salida' },
  { value: 'detras_del_guia', label: 'Detrás del guía' },
  { value: 'testimonios', label: 'Experiencias y testimonios' },
  { value: 'motivacion', label: 'Motivación' },
  { value: 'bienestar', label: 'Bienestar y desconexión' },
]

export interface ExtraPieceSalidaOption {
  id: string
  nombre: string
  fecha_inicio: string | null
  tipo_viaje: TipoViaje
  frecuencia: Frecuencia | null
}

interface AddExtraPieceModalProps {
  runId: string
  salidas: ExtraPieceSalidaOption[]
}

export default function AddExtraPieceWrapper({ runId, salidas }: AddExtraPieceModalProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [salidaId, setSalidaId] = useState(salidas[0]?.id || '')
  const [formato, setFormato] = useState<'carrusel' | 'video' | 'banner'>('carrusel')
  const [formatoCarrusel, setFormatoCarrusel] = useState('organico')
  const [temaCarrusel, setTemaCarrusel] = useState<TemaCarrusel>('destinos')
  const [objetivoInteraccion, setObjetivoInteraccion] = useState<ObjetivoInteraccion>('guardar')
  const [videoSubfamilia, setVideoSubfamilia] = useState<VideoKnowledgeFormat>('3e')
  const [canalesHabilitados, setCanalesHabilitados] = useState<string[]>(['Instagram DM'])
  const [publicationDate, setPublicationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [bannerMolde, setBannerMolde] = useState<1 | 2 | 3 | 6>(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const effectiveSalidaId = salidas.some(salida => salida.id === salidaId)
    ? salidaId
    : (salidas[0]?.id ?? '')
  const selectedSalida = salidas.find(salida => salida.id === effectiveSalidaId)
  const isRecurringGroup = selectedSalida?.tipo_viaje === 'salida_recurrente'
  const recurringVideoOptions = VIDEO_SUBFAMILIA_OPTIONS.filter(option => (
    LOCAL_RECURRING_VIDEO_SUBFAMILIES.includes(option.value as typeof LOCAL_RECURRING_VIDEO_SUBFAMILIES[number])
  ))
  const availableVideoOptions = isRecurringGroup ? recurringVideoOptions : VIDEO_SUBFAMILIA_OPTIONS
  const effectiveVideoSubfamilia = availableVideoOptions.some(option => option.value === videoSubfamilia)
    ? videoSubfamilia
    : availableVideoOptions[0].value
  const effectiveBannerMolde = isRecurringGroup ? 6 : bannerMolde
  const effectiveCarruselFormat = isRecurringGroup
    && !LOCAL_RECURRING_CAROUSEL_FORMATS.includes(formatoCarrusel as typeof LOCAL_RECURRING_CAROUSEL_FORMATS[number])
    ? 'organico'
    : formatoCarrusel

  function salidaContextLabel(salida: ExtraPieceSalidaOption) {
    if (salida.tipo_viaje === 'salida_recurrente') {
      const frecuencia = salida.frecuencia
        ? `${salida.frecuencia.charAt(0).toUpperCase()}${salida.frecuencia.slice(1)}`
        : 'Recurrente'
      return `Grupo ${frecuencia.toLocaleLowerCase('es-AR')}`
    }
    return salida.fecha_inicio ?? 'Fecha pendiente'
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveSalidaId) {
      setError('Debes seleccionar una salida.')
      return
    }
    if (formato === 'video' && !isRecurringGroup && (effectiveVideoSubfamilia === '4' || effectiveVideoSubfamilia === '5') && canalesHabilitados.length === 0) {
      setError('Elegí al menos un canal de consulta para este video.')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const endpoint = formato === 'banner' ? '/api/generate/banner/extra' : '/api/generate'
      const genRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salidaId: effectiveSalidaId,
          formato,
          bannerMolde: formato === 'banner' ? effectiveBannerMolde : undefined,
          formatoCarrusel: formato === 'carrusel' ? effectiveCarruselFormat : undefined,
          piezas: formato === 'carrusel' ? [{ tema: temaCarrusel, estructura: 'storytelling' }] : undefined,
          cantidad: 1,
          objetivo: 'vender_salida',
          objetivoInteraccion: formato === 'carrusel' ? objetivoInteraccion : undefined,
          appendToExisting: true,
          videoMotor: formato === 'video' ? 'familias' : undefined,
          videoSubfamilia: formato === 'video' ? effectiveVideoSubfamilia : undefined,
          tipografiasPermitidas: formato === 'video' ? ['Inter', 'Montserrat', 'Oswald'] : undefined,
          canalesHabilitados: formato === 'video' && (effectiveVideoSubfamilia === '4' || effectiveVideoSubfamilia === '5') ? canalesHabilitados : undefined,
          publicationDate: formato === 'video' && (effectiveVideoSubfamilia === '4' || effectiveVideoSubfamilia === '5') ? publicationDate : undefined,
        }),
      })

      const genText = await genRes.text()
      const genData = genText ? JSON.parse(genText) : null

      if (!genRes.ok) {
        throw new Error(genData?.error || 'Error al generar la pieza')
      }

      const { ids } = genData
      if (!ids || ids.length === 0) {
        throw new Error('No se generó ninguna pieza.')
      }

      if (runId) {
        const appendRes = await fetch(`/api/generate-batch/${runId}/append-piece`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contenidoIds: ids }),
        })

        const appendText = await appendRes.text()
        const appendData = appendText ? JSON.parse(appendText) : null

        if (!appendRes.ok) {
          throw new Error(appendData?.error || 'Error al vincular la pieza al calendario')
        }
      }

      // Videos y banners comienzan a renderizarse en cuanto se agregan.
      if (formato === 'video' || formato === 'banner') {
        const approvalResults = await Promise.all(ids.map((id: string) => fetch(
          `/api/generate/${formato}/${id}/aprobar`,
          { method: 'POST' },
        )))
        const failedApproval = approvalResults.find(result => !result.ok)
        if (failedApproval) {
          console.error(`[EXTRA_PIECE] La pieza se agregó, pero el render no pudo iniciarse (${failedApproval.status})`)
        }
      }

      // Éxito: cerrar y refrescar
      setIsOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { setError(''); setIsOpen(true) }}
        className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-semibold transition-colors hover:border-[var(--cardon)] hover:text-[var(--cardon)] lg:w-auto"
        style={{ backgroundColor: 'rgba(255,255,255,.7)', color: 'var(--tinta)', border: '1px solid var(--linea)' }}
      >
        <Plus className="w-4 h-4" />
        Agregar pieza extra
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--linea)' }}>
              <h3 className="font-bold text-[16px]" style={{ color: 'var(--tinta)' }}>Generar Contenido Extra</h3>
              <button
                onClick={() => !isGenerating && setIsOpen(false)}
                disabled={isGenerating}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="p-5 flex flex-col gap-4">
              {salidas.length === 0 ? (
                <p className="text-[13px] text-red-400">No hay salidas activas para generar contenido.</p>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium" style={{ color: 'var(--piedra)' }}>Salida destino</label>
                    <select
                      value={effectiveSalidaId}
                      onChange={e => setSalidaId(e.target.value)}
                      disabled={isGenerating}
                      className="w-full rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }}
                    >
                      {salidas.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} · {salidaContextLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium" style={{ color: 'var(--piedra)' }}>Tipo de contenido</label>
                    <select
                      value={formato}
                      onChange={e => setFormato(e.target.value as 'carrusel' | 'video' | 'banner')}
                      disabled={isGenerating}
                      className="w-full rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }}
                    >
                      <option value="carrusel">Carrusel</option>
                      <option value="video">Video vertical</option>
                      <option value="banner">Banner / flyer</option>
                    </select>
                  </div>

                  {formato === 'carrusel' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium" style={{ color: 'var(--piedra)' }}>¿Qué querés contar?</label>
                      <select
                        value={effectiveCarruselFormat}
                        onChange={e => setFormatoCarrusel(e.target.value)}
                        disabled={isGenerating}
                        className="w-full rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }}
                      >
                        {isRecurringGroup ? (
                          <>
                            <option value="organico">Mostrar cómo se vive el grupo</option>
                            <option value="conversacion">Responder una duda real</option>
                            <option value="calendario">Explicar cómo funciona el grupo</option>
                          </>
                        ) : (
                          <>
                            <option value="organico">Mostrar cómo se vive la experiencia</option>
                            <option value="lugar">Descubrir un lugar</option>
                            <option value="conversacion">Responder una duda real</option>
                            <option value="itinerario">Explicar el recorrido</option>
                            <option value="editorial">Educar y construir autoridad</option>
                            <option value="calendario">Comunicar próximas fechas</option>
                          </>
                        )}
                      </select>
                      {!isRecurringGroup && (
                        <>
                          <label className="mt-2 text-[13px] font-medium" style={{ color: 'var(--piedra)' }}>Tema</label>
                          <select
                            value={temaCarrusel}
                            onChange={e => setTemaCarrusel(e.target.value as TemaCarrusel)}
                            disabled={isGenerating}
                            className="w-full rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-opacity-50"
                            style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }}
                          >
                            {CARRUSEL_THEME_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </>
                      )}
                      <label className="mt-2 text-[13px] font-medium" style={{ color: 'var(--piedra)' }}>¿Qué querés lograr?</label>
                      <select
                        value={objetivoInteraccion}
                        onChange={e => setObjetivoInteraccion(e.target.value as ObjetivoInteraccion)}
                        disabled={isGenerating}
                        className="w-full rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }}
                      >
                        <option value="guardar">Que lo guarden</option>
                        <option value="compartir">Que lo compartan</option>
                        <option value="comentar">Que comenten</option>
                        <option value="convertir">Generar consultas</option>
                      </select>
                    </div>
                  )}

                  {formato === 'video' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium" style={{ color: 'var(--piedra)' }}>¿Qué tipo de video querés?</label>
                      <select
                        value={effectiveVideoSubfamilia}
                        onChange={e => setVideoSubfamilia(e.target.value as VideoKnowledgeFormat)}
                        disabled={isGenerating}
                        className="w-full rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }}
                      >
                        {availableVideoOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <p className="text-[12px] text-gray-500">Elegís la idea; Between usa el material real de esa salida.</p>

                      {!isRecurringGroup && (effectiveVideoSubfamilia === '4' || effectiveVideoSubfamilia === '5') && (
                        <div className="mt-2 flex flex-col gap-2 rounded-lg p-3" style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)' }}>
                          <p className="text-[12px] font-medium" style={{ color: 'var(--piedra)' }}>Canal de consulta</p>
                          <div className="flex flex-wrap gap-2">
                            {CANAL_OPTIONS.map(canal => {
                              const active = canalesHabilitados.includes(canal)
                              return (
                                <button
                                  key={canal}
                                  type="button"
                                  onClick={() => setCanalesHabilitados(previous => active ? previous.filter(item => item !== canal) : [...previous, canal])}
                                  className="rounded-full px-3 py-1.5 text-[12px] font-medium"
                                  style={{ backgroundColor: active ? 'var(--cardon)' : 'var(--blanco-piedra)', color: active ? 'white' : 'var(--tinta)', border: '1px solid var(--linea)' }}
                                >
                                  {canal}
                                </button>
                              )
                            })}
                          </div>
                          <input
                            type="date"
                            value={publicationDate}
                            onChange={e => setPublicationDate(e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-[13px]"
                            style={{ backgroundColor: 'var(--blanco-piedra)', border: '1px solid var(--linea)', color: 'var(--tinta)' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {formato === 'banner' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium" style={{ color: 'var(--piedra)' }}>Objetivo del banner</label>
                      <select
                        value={effectiveBannerMolde}
                        onChange={e => setBannerMolde(Number(e.target.value) as 1 | 2 | 3 | 6)}
                        disabled={isGenerating}
                        className="w-full rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }}
                      >
                        {isRecurringGroup ? (
                          <option value={6}>Convocar al grupo</option>
                        ) : (
                          <>
                            <option value={1}>Promocionar la salida</option>
                            <option value={2}>Mostrar datos de la experiencia</option>
                            <option value={3}>Comunicar precio y reserva</option>
                            <option value={6}>Convocar a la comunidad</option>
                          </>
                        )}
                      </select>
                      <p className="text-[12px] text-gray-500">Usa una foto real y los datos cargados de la salida.</p>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isGenerating || !effectiveSalidaId}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-[14px] transition-all disabled:opacity-50"
                    style={{ backgroundColor: 'var(--tinta)', color: 'var(--nieve)' }}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {formato === 'video' ? 'Preparando video…' : formato === 'banner' ? 'Diseñando banner…' : 'Generando carrusel…'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generar e insertar en calendario
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}
