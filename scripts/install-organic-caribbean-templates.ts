import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'

import {ORGANIC_CARIBBEAN_TEMPLATES} from '../lib/creative-lab/organic-caribbean-templates.ts'
import {assertCreativeTemplate} from '../lib/creative-lab/template-contract.ts'

const CLIENT_DESIGN_STUDIO_FLAG = 'client_design_studio'

const execute = process.argv.includes('--execute')
const clientId = process.env.ORGANIC_CARIBBEAN_CLIENT_ID?.trim() || 'cfd21e1e-0ba8-4470-bf2f-622ed0412b13'
const rendererModule = process.env.CREATIVE_RENDERER_LIBRARY_MODULE?.trim()
  || path.resolve(process.cwd(), '../skill-carruseles/scripts/static_html_renderer.js')
const photos = [1, 2, 3].map(index => process.env[`ORGANIC_CARIBBEAN_PHOTO_${index}`]?.trim() || '')
const adminId = process.env.BETWEEN_ADMIN_USER_ID?.trim() || '75a22462-2acf-4c27-b161-c54ea5b80269'
const outputRoot = process.env.ORGANIC_CARIBBEAN_OUTPUT_DIR?.trim() || '/tmp/between-organic-caribbean-templates'
const clientName = process.env.ORGANIC_CARIBBEAN_CLIENT_NAME?.trim() || 'NOMBRE DE MARCA'
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim()
const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

if (!fs.existsSync(rendererModule)) throw new Error(`No existe el renderer: ${rendererModule}`)
for (const [index, photo] of photos.entries()) {
  if (!photo || !fs.existsSync(photo)) throw new Error(`Falta ORGANIC_CARIBBEAN_PHOTO_${index + 1}`)
}

const mimeFor = (file: string) => file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
const dataUrl = (file: string) => `data:${mimeFor(file)};base64,${fs.readFileSync(file).toString('base64')}`
const require = createRequire(import.meta.url)
const {renderStaticTemplatePreview} = require(rendererModule) as {
  renderStaticTemplatePreview: (payload: Record<string, unknown>) => Promise<Uint8Array>
}
fs.mkdirSync(outputRoot, {recursive: true})

async function requestJson(pathname: string, init: RequestInit = {}) {
  if (!supabaseUrl || !serviceRole) throw new Error('Supabase no está configurado')
  const response = await fetch(new URL(pathname, supabaseUrl), {
    ...init,
    headers: {
      apikey: serviceRole,
      authorization: `Bearer ${serviceRole}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  })
  const raw = await response.text()
  if (!response.ok) throw new Error(`${response.status} ${raw}`)
  return raw ? JSON.parse(raw) : null
}

async function selectRows(table: string, params: Record<string, string>) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return requestJson(`${url.pathname}${url.search}`) as Promise<Array<Record<string, unknown>>>
}

async function insertRow(table: string, values: Record<string, unknown>) {
  const rows = await requestJson(`/rest/v1/${table}`, {method: 'POST', body: JSON.stringify(values)}) as Array<Record<string, unknown>>
  if (!rows?.[0]) throw new Error(`No se pudo insertar en ${table}`)
  return rows[0]
}

async function updateRows(table: string, filter: Record<string, string>, values: Record<string, unknown>) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl)
  for (const [key, value] of Object.entries(filter)) url.searchParams.set(key, value)
  return requestJson(`${url.pathname}${url.search}`, {method: 'PATCH', body: JSON.stringify(values)})
}

async function uploadPreview(storagePath: string, bytes: Uint8Array) {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  const response = await fetch(new URL(`/storage/v1/object/creative-template-previews/${encoded}`, supabaseUrl), {
    method: 'POST',
    headers: {apikey: serviceRole, authorization: `Bearer ${serviceRole}`, 'content-type': 'image/png', 'x-upsert': 'false'},
    body: new Blob([Uint8Array.from(bytes)], {type: 'image/png'}),
  })
  if (!response.ok) throw new Error(`No se pudo subir preview: ${response.status} ${await response.text()}`)
}

async function removePreview(storagePath: string) {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  await fetch(new URL(`/storage/v1/object/creative-template-previews/${encoded}`, supabaseUrl), {
    method: 'DELETE', headers: {apikey: serviceRole, authorization: `Bearer ${serviceRole}`},
  })
}

const results: Array<Record<string, unknown>> = []
for (const [index, template] of ORGANIC_CARIBBEAN_TEMPLATES.entries()) {
  assertCreativeTemplate(template.contract, template.html)
  const mockData = {...template.mock, marca: clientName, bg_image: dataUrl(photos[index])}
  const branding = {
    primary: '#F4C95D', secondary: '#EEE8DC', background: '#07100F', text: '#FAFAF7',
    font_title: template.fontTitle, font_body: 'Inter',
  }
  const preview = new Uint8Array(await renderStaticTemplatePreview({
    template: template.contract, html: template.html, mock_data: mockData, branding, strict_layout: true,
  }))
  const stressData = Object.fromEntries(Object.entries(mockData).map(([name, value]) => {
    const slot = template.contract.slots[name]
    if (!slot || slot.type !== 'text' || !slot.max_chars || !value || name.endsWith('_icon')) return [name, value]
    return [name, String(value).padEnd(slot.max_chars, ' X').slice(0, slot.max_chars)]
  }))
  await renderStaticTemplatePreview({
    template: template.contract, html: template.html, mock_data: stressData, branding, strict_layout: true,
  })
  const localPreview = path.join(outputRoot, `${template.contract.template_id}.png`)
  fs.writeFileSync(localPreview, preview)
  if (!execute) {
    results.push({mode: 'dry-run', templateId: template.contract.template_id, localPreview, bytes: preview.byteLength})
    continue
  }

  const existingRows = await selectRows('template_library', {
    select: 'id,template_id,status,preview_storage_path',
    template_id: `eq.${template.contract.template_id}`,
    version: `eq.${template.contract.version}`,
    limit: '1',
  })
  const existing = existingRows[0]
  let libraryId = existing?.id as string | undefined
  if (!libraryId) {
    const storagePath = `${template.contract.template_id}/${template.contract.version}.png`
    await uploadPreview(storagePath, preview)
    const now = new Date().toISOString()
    let inserted: Record<string, unknown>
    try {
      inserted = await insertRow('template_library', {
        template_id: template.contract.template_id,
        version: template.contract.version,
        piece_type: 'banner',
        mold_type: template.contract.mold_type,
        width: template.contract.dimensions.width,
        height: template.contract.dimensions.height,
        variant: template.contract.variant,
        status: 'approved',
        slots_schema: template.contract.slots,
        branding_tokens: template.contract.branding_tokens,
        title_rules: {direction: 'organic-photo-first', logo_optional: true},
        compatible_formats: ['feed_4_5', 'banner', 'flyer'],
        html_template: template.html,
        preview_storage_path: storagePath,
        source_model: 'openai-imagegen-art-direction+deterministic-html',
        critique_summary: JSON.stringify({
          direction: template.label,
          rationale: 'Fotografía protagonista, tipografía directa y datos sin tarjetas ni estética web.',
          sources: ['Brand ADN Alas Turismo', 'Manual de Usos Básicos ALAS'],
        }),
        created_by: adminId,
        approved_by: adminId,
        approved_at: now,
        stress_tested_at: now,
        stress_test_passed: true,
        stress_test_error: null,
        updated_at: now,
      })
    } catch (error) {
      await removePreview(storagePath)
      throw error
    }
    libraryId = inserted.id as string
  }

  const [contentTemplate] = await selectRows('content_templates', {
    select: 'id', template_library_id: `eq.${libraryId}`, limit: '1',
  })
  let contentTemplateId = contentTemplate?.id as string | undefined
  if (!contentTemplateId) {
    const mold = template.contract.mold_type
    const insertedContent = await insertRow('content_templates', {
      name: template.label,
      type: 'banner',
      status: 'productiva',
      generator_key: `banner_molde_${mold}`,
      template_library_id: libraryId,
      compatibility: {contexts: ['playa', 'caribe', 'internacional'], format: 'feed_4_5'},
      style_profile: {direction: 'organic-photo-first', logo_optional: true, density: 'low'},
      copy_profile: {family: `molde_${mold}`, commercial_facts: 'verified_only'},
      rotation_weight: 1,
      repeat_guard_window: 0,
      is_main_default: false,
      metadata: {
        [CLIENT_DESIGN_STUDIO_FLAG]: true,
        client_scoped: true,
        studio_key: `creative:${libraryId}`,
        creative_template_id: libraryId,
      },
      created_by: adminId,
    })
    contentTemplateId = insertedContent.id as string
  }

  const [override] = await selectRows('content_template_overrides', {
    select: 'id', template_id: `eq.${contentTemplateId}`, client_id: `eq.${clientId}`, salida_id: 'is.null', limit: '1',
  })
  const overrideValues = {
    enabled: true,
    custom_rules: {families: [`molde_${template.contract.mold_type}`], template_library_id: libraryId},
    updated_at: new Date().toISOString(),
  }
  if (override) await updateRows('content_template_overrides', {id: `eq.${override.id}`}, overrideValues)
  else await insertRow('content_template_overrides', {
    template_id: contentTemplateId, client_id: clientId, salida_id: null, ...overrideValues,
  })
  results.push({mode: existing ? 'assigned-existing' : 'created-and-assigned', templateId: template.contract.template_id, libraryId, contentTemplateId, localPreview})
}

console.log(JSON.stringify({execute, clientId, outputRoot, results}, null, 2))
