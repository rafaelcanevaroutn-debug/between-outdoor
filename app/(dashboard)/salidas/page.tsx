import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Salida } from '@/types'

const MOUNTAIN_PHOTOS = [
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80',
]

function getPhotoForId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return MOUNTAIN_PHOTOS[Math.abs(hash) % MOUNTAIN_PHOTOS.length]
}

function fmtFecha(dateStr: string) {
  try { return format(new Date(dateStr), "d 'de' MMMM yyyy", { locale: es }) } catch { return '' }
}

function fmtFechaShort(dateStr: string) {
  try { return format(new Date(dateStr), 'dd MMM yyyy', { locale: es }) } catch { return '' }
}

function getEstadoEfectivo(salida: Salida): string {
  if (salida.estado === 'activa') {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    // Si la fecha de inicio ya pasó hoy, se considera completada
    if (new Date(salida.fecha_inicio) < now) {
      return 'completada'
    }
  }
  return salida.estado
}

function getTodayLabel() {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const d = new Date()
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`
}

function StatNum({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-3xl font-bold tracking-tight text-[#EAF2EC]">{value}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#7E9286] mt-1">{label}</span>
    </div>
  )
}

function BadgeStatus({ estado }: { estado: string }) {
  const isActiva = estado === 'activa'
  
  if (isActiva) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#34D17E]/10 border border-[#34D17E]/20 backdrop-blur-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-[#34D17E] animate-pulse" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#5CE6A0]">{estado}</span>
      </div>
    )
  }
  
  return (
    <div className="inline-flex items-center px-2 py-1 rounded bg-black/40 border border-white/10 backdrop-blur-sm">
      <span className="text-[9px] font-bold uppercase tracking-wider text-[#EAF2EC]/70">{estado}</span>
    </div>
  )
}

export default async function SalidasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: salidas }, { data: contenidoCounts }, { data: profile }] = await Promise.all([
    supabase.from('salidas').select('*').order('fecha_inicio', { ascending: false }),
    supabase.from('contenido_generado').select('salida_id'),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario'
  const todayLabel = getTodayLabel()

  const salidaListRaw = (salidas || []) as Salida[]
  const salidaList = salidaListRaw.map((s) => ({
    ...s,
    estadoEfectivo: getEstadoEfectivo(s)
  }))

  const totalContenido = contenidoCounts?.length || 0
  const salidasActivasCount = salidaList.filter((s) => s.estadoEfectivo === 'activa').length

  const countMap = (contenidoCounts || []).reduce((acc, c) => {
    acc[c.salida_id] = (acc[c.salida_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Separar salidas por estado efectivo
  const activas = salidaList
    .filter((s) => s.estadoEfectivo === 'activa')
    .sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime())

  const otras = salidaList
    .filter((s) => s.estadoEfectivo !== 'activa')
    .sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())

  // El hero es la salida activa más urgente/actual, o si no hay, la más reciente completada
  const heroSalida = activas.length > 0 ? activas[0] : (otras[0] || null)
  const heroContenidoCount = heroSalida ? countMap[heroSalida.id] || 0 : 0

  // La grilla muestra las activas restantes primero (más urgentes a la izq) y luego las completadas
  const gridSalidas = [
    ...activas.filter((s) => s.id !== heroSalida?.id),
    ...otras.filter((s) => s.id !== heroSalida?.id),
  ]

  return (
    <div className="max-w-[1180px] mx-auto px-4 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
        <div>
          <div className="text-[11px] font-bold tracking-widest uppercase text-[#C9A35E]">
            {todayLabel}
          </div>
          <div className="text-3xl font-bold tracking-tight mt-2 text-[#EAF2EC]">
            Buen día, {firstName}
          </div>
          <div className="text-sm text-[#7E9286] mt-1.5">
            Tenés {salidasActivasCount} salidas en marcha y una publicación lista para hoy.
          </div>
        </div>
        <div className="flex gap-10">
          <StatNum value={salidasActivasCount} label="salidas activas" />
          <StatNum value={totalContenido} label="piezas generadas" />
          <StatNum value={0} label="archivos cargados" />
        </div>
      </div>

      {/* Hero Card */}
      {heroSalida ? (
        <div className="relative overflow-hidden rounded-[20px] mb-12 p-8 lg:p-10 flex flex-col justify-between min-h-[300px] group border border-white/[0.08]">
          <div 
            className="absolute inset-0 bg-cover bg-center z-0" 
            style={{ backgroundImage: `url(${getPhotoForId(heroSalida.id)})` }}
          />
          {/* Overlay oscuro para garantizar legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F0A] via-[#0A0F0A]/90 to-[#0A0F0A]/30 z-0" />
          
          <div className="flex justify-between items-start w-full relative z-10">
            <div className="inline-flex px-2.5 py-1 rounded bg-black/30 border border-white/10 backdrop-blur-md">
               <span className="text-[10px] font-bold uppercase tracking-widest text-[#EAF2EC]">Próxima Salida</span>
            </div>
            
            <div className="text-right">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#EAF2EC]/70 mb-1 drop-shadow-md">Contenido</span>
              <span className="text-2xl font-bold tracking-tighter text-[#5CE6A0] drop-shadow-md">{heroContenidoCount} <span className="text-sm font-medium text-[#EAF2EC]/90 tracking-normal">piezas</span></span>
            </div>
          </div>

          <div className="relative z-10 mt-6 lg:mt-0 max-w-2xl">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight mb-4 drop-shadow-lg">
              {heroSalida.nombre}
            </h2>

            <div className="flex items-center gap-6 text-sm text-[#EAF2EC]/90 font-medium mb-8 drop-shadow-md">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {fmtFecha(heroSalida.fecha_inicio)}
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {heroSalida.destino}
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                {heroSalida.cupos} cupos
              </div>
            </div>

            <div className="flex gap-4">
              <Link 
                href={`/salidas/${heroSalida.id}/contenido`} 
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-[#34D17E] to-[#5CE6A0] text-[#04130A] text-sm font-bold shadow-[0_4px_14px_rgba(52,209,126,0.3)] hover:shadow-[0_6px_20px_rgba(52,209,126,0.4)] hover:-translate-y-0.5 transition-all duration-200"
              >
                Continuar contenido
              </Link>
              <Link 
                href={`/salidas/${heroSalida.id}`} 
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-black/40 border border-white/20 backdrop-blur-md text-white text-sm font-semibold hover:bg-black/60 transition-all duration-200"
              >
                Ver salida
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[20px] mb-12 p-12 bg-[#0A0F0A] border border-dashed border-white/10 flex flex-col items-center justify-center text-center min-h-[260px]">
          <h2 className="text-xl font-bold text-[#EAF2EC] mb-2">Sin salidas todavía</h2>
          <p className="text-sm text-[#7E9286] mb-6">Creá tu primer entreno o salida para empezar</p>
          <Link
            href="/salidas/nueva"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-[#34D17E] to-[#5CE6A0] text-[#04130A] text-sm font-bold shadow-[0_4px_14px_rgba(52,209,126,0.2)] hover:shadow-[0_6px_20px_rgba(52,209,126,0.3)] hover:-translate-y-0.5 transition-all duration-200"
          >
            Crear primera salida
          </Link>
        </div>
      )}

      {/* Grid Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold tracking-tight text-[#EAF2EC]">
          Tus viajes y salidas
        </h3>
        <Link
          href="/salidas/nueva"
          className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#5CE6A0]/20 bg-[#5CE6A0]/5 text-[#5CE6A0] text-sm font-semibold hover:bg-[#5CE6A0]/10 hover:border-[#5CE6A0]/30 transition-all duration-200"
        >
          <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 20 20">
            <path d="M10 4v12M4 10h12" />
          </svg>
          Nuevo viaje
        </Link>
      </div>

      {/* Salidas Grid */}
      {gridSalidas.length === 0 ? (
        <div className="rounded-[20px] bg-[#0A0F0A] border border-dashed border-white/10 p-12 text-center">
          <h4 className="text-base font-semibold text-[#EAF2EC] mb-2">Sin más entrenos</h4>
          <p className="text-sm text-[#7E9286]">Creá una nueva salida para verla listada aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gridSalidas.map((salida: any) => (
            <Link 
              key={salida.id} 
              href={`/salidas/${salida.id}`}
              className="group relative overflow-hidden flex flex-col justify-between h-48 rounded-[16px] border border-white/[0.08] p-6 hover:border-[#5CE6A0]/40 hover:shadow-[0_0_25px_rgba(92,230,160,0.1)] hover:-translate-y-1 transition-all duration-300"
            >
              {/* Imagen de fondo de la grilla */}
              <div 
                className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${getPhotoForId(salida.id)})` }}
              />
              {/* Degradado para oscurecer imagen de abajo hacia arriba */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F0A] via-[#0A0F0A]/90 to-[#0A0F0A]/30 z-0" />

              <div className="relative z-10 flex justify-between items-start">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#EAF2EC]/80 drop-shadow-md">
                  {salida.tipo_viaje?.replace(/_/g, ' ') || 'Trekking'}
                </span>
                <BadgeStatus estado={salida.estadoEfectivo} />
              </div>

              <div className="relative z-10">
                <h4 className="text-lg font-bold tracking-tight text-white leading-snug group-hover:text-[#5CE6A0] transition-colors duration-200 line-clamp-2 drop-shadow-lg">
                  {salida.nombre}
                </h4>
                <div className="flex items-center gap-2 text-xs font-medium text-[#EAF2EC]/80 mt-2 drop-shadow-md">
                  <span className="truncate">{salida.destino}</span>
                  <span className="w-1 h-1 rounded-full bg-white/30 shrink-0" />
                  <span className="shrink-0">{fmtFechaShort(salida.fecha_inicio)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}


    </div>
  )
}
