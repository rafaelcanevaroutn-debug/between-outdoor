'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Layers } from 'lucide-react'
import type { ContenidoGenerado } from '@/types'
import CarruselRenderer from './CarruselRenderer'
import CarruselDrilldownModal from './CarruselDrilldownModal'
import { estaRenderizada, metaDeEstado } from './renderStatus'
import { getRenderImageUrls } from '@/lib/render-images-client'
import { effectiveCarouselSlideCount } from '@/lib/effective-carousel-slides'

interface CarruselFeedGridGroup {
  salidaId: string
  salidaNombre: string
  contenido: ContenidoGenerado[]
}

interface CarruselFeedGridProps {
  groups: CarruselFeedGridGroup[]
}

type PiezaConSlides = ContenidoGenerado & { slides_data: NonNullable<ContenidoGenerado['slides_data']> }

function piezasDeGrupo(contenido: ContenidoGenerado[]): PiezaConSlides[] {
  return contenido.filter(
    (item): item is PiezaConSlides =>
      Boolean(item.formato_carrusel) && Array.isArray(item.slides_data) && item.slides_data.length > 0,
  )
}

// NÃºmero decorativo estable por pieza (no Math.random() â€” no debe
// cambiar entre renders). Puramente estÃ©tico, sin relaciÃ³n con datos reales.
function likesDecorativos(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 89
  return 6 + hash
}

// Vista feed de toda la semana â€” grid denso estilo perfil de Instagram
// (miniaturas cuadradas, varias por fila), agrupado por salida. Solo
// lectura: agrupa lo que ya viene cargado, sin escritura propia. Para
// piezas ya renderizadas por Mati (render_folder_id), precarga las
// imÃ¡genes reales una sola vez y las reusa en el thumbnail y el drilldown.
export default function CarruselFeedGrid({ groups }: CarruselFeedGridProps) {
  const [active, setActive] = useState<{ item: PiezaConSlides; salidaNombre: string } | null>(null)
  const [renderedByPieza, setRenderedByPieza] = useState<Record<string, string[]>>({})
  const [aprobacionOverrides, setAprobacionOverrides] = useState<Record<string, Pick<ContenidoGenerado, 'render_status' | 'approved_at' | 'approved_by'>>>({})
  const requestedRef = useRef<Set<string>>(new Set())

  const gruposConPiezas = useMemo(
    () => groups
      .map(group => ({
        ...group,
        piezas: piezasDeGrupo(group.contenido).map(pieza =>
          aprobacionOverrides[pieza.id] ? { ...pieza, ...aprobacionOverrides[pieza.id] } : pieza,
        ),
      }))
      .filter(group => group.piezas.length > 0),
    [groups, aprobacionOverrides],
  )

  function handleApproved(id: string, updates: Pick<ContenidoGenerado, 'render_status' | 'approved_at' | 'approved_by'>) {
    setAprobacionOverrides(prev => ({ ...prev, [id]: updates }))
    setActive(prev => prev && prev.item.id === id ? { ...prev, item: { ...prev.item, ...updates } } : prev)
  }

  useEffect(() => {
    const piezasARenderizar = gruposConPiezas
      .flatMap(group => group.piezas)
      .filter(pieza => pieza.render_folder_id && !requestedRef.current.has(pieza.id))

    if (piezasARenderizar.length === 0) return
    piezasARenderizar.forEach(pieza => requestedRef.current.add(pieza.id))

    let cancelled = false
    Promise.all(
      piezasARenderizar.map(async pieza => {
        try {
          const urls = await getRenderImageUrls(pieza.render_folder_id!)
          return [pieza.id, urls] as const
        } catch (err) {
          console.error('[CarruselFeedGrid] no se pudieron cargar los renders de', pieza.render_folder_id, err)
          return [pieza.id, [] as string[]] as const
        }
      }),
    ).then(entries => {
      if (cancelled) return
      setRenderedByPieza(prev => {
        const next = { ...prev }
        for (const [id, urls] of entries) if (urls.length > 0) next[id] = urls
        return next
      })
    })

    return () => { cancelled = true }
  }, [gruposConPiezas])

  if (gruposConPiezas.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: 'var(--piedra)' }}>
        TodavÃ­a no hay carruseles con slides estructurados para mostrar acÃ¡.
      </p>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {gruposConPiezas.map(group => (
          <div key={group.salidaId} className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold"
                style={{ backgroundColor: 'rgba(62, 92, 72, 0.15)', color: 'var(--cardon)' }}
              >
                {group.salidaNombre.trim().charAt(0).toUpperCase() || '?'}
              </div>
              <p className="text-[13px] font-semibold" style={{ color: '#EAF2EC' }}>{group.salidaNombre}</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-0.5">
              {group.piezas.map(item => {
                const slideCount = effectiveCarouselSlideCount(item.slides_data, renderedByPieza[item.id]?.length)
                return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive({ item, salidaNombre: group.salidaNombre })}
                  className="group relative"
                >
                  <CarruselRenderer
                    formatoCarrusel={item.formato_carrusel}
                    slides={item.slides_data}
                    activeIndex={0}
                    variant="thumbnail"
                    renderedImages={renderedByPieza[item.id]}
                  />
                  {!estaRenderizada(item) && (
                    <span
                      className="absolute top-1.5 left-1.5 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: metaDeEstado(item).color }}
                    >
                      {metaDeEstado(item).label}
                    </span>
                  )}
                  {slideCount > 1 && (
                    <span
                      className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                      style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: '#FFFFFF' }}
                    >
                      <Layers className="w-2.5 h-2.5" />
                      {slideCount}
                    </span>
                  )}
                  <span
                    className="absolute inset-0 rounded-[8px] pointer-events-none flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                  >
                    <span className="flex items-center gap-1 text-white text-[12px] font-semibold">
                      <Heart className="w-3.5 h-3.5 fill-white" />
                      {likesDecorativos(item.id)}
                    </span>
                    {slideCount > 1 && (
                      <span className="flex items-center gap-1 text-white text-[12px] font-semibold">
                        <Layers className="w-3.5 h-3.5" />
                        {slideCount}
                      </span>
                    )}
                  </span>
                </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {active && (
        <CarruselDrilldownModal
          item={active.item}
          salidaNombre={active.salidaNombre}
          renderedImages={renderedByPieza[active.item.id]}
          onApproved={handleApproved}
          onClose={() => setActive(null)}
        />
      )}
    </>
  )
}
