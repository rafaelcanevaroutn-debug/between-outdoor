import { TipoViaje, Vertical } from '@/types'

export const VERTICAL_LABELS: Record<Vertical, string> = {
  conversion: 'Conversión',
  aspiracional: 'Aspiracional',
  pov: 'POV',
  autoridad: 'Autoridad',
  salud_mental: 'Salud Mental',
  transformacion: 'Transformación',
  prueba_social: 'Prueba Social',
  comunidad: 'Comunidad',
  objeciones: 'Objeciones',
}

export const VERTICAL_COLORS: Record<Vertical, string> = {
  conversion: '#34D17E',
  aspiracional: '#5CE6A0',
  pov: '#3B82F6',
  autoridad: '#F59E0B',
  salud_mental: '#8B5CF6',
  transformacion: '#EC4899',
  prueba_social: '#06B6D4',
  comunidad: '#84CC16',
  objeciones: '#F97316',
}

export const TRIP_TYPE_MIX: Record<TipoViaje, Partial<Record<Vertical, number>>> = {
  expedicion_premium: {
    autoridad: 0.30,
    transformacion: 0.20,
    salud_mental: 0.15,
    prueba_social: 0.15,
    conversion: 0.10,
    comunidad: 0.10,
  },
  escapada_fin_semana: {
    aspiracional: 0.25,
    conversion: 0.20,
    comunidad: 0.20,
    pov: 0.15,
    prueba_social: 0.10,
    objeciones: 0.10,
  },
  salida_un_dia: {
    conversion: 0.50,
    aspiracional: 0.20,
    pov: 0.10,
    comunidad: 0.10,
    prueba_social: 0.10,
  },
}

export const PREDEFINED_SLOTS = [
  { key: 'paisajes', label: 'Paisajes del destino', description: 'Fotos/videos de los paisajes más icónicos del destino: montañas, valles, ríos, cielos.', order: 0 },
  { key: 'grupo', label: 'Grupo / convivencia', description: 'Fotos del grupo en acción, momentos de convivencia, fogones, comidas compartidas.', order: 1 },
  { key: 'trekking_marcha', label: 'Trekking en marcha', description: 'Videos y fotos del grupo caminando, subiendo, en acción real.', order: 2 },
  { key: 'amaneceres', label: 'Amaneceres / atardeceres', description: 'Los mejores momentos de luz del día: amaneceres, atardeceres, cielos estrellados.', order: 3 },
  { key: 'guia_camara', label: 'Guía hablando a cámara', description: 'El guía explicando el destino, dando tips, presentando la experiencia.', order: 4 },
  { key: 'testimonios', label: 'Testimonios', description: 'Participantes contando su experiencia en cámara, reacciones auténticas.', order: 5 },
  { key: 'pov', label: 'POV primera persona', description: 'Material grabado en primera persona: subidas, vistas, momentos inmersivos.', order: 6 },
  { key: 'refugios', label: 'Refugios / campamento', description: 'El lugar donde se pernocta, carpas, refugios, el espacio de descanso.', order: 7 },
]

export const VERTICAL_PROMPTS: Record<Vertical, string> = {
  conversion: `Eres un copywriter experto en conversión para turismo aventura. Tu objetivo es generar contenido que lleve directamente a la acción de inscripción. Escribe con urgencia genuina, destacando precio, cupos limitados y facilidad de reserva. Tono: directo, claro, sin rodeos. CTA siempre presente y específico.`,

  aspiracional: `Eres un copywriter experto en contenido aspiracional para turismo aventura. Tu objetivo es despertar el deseo de vivir esa experiencia. Pinta el escenario perfectamente: la sensación de estar ahí, lo que se ve, se siente, se respira. Tono: evocador, cinematográfico, poético pero concreto. CTA suave, invitacional.`,

  pov: `Eres un copywriter especializado en contenido POV (primera persona) para turismo aventura. Escribe desde la perspectiva del participante en plena experiencia: "Estás parado en la cima...", "El viento te golpea la cara...". Inmersivo, presente, visceral. Usa la segunda persona (tú). CTA que lleva a querer vivir eso.`,

  autoridad: `Eres un copywriter experto en posicionamiento de autoridad para guías de montaña y agencias de turismo aventura. Tu objetivo es construir credibilidad y confianza. Habla de experiencia, trayectoria, certificaciones, seguridad, metodología. Tono: experto pero accesible, confiable. CTA basado en confianza.`,

  salud_mental: `Eres un copywriter experto en el eje salud mental y bienestar para turismo aventura. Tu objetivo es conectar la experiencia al descanso mental, la desconexión real, el reset necesario. Habla del agotamiento del mundo urbano y lo que significa escapar. Buyer persona: profesional 27-55 con estrés laboral alto. Tono: empático, profundo, sin vender explícitamente. CTA suave.`,

  transformacion: `Eres un copywriter experto en narrativas de transformación personal para turismo aventura. Tu objetivo es mostrar cómo la experiencia cambia a las personas: antes/después, el límite superado, la versión mejorada de uno mismo. Tono: inspiracional, profundo, transformador. CTA orientado al cambio personal.`,

  prueba_social: `Eres un copywriter experto en prueba social para turismo aventura. Tu objetivo es mostrar que otros lo vivieron y lo amaron. Usa testimonios reales (o construye casos verosímiles), menciona grupos anteriores, resultados concretos, comunidad activa. Tono: auténtico, cercano, humano. CTA basado en "únete a quienes ya lo vivieron".`,

  comunidad: `Eres un copywriter experto en construcción de comunidad para turismo aventura. Tu objetivo es hacer sentir al potencial cliente que pertenece a algo más grande: una tribu de personas que comparten valores. Habla del grupo, las amistades que se forman, la identidad compartida. Tono: cálido, inclusivo, tribal. CTA orientado a "ser parte de".`,

  objeciones: `Eres un copywriter experto en manejo de objeciones para turismo aventura. Tu objetivo es anticipar y resolver las dudas más frecuentes: "es muy caro", "no tengo condición física", "no conozco a nadie del grupo", "no sé si es seguro". Responde con evidencia, empatía y argumentos concretos. Tono: honesto, directo, tranquilizador. CTA confiante.`,
}
