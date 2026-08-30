'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface DriveTemplate {
  id: string
  name: string
  previewFileId: string | null
  webViewLink: string | null
  htmlFileId: string | null
}

interface TemplatesResponse {
  client: { id: string; name: string; calendarCode: string; driveFolderId: string | null; logoUrl: string | null }
  selected: string[]
  installed: DriveTemplate[]
  library: DriveTemplate[]
  error?: string
}

interface PreviewFrameElement extends HTMLIFrameElement {
  __betweenFit?: () => void
  __betweenSlideCount?: number
}

function displayName(name: string) {
  return name.replace(/\.(hbs|html)$/iu, '').replaceAll('_', ' ')
}

function isolateAndFitTemplate(frame: HTMLIFrameElement, slideIndex = 0, logoUrl: string | null = null): number {
  const previewFrame = frame as PreviewFrameElement
  if (previewFrame.__betweenFit) {
    previewFrame.__betweenFit()
    return previewFrame.__betweenSlideCount ?? 1
  }
  const doc = frame.contentDocument
  if (!doc?.body) return 0

  const exactSlides = Array.from(doc.querySelectorAll<HTMLElement>('.slide'))
  const dimensionalCandidates = Array.from(doc.body.querySelectorAll<HTMLElement>('*')).filter(element => {
    const width = element.offsetWidth
    const height = element.offsetHeight
    return width >= 800 && width <= 1600 && height >= 800 && height <= 2200
  })
  const slides = exactSlides.length > 0 ? exactSlides : dimensionalCandidates
  const source = slides[Math.min(slideIndex, Math.max(slides.length - 1, 0))] ?? doc.body.firstElementChild as HTMLElement | null
  if (!source) return 0

  const computedStyle = doc.defaultView?.getComputedStyle(source)
  const sourceWidth = source.offsetWidth || Number.parseFloat(computedStyle?.width ?? '') || 1080
  const sourceHeight = source.offsetHeight || Number.parseFloat(computedStyle?.height ?? '') || 1350

  for (const image of source.querySelectorAll<HTMLImageElement>('img')) {
    const signature = `${image.className} ${image.alt} ${image.getAttribute('src') ?? ''}`
    if (!/(?:logo|brand|marca|between)/iu.test(signature)) continue
    if (logoUrl) {
      image.src = logoUrl
      image.removeAttribute('srcset')
    } else {
      image.style.setProperty('display', 'none', 'important')
    }
  }
  const isolated = source.cloneNode(true) as HTMLElement

  doc.documentElement.style.setProperty('width', '100%', 'important')
  doc.documentElement.style.setProperty('height', '100%', 'important')
  doc.documentElement.style.setProperty('overflow', 'hidden', 'important')
  doc.body.replaceChildren(isolated)
  doc.body.style.setProperty('margin', '0', 'important')
  doc.body.style.setProperty('padding', '0', 'important')
  doc.body.style.setProperty('width', '100%', 'important')
  doc.body.style.setProperty('height', '100%', 'important')
  doc.body.style.setProperty('min-height', '0', 'important')
  doc.body.style.setProperty('overflow', 'hidden', 'important')
  doc.body.style.setProperty('display', 'block', 'important')
  doc.body.style.setProperty('position', 'relative', 'important')
  doc.body.style.setProperty('background', '#050805', 'important')

  isolated.style.setProperty('position', 'absolute', 'important')
  isolated.style.setProperty('margin', '0', 'important')
  isolated.style.setProperty('flex', 'none', 'important')
  isolated.style.setProperty('width', `${sourceWidth}px`, 'important')
  isolated.style.setProperty('height', `${sourceHeight}px`, 'important')
  isolated.style.setProperty('transform-origin', 'top left', 'important')

  const fit = () => {
    const viewportWidth = frame.clientWidth
    const viewportHeight = frame.clientHeight
    if (!viewportWidth || !viewportHeight) return
    const scale = Math.min(viewportWidth / sourceWidth, viewportHeight / sourceHeight)
    isolated.style.setProperty('left', `${Math.max(0, (viewportWidth - sourceWidth * scale) / 2)}px`, 'important')
    isolated.style.setProperty('top', `${Math.max(0, (viewportHeight - sourceHeight * scale) / 2)}px`, 'important')
    isolated.style.setProperty('transform', `scale(${scale})`, 'important')
  }
  previewFrame.__betweenFit = fit
  previewFrame.__betweenSlideCount = Math.max(slides.length, 1)
  fit()
  requestAnimationFrame(fit)
  return previewFrame.__betweenSlideCount
}

export function ResponsiveTemplateFrame({ template, slideIndex = 0, onSlideCount, logoUrl = null }: {
  template: DriveTemplate
  slideIndex?: number
  onSlideCount?: (count: number) => void
  logoUrl?: string | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [visible, setVisible] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '240px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!template.htmlFileId || !visible) return
    const controller = new AbortController()
    setHtml(null)
    setLoadError(null)
    void fetch(`/api/mi-marca/template-html/${template.htmlFileId}`, {
      // This endpoint is session protected. Caching a previous 401 makes the
      // preview look logged out even after the admin signs in again.
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error(response.status === 401 ? 'La sesión venció' : `No se pudo abrir el diseño (${response.status})`)
      if (response.redirected || response.headers.get('X-Between-Template-Preview') !== '1') throw new Error('La sesión venció. Volvé a ingresar para ver los diseños.')
      const source = await response.text()
      if (!/<body[\s>]/iu.test(source)) throw new Error('El archivo HTML no contiene una pieza visible')
      setHtml(source)
    }).catch(cause => {
      if ((cause as Error).name !== 'AbortError') setLoadError(cause instanceof Error ? cause.message : 'No se pudo abrir el diseño')
    })
    return () => controller.abort()
  }, [template.htmlFileId, visible])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(() => {
      const count = isolateAndFitTemplate(frame, slideIndex, logoUrl ?? null)
      if (count > 0) onSlideCount?.(count)
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [html, logoUrl, onSlideCount, slideIndex])

  if (!template.htmlFileId) return null
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
    {loadError ? <PreviewUnavailable name={displayName(template.name)} detail={loadError} /> : !html ? <PreviewLoading /> : (
    <iframe
      key={`${template.htmlFileId}-${slideIndex}`}
      ref={frameRef}
      srcDoc={html}
      title={`Preview de ${displayName(template.name)}`}
      tabIndex={-1}
      onLoad={event => {
        const count = isolateAndFitTemplate(event.currentTarget, slideIndex, logoUrl ?? null)
        if (count > 0) onSlideCount?.(count)
        else setLoadError('El HTML no contiene una pieza visible')
      }}
      style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none', background: '#050805' }}
    />
    )}
  </div>
}

function PreviewLoading() {
  return <div aria-label="Cargando preview" style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'linear-gradient(110deg,#0A0F0B 35%,#121B14 50%,#0A0F0B 65%)', backgroundSize: '220% 100%', color: '#718077', fontSize: 10 }}>Cargando diseño…</div>
}

function PreviewUnavailable({ name, detail }: { name: string; detail: string }) {
  return <div role="img" aria-label={`Preview no disponible de ${name}`} style={{ width: '100%', height: '100%', display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 6, padding: 12, background: 'linear-gradient(145deg,#111812,#080C09)', color: '#92A198', textAlign: 'center' }}><strong style={{ color: '#DCE7DF', fontSize: 11, textTransform: 'capitalize' }}>{name}</strong><span style={{ fontSize: 9, lineHeight: 1.35 }}>{detail}</span></div>
}

export function TemplateVisual({ template, logoUrl, onPreview, interactive = true }: {
  template: DriveTemplate
  logoUrl: string | null
  onPreview: () => void
  interactive?: boolean
}) {
  const content = <>
      {template.webViewLink?.startsWith('data:image/') ? (
        // Development-only visual fixture used by the local UX preview.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={template.webViewLink} alt={`Preview de ${displayName(template.name)}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : template.htmlFileId ? (
        <ResponsiveTemplateFrame template={template} logoUrl={logoUrl} />
      ) : template.previewFileId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/mi-marca/template-preview/${template.previewFileId}`}
          alt={`Preview de ${displayName(template.name)}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ color: '#607168', fontSize: 12 }}>Sin preview HTML</span>
      )}
      {interactive && template.htmlFileId && (
        <span style={{
          position: 'absolute', right: 10, bottom: 10, borderRadius: 999, padding: '6px 9px',
          background: 'rgba(5,8,5,.78)', color: '#EAF2EC', fontSize: 10, fontWeight: 700,
        }}>
          Ver grande
        </span>
      )}
    </>
  const style = {
    position: 'relative' as const, width: '100%', aspectRatio: '4 / 5', padding: 0, overflow: 'hidden',
    border: 'none', borderRadius: 12, background: '#050805', cursor: interactive && template.htmlFileId ? 'zoom-in' : 'default',
  }
  if (!interactive) return <div aria-hidden style={style}>{content}</div>
  return (
    <button type="button" onClick={onPreview} aria-label={`Ver ${displayName(template.name)}`} style={style}>
      {content}
    </button>
  )
}

export function TemplatePreviewModal({ template, logoUrl, onClose }: {
  template: DriveTemplate
  logoUrl: string | null
  onClose: () => void
}) {
  const [slide, setSlide] = useState(0)
  const [slideCount, setSlideCount] = useState(1)
  return <div role="dialog" aria-modal="true" aria-label={`Preview de ${displayName(template.name)}`} onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.86)', display: 'grid', placeItems: 'center', padding: 24 }}>
    <div onClick={event => event.stopPropagation()} style={{ width: 'min(92vw,720px)', height: 'min(90vh,900px)', background: '#0D130E', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 30px 90px rgba(0,0,0,.5)' }}>
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', color: '#EAF2EC', fontSize: 12, fontWeight: 700 }}>
        <span style={{ textTransform: 'capitalize' }}>{displayName(template.name)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {slideCount > 1 && <><button type="button" onClick={() => setSlide(current => Math.max(0, current - 1))} disabled={slide === 0} style={{ border: 0, background: 'transparent', color: slide === 0 ? '#445049' : '#EAF2EC', cursor: slide === 0 ? 'default' : 'pointer', fontSize: 16 }}>←</button><span style={{ color: '#7E9286', fontSize: 10 }}>{slide + 1}/{slideCount}</span><button type="button" onClick={() => setSlide(current => Math.min(slideCount - 1, current + 1))} disabled={slide >= slideCount - 1} style={{ border: 0, background: 'transparent', color: slide >= slideCount - 1 ? '#445049' : '#EAF2EC', cursor: slide >= slideCount - 1 ? 'default' : 'pointer', fontSize: 16 }}>→</button></>}
          <button type="button" aria-label="Cerrar preview" onClick={onClose} style={{ border: 0, background: 'transparent', color: '#A7B5AC', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>
      </div>
      <div style={{ width: '100%', height: 'calc(100% - 52px)', background: '#050805' }}>{template.htmlFileId ? <ResponsiveTemplateFrame template={template} slideIndex={slide} onSlideCount={setSlideCount} logoUrl={logoUrl} /> : <TemplateVisual template={template} logoUrl={logoUrl} onPreview={() => {}} interactive={false} />}</div>
    </div>
  </div>
}

export default function ClientTemplateManager({ clientId, clientName, calendarCode, calendarName }: {
  clientId: string
  clientName: string
  calendarCode: string
  calendarName: string
}) {
  const [data, setData] = useState<TemplatesResponse | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncFailed, setSyncFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [preview, setPreview] = useState<DriveTemplate | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/clientes/${clientId}/templates`, { cache: 'no-store' })
      const result = await response.json() as TemplatesResponse
      if (!response.ok) throw new Error(result.error ?? 'No se pudieron cargar los diseños')
      setData(result)
      setSelected(result.selected)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los diseños')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { void load() }, [load])

  const installedNames = useMemo(() => new Set(data?.installed.map(item => item.name) ?? []), [data])
  const allByName = useMemo(() => {
    const result = new Map<string, DriveTemplate>()
    for (const item of data?.installed ?? []) result.set(item.name, item)
    for (const item of data?.library ?? []) result.set(item.name, item)
    return result
  }, [data])
  const selectedTemplates = selected.map(name => allByName.get(name)).filter((item): item is DriveTemplate => Boolean(item))
  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...(data?.selected ?? [])].sort())

  function toggle(name: string) {
    setMessage(null)
    setSelected(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name])
  }

  function openPreview(template: DriveTemplate) {
    setPreview(template)
  }

  async function save() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(`/api/admin/clientes/${clientId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: selected }),
      })
      const result = await response.json() as { error?: string; warning?: string; sync?: string }
      if (!response.ok) throw new Error(result.error ?? 'No se pudo guardar la selección')
      setSyncFailed(result.sync === 'failed' || result.sync === 'pending')
      setMessage(result.warning ?? (result.sync === 'completed'
        ? 'Diseños asignados y carpeta del cliente sincronizada.'
        : 'Diseños asignados. La sincronización quedó pendiente.'))
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la selección')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ color: '#7E9286', fontSize: 13 }}>Leyendo recursos de Between y {clientName} en Drive…</p>

  if (error && !data) {
    return (
      <div role="alert" style={{ border: '1px solid rgba(251,113,133,.25)', borderRadius: 14, padding: 16, color: '#fb7185', background: 'rgba(251,113,133,.06)' }}>
        <p style={{ margin: 0, fontSize: 13 }}>{error}</p>
        <button type="button" onClick={() => void load()} style={{ marginTop: 10, color: '#EAF2EC', background: 'transparent', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, padding: '7px 10px' }}>Reintentar</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <section style={{ background: '#0D130E', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#34D17E', fontSize: 11, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '.08em', margin: 0 }}>Calendario activo</p>
            <h3 style={{ color: '#EAF2EC', fontSize: 18, margin: '4px 0 0' }}>{calendarName}</h3>
            <p style={{ color: '#7E9286', fontSize: 12, margin: '3px 0 0' }}>{calendarCode} · {clientName}</p>
          </div>
          <div style={{ color: data?.client.driveFolderId ? '#A7B5AC' : '#fbbf24', fontSize: 11 }}>
            {data?.client.driveFolderId ? `${data.installed.length} archivos instalados en Drive` : 'Cliente sin carpeta de recursos vinculada'}
          </div>
        </div>

        <h4 style={{ color: '#C5D0C8', fontSize: 13, margin: '20px 0 10px' }}>Diseños asignados a este cliente</h4>
        {selectedTemplates.length === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,.12)', borderRadius: 12, padding: 24, color: '#7E9286', fontSize: 12 }}>
            Todavía no hay diseños asignados. Elegilos desde la biblioteca de abajo.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 12 }}>
            {selectedTemplates.map(template => (
              <article key={template.name} style={{ border: '1px solid rgba(52,209,126,.25)', background: 'rgba(52,209,126,.04)', borderRadius: 14, padding: 10 }}>
                <TemplateVisual template={template} logoUrl={data?.client.logoUrl ?? null} onPreview={() => template.htmlFileId && openPreview(template)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 9, alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#EAF2EC', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{displayName(template.name)}</div>
                    <div style={{ color: installedNames.has(template.name) ? '#34D17E' : '#fbbf24', fontSize: 10, marginTop: 2 }}>
                      {installedNames.has(template.name) ? 'Instalado en recursos del cliente' : 'Se copiará al guardar'}
                    </div>
                  </div>
                  <button type="button" onClick={() => toggle(template.name)} style={{ color: '#fb7185', background: 'transparent', border: 'none', fontSize: 11, cursor: 'pointer' }}>Quitar</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ color: '#EAF2EC', fontSize: 16, margin: 0 }}>Biblioteca total de Between</h3>
          <p style={{ color: '#7E9286', fontSize: 12, margin: '4px 0 0' }}>
            Sale de Recursos → templates + brand_guidelines. El HBS renderiza y el HTML muestra este preview.
          </p>
        </div>
        {(data?.library.length ?? 0) === 0 ? (
          <div style={{ border: '1px dashed rgba(255,255,255,.12)', borderRadius: 12, padding: 24, color: '#7E9286', fontSize: 12 }}>No se encontraron pares HBS/HTML en la carpeta global.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 12 }}>
            {data?.library.map(template => {
              const active = selected.includes(template.name)
              return (
                <article key={template.id} style={{ border: `1px solid ${active ? 'rgba(52,209,126,.35)' : 'rgba(255,255,255,.08)'}`, background: '#0D130E', borderRadius: 14, padding: 10 }}>
                  <TemplateVisual template={template} logoUrl={data?.client.logoUrl ?? null} onPreview={() => template.htmlFileId && openPreview(template)} />
                  <div style={{ marginTop: 9 }}>
                    <div style={{ color: '#EAF2EC', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>{displayName(template.name)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 7 }}>
                      <span style={{ color: installedNames.has(template.name) ? '#34D17E' : '#607168', fontSize: 10 }}>
                        {installedNames.has(template.name) ? 'Ya está en Drive del cliente' : 'Disponible en Between'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggle(template.name)}
                        style={{
                          border: `1px solid ${active ? 'rgba(251,113,133,.3)' : 'rgba(52,209,126,.35)'}`,
                          color: active ? '#fb7185' : '#34D17E', background: active ? 'rgba(251,113,133,.07)' : 'rgba(52,209,126,.08)',
                          borderRadius: 8, padding: '6px 9px', fontSize: 10, fontWeight: 750, cursor: 'pointer',
                        }}
                      >
                        {active ? 'Quitar' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <div style={{ position: 'sticky', bottom: 16, display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, background: 'rgba(5,8,5,.94)', border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(12px)' }}>
        <button
          type="button"
          onClick={() => void save()}
          disabled={(!dirty && !syncFailed) || saving}
          style={{ border: 0, borderRadius: 10, padding: '10px 16px', background: dirty || syncFailed ? '#34D17E' : '#1B261E', color: dirty || syncFailed ? '#04130A' : '#607168', fontSize: 12, fontWeight: 800, cursor: (dirty || syncFailed) && !saving ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Sincronizando con Drive…' : syncFailed && !dirty ? 'Reintentar sincronización' : `Guardar ${selected.length} diseños`}
        </button>
        <span style={{ color: error ? '#fb7185' : message ? '#34D17E' : '#7E9286', fontSize: 11 }}>
          {error ?? message ?? (dirty ? 'Tenés cambios sin guardar.' : 'La selección está sincronizada.')}
        </span>
      </div>

      {preview?.htmlFileId && <TemplatePreviewModal template={preview} logoUrl={data?.client.logoUrl ?? null} onClose={() => setPreview(null)} />}
    </div>
  )
}
