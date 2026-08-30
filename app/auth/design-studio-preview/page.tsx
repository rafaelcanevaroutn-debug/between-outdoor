import { notFound } from 'next/navigation'
import ClientCalendarDesignStudio, { type StudioResponse, type TemplateBankResponse } from '@/components/admin/ClientCalendarDesignStudio'
import type { DriveTemplate } from '@/components/admin/ClientTemplateManager'
import { listTemplatesForClient } from '@/lib/google-drive'

function image(label: string, background: string, accent: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#g)"/><circle cx="820" cy="260" r="280" fill="white" opacity=".08"/><path d="M0 940L330 650 540 820 760 540 1080 890V1350H0Z" fill="white" opacity=".16"/><text x="78" y="105" fill="white" opacity=".7" font-family="Arial" font-size="28">BETWEEN · PREVIEW</text><text x="78" y="1080" fill="white" font-family="Arial" font-weight="700" font-size="74">${label}</text><text x="78" y="1150" fill="white" opacity=".75" font-family="Arial" font-size="30">Explorá. Conectá. Volvé distinto.</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export default async function DesignStudioPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  const fixtureTemplates: DriveTemplate[] = [
    ['main.hbs', 'Principal', '#183B2A', '#7B9A72'],
    ['brand_guidelines_12.hbs', 'Editorial', '#47362B', '#D09458'],
    ['brand_guidelines_19.hbs', 'Aventura', '#10273B', '#4A86A8'],
    ['brand_guidelines_23.hbs', 'Orgánico', '#3B2535', '#A15E78'],
  ].map(([name, label, background, accent], index) => ({ id: String(index), name, previewFileId: null, htmlFileId: null, webViewLink: image(label, background, accent) }))
  let templates = fixtureTemplates
  const resourcesFolderId = process.env.DRIVE_RECURSOS_FOLDER_ID?.trim()
  if (resourcesFolderId) {
    try {
      const driveTemplates = await listTemplatesForClient(resourcesFolderId)
      if (driveTemplates.length > 0) templates = driveTemplates
    } catch (error) {
      console.warn('[DESIGN-STUDIO/PREVIEW] No se pudo cargar Drive; se usan fixtures locales:', error)
    }
  }
  const bank: TemplateBankResponse = { client: { logoUrl: null }, selected: templates.slice(0, 3).map(item => item.name), library: templates }
  const staticLibrary = Array.from({ length: 6 }, (_, index) => ({ id: `static-${index + 1}`, template_id: `creative-${['destino','ficha','cupos','fechas','propuesta','comunidad'][index]}`, piece_type: index % 2 ? 'flyer' as const : 'banner' as const, mold_type: index + 1, width: 1080, height: 1350, variant: 'default', previewUrl: image(['Salida destacada','Ficha clara','Últimos cupos','Próximas fechas','Propuesta','Comunidad'][index], ['#183B2A','#10273B','#493023','#3B2535','#223947','#403A20'][index], ['#7B9A72','#4A86A8','#C77B48','#A15E78','#7A9BAA','#B3A45E'][index]) }))
  const studio: StudioResponse = {
    installedCarouselNames: templates.slice(0, 4).map(item => item.name),
    carouselAssignments: [
      { designName: 'main.hbs', families: ['organico', 'lugar'] },
      { designName: 'brand_guidelines_12.hbs', families: ['itinerario', 'editorial'] },
      { designName: 'brand_guidelines_19.hbs', families: ['ascenso'] },
    ],
    videoAssignments: [
      { family: '3a', typographyIds: ['Playfair Display'] },
      { family: '3e', typographyIds: ['Oswald'] },
      { family: '4', typographyIds: ['Montserrat', 'Inter'] },
      { family: '1c', typographyIds: ['Inter'] },
    ],
    staticAssignments: [{ templateLibraryId: 'static-1' }, { templateLibraryId: 'static-3' }],
    staticLibrary,
  }
  return <main style={{ minHeight: '100vh', background: '#070B08', padding: '32px clamp(16px,4vw,52px)' }}><div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 18 }}><div><p style={{ color: '#34D17E', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>Vista interna de prueba</p><h1 style={{ color: '#EDF4EF', fontSize: 25, margin: '5px 0' }}>Armador de calendario</h1><p style={{ color: '#7E9286', fontSize: 13, margin: 0 }}>Recorrido visual completo sin modificar datos reales.</p></div><ClientCalendarDesignStudio clientId="preview" clientName="Caminantes" calendarCode="CAL-03" calendarName="Trekking y aventura" previewData={{ bank, studio }} /></div></main>
}
