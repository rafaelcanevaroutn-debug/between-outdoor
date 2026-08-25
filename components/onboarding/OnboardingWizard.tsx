'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Answers {
  full_name:             string
  company_name:          string
  avatar_edad_genero:    string
  avatar_experiencia:    string
  avatar_objeciones:     string  // chips joined + otro
  avatar_motor:          string[]
  marca_personalidad:    string
  marca_lineas_rojas:    string  // chips joined + otro
  marca_autoridad:       string  // chips joined + otro
  marca_testimonios:     string  // '{chip}|{detail}'
  objetivos_corto_plazo: string  // chips joined + otro
  servicios_estrella:    string
  servicios_moneda:      string
  calendario:            string
  embudo_paso:           string
  material_visual:       string[]
}

// UI-only state for chip+text fields (not stored directly in DB)
interface UIChipField {
  sel:  string[]
  otro: string
}

interface UIState {
  objeciones:   UIChipField
  lineas_rojas: UIChipField
  autoridad:    UIChipField
  objetivos:    UIChipField
  test_chip:    string   // Q8 chip selection
  test_det:     string   // Q8 detail text
}

interface Props {
  firstName:      string
  initialProfile: { full_name: string | null; company_name: string | null }
  initialAnswers: Partial<Answers> | null
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildChipText(sel: string[], otro: string): string {
  const parts = [...sel, ...(otro.trim() ? [otro.trim()] : [])]
  return parts.join(' Â· ')
}

function parseTestimonios(raw: string): { chip: string; det: string } {
  const idx = raw.indexOf('|')
  if (idx === -1) return { chip: raw, det: '' }
  return { chip: raw.slice(0, idx), det: raw.slice(idx + 1) }
}

// â”€â”€â”€ Chip option sets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const OBJECIONES_OPTS = [
  { value: 'no_acompaÃ±ante', label: 'No tengo con quiÃ©n ir' },
  { value: 'lejos',          label: 'Me queda lejos' },
  { value: 'forma_fisica',   label: 'No estoy en forma' },
  { value: 'caro',           label: 'Es caro' },
  { value: 'tiempo',         label: 'Falta de tiempo' },
  { value: 'no_conozco',     label: 'No conozco a nadie' },
  { value: 'seguridad',      label: 'Dudas de seguridad' },
  { value: 'miedo_no_poder', label: 'Miedo a no poder' },
]

const LINEAS_ROJAS_OPTS = [
  { value: 'politica',    label: 'PolÃ­tica o religiÃ³n' },
  { value: 'lenguaje',    label: 'Lenguaje vulgar' },
  { value: 'promesas',    label: 'Promesas exageradas' },
  { value: 'competencia', label: 'Comparar con competencia' },
  { value: 'precios',     label: 'Precios a la vista' },
  { value: 'negativo',    label: 'Contenido negativo' },
]

const AUTORIDAD_OPTS = [
  { value: 'guia_cert',   label: 'GuÃ­a certificado' },
  { value: 'prof_ef',     label: 'Prof. de Ed. FÃ­sica' },
  { value: 'experiencia', label: 'AÃ±os de experiencia' },
  { value: 'prestador',   label: 'Prestador registrado' },
  { value: 'rescatista',  label: 'Rescatista' },
  { value: 'primeros_aux',label: 'Primeros auxilios' },
]

const OBJETIVOS_OPTS = [
  { value: 'llenar_cupos',  label: 'Llenar cupos de una salida' },
  { value: 'sumar_alumnos', label: 'Sumar alumnos al grupo' },
  { value: 'fidelizar',     label: 'Fidelizar comunidad' },
  { value: 'posicionar',    label: 'Posicionar la marca' },
  { value: 'high_ticket',   label: 'Vender mÃ¡s alto ticket' },
]

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--tinta)', margin: '0 0 4px', letterSpacing: '-.01em' }}>
      {children}
    </p>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12.5, color: 'var(--piedra)', margin: '0 0 12px', lineHeight: 1.5 }}>
      {children}
    </p>
  )
}

function TextArea({
  value, onChange, placeholder, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', padding: '10px 13px', borderRadius: 11,
        border: '1px solid var(--linea)', background: 'var(--nieve)',
        color: 'var(--tinta)', fontSize: 13, lineHeight: 1.6, resize: 'vertical',
        outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
      }}
    />
  )
}

function TextInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 13px', borderRadius: 11,
        border: '1px solid var(--linea)', background: 'var(--nieve)',
        color: 'var(--tinta)', fontSize: 13, outline: 'none',
        boxSizing: 'border-box', fontFamily: 'inherit',
      }}
    />
  )
}

function Chips({
  options, selected, onToggle, multi = false,
}: {
  options: { value: string; label: string }[]
  selected: string | string[]
  onToggle: (v: string) => void
  multi?: boolean
}) {
  const isActive = (v: string) =>
    multi ? (selected as string[]).includes(v) : selected === v

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => {
        const active = isActive(o.value)
        return (
          <button key={o.value} type="button" onClick={() => onToggle(o.value)} style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all .12s',
            border: active ? '1px solid var(--cardon)' : '1px solid var(--linea)',
            background: active ? 'var(--cardon-tenue)' : 'var(--nieve)',
            color: active ? 'var(--cardon)' : 'var(--piedra)',
            fontSize: 13, fontWeight: active ? 600 : 400,
          }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function OtroInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginTop: 10 }}>
      <TextInput value={value} onChange={onChange} placeholder="Otro (opcional)..." />
    </div>
  )
}

function ChipsWithOtro({
  options, field, ui, setUi, multi = true,
}: {
  options: { value: string; label: string }[]
  field: keyof Pick<UIState, 'objeciones' | 'lineas_rojas' | 'autoridad' | 'objetivos'>
  ui: UIState
  setUi: React.Dispatch<React.SetStateAction<UIState>>
  multi?: boolean
}) {
  function toggle(v: string) {
    setUi(prev => {
      const cur = prev[field] as UIChipField
      const sel = multi
        ? cur.sel.includes(v) ? cur.sel.filter(x => x !== v) : [...cur.sel, v]
        : cur.sel[0] === v ? [] : [v]
      return { ...prev, [field]: { ...cur, sel } }
    })
  }

  const cur = ui[field] as UIChipField

  return (
    <>
      <Chips
        options={options}
        selected={multi ? cur.sel : (cur.sel[0] ?? '')}
        onToggle={toggle}
        multi={multi}
      />
      <OtroInput
        value={cur.otro}
        onChange={v => setUi(prev => ({ ...prev, [field]: { ...(prev[field] as UIChipField), otro: v } }))}
      />
    </>
  )
}

const BLOCKS = [
  { label: 'Tu cliente ideal',       num: 1 },
  { label: 'Tu marca y voz',         num: 2 },
  { label: 'Tu oferta y calendario', num: 3 },
  { label: 'Tu embudo y material',   num: 4 },
]

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function OnboardingWizard({ firstName, initialProfile, initialAnswers }: Props) {
  const router = useRouter()
  const [block, setBlock] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedTest = parseTestimonios(initialAnswers?.marca_testimonios ?? '')

  const [answers, setAnswers] = useState<Answers>({
    full_name:             initialProfile.full_name    ?? '',
    company_name:          initialProfile.company_name ?? '',
    avatar_edad_genero:    initialAnswers?.avatar_edad_genero    ?? '',
    avatar_experiencia:    initialAnswers?.avatar_experiencia    ?? '',
    avatar_objeciones:     '',
    avatar_motor:          initialAnswers?.avatar_motor          ?? [],
    marca_personalidad:    initialAnswers?.marca_personalidad    ?? '',
    marca_lineas_rojas:    '',
    marca_autoridad:       '',
    marca_testimonios:     '',
    objetivos_corto_plazo: '',
    servicios_estrella:    initialAnswers?.servicios_estrella    ?? '',
    servicios_moneda:      initialAnswers?.servicios_moneda      ?? 'USD',
    calendario:            initialAnswers?.calendario            ?? '',
    embudo_paso:           initialAnswers?.embudo_paso           ?? '',
    material_visual:       initialAnswers?.material_visual       ?? [],
  })

  const [ui, setUi] = useState<UIState>({
    objeciones:   { sel: [], otro: initialAnswers?.avatar_objeciones    ?? '' },
    lineas_rojas: { sel: [], otro: initialAnswers?.marca_lineas_rojas   ?? '' },
    autoridad:    { sel: [], otro: initialAnswers?.marca_autoridad      ?? '' },
    objetivos:    { sel: [], otro: initialAnswers?.objetivos_corto_plazo ?? '' },
    test_chip: parsedTest.chip,
    test_det:  parsedTest.det,
  })

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  function toggleMulti(key: 'avatar_motor' | 'material_visual', value: string) {
    setAnswers(prev => {
      const arr = prev[key] as string[]
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })
  }

  // Compose DB values from UI state before saving
  function composeAnswers(): Answers {
    return {
      ...answers,
      avatar_objeciones:     buildChipText(ui.objeciones.sel,   ui.objeciones.otro),
      marca_lineas_rojas:    buildChipText(ui.lineas_rojas.sel, ui.lineas_rojas.otro),
      marca_autoridad:       buildChipText(ui.autoridad.sel,    ui.autoridad.otro),
      objetivos_corto_plazo: buildChipText(ui.objetivos.sel,    ui.objetivos.otro),
      marca_testimonios:     ui.test_chip + (ui.test_det.trim() ? '|' + ui.test_det.trim() : ''),
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

  // â”€â”€ Completion screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (block === 4) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 24px',
            background: 'linear-gradient(135deg,var(--cardon),var(--cardon-tenue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 32px -10px rgba(62, 92, 72, .6)',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#04130A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--tinta)', margin: '0 0 10px', letterSpacing: '-.03em' }}>
            Â¡Listo, {answers.full_name?.split(' ')[0] || firstName}!
          </h1>
          <p style={{ fontSize: 15, color: 'var(--piedra)', margin: '0 0 32px', lineHeight: 1.6 }}>
            Ya tenemos todo lo que necesitamos para crear contenido que hable con la voz de tu marca. PodÃ©s empezar ahora.
          </p>
          <button onClick={() => router.push('/salidas')} style={{
            padding: '13px 32px', borderRadius: 13, border: 'none',
            background: 'var(--cardon)', color: 'var(--nieve)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Ir a mi espacio â†’
          </button>
        </div>
      </div>
    )
  }

  // â”€â”€ Shell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid var(--linea)',
        display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
      }}>
        <Image src="/bo-symbol.png" alt="Between Outdoor" width={26} height={26} style={{ flexShrink: 0, width: 'auto', height: 'auto' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
            {BLOCKS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 4, transition: 'background .3s',
                background: i < block ? 'var(--cardon)' : i === block ? 'var(--cardon-tenue)' : 'var(--linea)',
              }} />
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--piedra)', margin: 0 }}>
            Bloque {block + 1} de {BLOCKS.length} â€” {BLOCKS[block].label}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--piedra)', flexShrink: 0 }}>{progress}%</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 56px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* Block heading */}
          <div style={{ marginBottom: 32 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
              color: 'var(--cardon)', display: 'block', marginBottom: 6,
            }}>
              Bloque {block + 1}
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--tinta)', margin: 0, letterSpacing: '-.02em' }}>
              {block === 0 && `Hola ${firstName}, contanos sobre tu cliente ideal`}
              {block === 1 && 'La personalidad y voz de tu marca'}
              {block === 2 && 'Tu oferta, precios y calendario'}
              {block === 3 && 'CÃ³mo convertÃ­s y con quÃ© material trabajÃ¡s'}
            </h2>
          </div>

          {/* â”€â”€ BLOCK 1 â”€â”€ */}
          {block === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <Label>Nombre completo</Label>
                <Hint>Tu nombre y apellido â€” aparece en tu perfil.</Hint>
                <TextInput
                  value={answers.full_name}
                  onChange={v => set('full_name', v)}
                  placeholder="Ej: Renzo GarcÃ­a"
                />
              </div>

              <div>
                <Label>Nombre de tu marca o emprendimiento</Label>
                <Hint>Como aparece en redes o ante tus clientes.</Hint>
                <TextInput
                  value={answers.company_name}
                  onChange={v => set('company_name', v)}
                  placeholder="Ej: Patagonia Trips, Renzo Outdoor..."
                />
              </div>

              <div>
                <Label>1. Â¿QuiÃ©n es tu cliente ideal?</Label>
                <Hint>Ej: Mujeres y hombres de 28 a 45 aÃ±os, profesionales con poco tiempo, que buscan desconectarse los fines de semana.</Hint>
                <TextInput
                  value={answers.avatar_edad_genero}
                  onChange={v => set('avatar_edad_genero', v)}
                  placeholder="Rango etario, gÃ©nero predominante, perfil general..."
                />
              </div>

              <div>
                <Label>2. Nivel de experiencia o condiciÃ³n fÃ­sica</Label>
                <Hint>Â¿CÃ³mo llegan tus clientes antes de contratar?</Hint>
                <Chips
                  options={[
                    { value: 'principiante', label: 'Principiante' },
                    { value: 'intermedio',   label: 'Intermedio' },
                    { value: 'avanzado',     label: 'Avanzado' },
                    { value: 'mixto',        label: 'Mixto / varÃ­a' },
                  ]}
                  selected={answers.avatar_experiencia}
                  onToggle={v => set('avatar_experiencia', v)}
                />
              </div>

              <div>
                <Label>3. Miedos y objeciones antes de contratar</Label>
                <Hint>Â¿QuÃ© frena a alguien antes de inscribirse? ElegÃ­ todos los que escuchÃ¡s.</Hint>
                <ChipsWithOtro options={OBJECIONES_OPTS} field="objeciones" ui={ui} setUi={setUi} multi />
              </div>

              <div>
                <Label>4. Â¿CuÃ¡l es el motor real de tu cliente?</Label>
                <Hint>Â¿Por quÃ© te elige en el fondo? PodÃ©s elegir mÃ¡s de uno.</Hint>
                <Chips
                  multi
                  options={[
                    { value: 'comunidad',   label: 'Pertenecer a una comunidad' },
                    { value: 'superarse',   label: 'Superarse a sÃ­ mismo' },
                    { value: 'desconectar', label: 'Desconectar del estrÃ©s' },
                    { value: 'aventura',    label: 'Aventura pura' },
                  ]}
                  selected={answers.avatar_motor}
                  onToggle={v => toggleMulti('avatar_motor', v)}
                />
              </div>
            </div>
          )}

          {/* â”€â”€ BLOCK 2 â”€â”€ */}
          {block === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <Label>5. Si tu marca fuera una persona, Â¿cÃ³mo serÃ­a?</Label>
                <Hint>Ej: Un guÃ­a experimentado que habla directo, sin poses. Cercano, apasionado, con humor seco. No vende, comparte.</Hint>
                <TextArea
                  value={answers.marca_personalidad}
                  onChange={v => set('marca_personalidad', v)}
                  placeholder="DescribÃ­ la personalidad, tono y estilo que querÃ©s transmitir..."
                  rows={4}
                />
              </div>

              <div>
                <Label>6. LÃ­neas rojas: Â¿quÃ© NO querÃ©s para tu marca?</Label>
                <Hint>MarcÃ¡ los temas o estilos que querÃ©s evitar en tu comunicaciÃ³n.</Hint>
                <ChipsWithOtro options={LINEAS_ROJAS_OPTS} field="lineas_rojas" ui={ui} setUi={setUi} multi />
              </div>

              <div>
                <Label>7. Certificaciones, experiencia o trayectoria</Label>
                <Hint>Â¿Con quÃ© avales contÃ¡s? ElegÃ­ los que aplican.</Hint>
                <ChipsWithOtro options={AUTORIDAD_OPTS} field="autoridad" ui={ui} setUi={setUi} multi />
              </div>

              <div>
                <Label>8. Â¿TenÃ©s testimonios, fotos o videos de clientes?</Label>
                <Hint>El material que ya tenÃ©s define quÃ© tipo de prueba social podemos usar.</Hint>
                <Chips
                  options={[
                    { value: 'bastante', label: 'SÃ­, bastante material' },
                    { value: 'algo',     label: 'Algo, no mucho' },
                    { value: 'poco',     label: 'Poco por ahora' },
                  ]}
                  selected={ui.test_chip}
                  onToggle={v => setUi(prev => ({ ...prev, test_chip: v }))}
                />
                {ui.test_chip && ui.test_chip !== 'poco' && (
                  <div style={{ marginTop: 12 }}>
                    <TextArea
                      value={ui.test_det}
                      onChange={v => setUi(prev => ({ ...prev, test_det: v }))}
                      placeholder="DescribÃ­ brevemente quÃ© tipo de material tenÃ©s y en quÃ© formato..."
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* â”€â”€ BLOCK 3 â”€â”€ */}
          {block === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <Label>9. Objetivos comerciales a corto plazo</Label>
                <Hint>Â¿QuÃ© querÃ©s lograr en los prÃ³ximos 3 meses? PodÃ©s elegir varios.</Hint>
                <ChipsWithOtro options={OBJETIVOS_OPTS} field="objetivos" ui={ui} setUi={setUi} multi />
              </div>

              <div>
                <Label>10. Servicios / productos estrella y sus precios</Label>
                <Hint>ListÃ¡ tus 2-4 servicios principales con precio referencial.</Hint>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {['USD', 'ARS'].map(cur => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => set('servicios_moneda', cur)}
                      style={{
                        padding: '7px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .12s',
                        border: answers.servicios_moneda === cur ? '1px solid var(--cardon)' : '1px solid var(--linea)',
                        background: answers.servicios_moneda === cur ? 'var(--cardon-tenue)' : 'var(--nieve)',
                        color: answers.servicios_moneda === cur ? 'var(--cardon)' : 'var(--piedra)',
                      }}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
                <TextArea
                  value={answers.servicios_estrella}
                  onChange={v => set('servicios_estrella', v)}
                  placeholder={`Ej: Trekking de un dÃ­a ${answers.servicios_moneda === 'ARS' ? '$' : 'USD '}40, fin de semana ${answers.servicios_moneda === 'ARS' ? '$' : 'USD '}150...`}
                  rows={4}
                />
              </div>

              <div>
                <Label>11. Calendario de salidas o fechas clave</Label>
                <Hint>Las salidas, eventos o carreras que tenÃ©s en los prÃ³ximos 3-6 meses.</Hint>
                <TextArea
                  value={answers.calendario}
                  onChange={v => set('calendario', v)}
                  placeholder="Ej: Julio: Cerro Tronador 12 y 26 / Agosto: Retiro Patagonia 9-13..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* â”€â”€ BLOCK 4 â”€â”€ */}
          {block === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <Label>12. Cuando alguien se interesa, Â¿quÃ© paso querÃ©s que dÃ©?</Label>
                <Hint>Â¿CuÃ¡l es tu canal principal de conversiÃ³n hoy?</Hint>
                <Chips
                  options={[
                    { value: 'whatsapp',   label: 'WhatsApp directo' },
                    { value: 'bio',        label: 'Link en bio' },
                    { value: 'comentario', label: 'Comentar en el post' },
                    { value: 'dm',         label: 'DM de Instagram' },
                    { value: 'formulario', label: 'Formulario web' },
                  ]}
                  selected={answers.embudo_paso}
                  onToggle={v => set('embudo_paso', v)}
                />
              </div>

              <div>
                <Label>13. Â¿Con quÃ© material visual contÃ¡s regularmente?</Label>
                <Hint>MarcÃ¡ todo lo que tenÃ©s o podÃ©s conseguir. PodÃ©s elegir varios.</Hint>
                <Chips
                  multi
                  options={[
                    { value: 'fotos_salidas',  label: 'Fotos de salidas/eventos' },
                    { value: 'videos_accion',  label: 'Videos en acciÃ³n' },
                    { value: 'testimonios',    label: 'Testimonios en cÃ¡mara' },
                    { value: 'paisajes',       label: 'Paisajes/lugares' },
                    { value: 'persona_camara', label: 'Persona a cÃ¡mara' },
                    { value: 'grupo',          label: 'Grupo/comunidad' },
                  ]}
                  selected={answers.material_visual}
                  onToggle={v => toggleMulti('material_visual', v)}
                />
              </div>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: 'red', marginTop: 16 }}>{error}</p>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
            {block > 0 && (
              <button
                type="button"
                onClick={() => setBlock(b => b - 1)}
                disabled={saving}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 13,
                  border: '1px solid var(--linea)', background: 'transparent',
                  color: 'var(--piedra)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                â† AtrÃ¡s
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const isLast = block === 3
                saveBlock(isLast ? 4 : block + 1, isLast)
              }}
              disabled={saving}
              style={{
                flex: 2, padding: '13px 0', borderRadius: 13, border: 'none',
                background: saving ? 'var(--cardon-tenue)' : 'var(--cardon)',
                color: saving ? 'var(--cardon)' : 'var(--nieve)',
                fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Guardando...' : block === 3 ? 'Finalizar â†’' : 'Siguiente â†’'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
