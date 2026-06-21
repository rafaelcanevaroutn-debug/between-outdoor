import { CalendarDays } from 'lucide-react'

export default function CalendarioPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Section header */}
      <div>
        <h2 className="text-[20px] font-bold" style={{ color: '#EAF2EC', letterSpacing: '-0.02em' }}>Calendario de contenido</h2>
        <p className="text-[13px] mt-0.5" style={{ color: '#7E9286' }}>Distribución de piezas hacia la fecha de la salida</p>
      </div>

      {/* Empty state */}
      <div
        className="rounded-[18px] flex flex-col items-center justify-center text-center"
        style={{
          padding: '80px 40px',
          backgroundColor: '#0D130E',
          border: '1px dashed rgba(255,255,255,0.07)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: 'rgba(52,209,126,0.08)', border: '1px solid rgba(52,209,126,0.15)' }}
        >
          <CalendarDays className="w-6 h-6" style={{ color: '#34D17E' }} />
        </div>
        <p className="text-[15px] font-semibold mb-2" style={{ color: '#EAF2EC' }}>Próximamente</p>
        <p className="text-[13px] max-w-sm" style={{ color: '#7E9286' }}>
          El calendario va a mostrar tus piezas distribuidas automáticamente hacia atrás hasta la fecha de cada salida.
        </p>
      </div>
    </div>
  )
}
