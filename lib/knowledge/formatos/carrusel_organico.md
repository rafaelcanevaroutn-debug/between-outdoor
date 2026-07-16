# FORMATO: CARRUSEL ORGÁNICO

## Qué es
El formato que más convierte en cuentas reales de outdoor (Ibera, Pura Vida Trips). Mínimo texto, máxima foto. Parece hecho en el momento, no producido. La venta es sutil: una frase que engancha, los datos una sola vez, y fotos que hablan solas.

## Estructura de slides (5 slides por límite actual de render)

SLIDE 1 — LA FRASE
- Una sola frase que para el scroll. Dos registros posibles:
  a) Reflexiva: aforismo sobre la vida, la montaña como vehículo.
     Ej: "Nada es para llevar, todo es para vivir"
     Ej: "Quizá el éxito sea que tu vida te guste"
  b) Pregunta directa al buyer:
     Ej: "¿Y si dejás de esperar compañía para concretar el viaje de tus sueños?"
- Sin pill_text. Sin texto_apoyo. SOLO la frase.
- Máximo 90 caracteres.

SLIDE 2 — LOS DATOS (única mención de venta)
- Nombre de la salida + fecha + dato clave (cupos o qué incluye, UNO solo).
- Formato compacto, tipo ficha. Máximo 3 líneas cortas.
- Ej: "Experiencia Chaltén / 27 dic al 2 ene / Solo 20 lugares"

SLIDES 3 en adelante — PURAS FOTOS
- Sin texto. Cero. La foto es el contenido.

## La descripción del post (este formato la necesita)
El texto largo NO va en los slides, va en la descripción:
- 2-4 líneas breves sobre la experiencia, con el mismo tono de la frase del slide 1.
- Un bloque compacto de datos reales: fechas y solo los datos comerciales necesarios.
- No copiar completo el campo "qué incluye" ni convertir la descripción en folleto.
- Máximo 650 caracteres incluyendo el CTA.
- Cierre obligatorio con CTA canónico completo:
  "Comentá [PALABRA] y te enviamos toda la info."
- `cta_comentario` contiene la frase completa, no solamente la palabra clave.

## Voz
- Si el slide 1 es reflexivo, la descripción también. Nada de "expedición premium" ni urgencia. La única presión es la belleza de las fotos.
- Prohibido: "cupos limitados", "asegurá tu lugar", "no te lo pierdas".
- Corregir tildes y mayúsculas evidentes en nombres propios sin cambiar el dato.

## Nomenclatura de fotos (Drive del cliente)
- Slide 1: la MEJOR foto de paisaje de la carpeta (la más impactante, idealmente sin gente o con gente de espaldas mirando el paisaje).
- Slide 2: foto de grupo o de la experiencia (gente disfrutando).
- Slides 3+: las mejores restantes, alternando paisaje / gente / detalle.
- Cantidad: mínimo 3 fotos, máximo 6.
- Cada `indicacion_imagen` debe explicar encuadre, sujeto o función narrativa.
  Evitar instrucciones intercambiables como "foto impresionante", "otra foto"
  o "foto de paisaje" sin un criterio visual concreto.
