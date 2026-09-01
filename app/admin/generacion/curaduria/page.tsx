import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CurationConsole from '@/components/admin/CurationConsole'

export default function AdminCuraduriaPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1000px]">
      <div>
        <Link
          href="/admin/generacion"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--piedra)] hover:text-[var(--tinta)] transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Generación de contenido</span>
        </Link>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--tinta)] tracking-[-0.02em] m-0">
          Curaduría de templates (OpenAI)
        </h2>
        <p className="text-xs sm:text-sm text-[var(--piedra)] mt-1 max-w-2xl leading-relaxed">
          Dispara <code className="font-mono text-xs bg-[var(--blanco-piedra)] px-1.5 py-0.5 rounded border border-[var(--linea)] text-[var(--tinta)]">scripts/run-creative-lab-*.ts</code> tal cual están. Gasta contra un tope acumulado de
          USD 2 (guardarraíl existente) — ningún gasto corre sin confirmación explícita.
        </p>
      </div>
      <CurationConsole />
    </div>
  )
}

