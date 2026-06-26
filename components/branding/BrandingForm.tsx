'use client'

import { useState, useRef, useMemo } from 'react'
import Image from 'next/image'
import type { BrandIdentity } from '@/types'

// ─── Font catalogue ───────────────────────────────────────────────────────────

type FontCategory = 'Sans-serif' | 'Serif' | 'Display' | 'Condensed' | 'Geométrica' | 'Script'

interface FontEntry { name: string; category: FontCategory }

const FONTS: FontEntry[] = [
  // Sans-serif — 20
  { name: 'Inter',              category: 'Sans-serif' },
  { name: 'Roboto',             category: 'Sans-serif' },
  { name: 'Open Sans',          category: 'Sans-serif' },
  { name: 'Lato',               category: 'Sans-serif' },
  { name: 'Montserrat',         category: 'Sans-serif' },
  { name: 'Poppins',            category: 'Sans-serif' },
  { name: 'Nunito',             category: 'Sans-serif' },
  { name: 'DM Sans',            category: 'Sans-serif' },
  { name: 'Outfit',             category: 'Sans-serif' },
  { name: 'Plus Jakarta Sans',  category: 'Sans-serif' },
  { name: 'Work Sans',          category: 'Sans-serif' },
  { name: 'Source Sans 3',      category: 'Sans-serif' },
  { name: 'Figtree',            category: 'Sans-serif' },
  { name: 'Manrope',            category: 'Sans-serif' },
  { name: 'Urbanist',           category: 'Sans-serif' },
  { name: 'Karla',              category: 'Sans-serif' },
  { name: 'Mulish',             category: 'Sans-serif' },
  { name: 'Barlow',             category: 'Sans-serif' },
  { name: 'Jost',               category: 'Sans-serif' },
  { name: 'Lexend',             category: 'Sans-serif' },

  // Serif — 14
  { name: 'Playfair Display',   category: 'Serif' },
  { name: 'Merriweather',       category: 'Serif' },
  { name: 'Lora',               category: 'Serif' },
  { name: 'EB Garamond',        category: 'Serif' },
  { name: 'Cormorant Garamond', category: 'Serif' },
  { name: 'Libre Baskerville',  category: 'Serif' },
  { name: 'PT Serif',           category: 'Serif' },
  { name: 'Crimson Text',       category: 'Serif' },
  { name: 'Spectral',           category: 'Serif' },
  { name: 'DM Serif Display',   category: 'Serif' },
  { name: 'Bodoni Moda',        category: 'Serif' },
  { name: 'Gilda Display',      category: 'Serif' },
  { name: 'Cardo',              category: 'Serif' },
  { name: 'Arvo',               category: 'Serif' },

  // Display — 12
  { name: 'Oswald',             category: 'Display' },
  { name: 'Raleway',            category: 'Display' },
  { name: 'Bebas Neue',         category: 'Display' },
  { name: 'Anton',              category: 'Display' },
  { name: 'Righteous',          category: 'Display' },
  { name: 'Alfa Slab One',      category: 'Display' },
  { name: 'Lilita One',         category: 'Display' },
  { name: 'Passion One',        category: 'Display' },
  { name: 'Teko',               category: 'Display' },
  { name: 'Fjalla One',         category: 'Display' },
  { name: 'Black Han Sans',     category: 'Display' },
  { name: 'Boogaloo',           category: 'Display' },

  // Condensed — 8
  { name: 'Barlow Condensed',   category: 'Condensed' },
  { name: 'Roboto Condensed',   category: 'Condensed' },
  { name: 'PT Sans Narrow',     category: 'Condensed' },
  { name: 'Francois One',       category: 'Condensed' },
  { name: 'Archivo Narrow',     category: 'Condensed' },
  { name: 'Yanone Kaffeesatz',  category: 'Condensed' },
  { name: 'Squada One',         category: 'Condensed' },
  { name: 'Exo 2',              category: 'Condensed' },

  // Geométrica — 10
  { name: 'Space Grotesk',      category: 'Geométrica' },
  { name: 'Syne',               category: 'Geométrica' },
  { name: 'Questrial',          category: 'Geométrica' },
  { name: 'Comfortaa',          category: 'Geométrica' },
  { name: 'Varela Round',       category: 'Geométrica' },
  { name: 'Nunito Sans',        category: 'Geométrica' },
  { name: 'Asap',               category: 'Geométrica' },
  { name: 'Rubik',              category: 'Geométrica' },
  { name: 'Quicksand',          category: 'Geométrica' },
  { name: 'Oxanium',            category: 'Geométrica' },

  // Script — 10
  { name: 'Dancing Script',     category: 'Script' },
  { name: 'Pacifico',           category: 'Script' },
  { name: 'Lobster',            category: 'Script' },
  { name: 'Great Vibes',        category: 'Script' },
  { name: 'Sacramento',         category: 'Script' },
  { name: 'Caveat',             category: 'Script' },
  { name: 'Patrick Hand',       category: 'Script' },
  { name: 'Satisfy',            category: 'Script' },
  { name: 'Kaushan Script',     category: 'Script' },
  { name: 'Yellowtail',         category: 'Script' },
]

const CATEGORIES: Array<FontCategory | 'Todas'> = [
  'Todas', 'Sans-serif', 'Serif', 'Display', 'Condensed', 'Geométrica', 'Script',
]

// Build a single Google Fonts URL for all 74 fonts
const GFONTS_URL = (() => {
  const families = FONTS.map(f => `family=${f.name.replace(/ /g, '+')}`)
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
})()

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
      color: '#34D17E', margin: '0 0 18px',
    }}>
      {children}
    </h2>
  )
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const displayHex = value || '#000000'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#7E9286', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Visual picker */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, border: '2px solid rgba(255,255,255,.1)',
            background: displayHex, cursor: 'pointer', overflow: 'hidden',
          }}>
            <input
              type="color"
              value={displayHex}
              onChange={e => onChange(e.target.value)}
              style={{
                position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer',
                width: '100%', height: '100%',
              }}
            />
          </div>
        </div>
        {/* Hex input */}
        <input
          type="text"
          value={value}
          onChange={e => {
            const v = e.target.value
            if (/^#?[0-9A-Fa-f]{0,6}$/.test(v)) {
              onChange(v.startsWith('#') ? v : v ? '#' + v : '')
            }
          }}
          placeholder="#000000"
          maxLength={7}
          style={{
            width: 88, padding: '8px 10px', borderRadius: 9,
            border: '1px solid rgba(255,255,255,.08)', background: '#0A100B',
            color: '#EAF2EC', fontSize: 13, fontFamily: 'monospace',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}

// ─── Font selector ────────────────────────────────────────────────────────────

interface FontSelectorProps {
  value: string
  onChange: (v: string) => void
  previewText?: string
}

function FontSelector({ value, onChange, previewText = 'Entre Outdoor' }: FontSelectorProps) {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState<FontCategory | 'Todas'>('Todas')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return FONTS.filter(f =>
      (category === 'Todas' || f.category === category) &&
      (!q || f.name.toLowerCase().includes(q))
    )
  }, [search, category])

  const selectedFont = value || ''

  return (
    <div>
      {/* Selected font preview */}
      {selectedFont && (
        <div style={{
          padding: '14px 18px', borderRadius: 12,
          border: '1px solid rgba(52,209,126,.2)', background: 'rgba(52,209,126,.04)',
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 11, color: '#34D17E', margin: '0 0 6px', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Vista previa
          </p>
          <p style={{
            fontFamily: `"${selectedFont}", sans-serif`,
            fontSize: 22, color: '#EAF2EC', margin: 0, lineHeight: 1.2,
          }}>
            {previewText}
          </p>
          <p style={{ fontSize: 12, color: '#7E9286', margin: '4px 0 0' }}>{selectedFont}</p>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <svg
          width="14" height="14" viewBox="0 0 20 20" fill="none"
          stroke="#445049" strokeWidth="1.8" strokeLinecap="round"
          style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }}
        >
          <circle cx="8.5" cy="8.5" r="5" /><path d="M15 15l-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar fuente..."
          style={{
            width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,.08)', background: '#0A100B',
            color: '#EAF2EC', fontSize: 13, outline: 'none',
            boxSizing: 'border-box', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {CATEGORIES.map(cat => {
          const active = category === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              style={{
                padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'all .1s',
                border: active ? '1px solid rgba(52,209,126,.4)' : '1px solid rgba(255,255,255,.08)',
                background: active ? 'rgba(52,209,126,.1)' : 'rgba(255,255,255,.02)',
                color: active ? '#34D17E' : '#7E9286',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* Font list */}
      <div style={{
        maxHeight: 300, overflowY: 'auto', borderRadius: 12,
        border: '1px solid rgba(255,255,255,.06)', background: '#080D09',
      }}>
        {filtered.length === 0 ? (
          <p style={{ padding: '20px 16px', color: '#445049', fontSize: 13, margin: 0, textAlign: 'center' }}>
            Sin resultados para "{search}"
          </p>
        ) : (
          filtered.map(font => {
            const isSelected = font.name === selectedFont
            return (
              <button
                key={font.name}
                type="button"
                onClick={() => onChange(font.name)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '11px 14px', textAlign: 'left',
                  background: isSelected ? 'rgba(52,209,126,.08)' : 'transparent',
                  border: 'none', borderBottom: '1px solid rgba(255,255,255,.04)',
                  cursor: 'pointer', transition: 'background .1s',
                }}
              >
                <span style={{
                  fontFamily: `"${font.name}", sans-serif`,
                  fontSize: 15, color: isSelected ? '#34D17E' : '#C8DDD0',
                }}>
                  {font.name}
                </span>
                <span style={{ fontSize: 11, color: '#445049' }}>{font.category}</span>
              </button>
            )
          })
        )}
      </div>
      {filtered.length > 0 && (
        <p style={{ fontSize: 11, color: '#445049', margin: '6px 0 0', textAlign: 'right' }}>
          {filtered.length} fuente{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ─── Logo uploader ────────────────────────────────────────────────────────────

interface LogoUploaderProps {
  logoUrl: string | null
  onUpload: (url: string) => void
}

function LogoUploader({ logoUrl, onUpload }: LogoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch('/api/mi-marca/logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al subir')
      onUpload(data.logo_url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
      {/* Preview */}
      <div style={{
        width: 80, height: 80, borderRadius: 12, flexShrink: 0,
        border: '1px solid rgba(255,255,255,.08)',
        background: 'rgba(255,255,255,.03)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {logoUrl ? (
          <Image src={logoUrl} alt="Logo" width={80} height={80} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3A5040" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        )}
      </div>

      {/* Upload controls */}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            padding: '9px 18px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,.1)',
            background: uploading ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.05)',
            color: uploading ? '#445049' : '#C8DDD0',
            fontSize: 13, fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
        </button>
        <p style={{ fontSize: 12, color: '#445049', margin: '6px 0 0' }}>
          PNG con fondo transparente recomendado. Máx. 5 MB.
        </p>
        {uploadError && (
          <p style={{ fontSize: 12, color: '#f87171', margin: '4px 0 0' }}>{uploadError}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface BrandingFormProps {
  initialBranding: BrandIdentity | null
}

export default function BrandingForm({ initialBranding }: BrandingFormProps) {
  const [colors, setColors] = useState({
    color_primario:   initialBranding?.color_primario   ?? '',
    color_secundario: initialBranding?.color_secundario ?? '',
    color_acento:     initialBranding?.color_acento     ?? '',
    color_texto:      initialBranding?.color_texto      ?? '',
    color_fondo:      initialBranding?.color_fondo      ?? '',
  })
  const [fontTitle, setFontTitle] = useState(initialBranding?.font_title ?? '')
  const [fontBody,  setFontBody]  = useState(initialBranding?.font_body  ?? '')
  const [logoUrl, setLogoUrl]     = useState(initialBranding?.logo_url   ?? null)

  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function setColor(key: keyof typeof colors, value: string) {
    setColors(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const res = await fetch('/api/mi-marca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...colors, font_title: fontTitle, font_body: fontBody }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    padding: '24px 26px', borderRadius: 16,
    border: '1px solid rgba(255,255,255,.06)',
    background: '#0C120D', marginBottom: 16,
  }

  return (
    <>
      {/* Load all Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href={GFONTS_URL} rel="stylesheet" />

      {/* Colores */}
      <div style={cardStyle}>
        <SectionHeading>Colores de marca</SectionHeading>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <ColorField label="Principal"   value={colors.color_primario}   onChange={v => setColor('color_primario', v)} />
          <ColorField label="Secundario"  value={colors.color_secundario} onChange={v => setColor('color_secundario', v)} />
          <ColorField label="Acento"      value={colors.color_acento}     onChange={v => setColor('color_acento', v)} />
          <ColorField label="Texto"       value={colors.color_texto}      onChange={v => setColor('color_texto', v)} />
          <ColorField label="Fondo"       value={colors.color_fondo}      onChange={v => setColor('color_fondo', v)} />
        </div>

        {/* Palette preview */}
        {Object.values(colors).some(Boolean) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            {[colors.color_primario, colors.color_secundario, colors.color_acento, colors.color_texto, colors.color_fondo]
              .filter(Boolean)
              .map((c, i) => (
                <div key={i} title={c} style={{
                  width: 32, height: 32, borderRadius: 8, background: c,
                  border: '1px solid rgba(255,255,255,.1)', flexShrink: 0,
                }} />
              ))}
          </div>
        )}
      </div>

      {/* Tipografía */}
      <div style={cardStyle}>
        <SectionHeading>Tipografía</SectionHeading>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#C8DDD0', margin: '0 0 12px' }}>
              Fuente de títulos
            </p>
            <FontSelector
              value={fontTitle}
              previewText="Entre Outdoor"
              onChange={v => { setFontTitle(v); setSaved(false) }}
            />
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#C8DDD0', margin: '0 0 12px' }}>
              Fuente de cuerpo
            </p>
            <FontSelector
              value={fontBody}
              previewText="El texto de tus slides y pies de foto."
              onChange={v => { setFontBody(v); setSaved(false) }}
            />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div style={cardStyle}>
        <SectionHeading>Logo</SectionHeading>
        <LogoUploader
          logoUrl={logoUrl}
          onUpload={url => { setLogoUrl(url); setSaved(false) }}
        />
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 28px', borderRadius: 12, border: 'none',
            background: saving ? '#1a3322' : '#34D17E',
            color: saving ? '#3A5040' : '#04130A',
            fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Guardando...' : 'Guardar identidad'}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: '#34D17E', fontWeight: 500 }}>
            ✓ Guardado
          </span>
        )}
        {saveError && (
          <span style={{ fontSize: 13, color: '#f87171' }}>{saveError}</span>
        )}
      </div>
    </>
  )
}
