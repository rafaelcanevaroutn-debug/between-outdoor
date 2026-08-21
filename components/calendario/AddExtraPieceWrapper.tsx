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
  const [formato, setFormato] = useState<'carrusel' | 'video'>('carrusel')
  const [formatoCarrusel, setFormatoCarrusel] = useState('organico')
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
      // 1. Llamar a la API principal de generación
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salidaId,
          formato,
          formatoCarrusel: formato === 'carrusel' ? formatoCarrusel : undefined,
          cantidad: 1,
          objetivo: 'vender_salida',
          videoMotor: formato === 'video' ? 'familias' : undefined,
          videoSubfamilia: formato === 'video' ? '3a' : undefined,
          tipografiasPermitidas: formato === 'video' ? ['inter'] : undefined, // fallback tipografía para videos
        }),
      })

      let genData
      try {
        const text = await genRes.text()
        genData = JSON.parse(text)
      } catch (err) {
        throw new Error('Error al parsear JSON: ' + (err instanceof Error ? err.message : String(err)) + '. Respuesta de Next.js fue HTML, por favor revisa los logs del servidor.')
      }

      if (!genRes.ok) {
        throw new Error(genData?.error || 'Error al generar la pieza')
      }
      
      const { ids } = genData
      if (!ids || ids.length === 0) {
        throw new Error('No se generó ninguna pieza.')
      }

      if (runId) {
        // 2. Añadir la pieza a la corrida actual
        const appendRes = await fetch(`/api/generate-batch/${runId}/append-piece`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contenidoIds: ids }),
        })
        
        let appendData
        try {
          const text = await appendRes.text()
          appendData = JSON.parse(text)
        } catch (err) {
          throw new Error('Error al parsear JSON (append): ' + (err instanceof Error ? err.message : String(err)) + '. Respuesta de Next.js fue HTML.')
        }

        if (!appendRes.ok) {
          throw new Error(appendData?.error || 'Error al vincular la pieza al calendario')
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
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold shadow-sm transition-all hover:bg-white/10"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#EAF2EC', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Plus className="w-4 h-4" />
        Agregar pieza extra
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#111A11', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <h3 className="font-bold text-[16px]" style={{ color: '#EAF2EC' }}>Generar Contenido Extra</h3>
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
                    <label className="text-[13px] font-medium text-gray-300">Salida destino</label>
                    <select
                      value={salidaId}
                      onChange={e => setSalidaId(e.target.value)}
                      disabled={isGenerating}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-green-500/50"
                    >
                      {salidas.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} ({s.fecha_inicio})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium text-gray-300">Tipo de contenido</label>
                    <select
                      value={formato}
                      onChange={e => setFormato(e.target.value as 'carrusel' | 'video')}
                      disabled={isGenerating}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-green-500/50"
                    >
                      <option value="carrusel">Carrusel</option>
                      {/* <option value="video">Video (Vertical)</option> */}
                    </select>
                    {formato === 'video' && (
                      <p className="text-[12px] text-gray-500">Video se generará en formato vertical genérico (Familia 3).</p>
                    )}
                  </div>

                  {formato === 'carrusel' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-medium text-gray-300">Formato del Carrusel</label>
                      <select
                        value={formatoCarrusel}
                        onChange={e => setFormatoCarrusel(e.target.value)}
                        disabled={isGenerating}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[14px] text-white focus:outline-none focus:border-green-500/50"
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
                  
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isGenerating || !salidaId}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-[14px] shadow-[0_4px_12px_-4px_rgba(52,209,126,0.3)] transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#34D17E,#5CE6A0)', color: '#04130A' }}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generando con IA... (puede tardar un minuto)
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
