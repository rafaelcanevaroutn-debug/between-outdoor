import { Library } from 'lucide-react'
import Link from 'next/link'

export default function BibliotecaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[20px] font-bold" style={{ color: '#EAF2EC', letterSpacing: '-0.02em' }}>Biblioteca de material</h2>
        <p className="text-[13px] mt-0.5" style={{ color: '#7E9286' }}>Todo el material que subiste, filtrable por slot</p>
      </div>

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
          style={{ backgroundColor: 'rgba(92,230,160,0.08)', border: '1px solid rgba(92,230,160,0.15)' }}
        >
          <Library className="w-6 h-6" style={{ color: 'var(--cardon-tenue)' }} />
        </div>
        <p className="text-[15px] font-semibold mb-2" style={{ color: '#EAF2EC' }}>PrÃ³ximamente</p>
        <p className="text-[13px] mb-6 max-w-sm" style={{ color: '#7E9286' }}>
          AcÃ¡ vas a ver todo el material que subiste agrupado por slot. Por ahora subÃ­ el material desde el detalle de cada salida.
        </p>
        <Link
          href="/salidas"
          className="text-[13px] font-medium px-4 py-2 rounded-[10px] transition-colors"
          style={{ backgroundColor: 'rgba(62, 92, 72, 0.1)', color: 'var(--cardon)', border: '1px solid rgba(62, 92, 72, 0.2)' }}
        >
          Ver entrenos
        </Link>
      </div>
    </div>
  )
}

