'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {AlertCircle, Check, Clock3, GripVertical, LoaderCircle, Send, X, RefreshCw} from 'lucide-react'
import type {ContenidoGenerado} from '@/types'
import SemanaGeneradaPieceCell from '@/components/calendario/SemanaGeneradaPieceCell'

export interface EditableCalendarDay {
  isoDate: string
  label: string
  date: string
  isToday: boolean
}

interface SocialAccount {
  external_account_id: string
  platform: 'instagram' | 'tiktok' | 'facebook' | 'youtube'
  username: string | null
  display_name: string | null
  status: string
}

interface SocialProfile { accounts?: SocialAccount[] }

interface Props {
  days: EditableCalendarDay[]
  initialPieces: ContenidoGenerado[]
  salidaNames: Record<string, string>
  basePieceCount: number
  extraPieceCount: number
  isReadOnly?: boolean
  runId?: string
  initialRemakesUsed?: number
}

function localParts(iso: string | null | undefined): {date: string; time: string} {
  const value = iso ? new Date(iso) : new Date()
  const date = Number.isNaN(value.getTime()) ? new Date() : value
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

function dateTimeIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00-03:00`).toISOString()
}

function accountLabel(account: SocialAccount): string {
  return `@${account.username || account.display_name || account.platform}`
}

export default function EditableWeekCalendar({days, initialPieces, salidaNames, basePieceCount, extraPieceCount, isReadOnly = false, runId, initialRemakesUsed = 0}: Props) {
  const [pieces, setPieces] = useState(initialPieces)
  const [remakesUsed, setRemakesUsed] = useState(initialRemakesUsed)
  const [remakingId, setRemakingId] = useState<string | null>(null)
  useEffect(() => {
    setPieces(initialPieces)
  }, [initialPieces])
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState('')
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [publishStep, setPublishStep] = useState<'closed' | 'confirm' | 'publishing' | 'done'>('closed')
  const [publishProgress, setPublishProgress] = useState(0)
  const [publishError, setPublishError] = useState('')
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const [scheduleReferenceTime] = useState(() => Date.now())
  const scheduleRepairStarted = useRef(false)

  const handlePieceChange = useCallback((pieceId: string, updates: Partial<ContenidoGenerado>) => {
    setPieces(current => current.map(piece => piece.id === pieceId ? {...piece, ...updates} : piece))
  }, [])

  const handleRemakePiece = async (pieceId: string) => {
    if (remakingId || remakesUsed >= 5 || !runId || isReadOnly) return
    const oldPiece = pieces.find(p => p.id === pieceId)
    if (!oldPiece) return

    setRemakingId(pieceId)
    try {
      // 1. Generate a new piece using the exact same generation settings
      const endpoint = oldPiece.formato === 'banner' ? '/api/generate/banner/extra' : '/api/generate'
      
      const payload: any = {
        salidaId: oldPiece.salida_id,
        formato: oldPiece.formato,
        objetivo: 'vender_salida',
        cantidad: 1,
        appendToExisting: true,
      }
      
      if (oldPiece.formato === 'banner') {
         payload.bannerMolde = oldPiece.generation_metadata?.banner_molde
      } else if (oldPiece.formato === 'carrusel') {
         payload.formatoCarrusel = oldPiece.formato_carrusel
         payload.piezas = [{ tema: oldPiece.tema, estructura: 'storytelling' }]
         payload.objetivoInteraccion = oldPiece.objetivo_interaccion || 'convertir'
      } else if (oldPiece.formato === 'video') {
         payload.videoMotor = oldPiece.generation_metadata?.video_motor
         payload.videoSubfamilia = oldPiece.generation_metadata?.video_subfamilia
      }

      const genRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const genData = await genRes.json()
      if (!genRes.ok) throw new Error(genData.error || 'Error al generar la nueva pieza')
      const newContenidoId = genData.ids?.[0]
      if (!newContenidoId) throw new Error('No se obtuvo el ID de la nueva pieza')

      // 2. Replace the slot in the run
      const replaceRes = await fetch(`/api/generate-batch/${runId}/replace-piece`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldContenidoId: pieceId, newContenidoId })
      })
      const replaceData = await replaceRes.json()
      if (!replaceRes.ok) throw new Error(replaceData.error || 'Error al reemplazar la pieza')

      // 3. Fetch the new piece row to update UI
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data: newPieceData } = await supabase.from('contenido_generado').select('*').eq('id', newContenidoId).single()
      if (newPieceData) {
        setPieces(current => current.map(p => p.id === pieceId ? (newPieceData as ContenidoGenerado) : p))
        setRemakesUsed(replaceData.remakesUsed)
      }

      // If it's banner or video, start render automatically just like AddExtraPieceWrapper
      if (oldPiece.formato === 'banner' || oldPiece.formato === 'video') {
         await fetch(`/api/generate/${oldPiece.formato}/${newContenidoId}/aprobar`, { method: 'POST' })
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo rehacer la pieza')
    } finally {
      setRemakingId(null)
    }
  }

  const piecesByDate = useMemo(() => {
    const result = new Map<string, ContenidoGenerado[]>()
    for (const piece of pieces) {
      const date = localParts(piece.scheduled_at).date
      const current = result.get(date) ?? []
      current.push(piece)
      result.set(date, current)
    }
    for (const values of result.values()) {
      values.sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
    }
    console.log('--- EditableWeekCalendar DEBUG ---');
    console.log('pieces:', pieces.map(p => ({id: p.id, scheduled_at: p.scheduled_at, local_date: localParts(p.scheduled_at).date})));
    console.log('days (isoDate):', days.map(d => d.isoDate));
    console.log('piecesByDate map keys:', Array.from(result.keys()));
    return result
  }, [pieces, days])

  const readyPieces = pieces.filter(piece => piece.render_status === 'rendered' && Boolean(piece.render_folder_id))
  const invalidSchedulePieces = useMemo(() => pieces.filter(piece => {
    const timestamp = piece.scheduled_at ? new Date(piece.scheduled_at).getTime() : Number.NaN
    return !Number.isFinite(timestamp) || timestamp <= scheduleReferenceTime + 5 * 60_000
  }), [pieces, scheduleReferenceTime])
  const missingScheduleCount = invalidSchedulePieces.filter(piece => !piece.scheduled_at).length
  const pastScheduleCount = invalidSchedulePieces.length - missingScheduleCount
  const schedulesAreFuture = invalidSchedulePieces.length === 0

  const saveSchedule = useCallback(async (pieceId: string, scheduledAt: string) => {
    const previous = pieces.find(piece => piece.id === pieceId)?.scheduled_at ?? null
    setSavingId(pieceId)
    setScheduleError('')
    setPieces(current => current.map(piece => piece.id === pieceId ? {...piece, scheduled_at: scheduledAt} : piece))
    try {
      const response = await fetch(`/api/calendar/pieces/${pieceId}/schedule`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({scheduledAt}),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el horario')
      setPieces(current => current.map(piece => piece.id === pieceId ? {...piece, scheduled_at: payload.piece.scheduled_at} : piece))
    } catch (error) {
      setPieces(current => current.map(piece => piece.id === pieceId ? {...piece, scheduled_at: previous} : piece))
      setScheduleError(error instanceof Error ? error.message : 'No se pudo guardar el horario')
    } finally {
      setSavingId(null)
    }
  }, [pieces])

  useEffect(() => {
    if (isReadOnly || scheduleRepairStarted.current || invalidSchedulePieces.length === 0) return

    const usedSchedules = new Set(
      pieces
        .map(piece => piece.scheduled_at)
        .filter((value): value is string => Boolean(value)),
    )

    function generateRandomScheduleForDay(dayIso: string, attemptDaysForward = 0): string | null {
      if (attemptDaysForward > 7) return null // Prevent infinite recursion

      // Create a local date at noon to get the correct local weekday
      const date = new Date(`${dayIso}T12:00:00-03:00`)
      // Add forward offset if we are shifting to future days
      date.setDate(date.getDate() + attemptDaysForward)
      const shiftedDayIso = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()
      
      let ranges: {start: number, end: number}[] = []
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Lunes a Viernes
        ranges = [{start: 11, end: 13}, {start: 18, end: 20}]
      } else if (dayOfWeek === 6) {
        // Sábado
        ranges = [{start: 16, end: 20}]
      } else if (dayOfWeek === 0) {
        // Domingo
        ranges = [{start: 18, end: 20}]
      }

      for (let attempt = 0; attempt < 50; attempt++) {
        const range = ranges[Math.floor(Math.random() * ranges.length)]
        const hour = Math.floor(Math.random() * (range.end - range.start + 1)) + range.start
        const minute = Math.floor(Math.random() * 60)
        
        if (hour === range.end && dayOfWeek >= 1 && dayOfWeek <= 5 && range.start === 18 && minute > 30) continue
        
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const candidateIso = dateTimeIso(shiftedDayIso, timeStr)
        
        if (new Date(candidateIso).getTime() > Date.now() + 10 * 60_000 && !usedSchedules.has(candidateIso)) {
          return candidateIso
        }
      }
      
      // If we couldn't find a valid time on this day (e.g. it's already past 20:00), try the next day
      return generateRandomScheduleForDay(dayIso, attemptDaysForward + 1)
    }

    const candidates = days
      .flatMap(day => {
        // We only generate a single candidate per piece, so we just need as many unique candidates as invalid pieces.
        // But since pieces are tied to days initially, we just try to get one candidate for the day of each invalid piece.
        return []
      })
    
    // Instead of day based mapping, just map each invalid piece to its own original day and shift if needed
    const generatedCandidates: string[] = []
    for (const piece of invalidSchedulePieces) {
       const originalDayIso = piece.scheduled_at ? localParts(piece.scheduled_at).date : days[0].isoDate
       const candidate = generateRandomScheduleForDay(originalDayIso)
       if (candidate) {
         usedSchedules.add(candidate)
         generatedCandidates.push(candidate)
       }
    }

    if (generatedCandidates.length < invalidSchedulePieces.length) return
    scheduleRepairStarted.current = true
    void Promise.all(invalidSchedulePieces.map((piece, index) => saveSchedule(piece.id, generatedCandidates[index])))
  }, [days, invalidSchedulePieces, pieces, saveSchedule])

  function moveToDay(pieceId: string, day: string) {
    if (isReadOnly) return
    const piece = pieces.find(item => item.id === pieceId)
    if (!piece || publishStep === 'done') return
    const {time} = localParts(piece.scheduled_at)
    void saveSchedule(pieceId, dateTimeIso(day, time))
  }

  async function loadAccounts() {
    setPublishError('')
    try {
      const response = await fetch('/api/zernio/profiles', {cache: 'no-store'})
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'No se pudieron cargar las redes')
      const connected = ((payload.profiles as SocialProfile[] | undefined) ?? [])
        .flatMap(profile => profile.accounts ?? [])
        .filter(account => (account.platform === 'instagram' || account.platform === 'tiktok') && account.status === 'connected')
      setAccounts(connected)
      setSelectedAccountIds(connected.map(account => account.external_account_id))
      setAccountsLoaded(true)
      setPublishStep('confirm')
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'No se pudieron cargar las redes')
    }
  }

  function toggleAccount(accountId: string) {
    setSelectedAccountIds(current => current.includes(accountId)
      ? current.filter(id => id !== accountId)
      : [...current, accountId])
  }

  async function publishWeek() {
    setPublishStep('publishing')
    setPublishError('')
    setPublishProgress(0)
    let completed = 0
    try {
      for (const piece of pieces) {
        const response = await fetch('/api/zernio/publications', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            contenidoId: piece.id,
            scheduledAt: piece.scheduled_at,
            accountIds: selectedAccountIds,
          }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(`${completed} de ${pieces.length} programadas. ${payload.error || 'Falló una publicación'}`)
        completed += 1
        setPublishProgress(completed)
      }
      setPublishStep('done')
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'No se pudo publicar el calendario completo')
      setPublishStep('confirm')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {scheduleError && (
        <div className="flex items-start gap-2 rounded-xl border border-[var(--linea)] bg-[var(--blanco-piedra)] px-4 py-3 text-[12px] text-[var(--tinta)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cardon)]" /> {scheduleError}
        </div>
      )}

      <section className="overflow-hidden rounded-[24px] border border-[var(--linea)] surface-card bg-white shadow-[var(--sombra-reposo)]">
        <div className="flex items-center justify-between border-b border-[var(--linea)] px-5 py-4">
          <div>
            <h2 className="font-display text-[18px] font-bold tracking-[-.02em] text-[var(--tinta)]">Semana de contenido</h2>
            <p className="mt-1 text-[12px] text-[var(--piedra)]">Arrastrá una pieza para cambiarla de día. Tocá la hora para ajustarla.</p>
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && runId && (
              <span className="rounded-full border border-[var(--linea)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--piedra)]">
                {5 - remakesUsed} {5 - remakesUsed === 1 ? 'rehacer disponible' : 'rehaceres disponibles'}
              </span>
            )}
            <span className="rounded-full bg-[var(--cardon-tenue)] px-3 py-1.5 text-[11px] font-semibold text-[var(--cardon)]">
              {extraPieceCount > 0 ? `${basePieceCount} de la semana · ${extraPieceCount} extras` : `${pieces.length} piezas`}
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-7 border-b border-[var(--linea)] bg-[var(--nieve)]">
              {days.map(day => (
                <div key={day.isoDate} className={`border-r border-[var(--linea)] px-3 py-3 text-center last:border-r-0 ${day.isToday ? 'bg-[var(--cardon-tenue)]' : ''}`}>
                  <p className={`font-sans text-[11px] font-semibold uppercase tracking-[.12em] ${day.isToday ? 'font-bold text-[var(--cardon)]' : 'text-[var(--piedra)]'}`}>{day.label}</p>
                  <p className="mt-1 font-sans text-[13px] font-semibold text-[var(--tinta)]">{day.date}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map(day => {
                const dayPieces = piecesByDate.get(day.isoDate) ?? []
                return (
                  <div
                    key={day.isoDate}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                      event.preventDefault()
                      const pieceId = event.dataTransfer.getData('text/plain') || draggedId
                      if (pieceId) moveToDay(pieceId, day.isoDate)
                      setDraggedId(null)
                    }}
                    className={`min-h-[360px] border-r border-[var(--linea)] p-2.5 transition-colors last:border-r-0 ${day.isToday ? 'bg-[var(--blanco-piedra)]' : ''} ${draggedId ? 'hover:bg-[var(--cardon-tenue)]' : ''}`}
                  >
                    {dayPieces.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {dayPieces.map(piece => {
                          const {time} = localParts(piece.scheduled_at)
                          return (
                            <article key={piece.id} className="rounded-xl border border-[var(--linea)] bg-white p-2 shadow-sm">
                              <div
                                draggable={publishStep !== 'done' && !isReadOnly}
                                onDragStart={event => {
                                  event.dataTransfer.setData('text/plain', piece.id)
                                  event.dataTransfer.effectAllowed = 'move'
                                  setDraggedId(piece.id)
                                }}
                                onDragEnd={() => setDraggedId(null)}
                                className={`mb-2 flex items-center justify-between rounded-lg bg-[var(--blanco-piedra)] px-2 py-1.5 ${isReadOnly ? '' : 'cursor-grab active:cursor-grabbing'}`}
                              >
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--piedra)]">{!isReadOnly && <GripVertical className="h-3.5 w-3.5" />} {isReadOnly ? 'Horario' : 'Mover'}</span>
                                {savingId === piece.id && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[var(--cardon)]" />}
                              </div>
                              <SemanaGeneradaPieceCell
                                pieza={piece}
                                salidaNombre={salidaNames[piece.salida_id] ?? 'Salida'}
                                onPieceChange={handlePieceChange}
                              />
                              <label className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--linea)] bg-[var(--blanco-piedra)] px-2 py-1.5 text-[10px] font-semibold text-[var(--piedra)] focus-within:border-[var(--cardon)] transition-colors">
                                <Clock3 className="h-3.5 w-3.5 text-[var(--cardon)]" />
                                <input
                                  type="time"
                                  value={time}
                                  lang="en-GB"
                                  disabled={publishStep === 'done' || savingId === piece.id || isReadOnly}
                                  onChange={event => event.target.value && void saveSchedule(piece.id, dateTimeIso(day.isoDate, event.target.value))}
                                  className="min-w-0 flex-1 bg-transparent font-semibold text-[var(--tinta)] outline-none disabled:opacity-60"
                                />
                              </label>
                              {!isReadOnly && publishStep !== 'done' && (
                                <button
                                  type="button"
                                  disabled={remakesUsed >= 5 || remakingId !== null}
                                  onClick={() => handleRemakePiece(piece.id)}
                                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--linea)] bg-white px-2 py-1.5 text-[10px] font-semibold text-[var(--cardon)] transition-colors hover:bg-[var(--blanco-piedra)] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {remakingId === piece.id ? (
                                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  )}
                                  {remakingId === piece.id ? 'Rehaciendo...' : 'Rehacer pieza'}
                                </button>
                              )}
                            </article>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[330px] items-center justify-center"><span className="h-1.5 w-1.5 rounded-full bg-[var(--linea)]" /></div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {!isReadOnly && (
        <section className="rounded-[20px] border border-[var(--linea)] surface-card bg-white p-5 shadow-[var(--sombra-reposo)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-[15px] font-bold text-[var(--tinta)]">Revisá, ordená y publicá cuando esté lista.</p>
            <p className="mt-1 text-[12px] text-[var(--piedra)]">
              {readyPieces.length} de {pieces.length} piezas tienen su diseño final
              {extraPieceCount > 0 ? ` · ${basePieceCount} de la semana + ${extraPieceCount} extras` : ''}. Nada se publica hasta que lo confirmes.
            </p>
            {!schedulesAreFuture && (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--tinta)]">
                <LoaderCircle className="h-3 w-3 animate-spin text-[var(--cardon)]" />
                Acomodando {missingScheduleCount > 0 ? `${missingScheduleCount} piezas sin horario` : ''}
                {missingScheduleCount > 0 && pastScheduleCount > 0 ? ' y ' : ''}
                {pastScheduleCount > 0 ? `${pastScheduleCount} horarios vencidos` : ''}…
              </p>
            )}
          </div>
          {publishStep === 'done' ? (
            <div className="flex items-center gap-2 rounded-full bg-[var(--cardon-tenue)] px-4 py-3 text-[12px] font-semibold text-[var(--cardon)]"><Check className="h-4 w-4" /> Calendario programado</div>
          ) : (
            <button
              type="button"
              onClick={() => accountsLoaded ? setPublishStep('confirm') : void loadAccounts()}
              disabled={readyPieces.length !== pieces.length || !schedulesAreFuture || pieces.length === 0}
              className="flex items-center justify-center gap-2 rounded-full bg-[var(--cardon)] px-6 py-3 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Send className="h-4 w-4" /> Publicar calendario
            </button>
          )}
        </div>
        {publishError && <p className="mt-3 flex items-start gap-2 text-[11px] text-red-600"><AlertCircle className="h-3.5 w-3.5 shrink-0" /> {publishError}</p>}
      </section>
      )}

      {(publishStep === 'confirm' || publishStep === 'publishing') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => publishStep !== 'publishing' && setPublishStep('closed')}>
          <div className="w-full max-w-md rounded-[22px] bg-[var(--nieve)] p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[18px] font-semibold text-[var(--tinta)]">Programar la semana</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--piedra)]">Las {pieces.length} piezas se enviarán a Zernio con el día y horario que ves en el calendario.</p>
              </div>
              {publishStep !== 'publishing' && <button type="button" onClick={() => setPublishStep('closed')} aria-label="Cerrar"><X className="h-5 w-5 text-[var(--piedra)]" /></button>}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {accounts.map(account => (
                <label key={account.external_account_id} className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--linea)] bg-white px-3 py-3">
                  <span>
                    <span className="block text-[12px] font-semibold capitalize text-[var(--tinta)]">{account.platform}</span>
                    <span className="text-[11px] text-[var(--piedra)]">{accountLabel(account)}</span>
                  </span>
                  <input type="checkbox" checked={selectedAccountIds.includes(account.external_account_id)} onChange={() => toggleAccount(account.external_account_id)} disabled={publishStep === 'publishing'} className="h-4 w-4 accent-[var(--cardon)]" />
                </label>
              ))}
              {accounts.length === 0 && <p className="rounded-xl bg-[var(--blanco-piedra)] p-3 text-[12px] text-[var(--piedra)]">Conectá Instagram o TikTok desde Cuenta antes de publicar.</p>}
            </div>
            {publishStep === 'publishing' ? (
              <div className="mt-5 rounded-xl bg-[var(--cardon-tenue)] p-4 text-center text-[12px] font-semibold text-[var(--cardon)]"><LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" /> Programando {publishProgress} de {pieces.length}…</div>
            ) : (
              <button type="button" onClick={() => void publishWeek()} disabled={selectedAccountIds.length === 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--cardon)] px-4 py-3 text-[12px] font-semibold text-white disabled:opacity-45"><Send className="h-4 w-4" /> Confirmar y programar</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
