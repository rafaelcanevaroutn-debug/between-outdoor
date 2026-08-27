import type { ClientOnboarding, Salida } from '@/types'
import { formatFechaSalida } from '../utils/dates.ts'

export function buildClientBlock(clientName: string, onboarding: ClientOnboarding | null): string {
  const lines = [`- Marca: ${clientName}`]
  if (onboarding?.avatar_edad_genero) lines.push(`- Público: ${onboarding.avatar_edad_genero}`)
  if (onboarding?.avatar_experiencia) lines.push(`- Experiencia del público: ${onboarding.avatar_experiencia}`)
  if (onboarding?.avatar_objeciones) lines.push(`- Objeciones reales: ${onboarding.avatar_objeciones}`)
  if (onboarding?.avatar_motor?.length) lines.push(`- Motivaciones: ${onboarding.avatar_motor.join(', ')}`)
  if (onboarding?.marca_personalidad) lines.push(`- Voz de marca: ${onboarding.marca_personalidad}`)
  if (onboarding?.marca_lineas_rojas) lines.push(`- Líneas rojas: ${onboarding.marca_lineas_rojas}`)
  if (onboarding?.embudo_paso) lines.push(`- Canal de conversión: ${onboarding.embudo_paso}`)
  return `=== PERFIL DEL CLIENTE ===\n${lines.join('\n')}`
}

export function buildSalidaBlock(salida: Salida): string {
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
  return `=== DATOS VERIFICADOS DE LA SALIDA ===\n${lines.join('\n')}`
}
