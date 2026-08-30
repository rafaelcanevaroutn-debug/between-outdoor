import type {
  ClientOnboarding,
  GeneratedVideoListicle,
  GeneratedVideoStorytelling,
  GeneratedVideoTips,
  Niche,
  Salida,
  VideoFamilia2Subfamilia,
  VideoTypographyId,
} from '@/types'
import { generateWithRetryTracked } from '@/lib/gemini-core'
import {
  loadVideoContext,
  videoContextToPromptBlock,
  VIDEO_KNOWLEDGE_FILE_MAP,
} from '@/lib/knowledge/loader'
import {
  SHARED_OPENING_RULES,
  SHARED_SPECIFICITY_RULES,
} from '@/lib/generators/carrusel-copy-rules'
import {
  buildClientBlock,
  buildSalidaBlock,
} from '@/lib/generators/shared-prompt-blocks'
import {
  extractVideoJson,
  resolveVideoTypography,
  uniqueVideoTypographyIds,
} from '@/lib/generators/video-generation-shared'
import { truncateVideoCopyAtWord } from '@/lib/generators/video-text-limits'
import {
  estimateVideoSequenceDuration,
  FIELD_MAX_CHARACTERS,
  MAX_BULLETS,
  resolveVideoSequenceDuration,
  STORYTELLING_APERTURA_MAX_CHARACTERS,
  STORYTELLING_CIERRE_MAX_CHARACTERS,
  STORYTELLING_MAX_CHARACTERS,
  TARGET_BULLETS,
  TIPS_CTA_MAX_CHARACTERS,
  TIPS_MAX_CHARACTERS,
  TIPS_TITLE_MAX_CHARACTERS,
  validateSequenceField,
  validateVideoSequence,
  WINDOW_DURATION_SECONDS,
  WINDOW_MAX_CHARACTERS,
} from '@/lib/generators/video-sequence-limits'
import {
  evaluateListicleEligibility,
  listicleCandidatePlaces,
  normalizeListicleItems,
  normalizeStorytellingSegments,
  resolveListicleBulletCount,
  validateVideoListicle,
  validateVideoStorytelling,
  validateVideoTips,
} from '@/lib/generators/video-family-2-contract'

export const VIDEO_FAMILY_2_CONFIG = {
  '2a': { slug: 'listicle', knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['2a'] },
  '2b': { slug: 'storytelling', knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['2b'] },
  '2c': { slug: 'tips', knowledgeFile: VIDEO_KNOWLEDGE_FILE_MAP['2c'] },
} as const satisfies Record<
  VideoFamilia2Subfamilia,
  { slug: string; knowledgeFile: string }
>

interface GenerateVideoFamilia2BaseParams {
  salida: Salida
  niche: Niche
  clientName: string
  clientOnboarding: ClientOnboarding | null
  vozSlug?: string
  clipDurationSeconds?: number
  tipografiasPermitidas: VideoTypographyId[]
  carpeta?: string
}

export type GenerateVideoFamilia2Params =
  | (GenerateVideoFamilia2BaseParams & { subfamilia: '2a' })
  | (GenerateVideoFamilia2BaseParams & { subfamilia: '2b' })
  | (GenerateVideoFamilia2BaseParams & { subfamilia: '2c' })

const MAX_GENERATION_ATTEMPTS = 4

function verifiedSourcesBlock(salida: Salida): string {
  return `=== FUENTES FACTUALES HABILITADAS ===
${JSON.stringify({
    salida: {
      nombre: salida.nombre,
      destino: salida.destino,
      dificultad: salida.nivel,
      itinerario: salida.itinerario,
      itinerario_dias: salida.itinerario_dias,
      puntos_interes: salida.puntos_interes,
      punto_encuentro: salida.punto_encuentro,
      hora_encuentro: salida.hora_encuentro,
    },
  }, null, 2)}

No uses conocimiento general para completar lugares, distancias, tiempos, actividades ni el orden del recorrido.`
}

function responseContract(subfamilia: VideoFamilia2Subfamilia): string {
  if (subfamilia === '2a') {
    return `{
  "titulo": "empieza con la cantidad exacta",
  "items": ["lugar elegido de la lista, copiado tal cual", "otro lugar elegido de la lista, copiado tal cual"],
  "cta": "CTA editorial suave",
  "tipografia_id": "uno de los IDs habilitados",
  "duracion_estimada_segundos": 0
}`
  }
  if (subfamilia === '2c') {
    return `{
  "titulo": "empieza con la cantidad exacta, ej. \\"5 tips para <destino real>\\"",
  "items": ["tip 1, accionable y anclado en un dato real", "tip 2, accionable y anclado en un dato real"],
  "cta": "CTA editorial suave",
  "tipografia_id": "uno de los IDs habilitados",
  "duracion_estimada_segundos": 0
}`
  }
  return `{
  "apertura": "gancho o pregunta",
  "desarrollo": ["segmento 1", "segmento 2"],
  "cierre": "cierre orgánico opcional",
  "tipografia_id": "uno de los IDs habilitados",
  "duracion_estimada_segundos": 0
}`
}

function buildPrompt(
  p: GenerateVideoFamilia2Params,
  typographyIds: VideoTypographyId[],
  clipDurationSeconds: number,
  correction?: string,
): string {
  const context = loadVideoContext({
    niche: p.niche,
    subfamilia: p.subfamilia,
    vozSlug: p.vozSlug,
  })
  const tituloLabel = p.subfamilia === '2a' || p.subfamilia === '2c' ? 'Título' : 'Apertura'
  const ctaLabel = p.subfamilia === '2a' || p.subfamilia === '2c' ? 'CTA' : 'Cierre'
  const bulletLabel = p.subfamilia === '2a' ? 'bullet/ítem' : p.subfamilia === '2c' ? 'tip' : 'segmento de desarrollo'

  // 2a no genera texto libre por bullet: el lugar ES el bullet, capado a
  // WINDOW_MAX_CHARACTERS sin margen para redacción. En vez de pedirle a
  // Gemini que escriba algo verificable y corto a la vez (la tensión que
  // rechazaba ~1 de 5 generaciones), se le da la lista cerrada de lugares
  // verificados que ya entran en la ventana y elige+ordena de ahí — la
  // única parte libre es el título/CTA.
  const listicleCandidates = p.subfamilia === '2a' ? listicleCandidatePlaces(p.salida) : []
  const listicleBulletCount = p.subfamilia === '2a' ? resolveListicleBulletCount(listicleCandidates.length) : 0

  // 2c es texto libre por tip (no hay una lista de candidatos como en 2a:
  // un tip no es un nombre propio) — la cantidad no está pre-calculada,
  // es un objetivo/tope como en 2b. La veracidad se exige en el contenido:
  // cada tip debe anclarse en un dato real de la salida (terreno, clima,
  // distancia, dificultad, logística) o no escribirse.
  const bulletRules = p.subfamilia === '2a'
    ? `- Cada bullet: ventana fija de ${WINDOW_DURATION_SECONDS} segundos en pantalla, uno atrás del otro. Los bullets NO son texto libre: elegí exactamente ${listicleBulletCount} lugares de la lista "LUGARES VERIFICADOS DISPONIBLES" de más abajo y copialos EXACTAMENTE como están escritos, uno por bullet, sin agregar ni quitar texto ni numerarlos.
- Cantidad fija de bullets: ${listicleBulletCount}. Ya la calculó el sistema según los lugares verificados disponibles para esta salida — no la cambies, y ${tituloLabel.toLocaleLowerCase('es-AR')} debe empezar exactamente con ese número.`
    : p.subfamilia === '2c'
    ? `- Cada tip: ventana fija de ${WINDOW_DURATION_SECONDS} segundos en pantalla, uno atrás del otro. LÍMITE DURO propio de este campo: máximo ${TIPS_MAX_CHARACTERS} caracteres — es un cap distinto al de un bullet de lugar (2a) y al del título/CTA de esta misma pieza: un tip es prosa completa, no un nombre que se lee como bloque. Calibrá la longitud de CADA tip contra este número, no contra cuánto lugar tengan el título o el CTA — son tres límites independientes, no un mismo "tono" para toda la pieza. El contenedor envuelve el texto automáticamente hasta 3 líneas si hace falta. Ejemplo real cerca del límite: "Las noches en refugio no siempre tienen ducha caliente." (55 caracteres).
- Cada tip debe ser accionable (algo para hacer o evitar) y estar anclado en un dato real de la salida — terreno, clima, distancia, dificultad, logística o lo que incluye/no incluye. Si no hay un dato que lo sostenga, no lo inventes: preferí un tip real de menos antes que uno genérico o inventado.
- Cada tip debe ser una oración completa. Nunca termines en un verbo que deja la acción abierta (por ejemplo “el terreno es”, “para sumarte vení” o “antes de salir elegí”). El sistema no corta tips para hacerlos entrar: si supera el límite, se rechaza y se vuelve a generar.
- Objetivo: ${TARGET_BULLETS} tips. Nunca más de ${MAX_BULLETS} (tope duro). ${tituloLabel} debe empezar exactamente con la cantidad real de tips que devolviste.
- Si no entra: reducí la CANTIDAD de tips, no comprimas uno con más texto del permitido.`
    : `- Cada ${bulletLabel}: ventana fija de ${WINDOW_DURATION_SECONDS} segundos en pantalla, uno atrás del otro. LÍMITE DURO propio de este campo: máximo ${STORYTELLING_MAX_CHARACTERS} caracteres — el contenedor envuelve el texto automáticamente hasta 3 líneas si hace falta. Calibrá la longitud de CADA segmento contra este número. Ejemplo real de segmento orgánico dentro del límite: "El recorrido es de dificultad media y lleva unas 3 horas" (56 caracteres).
- Objetivo: ${TARGET_BULLETS} ${bulletLabel}s. Nunca más de ${MAX_BULLETS} (tope duro).
- Si no entra: reducí la CANTIDAD de ${bulletLabel}s, no comprimas uno con más texto del permitido.`

  const listicleCandidatesBlock = p.subfamilia === '2a'
    ? `\n=== LUGARES VERIFICADOS DISPONIBLES PARA LOS BULLETS ===
${listicleCandidates.map(place => `- ${place.value}`).join('\n')}
Elegí exactamente ${listicleBulletCount} de esta lista para "items". Copialos EXACTAMENTE como están (mismo texto, mismas mayúsculas y tildes). Podés elegir cuáles y en qué orden, pero no inventes lugares fuera de esta lista, no los combines ni les agregues datos.\n`
    : ''

  // Título/CTA no tienen un dato verificado contra el cual constreñirse
  // como los bullets — son texto libre, así que el único refuerzo posible
  // es dejar el límite igual de explícito: separado del texto sobre timing,
  // con la consecuencia de pasarse (rechazo directo, no hay auto-corte para
  // este campo) y, en el CTA, ejemplos reales dentro del límite.
  // 2c tiene caps propios de título/CTA (65/40, confirmados por Mati) —
  // FIELD_MAX_CHARACTERS=30 se había heredado del cap de bullets de 2a sin
  // validarse para título/CTA, y en 2c el título tiene que nombrar el
  // destino real, con menos margen de entrada que el título atemporal de 2a.
  const titleMaxCharacters = p.subfamilia === '2c' ? TIPS_TITLE_MAX_CHARACTERS : p.subfamilia === '2b' ? STORYTELLING_APERTURA_MAX_CHARACTERS : FIELD_MAX_CHARACTERS
  const ctaMaxCharacters = p.subfamilia === '2c' ? TIPS_CTA_MAX_CHARACTERS : p.subfamilia === '2b' ? STORYTELLING_CIERRE_MAX_CHARACTERS : FIELD_MAX_CHARACTERS
  // "Calibrá SOLO contra este número" existe porque en 2c medimos que
  // subir el margen de título/CTA hacía que Gemini escribiera tips mucho
  // más largos también (hasta 93 chars contra un tope de 60) — un único
  // llamado generando los tres campos juntos parece calibrar un "tono"
  // general en vez de tres límites independientes. El ejemplo ancla por
  // campo (no solo el número) es la otra mitad del mismo arreglo: fuerza
  // una referencia de longitud real cerca del límite de CADA campo.
  const fieldLimitReminder = (maxCharacters: number) =>
    `LÍMITE DURO: máximo ${maxCharacters} caracteres. Calibrá la longitud de este campo SOLO contra este número — no contra el límite de los otros campos de esta pieza, son tres restricciones independientes, no un mismo "tono" para toda la pieza. Si tu frase natural no entra, acortala vos antes de responder — no hay corrección automática de longitud para este campo, un texto largo se rechaza directo.`
  // 2c: tres alternativas en vez de una sola — con un único ejemplo exacto
  // Gemini lo clonaba casi literal entre salidas distintas en vez de usarlo
  // solo como referencia de longitud. Variar el ejemplo (verbo, estructura,
  // longitud dentro del mismo rango) fuerza calibrar el número, no copiar
  // el texto.
  const ctaToneExamples = p.subfamilia === '2c'
    ? ` Tiene que invitar de forma suave a compartir, guardar o elegir — nada comercial (reservas, cupos, precio, WhatsApp). Son ejemplos de LONGITUD, no textos para copiar — escribí el tuyo propio: "Guardalo para tu próxima gran aventura" (38 caracteres), "Compartilo con tu compañero de ruta" (35 caracteres), "Contanos cuál tip te sirvió más" (31 caracteres).`
    : p.subfamilia === '2a'
    ? ` Tiene que invitar de forma suave a compartir, guardar o elegir — nada comercial (reservas, cupos, precio, WhatsApp). Ejemplos reales dentro del límite: "Compartí cuál te gustó más" (26 caracteres), "Guardalo para después" (22 caracteres), "Elegí tu favorito" (18 caracteres).`
    : ''
  // A diferencia de 2a (prohibido nombrar lugar en items) y de 3a-3c
  // (prohibido en todo el copy), en 2c SÍ corresponde nombrar el destino
  // real en el título — la pieza está anclada a UNA salida, no busca ser
  // reutilizable para cualquier otra.
  const tituloExtra = p.subfamilia === '2c'
    ? ` A diferencia de otras familias, en 2c SÍ corresponde nombrar el destino real de la salida en el título (ej. "5 tips para ${p.salida.destino}"). Ejemplo real cerca del límite: "4 cosas para hacer y evitar en la Quebrada de Humahuaca" (55 caracteres) — no te quedes corto, tenés margen hasta ${TIPS_TITLE_MAX_CHARACTERS}.`
    : ''

  return `${videoContextToPromptBlock(context)}

${buildClientBlock(p.clientName, p.clientOnboarding, p.salida)}

${buildSalidaBlock(p.salida, p.clientOnboarding)}

${verifiedSourcesBlock(p.salida)}

=== MATERIAL VISUAL ===
Carpeta seleccionada: ${p.carpeta?.trim() || 'No especificada'}
Techo del clip: ${clipDurationSeconds} segundos.
No supongas qué muestra un clip a partir del nombre de su carpeta.

${SHARED_OPENING_RULES}

${SHARED_SPECIFICITY_RULES}

=== PRECEDENCIA DE FAMILIA 2 ===
La guía específica define una secuencia temporal y prevalece sobre cualquier regla compartida pensada para una apertura estática. Todo dato factual sigue sujeto a las fuentes habilitadas.

=== ESTRUCTURA DE TIEMPO ===
- ${tituloLabel}: fijo en pantalla desde el arranque del video hasta el final. NO es una ventana temporal, no cuenta para la duración. ${fieldLimitReminder(titleMaxCharacters)}${tituloExtra}
${bulletRules}
- ${ctaLabel}: aparece al terminar el último ${bulletLabel} y queda visible hasta el final del clip. Tampoco es una ventana temporal. ${fieldLimitReminder(ctaMaxCharacters)}${ctaToneExamples}
- Duración total del video = (cantidad de ${bulletLabel}s) × ${WINDOW_DURATION_SECONDS}s.
${listicleCandidatesBlock}
=== TIPOGRAFÍAS HABILITADAS ===
${typographyIds.map(id => `- ${id}`).join('\n')}
Elegí exactamente uno de esos IDs.

=== TAREA ===
Generá un video Familia ${p.subfamilia} (${VIDEO_FAMILY_2_CONFIG[p.subfamilia].slug}) con el contrato estructurado de la guía.
No generes slides, roles de carrusel, caption, texto de apoyo ni instrucciones de motion o TTS.
${correction ? `\n=== CORRECCIÓN DIRIGIDA ===\n${correction}\nRehacé el contrato completo corrigiendo únicamente esos defectos.` : ''}

Respondé ÚNICAMENTE con JSON válido:
${responseContract(p.subfamilia)}

El sistema recalculará duracion_estimada_segundos; no agregues campos.`
}

function stringField(raw: unknown, field: string): string {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error(`${field} no es un string válido`)
  return raw.replace(/\r\n?/gu, '\n').trim()
}

function arrayField(raw: unknown, field: string): unknown[] {
  if (!Array.isArray(raw)) throw new Error(`${field} no es un array`)
  return raw
}

function sequenceCorrection(
  bulletsValidation: ReturnType<typeof validateVideoSequence>,
  fields: Record<string, ReturnType<typeof validateSequenceField> | undefined>,
  contractErrors: string[],
  bulletList?: string[],
): string {
  const errors = [...contractErrors]
  if (bulletsValidation.violations.includes('bullet-empty')) errors.push('hay un bullet/segmento vacío')
  if (bulletsValidation.violations.includes('bullet-characters')) {
    if (bulletList && bulletList.length > 0) {
      const longItems = bulletList
        .map((item, idx) => ({ item, len: item.length, idx: idx + 1 }))
        .filter(x => x.len > bulletsValidation.windowMaxCharacters)
      if (longItems.length > 0) {
        for (const x of longItems) {
          const snippet = x.item.length > 35 ? `${x.item.slice(0, 32)}...` : x.item
          errors.push(`bullet/segmento #${x.idx} ("${snippet}") tiene ${x.len} caracteres y el máximo es ${bulletsValidation.windowMaxCharacters}. Reducilo a menos de ${bulletsValidation.windowMaxCharacters} caracteres.`)
        }
      } else {
        errors.push(`un bullet/segmento supera ${bulletsValidation.windowMaxCharacters} caracteres`)
      }
    } else {
      errors.push(`un bullet/segmento supera ${bulletsValidation.windowMaxCharacters} caracteres`)
    }
  }
  if (bulletsValidation.violations.includes('too-many-bullets')) {
    errors.push(`hay ${bulletsValidation.bulletCount} bullets/segmentos y el máximo es ${bulletsValidation.maxBullets} (objetivo: ${bulletsValidation.targetBullets})`)
  }
  for (const [name, validation] of Object.entries(fields)) {
    if (!validation) continue
    if (validation.violations.includes('empty')) errors.push(`${name} está vacío`)
    if (validation.violations.includes('characters')) {
      errors.push(`${name} tiene ${validation.characterCount} caracteres y el máximo es ${validation.maxCharacters}. Acortalo a menos de ${validation.maxCharacters} caracteres.`)
    }
  }
  return errors.map(error => `- ${error}`).join('\n')
}

export function generateVideoFamilia2(
  p: GenerateVideoFamilia2BaseParams & { subfamilia: '2a' },
): Promise<GeneratedVideoListicle>
export function generateVideoFamilia2(
  p: GenerateVideoFamilia2BaseParams & { subfamilia: '2b' },
): Promise<GeneratedVideoStorytelling>
export function generateVideoFamilia2(
  p: GenerateVideoFamilia2BaseParams & { subfamilia: '2c' },
): Promise<GeneratedVideoTips>
export async function generateVideoFamilia2(
  p: GenerateVideoFamilia2Params,
): Promise<GeneratedVideoListicle | GeneratedVideoStorytelling | GeneratedVideoTips> {
  const typographyIds = uniqueVideoTypographyIds(p.tipografiasPermitidas)
  if (typographyIds.length === 0) throw new Error('Familia 2 requiere al menos una tipografía habilitada')

  const listicleBulletCount = p.subfamilia === '2a' ? resolveListicleBulletCount(listicleCandidatePlaces(p.salida).length) : 0
  if (p.subfamilia === '2a') {
    const eligibility = evaluateListicleEligibility(p.salida)
    if (!eligibility.eligible) {
      throw new Error(`Familia 2a (Listicle) requiere al menos ${eligibility.minRequired} lugares verificados de hasta ${WINDOW_MAX_CHARACTERS} caracteres; esta salida tiene ${eligibility.candidateCount}.`)
    }
  }

  const clipDurationSeconds = resolveVideoSequenceDuration(p.clipDurationSeconds)
  let correction: string | undefined
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const result = await generateWithRetryTracked(
      buildPrompt(p, typographyIds, clipDurationSeconds, correction),
      `video-familia-2/${p.subfamilia}[${attempt}/${MAX_GENERATION_ATTEMPTS}]`,
    )
    totalInputTokens += result.inputTokens
    totalOutputTokens += result.outputTokens

    try {
      const raw = extractVideoJson(result.text)
      const typographyId = resolveVideoTypography(raw.tipografia_id, typographyIds)

      if (p.subfamilia === '2a') {
        let titulo = stringField(raw.titulo, 'titulo')
        const items = normalizeListicleItems(arrayField(raw.items, 'items'))
        let cta = stringField(raw.cta, 'cta')
        let bulletsValidation = validateVideoSequence(items, clipDurationSeconds)
        let tituloValidation = validateSequenceField(titulo)
        let ctaValidation = validateSequenceField(cta)
        const contractErrors = validateVideoListicle({ titulo, items, cta, salida: p.salida })
        if (items.length !== listicleBulletCount) {
          contractErrors.push(`items debe tener exactamente ${listicleBulletCount} elementos (cantidad ya calculada por el sistema); Gemini devolvió ${items.length}`)
        }

        if (
          (bulletsValidation.violations.length > 0 || tituloValidation.violations.length > 0 || ctaValidation.violations.length > 0)
          && contractErrors.length === 0
        ) {
          titulo = titulo.length > FIELD_MAX_CHARACTERS ? truncateVideoCopyAtWord(titulo, FIELD_MAX_CHARACTERS) : titulo
          cta = cta.length > FIELD_MAX_CHARACTERS ? truncateVideoCopyAtWord(cta, FIELD_MAX_CHARACTERS) : cta
          bulletsValidation = validateVideoSequence(items, clipDurationSeconds)
          tituloValidation = validateSequenceField(titulo)
          ctaValidation = validateSequenceField(cta)
        }

        if (
          bulletsValidation.violations.length > 0
          || tituloValidation.violations.length > 0
          || ctaValidation.violations.length > 0
          || contractErrors.length > 0
        ) {
          correction = sequenceCorrection(
            bulletsValidation,
            { titulo: tituloValidation, cta: ctaValidation },
            contractErrors,
            items,
          )
          throw new Error(correction)
        }
        return {
          formato: 'video',
          subfamilia: '2a',
          titulo,
          items,
          cta,
          tipografia_id: typographyId,
          duracion_estimada_segundos: estimateVideoSequenceDuration(items.length, clipDurationSeconds),
          metadata: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            clipDurationSeconds,
            knowledgeFile: VIDEO_FAMILY_2_CONFIG['2a'].knowledgeFile,
          },
        }
      }

      if (p.subfamilia === '2c') {
        let titulo = stringField(raw.titulo, 'titulo')
        const items = normalizeListicleItems(arrayField(raw.items, 'items'))
        let cta = stringField(raw.cta, 'cta')
        let bulletsValidation = validateVideoSequence(items, clipDurationSeconds, TIPS_MAX_CHARACTERS)
        let tituloValidation = validateSequenceField(titulo, TIPS_TITLE_MAX_CHARACTERS)
        let ctaValidation = validateSequenceField(cta, TIPS_CTA_MAX_CHARACTERS)
        let contractErrors = validateVideoTips({ titulo, items, cta, salida: p.salida })

        if (
          (bulletsValidation.violations.length > 0 || tituloValidation.violations.length > 0 || ctaValidation.violations.length > 0)
          && contractErrors.length === 0
          && (attempt === MAX_GENERATION_ATTEMPTS || bulletsValidation.violations.every(v => v === 'bullet-characters'))
        ) {
          titulo = titulo.length > TIPS_TITLE_MAX_CHARACTERS ? truncateVideoCopyAtWord(titulo, TIPS_TITLE_MAX_CHARACTERS) : titulo
          cta = cta.length > TIPS_CTA_MAX_CHARACTERS ? truncateVideoCopyAtWord(cta, TIPS_CTA_MAX_CHARACTERS) : cta

          bulletsValidation = validateVideoSequence(items, clipDurationSeconds, TIPS_MAX_CHARACTERS)
          tituloValidation = validateSequenceField(titulo, TIPS_TITLE_MAX_CHARACTERS)
          ctaValidation = validateSequenceField(cta, TIPS_CTA_MAX_CHARACTERS)
          contractErrors = validateVideoTips({ titulo, items, cta, salida: p.salida })
        }

        if (
          bulletsValidation.violations.length > 0
          || tituloValidation.violations.length > 0
          || ctaValidation.violations.length > 0
          || contractErrors.length > 0
        ) {
          correction = sequenceCorrection(
            bulletsValidation,
            { titulo: tituloValidation, cta: ctaValidation },
            contractErrors,
            items,
          )
          throw new Error(correction)
        }
        return {
          formato: 'video',
          subfamilia: '2c',
          titulo,
          items,
          cta,
          tipografia_id: typographyId,
          duracion_estimada_segundos: estimateVideoSequenceDuration(items.length, clipDurationSeconds),
          metadata: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            clipDurationSeconds,
            knowledgeFile: VIDEO_FAMILY_2_CONFIG['2c'].knowledgeFile,
          },
        }
      }

      const apertura = stringField(raw.apertura, 'apertura')
      const desarrollo = normalizeStorytellingSegments(arrayField(raw.desarrollo, 'desarrollo'))
      const cierre = typeof raw.cierre === 'string' && raw.cierre.trim()
        ? raw.cierre.replace(/\s+/gu, ' ').trim()
        : undefined
      const bulletsValidation = validateVideoSequence(desarrollo, clipDurationSeconds, STORYTELLING_MAX_CHARACTERS)
      const aperturaValidation = validateSequenceField(apertura, STORYTELLING_APERTURA_MAX_CHARACTERS)
      const cierreValidation = cierre !== undefined ? validateSequenceField(cierre, STORYTELLING_CIERRE_MAX_CHARACTERS) : undefined
      const contractErrors = validateVideoStorytelling({
        apertura,
        desarrollo,
        cierre,
        salida: p.salida,
      })

      if (
        bulletsValidation.violations.length > 0
        || aperturaValidation.violations.length > 0
        || (cierreValidation?.violations.length ?? 0) > 0
        || contractErrors.length > 0
      ) {
        correction = sequenceCorrection(
          bulletsValidation,
          { apertura: aperturaValidation, cierre: cierreValidation },
          contractErrors,
          desarrollo,
        )
        throw new Error(correction)
      }
      return {
        formato: 'video',
        subfamilia: '2b',
        apertura,
        desarrollo,
        ...(cierre ? { cierre } : {}),
        tipografia_id: typographyId,
        duracion_estimada_segundos: estimateVideoSequenceDuration(desarrollo.length, clipDurationSeconds),
        metadata: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          clipDurationSeconds,
          knowledgeFile: VIDEO_FAMILY_2_CONFIG['2b'].knowledgeFile,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Respuesta inválida'
      correction = message
      console.warn(`[VIDEO/FAMILIA-2/${p.subfamilia}] intento ${attempt} rechazado: ${message}`)
      if (attempt === MAX_GENERATION_ATTEMPTS) {
        throw new Error(`No se pudo generar Familia ${p.subfamilia}: ${message}`)
      }
    }
  }

  throw new Error(`No se pudo generar Familia ${p.subfamilia}`)
}
