import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Map,
  FileText,
  Sparkles,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  BookOpen,
} from 'lucide-react'
import type { Profile, Salida } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function StatCard({ label, value, icon: Icon, color }: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: '#6B8F71' }}>{label}</p>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-bold" style={{ color: '#F0FFF4' }}>{value}</p>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: salidas }, { data: contenido }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('salidas').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('contenido_generado').select('id, salida_id').eq('user_id', user.id),
  ])

  const totalSalidas = salidas?.length || 0
  const activeSalidas = salidas?.filter(s => s.estado === 'activa').length || 0
  const totalContenido = contenido?.length || 0
  const salidasConContenido = new Set(contenido?.map(c => c.salida_id)).size

  const recentSalidas = (salidas || []).slice(0, 5)

  const hora = new Date().getHours()
  const greeting = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile?.full_name?.split(' ')[0] || 'Aventurero'

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F0FFF4' }}>
            {greeting}, {firstName}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B8F71' }}>
            {profile?.company_name ? `${profile.company_name} · ` : ''}{profile?.niche?.replace(/_/g, ' ')}
          </p>
        </div>
        <Link
          href="/salidas/nueva"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: '#34D17E', color: '#0A0F0A' }}
        >
          <PlusCircle className="w-4 h-4" />
          Nueva salida
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total salidas" value={totalSalidas} icon={Map} color="#34D17E" />
        <StatCard label="Salidas activas" value={activeSalidas} icon={TrendingUp} color="#5CE6A0" />
        <StatCard label="Piezas generadas" value={totalContenido} icon={Sparkles} color="#3B82F6" />
        <StatCard label="Salidas con contenido" value={salidasConContenido} icon={FileText} color="#F59E0B" />
      </div>

      {/* Recent salidas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: '#F0FFF4' }}>Salidas recientes</h2>
          <Link
            href="/salidas"
            className="flex items-center gap-1 text-sm transition-colors"
            style={{ color: '#34D17E' }}
          >
            Ver todas
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentSalidas.length === 0 ? (
          <div
            className="rounded-xl p-10 flex flex-col items-center justify-center text-center"
            style={{ backgroundColor: '#111A11', border: '1px dashed #1E2D1E' }}
          >
            <Map className="w-10 h-10 mb-3" style={{ color: '#1E2D1E' }} />
            <p className="text-sm font-medium mb-1" style={{ color: '#F0FFF4' }}>Sin salidas todavía</p>
            <p className="text-sm mb-6" style={{ color: '#6B8F71' }}>Creá tu primera salida y empezá a generar contenido</p>
            <Link
              href="/salidas/nueva"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#34D17E', color: '#0A0F0A' }}
            >
              <PlusCircle className="w-4 h-4" />
              Crear primera salida
            </Link>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1E2D1E' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#111A11', borderBottom: '1px solid #1E2D1E' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>Salida</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: '#6B8F71' }}>Destino</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: '#6B8F71' }}>Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B8F71' }}>Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {recentSalidas.map((salida: Salida, i) => (
                  <tr
                    key={salida.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? '#111A11' : '#0A0F0A',
                      borderBottom: i < recentSalidas.length - 1 ? '1px solid #1E2D1E' : 'none',
                    }}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: '#F0FFF4' }}>{salida.nombre}</p>
                      <p className="text-xs" style={{ color: '#6B8F71' }}>USD {salida.precio_usd}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm" style={{ color: '#6B8F71' }}>{salida.destino}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-sm" style={{ color: '#6B8F71' }}>
                        {format(new Date(salida.fecha_inicio), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                        style={
                          salida.estado === 'activa'
                            ? { backgroundColor: 'rgba(52,209,126,0.1)', color: '#34D17E' }
                            : salida.estado === 'completada'
                            ? { backgroundColor: 'rgba(59,130,246,0.1)', color: '#3B82F6' }
                            : { backgroundColor: 'rgba(107,143,113,0.1)', color: '#6B8F71' }
                        }
                      >
                        {salida.estado === 'activa' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {salida.estado.charAt(0).toUpperCase() + salida.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/salidas/${salida.id}`}
                        className="text-xs font-medium transition-colors"
                        style={{ color: '#34D17E' }}
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold mb-4" style={{ color: '#F0FFF4' }}>Acciones rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              href: '/salidas/nueva',
              icon: PlusCircle,
              color: '#34D17E',
              title: 'Nueva salida',
              desc: 'Creá una salida y cargá el material',
            },
            {
              href: '/salidas',
              icon: Sparkles,
              color: '#3B82F6',
              title: 'Generar contenido',
              desc: 'Elegí una salida y generá las piezas de IA',
            },
            {
              href: '/admin/knowledge-base',
              icon: BookOpen,
              color: '#F59E0B',
              title: 'Base de conocimiento',
              desc: 'Administrá ejemplos y referencias',
            },
          ].map(action => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-xl p-5 flex items-start gap-4 transition-colors group"
                style={{ backgroundColor: '#111A11', border: '1px solid #1E2D1E' }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors" style={{ backgroundColor: `${action.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#F0FFF4' }}>{action.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#6B8F71' }}>{action.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
