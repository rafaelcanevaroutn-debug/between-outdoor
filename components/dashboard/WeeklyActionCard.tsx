'use client'

import Link from 'next/link'

export function WeeklyActionCard() {
  return (
    <div className="flex flex-col gap-5">
      <section className="relative min-h-[310px] overflow-hidden rounded-[28px] border border-black/5 px-7 py-8 sm:px-10 sm:py-10" style={{ background: 'linear-gradient(128deg, #161915 0%, #243329 55%, #3E5C48 120%)', boxShadow: '0 28px 70px rgba(22,25,21,.18)' }}>
        <img src="/assets/2d/contour.svg" alt="" aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[155%] w-[68%] object-cover opacity-[.09] invert" />
        <div className="absolute -right-20 bottom-[-130px] h-[300px] w-[300px] rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex min-h-[230px] max-w-[650px] flex-col justify-between">
          <div>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[.16em] text-[#B9CABB]">Tu calendario inteligente</div>
            <h2 className="max-w-[610px] text-[32px] font-semibold leading-[1.02] tracking-[-.045em] text-white sm:text-[42px]">
              De tus salidas a una semana lista para publicar.
            </h2>
            <p className="mt-4 max-w-[540px] text-[14px] leading-relaxed text-white/62 sm:text-[15px]">
              Between cruza fechas, cupos, fotos y objetivos para decidir qué conviene comunicar ahora.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/calendario" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[var(--tinta)] shadow-lg transition-transform hover:-translate-y-0.5">
              Generar mi semana
              <span aria-hidden>→</span>
            </Link>
            <Link href="/salidas" className="inline-flex items-center rounded-full border border-white/18 px-5 py-3 text-[14px] font-medium text-white/78 transition-colors hover:bg-white/8 hover:text-white">
              Revisar salidas
            </Link>
          </div>
        </div>
      </section>

      <section className="grid overflow-hidden rounded-[22px] border border-[var(--linea)] bg-white/65 shadow-[var(--sombra-reposo)] sm:grid-cols-3">
        {[
          ['01', 'Material real', 'Fotos, videos y datos de tus salidas.'],
          ['02', 'Prioridad comercial', 'Between detecta qué necesita impulso.'],
          ['03', 'Contenido listo', 'Revisás, aprobás y publicás.'],
        ].map(([number, title, copy], index) => (
          <div key={number} className={`p-6 ${index > 0 ? 'border-t border-[var(--linea)] sm:border-l sm:border-t-0' : ''}`}>
            <div className="text-[10px] font-semibold tracking-[.14em] text-[var(--cardon)]">{number}</div>
            <h3 className="mt-3 text-[17px] font-semibold text-[var(--tinta)]">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--piedra)]">{copy}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
