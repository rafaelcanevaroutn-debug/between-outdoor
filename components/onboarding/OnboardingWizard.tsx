'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
import BetweenLogo from '@/components/branding/BetweenLogo'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Answers {
  full_name: string
  company_name: string
  avatar_edad_genero: string
  avatar_experiencia: string
  avatar_objeciones: string
  avatar_motor: string[]
  marca_personalidad: string
  marca_lineas_rojas: string
  marca_autoridad: string
  marca_testimonios: string
  objetivos_corto_plazo: string
  servicios_estrella: string
  servicios_moneda: string
  calendario: string
  embudo_paso: string
  material_visual: string[]
}

interface UIChipField {
  sel: string[]
  otro: string
}

interface UIState {
  objeciones: UIChipField
  lineas_rojas: UIChipField
  autoridad: UIChipField
  objetivos: UIChipField
  test_chip: string
  test_det: string
}

interface Props {
  firstName: string
  initialProfile: { full_name: string | null; company_name: string | null }
  initialAnswers: Partial<Answers> | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildChipText(sel: string[], otro: string): string {
  const parts = [...sel, ...(otro.trim() ? [otro.trim()] : [])]
  return parts.join(' · ')
}

function parseTestimonios(raw: string): { chip: string; det: string } {
  const idx = raw.indexOf('|')
  if (idx === -1) return { chip: raw, det: '' }
  return { chip: raw.slice(0, idx), det: raw.slice(idx + 1) }
}

function parseInitialChipField(stored?: string | null): UIChipField {
  if (!stored) return { sel: [], otro: '' }
  const parts = stored.split(' · ').map(p => p.trim()).filter(Boolean)
  return { sel: parts, otro: '' }
}

// ─── Option Sets ────────────────────────────────────────────────────────────

const OBJECIONES_OPTS = [
  { value: 'No tengo con quién ir', label: 'No tengo con quién ir' },
  { value: 'Me queda lejos', label: 'Me queda lejos' },
  { value: 'No estoy en forma', label: 'No estoy en forma' },
  { value: 'Es caro', label: 'Es caro' },
  { value: 'Falta de tiempo', label: 'Falta de tiempo' },
  { value: 'No conozco a nadie', label: 'No conozco a nadie' },
  { value: 'Dudas de seguridad', label: 'Dudas de seguridad' },
  { value: 'Miedo a no poder', label: 'Miedo a no poder' },
]

const LINEAS_ROJAS_OPTS = [
  { value: 'Política o religión', label: 'Política o religión' },
  { value: 'Lenguaje vulgar', label: 'Lenguaje vulgar' },
  { value: 'Promesas exageradas', label: 'Promesas exageradas' },
  { value: 'Comparar con competencia', label: 'Comparar con competencia' },
  { value: 'Precios a la vista', label: 'Precios a la vista' },
  { value: 'Contenido negativo', label: 'Contenido negativo' },
]

const AUTORIDAD_OPTS = [
  { value: 'Guía certificado', label: 'Guía certificado' },
  { value: 'Prof. de Ed. Física', label: 'Prof. de Ed. Física' },
  { value: 'Años de experiencia', label: 'Años de experiencia' },
  { value: 'Prestador registrado', label: 'Prestador registrado' },
  { value: 'Rescatista', label: 'Rescatista' },
  { value: 'Primeros auxilios', label: 'Primeros auxilios' },
]

const OBJETIVOS_OPTS = [
  { value: 'Llenar cupos de una salida', label: 'Llenar cupos de una salida' },
  { value: 'Sumar alumnos al grupo', label: 'Sumar alumnos al grupo' },
  { value: 'Fidelizar comunidad', label: 'Fidelizar comunidad' },
  { value: 'Posicionar la marca', label: 'Posicionar la marca' },
  { value: 'Vender más alto ticket', label: 'Vender más alto ticket' },
]

const BLOCKS = [
  { label: 'Tu cliente ideal', num: 1, desc: 'Definí a quién le hablás para conectar con las personas indicadas.' },
  { label: 'Tu marca y voz', num: 2, desc: 'Establecé el tono, personalidad y límites de tu comunicación.' },
  { label: 'Tu oferta y calendario', num: 3, desc: 'Detallá tus servicios estrella, precios y próximas fechas.' },
  { label: 'Tu embudo y material', num: 4, desc: 'Definí cómo convertís a tus seguidores y qué recursos visuales tenés.' },
]

// ─── Sub-components ─────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[14px] font-bold text-[var(--tinta)] tracking-[-0.01em] mb-1.5">
      {children}
    </label>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12.5px] text-[var(--piedra)] leading-relaxed mb-3">
      {children}
    </p>
  )
}

function CustomTextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border border-[var(--linea)] bg-white text-[13.5px] text-[var(--tinta)] placeholder:text-stone-400 focus:outline-none focus:border-[var(--cardon)] focus:ring-4 focus:ring-[var(--cardon)]/10 transition-all shadow-xs"
    />
  )
}

function CustomTextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 rounded-xl border border-[var(--linea)] bg-white text-[13.5px] text-[var(--tinta)] placeholder:text-stone-400 focus:outline-none focus:border-[var(--cardon)] focus:ring-4 focus:ring-[var(--cardon)]/10 transition-all shadow-xs resize-y leading-relaxed font-sans"
    />
  )
}

function ChipSelector({
  options,
  selected,
  onToggle,
  multi = false,
}: {
  options: { value: string; label: string }[]
  selected: string | string[]
  onToggle: (v: string) => void
  multi?: boolean
}) {
  const isActive = (v: string) =>
    multi ? (selected as string[]).includes(v) : selected === v

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const active = isActive(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] transition-all cursor-pointer select-none ${
              active
                ? 'bg-[var(--cardon-tenue)] border border-[var(--cardon)] text-[var(--cardon-oscuro)] font-semibold shadow-xs'
                : 'bg-white border border-[var(--linea)] text-[var(--tinta)] font-normal hover:border-stone-300 hover:bg-stone-50/50'
            }`}
          >
            {active && <Check className="w-3.5 h-3.5 text-[var(--cardon)] stroke-[2.5]" />}
            <span>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function ChipsWithOtroField({
  options,
  field,
  ui,
  setUi,
  multi = true,
}: {
  options: { value: string; label: string }[]
  field: keyof Pick<UIState, 'objeciones' | 'lineas_rojas' | 'autoridad' | 'objetivos'>
  ui: UIState
  setUi: React.Dispatch<React.SetStateAction<UIState>>
  multi?: boolean
}) {
  function toggle(v: string) {
    setUi(prev => {
      const cur = prev[field]
      const sel = multi
        ? cur.sel.includes(v)
          ? cur.sel.filter(x => x !== v)
          : [...cur.sel, v]
        : cur.sel[0] === v
          ? []
          : [v]
      return { ...prev, [field]: { ...cur, sel } }
    })
  }

  const cur = ui[field]

  return (
    <div className="space-y-3">
      <ChipSelector
        options={options}
        selected={multi ? cur.sel : (cur.sel[0] ?? '')}
        onToggle={toggle}
        multi={multi}
      />
      <CustomTextInput
        value={cur.otro}
        onChange={v => setUi(prev => ({ ...prev, [field]: { ...prev[field], otro: v } }))}
        placeholder="Otro (opcional)..."
      />
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function OnboardingWizard({ firstName, initialProfile, initialAnswers }: Props) {
  const router = useRouter()
  const [block, setBlock] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedTest = parseTestimonios(initialAnswers?.marca_testimonios ?? '')

  const [answers, setAnswers] = useState<Answers>({
    full_name: initialProfile.full_name ?? '',
    company_name: initialProfile.company_name ?? '',
    avatar_edad_genero: initialAnswers?.avatar_edad_genero ?? '',
    avatar_experiencia: initialAnswers?.avatar_experiencia ?? '',
    avatar_objeciones: '',
    avatar_motor: initialAnswers?.avatar_motor ?? [],
    marca_personalidad: initialAnswers?.marca_personalidad ?? '',
    marca_lineas_rojas: '',
    marca_autoridad: '',
    marca_testimonios: '',
    objetivos_corto_plazo: '',
    servicios_estrella: initialAnswers?.servicios_estrella ?? '',
    servicios_moneda: initialAnswers?.servicios_moneda ?? 'USD',
    calendario: initialAnswers?.calendario ?? '',
    embudo_paso: initialAnswers?.embudo_paso ?? '',
    material_visual: initialAnswers?.material_visual ?? [],
  })

  const [ui, setUi] = useState<UIState>({
    objeciones: parseInitialChipField(initialAnswers?.avatar_objeciones),
    lineas_rojas: parseInitialChipField(initialAnswers?.marca_lineas_rojas),
    autoridad: parseInitialChipField(initialAnswers?.marca_autoridad),
    objetivos: parseInitialChipField(initialAnswers?.objetivos_corto_plazo),
    test_chip: parsedTest.chip,
    test_det: parsedTest.det,
  })

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  function toggleMulti(key: 'avatar_motor' | 'material_visual', value: string) {
    setAnswers(prev => {
      const arr = prev[key]
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })
  }

  function composeAnswers(): Answers {
    return {
      ...answers,
      avatar_objeciones: buildChipText(ui.objeciones.sel, ui.objeciones.otro),
      marca_lineas_rojas: buildChipText(ui.lineas_rojas.sel, ui.lineas_rojas.otro),
      marca_autoridad: buildChipText(ui.autoridad.sel, ui.autoridad.otro),
      objetivos_corto_plazo: buildChipText(ui.objetivos.sel, ui.objetivos.otro),
      marca_testimonios: ui.test_chip + (ui.test_det.trim() ? '|' + ui.test_det.trim() : ''),
    }
  }

  async function saveBlock(targetBlock: number, complete = false) {
    setSaving(true)
    setError(null)
    try {
      const composed = composeAnswers()
      const { full_name, company_name, ...onboardingAnswers } = composed
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: onboardingAnswers, profile: { full_name, company_name }, complete }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Error al guardar')
      }
      setBlock(targetBlock)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const progress = block >= 4 ? 100 : Math.round((block / 4) * 100)

  // ─── Completion Screen ──────────────────────────────────────────────────────
  if (block === 4) {
    return (
      <div
        className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden"
        style={{ backgroundColor: 'var(--nieve)' }}
      >
        {/* Glow ambient background */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(62, 92, 72, 0.12) 0%, transparent 70%)',
          }}
        />
        <img
          src="/contours.svg"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-[0.05] pointer-events-none mix-blend-screen"
        />

        <div className="relative z-10 w-full max-w-[480px] text-center">
          <div className="rounded-3xl p-8 sm:p-10 bg-white/85 backdrop-blur-xl border border-[var(--linea)] shadow-[0_20px_60px_rgba(22,25,21,0.08)]">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-6 bg-[var(--cardon)] text-white flex items-center justify-center shadow-[0_10px_25px_rgba(62,92,72,0.35)]">
              <Sparkles className="w-8 h-8 stroke-[2.2]" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold text-[var(--cardon)] bg-[var(--cardon-tenue)] mb-3">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Onboarding completado
            </span>

            <h1
              className="text-[28px] font-bold text-[var(--tinta)] mb-3 tracking-tight"
              style={{ fontFamily: 'var(--font-bricolage), sans-serif' }}
            >
              ¡Listo, {answers.full_name?.split(' ')[0] || firstName}!
            </h1>

            <p className="text-[14.5px] text-[var(--piedra)] mb-8 leading-relaxed">
              Ya tenemos todo lo necesario para crear contenido que hable con la voz única de tu marca y conecte con tu audiencia.
            </p>

            <button
              onClick={() => router.push('/salidas')}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[var(--cardon)] hover:bg-[var(--cardon-oscuro)] text-white text-[14px] font-semibold transition-all shadow-[0_4px_16px_rgba(62,92,72,0.25)] hover:shadow-[0_6px_22px_rgba(62,92,72,0.35)] cursor-pointer"
            >
              <span>Ir a mi espacio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Wizard Shell ───────────────────────────────────────────────────────────
  return (
    <div
      className="relative min-h-screen flex flex-col overflow-x-hidden"
      style={{ backgroundColor: 'var(--nieve)' }}
    >
      {/* Background ambient glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 800,
          height: 500,
          background: 'radial-gradient(ellipse at center, rgba(62, 92, 72, 0.08) 0%, transparent 70%)',
        }}
      />
      <img
        src="/contours.svg"
        alt=""
        aria-hidden
        className="fixed inset-0 w-full h-full object-cover opacity-[0.035] pointer-events-none mix-blend-screen"
      />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-20 border-b border-[var(--linea)] bg-[#FAFAF7]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: New Between Logo */}
        <div className="flex items-center gap-3">
          <BetweenLogo width={130} priority />
        </div>

        {/* Center: Step indicators */}
        <div className="flex-1 max-w-[420px] hidden sm:block">
          <div className="flex gap-1.5 mb-1.5">
            {BLOCKS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i < block
                    ? 'bg-[var(--cardon)]'
                    : i === block
                      ? 'bg-[var(--cardon)] ring-2 ring-[var(--cardon)]/20'
                      : 'bg-[var(--linea)]'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[11.5px] text-[var(--piedra)] font-medium">
            <span>Bloque {block + 1} de {BLOCKS.length} — {BLOCKS[block].label}</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Right: Mobile badge & Progress */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold text-[var(--cardon)] bg-[var(--cardon-tenue)]">
            Paso {block + 1} de {BLOCKS.length}
          </span>
        </div>
      </header>

      {/* Main Content Form Card */}
      <main className="relative z-10 flex-1 flex justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-[640px]">
          <div className="rounded-3xl p-6 sm:p-10 bg-white/80 backdrop-blur-xl border border-[var(--linea)] shadow-[0_16px_50px_rgba(22,25,21,0.05)]">

            {/* Header Block Info */}
            <div className="mb-8 pb-6 border-b border-[var(--linea)]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase text-[var(--cardon)] bg-[var(--cardon-tenue)] mb-2.5">
                Bloque {block + 1} • {BLOCKS[block].label}
              </span>
              <h2
                className="text-[24px] sm:text-[28px] font-bold text-[var(--tinta)] tracking-tight mb-2 leading-tight"
                style={{ fontFamily: 'var(--font-bricolage), sans-serif' }}
              >
                {block === 0 && `Hola ${firstName}, contanos sobre tu cliente ideal`}
                {block === 1 && 'La personalidad y voz de tu marca'}
                {block === 2 && 'Tu oferta, precios y calendario'}
                {block === 3 && 'Cómo convertís y con qué material trabajás'}
              </h2>
              <p className="text-[13.5px] text-[var(--piedra)] leading-relaxed m-0">
                {BLOCKS[block].desc}
              </p>
            </div>

            {/* ── BLOCK 1 ── */}
            {block === 0 && (
              <div className="space-y-7">
                <div>
                  <FieldLabel>Nombre completo</FieldLabel>
                  <FieldHint>Tu nombre y apellido — aparece en tu perfil.</FieldHint>
                  <CustomTextInput
                    value={answers.full_name}
                    onChange={v => set('full_name', v)}
                    placeholder="Ej: Renzo García"
                  />
                </div>

                <div>
                  <FieldLabel>Nombre de tu marca o emprendimiento</FieldLabel>
                  <FieldHint>Cómo aparece en redes o ante tus clientes.</FieldHint>
                  <CustomTextInput
                    value={answers.company_name}
                    onChange={v => set('company_name', v)}
                    placeholder="Ej: Patagonia Trips, Renzo Outdoor..."
                  />
                </div>

                <div>
                  <FieldLabel>1. ¿Quién es tu cliente ideal?</FieldLabel>
                  <FieldHint>
                    Ej: Mujeres y hombres de 28 a 45 años, profesionales con poco tiempo, que buscan desconectarse los fines de semana.
                  </FieldHint>
                  <CustomTextInput
                    value={answers.avatar_edad_genero}
                    onChange={v => set('avatar_edad_genero', v)}
                    placeholder="Rango etario, género predominante, perfil general..."
                  />
                </div>

                <div>
                  <FieldLabel>2. Nivel de experiencia o condición física</FieldLabel>
                  <FieldHint>¿Cómo llegan tus clientes antes de contratar?</FieldHint>
                  <ChipSelector
                    options={[
                      { value: 'Principiante', label: 'Principiante' },
                      { value: 'Intermedio', label: 'Intermedio' },
                      { value: 'Avanzado', label: 'Avanzado' },
                      { value: 'Mixto / varía', label: 'Mixto / varía' },
                    ]}
                    selected={answers.avatar_experiencia}
                    onToggle={v => set('avatar_experiencia', v)}
                  />
                </div>

                <div>
                  <FieldLabel>3. Miedos y objeciones antes de contratar</FieldLabel>
                  <FieldHint>¿Qué frena a alguien antes de inscribirse? Elegí todos los que escuchás.</FieldHint>
                  <ChipsWithOtroField
                    options={OBJECIONES_OPTS}
                    field="objeciones"
                    ui={ui}
                    setUi={setUi}
                    multi
                  />
                </div>

                <div>
                  <FieldLabel>4. ¿Cuál es el motor real de tu cliente?</FieldLabel>
                  <FieldHint>¿Por qué te elige en el fondo? Podés elegir más de uno.</FieldHint>
                  <ChipSelector
                    multi
                    options={[
                      { value: 'Pertenecer a una comunidad', label: 'Pertenecer a una comunidad' },
                      { value: 'Superarse a sí mismo', label: 'Superarse a sí mismo' },
                      { value: 'Desconectar del estrés', label: 'Desconectar del estrés' },
                      { value: 'Aventura pura', label: 'Aventura pura' },
                    ]}
                    selected={answers.avatar_motor}
                    onToggle={v => toggleMulti('avatar_motor', v)}
                  />
                </div>
              </div>
            )}

            {/* ── BLOCK 2 ── */}
            {block === 1 && (
              <div className="space-y-7">
                <div>
                  <FieldLabel>5. Si tu marca fuera una persona, ¿cómo sería?</FieldLabel>
                  <FieldHint>
                    Ej: Un guía experimentado que habla directo, sin poses. Cercano, apasionado, con humor seco. No vende, comparte.
                  </FieldHint>
                  <CustomTextArea
                    value={answers.marca_personalidad}
                    onChange={v => set('marca_personalidad', v)}
                    placeholder="Describí la personalidad, tono y estilo que querés transmitir..."
                    rows={4}
                  />
                </div>

                <div>
                  <FieldLabel>6. Líneas rojas: ¿qué NO querés para tu marca?</FieldLabel>
                  <FieldHint>Marcá los temas o estilos que querés evitar en tu comunicación.</FieldHint>
                  <ChipsWithOtroField
                    options={LINEAS_ROJAS_OPTS}
                    field="lineas_rojas"
                    ui={ui}
                    setUi={setUi}
                    multi
                  />
                </div>

                <div>
                  <FieldLabel>7. Certificaciones, experiencia o trayectoria</FieldLabel>
                  <FieldHint>¿Con qué avales contás? Elegí los que aplican.</FieldHint>
                  <ChipsWithOtroField
                    options={AUTORIDAD_OPTS}
                    field="autoridad"
                    ui={ui}
                    setUi={setUi}
                    multi
                  />
                </div>

                <div>
                  <FieldLabel>8. ¿Tenés testimonios, fotos o videos de clientes?</FieldLabel>
                  <FieldHint>El material que ya tenés define qué tipo de prueba social podemos usar.</FieldHint>
                  <ChipSelector
                    options={[
                      { value: 'bastante', label: 'Sí, bastante material' },
                      { value: 'algo', label: 'Algo, no mucho' },
                      { value: 'poco', label: 'Poco por ahora' },
                    ]}
                    selected={ui.test_chip}
                    onToggle={v => setUi(prev => ({ ...prev, test_chip: v }))}
                  />
                  {ui.test_chip && ui.test_chip !== 'poco' && (
                    <div className="mt-3">
                      <CustomTextArea
                        value={ui.test_det}
                        onChange={v => setUi(prev => ({ ...prev, test_det: v }))}
                        placeholder="Describí brevemente qué tipo de material tenés y en qué formato..."
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── BLOCK 3 ── */}
            {block === 2 && (
              <div className="space-y-7">
                <div>
                  <FieldLabel>9. Objetivos comerciales a corto plazo</FieldLabel>
                  <FieldHint>¿Qué querés lograr en los próximos 3 meses? Podés elegir varios.</FieldHint>
                  <ChipsWithOtroField
                    options={OBJETIVOS_OPTS}
                    field="objetivos"
                    ui={ui}
                    setUi={setUi}
                    multi
                  />
                </div>

                <div>
                  <FieldLabel>10. Servicios / productos estrella y sus precios</FieldLabel>
                  <FieldHint>Listá tus 2 a 4 servicios principales con precio referencial.</FieldHint>

                  {/* Currency selector toggle */}
                  <div className="flex gap-2 mb-3">
                    {['USD', 'ARS'].map(cur => (
                      <button
                        key={cur}
                        type="button"
                        onClick={() => set('servicios_moneda', cur)}
                        className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                          answers.servicios_moneda === cur
                            ? 'bg-[var(--cardon-tenue)] border border-[var(--cardon)] text-[var(--cardon-oscuro)] shadow-xs'
                            : 'bg-white border border-[var(--linea)] text-[var(--piedra)] hover:border-stone-300'
                        }`}
                      >
                        {cur}
                      </button>
                    ))}
                  </div>

                  <CustomTextArea
                    value={answers.servicios_estrella}
                    onChange={v => set('servicios_estrella', v)}
                    placeholder={`Ej: Trekking de un día ${answers.servicios_moneda === 'ARS' ? '$' : 'USD '}40, fin de semana ${answers.servicios_moneda === 'ARS' ? '$' : 'USD '}150...`}
                    rows={4}
                  />
                </div>

                <div>
                  <FieldLabel>11. Calendario de salidas o fechas clave</FieldLabel>
                  <FieldHint>Las salidas, eventos o carreras que tenés en los próximos 3 a 6 meses.</FieldHint>
                  <CustomTextArea
                    value={answers.calendario}
                    onChange={v => set('calendario', v)}
                    placeholder="Ej: Julio: Cerro Tronador 12 y 26 / Agosto: Retiro Patagonia 9-13..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* ── BLOCK 4 ── */}
            {block === 3 && (
              <div className="space-y-7">
                <div>
                  <FieldLabel>12. Cuando alguien se interesa, ¿qué paso querés que dé?</FieldLabel>
                  <FieldHint>¿Cuál es tu canal principal de conversión hoy?</FieldHint>
                  <ChipSelector
                    options={[
                      { value: 'whatsapp', label: 'WhatsApp directo' },
                      { value: 'bio', label: 'Link en bio' },
                      { value: 'comentario', label: 'Comentar en el post' },
                      { value: 'dm', label: 'DM de Instagram' },
                      { value: 'formulario', label: 'Formulario web' },
                    ]}
                    selected={answers.embudo_paso}
                    onToggle={v => set('embudo_paso', v)}
                  />
                </div>

                <div>
                  <FieldLabel>13. ¿Con qué material visual contás regularmente?</FieldLabel>
                  <FieldHint>Marcá todo lo que tenés o podés conseguir. Podés elegir varios.</FieldHint>
                  <ChipSelector
                    multi
                    options={[
                      { value: 'fotos_salidas', label: 'Fotos de salidas/eventos' },
                      { value: 'videos_accion', label: 'Videos en acción' },
                      { value: 'testimonios', label: 'Testimonios en cámara' },
                      { value: 'paisajes', label: 'Paisajes/lugares' },
                      { value: 'persona_camara', label: 'Persona a cámara' },
                      { value: 'grupo', label: 'Grupo/comunidad' },
                    ]}
                    selected={answers.material_visual}
                    onToggle={v => toggleMulti('material_visual', v)}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            {/* Navigation Actions */}
            <div className="flex items-center gap-3 mt-10 pt-6 border-t border-[var(--linea)]">
              {block > 0 && (
                <button
                  type="button"
                  onClick={() => setBlock(b => b - 1)}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[var(--linea)] bg-white hover:bg-stone-50 text-[var(--tinta)] text-[13.5px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const isLast = block === 3
                  saveBlock(isLast ? 4 : block + 1, isLast)
                }}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[var(--cardon)] hover:bg-[var(--cardon-oscuro)] text-white text-[13.5px] font-semibold transition-all shadow-[0_4px_16px_rgba(62,92,72,0.25)] hover:shadow-[0_6px_20px_rgba(62,92,72,0.35)] cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : block === 3 ? (
                  <>
                    <span>Finalizar</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Siguiente</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
