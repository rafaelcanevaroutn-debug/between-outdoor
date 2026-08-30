'use client'

import type {BannerCommercialFormValue} from '@/lib/banner-commercial-form'

const inputClass = 'w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-colors'
const inputStyle = {backgroundColor: 'var(--nieve)', border: '1px solid var(--linea)', color: 'var(--tinta)'}

export default function CommercialBannerFields({value, onChange, disabled = false}: {
  value: BannerCommercialFormValue
  onChange: (value: BannerCommercialFormValue) => void
  disabled?: boolean
}) {
  const set = <K extends keyof BannerCommercialFormValue>(key: K, next: BannerCommercialFormValue[K]) => onChange({...value, [key]: next})
  const number = (key: keyof BannerCommercialFormValue, label: string, min: number, step = 1) => (
    <label className="flex flex-col gap-1.5 text-sm" style={{color: 'var(--tinta)'}}>
      {label}
      <input type="number" min={min} step={step} value={String(value[key])} disabled={disabled}
        onChange={event => set(key, event.target.value as never)} className={inputClass} style={inputStyle} />
    </label>
  )
  const check = (key: keyof BannerCommercialFormValue, label: string) => (
    <label className="flex items-center gap-2 text-sm" style={{color: 'var(--piedra)'}}>
      <input type="checkbox" checked={Boolean(value[key])} disabled={disabled}
        onChange={event => set(key, event.target.checked as never)} />
      {label}
    </label>
  )

  return (
    <section className="rounded-2xl border border-[var(--linea)] bg-[var(--blanco-piedra)] p-5 flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-[var(--tinta)]">Datos comerciales para banners</h2>
        <p className="text-xs mt-1 text-[var(--piedra)]">Opcionales. Se usan como hechos verificados en los flyers; la IA nunca los inventa.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {number('cupos_totales', 'Cupos totales', 1)}
        {number('cupos_disponibles', 'Cupos disponibles', 0)}
      </div>
      {check('precio_desde', 'Mostrar el precio como “Desde”')}

      <div className="pt-4 flex flex-col gap-3 border-t border-[var(--linea)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cardon)]">Promoción verificada</p>
        <p className="text-xs text-[var(--piedra)]">El sistema muestra únicamente lo cargado y no calcula descuentos.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {number('precio_anterior', 'Precio anterior', 0.01, 0.01)}
          {number('descuento_porcentaje', 'Descuento (%)', 0.01, 0.01)}
          {number('precio_efectivo', 'Precio en efectivo', 0.01, 0.01)}
        </div>
        <label className="flex flex-col gap-1.5 text-sm text-[var(--tinta)]">
          Promoción vigente hasta
          <input type="date" value={value.promo_vigencia_hasta} disabled={disabled}
            onChange={event => set('promo_vigencia_hasta', event.target.value)} className={inputClass}
            style={{...inputStyle, colorScheme: 'light'}} />
        </label>
      </div>

      <div className="pt-4 flex flex-col gap-3 border-t border-[var(--linea)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cardon)]">Financiación</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {number('cuotas_maximas', 'Cantidad máxima de cuotas', 1)}
          {number('cuota_desde', 'Importe de cuota desde', 0.01, 0.01)}
        </div>
        {check('sin_interes', 'Las cuotas son sin interés')}
        <label className="flex flex-col gap-1.5 text-sm text-[var(--tinta)]">
          Descripción verificada de financiación
          <input value={value.descripcion_financiacion} disabled={disabled} onChange={event => set('descripcion_financiacion', event.target.value)}
            placeholder="Ej: 6 cuotas fijas con tarjeta" className={inputClass} style={inputStyle} />
        </label>
      </div>

      <div className="pt-4 flex flex-col gap-3 border-t border-[var(--linea)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cardon)]">Paquete de agencia</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {number('noches', 'Noches', 1)}
          <label className="flex flex-col gap-1.5 text-sm text-[var(--tinta)]">Alojamiento
            <input value={value.alojamiento} disabled={disabled} onChange={event => set('alojamiento', event.target.value)} placeholder="Hotel 4 estrellas" className={inputClass} style={inputStyle} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-[var(--tinta)]">Régimen
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
