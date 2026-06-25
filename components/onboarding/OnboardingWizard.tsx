'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Answers {
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
  initialAnswers: Partial<Answers> | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildChipText(sel: string[], otro: string): string {
  const parts = [...sel, ...(otro.trim() ? [otro.trim()] : [])]
  return parts.join(' · ')
}

function parseTestimonios(raw: string): { chip: string; det: string } {
  const idx = raw.indexOf('|')
  if (idx === -1) return { chip: raw, det: '' }
  return { chip: raw.slice(0, idx), det: raw.slice(idx + 1) }
}

// ─── Chip option sets ─────────────────────────────────────────────────────────

const OBJECIONES_OPTS = [
  { value: 'no_acompañante', label: 'No tengo con quién ir' },
  { value: 'lejos',          label: 'Me queda lejos' },
  { value: 'forma_fisica',   label: 'No estoy en forma' },
  { value: 'caro',           label: 'Es caro' },
  { value: 'tiempo',         label: 'Falta de tiempo' },
  { value: 'no_conozco',     label: 'No conozco a nadie' },
  { value: 'seguridad',      label: 'Dudas de seguridad' },
  { value: 'miedo_no_poder', label: 'Miedo a no poder' },
]

const LINEAS_ROJAS_OPTS = [
  { value: 'politica',    label: 'Política o religión' },
  { value: 'lenguaje',    label: 'Lenguaje vulgar' },
  { value: 'promesas',    label: 'Promesas exageradas' },
  { value: 'competencia', label: 'Comparar con competencia' },
  { value: 'precios',     label: 'Precios a la vista' },
  { value: 'negativo',    label: 'Contenido negativo' },
]

const AUTORIDAD_OPTS = [
  { value: 'guia_cert',   label: 'Guía certificado' },
  { value: 'prof_ef',     label: 'Prof. de Ed. Física' },
  { value: 'experiencia', label: 'Años de experiencia' },
  { value: 'prestador',   label: 'Prestador registrado' },
  { value: 'rescatista',  label: 'Rescatista' },
  { value: 'primeros_aux',label: 'Primeros auxilios' },
]

const OBJETIVOS_OPTS = [
  { value: 'llenar_cupos',  label: 'Llenar cupos de una salida' },
  { value: 'sumar_alumnos', label: 'Sumar alumnos al grupo' },
  { value: 'fidelizar',     label: 'Fidelizar comunidad' },
  { value: 'posicionar',    label: 'Posicionar la marca' },
  { value: 'high_ticket',   label: 'Vender más alto ticket' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 15, fontWeight: 700, color: '#EAF2EC', margin: '0 0 4px', letterSpacing: '-.01em' }}>
      {children}
    </p>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12.5, color: '#7E9286', margin: '0 0 12px', lineHeight: 1.5 }}>
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
        border: '1px solid rgba(255,255,255,.08)', background: '#0A100B',
        color: '#EAF2EC', fontSize: 13, lineHeight: 1.6, resize: 'vertical',
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
        border: '1px solid rgba(255,255,255,.08)', background: '#0A100B',
        color: '#EAF2EC', fontSize: 13, outline: 'none',
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
            border: active ? '1px solid rgba(52,209,126,.5)' : '1px solid rgba(255,255,255,.1)',
            background: active ? 'rgba(52,209,126,.13)' : 'rgba(255,255,255,.03)',
            color: active ? '#34D17E' : '#7E9286',
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

// ─── Main ────────────────────────────────────────────────────────────────────

export default function OnboardingWizard({ firstName, initialAnswers }: Props) {
  const router = useRouter()
  const [block, setBlock] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedTest = parseTestimonios(initialAnswers?.marca_testimonios ?? '')

  const [answers, setAnswers] = useState<Answers>({
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
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: composed, complete }),
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

  // ── Completion screen ──────────────────────────────────────────────────────
  if (block === 4) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 24px',
            background: 'linear-gradient(135deg,#34D17E,#5CE6A0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 32px -10px rgba(52,209,126,.6)',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#04130A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#EAF2EC', margin: '0 0 10px', letterSpacing: '-.03em' }}>
            ¡Listo, {firstName}!
          </h1>
          <p style={{ fontSize: 15, color: '#7E9286', margin: '0 0 32px', lineHeight: 1.6 }}>
            Ya tenemos todo lo que necesitamos para crear contenido que hable con la voz de tu marca. Podés empezar ahora.
          </p>
          <button onClick={() => router.push('/salidas')} style={{
            padding: '13px 32px', borderRadius: 13, border: 'none',
            background: '#34D17E', color: '#04130A', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Ir a mi espacio →
          </button>
        </div>
      </div>
    )
  }

  // ── Shell ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,.05)',
        display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
      }}>
        <Image src="/bo-symbol.png" alt="Between Outdoor" width={26} height={26} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
            {BLOCKS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 4, transition: 'background .3s',
                background: i < block ? '#34D17E' : i === block ? 'rgba(52,209,126,.35)' : 'rgba(255,255,255,.07)',
              }} />
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#445049', margin: 0 }}>
            Bloque {block + 1} de {BLOCKS.length} — {BLOCKS[block].label}
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#445049', flexShrink: 0 }}>{progress}%</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px 56px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* Block heading */}
          <div style={{ marginBottom: 32 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
              color: '#34D17E', display: 'block', marginBottom: 6,
            }}>
              Bloque {block + 1}
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#EAF2EC', margin: 0, letterSpacing: '-.02em' }}>
              {block === 0 && `Hola ${firstName}, contanos sobre tu cliente ideal`}
              {block === 1 && 'La personalidad y voz de tu marca'}
              {block === 2 && 'Tu oferta, precios y calendario'}
              {block === 3 && 'Cómo convertís y con qué material trabajás'}
            </h2>
          </div>

          {/* ── BLOCK 1 ── */}
          {block === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <Label>1. ¿Quién es tu cliente ideal?</Label>
                <Hint>Ej: Mujeres y hombres de 28 a 45 años, profesionales con poco tiempo, que buscan desconectarse los fines de semana.</Hint>
                <TextInput
                  value={answers.avatar_edad_genero}
                  onChange={v => set('avatar_edad_genero', v)}
                  placeholder="Rango etario, género predominante, perfil general..."
                />
              </div>

              <div>
                <Label>2. Nivel de experiencia o condición física</Label>
                <Hint>¿Cómo llegan tus clientes antes de contratar?</Hint>
                <Chips
                  options={[
                    { value: 'principiante', label: 'Principiante' },
                    { value: 'intermedio',   label: 'Intermedio' },
                    { value: 'avanzado',     label: 'Avanzado' },
                    { value: 'mixto',        label: 'Mixto / varía' },
                  ]}
                  selected={answers.avatar_experiencia}
                  onToggle={v => set('avatar_experiencia', v)}
                />
              </div>

              <div>
                <Label>3. Miedos y objeciones antes de contratar</Label>
                <Hint>¿Qué frena a alguien antes de inscribirse? Elegí todos los que escuchás.</Hint>
                <ChipsWithOtro options={OBJECIONES_OPTS} field="objeciones" ui={ui} setUi={setUi} multi />
              </div>

              <div>
                <Label>4. ¿Cuál es el motor real de tu cliente?</Label>
                <Hint>¿Por qué te elige en el fondo? Podés elegir más de uno.</Hint>
                <Chips
                  multi
                  options={[
                    { value: 'comunidad',   label: 'Pertenecer a una comunidad' },
                    { value: 'superarse',   label: 'Superarse a sí mismo' },
                    { value: 'desconectar', label: 'Desconectar del estrés' },
                    { value: 'aventura',    label: 'Aventura pura' },
                  ]}
                  selected={answers.avatar_motor}
                  onToggle={v => toggleMulti('avatar_motor', v)}
                />
              </div>
            </div>
          )}

          {/* ── BLOCK 2 ── */}
          {block === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <Label>5. Si tu marca fuera una persona, ¿cómo sería?</Label>
                <Hint>Ej: Un guía experimentado que habla directo, sin poses. Cercano, apasionado, con humor seco. No vende, comparte.</Hint>
                <TextArea
                  value={answers.marca_personalidad}
                  onChange={v => set('marca_personalidad', v)}
                  placeholder="Describí la personalidad, tono y estilo que querés transmitir..."
                  rows={4}
                />
              </div>

              <div>
                <Label>6. Líneas rojas: ¿qué NO querés para tu marca?</Label>
                <Hint>Marcá los temas o estilos que querés evitar en tu comunicación.</Hint>
                <ChipsWithOtro options={LINEAS_ROJAS_OPTS} field="lineas_rojas" ui={ui} setUi={setUi} multi />
              </div>

              <div>
                <Label>7. Certificaciones, experiencia o trayectoria</Label>
                <Hint>¿Con qué avales contás? Elegí los que aplican.</Hint>
                <ChipsWithOtro options={AUTORIDAD_OPTS} field="autoridad" ui={ui} setUi={setUi} multi />
              </div>

              <div>
                <Label>8. ¿Tenés testimonios, fotos o videos de clientes?</Label>
                <Hint>El material que ya tenés define qué tipo de prueba social podemos usar.</Hint>
                <Chips
                  options={[
                    { value: 'bastante', label: 'Sí, bastante material' },
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <Label>9. Objetivos comerciales a corto plazo</Label>
                <Hint>¿Qué querés lograr en los próximos 3 meses? Podés elegir varios.</Hint>
                <ChipsWithOtro options={OBJETIVOS_OPTS} field="objetivos" ui={ui} setUi={setUi} multi />
              </div>

              <div>
                <Label>10. Servicios / productos estrella y sus precios</Label>
                <Hint>Listá tus 2-4 servicios principales con precio referencial.</Hint>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {['USD', 'ARS'].map(cur => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => set('servicios_moneda', cur)}
                      style={{
                        padding: '7px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .12s',
                        border: answers.servicios_moneda === cur ? '1px solid rgba(52,209,126,.5)' : '1px solid rgba(255,255,255,.1)',
                        background: answers.servicios_moneda === cur ? 'rgba(52,209,126,.13)' : 'rgba(255,255,255,.03)',
                        color: answers.servicios_moneda === cur ? '#34D17E' : '#7E9286',
                      }}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
                <TextArea
                  value={answers.servicios_estrella}
                  onChange={v => set('servicios_estrella', v)}
                  placeholder={`Ej: Trekking de un día ${answers.servicios_moneda === 'ARS' ? '$' : 'USD '}40, fin de semana ${answers.servicios_moneda === 'ARS' ? '$' : 'USD '}150...`}
                  rows={4}
                />
              </div>

              <div>
                <Label>11. Calendario de salidas o fechas clave</Label>
                <Hint>Las salidas, eventos o carreras que tenés en los próximos 3-6 meses.</Hint>
                <TextArea
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <Label>12. Cuando alguien se interesa, ¿qué paso querés que dé?</Label>
                <Hint>¿Cuál es tu canal principal de conversión hoy?</Hint>
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
                <Label>13. ¿Con qué material visual contás regularmente?</Label>
                <Hint>Marcá todo lo que tenés o podés conseguir. Podés elegir varios.</Hint>
                <Chips
                  multi
                  options={[
                    { value: 'fotos_salidas',  label: 'Fotos de salidas/eventos' },
                    { value: 'videos_accion',  label: 'Videos en acción' },
                    { value: 'testimonios',    label: 'Testimonios en cámara' },
                    { value: 'paisajes',       label: 'Paisajes/lugares' },
                    { value: 'persona_camara', label: 'Persona a cámara' },
                    { value: 'grupo',          label: 'Grupo/comunidad' },
                  ]}
                  selected={answers.material_visual}
                  onToggle={v => toggleMulti('material_visual', v)}
                />
              </div>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: '#f87171', marginTop: 16 }}>{error}</p>
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
                  border: '1px solid rgba(255,255,255,.08)', background: 'transparent',
                  color: '#7E9286', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                ← Atrás
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
                background: saving ? '#1a3322' : '#34D17E',
                color: saving ? '#3A5040' : '#04130A',
                fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Guardando...' : block === 3 ? 'Finalizar →' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
