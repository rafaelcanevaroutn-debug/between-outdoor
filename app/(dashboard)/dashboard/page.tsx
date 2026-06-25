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

  const DISCIPLINE_PILLS = [
    {
      label: 'Trekking',
      active: true,
      icon: (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 16l4-7 3 4 2.5-4.5L18 16z" />
        </svg>
      ),
    },
    { label: 'Trail Running', active: false, icon: null },
    { label: 'Trail', active: false, icon: null },
    { label: 'Ciclismo', active: false, icon: null },
  ]

  const CHIPS = [
    {
      label: 'Banner de horarios',
      icon: (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2.5" />
        </svg>
      ),
    },
    {
      label: 'Flyer de salida',
      icon: (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10c0-1 .5-2 1.5-2.5l9-4a1 1 0 0 1 1.4 1.2l-3 9.5a1.5 1.5 0 0 1-2.8.1L7.5 11 3.5 10z" />
        </svg>
      ),
    },
    {
      label: 'Mostrá a tu grupo',
      icon: (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M2.5 16c0-2.2 2.2-4 5-4s5 1.8 5 4M10 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM15.5 8a2.5 2.5 0 0 1 0 5M17.5 16c0-1.8-1-3.2-2.5-3.8" />
        </svg>
      ),
    },
    {
      label: 'Carrera que corrimos',
      icon: (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h3l1 4H4zM4 8v6M13 4h3v6h-3M13 8v6M7 16h6" />
        </svg>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', minHeight: '72vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .salida-dash-card { transition: border-color .16s, transform .16s; }
        .salida-dash-card:hover { border-color: rgba(92,230,160,.28) !important; transform: translateY(-2px); }
        .chip-link { transition: border-color .14s, color .14s; }
        .chip-link:hover { border-color: rgba(92,230,160,.3) !important; color: #EAF2EC !important; }
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
            ¿Qué creamos hoy para tu grupo?
          </div>
        </div>

        {/* Discipline pills */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          {DISCIPLINE_PILLS.map((pill) => (
            <div
              key={pill.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 14px',
                borderRadius: 11,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: pill.active ? 'rgba(52,209,126,.14)' : '#0D130E',
                color: pill.active ? '#5CE6A0' : '#9DB0A4',
                border: pill.active
                  ? '1px solid rgba(92,230,160,.4)'
                  : '1px solid rgba(255,255,255,.07)',
              }}
            >
              {pill.icon}
              {pill.label}
            </div>
          ))}
        </div>

        {/* Assistant bubble */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            flexShrink: 0,
            background: 'rgba(52,209,126,.14)',
            border: '1px solid rgba(92,230,160,.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <SparkleIcon size={17} stroke="#5CE6A0" />
          </div>
          <div style={{
            padding: '14px 16px',
            borderRadius: '4px 16px 16px 16px',
            background: '#0D130E',
            border: '1px solid rgba(255,255,255,.06)',
            fontSize: 14,
            lineHeight: 1.55,
            color: '#C6D3CB',
            maxWidth: 520,
          }}>
            Soy tu asistente de contenido. Puedo armarte un banner de horarios, un flyer, mostrar a tu grupo o el recap de la última carrera que corrieron. ¿Qué creamos?
          </div>
        </div>

        {/* Composer */}
        <div style={{
          borderRadius: 16,
          background: '#0E140F',
          border: '1px solid rgba(255,255,255,.1)',
          padding: '5px 5px 5px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <input
            placeholder="Contame de tu próxima travesía a la montaña…"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: '#EAF2EC',
              fontSize: 13,
              outline: 'none',
              padding: '11px 0',
            }}
          />
          <button
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              border: 'none',
              background: 'linear-gradient(135deg,#34D17E,#5CE6A0)',
              color: '#04130A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 16V4M5 9l5-5 5 5" />
            </svg>
          </button>
        </div>

        {/* Suggestion chips */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          {CHIPS.map((chip) => (
            <Link
              key={chip.label}
              href="/crear"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 15px',
                borderRadius: 11,
                background: '#0D130E',
                border: '1px solid rgba(255,255,255,.08)',
                fontSize: 13,
                fontWeight: 500,
                color: '#C6D3CB',
                cursor: 'pointer',
                transition: 'all .14s',
                textDecoration: 'none',
              }}
              className="chip-link"
            >
              <span style={{ display: 'flex', color: '#5CE6A0' }}>{chip.icon}</span>
              {chip.label}
            </Link>
          ))}
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
