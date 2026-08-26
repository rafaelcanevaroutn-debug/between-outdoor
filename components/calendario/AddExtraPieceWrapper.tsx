'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, Plus, Loader2 } from 'lucide-react'

export interface ExtraPieceSalidaOption {
  id: string
  nombre: string
  fecha_inicio: string
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
  const [bannerMolde, setBannerMolde] = useState<1 | 2 | 3 | 6>(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!salidaId) {
      setError('Debes seleccionar una salida.')
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
          salidaId,
          formato,
          bannerMolde: formato === 'banner' ? bannerMolde : undefined,
          formatoCarrusel: formato === 'carrusel' ? formatoCarrusel : undefined,
          cantidad: 1,
          objetivo: 'vender_salida',
          appendToExisting: true,
          videoMotor: formato === 'video' ? 'familias' : undefined,
          videoSubfamilia: formato === 'video' ? '3a' : undefined,
          tipografiasPermitidas: formato === 'video' ? ['Inter'] : undefined,
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
                      value={salidaId}
                      onChange={e => setSalidaId(e.target.value)}
                      disabled={isGenerating}
                      className="w-full rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-opacity-50"
                      style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }}
                    >
                      {salidas.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} ({s.fecha_inicio})
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
                    {formato === 'video' && (
                      <p className="text-[12px] text-gray-500">Se crea con los videos de la salida y queda listo para revisar.</p>
                    )}
                  </div>

                  {formato === 'carrusel' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium" style={{ color: 'var(--piedra)' }}>Formato del Carrusel</label>
                      <select
                        value={formatoCarrusel}
                        onChange={e => setFormatoCarrusel(e.target.value)}
                        disabled={isGenerating}
                        className="w-full rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }}
                      >
                        <option value="organico">Orgánico (Descubrimiento)</option>
                        <option value="editorial">Editorial (Autoridad / Confianza)</option>
                        <option value="lugar">Lugar (Venta directa)</option>
                        <option value="itinerario">Itinerario (Detalles del viaje)</option>
                        <option value="conversacion">Conversación (Interacción)</option>
                        <option value="calendario">Calendario (Próximas fechas)</option>
                      </select>
                    </div>
                  )}

                  {formato === 'banner' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium" style={{ color: 'var(--piedra)' }}>Objetivo del banner</label>
                      <select
                        value={bannerMolde}
                        onChange={e => setBannerMolde(Number(e.target.value) as 1 | 2 | 3 | 6)}
                        disabled={isGenerating}
                        className="w-full rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-opacity-50"
                        style={{ backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)' }}
                      >
                        <option value={1}>Promocionar la salida</option>
                        <option value={2}>Mostrar datos de la experiencia</option>
                        <option value={3}>Comunicar precio y reserva</option>
                        <option value={6}>Convocar a la comunidad</option>
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
                    disabled={isGenerating || !salidaId}
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
