import { TipoViaje, Vertical, SubVertical, FormatoContenido } from '@/types'

// Subverticales asignadas automáticamente por rotación cuando hay múltiples piezas
export const SALUD_MENTAL_SUBVERTICALS: SubVertical[] = [
  'desconexion', 'naturaleza_terapia', 'bienestar_fisico', 'reflexion', 'ansiedad_depresion',
]

export const COMUNIDAD_SUBVERTICALS: SubVertical[] = [
  'conexion_humana', 'la_tribu', 'convivencia', 'logros_grupo',
]

// Carpeta de material genérica por vertical — fallback hasta conectar Drive real
export const VERTICAL_MATERIAL_DEFAULT: Record<Vertical, string> = {
  promocional:   'paisaje',
  conversion:    'paisaje',
  aspiracional:  'paisaje',
  pov:           'pov',
  autoridad:     'guia',
  salud_mental:  'naturaleza',
  transformacion:'grupo',
  prueba_social: 'testimonios',
  comunidad:     'gente',
  objeciones:    'guia',
}

// Formato por defecto por vertical — preferencia suave, no regla rígida.
// "Todo puede ir con todo" — esto es solo el punto de partida editable.
export const VERTICAL_FORMATO_DEFAULT: Record<Vertical, FormatoContenido> = {
  promocional:   'video',     // vender mostrando → video o carrusel
  conversion:    'video',     // urgencia + CTA → video corto
  aspiracional:  'video',     // despertar deseo → video de paisaje
  pov:           'video',     // inmersión primera persona → video
  autoridad:     'carrusel',  // credenciales + trayectoria → carrusel
  salud_mental:  'flyer',     // reflexión / cita → flyer con frase
  transformacion:'carrusel',  // antes/después → carrusel narrativo
  prueba_social: 'carrusel',  // testimonio desarrollado → carrusel
  comunidad:     'video',     // convivencia en acción → video
  objeciones:    'carrusel',  // preguntas frecuentes → carrusel
}

export const SUBVERTICAL_LABELS: Record<SubVertical, string> = {
  desconexion:           'Desconexión',
  naturaleza_terapia:    'Naturaleza como terapia',
  bienestar_fisico:      'Bienestar físico',
  reflexion:             'Reflexión',
  ansiedad_depresion:    'Ansiedad y depresión',
  conexion_humana:       'Conexión humana real',
  critica_vida_moderna:  'Crítica a la vida moderna',
  la_tribu:              'La tribu',
  convivencia:           'Convivencia',
  logros_grupo:          'Logros del grupo',
}

export const SUBVERTICAL_DESCRIPTIONS: Record<SubVertical, string> = {
  desconexion:          'Enfocate en una pausa o cambio de entorno basado en motivaciones confirmadas. Pantallas, trabajo y ruido digital solo si el onboarding los menciona.',
  naturaleza_terapia:   'El efecto reparador de la naturaleza: caminar en silencio, el sonido del agua, el aire frío. No es turismo, es medicina.',
  bienestar_fisico:     'Lo que el cuerpo gana al moverse en la naturaleza. Contra el sedentarismo. El cansancio sano vs el cansancio de escritorio.',
  reflexion:            'Contenido filosófico y contemplativo. Frases que invitan a pensar. Tono irónico o profundo según el estilo del nicho.',
  ansiedad_depresion:   'La montaña como respuesta a la ansiedad y la depresión actuales. Empático, sin romantizar ni trivializar. Conecta con lo que siente el buyer de verdad.',
  conexion_humana:      'Conocer gente nueva, hacer amigos reales. Contra el aislamiento y las redes sociales. La experiencia como puente entre personas.',
  critica_vida_moderna: 'El encierro urbano, la dependencia del celular, el sedentarismo como problema social. Tono irónico o reflexivo, no sermoneador.',
  la_tribu:             'Pertenencia a algo más grande. Tu gente, tu comunidad outdoor. La identidad compartida del que se mueve en la montaña.',
  convivencia:          'Los mates en el campamento, el fogón, el asado después de la caminata. Lo cotidiano del grupo que humaniza y genera deseo.',
  logros_grupo:         'Celebrar a los que hicieron cumbre, a los que se animaron por primera vez. El logro colectivo como motor de comunidad.',
}

// Mix para modo "mantener_cuenta": contenido permanente entre salidas.
// No depende del tipo_viaje — es fijo por nicho (por ahora igual para todos).
export const MANTENER_CUENTA_MIX: Partial<Record<Vertical, number>> = {
  salud_mental:  0.35,  // la vertical que más conecta y se comparte
  comunidad:     0.25,
  aspiracional:  0.20,
  pov:           0.20,
}

export const VERTICAL_LABELS: Record<Vertical, string> = {
  promocional: 'Promocional',
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
  promocional: '#10B981',
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
  salida_recurrente: {
    comunidad: 0.35,
    conversion: 0.25,
    pov: 0.15,
    aspiracional: 0.15,
    prueba_social: 0.10,
  },
  viaje_playa_caribe: {
    aspiracional: 0.30,
    conversion: 0.25,
    comunidad: 0.15,
    pov: 0.10,
    prueba_social: 0.10,
    objeciones: 0.10,
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
  promocional: `Eres un copywriter experto en venta directa para turismo aventura. Tu objetivo es mostrar la salida de forma concreta y atractiva: destino, fecha, qué incluye, cómo reservar. Es "vender mostrando". Mencioná la seña como barrera de entrada baja (ej: "reservás con USD 50"), no el precio total a la vista si la salida es larga. Tono: directo, humano, concreto. No es un folleto — es como si el guía te estuviera contando la salida en persona.`,

  conversion: `Eres un copywriter experto en conversión para turismo aventura. Tu objetivo es generar contenido que lleve directamente a la acción de inscripción. Escribe con urgencia genuina, destacando precio, cupos limitados y facilidad de reserva. Tono: directo, claro, sin rodeos. CTA siempre presente y específico.`,

  aspiracional: `Eres un copywriter experto en contenido aspiracional para turismo aventura. Tu objetivo es despertar el deseo de vivir esa experiencia. Pinta el escenario perfectamente: la sensación de estar ahí, lo que se ve, se siente, se respira. Tono: evocador, cinematográfico, poético pero concreto. CTA suave, invitacional.`,

  pov: `Eres un copywriter especializado en contenido POV (primera persona) para turismo aventura. Escribe desde la perspectiva del participante en plena experiencia: "Estás parado en la cima...", "El viento te golpea la cara...". Inmersivo, presente, visceral. Usa la segunda persona (tú). CTA que lleva a querer vivir eso.`,

  autoridad: `Eres un copywriter experto en posicionamiento de autoridad para guías de montaña y agencias de turismo aventura. Tu objetivo es construir credibilidad y confianza. Habla de experiencia, trayectoria, certificaciones, seguridad, metodología. Tono: experto pero accesible, confiable. CTA basado en confianza.`,

  salud_mental: `Eres un copywriter experto en bienestar para turismo aventura. Tu objetivo es conectar la experiencia con movimiento, naturaleza, disfrute, descanso o cambio de entorno según el perfil real del cliente. No asumas edad, profesión, oficina, pantallas, ciudad ni estrés laboral. Esos elementos solo pueden aparecer si están confirmados en el onboarding. No presentes la experiencia como terapia, cura ni transformación garantizada. Tono: humano, concreto, sin vender explícitamente. CTA suave.`,

  transformacion: `Eres un copywriter experto en narrativas de transformación personal para turismo aventura. Tu objetivo es mostrar cómo la experiencia cambia a las personas: antes/después, el límite superado, la versión mejorada de uno mismo. Tono: inspiracional, profundo, transformador. CTA orientado al cambio personal.`,

  prueba_social: `Eres un copywriter experto en prueba social para turismo aventura. Tu objetivo es mostrar que otros lo vivieron y lo amaron. Usa testimonios reales (o construye casos verosímiles), menciona grupos anteriores, resultados concretos, comunidad activa. Tono: auténtico, cercano, humano. CTA basado en "únete a quienes ya lo vivieron".`,

  comunidad: `Eres un copywriter experto en construcción de comunidad para turismo aventura. Tu objetivo es hacer sentir al potencial cliente que pertenece a algo más grande: una tribu de personas que comparten valores. Habla del grupo, las amistades que se forman, la identidad compartida. Tono: cálido, inclusivo, tribal. CTA orientado a "ser parte de".`,

  objeciones: `Eres un copywriter experto en manejo de objeciones para turismo aventura. Tu objetivo es anticipar y resolver las dudas más frecuentes: "es muy caro", "no tengo condición física", "no conozco a nadie del grupo", "no sé si es seguro". Responde con evidencia, empatía y argumentos concretos. Tono: honesto, directo, tranquilizador. CTA confiante.`,
}
