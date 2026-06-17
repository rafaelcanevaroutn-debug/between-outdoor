// Demo/mock data for showcasing the UI without real Supabase credentials

export const DEMO_USER = {
  id: 'demo-user-id',
  email: 'maria@patagoniaexp.com',
  app_metadata: {},
  user_metadata: { full_name: 'María González' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}

export const DEMO_PROFILE = {
  id: 'demo-user-id',
  full_name: 'María González',
  company_name: 'Patagonia Expediciones',
  niche: 'trekking',
  role: 'admin',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const DEMO_SALIDAS = [
  {
    id: 'demo-salida-1',
    user_id: 'demo-user-id',
    nombre: 'Trekking Refugio Frey',
    destino: 'Bariloche, Río Negro',
    fecha_inicio: '2026-07-15',
    fecha_fin: '2026-07-17',
    precio_usd: 280,
    sena_usd: 80,
    nivel: 'media',
    cupos: 8,
    link_inscripcion: 'https://wa.me/5491112345678',
    tipo_viaje: 'escapada_fin_semana',
    itinerario: 'Día 1: Llegada a Bariloche, traslado al campamento base (1500m). Día 2: Ascenso al Refugio Frey (1700m), vista panorámica a los cerros Catedral y Capilla. Día 3: Descenso y regreso.',
    que_incluye: 'Guía certificado, equipo de camping de alta montaña, comidas en ruta (desayunos y almuerzos), botiquín de emergencia',
    que_no_incluye: 'Traslados desde/hacia Buenos Aires, seguro de viaje (obligatorio), equipamiento personal',
    estado: 'activa',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-salida-2',
    user_id: 'demo-user-id',
    nombre: 'Expedición Cerro Torre',
    destino: 'El Chaltén, Santa Cruz',
    fecha_inicio: '2026-08-01',
    fecha_fin: '2026-08-10',
    precio_usd: 1200,
    sena_usd: 350,
    nivel: 'alta',
    cupos: 6,
    link_inscripcion: 'https://patagoniaexp.com/cerro-torre',
    tipo_viaje: 'expedicion_premium',
    itinerario: '10 días completos en la Patagonia austral. Trekking de alta dificultad con ascenso a campamentos base del Cerro Torre.',
    que_incluye: 'Guía de alta montaña certificado UIAGM, equipo técnico completo, carpas 4 estaciones, alimentación completa, traslados internos',
    que_no_incluye: 'Vuelos a El Calafate, seguro de rescate (obligatorio), equipamiento personal de montaña',
    estado: 'borrador',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-salida-3',
    user_id: 'demo-user-id',
    nombre: 'Cascada del Mallín',
    destino: 'San Martín de los Andes, Neuquén',
    fecha_inicio: '2026-06-22',
    fecha_fin: '2026-06-22',
    precio_usd: 65,
    sena_usd: null,
    nivel: 'baja',
    cupos: 15,
    link_inscripcion: 'https://wa.me/5491187654321',
    tipo_viaje: 'salida_un_dia',
    itinerario: 'Salida a las 8hs desde el centro de San Martín. Caminata de 3hs ida y vuelta hasta la cascada. Regreso a las 16hs.',
    que_incluye: 'Guía, snack en el camino, bastones de trekking',
    que_no_incluye: 'Traslados, almuerzo',
    estado: 'activa',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const DEMO_CONTENIDO = [
  { id: 'c1', salida_id: 'demo-salida-1', vertical: 'aspiracional', titulo: 'Cuando el mundo se silencia, vos empezás a escucharte', subtitulo: 'Tres días en el Refugio Frey. Sin señal, sin reuniones, sin urgencias. Solo montaña, grupo y vos.', bullets: ['Nivel medio | Solo necesitás querer llegar', 'Cupos limitados a 8 personas', 'Todo incluido desde USD 280'], cta: 'Reservá tu lugar antes del 30 de junio', video_crudo: 'Paisajes del destino', mes: 'julio 2026', is_edited: false, user_id: 'demo-user-id', slot_key: 'paisajes', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c2', salida_id: 'demo-salida-1', vertical: 'conversion', titulo: 'Quedan 3 lugares para el fin de semana del 15 de julio', subtitulo: 'Trekking Refugio Frey — 3 días en Bariloche desde USD 280. Seña de solo USD 80.', bullets: ['Guía certificado incluido', 'Comidas en ruta incluidas', 'Partida confirmada con 4 personas'], cta: 'Mandanos un WhatsApp para reservar → https://wa.me/5491112345678', video_crudo: 'Guía hablando a cámara', mes: 'julio 2026', is_edited: true, user_id: 'demo-user-id', slot_key: 'guia_camara', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c3', salida_id: 'demo-salida-1', vertical: 'comunidad', titulo: 'Así quedó el grupo del Frey el año pasado', subtitulo: 'Extraños en el punto de encuentro. Amigos en la cumbre. Siempre pasa lo mismo.', bullets: ['8 personas máximo', 'Grupos mixtos, edades 28-52', 'Muchos vuelven solos y se van con gente'], cta: 'Sumate al próximo. Quedan 3 lugares.', video_crudo: 'Grupo / convivencia', mes: 'julio 2026', is_edited: false, user_id: 'demo-user-id', slot_key: 'grupo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'c4', salida_id: 'demo-salida-1', vertical: 'salud_mental', titulo: 'No es un viaje. Es el reset que venías postergando', subtitulo: 'Tres días sin pantallas. Con el cerro de fondo y el aire limpio de la Patagonia. El cuerpo lo pide, la mente lo necesita.', bullets: ['Desconexión real garantizada', 'Sin señal en la montaña (por diseño)', 'Regresás otro'], cta: 'Frey, 15 al 17 de julio — USD 280', video_crudo: 'Amaneceres / atardeceres', mes: 'julio 2026', is_edited: false, user_id: 'demo-user-id', slot_key: 'amaneceres', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const DEMO_SLOTS = [
  { id: 's1', salida_id: 'demo-salida-1', slot_key: 'paisajes', slot_label: 'Paisajes del destino', slot_description: 'Fotos/videos de los paisajes más icónicos del destino', sort_order: 0, created_at: new Date().toISOString(), files: [{ id: 'f1', slot_id: 's1', salida_id: 'demo-salida-1', file_name: 'frey_panorama.jpg', file_path: 'demo/frey_panorama.jpg', file_type: 'image/jpeg', file_size: 2400000, storage_url: null, created_at: new Date().toISOString() }] },
  { id: 's2', salida_id: 'demo-salida-1', slot_key: 'grupo', slot_label: 'Grupo / convivencia', slot_description: 'Fotos del grupo en acción, momentos de convivencia', sort_order: 1, created_at: new Date().toISOString(), files: [{ id: 'f2', slot_id: 's2', salida_id: 'demo-salida-1', file_name: 'grupo_frey.mp4', file_path: 'demo/grupo_frey.mp4', file_type: 'video/mp4', file_size: 18000000, storage_url: null, created_at: new Date().toISOString() }] },
  { id: 's3', salida_id: 'demo-salida-1', slot_key: 'trekking_marcha', slot_label: 'Trekking en marcha', slot_description: 'Videos del grupo caminando, subiendo, en acción real', sort_order: 2, created_at: new Date().toISOString(), files: [] },
  { id: 's4', salida_id: 'demo-salida-1', slot_key: 'amaneceres', slot_label: 'Amaneceres / atardeceres', slot_description: 'Los mejores momentos de luz del día', sort_order: 3, created_at: new Date().toISOString(), files: [{ id: 'f3', slot_id: 's4', salida_id: 'demo-salida-1', file_name: 'amanecer_catedral.jpg', file_path: 'demo/amanecer.jpg', file_type: 'image/jpeg', file_size: 3100000, storage_url: null, created_at: new Date().toISOString() }] },
  { id: 's5', salida_id: 'demo-salida-1', slot_key: 'guia_camara', slot_label: 'Guía hablando a cámara', slot_description: 'El guía explicando el destino, dando tips', sort_order: 4, created_at: new Date().toISOString(), files: [{ id: 'f4', slot_id: 's5', salida_id: 'demo-salida-1', file_name: 'guia_intro.mp4', file_path: 'demo/guia.mp4', file_type: 'video/mp4', file_size: 22000000, storage_url: null, created_at: new Date().toISOString() }] },
  { id: 's6', salida_id: 'demo-salida-1', slot_key: 'testimonios', slot_label: 'Testimonios', slot_description: 'Participantes contando su experiencia en cámara', sort_order: 5, created_at: new Date().toISOString(), files: [] },
  { id: 's7', salida_id: 'demo-salida-1', slot_key: 'pov', slot_label: 'POV primera persona', slot_description: 'Material grabado en primera persona', sort_order: 6, created_at: new Date().toISOString(), files: [] },
  { id: 's8', salida_id: 'demo-salida-1', slot_key: 'refugios', slot_label: 'Refugios / campamento', slot_description: 'El lugar donde se pernocta, carpas, refugios', sort_order: 7, created_at: new Date().toISOString(), files: [] },
]

export const DEMO_KNOWLEDGE_BASE = [
  { id: 'kb1', niche: 'trekking', vertical: 'aspiracional', titulo: 'La cumbre no es el destino', contenido: 'La cumbre no es el destino. Es la excusa. Lo que realmente buscás está en el camino: el silencio de la montaña, la respiración del grupo, ese momento en que el mundo de abajo desaparece. Bariloche, julio. Hay lugar.', tags: ['gancho', 'emocional'], activo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'kb2', niche: 'trekking', vertical: 'conversion', titulo: 'Quedan 2 lugares — urgencia real', contenido: 'Quedan 2 lugares para el 15 de julio. No es marketing. Tenemos 8 cupos y ya confirmaron 6. Si estabas esperando la señal, esta es. Seña de USD 80 para reservar. Respondé este mensaje con tu nombre.', tags: ['urgencia', 'escasez'], activo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'kb3', niche: 'trekking', vertical: 'salud_mental', titulo: 'El reset que necesitás', contenido: '37 notificaciones. 4 reuniones seguidas. La bandeja de entrada que no para. Y vos, mirando el teléfono a las 11 de la noche preguntándote cuándo fue la última vez que estuviste presente de verdad. Patagonia tiene esa respuesta.', tags: ['burnout', 'desconexion'], activo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]
