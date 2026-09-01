import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import GenerationConsole from '@/components/admin/GenerationConsole'

export const dynamic = 'force-dynamic'

export default async function AdminGeneracionPage() {
  const admin = createAdminClient()
  const { data: clientes } = await admin
    .from('profiles')
    .select('id, full_name, company_name, niche')
    .eq('role', 'client')
    .order('full_name', { ascending: true })

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[var(--tinta)] tracking-[-0.02em] m-0">
            Generación de contenido — modo admin
          </h2>
          <p className="text-xs sm:text-sm text-[var(--piedra)] mt-1 max-w-2xl">
            Prueba interna de copy (Gemini). No inserta nada en el contenido del cliente — genera y
            muestra el resultado acá mismo. Aislado del flujo de generación normal.
          </p>
        </div>
        <Link
          href="/admin/generacion/curaduria"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-[var(--linea)] text-[var(--tinta)] hover:bg-[var(--blanco-piedra)] hover:text-[var(--cardon)] shadow-xs transition-all shrink-0 self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--cardon)]" />
          <span>Curaduría de templates (OpenAI)</span>
          <ArrowRight className="w-3.5 h-3.5 text-[var(--piedra)]" />
        </Link>
      </div>

      <GenerationConsole clientes={clientes ?? []} />
    </div>
  )
}

