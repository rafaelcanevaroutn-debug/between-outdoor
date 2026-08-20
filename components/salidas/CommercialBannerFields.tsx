'use client'

import type {BannerCommercialFormValue} from '@/lib/banner-commercial-form'

const inputClass = 'w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors'
const inputStyle = {backgroundColor: '#0A0F0A', border: '1px solid #1E2D1E', color: '#F0FFF4'}

export default function CommercialBannerFields({value, onChange, disabled = false}: {
  value: BannerCommercialFormValue
  onChange: (value: BannerCommercialFormValue) => void
  disabled?: boolean
}) {
  const set = <K extends keyof BannerCommercialFormValue>(key: K, next: BannerCommercialFormValue[K]) => onChange({...value, [key]: next})
  const number = (key: keyof BannerCommercialFormValue, label: string, min: number, step = 1) => (
    <label className="flex flex-col gap-1.5 text-sm" style={{color: '#F0FFF4'}}>
      {label}
      <input type="number" min={min} step={step} value={String(value[key])} disabled={disabled}
        onChange={event => set(key, event.target.value as never)} className={inputClass} style={inputStyle} />
    </label>
  )
  const check = (key: keyof BannerCommercialFormValue, label: string) => (
    <label className="flex items-center gap-2 text-sm" style={{color: '#C8DDD0'}}>
      <input type="checkbox" checked={Boolean(value[key])} disabled={disabled}
        onChange={event => set(key, event.target.checked as never)} />
      {label}
    </label>
  )

  return (
    <section className="rounded-xl p-6 flex flex-col gap-5" style={{backgroundColor: '#111A11', border: '1px solid #1E2D1E'}}>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{color: '#6B8F71'}}>Datos comerciales para banners</h2>
        <p className="text-xs mt-1" style={{color: '#4A6B4A'}}>Opcionales. Se usan como hechos verificados en Moldes 3 y 5; la IA nunca los inventa.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {number('cupos_totales', 'Cupos totales', 1)}
        {number('cupos_disponibles', 'Cupos disponibles', 0)}
      </div>
      {check('precio_desde', 'Mostrar el precio como “Desde”')}

      <div className="pt-4 flex flex-col gap-3" style={{borderTop: '1px solid #1E2D1E'}}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{color: '#6B8F71'}}>Promoción verificada · Molde 3</p>
        <p className="text-xs" style={{color: '#4A6B4A'}}>Todos son opcionales. El sistema muestra únicamente lo cargado y no calcula descuentos.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {number('precio_anterior', 'Precio anterior', 0.01, 0.01)}
          {number('descuento_porcentaje', 'Descuento (%)', 0.01, 0.01)}
          {number('precio_efectivo', 'Precio en efectivo', 0.01, 0.01)}
        </div>
        <label className="flex flex-col gap-1.5 text-sm" style={{color: '#F0FFF4'}}>
          Promoción vigente hasta
          <input type="date" value={value.promo_vigencia_hasta} disabled={disabled}
            onChange={event => set('promo_vigencia_hasta', event.target.value)} className={inputClass}
            style={{...inputStyle, colorScheme: 'dark'}} />
        </label>
      </div>

      <div className="pt-4 flex flex-col gap-3" style={{borderTop: '1px solid #1E2D1E'}}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{color: '#6B8F71'}}>Financiación · Molde 3</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {number('cuotas_maximas', 'Cantidad máxima de cuotas', 1)}
          {number('cuota_desde', 'Importe de cuota desde', 0.01, 0.01)}
        </div>
        {check('sin_interes', 'Las cuotas son sin interés')}
        <label className="flex flex-col gap-1.5 text-sm" style={{color: '#F0FFF4'}}>
          Descripción verificada de financiación
          <input value={value.descripcion_financiacion} disabled={disabled} onChange={event => set('descripcion_financiacion', event.target.value)}
            placeholder="Ej: 6 cuotas fijas con tarjeta" className={inputClass} style={inputStyle} />
        </label>
      </div>

      <div className="pt-4 flex flex-col gap-3" style={{borderTop: '1px solid #1E2D1E'}}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{color: '#6B8F71'}}>Paquete de agencia · Molde 5</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {number('noches', 'Noches', 1)}
          <label className="flex flex-col gap-1.5 text-sm" style={{color: '#F0FFF4'}}>Alojamiento
            <input value={value.alojamiento} disabled={disabled} onChange={event => set('alojamiento', event.target.value)} placeholder="Hotel 4 estrellas" className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm" style={{color: '#F0FFF4'}}>Régimen
            <input value={value.regimen} disabled={disabled} onChange={event => set('regimen', event.target.value)} placeholder="Media pensión" className={inputClass} style={inputStyle} />
          </label>
        </div>
        <div className="flex flex-wrap gap-4">
          {check('aereos_incluidos', 'Aéreos incluidos')}
          {check('traslados_incluidos', 'Traslados incluidos')}
          {check('asistencia_viajero_incluida', 'Asistencia al viajero incluida')}
        </div>
      </div>
    </section>
  )
}
