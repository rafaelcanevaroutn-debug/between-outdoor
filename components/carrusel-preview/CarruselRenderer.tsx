'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import type { FormatoCarrusel, SlideCarrusel } from '@/types'
import { gradientePorFormato, type GradientePreset } from './gradientes'

interface CarruselRendererProps {
  formatoCarrusel: FormatoCarrusel | null
  slides: SlideCarrusel[]
  activeIndex: number
  onIndexChange?: (index: number) => void

  variant?: 'full' | 'thumbnail'
  // URLs ya renderizadas por Mati (una por slide, en orden). Si hay
  // imagen para un slide, reemplaza el placeholder de degradé — Mati
  // ya quema el copy en el render, así que no se vuelve a superponer.
  renderedImages?: string[]
}

const MOUNTAIN_CLIP = 'polygon(0% 100%, 0% 58%, 16% 72%, 32% 42%, 48% 64%, 66% 30%, 82% 60%, 100% 46%, 100% 100%)'

// Renderer único de un carrusel. Modo 'full' = post real navegable a
// swipe con dots abajo (drilldown). Modo 'thumbnail' = celda de grid
// estilo perfil de Instagram, solo portada + pill_text mínimo.
export default function CarruselRenderer({
  formatoCarrusel,
  slides,
  activeIndex,
  onIndexChange,
  variant = 'full',
  renderedImages,
}: CarruselRendererProps) {
  const gradiente = gradientePorFormato(formatoCarrusel)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const [dragDeltaX, setDragDeltaX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  if (variant === 'thumbnail') {
    const cover = slides[0]
    if (!cover) return null
    const coverImage = renderedImages?.[0]
    if (coverImage) {
      return (
        <div className="relative w-full overflow-hidden rounded-[8px]" style={{ aspectRatio: '4 / 5' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image src={coverImage} alt={cover.texto_principal ?? 'Render'} fill sizes="(max-width: 768px) 50vw, 300px" className="object-cover" unoptimized priority={true} />
        </div>
      )
    }
    return (
      <div className="relative w-full overflow-hidden rounded-[8px] flex flex-col justify-end p-2.5" style={{ aspectRatio: '4 / 5', background: gradiente.background }}>
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: '46%', background: gradiente.mountain, clipPath: MOUNTAIN_CLIP }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0) 100%)' }}
        />

        <div className="relative z-10 flex flex-col gap-1.5">
          {(cover.pill_text || cover.hablante) && (
            <span
              className="self-start text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#FBBF6B' }}
            >
              {cover.pill_text || cover.hablante}
            </span>
          )}
          {cover.texto_principal && (
            <p className="text-[12px] font-bold leading-tight" style={{ color: '#FFFFFF' }}>
              {cover.texto_principal}
            </p>
          )}
        </div>
      </div>
    )
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (slides.length <= 1) return
    dragStartX.current = e.clientX
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return
    let delta = e.clientX - dragStartX.current
    if (activeIndex === 0 && delta > 0) delta *= 0.35
    if (activeIndex === slides.length - 1 && delta < 0) delta *= 0.35
    setDragDeltaX(delta)
  }

  function endDrag() {
    if (!isDragging) return
    setIsDragging(false)
    const width = trackRef.current?.getBoundingClientRect().width ?? 1
    const threshold = width * 0.18
    if (dragDeltaX <= -threshold && activeIndex < slides.length - 1) {
      onIndexChange?.(activeIndex + 1)
    } else if (dragDeltaX >= threshold && activeIndex > 0) {
      onIndexChange?.(activeIndex - 1)
    }
    setDragDeltaX(0)
  }

  return (
    <div className="flex flex-col w-full">
      <div
        ref={trackRef}
        className="relative w-full overflow-hidden rounded-[12px] shrink-0"
        style={{ aspectRatio: '4 / 5', touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(calc(${-activeIndex * 100}% + ${dragDeltaX}px))`,
            transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {slides.map((slide, i) => (
            <div key={slide.n_slide} className="relative h-full flex-shrink-0" style={{ width: '100%' }}>
              <SlideVisual slide={slide} gradiente={gradiente} imageUrl={renderedImages?.[i]} />
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {slides.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === activeIndex ? 6 : 5,
                height: i === activeIndex ? 6 : 5,
                backgroundColor: i === activeIndex ? '#EAF2EC' : '#3A5040',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SlideVisual({ slide, gradiente, imageUrl }: { slide: SlideCarrusel; gradiente: GradientePreset; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Image src={imageUrl} alt={slide.texto_principal ?? 'Slide renderizado'} fill sizes="(max-width: 768px) 100vw, 500px" className="object-cover" unoptimized />
      </div>
    )
  }

  return (
    <div className="absolute inset-0" style={{ background: gradiente.background }}>
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: '42%', background: gradiente.mountain, clipPath: MOUNTAIN_CLIP }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.05) 42%, rgba(0,0,0,0.22) 100%)' }}
      />
      <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col gap-2.5">
        {(slide.pill_text || slide.hablante) && (
          <span
            className="self-start text-[12px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#FBBF6B' }}
          >
            {slide.pill_text || slide.hablante}
          </span>
        )}
        {slide.subtitle_highlight && (
          <span
            className="self-start text-[12px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#FDBA74' }}
          >
            {slide.subtitle_highlight}
          </span>
        )}
        {slide.texto_principal ? (
          <p className="text-[24px] font-bold leading-[1.2] whitespace-pre-line mb-1" style={{ color: '#FFFFFF' }}>
            {slide.texto_principal}
          </p>
        ) : (
          <p className="text-[14px] italic mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Solo foto — {slide.indicacion_imagen}
          </p>
        )}
        {slide.texto_apoyo && (
          <p className="text-[14.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {slide.texto_apoyo}
          </p>
        )}
      </div>
    </div>
  )
}
