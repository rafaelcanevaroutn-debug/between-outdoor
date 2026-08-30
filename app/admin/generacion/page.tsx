import Link from 'next/link'
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
    <div className="flex flex-col gap-6" style={{ maxWidth: 1120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#EAF2EC', letterSpacing: '-.02em', margin: 0 }}>
            Generación de contenido — modo admin
          </h2>
          <p style={{ fontSize: 13, color: '#7E9286', margin: '3px 0 0', maxWidth: 620 }}>
            Prueba interna de copy (Gemini). No inserta nada en el contenido del cliente — genera y
            muestra el resultado acá mismo. Aislado del flujo de generación normal.
          </p>
        </div>
        <Link
          href="/admin/generacion/curaduria"
          style={{ fontSize: 12, color: '#34D17E', border: '1px solid rgba(52,209,126,.3)', borderRadius: 8, padding: '8px 12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Curaduría de templates (OpenAI) →
        </Link>
      </div>

      <GenerationConsole clientes={clientes ?? []} />
    </div>
  )
}
