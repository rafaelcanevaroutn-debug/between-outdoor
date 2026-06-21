import Link from 'next/link'
import { createAdminClient, DEMO_USER_ID, DEMO_PROFILE } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Salida } from '@/types'

const MOUNTAIN_PHOTOS = [
  'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=500&q=70',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=500&q=70',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=500&q=70',
  'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=500&q=70',
]

const HERO_PHOTO = 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=1100&q=70'

function fmtFecha(dateStr: string) {
  try { return format(new Date(dateStr), "d 'de' MMMM", { locale: es }) } catch { return '' }
}

function fmtFechaShort(dateStr: string) {
  try { return format(new Date(dateStr), 'dd MMM', { locale: es }) } catch { return '' }
}

function getTodayLabel() {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const d = new Date()
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`
}

function getProgressPct(salida: Salida) {
  if (salida.estado === 'completada') return 100
  if (salida.estado === 'activa') return 60
  return 20
}

function StatNum({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: '#EAF2EC' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#7E9286', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default async function SalidasPage() {
  const supabase = createAdminClient()

  const [{ data: salidas }, { data: contenidoCounts }] = await Promise.all([
    supabase.from('salidas').select('*').eq('user_id', DEMO_USER_ID).order('fecha_inicio', { ascending: false }),
    supabase.from('contenido_generado').select('salida_id').eq('user_id', DEMO_USER_ID),
  ])

  const profile = DEMO_PROFILE
  const firstName = profile?.full_name?.split(' ')[0] || 'Martín'
  const todayLabel = getTodayLabel()

  const salidaList = (salidas || []) as Salida[]
  const totalSalidas = salidaList.length
  const totalContenido = contenidoCounts?.length || 0

  const countMap = (contenidoCounts || []).reduce((acc, c) => {
    acc[c.salida_id] = (acc[c.salida_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const heroSalida = salidaList[0] || null
  const heroContenidoCount = heroSalida ? countMap[heroSalida.id] || 0 : 0

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <style>{`
        .nuevo-btn { transition: background .12s; }
        .nuevo-btn:hover { background: rgba(52,209,126,.14) !important; }
        .salida-grid-card { transition: border-color .18s, transform .18s; }
        .salida-grid-card:hover { border-color: rgba(92,230,160,.28) !important; transform: translateY(-3px); }
        .strip-link { transition: border-color .12s; }
        .strip-link:hover { border-color: rgba(92,230,160,.22) !important; }
      `}</style>

      {/* Greeting + stat line */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 26, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: '#C9A35E', fontWeight: 600, letterSpacing: '.04em' }}>
            {todayLabel}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.025em', marginTop: 5, color: '#EAF2EC' }}>
            Buen día, {firstName}
          </div>
          <div style={{ fontSize: 14, color: '#7E9286', marginTop: 5 }}>
            Tenés {totalSalidas} salidas en marcha y una publicación lista para hoy.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 30 }}>
          <StatNum value={totalSalidas} label="salidas activas" />
          <StatNum value={totalContenido} label="piezas generadas" />
          <StatNum value={0} label="archivos cargados" />
        </div>
      </div>

      {/* Hero cinematic card */}
      {heroSalida ? (
        <div
          style={{
            position: 'relative',
            borderRadius: 18,
            overflow: 'hidden',
            marginBottom: 28,
            minHeight: 280,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          {/* Background image */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url('${HERO_PHOTO}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          {/* Overlays */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg,rgba(8,12,8,.92) 18%,rgba(8,12,8,.45) 55%,rgba(8,12,8,.15))' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg,rgba(201,140,60,.16),transparent 38%)' }} />
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60%',
            height: '100%',
            backgroundImage: "url('/contours.svg')",
            backgroundPosition: 'right center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            opacity: .5,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }} />

          {/* Content */}
          <div style={{ position: 'relative', padding: '38px 40px', maxWidth: 560 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(52,209,126,.16)',
              border: '1px solid rgba(92,230,160,.3)',
              backdropFilter: 'blur(6px)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5CE6A0' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5CE6A0' }}>
                Próxima salida
              </span>
            </div>

            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.05, marginTop: 16, color: '#EAF2EC' }}>
              {heroSalida.nombre}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14, color: '#C6D3CB', fontSize: 14, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#9DB0A4" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M4 5.5h12v11H4zM4 8.5h12M8 3.5v3M12 3.5v3" />
                </svg>
                {fmtFecha(heroSalida.fecha_inicio)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#9DB0A4" strokeWidth="1.6" strokeLinejoin="round">
                  <path d="M3 16l4-7 3 4 2.5-4.5L18 16z" />
                </svg>
                {heroSalida.destino}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#9DB0A4" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M10 9.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4.5 16.5c0-2.8 2.7-4.5 5.5-4.5s5.5 1.7 5.5 4.5" />
                </svg>
                {heroSalida.cupos} cupos
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
              <Link
                href={`/salidas/${heroSalida.id}/contenido`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '13px 22px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg,#34D17E,#5CE6A0)',
                  color: '#04130A',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 10px 28px -10px rgba(52,209,126,.7)',
                  textDecoration: 'none',
                }}
              >
                Continuar contenido
              </Link>
              <Link
                href={`/salidas/${heroSalida.id}`}
                style={{
                  padding: '13px 22px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,.18)',
                  background: 'rgba(10,15,10,.4)',
                  color: '#EAF2EC',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backdropFilter: 'blur(6px)',
                  textDecoration: 'none',
                }}
              >
                Ver salida
              </Link>
            </div>
          </div>

          {/* Content count top-right */}
          <div style={{ position: 'absolute', top: 32, right: 36, textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: '#9DB0A4' }}>Contenido</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#5CE6A0', letterSpacing: '-.02em' }}>
              {heroContenidoCount > 0 ? Math.round((heroContenidoCount / 12) * 100) : 0}%
            </div>
          </div>
        </div>
      ) : (
        /* Empty hero */
        <div style={{
          position: 'relative',
          borderRadius: 18,
          overflow: 'hidden',
          marginBottom: 28,
          minHeight: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0D130E',
          border: '1px dashed rgba(255,255,255,.1)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#EAF2EC', marginBottom: 8 }}>
              Sin salidas todavía
            </div>
            <div style={{ fontSize: 14, color: '#7E9286', marginBottom: 22 }}>
              Creá tu primer entreno o salida para empezar
            </div>
            <Link
              href="/salidas/nueva"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 24px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg,#34D17E,#5CE6A0)',
                color: '#04130A',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              Crear primera salida
            </Link>
          </div>
        </div>
      )}

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.01em', color: '#EAF2EC' }}>
          Tus entrenos y salidas
        </div>
        <Link
          href="/salidas/nueva"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid rgba(92,230,160,.3)',
            background: 'rgba(52,209,126,.08)',
            color: '#5CE6A0',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background .12s',
          }}
          className="nuevo-btn"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M10 4v12M4 10h12" />
          </svg>
          Nuevo entreno
        </Link>
      </div>

      {/* Salidas grid */}
      {salidaList.length === 0 ? (
        <div style={{
          borderRadius: 20,
          background: '#0D130E',
          border: '1px dashed rgba(255,255,255,.1)',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#EAF2EC', marginBottom: 8 }}>
            Sin entrenos todavía
          </div>
          <div style={{ fontSize: 14, color: '#7E9286' }}>
            Creá tu primera salida y empezá a generar contenido para tus redes
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {salidaList.map((salida: Salida, index: number) => {
            const photo = MOUNTAIN_PHOTOS[index % MOUNTAIN_PHOTOS.length]
            const progress = getProgressPct(salida)
            return (
              <Link
                key={salida.id}
                href={`/salidas/${salida.id}`}
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                  background: '#0D130E',
                  border: '1px solid rgba(255,255,255,.06)',
                  cursor: 'pointer',
                  transition: 'all .18s',
                  textDecoration: 'none',
                  display: 'block',
                }}
                className="salida-grid-card"
              >
                <div style={{ height: 172, position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url('${photo}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 45%,rgba(13,19,14,.85))' }} />

                  {/* Type tag */}
                  <div style={{
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    padding: '4px 9px',
                    borderRadius: 7,
                    background: 'rgba(10,15,10,.55)',
                    backdropFilter: 'blur(6px)',
                    color: '#C6D3CB',
                  }}>
                    {salida.tipo_viaje?.replace(/_/g, ' ') || 'Trekking'}
                  </div>

                  {/* Bottom overlay */}
                  <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.15, color: '#EAF2EC' }}>
                      {salida.nombre}
                    </div>
                    <div style={{ fontSize: 12, color: '#C6D3CB', marginTop: 3 }}>
                      {salida.destino} · {fmtFechaShort(salida.fecha_inicio)}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg,#34D17E,#5CE6A0)',
                      borderRadius: 4,
                    }} />
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: salida.estado === 'activa' ? '#5CE6A0' : salida.estado === 'completada' ? '#9DB0A4' : '#7E9286',
                    background: salida.estado === 'activa' ? 'rgba(52,209,126,.12)' : 'rgba(255,255,255,.05)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    textTransform: 'capitalize' as const,
                  }}>
                    {salida.estado}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Próxima publicación strip */}
      <Link
        href="/calendario"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          marginTop: 24,
          padding: '18px 22px',
          borderRadius: 16,
          background: '#0D130E',
          border: '1px solid rgba(255,255,255,.06)',
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'border-color .12s',
        }}
        className="strip-link"
      >
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'rgba(201,140,60,.14)',
          border: '1px solid rgba(201,140,60,.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#E8B45C" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 5.5h12v11H4zM4 8.5h12M8 3.5v3M12 3.5v3" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: '#7E9286' }}>
            Próxima publicación · Hoy
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 3, color: '#EAF2EC' }}>
            {heroSalida ? `Flyer · ${heroSalida.nombre}` : 'Sin publicaciones programadas'}
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#7BE8C4' }}>Instagram</span>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#5a6b61" strokeWidth="1.8" strokeLinecap="round">
          <path d="m8 5 5 5-5 5" />
        </svg>
      </Link>
    </div>
  )
}
