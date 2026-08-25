import BetweenLogo from '@/components/branding/BetweenLogo'

export default function AuthBrandPanel() {
  return (
    <aside className="relative hidden min-h-[calc(100vh-32px)] overflow-hidden rounded-[30px] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16" style={{ background: 'linear-gradient(145deg, #161915 0%, #243329 58%, #3E5C48 125%)', boxShadow: '0 30px 80px rgba(22,25,21,.18)' }}>
      <img src="/assets/2d/contour.svg" alt="" aria-hidden className="pointer-events-none absolute -right-28 -top-16 h-[76%] w-[92%] object-cover opacity-[.09] invert" />
      <div className="absolute -bottom-44 -right-36 h-[430px] w-[430px] rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10">
        <BetweenLogo width={142} tone="inverse" priority />
      </div>

      <div className="relative z-10 max-w-[590px]">
        <div className="mb-5 text-[11px] font-semibold uppercase tracking-[.18em] text-[#B9CABB]">Contenido para turismo de aventura</div>
        <h2 className="text-[46px] font-semibold leading-[.98] tracking-[-.055em] text-white xl:text-[58px]">
          Tu próxima salida ya tiene una historia.
        </h2>
        <p className="mt-6 max-w-[500px] text-[16px] leading-relaxed text-white/60">
          Between transforma fotos, fechas, cupos y experiencia real en contenido listo para publicar.
        </p>
      </div>

      <div className="relative z-10 flex flex-wrap gap-x-7 gap-y-2 text-[12px] font-medium text-white/45">
        <span>Videos</span>
        <span>Flyers</span>
        <span>Carruseles</span>
        <span>Calendario semanal</span>
      </div>
    </aside>
  )
}
