import Link from 'next/link'
import { Clock, Megaphone, Users, Award, Flag, Zap, Lightbulb, BarChart2 } from 'lucide-react'

const FORMATOS = [
  {
    key: 'horarios',
    label: 'Banner de horarios',
    desc: 'Los días y horas de tus entrenos, claros y a mano',
    tag: 'Información',
    accent: '#5CE6A0',
    Icon: Clock,
  },
  {
    key: 'flyer',
    label: 'Flyer de salida',
    desc: 'Anunciá una salida, una fecha o un cupo abierto',
    tag: 'Difusión',
    accent: '#7BE8C4',
    Icon: Megaphone,
  },
  {
    key: 'grupo',
    label: 'Mostrá a tu grupo',
    desc: 'La comunidad entrenando junta, el clima del grupo',
    tag: 'Comunidad',
    accent: '#34D17E',
    Icon: Users,
  },
  {
    key: 'alumno',
    label: 'Spotlight de alumno',
    desc: 'Destacá el logro o el progreso de un atleta',
    tag: 'Comunidad',
    accent: '#A8F0CF',
    Icon: Award,
  },
  {
    key: 'carrera',
    label: 'Carrera que corrimos',
    desc: 'El recap de esa carrera a la que fueron a correr',
    tag: 'Logros',
    accent: '#E8B45C',
    Icon: Flag,
  },
  {
    key: 'entreno',
    label: 'Recap de entreno',
    desc: 'Cómo estuvo la salida o el entreno de hoy',
    tag: 'Día a día',
    accent: '#46C98B',
    Icon: Zap,
  },
  {
    key: 'tips',
    label: 'Tips & técnica',
    desc: 'Consejos que tu comunidad guarda y comparte',
    tag: 'Autoridad',
    accent: '#2FB3A0',
    Icon: Lightbulb,
  },
  {
    key: 'progreso',
    label: 'Antes y después',
    desc: 'La transformación de un alumno en el tiempo',
    tag: 'Inspiración',
    accent: '#5CE6A0',
    Icon: BarChart2,
  },
]

export default function CrearPage() {
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <style>{`
        .formato-card { transition: border-color .15s, transform .15s; }
        .formato-card:hover { border-color: rgba(92,230,160,.3) !important; transform: translateY(-3px); }
        .nueva-salida-link { transition: border-color .12s; }
        .nueva-salida-link:hover { border-color: rgba(92,230,160,.3) !important; }
      `}</style>

      {/* Section header band */}
      <div style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        padding: '26px 30px',
        marginBottom: 24,
        background: 'linear-gradient(135deg,#10180f,#0c120d)',
        border: '1px solid rgba(255,255,255,.06)',
      }}>
        {/* Contours background */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '100%',
          backgroundImage: "url('/contours.svg')",
          backgroundPosition: 'right center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          opacity: .4,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: '#EAF2EC' }}>
            ¿Qué querés crear hoy?
          </div>
          <div style={{ fontSize: 14, color: '#9DB0A4', marginTop: 7, maxWidth: 560, lineHeight: 1.5 }}>
            Elegí un formato y armamos la pieza con tu material. Banners, flyers, recaps de carreras, spotlights de tus alumnos — todo con la cara de tu grupo.
          </div>
        </div>
      </div>

      {/* Format cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {FORMATOS.map(({ key, label, desc, tag, accent, Icon }) => {
          const accentHex = accent.replace('#', '')
          return (
            <Link
              key={key}
              href={`/salidas/nueva?formato=${key}`}
              style={{
                textAlign: 'left',
                padding: 16,
                borderRadius: 14,
                cursor: 'pointer',
                background: '#0D130E',
                border: '1px solid rgba(255,255,255,.06)',
                transition: 'all .15s',
                textDecoration: 'none',
                display: 'block',
              }}
              className="formato-card"
            >
              {/* Top row: icon + tag */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: `${accent}1f`,
                  color: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={18} />
                </div>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                  color: accent,
                  background: `${accent}1a`,
                  padding: '3px 8px',
                  borderRadius: 6,
                }}>
                  {tag}
                </span>
              </div>

              {/* Label */}
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.01em', color: '#EAF2EC' }}>
                {label}
              </div>

              {/* Description */}
              <div style={{ fontSize: 13, color: '#7E9286', marginTop: 6, lineHeight: 1.45 }}>
                {desc}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Dashed card — new salida */}
      <Link
        href="/salidas/nueva"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginTop: 16,
          padding: '18px 22px',
          borderRadius: 16,
          background: '#0D130E',
          border: '1px dashed rgba(255,255,255,.14)',
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'border-color .12s',
        }}
        className="nueva-salida-link"
      >
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(255,255,255,.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9DB0A4',
          flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 16l4-7 3 4 2.5-4.5L18 16z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#EAF2EC' }}>
            Cargar un entreno o salida nuevo
          </div>
          <div style={{ fontSize: 12, color: '#7E9286', marginTop: 2 }}>
            Sumá la actividad con sus datos para después generar todo su contenido
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#5a6b61" strokeWidth="1.8" strokeLinecap="round">
          <path d="m8 5 5 5-5 5" />
        </svg>
      </Link>
    </div>
  )
}
