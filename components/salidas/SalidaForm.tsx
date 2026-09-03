'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, Trash2, Info, Calendar, CreditCard, Image as ImageIcon, Map, CheckCircle2, AlertTriangle, ArrowRight, Check, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import StructuredContentFields from '@/components/salidas/StructuredContentFields'
import GroupActivityFields from '@/components/salidas/GroupActivityFields'
import CommercialBannerFields from '@/components/salidas/CommercialBannerFields'
import FolderPicker from '@/components/fotos/FolderPicker'
import SalidaCreationModal from '@/components/salidas/SalidaCreationModal'
import type { Salida, TipoViaje, DiaSemana, Frecuencia, Moneda, GrupoInfo, ActividadGrupoOutdoor, TipoOrganizacionGrupo } from '@/types'
import { SALIDA_TYPES } from '@/lib/salida-types'
import { bannerCommercialFormFromSalida, bannerCommercialPayload } from '@/lib/banner-commercial-form'
import {
  CONTENT_CONTEXT_DIMENSION_LABELS,
  CONTENT_CONTEXT_TAGS,
  resolveContentContextTags,
  type ContentContextDimension,
} from '@/lib/content-context/registry'

interface SalidaFormProps {
  salida?: Salida // Si existe, estamos en modo Edición
  fotosRootFolderId: string | null
  videosRootFolderId: string | null
}

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
  { value: 'lunes',     label: 'Lunes' },
  { value: 'martes',    label: 'Martes' },
  { value: 'miércoles', label: 'Miércoles' },
  { value: 'jueves',    label: 'Jueves' },
  { value: 'viernes',   label: 'Viernes' },
  { value: 'sábado',    label: 'Sábado' },
  { value: 'domingo',   label: 'Domingo' },
]

const FRECUENCIA_OPTIONS: { value: Frecuencia; label: string }[] = [
  { value: 'semanal',   label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual',   label: 'Mensual' },
]

const ACTIVIDAD_GRUPO_OPTIONS: { value: ActividadGrupoOutdoor; label: string }[] = [
  { value: 'trekking', label: 'Trekking' },
  { value: 'running', label: 'Running' },
  { value: 'trail_running', label: 'Trail running' },
  { value: 'ciclismo', label: 'Ciclismo' },
  { value: 'kayak', label: 'Kayak' },
  { value: 'escalada', label: 'Escalada' },
  { value: 'surf', label: 'Surf' },
  { value: 'cabalgata', label: 'Cabalgata' },
  { value: 'otra', label: 'Otra actividad outdoor' },
]

const TIPO_ORGANIZACION_OPTIONS: { value: TipoOrganizacionGrupo; label: string }[] = [
  { value: 'grupo', label: 'Grupo' },
  { value: 'academia', label: 'Academia' },
  { value: 'club', label: 'Club' },
  { value: 'escuela', label: 'Escuela' },
]

const EMPTY_GROUP_INFO: GrupoInfo = {
  tipo_organizacion: 'grupo',
  actividad: 'trekking',
  propuesta: null,
  dirigido_a: null,
  dinamica: null,
  responsables: null,
  requisitos: null,
  equipamiento: null,
}

// Componente helper para dividir visualmente las secciones
function FormSection({ title, description, icon: Icon, children }: { title: string, description?: string, icon?: React.ElementType, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pt-8 first:pt-0">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-[var(--cardon)]" />}
          <h2 className="section-title">{title}</h2>
        </div>
        {description && <p className="text-sm text-[var(--piedra)]">{description}</p>}
      </div>
      <div className="flex flex-col gap-5 p-5 sm:p-7 bg-white/70 rounded-[20px] border border-[var(--linea)] shadow-[var(--sombra-reposo)]">
        {children}
      </div>
    </div>
  )
}

export default function SalidaForm({ salida, fotosRootFolderId, videosRootFolderId }: SalidaFormProps) {
  const router = useRouter()
  const isEditing = !!salida

  const [loading, setLoading]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    nombre:           salida?.nombre || '',
    destino:          salida?.destino || '',
    pais_codigo:      salida?.pais_codigo || 'AR',
    fecha_inicio:     salida?.fecha_inicio || '',
    fecha_fin:        salida?.fecha_fin || '',
    precio_usd:       salida?.precio_usd ? String(salida.precio_usd) : '',
    sena_usd:         salida?.sena_usd ? String(salida.sena_usd) : '',
    moneda:           (salida?.moneda || 'USD') as Moneda,
    nivel:            salida?.nivel || 'media',
    cupos:            salida?.cupos ? String(salida.cupos) : '',
    link_inscripcion: salida?.link_inscripcion || '',
    tipo_viaje:       salida?.tipo_viaje || 'escapada_fin_semana',
    itinerario:       salida?.itinerario || '',
    itinerario_dias:  salida?.itinerario_dias || [],
    puntos_interes:   salida?.puntos_interes || [],
    que_incluye:      salida?.que_incluye || '',
    que_no_incluye:   salida?.que_no_incluye || '',
    estado:           salida?.estado || 'borrador',
    dias_semana:      (salida?.dias_semana || []) as DiaSemana[],
    hora_encuentro:   salida?.hora_encuentro || '',
    punto_encuentro:  salida?.punto_encuentro || '',
    frecuencia:       (salida?.frecuencia || 'semanal') as Frecuencia,
    lugares_recurrentes_text: (salida?.lugares_recurrentes || []).join('\n'),
    grupo_info:       (salida?.grupo_info || EMPTY_GROUP_INFO) as GrupoInfo,
    carpeta_fotos_id: salida?.carpeta_fotos_id || null,
    carpeta_fotos_nombre: salida?.carpeta_fotos_nombre || null,
    carpeta_videos_id: salida?.carpeta_videos_id || null,
    carpeta_videos_nombre: salida?.carpeta_videos_nombre || null,
    zona_geografica: salida?.zona_geografica || '',
    context_tags: resolveContentContextTags({
      context_tags: salida?.context_tags,
      zona_geografica: salida?.zona_geografica,
    }),
  })
  const [commercial, setCommercial] = useState(() => bannerCommercialFormFromSalida(salida))

  const [creationStatus, setCreationStatus] = useState<'idle' | 'creating' | 'success'>('idle')
  const isRecurrente = form.tipo_viaje === 'salida_recurrente'
  const isUnDia      = form.tipo_viaje === 'salida_un_dia'

  const [currentStep, setCurrentStep] = useState(0)

  const steps = isRecurrente
    ? [
        { title: 'Grupo', icon: Users },
        { title: 'Horarios', icon: Calendar },
        { title: 'Inscripción', icon: CreditCard },
        { title: 'Material', icon: ImageIcon },
        { title: 'Información', icon: Info },
        { title: 'Requisitos', icon: CheckCircle2 },
      ]
    : [
        { title: 'Información', icon: Info },
        { title: 'Fechas', icon: Calendar },
        { title: 'Comercial', icon: CreditCard },
        { title: 'Imágenes', icon: ImageIcon },
        { title: 'Itinerario', icon: Map },
        { title: 'Inclusiones', icon: CheckCircle2 },
      ]

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'tipo_viaje' && value === 'salida_un_dia') next.fecha_fin = prev.fecha_inicio
      if (name === 'fecha_inicio' && next.tipo_viaje === 'salida_un_dia') next.fecha_fin = value
      return next
    })

    // Clear error on change
    if (formErrors[name]) {
      setFormErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
    setSuccess(false)
  }

  function toggleDia(dia: DiaSemana) {
    setForm(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter(d => d !== dia)
        : [...prev.dias_semana, dia],
    }))
    if (formErrors.dias_semana) {
      setFormErrors(prev => {
        const next = { ...prev }
        delete next.dias_semana
        return next
      })
    }
    setSuccess(false)
  }

  function selectTipoViaje(tipo: TipoViaje) {
    setForm(prev => ({
      ...prev,
      tipo_viaje: tipo,
      fecha_fin: tipo === 'salida_un_dia' ? prev.fecha_inicio : prev.fecha_fin,
    }))
    setSuccess(false)
  }

  function validateStep(step: number) {
    const errors: Record<string, string> = {}
    if (step === 0) {
      if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido'
      if (!form.destino.trim()) errors.destino = 'El destino es requerido'
    } else if (step === 1) {
      if (!isRecurrente) {
        if (!form.fecha_inicio) errors.fecha_inicio = 'La fecha de inicio es requerida'
        if (!isUnDia && !form.fecha_fin) errors.fecha_fin = 'La fecha de fin es requerida'
      } else {
        if (form.dias_semana.length === 0) errors.dias_semana = 'Seleccioná al menos un día'
        if (!form.lugares_recurrentes_text.trim()) errors.lugares_recurrentes = 'Cargá al menos un lugar habitual'
        if (!form.punto_encuentro.trim()) errors.punto_encuentro = 'Cargá el punto de encuentro'
        if (!form.hora_encuentro.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.hora_encuentro.trim())) {
          errors.hora_encuentro = 'Ingresá una hora válida (HH:mm)'
        }
      }
      if (!form.cupos || isNaN(Number(form.cupos))) errors.cupos = 'Ingresá un cupo válido'
    } else if (step === 2) {
      if (!form.precio_usd || isNaN(Number(form.precio_usd))) errors.precio_usd = 'Ingresá un precio válido'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function validate() {
    const errors: Record<string, string> = {}
    if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido'
    if (!form.destino.trim()) errors.destino = 'El destino es requerido'

    if (!isRecurrente) {
      if (!form.fecha_inicio) errors.fecha_inicio = 'La fecha de inicio es requerida'
      if (!isUnDia && !form.fecha_fin) errors.fecha_fin = 'La fecha de fin es requerida'
    } else {
      if (form.dias_semana.length === 0) errors.dias_semana = 'Seleccioná al menos un día'
      if (!form.lugares_recurrentes_text.trim()) errors.lugares_recurrentes = 'Cargá al menos un lugar habitual'
      if (!form.punto_encuentro.trim()) errors.punto_encuentro = 'Cargá el punto de encuentro'
      if (!form.hora_encuentro.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.hora_encuentro.trim())) {
        errors.hora_encuentro = 'Ingresá una hora válida (HH:mm)'
      }
    }

    if (!form.precio_usd || isNaN(Number(form.precio_usd))) errors.precio_usd = 'Ingresá un precio válido'
    if (!form.cupos || isNaN(Number(form.cupos))) errors.cupos = 'Ingresá un cupo válido'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function updateHoraReunion(value: string) {
    const trimmed = value.trim()
    if (trimmed) {
      setForm(prev => ({
        ...prev,
        hora_encuentro: trimmed,
      }))
      if (formErrors.hora_encuentro) {
        setFormErrors(prev => {
          const next = { ...prev }
          delete next.hora_encuentro
          return next
        })
      }
      return
    }

    setForm(prev => ({
      ...prev,
      hora_encuentro: '',
    }))
    if (formErrors.hora_encuentro) {
      setFormErrors(prev => {
        const next = { ...prev }
        delete next.hora_encuentro
        return next
      })
    }
  }

  const recurringHoraHour = form.hora_encuentro?.slice(0, 2).padStart(2, '0') ?? ''
  const recurringHoraMinute = form.hora_encuentro?.slice(3, 5) ?? ''
  const recurringHoraOptions = Array.from({ length: 24 }, (_, idx) => idx.toString().padStart(2, '0'))
  const recurringMinuteOptions = Array.from({ length: 60 }, (_, idx) => idx.toString().padStart(2, '0'))

  function handleHoraPartChange(kind: 'hora' | 'min', value: string) {
    const hour = kind === 'hora' ? value : recurringHoraHour || '09'
    const minute = kind === 'min' ? value : recurringHoraMinute || '00'
    updateHoraReunion(`${hour}:${minute}`)
  }

  function clearFieldError(fieldName: keyof typeof formErrors) {
    if (!formErrors[fieldName]) return
    setFormErrors(prev => {
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }

  function nextStep() {
    if (validateStep(currentStep)) {
      setCurrentStep(s => Math.min(s + 1, steps.length - 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function prevStep() {
    setCurrentStep(s => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) {
      setError('Por favor, corregí los errores marcados.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setError('')
    setLoading(true)

    if (!isEditing) {
      setCreationStatus('creating')
    } else {
      setCreationStatus('creating')
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 20_000)

    try {
      const { lugares_recurrentes_text, ...rawForm } = form
      const commercialPayload = bannerCommercialPayload(commercial, {
        precioActual: Number(form.precio_usd),
      })
      const payload: Record<string, unknown> = {
        ...rawForm,
        ...commercialPayload,
        precio_usd: parseFloat(form.precio_usd),
        sena_usd: form.sena_usd ? parseFloat(form.sena_usd) : null,
        cupos: form.cupos ? parseInt(form.cupos) : null,
        link_inscripcion: form.link_inscripcion || null,
        itinerario: form.itinerario || null,
        que_incluye: form.que_incluye || null,
        que_no_incluye: form.que_no_incluye || null,
        hora_encuentro: form.hora_encuentro || null,
        punto_encuentro: form.punto_encuentro || null,
        lugares_recurrentes: lugares_recurrentes_text
          .split(/[\n,]/u)
          .map(item => item.trim())
          .filter(Boolean),
        grupo_info: isRecurrente ? form.grupo_info : null,
      }

      if (isRecurrente) {
        payload.fecha_inicio = null
        payload.fecha_fin = null
        payload.itinerario = null
        payload.itinerario_dias = []
      } else {
        payload.dias_semana = []
        payload.frecuencia = null
        payload.hora_encuentro = null
        payload.punto_encuentro = null
        payload.lugares_recurrentes = []
        payload.grupo_info = null
      }

      const url = isEditing ? `/api/salidas/${salida.id}` : '/api/salidas'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      const responseText = await res.text()
      const json = responseText ? JSON.parse(responseText) : {}
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar')
      }

      setSuccess(true)
      setCreationStatus('success')
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push('/salidas')
      router.refresh()
    } catch (saveError) {
      setCreationStatus('idle')
      const message = saveError instanceof DOMException && saveError.name === 'AbortError'
        ? 'La actualización tardó demasiado. Revisá tu conexión e intentá nuevamente.'
        : saveError instanceof Error
          ? saveError.message
          : 'Error de red. Intentá de nuevo.'
      setError(message)
    } finally {
      window.clearTimeout(timeout)
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!isEditing) return
    const txt = prompt('Escribí "ELIMINAR" para confirmar que querés borrar esta salida:')
    if (txt !== 'ELIMINAR') return

    setDeleting(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: err } = await supabase.from('salidas').delete().eq('id', salida.id)
      if (err) throw err
      router.push('/salidas')
    } catch (cause: unknown) {
      setError(`Error al eliminar: ${cause instanceof Error ? cause.message : String(cause)}`)
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full pb-20">
      {error && (
        <div className="px-5 py-4 rounded-xl text-sm flex items-start gap-3 font-medium bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-[rgba(62,92,72,.25)] bg-[var(--cardon-tenue)] px-5 py-4 text-sm font-semibold text-[var(--cardon)]" role="status">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Los cambios se guardaron correctamente.
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-6">

        {/* Stepper Progress */}
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isCompleted = currentStep > index || (isEditing && true)
            const isCurrent = currentStep === index
            const isClickable = isEditing || isCompleted

            return (
              <div
                key={index}
                className={`flex flex-col items-center gap-2 flex-1 relative ${isClickable ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (isClickable) setCurrentStep(index)
                }}
              >
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    className="absolute top-4 left-[50%] w-full h-[2px]"
                    style={{ backgroundColor: isCompleted && !isEditing ? 'var(--cardon)' : 'var(--linea)', zIndex: 0 }}
                  />
                )}

                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors`}
                  style={{
                    backgroundColor: isCurrent ? 'var(--nieve)' : (isCompleted ? 'var(--cardon-tenue)' : 'var(--nieve)'),
                    borderColor: isCurrent ? 'var(--cardon)' : (isCompleted ? 'var(--cardon)' : 'var(--linea)'),
                    color: isCurrent || isCompleted ? 'var(--cardon)' : 'var(--piedra)'
                  }}
                >
                  {isCompleted && !isCurrent && !isEditing ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-xs font-semibold text-center ${isCurrent ? 'text-[var(--tinta)]' : 'text-[var(--piedra)]'}`}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        {currentStep === 0 && (
          <FormSection
            title={isRecurrente ? 'Grupo o academia outdoor' : 'Información principal'}
            icon={isRecurrente ? Users : Info}
            description={isRecurrente ? 'Configurá esta unidad una sola vez. Después Between reutiliza sus datos para cada semana.' : undefined}
          >
          <Input
            label={isRecurrente ? 'Nombre del grupo o academia' : 'Nombre de la salida'}
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder={isRecurrente ? 'Ej: Caminantes Montaña' : 'Ej: Fitz Roy Express'}
            error={formErrors.nombre}
          />

          {isRecurrente && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Select
                label="Tipo de organización"
                name="tipo_organizacion"
                value={form.grupo_info.tipo_organizacion ?? 'grupo'}
                onChange={event => setForm(prev => ({
                  ...prev,
                  grupo_info: { ...prev.grupo_info, tipo_organizacion: event.target.value as TipoOrganizacionGrupo },
                }))}
                options={TIPO_ORGANIZACION_OPTIONS}
              />
              <Select
                label="Actividad principal"
                name="actividad_grupo"
                value={form.grupo_info.actividad ?? 'trekking'}
                onChange={event => setForm(prev => ({
                  ...prev,
                  grupo_info: { ...prev.grupo_info, actividad: event.target.value as ActividadGrupoOutdoor },
                }))}
                options={ACTIVIDAD_GRUPO_OPTIONS}
              />
            </div>
          )}

          <Input
            label={isRecurrente ? 'Ciudad o zona base' : 'Destino'}
            name="destino"
            value={form.destino}
            onChange={handleChange}
            placeholder={isRecurrente ? 'Ej: Yerba Buena, Tucumán' : 'Ej: El Chaltén, Santa Cruz'}
            error={formErrors.destino}
            hint={isRecurrente ? 'Solo indica dónde opera el grupo. No se usa como punto de encuentro.' : 'Provincia, región o ciudad.'}
          />

          <Select
            label="País del destino"
            name="pais_codigo"
            value={form.pais_codigo}
            onChange={handleChange}
            options={[
              { value: 'AR', label: 'Argentina' },
              { value: 'CL', label: 'Chile' },
              { value: 'BO', label: 'Bolivia' },
              { value: 'BR', label: 'Brasil' },
              { value: 'PE', label: 'Perú' },
              { value: 'UY', label: 'Uruguay' },
              { value: 'MX', label: 'México' },
              { value: 'DO', label: 'República Dominicana' },
              { value: 'CO', label: 'Colombia' },
              { value: 'CR', label: 'Costa Rica' },
            ]}
          />

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium text-[var(--tinta)]">Tipo de salida</legend>
            <p className="-mt-2 text-xs text-[var(--piedra)]">
              Esto define la frecuencia, los datos que pedimos y el enfoque del contenido.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SALIDA_TYPES.map(type => {
                const selected = form.tipo_viaje === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => selectTipoViaje(type.value)}
                    aria-pressed={selected}
                    className="rounded-2xl border p-4 text-left transition-all"
                    style={selected
                      ? { borderColor: 'var(--cardon)', backgroundColor: 'var(--cardon-tenue)', boxShadow: '0 0 0 1px var(--cardon)' }
                      : { borderColor: 'var(--linea)', backgroundColor: 'var(--nieve)' }}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--tinta)]">{type.label}</span>
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                        style={{ borderColor: selected ? 'var(--cardon)' : 'var(--linea)', backgroundColor: selected ? 'var(--cardon)' : 'transparent' }}
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </span>
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-[var(--piedra)]">{type.description}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Select
            label="Estado"
            name="estado"
            value={form.estado}
            onChange={handleChange}
            options={ESTADO_OPTIONS}
          />
        </FormSection>

        )}

        {currentStep === 1 && (
          <FormSection
            title={isRecurrente ? 'Funcionamiento semanal' : 'Fechas y cupos'}
            icon={Calendar}
            description={isRecurrente ? 'Definí dónde se juntan, qué días funciona y cuántas personas puede recibir.' : undefined}
          >
            {/* Fechas — solo para no-recurrentes */}
          {!isRecurrente && (
            isUnDia ? (
              <Input
                type="date"
                label="Fecha de la salida"
                name="fecha_inicio"
                value={form.fecha_inicio}
                onChange={handleChange}
                error={formErrors.fecha_inicio}
                style={{ colorScheme: 'light' }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  type="date"
                  label="Fecha inicio"
                  name="fecha_inicio"
                  value={form.fecha_inicio}
                  onChange={handleChange}
                  error={formErrors.fecha_inicio}
                  style={{ colorScheme: 'light' }}
                />
                <Input
                  type="date"
                  label="Fecha fin"
                  name="fecha_fin"
                  value={form.fecha_fin}
                  onChange={handleChange}
                  error={formErrors.fecha_fin}
                  style={{ colorScheme: 'light' }}
                />
              </div>
            )
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select
              label={isRecurrente ? 'Nivel habitual del grupo' : 'Nivel de dificultad'}
              name="nivel"
              value={form.nivel}
              onChange={handleChange}
              options={NIVEL_OPTIONS}
            />
            <Input
              type="number"
              label={isRecurrente ? 'Capacidad por encuentro' : 'Cupos'}
              name="cupos"
              value={form.cupos}
              onChange={handleChange}
              error={formErrors.cupos}
              placeholder="Ej: 12"
              min="1"
            />
          </div>

          {/* Campos exclusivos de salida recurrente */}
          {isRecurrente && (
            <div className="mt-2 flex flex-col gap-6 bg-[var(--blanco-piedra)] p-5 rounded-xl border border-[var(--linea)]">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--tinta)]">Punto de encuentro semanal</label>
                <Input
                  name="punto_encuentro"
                  value={form.punto_encuentro}
                  onChange={handleChange}
                  placeholder="ej: Plaza Urquiza, esquina Av. Libertador"
                  error={formErrors.punto_encuentro}
                  hint="Este lugar es donde se juntan, NO el destino de la salida."
                />

                <p className="text-xs text-[var(--piedra)]">
                  Escribí acá el lugar fijo de encuentro del grupo, y la oferta recurrente se arma alrededor de ahí.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[var(--tinta)]">Hora de encuentro</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Hora"
                    name="hora_encuentro_hh"
                    value={recurringHoraHour || recurringHoraOptions[0]}
                    onChange={(event) => {
                      handleHoraPartChange('hora', event.target.value)
                      clearFieldError('hora_encuentro')
                    }}
                    options={recurringHoraOptions.map(option => ({ value: option, label: option }))}
                  />
                  <Select
                    label="Minutos"
                    name="hora_encuentro_mm"
                    value={recurringHoraMinute || recurringMinuteOptions[0]}
                    onChange={(event) => {
                      handleHoraPartChange('min', event.target.value)
                      clearFieldError('hora_encuentro')
                    }}
                    options={recurringMinuteOptions.map(option => ({ value: option, label: option }))}
                  />
                </div>
                <p className="text-xs text-[var(--piedra)]">Formato final: HH:MM.</p>
                {formErrors.hora_encuentro && <p className="text-xs text-red-400">{formErrors.hora_encuentro}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Select
                  label="Frecuencia"
                  name="frecuencia"
                  value={form.frecuencia}
                  onChange={handleChange}
                  options={FRECUENCIA_OPTIONS}
                />
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[var(--tinta)]">Días de la semana</label>
                  <div className="flex gap-2 flex-wrap">
                    {DIAS_SEMANA.map(({ value, label }) => {
                      const selected = form.dias_semana.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleDia(value)}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={selected
                            ? { backgroundColor: 'var(--cardon-tenue)', border: '1px solid var(--cardon)', color: 'var(--cardon)' }
                            : { backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--piedra)' }
                          }
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  {formErrors.dias_semana && <p className="text-xs text-red-400 mt-1">{formErrors.dias_semana}</p>}
                </div>
              </div>

              <Input
                label="Punto de encuentro (opcional)"
                name="punto_encuentro"
                value={form.punto_encuentro}
                onChange={handleChange}
                placeholder="ej: Plaza principal, acceso al parque"
              />
              <p className="-mt-4 text-xs text-[var(--piedra)]">Dejalo vacío si el grupo se encuentra en distintos lugares. Between no inventará uno.</p>

              <div className="flex flex-col gap-2">
                <label htmlFor="lugares_recurrentes_text" className="text-sm font-medium text-[var(--tinta)]">
                  Lugares habituales de las salidas
                </label>
                <textarea
                  id="lugares_recurrentes_text"
                  name="lugares_recurrentes_text"
                  value={form.lugares_recurrentes_text}
                  onChange={(e) => {
                    handleChange(e)
                    clearFieldError('lugares_recurrentes')
                  }}
                  rows={3}
                  placeholder={'Cascada del Río Noque\nSendero de las Yungas'}
                  className="w-full resize-y rounded-xl border bg-[var(--nieve)] px-4 py-3 text-sm text-[var(--tinta)] outline-none transition-colors focus:border-[var(--cardon)]"
                  style={{ borderColor: formErrors.lugares_recurrentes ? 'rgb(248 113 113)' : 'var(--linea)' }}
                />
                <p className="text-xs text-[var(--piedra)]">Escribí un lugar por línea. Son referencias para variar salidas, no el punto de encuentro.</p>
                {formErrors.lugares_recurrentes && <p className="text-xs text-red-400">{formErrors.lugares_recurrentes}</p>}
              </div>
            </div>
          )}
          </FormSection>
        )}

        {currentStep === 2 && (
          <FormSection
            title={isRecurrente ? 'Precio e inscripción' : 'Precio y reserva'}
            icon={CreditCard}
            description={isRecurrente ? 'Cargá el valor habitual por encuentro o membresía. No se mostrará como precio de un viaje.' : undefined}
          >
          <div className="flex flex-col sm:flex-row gap-5">
            <Input
              type="number"
              label={isRecurrente ? 'Precio habitual' : 'Precio final'}
              name="precio_usd"
              value={form.precio_usd}
              onChange={handleChange}
              error={formErrors.precio_usd}
              min="0"
              step="0.01"
              placeholder="350"
              prefix={
                <select
                  name="moneda"
                  value={form.moneda}
                  onChange={handleChange}
                  className="bg-transparent text-sm text-[var(--tinta)] font-medium outline-none px-3 cursor-pointer h-full"
                >
                  <option value="USD" className="bg-[var(--nieve)] text-[var(--tinta)]">USD</option>
                  <option value="ARS" className="bg-[var(--nieve)] text-[var(--tinta)]">ARS</option>
                </select>
              }
            />

            <Input
              type="number"
              label={isRecurrente ? 'Inscripción inicial (opcional)' : 'Seña requerida (opcional)'}
              name="sena_usd"
              value={form.sena_usd}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="100"
              prefix={<span className="px-3 text-sm font-medium text-[var(--piedra)] h-full flex items-center">{form.moneda}</span>}
              hint={isRecurrente ? 'Solo si el grupo cobra una inscripción separada.' : 'Monto anticipado para reservar cupo.'}
            />
          </div>

          <Input
            type="url"
            label="Link de inscripción (opcional)"
            name="link_inscripcion"
            value={form.link_inscripcion}
            onChange={handleChange}
            placeholder="https://wa.me/..."
            hint="Si se deja vacío, se usará el botón estándar que redirige al WhatsApp general."
          />

          {!isRecurrente && (
            <CommercialBannerFields value={commercial} onChange={setCommercial} disabled={loading} />
          )}
        </FormSection>

        )}

        {currentStep === 3 && (
          <FormSection
            title={isRecurrente ? 'Material del grupo' : 'Material del viaje'}
            icon={ImageIcon}
            description={isRecurrente ? 'Elegí el material orgánico real que mejor representa al grupo.' : 'Elegí un destino completo o una escena específica. Between usará exactamente la misma selección para escribir y renderizar.'}
          >
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-[var(--tinta)]">Colección de fotos</label>
            {fotosRootFolderId ? (
              <FolderPicker
                rootFolderId={fotosRootFolderId}
                mediaType="photos"
                value={form.carpeta_fotos_nombre}
                onChange={(path) => setForm(prev => ({ ...prev, carpeta_fotos_nombre: path }))}
                onFolderIdChange={(id) => setForm(prev => ({ ...prev, carpeta_fotos_id: id }))}
              />
            ) : (
              <p className="text-xs text-[var(--piedra)] py-2">Tu biblioteca de fotos todavía no está disponible.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-[var(--tinta)]">Colección de videos</label>
            {videosRootFolderId ? (
              <FolderPicker
                rootFolderId={videosRootFolderId}
                mediaType="videos"
                value={form.carpeta_videos_nombre}
                onChange={(path) => setForm(prev => ({ ...prev, carpeta_videos_nombre: path }))}
                onFolderIdChange={(id) => setForm(prev => ({ ...prev, carpeta_videos_id: id }))}
              />
            ) : (
              <p className="text-xs text-[var(--piedra)] py-2">Tu biblioteca de videos todavía no está disponible.</p>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--tinta)]">Contexto del viaje</p>
              <p className="mt-1 text-xs text-[var(--piedra)]">Combiná entorno, clima, actividad y experiencia. Las mismas etiquetas guían el copy, la música y la dirección visual.</p>
            </div>
            {(['entorno', 'clima', 'actividad', 'experiencia'] as ContentContextDimension[]).map(dimension => (
              <div key={dimension}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.08em] text-[var(--piedra)]">{CONTENT_CONTEXT_DIMENSION_LABELS[dimension]}</p>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_CONTEXT_TAGS.filter(tag => tag.dimension === dimension).map(tag => {
                    const selected = form.context_tags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setForm(current => ({
                          ...current,
                          context_tags: selected
                            ? current.context_tags.filter(id => id !== tag.id)
                            : [...current.context_tags, tag.id],
                        }))}
                        className="rounded-full border px-3 py-1.5 text-xs transition-colors"
                        style={{
                          color: selected ? 'var(--nieve)' : 'var(--piedra)',
                          background: selected ? 'var(--cardon)' : 'var(--blanco-piedra)',
                          borderColor: selected ? 'var(--cardon)' : 'var(--linea)',
                        }}
                      >
                        {tag.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </FormSection>

        )}

        {currentStep === 4 && (
          <FormSection
            title={isRecurrente ? 'Información del grupo' : 'Itinerario y lugares'}
            icon={isRecurrente ? Users : Map}
            description={isRecurrente ? 'No necesita itinerario: describí cómo funciona el grupo y Between investiga los lugares cargados.' : 'Cuanto más concreto sea el recorrido, mejor será el contenido.'}
          >
          {isRecurrente ? (
            <GroupActivityFields
              destino={form.destino}
              lugaresText={form.lugares_recurrentes_text}
              grupoInfo={form.grupo_info}
              puntosInteres={form.puntos_interes}
              onGrupoInfoChange={grupo_info => setForm(prev => ({ ...prev, grupo_info }))}
              onPuntosInteresChange={puntos_interes => setForm(prev => ({ ...prev, puntos_interes }))}
              disabled={loading}
            />
          ) : (
            <StructuredContentFields
              destino={form.destino}
              itinerarioDias={form.itinerario_dias}
              puntosInteres={form.puntos_interes}
              onItinerarioChange={itinerario_dias => setForm(prev => ({ ...prev, itinerario_dias }))}
              onPuntosInteresChange={puntos_interes => setForm(prev => ({ ...prev, puntos_interes }))}
              disabled={loading}
            />
          )}
          </FormSection>
        )}

        {currentStep === 5 && (
          <FormSection
            title={isRecurrente ? 'Qué necesita una persona para sumarse' : 'Inclusiones'}
            icon={CheckCircle2}
            description={isRecurrente ? 'Estos datos sirven para responder objeciones y generar contenido informativo del grupo.' : 'Detallá qué está incluido en la tarifa y qué no.'}
          >
          {isRecurrente ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--tinta)]">
                Requisitos para sumarse
                <textarea
                  value={form.grupo_info.requisitos ?? ''}
                  onChange={event => setForm(prev => ({
                    ...prev,
                    grupo_info: { ...prev.grupo_info, requisitos: event.target.value.trimStart() || null },
                  }))}
                  rows={5}
                  placeholder="Ej: No necesitás experiencia previa. Consultanos el nivel antes de cada encuentro."
                  className="w-full resize-y rounded-lg border border-[var(--linea)] bg-[var(--nieve)] px-3 py-2.5 text-sm font-normal text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:border-[var(--cardon)] focus:outline-none focus:ring-1 focus:ring-[var(--cardon)]"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--tinta)]">
                Equipo o elementos necesarios
                <textarea
                  value={form.grupo_info.equipamiento ?? ''}
                  onChange={event => setForm(prev => ({
                    ...prev,
                    grupo_info: { ...prev.grupo_info, equipamiento: event.target.value.trimStart() || null },
                  }))}
                  rows={5}
                  placeholder="Ej: Calzado cómodo, agua, gorra y mochila chica."
                  className="w-full resize-y rounded-lg border border-[var(--linea)] bg-[var(--nieve)] px-3 py-2.5 text-sm font-normal text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:border-[var(--cardon)] focus:outline-none focus:ring-1 focus:ring-[var(--cardon)]"
                />
              </label>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-[var(--tinta)]">¿Qué incluye?</label>
                <textarea
                  name="que_incluye"
                  value={form.que_incluye}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Transporte, alojamiento, guía certificado, equipamiento..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--nieve)] border border-[var(--linea)] text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:ring-1 focus:ring-[var(--cardon)] focus:border-[var(--cardon)] transition-colors resize-y shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-medium text-[var(--tinta)]">¿Qué NO incluye?</label>
                <textarea
                  name="que_no_incluye"
                  value={form.que_no_incluye}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Vuelos, comidas, seguro de vida..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--nieve)] border border-[var(--linea)] text-[var(--tinta)] placeholder:text-[var(--piedra)] focus:outline-none focus:ring-1 focus:ring-[var(--cardon)] focus:border-[var(--cardon)] transition-colors resize-y shadow-sm"
                />
              </div>
            </>
          )}
          </FormSection>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-[var(--linea)]">
          {isEditing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Eliminando...' : 'Eliminar Salida'}
            </button>
          ) : (
            <div className="w-full sm:w-auto text-sm font-semibold text-[var(--piedra)] hidden sm:block">
              Paso {currentStep + 1} de {steps.length}
            </div>
          )}

          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            {currentStep > 0 && !isEditing && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold bg-[var(--nieve)] border border-[var(--linea)] text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] transition-colors"
              >
                Anterior
              </button>
            )}

            {isEditing && (
              <Link
                href="/salidas"
                className="flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold bg-[var(--nieve)] border border-[var(--linea)] text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] transition-colors"
              >
                Cancelar
              </Link>
            )}

            {currentStep < steps.length - 1 && !isEditing ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold bg-[var(--cardon)] text-[var(--nieve)] hover:bg-[var(--cardon)]/90 transition-colors shadow-sm"
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold bg-[var(--cardon)] text-[var(--nieve)] hover:bg-[var(--cardon)]/90 transition-colors shadow-[0_4px_14px_rgba(62,92,72,0.25)] hover:-translate-y-0.5"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Salida')}
              </button>
            )}
          </div>
        </div>
      </form>

      <SalidaCreationModal status={creationStatus} isEditing={isEditing} />
    </div>
  )
}
