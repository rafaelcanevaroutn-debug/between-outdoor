import type { NicheConfiguration } from '../niche-registry.ts'
import { turismoAventuraConfig } from './turismo-aventura.ts'

export const trekkingConfig: NicheConfiguration = {
  id: 'trekking',
  
  prompts: {
    ...turismoAventuraConfig.prompts
  },

  domain_knowledge: [
    'Between tratará trekking como una familia de experiencias a pie en entornos naturales.',
    'El desplazamiento principal es caminar, variando desde senderismo de baja dificultad hasta trekking de sierra o cordillera.',
    'No absorber automáticamente actividades de montañismo técnico, escalada o alta montaña.'
  ],

  subtypes: [
    'senderismo',
    'trekking_dia',
    'trekking_travesia',
    'trekking_sierra',
    'trekking_cordillera'
  ],

  criticalFacts: [
    'price',
    'capacity',
    'availableSpots',
    'date',
    'startTime',
    'distanceKm',
    'elevationGainM',
    'elevationLossM',
    'startAltitudeM',
    'maxAltitudeM',
    'estimatedWalkingHours',
    'physicalDifficulty',
    'technicalDifficulty',
    'terrain',
    'trailCondition',
    'previousExperienceRequired',
    'minimumFitness',
    'minimumAge',
    'equipmentRequired',
    'waterAvailabilityOnRoute',
    'weatherConstraints',
    'permitRequired',
    'trekkingRegistrationRequired',
    'guideCredentials',
    'insurance',
    'routeStatus'
  ],

  buyerQuestions: [
    '¿Dónde voy?',
    '¿Qué voy a ver?',
    '¿Qué tiene de especial este recorrido?',
    '¿Qué se siente hacer esta experiencia?',
    '¿Es para mí?',
    '¿Qué estado físico necesito?',
    '¿Es para principiantes?',
    '¿Necesito experiencia previa?',
    '¿Qué dificultad física tiene?',
    '¿Qué dificultad técnica tiene?',
    '¿Hay edad mínima?',
    '¿Cuántos kilómetros son?',
    '¿Cuánto desnivel tiene?',
    '¿Cuánto tiempo caminamos?',
    '¿A qué altitud llegamos?',
    '¿Qué terreno vamos a encontrar?',
    '¿Dónde nos encontramos?',
    '¿A qué hora?',
    '¿Cómo llegamos al comienzo?',
    '¿Hay transporte?',
    '¿Qué pasa con el clima?',
    '¿Qué llevo?',
    '¿Qué aporta el prestador?',
    '¿Necesito calzado/equipo especial?',
    '¿Hay comida/agua?',
    '¿Quién guía?',
    '¿Qué experiencia tiene?',
    '¿Está habilitado cuando corresponde?',
    '¿Cómo fueron salidas anteriores?',
    '¿Cuánto cuesta?',
    '¿Qué incluye?',
    '¿Quedan cupos?',
    '¿Cómo reservo?',
    '¿Hasta cuándo puedo anotarme?'
  ],

  editorialPillars: [
    'Destination / Desire (Paisaje, lugar, hitos, estación)',
    'Experiencia (Salida, camino, pausas, grupo, llegada)',
    'Ruta (Distancia, desnivel, duración, terreno, etapas)',
    'Fit (Para quién es, dificultad, experiencia requerida)',
    'Preparación (Equipo, ropa, agua, comida, mochila)',
    'Guía / Autoridad (Quién conduce, trayectoria, habilitaciones)',
    'Comunidad / Social Proof (Grupos anteriores, testimonios)',
    'Logística (Fecha, punto de encuentro, transporte, incluye)',
    'Conversión (Precio, cupos, cierre de inscripción, CTA)',
    'Recap / Reactivación (Lo vivido, mejores momentos, próxima fecha)'
  ],

  assetRequirements: [
    'Hero: destino, vista principal, punto icónico',
    'Human: grupo caminando, participantes en escala con el paisaje',
    'POV: sendero desde la perspectiva del participante',
    'Terrain: piso, desnivel visible, cruces o segmentos característicos',
    'Guide: guía hablando, guiando o explicando',
    'Detail: botas, mochila, bastones, señalización, equipo',
    'Moment: descanso, comida, mirador, llegada, celebración',
    'Social proof: grupo, salida anterior, participantes reales',
    'Vertical video: clips breves, verticales, con variedad de planos',
    'Historical: material de salidas anteriores asociado a destino'
  ],

  antipatterns: [
    'No confundir trekking con montañismo técnico.',
    'No describir una salida como apta para principiantes si el prestador no lo declaró.',
    'No inventar distancia, desnivel, altitud ni duración.',
    'No inferir dificultad desde fotos.',
    'No inventar condiciones meteorológicas.',
    'No afirmar que una ruta está habilitada sin dato verificado.',
    'No afirmar habilitaciones o certificaciones del guía sin dato verificado.',
    'No decir que el agua natural es potable.',
    'No prometer seguridad absoluta.',
    'No trivializar requisitos físicos o técnicos.',
    'No convertir cada pieza en un flyer de venta.',
    'No repetir siempre fecha-precio-cupos como único ángulo.',
    'No usar lenguaje de escalada/alta montaña cuando la experiencia no lo requiere.'
  ],

  examples: []
}
