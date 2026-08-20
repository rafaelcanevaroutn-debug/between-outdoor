'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import StructuredContentFields from '@/components/salidas/StructuredContentFields'
import CommercialBannerFields from '@/components/salidas/CommercialBannerFields'
import {bannerCommercialFormFromSalida, bannerCommercialPayload} from '@/lib/banner-commercial-form'
import type { Salida, TipoViaje, NivelDificultad, DiaSemana, Frecuencia, Moneda } from '@/types'

interface SalidaEditFormProps {
  salida: Salida
  fotosRootFolderId: string | null
  videosRootFolderId: string | null
}

const TIPO_OPTIONS = [
  { value: 'expedicion_premium',  label: 'Expedición Premium' },
  { value: 'escapada_fin_semana', label: 'Escapada Fin de Semana' },
  { value: 'salida_un_dia',       label: 'Salida de un Día' },
  { value: 'salida_recurrente',   label: 'Salida Recurrente' },
]

const NIVEL_OPTIONS = [
  { value: 'baja',  label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta',  label: 'Alta' },
]

const ESTADO_OPTIONS = [
  { value: 'borrador',   label: 'Borrador' },
  { value: 'activa',     label: 'Activa' },
  { value: 'completada', label: 'Completada' },
]

const DIAS_SEMANA: { value: DiaSemana; label: string }[] = [
  { value: 'lunes',     label: 'Lun' },
  { value: 'martes',    label: 'Mar' },
  { value: 'miércoles', label: 'Mié' },
  { value: 'jueves',    label: 'Jue' },
  { value: 'viernes',   label: 'Vie' },
  { value: 'sábado',    label: 'Sáb' },
  { value: 'domingo',   label: 'Dom' },
]

const FRECUENCIA_OPTIONS: { value: Frecuencia; label: string }[] = [
  { value: 'semanal',   label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual',   label: 'Mensual' },
]

const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors"
const inputStyle = { backgroundColor: '#0A0F0A', border: '1px solid #1E2D1E', color: '#F0FFF4' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: '#F0FFF4' }}>{label}</label>
      {children}
    </div>
  )
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{children}</div>
}

import FolderPicker from '@/components/fotos/FolderPicker'

export default function SalidaEditForm({ salida, fotosRootFolderId, videosRootFolderId }: SalidaEditFormProps) {
  const router = useRouter()
  const [loading, setLoading]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [commercial, setCommercial] = useState(() => bannerCommercialFormFromSalida(salida))

  const [form, setForm] = useState({
    nombre:           salida.nombre,
    destino:          salida.destino,
    pais_codigo:      salida.pais_codigo ?? 'AR',
    fecha_inicio:     salida.fecha_inicio,
    fecha_fin:        salida.fecha_fin,
    precio_usd:       String(salida.precio_usd),
    sena_usd:         salida.sena_usd ? String(salida.sena_usd) : '',
    moneda:           (salida.moneda ?? 'USD') as Moneda,
    nivel:            salida.nivel,
    cupos:            String(salida.cupos),
    link_inscripcion: salida.link_inscripcion || '',
    tipo_viaje:       salida.tipo_viaje,
    itinerario:       salida.itinerario || '',
    itinerario_dias:  salida.itinerario_dias ?? [],
    puntos_interes:   salida.puntos_interes ?? [],
    que_incluye:      salida.que_incluye || '',
    que_no_incluye:   salida.que_no_incluye || '',
    estado:           salida.estado,
    dias_semana:      (salida.dias_semana ?? []) as DiaSemana[],
    hora_encuentro:   salida.hora_encuentro || '',
    punto_encuentro:  salida.punto_encuentro || '',
    frecuencia:       (salida.frecuencia ?? 'semanal') as Frecuencia,
    carpeta_fotos_id: salida.carpeta_fotos_id || null,
    carpeta_fotos_nombre: salida.carpeta_fotos_nombre || null,
    carpeta_videos_id: salida.carpeta_videos_id || null,
    carpeta_videos_nombre: salida.carpeta_videos_nombre || null,
  })

  const isRecurrente = form.tipo_viaje === 'salida_recurrente'
  const isUnDia      = form.tipo_viaje === 'salida_un_dia'

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'tipo_viaje' && value === 'salida_un_dia') next.fecha_fin = prev.fecha_inicio
      if (name === 'fecha_inicio' && next.tipo_viaje === 'salida_un_dia') next.fecha_fin = value
      return next
    })
    setSuccess(false)
  }

  function toggleDia(dia: DiaSemana) {
    setForm(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter(d => d !== dia)
        : [...prev.dias_semana, dia],
    }))
    setSuccess(false)
  }

  function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#34D17E'
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#1E2D1E'
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const fecha_fin = isUnDia ? form.fecha_inicio : form.fecha_fin

    let commercialPayload
    try {
      commercialPayload = bannerCommercialPayload(commercial, {precioActual: Number(form.precio_usd)})
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Los datos comerciales no son válidos')
      setLoading(false)
      return
    }

    const patch: Record<string, unknown> = {
      nombre:           form.nombre,
      destino:          form.destino,
      pais_codigo:      form.pais_codigo,
      nivel:            form.nivel as NivelDificultad,
      cupos:            parseInt(form.cupos),
      link_inscripcion: form.link_inscripcion || null,
      tipo_viaje:       form.tipo_viaje as TipoViaje,
      itinerario:       form.itinerario || null,
      itinerario_dias:  form.itinerario_dias,
      puntos_interes:   form.puntos_interes,
      que_incluye:      form.que_incluye || null,
      que_no_incluye:   form.que_no_incluye || null,
      estado:           form.estado as Salida['estado'],
      precio_usd:       parseFloat(form.precio_usd),
      sena_usd:         form.sena_usd ? parseFloat(form.sena_usd) : null,
      moneda:           form.moneda,
      ...commercialPayload,
      carpeta_fotos_id: form.carpeta_fotos_id,
      carpeta_fotos_nombre: form.carpeta_fotos_nombre,
      carpeta_videos_id: form.carpeta_videos_id,
      carpeta_videos_nombre: form.carpeta_videos_nombre,
      updated_at:       new Date().toISOString(),
    }

    if (isRecurrente) {
      patch.dias_semana     = form.dias_semana.length > 0 ? form.dias_semana : null
      patch.hora_encuentro  = form.hora_encuentro || null
      patch.punto_encuentro = form.punto_encuentro || null
      patch.frecuencia      = form.frecuencia
      patch.fecha_inicio    = salida.fecha_inicio
      patch.fecha_fin       = salida.fecha_fin
    } else {
      patch.fecha_inicio    = form.fecha_inicio
      patch.fecha_fin       = fecha_fin
      patch.dias_semana     = null
      patch.hora_encuentro  = null
      patch.punto_encuentro = null
      patch.frecuencia      = null
    }

    const { error } = await supabase.from('salidas').update(patch).eq('id', salida.id)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('¿Seguro que querés eliminar esta salida? Se eliminará todo el contenido generado.')) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('salidas').delete().eq('id', salida.id)
    router.push('/salidas')
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(52,209,126,0.1)', border: '1px solid rgba(52,209,126,0.3)', color: '#34D17E' }}>
          Salida actualizada correctamente
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre *">
          <input name="nombre" value={form.nombre} onChange={handleChange} required
            className={inputClass} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
        </Field>
        <Field label="Destino *">
          <input name="destino" value={form.destino} onChange={handleChange} required
            className={inputClass} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
        </Field>
        <Field label="País del destino">
          <select name="pais_codigo" value={form.pais_codigo} onChange={handleChange}
            className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
            <option value="AR">Argentina</option>
            <option value="CL">Chile</option>
            <option value="BO">Bolivia</option>
            <option value="BR">Brasil</option>
            <option value="PE">Perú</option>
            <option value="UY">Uruguay</option>
          </select>
        </Field>
        <Field label="Tipo de salida">
          <select name="tipo_viaje" value={form.tipo_viaje} onChange={handleChange}
            className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
            {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select name="estado" value={form.estado} onChange={handleChange}
            className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
            {ESTADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        {/* Fechas — solo para no-recurrentes */}
        {!isRecurrente && (
          isUnDia ? (
            <Field label="Fecha">
              <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange}
                className={inputClass + " px-3"} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
          ) : (
            <>
              <Field label="Fecha inicio">
                <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange}
                  className={inputClass + " px-3"} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
              </Field>
              <Field label="Fecha fin">
                <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange}
                  className={inputClass + " px-3"} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
              </Field>
            </>
          )
        )}

        {/* Campos exclusivos de salida recurrente */}
        {isRecurrente && (
          <>
            <div className="md:col-span-2">
              <Field label="Días de la semana">
                <div className="flex gap-2 flex-wrap">
                  {DIAS_SEMANA.map(({ value, label }) => {
                    const selected = form.dias_semana.includes(value)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleDia(value)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        style={selected
                          ? { backgroundColor: 'rgba(52,209,126,0.15)', border: '1px solid rgba(52,209,126,0.4)', color: '#34D17E' }
                          : { backgroundColor: '#0A0F0A', border: '1px solid #1E2D1E', color: '#6B8F71' }
                        }
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </Field>
            </div>
            <Field label="Hora de encuentro">
              <input type="time" name="hora_encuentro" value={form.hora_encuentro} onChange={handleChange}
                className={inputClass + " px-3"} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Frecuencia">
              <select name="frecuencia" value={form.frecuencia} onChange={handleChange}
                className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
                {FRECUENCIA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Punto de encuentro">
                <input name="punto_encuentro" value={form.punto_encuentro} onChange={handleChange}
                  placeholder="ej: Plaza Urquiza, esquina Av. Libertador"
                  className={inputClass} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
              </Field>
            </div>
          </>
        )}

        {/* Banco de Imágenes */}
        <div className="md:col-span-2">
          <div className="rounded-xl p-6 flex flex-col gap-6" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>Banco de Imágenes</h2>
            <p className="text-xs" style={{ color: '#6B8F71' }}>Vinculá la carpeta de fotos y videos de esta salida.</p>

            <FieldGroup>
              <Field label="Carpeta de Fotos">
                {fotosRootFolderId ? (
                  <FolderPicker
                    rootFolderId={fotosRootFolderId}
                    salidaId={salida.id}
                    value={form.carpeta_fotos_nombre}
                    onChange={(path) => { setForm(prev => ({ ...prev, carpeta_fotos_nombre: path })); setSuccess(false) }}
                    onFolderIdChange={(id) => { setForm(prev => ({ ...prev, carpeta_fotos_id: id })); setSuccess(false) }}
                  />
                ) : (
                  <p className="text-xs" style={{ color: '#6B8F71' }}>No hay carpeta raíz configurada para fotos.</p>
                )}
              </Field>

              <Field label="Carpeta de Videos Crudos">
                {videosRootFolderId ? (
                  <FolderPicker
                    rootFolderId={videosRootFolderId}
                    salidaId={salida.id}
                    value={form.carpeta_videos_nombre}
                    onChange={(path) => { setForm(prev => ({ ...prev, carpeta_videos_nombre: path })); setSuccess(false) }}
                    onFolderIdChange={(id) => { setForm(prev => ({ ...prev, carpeta_videos_id: id })); setSuccess(false) }}
                  />
                ) : (
                  <p className="text-xs" style={{ color: '#6B8F71' }}>No hay carpeta raíz configurada para videos.</p>
                )}
              </Field>
            </FieldGroup>
          </div>
        </div>

        {/* Precio con selector de moneda */}
        <Field label={`Precio ${form.moneda}`}>
          <div className="flex gap-2">
            <select
              name="moneda"
              value={form.moneda}
              onChange={handleChange}
              className="px-2 py-2.5 rounded-lg text-sm focus:outline-none transition-colors shrink-0 w-20"
              style={inputStyle}
              onFocus={focusStyle}
              onBlur={blurStyle}
            >
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
            <input type="number" name="precio_usd" value={form.precio_usd} onChange={handleChange}
              min="0" step="0.01"
              className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </div>
        </Field>

        <Field label={`Seña ${form.moneda}`}>
          <input type="number" name="sena_usd" value={form.sena_usd} onChange={handleChange}
            min="0" step="0.01" placeholder="Opcional"
            className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
        </Field>

        <Field label="Nivel">
          <select name="nivel" value={form.nivel} onChange={handleChange}
            className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
            {NIVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Cupos">
          <input type="number" name="cupos" value={form.cupos} onChange={handleChange}
            min="1"
            className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
        </Field>
      </div>

      <Field label="Link de inscripción">
        <input type="url" name="link_inscripcion" value={form.link_inscripcion} onChange={handleChange}
          className={inputClass} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
      </Field>

      <Field label="Notas generales del itinerario">
        <textarea name="itinerario" value={form.itinerario} onChange={handleChange} rows={4}
          className={inputClass + " px-3 resize-y"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
      </Field>

      <StructuredContentFields
        destino={form.destino}
        itinerarioDias={form.itinerario_dias}
        puntosInteres={form.puntos_interes}
        onItinerarioChange={itinerario_dias => { setForm(prev => ({ ...prev, itinerario_dias })); setSuccess(false) }}
        onPuntosInteresChange={puntos_interes => { setForm(prev => ({ ...prev, puntos_interes })); setSuccess(false) }}
        disabled={loading}
      />

      <CommercialBannerFields value={commercial} onChange={value => { setCommercial(value); setSuccess(false) }} disabled={loading} />

      <Field label="¿Qué incluye?">
        <textarea name="que_incluye" value={form.que_incluye} onChange={handleChange} rows={3}
          className={inputClass + " px-3 resize-y"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
      </Field>

      <Field label="¿Qué NO incluye?">
        <textarea name="que_no_incluye" value={form.que_no_incluye} onChange={handleChange} rows={3}
          className={inputClass + " px-3 resize-y"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
      </Field>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
          <Trash2 className="w-3.5 h-3.5" />
          Eliminar salida
        </Button>
        <Button type="submit" loading={loading} size="md">
          <Save className="w-4 h-4" />
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}
