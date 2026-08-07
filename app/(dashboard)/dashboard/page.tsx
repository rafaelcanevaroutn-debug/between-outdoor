import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Salida } from '@/types'

const MOUNTAIN_PHOTOS = [
  'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=500&q=70',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=500&q=70',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=500&q=70',
]

function SparkleIcon({ size = 24, stroke = '#04130A' }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  )
}

function SalidaCard({ salida, index }: { salida: Salida; index: number }) {
  const photo = MOUNTAIN_PHOTOS[index % MOUNTAIN_PHOTOS.length]
  const fecha = (() => {
    try { return format(new Date(salida.fecha_inicio), "d 'de' MMMM", { locale: es }) } catch { return '' }
  })()

  const progressPct = salida.estado === 'completada' ? 100 : salida.estado === 'activa' ? 60 : 20

  return (
    <Link
      href={`/salidas/${salida.id}`}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: '#0D130E',
        border: '1px solid rgba(255,255,255,.06)',
        cursor: 'pointer',
        transition: 'all .16s',
        textDecoration: 'none',
        display: 'block',
      }}
      className="salida-dash-card"
    >
      <div style={{ height: 96, position: 'relative' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('${photo}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg,transparent 35%,rgba(13,19,14,.9))',
        }} />
        <div style={{ position: 'absolute', bottom: 9, left: 12, right: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#EAF2EC' }}>
            {salida.nombre}
          </div>
          <div style={{ fontSize: 11, color: '#9DB0A4', marginTop: 2 }}>{fecha}</div>
        </div>
      </div>
      <div style={{ padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,#34D17E,#5CE6A0)', borderRadius: 3 }} />
        </div>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '.04em',
          textTransform: 'uppercase' as const,
          color: salida.estado === 'activa' ? '#5CE6A0' : salida.estado === 'completada' ? '#9DB0A4' : '#7E9286',
          background: salida.estado === 'activa' ? 'rgba(52,209,126,.12)' : 'rgba(255,255,255,.05)',
          padding: '2px 7px',
          borderRadius: 6,
        }}>
          {salida.estado}
        </span>
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: salidas }, { data: profile }] = await Promise.all([
    supabase.from('salidas').select('*').order('created_at', { ascending: false }).limit(3),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario'
  const recentSalidas = (salidas || []) as Salida[]

  const NICHE_LABELS: Record<string, string> = {
    trekking: 'Trekking',
    running: 'Running',
    ciclismo: 'Ciclismo',
    turismo_aventura: 'Turismo Aventura',
  }
  const nicheLabel = profile?.niche ? (NICHE_LABELS[profile.niche] ?? profile.niche) : 'Trekking'

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', minHeight: '72vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .salida-dash-card { transition: border-color .16s, transform .16s; }
        .salida-dash-card:hover { border-color: rgba(92,230,160,.28) !important; transform: translateY(-2px); }
        .manual-link { transition: border-color .14s, color .14s; }
        .manual-link:hover { border-color: rgba(92,230,160,.3) !important; color: #EAF2EC !important; }
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 0' }}>

        {/* Greeting */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            margin: '0 auto 16px',
            background: 'linear-gradient(135deg,#34D17E,#5CE6A0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 22px -10px rgba(52,209,126,.55)',
          }}>
            <SparkleIcon size={24} stroke="#04130A" />
          </div>
          <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-.025em', color: '#EAF2EC' }}>
            Hola, {firstName}
          </div>
          <div style={{ fontSize: 15, color: '#7E9286', marginTop: 6 }}>
            Tu contenido de {nicheLabel}, organizado semana a semana
          </div>
        </div>

        {/* Weekly content primary action */}
        <div style={{
          borderRadius: 16,
          background: '#0E140F',
          border: '1px solid rgba(255,255,255,.1)',
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#EAF2EC' }}>Generá tu semana de contenido</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#7E9286', marginTop: 5 }}>
              Usamos tus salidas, tu calendario asignado y tus imágenes para crear todas las piezas de una vez.
            </div>
          </div>
          <Link
            href="/calendario"
            style={{
              padding: '11px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg,#34D17E,#5CE6A0)',
              color: '#04130A',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 5.5h12v11H4zM4 8.5h12M8 3.5v3M12 3.5v3" />
            </svg>
            Ir a Mi semana
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <Link
            href="/crear"
            className="manual-link"
            style={{ color: '#7E9286', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}
          >
            ¿Necesitás una pieza puntual? Abrir creación manual →
          </Link>
        </div>
      </div>

      {/* Salidas section */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#9DB0A4' }}>
            Tus entrenos y salidas · Trekking
          </div>
          <Link
            href="/salidas"
            style={{ fontSize: 13, color: '#5CE6A0', cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}
          >
            Ver todas →
          </Link>
        </div>

        {recentSalidas.length === 0 ? (
          <div style={{
            borderRadius: 16,
            background: '#0D130E',
            border: '1px dashed rgba(255,255,255,.1)',
            padding: '32px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, color: '#7E9286' }}>
              Todavía no cargaste ningún entreno o salida.
            </div>
            <Link
              href="/salidas/nueva"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                marginTop: 14,
                padding: '9px 18px',
                borderRadius: 10,
                background: 'linear-gradient(135deg,#34D17E,#5CE6A0)',
                color: '#04130A',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Crear primera salida
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {recentSalidas.map((salida, i) => (
              <SalidaCard key={salida.id} salida={salida} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
