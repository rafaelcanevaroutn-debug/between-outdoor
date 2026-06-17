'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import type { Salida, TipoViaje, NivelDificultad } from '@/types'

interface SalidaEditFormProps {
  salida: Salida
}

const TIPO_OPTIONS = [
  { value: 'expedicion_premium', label: 'Expedición Premium' },
  { value: 'escapada_fin_semana', label: 'Escapada Fin de Semana' },
  { value: 'salida_un_dia', label: 'Salida de un Día' },
]

const NIVEL_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
]

const ESTADO_OPTIONS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'activa', label: 'Activa' },
  { value: 'completada', label: 'Completada' },
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

export default function SalidaEditForm({ salida }: SalidaEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    nombre: salida.nombre,
    destino: salida.destino,
    fecha_inicio: salida.fecha_inicio,
    fecha_fin: salida.fecha_fin,
    precio_usd: String(salida.precio_usd),
    sena_usd: salida.sena_usd ? String(salida.sena_usd) : '',
    nivel: salida.nivel,
    cupos: String(salida.cupos),
    link_inscripcion: salida.link_inscripcion || '',
    tipo_viaje: salida.tipo_viaje,
    itinerario: salida.itinerario || '',
    que_incluye: salida.que_incluye || '',
    que_no_incluye: salida.que_no_incluye || '',
    estado: salida.estado,
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
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
    const { error } = await supabase
      .from('salidas')
      .update({
        nombre: form.nombre,
        destino: form.destino,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        precio_usd: parseFloat(form.precio_usd),
        sena_usd: form.sena_usd ? parseFloat(form.sena_usd) : null,
        nivel: form.nivel as NivelDificultad,
        cupos: parseInt(form.cupos),
        link_inscripcion: form.link_inscripcion || null,
        tipo_viaje: form.tipo_viaje as TipoViaje,
        itinerario: form.itinerario || null,
        que_incluye: form.que_incluye || null,
        que_no_incluye: form.que_no_incluye || null,
        estado: form.estado as Salida['estado'],
        updated_at: new Date().toISOString(),
      })
      .eq('id', salida.id)

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
        <Field label="Tipo de viaje">
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
        <Field label="Fecha inicio">
          <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange}
            className={inputClass + " px-3"} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
        </Field>
        <Field label="Fecha fin">
          <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange}
            className={inputClass + " px-3"} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
        </Field>
        <Field label="Precio USD">
          <input type="number" name="precio_usd" value={form.precio_usd} onChange={handleChange}
            min="0" step="0.01"
            className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
        </Field>
        <Field label="Seña USD">
          <input type="number" name="sena_usd" value={form.sena_usd} onChange={handleChange}
            min="0" step="0.01"
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

      <Field label="Itinerario">
        <textarea name="itinerario" value={form.itinerario} onChange={handleChange} rows={4}
          className={inputClass + " px-3 resize-y"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
      </Field>

      <Field label="¿Qué incluye?">
        <textarea name="que_incluye" value={form.que_incluye} onChange={handleChange} rows={3}
          className={inputClass + " px-3 resize-y"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
      </Field>

      <Field label="¿Qué NO incluye?">
        <textarea name="que_no_incluye" value={form.que_no_incluye} onChange={handleChange} rows={3}
          className={inputClass + " px-3 resize-y"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
      </Field>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="danger"
          size="sm"
          loading={deleting}
          onClick={handleDelete}
        >
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
