import { Library } from 'lucide-react'
import Link from 'next/link'

export default function BibliotecaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[20px] font-bold" style={{ color: 'var(--tinta)', letterSpacing: '-0.02em' }}>Biblioteca de material</h2>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--piedra)' }}>Todo el material que subiste, ordenado por salida.</p>
      </div>

      <div
        className="rounded-[18px] flex flex-col items-center justify-center text-center"
        style={{
          padding: '80px 40px',
          backgroundColor: 'var(--blanco-piedra)',
          border: '1px dashed var(--piedra-clara)',
          boxShadow: 'var(--sombra-reposo)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ backgroundColor: 'var(--cardon-tenue)', border: '1px solid var(--linea)' }}
        >
          <Library className="w-6 h-6" style={{ color: 'var(--cardon)' }} />
        </div>
        <p className="text-[15px] font-semibold mb-2" style={{ color: 'var(--tinta)' }}>Próximamente</p>
        <p className="text-[13px] mb-6 max-w-sm" style={{ color: 'var(--piedra)' }}>
          Acá vas a encontrar todo el material que subiste. Por ahora, cargalo desde el detalle de cada salida.
        </p>
        <Link
          href="/salidas"
          className="text-[13px] font-medium px-4 py-2 rounded-[10px] transition-colors"
          style={{ backgroundColor: 'rgba(62, 92, 72, 0.1)', color: 'var(--cardon)', border: '1px solid rgba(62, 92, 72, 0.2)' }}
        >
          Ver salidas
        </Link>
      </div>
    </div>
  )
}
