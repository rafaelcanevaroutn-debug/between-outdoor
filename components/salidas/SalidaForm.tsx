'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, Info, Calendar, CreditCard, Image as ImageIcon, Map, CheckCircle2, AlertTriangle, ArrowRight, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import StructuredContentFields from '@/components/salidas/StructuredContentFields'
import FolderPicker from '@/components/fotos/FolderPicker'
import type { Salida, TipoViaje, NivelDificultad, DiaSemana, Frecuencia, Moneda } from '@/types'

interface SalidaFormProps {
  salida?: Salida // Si existe, estamos en modo Edición
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

// Componente helper para dividir visualmente las secciones
function FormSection({ title, description, icon: Icon, children }: { title: string, description?: string, icon?: React.ElementType, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pt-8 first:pt-0">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-[#34D17E]" />}
          <h2 className="text-lg font-bold text-[#F0FFF4] tracking-tight">{title}</h2>
        </div>
        {description && <p className="text-sm text-[#6B8F71]">{description}</p>}
      </div>
      <div className="flex flex-col gap-5 p-5 sm:p-7 bg-[#111A11] rounded-2xl border border-[#1E2D1E]">
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
    carpeta_fotos_id: salida?.carpeta_fotos_id || null,
    carpeta_fotos_nombre: salida?.carpeta_fotos_nombre || null,
    carpeta_videos_id: salida?.carpeta_videos_id || null,
    carpeta_videos_nombre: salida?.carpeta_videos_nombre || null,
  })

  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { title: 'Información', icon: Info },
    { title: 'Fechas', icon: Calendar },
    { title: 'Comercial', icon: CreditCard },
    { title: 'Imágenes', icon: ImageIcon },
    { title: 'Itinerario', icon: Map },
    { title: 'Inclusiones', icon: CheckCircle2 },
  ]

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
    }

    if (!form.precio_usd || isNaN(Number(form.precio_usd))) errors.precio_usd = 'Ingresá un precio válido'
    if (!form.cupos || isNaN(Number(form.cupos))) errors.cupos = 'Ingresá un cupo válido'
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
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

    try {
      const payload = {
        ...form,
        precio_usd: parseFloat(form.precio_usd),
        sena_usd: form.sena_usd ? parseFloat(form.sena_usd) : null,
        cupos: form.cupos ? parseInt(form.cupos) : null,
        link_inscripcion: form.link_inscripcion || null,
        itinerario: form.itinerario || null,
        que_incluye: form.que_incluye || null,
        que_no_incluye: form.que_no_incluye || null,
        hora_encuentro: form.hora_encuentro || null,
        punto_encuentro: form.punto_encuentro || null,
      }

      if (isRecurrente) {
        payload.fecha_inicio = null as any
        payload.fecha_fin = null as any
      } else {
        payload.dias_semana = []
        payload.frecuencia = null as any
        payload.hora_encuentro = null
        payload.punto_encuentro = null
      }

      const url = isEditing ? `/api/salidas/${salida.id}` : '/api/salidas'
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) { 
        setError(json.error || 'Error al guardar')
        setLoading(false)
        return 
      }

      setSuccess(true)
      router.push(`/salidas/${json.data.id || salida?.id}`)
    } catch {
      setError('Error de red. Intentá de nuevo.')
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
    } catch (cause: any) {
      setError('Error al eliminar: ' + cause.message)
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
                    style={{ backgroundColor: isCompleted && !isEditing ? '#34D17E' : '#1E2D1E', zIndex: 0 }}
                  />
                )}
                
                <div 
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors`}
                  style={{ 
                    backgroundColor: isCurrent ? '#0A0F0A' : (isCompleted ? 'rgba(52,209,126,0.1)' : '#111A11'),
                    borderColor: isCurrent ? '#34D17E' : (isCompleted ? '#34D17E' : '#1E2D1E'),
                    color: isCurrent || isCompleted ? '#34D17E' : '#6B8F71'
                  }}
                >
                  {isCompleted && !isCurrent && !isEditing ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-xs font-semibold text-center ${isCurrent ? 'text-[#F0FFF4]' : 'text-[#6B8F71]'}`}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        {currentStep === 0 && (
          <FormSection title="Información Principal" icon={Info}>
          <Input 
            label="Nombre de la salida" 
            name="nombre" 
            value={form.nombre} 
            onChange={handleChange} 
            placeholder="Ej: Fitz Roy Express" 
            error={formErrors.nombre} 
          />
          
          <Input 
            label="Destino" 
            name="destino" 
            value={form.destino} 
            onChange={handleChange} 
            placeholder="Ej: El Chaltén, Santa Cruz" 
            error={formErrors.destino} 
            hint="Provincia, región o ciudad."
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
            ]}
          />

          <Select 
            label="Tipo de viaje" 
            name="tipo_viaje" 
            value={form.tipo_viaje} 
            onChange={handleChange}
            options={TIPO_OPTIONS}
            hint="Afecta si la salida tiene una fecha, un rango, o si es recurrente."
          />

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
          <FormSection title="Fechas y Capacidad" icon={Calendar}>
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
                style={{ colorScheme: 'dark' }}
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
                  style={{ colorScheme: 'dark' }}
                />
                <Input 
                  type="date"
                  label="Fecha fin" 
                  name="fecha_fin" 
                  value={form.fecha_fin} 
                  onChange={handleChange} 
                  error={formErrors.fecha_fin} 
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            )
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select 
              label="Nivel de dificultad" 
              name="nivel" 
              value={form.nivel} 
              onChange={handleChange}
              options={NIVEL_OPTIONS}
            />
            <Input 
              type="number"
              label="Cupos" 
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
            <div className="mt-2 flex flex-col gap-6 bg-[#0A0F0A] p-5 rounded-xl border border-[#1E2D1E]">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#F0FFF4]">Días de la semana</label>
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
                          ? { backgroundColor: 'rgba(52,209,126,0.15)', border: '1px solid rgba(52,209,126,0.4)', color: '#34D17E' }
                          : { backgroundColor: '#111A11', border: '1px solid #1E2D1E', color: '#6B8F71' }
                        }
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                {formErrors.dias_semana && <p className="text-xs text-red-400 mt-1">{formErrors.dias_semana}</p>}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-5">
                <Input 
                  type="time"
                  label="Hora de encuentro" 
                  name="hora_encuentro" 
                  value={form.hora_encuentro} 
                  onChange={handleChange} 
                  style={{ colorScheme: 'dark' }}
                />
                <Select 
                  label="Frecuencia" 
                  name="frecuencia" 
                  value={form.frecuencia} 
                  onChange={handleChange}
                  options={FRECUENCIA_OPTIONS}
                />
              </div>

              <Input 
                label="Punto de encuentro" 
                name="punto_encuentro" 
                value={form.punto_encuentro} 
                onChange={handleChange} 
                placeholder="ej: Plaza Urquiza, esquina Av. Libertador"
              />
            </div>
          )}
        </FormSection>

        )}

        {currentStep === 2 && (
          <FormSection title="Comercial y Pagos" icon={CreditCard}>
          <div className="flex flex-col sm:flex-row gap-5">
            <Input 
              type="number"
              label="Precio Final" 
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
                  className="bg-transparent text-sm text-[#F0FFF4] font-medium outline-none px-3 cursor-pointer h-full"
                >
                  <option value="USD" className="bg-[#111A11]">USD</option>
                  <option value="ARS" className="bg-[#111A11]">ARS</option>
                </select>
              }
            />
            
            <Input 
              type="number"
              label="Seña requerida (opcional)" 
              name="sena_usd" 
              value={form.sena_usd} 
              onChange={handleChange} 
              min="0"
              step="0.01"
              placeholder="100"
              prefix={<span className="px-3 text-sm font-medium text-[#6B8F71] h-full flex items-center">{form.moneda}</span>}
              hint="Monto anticipado para reservar cupo."
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
        </FormSection>

        )}

        {currentStep === 3 && (
          <FormSection title="Banco de Imágenes" icon={ImageIcon} description="Vinculá las carpetas con material de esta salida.">
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-[#F0FFF4]">Carpeta de Fotos</label>
            {fotosRootFolderId ? (
              <FolderPicker
                rootFolderId={fotosRootFolderId}
                value={form.carpeta_fotos_nombre}
                onChange={(path) => setForm(prev => ({ ...prev, carpeta_fotos_nombre: path }))}
                onFolderIdChange={(id) => setForm(prev => ({ ...prev, carpeta_fotos_id: id }))}
              />
            ) : (
              <p className="text-xs text-[#6B8F71] py-2">No hay carpeta raíz configurada para fotos.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-[#F0FFF4]">Carpeta de Videos Crudos</label>
            {videosRootFolderId ? (
              <FolderPicker
                rootFolderId={videosRootFolderId}
                value={form.carpeta_videos_nombre}
                onChange={(path) => setForm(prev => ({ ...prev, carpeta_videos_nombre: path }))}
                onFolderIdChange={(id) => setForm(prev => ({ ...prev, carpeta_videos_id: id }))}
              />
            ) : (
              <p className="text-xs text-[#6B8F71] py-2">No hay carpeta raíz configurada para videos.</p>
            )}
          </div>
        </FormSection>

        )}

        {currentStep === 4 && (
          <FormSection title="Itinerario y Lugares" icon={Map} description="Cuanto más detallado, mejor será el contenido generado por la IA.">
          <StructuredContentFields
            destino={form.destino}
            itinerarioDias={form.itinerario_dias}
            puntosInteres={form.puntos_interes}
            onItinerarioChange={itinerario_dias => setForm(prev => ({ ...prev, itinerario_dias }))}
            onPuntosInteresChange={puntos_interes => setForm(prev => ({ ...prev, puntos_interes }))}
            disabled={loading}
          />
          </FormSection>
        )}

        {currentStep === 5 && (
          <FormSection title="Inclusiones" icon={CheckCircle2} description="Detallá qué está incluido en la tarifa y qué no.">
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-[#F0FFF4]">¿Qué incluye?</label>
            <textarea 
              name="que_incluye" 
              value={form.que_incluye} 
              onChange={handleChange} 
              rows={5}
              placeholder="Transporte, alojamiento, guía certificado, equipamiento..."
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#0A0F0A] border border-[#1E2D1E] text-[#F0FFF4] placeholder-[#4A6B4A] focus:outline-none focus:ring-1 focus:ring-[#34D17E] focus:border-[#34D17E] transition-colors resize-y"
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-medium text-[#F0FFF4]">¿Qué NO incluye?</label>
            <textarea 
              name="que_no_incluye" 
              value={form.que_no_incluye} 
              onChange={handleChange} 
              rows={5}
              placeholder="Vuelos, comidas, seguro de vida..."
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#0A0F0A] border border-[#1E2D1E] text-[#F0FFF4] placeholder-[#4A6B4A] focus:outline-none focus:ring-1 focus:ring-[#34D17E] focus:border-[#34D17E] transition-colors resize-y"
            />
          </div>
          </FormSection>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-[#1E2D1E]">
          {isEditing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Eliminando...' : 'Eliminar Salida'}
            </button>
          ) : (
            <div className="w-full sm:w-auto text-sm font-semibold text-[#6B8F71] hidden sm:block">
              Paso {currentStep + 1} de {steps.length}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            {currentStep > 0 && !isEditing && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold bg-[#111A11] border border-[#1E2D1E] text-[#F0FFF4] hover:bg-[#1a291a] transition-colors"
              >
                Anterior
              </button>
            )}
            
            {isEditing && (
              <Link
                href="/salidas"
                className="flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold bg-[#111A11] border border-[#1E2D1E] text-[#F0FFF4] hover:bg-[#1a291a] transition-colors"
              >
                Cancelar
              </Link>
            )}

            {currentStep < steps.length - 1 && !isEditing ? (
              <button 
                type="button" 
                onClick={nextStep}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold bg-[#34D17E] text-[#0A0F0A] hover:bg-[#2FBD72] transition-colors"
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold bg-[#34D17E] text-[#0A0F0A] hover:bg-[#2FBD72] transition-colors shadow-[0_0_20px_rgba(52,209,126,0.3)]"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Salida')}
              </button>
            )}
          </div>
        </div>
      </form>

    </div>
  )
}
