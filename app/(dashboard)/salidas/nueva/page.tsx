'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import Button from '@/components/ui/Button'
import StructuredContentFields from '@/components/salidas/StructuredContentFields'
import CommercialBannerFields from '@/components/salidas/CommercialBannerFields'
import {bannerCommercialFormFromSalida, bannerCommercialPayload} from '@/lib/banner-commercial-form'
import type { TipoViaje, NivelDificultad, DiaItinerario, PuntoInteres } from '@/types'

interface FormData {
  nombre: string
  destino: string
  pais_codigo: string
  fecha_inicio: string
  fecha_fin: string
  precio_usd: string
  sena_usd: string
  nivel: NivelDificultad
  cupos: string
  link_inscripcion: string
  tipo_viaje: TipoViaje
  itinerario: string
  itinerario_dias: DiaItinerario[]
  puntos_interes: PuntoInteres[]
  que_incluye: string
  que_no_incluye: string
  estado: 'borrador' | 'activa' | 'completada'
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

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: '#F0FFF4' }}>{label}</label>
      {children}
    </div>
  )
}

export default function NuevaSalidaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [commercial, setCommercial] = useState(bannerCommercialFormFromSalida)
  const [form, setForm] = useState<FormData>({
    nombre: '',
    destino: '',
    pais_codigo: 'AR',
    fecha_inicio: '',
    fecha_fin: '',
    precio_usd: '',
    sena_usd: '',
    nivel: 'media',
    cupos: '',
    link_inscripcion: '',
    tipo_viaje: 'escapada_fin_semana',
    itinerario: '',
    itinerario_dias: [],
    puntos_interes: [],
    que_incluye: '',
    que_no_incluye: '',
    estado: 'borrador',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: value }
      // Salida de un día: mantener fecha_fin sincronizado con fecha_inicio en todo momento
      if (name === 'tipo_viaje' && value === 'salida_un_dia') next.fecha_fin = prev.fecha_inicio
      if (name === 'fecha_inicio' && next.tipo_viaje === 'salida_un_dia') next.fecha_fin = value
      return next
    })
  }

  function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#34D17E'
  }
  function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#1E2D1E'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const fecha_fin = form.tipo_viaje === 'salida_un_dia' ? form.fecha_inicio : form.fecha_fin

      const commercialPayload = bannerCommercialPayload(commercial)
      const res = await fetch('/api/salidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          destino: form.destino,
          pais_codigo: form.pais_codigo,
          fecha_inicio: form.fecha_inicio,
          fecha_fin,
          precio_usd: parseFloat(form.precio_usd),
          sena_usd: form.sena_usd ? parseFloat(form.sena_usd) : null,
          nivel: form.nivel,
          cupos: parseInt(form.cupos),
          link_inscripcion: form.link_inscripcion || null,
          tipo_viaje: form.tipo_viaje,
          itinerario: form.itinerario || null,
          itinerario_dias: form.itinerario_dias,
          puntos_interes: form.puntos_interes,
          que_incluye: form.que_incluye || null,
          que_no_incluye: form.que_no_incluye || null,
          estado: form.estado,
          ...commercialPayload,
        }),
      })

      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error al guardar'); setLoading(false); return }

      router.push(`/salidas/${json.data.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error de red. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/salidas"
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#6B8F71' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#F0FFF4' }}>Nueva salida</h1>
          <p className="text-sm" style={{ color: '#6B8F71' }}>Completá los datos de la salida</p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Información básica */}
        <div className="rounded-xl p-6 flex flex-col gap-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>Información básica</h2>

          <Field label="Nombre de la salida *">
            <input name="nombre" value={form.nombre} onChange={handleChange} required
              placeholder="Ej: Trekking Aconcagua Base Camp"
              className={inputClass} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>

          <Field label="Destino *">
            <input name="destino" value={form.destino} onChange={handleChange} required
              placeholder="Ej: Mendoza, Argentina"
              className={inputClass} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>

          <Field label="País del destino *">
            <select name="pais_codigo" value={form.pais_codigo} onChange={handleChange} className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
              <option value="AR">Argentina</option>
              <option value="CL">Chile</option>
              <option value="BO">Bolivia</option>
              <option value="BR">Brasil</option>
              <option value="PE">Perú</option>
              <option value="UY">Uruguay</option>
            </select>
          </Field>

          <FieldGroup>
            <Field label="Tipo de viaje *">
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
          </FieldGroup>
        </div>

        {/* Fechas y capacidad */}
        <div className="rounded-xl p-6 flex flex-col gap-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>Fechas y capacidad</h2>

          {form.tipo_viaje === 'salida_un_dia' ? (
            <Field label="Fecha *">
              <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} required
                className={inputClass + " px-3"} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
          ) : (
            <FieldGroup>
              <Field label="Fecha de inicio *">
                <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} required
                  className={inputClass + " px-3"} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
              </Field>
              <Field label="Fecha de fin *">
                <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} required
                  className={inputClass + " px-3"} style={{ ...inputStyle, colorScheme: 'dark' }} onFocus={focusStyle} onBlur={blurStyle} />
              </Field>
            </FieldGroup>
          )}

          <FieldGroup>
            <Field label="Cupos *">
              <input type="number" name="cupos" value={form.cupos} onChange={handleChange} required
                min="1" placeholder="12"
                className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Nivel de dificultad *">
              <select name="nivel" value={form.nivel} onChange={handleChange}
                className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}>
                {NIVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </FieldGroup>
        </div>

        {/* Precios */}
        <div className="rounded-xl p-6 flex flex-col gap-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>Precios</h2>

          <FieldGroup>
            <Field label="Precio USD *">
              <input type="number" name="precio_usd" value={form.precio_usd} onChange={handleChange} required
                min="0" step="0.01" placeholder="350"
                className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
            <Field label="Seña USD (opcional)">
              <input type="number" name="sena_usd" value={form.sena_usd} onChange={handleChange}
                min="0" step="0.01" placeholder="100"
                className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </Field>
          </FieldGroup>

          <Field label="Link de inscripción (opcional)">
            <input type="url" name="link_inscripcion" value={form.link_inscripcion} onChange={handleChange}
              placeholder="https://wa.me/..."
              className={inputClass + " px-3"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>
        </div>

        {/* Descripción */}
        <div className="rounded-xl p-6 flex flex-col gap-4" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>Descripción (para la IA)</h2>
          <p className="text-xs" style={{ color: '#6B8F71' }}>Cuanto más detallado, mejor será el contenido generado</p>

          <Field label="Notas generales del itinerario (opcional)">
            <textarea name="itinerario" value={form.itinerario} onChange={handleChange} rows={4}
              placeholder="Información adicional que no corresponda a un día puntual"
              className={inputClass + " px-3 resize-y"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>

          <Field label="¿Qué incluye?">
            <textarea name="que_incluye" value={form.que_incluye} onChange={handleChange} rows={3}
              placeholder="Transporte, alojamiento, guía certificado, equipamiento..."
              className={inputClass + " px-3 resize-y"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>

          <Field label="¿Qué NO incluye?">
            <textarea name="que_no_incluye" value={form.que_no_incluye} onChange={handleChange} rows={3}
              placeholder="Vuelos, comidas, seguro de vida..."
              className={inputClass + " px-3 resize-y"} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
          </Field>
        </div>

        <StructuredContentFields
          destino={form.destino}
          itinerarioDias={form.itinerario_dias}
          puntosInteres={form.puntos_interes}
          onItinerarioChange={itinerario_dias => setForm(prev => ({ ...prev, itinerario_dias }))}
          onPuntosInteresChange={puntos_interes => setForm(prev => ({ ...prev, puntos_interes }))}
          disabled={loading}
        />

        <CommercialBannerFields value={commercial} onChange={setCommercial} disabled={loading} />

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/salidas"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#6B8F71' }}
          >
            Cancelar
          </Link>
          <Button type="submit" loading={loading} size="md">
            <Save className="w-4 h-4" />
            Guardar salida
          </Button>
        </div>
      </form>
    </div>
  )
}
