import Link from 'next/link'
import CurationConsole from '@/components/admin/CurationConsole'

export default function AdminCuraduriaPage() {
  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 900 }}>
      <div>
        <Link href="/admin/generacion" style={{ fontSize: 11, color: '#7E9286', textDecoration: 'none' }}>← Generación de contenido</Link>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#EAF2EC', letterSpacing: '-.02em', margin: '6px 0 0' }}>
          Curaduría de templates (OpenAI)
        </h2>
        <p style={{ fontSize: 13, color: '#7E9286', margin: '3px 0 0', maxWidth: 620 }}>
          Dispara scripts/run-creative-lab-*.ts tal cual están. Gasta contra un tope acumulado de
          USD 2 (guardarraíl existente) — ningún gasto corre sin confirmación explícita.
        </p>
      </div>
      <CurationConsole />
    </div>
  )
}
