import type { ClientOnboarding, Salida } from '@/types'
import { formatFechaSalida } from '../utils/dates.ts'
import { buildCommercialProfilePrompt, normalizeCampaignContext, resolveContentProfile } from '../commercial-content-profiles.ts'
import { resolveRecurringMeetingDetails } from '../recurring-meeting-details.ts'
import { buildSalidaContentContextPrompt } from '../content-context/prompt.ts'

export function buildClientBlock(
  _clientName: string,
  onboarding: ClientOnboarding | null,
  salida?: Salida | null,
): string {
  const campaign = normalizeCampaignContext(onboarding?.campaign_context)
  const hidesPersonalIdentity = resolveContentProfile(onboarding, salida) === 'dupla_viajes_internacionales'
    || salida?.tipo_viaje === 'viaje_playa_caribe'
  // En viajes internacionales no mandamos el nombre administrativo ni el
  // nombre público: la cuenta
  // puede contener nombres de personas y el modelo terminaba escribiendo
  // “Franco te cuenta” o “con Renzo”, aunque nadie lo hubiese pedido.
  const lines = hidesPersonalIdentity
    ? ['- Identidad del emisor: neutra. No uses nombres propios ni presentes a una persona como narrador.']
    : [`- Marca pública: ${campaign.nombre_publico ?? _clientName}`]
  if (onboarding?.avatar_edad_genero) lines.push(`- Público: ${onboarding.avatar_edad_genero}`)
  if (onboarding?.avatar_experiencia) lines.push(`- Experiencia del público: ${onboarding.avatar_experiencia}`)
  if (onboarding?.avatar_objeciones) lines.push(`- Objeciones reales: ${onboarding.avatar_objeciones}`)
  if (onboarding?.avatar_motor?.length) lines.push(`- Motivaciones: ${onboarding.avatar_motor.join(', ')}`)
  if (onboarding?.marca_personalidad) lines.push(`- Voz de marca: ${onboarding.marca_personalidad}`)
  if (onboarding?.marca_lineas_rojas) lines.push(`- Líneas rojas: ${onboarding.marca_lineas_rojas}`)
  if (onboarding?.embudo_paso) lines.push(`- Canal de conversión: ${onboarding.embudo_paso}`)
  const commercialProfile = buildCommercialProfilePrompt(onboarding, salida)
  // Esta regla es innegociable para todos los perfiles y todos los formatos.
  // No depende del perfil comercial: el copy siempre es en primera persona.
  const voiceRule = 'REGLA DE VOZ INNEGOCIABLE: el copy se escribe siempre en primera persona, como si el propio usuario lo hubiese publicado. Nunca nombrés al titular de la cuenta en tercera persona (ejemplos prohibidos: “Renzo te cuenta”, “con Franco”, “Hoy Juan te explica”, “lo que hace la guía” atribuido a una persona por nombre). Si el contenido requiere una voz, es “yo”, “nosotros” o la marca, nunca el nombre propio como narrador externo.'
  return [`=== PERFIL DEL CLIENTE ===\n${lines.join('\n')}`, commercialProfile, voiceRule]
    .filter(Boolean)
    .join('\n\n')
}

export function buildSalidaBlock(salida: Salida, onboarding: ClientOnboarding | null = null): string {
  const campaign = normalizeCampaignContext(onboarding?.campaign_context)
  const contentContext = buildSalidaContentContextPrompt(salida)
  if (salida.tipo_viaje === 'salida_recurrente' && salida.grupo_info) {
    const group = salida.grupo_info
    const meeting = resolveRecurringMeetingDetails(onboarding, salida)
    const lines = [
      `- Nombre: ${salida.nombre}`,
      `- Tipo: ${group.tipo_organizacion ?? 'grupo'} outdoor`,
      `- Actividad: ${group.actividad ?? campaign.actividad ?? 'actividad outdoor'}`,
      `- Ciudad o zona donde opera el grupo: ${salida.destino}. Es contexto territorial; no es un punto de encuentro ni un recorrido concreto.`,
      `- Esta oferta es recurrente y no es un viaje único: usa días/hora como logística y trata los lugares como alternativas de salida.`,
      salida.lugares_recurrentes?.length ? `- Lugares/recorridos habituales verificados por el cliente: ${salida.lugares_recurrentes.join(', ')}` : null,
      salida.frecuencia ? `- Frecuencia: ${salida.frecuencia}` : null,
      salida.dias_semana?.length ? `- Días confirmados: ${salida.dias_semana.join(', ')}` : null,
      meeting.complete && meeting.label
        ? `- Bloque obligatorio si se menciona el encuentro: ${meeting.label}`
        : salida.punto_encuentro
          ? '- Punto de encuentro cargado pero agenda incompleta: NO nombrarlo hasta tener día y hora.'
          : '- Punto de encuentro: NO CARGADO. No inferirlo desde la ciudad, la zona o un sendero.',
      group.propuesta ? `- Propuesta: ${group.propuesta}` : null,
      group.dirigido_a ? `- Dirigido a: ${group.dirigido_a}` : null,
      group.dinamica ? `- Dinámica: ${group.dinamica}` : null,
      group.responsables ? `- Responsables: ${group.responsables}` : null,
      group.requisitos ? `- Requisitos: ${group.requisitos}` : null,
      group.equipamiento ? `- Equipo necesario: ${group.equipamiento}` : null,
      `- Capacidad habitual por encuentro: ${salida.cupos}`,
      `- Precio habitual cargado: ${salida.moneda ?? 'ARS'} ${salida.precio_usd}`,
    ].filter(Boolean)
    return [`=== DATOS VERIFICADOS DEL GRUPO O ACADEMIA ===\n${lines.join('\n')}\nNo existe un itinerario fijo ni una fecha única: no inventes etapas, días de viaje o recorridos cerrados. La ciudad/zona, el punto de encuentro opcional y los lugares recorridos son conceptos distintos. Si el material visual no viene identificado por una subcarpeta del lugar, escribí sobre el grupo o el territorio sin atribuir la imagen a un sitio exacto. El punto de encuentro nunca puede aparecer como un destino o paisaje; si se usa, debe conservar su bloque logístico completo.`, contentContext].filter(Boolean).join('\n\n')
  }
  if (onboarding?.content_profile === 'grupo_recurrente_local') {
    const lines = [
      `- Oferta: ${campaign.nombre_oferta ?? campaign.actividad ?? 'Salida local en grupo'}`,
      campaign.territorio ? `- Territorio: ${campaign.territorio}` : null,
      campaign.destinos?.length ? `- Destinos habilitados: ${campaign.destinos.join(', ')}` : null,
      campaign.frecuencia_confirmada ? '- Frecuencia semanal confirmada: sí' : '- Frecuencia, días y horarios: NO CONFIRMADOS',
    ].filter(Boolean)
    return [`=== DATOS VERIFICADOS DE LA CAMPAÑA LOCAL ===\n${lines.join('\n')}\nNo uses la fecha, el precio, los cupos ni el destino del registro técnico vinculado: ese registro solo presta material visual.`, contentContext].filter(Boolean).join('\n\n')
  }
  const start = new Date(`${salida.fecha_inicio}T00:00:00Z`)
  const end = new Date(`${salida.fecha_fin}T00:00:00Z`)
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)
  const lines = [
    `- Nombre: ${salida.nombre}`,
    `- Destino: ${salida.destino}`,
    `- Fecha: ${formatFechaSalida(salida.fecha_inicio, salida.fecha_fin)}`,
    `- Duración calendario exacta: ${durationDays} días (${Math.max(0, durationDays - 1)} noches si la salida incluye todas las noches intermedias)`,
    `- Nivel: ${salida.nivel}`,
    `- Cupos: ${salida.cupos}`,
    `- Precio: ${salida.moneda ?? 'USD'} ${salida.precio_usd}`,
  ]
  if (salida.zona_geografica) lines.push(`- Entorno Geográfico: ${salida.zona_geografica} (Usa esta información para dar contexto visual, climático y temático a los textos)`)
  if (salida.que_incluye) lines.push(`- Incluye (dato exacto): ${salida.que_incluye}`)
  if (salida.link_inscripcion) lines.push(`- Inscripción: ${salida.link_inscripcion}`)
  lines.push(salida.punto_encuentro
    ? `- Punto de encuentro confirmado por el guía: ${salida.punto_encuentro}`
    : '- Punto de encuentro: NO CARGADO. No inferirlo desde el inicio de un sendero, una ubicación o un destino.')
  if (salida.hora_encuentro) lines.push(`- Hora de encuentro confirmada: ${salida.hora_encuentro}`)
  return [`=== DATOS VERIFICADOS DE LA SALIDA ===\n${lines.join('\n')}`, contentContext].filter(Boolean).join('\n\n')
}
