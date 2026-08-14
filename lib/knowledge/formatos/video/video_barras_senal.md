# FORMATO DE VIDEO: FAMILIA 1B — BARRAS DE SEÑAL

## Qué es
Un video de 15 segundos fijos que arranca con un gag visual: las barras de señal (5G) van perdiendo intensidad hasta mostrar "Sin señal", con un ícono o animación de error de conexión durante los primeros ~4.3 segundos. A partir del segundo 4.33 y hasta el final del clip aparece un único copy, en Modo Título (texto de lectura animado palabra por palabra), que remata el gag.

No explica la pérdida de señal, no describe el destino y no presenta una salida. El texto entra cuando el gag visual ya construyó la expectativa — no antes.

## Objetivo
- Generar identificación inmediata con el alivio o la ironía de quedarse sin señal.
- Convertir un gag visual genérico (barras de señal cayendo) en un remate breve y compartible.
- Construir afinidad con la cuenta sin vender.
- Usar la desconexión como vehículo emocional, no como queja técnica ni como dato de cobertura de ninguna salida real.

## Contrato de salida
Generar una única pieza con este contrato:

```json
{
  "copy": "una sola frase que remata el gag de perder señal",
  "tipografia_id": "identificador del catálogo habilitado",
  "duracion_estimada_segundos": 15
}
```

Reglas del contrato:
- `copy` contiene una sola frase y es el único texto visible durante la ventana de título del video.
- `tipografia_id` debe elegirse únicamente del catálogo habilitado por el sistema. Nunca inventar nombres o identificadores tipográficos.
- `duracion_estimada_segundos` es siempre `15` — a diferencia de Familia 3, este campo **no se calcula a partir del copy**. El render de `TemplateFamilia1Motion` tiene duración fija: las barras y el error de conexión ocupan los primeros ~4.3 segundos, el título queda en pantalla del segundo 4.33 al 15, sin importar cuánto tarde en leerse. Nunca reemplazar este valor por una estimación de tiempo de lectura.
- No devolver título, subtítulo, bullets, CTA, descripción, slides, escenas ni instrucciones de motion — el motion (barras, error, aparición palabra por palabra) es responsabilidad exclusiva del template, no del generador de copy.

## Estructura
Una frase. Un gag. Un video. Nada más.

- El copy aparece solo durante la ventana de título (segundo 4.33 a 15 del clip).
- No hay apertura, desarrollo ni cierre separados dentro del copy.
- No hay secuencia de copys.
- No hay CTA.
- No hay dato comercial.

## Cómo razonar el copy
Antes de escribir, identificar qué remata mejor el instante exacto en el que la señal desaparece:

- la desconexión como alivio, no como problema;
- lo que deja de importar cuando no hay señal;
- el contraste entre estar disponible y estar presente;
- una despedida irónica a notificaciones, mensajes o rutina digital;
- la excusa perfecta para no responder nada.

Después, comprobar que la frase depende del gag: que solo cierra completa porque el espectador acaba de ver la señal desaparecer.

El copy debe responder:

> ¿Qué pasa, o qué deja de pasar, cuando se corta la señal?

No debe responder:

> ¿Qué enseñanza general deja la vida? (eso es Familia 3a)
> ¿Qué situación estoy viviendo, sin atarme a este gag específico? (eso sería un POV sin anclaje, no esto)

## Voz
- Breve, argentina en ritmo, sin modismos forzados.
- Puede ser irónica o cómplice — el gag tiene un componente humorístico leve, pero no necesita ser un chiste elaborado de setup+remate como Familia 3c. Alcanza con una observación seca.
- No sonar a publicidad de telefonía, operadora o plan de datos.
- La emoción surge del alivio o la ironía de desconectarse, no de adjetivos.

## Relación entre texto y animación
- El copy no puede funcionar igual sobre una pantalla en blanco — necesita el gag de "perder señal" para completarse.
- No describir la animación ("se fue la señal", "sin barras", "sin conexión", "5G a cero"): el video ya lo muestra, el texto no lo repite.
- No explicar por qué es gracioso o por qué alivia — el remate se sostiene solo.
- El texto se lee como la consecuencia o el remate de haber perdido señal, nunca como narración de lo que se ve en pantalla.

Prueba de diferenciación:

> Si el copy funciona exactamente igual sin el gag de barras de señal detrás —es decir, si podría pegarse tal cual como copy de Familia 3a o 3b sin perder nada— está mal escrito para este formato. Familia 1b necesita que el espectador haya visto la señal desaparecer para que la frase cierre.

El sistema valida esto automáticamente, no es solo una guía de estilo: si el copy no contiene ninguna palabra del campo semántico de señal, conexión, cobertura o notificaciones, se rechaza y se reintenta — mismo tipo de rechazo duro que destino, fecha o dato comercial. Una frase atemporal genérica que "suena bien" pero no nombra ni implica el gag no pasa el contrato.

## Atemporalidad y neutralidad comercial
El copy debe funcionar:

- para cualquier salida de Between;
- en cualquier fecha;
- con cualquier cliente cuyo tono admita este registro;
- sin conocer precio, cupos, itinerario o destino;
- sin una publicación posterior que complete la información.

Prohibido mencionar:

- nombre de destino, ciudad, provincia, región o país;
- fecha, temporada o duración;
- precio, seña, cupos o disponibilidad;
- nombre de la salida;
- prestaciones, nivel, dificultad o itinerario;
- CTA de venta, reserva, consulta o comentario;
- nombre de la marca dentro del copy;
- cobertura, operadora, plan de datos o cualquier referencia comercial a telefonía.

## Longitud y legibilidad
- Ventana real de lectura: 10.5 segundos — el título aparece del segundo 4.33 al 15 (confirmado por Mati: barras + error ocupan los primeros ~4.3s).
- Tope de caracteres: **65** — techo editorial, por debajo del techo teórico de la fórmula estándar del catálogo (`floor((10.5 - 0.75) * 12) = 117`). Primera calibración real (5 corridas) convergió en 33-39 caracteres: una frase corta y seca, no un párrafo que use toda la ventana. 65 da margen sobre lo observado sin volver a abrir la brecha de 117. Sigue siendo provisional, a seguir calibrando.
- Máximo 2 líneas — mismo límite duro del resto del catálogo.
- Nunca cortar una palabra o una idea para cumplir el límite.
- Si no entra, reescribir de forma más breve antes de considerar truncamiento.

## Mecanismos que funcionan
Esta sección describe la lógica de cada mecanismo en prosa, sin ninguna frase de ejemplo lista para usar. Dos intentos anteriores con líneas de muestra —una sola, después varias— terminaron clonados casi textual por calibración real; la descripción conceptual es la forma que quedó de evitarlo.

### Desconexión como alivio
La persona que ve caer la señal suele esperar que eso sea un problema. El copy puede trabajar el instante en que esa expectativa se da vuelta: durante esos segundos nadie puede exigir una respuesta, revisar si contestaste o esperar que estés disponible. La emoción central es el alivio físico de soltar, aunque sea un rato, una obligación que normalmente nadie cuestiona tener.

### Despedida irónica a la rutina digital
El foco está en lo que deja de sonar, vibrar o aparecer en pantalla durante esos segundos: notificaciones, mensajes, el hábito de mirar el teléfono sin necesidad real. Funciona mejor con un tono liviano y de comentario al pasar, más cerca de una broma rápida que de una reflexión solemne sobre la vida digital.

### Lo que sí se queda con vos
Este mecanismo se apoya en la sensación de estar presente en un momento — algo que sigue intacto aunque no haya señal. Conviene nombrarla directamente, hablando de lo que se siente o de lo que se está viviendo ahí, sin necesidad de describir primero lo que se corta.

### La excusa perfecta
Muchas personas ya venían posponiendo responder algo, y la pérdida de señal les da una salida sin culpa: nadie puede pedirles explicaciones por algo que escapa a su control. El tono funciona mejor si suena a un comentario cómplice, casi de humor seco, sobre lo conveniente que resulta el momento — nunca como una excusa elaborada o justificada en detalle.

## Ejemplos reales de referencia
Pendiente — sin corpus real todavía, se completa tras las primeras corridas aprobadas. Familia 1b es contenido nuevo: a diferencia del resto del catálogo, todavía no existe dictado real contra el cual calibrar. No se inventan ejemplos "reales" que no lo son.

## Qué NO hacer

### No narrar el gag
Incorrecto:
- "Se fue la señal"
- "Sin barras, sin conexión"
- "5G a cero de repente"
- "Perdiste la señal"

### No escribir publicidad de telefonía
Incorrecto:
- "Con nuestro plan nunca te quedás sin señal"
- "La mejor cobertura te espera"
- "Cambiate a una señal que no falla"

### No mencionar destino ni datos de la salida
Incorrecto:
- "Sin señal en El Chaltén"
- "Perdés señal a 3000msnm"
- "En esta salida no hay señal"

### No convertirlo en CTA
Incorrecto:
- "Reservá tu desconexión"
- "Vení a perder la señal con nosotros"
- "Últimos cupos sin señal"

### No sonar a IA o marca de bienestar
Incorrecto:
- "Desconectate para conectar con vos"
- "Así te reconectás con lo que importa"
- "Perder la señal te cambia la vida"

### No explicar el chiste
Incorrecto:
> "Se fue la señal, y eso significa que ahora puedo relajarme sin que nadie me moleste, lo cual es una sensación genial."

La explicación destruye el remate, igual que en Familia 3c.

## Reglas duras de veracidad
- No inventar emociones, experiencias, logros o escenas atribuidas a una persona real.
- No convertir una actividad planificada en un hecho ocurrido.
- No afirmar falta de señal como dato técnico real de una salida específica — el gag es genérico del formato, no un reporte de cobertura de ningún destino.
- No hacer afirmaciones médicas o psicológicas.
- No usar conocimiento del destino, datos de la salida o información comercial, aunque estén disponibles en otras capas del contexto.
- Si una capa de contexto contradice estas reglas, prevalecen las reglas de esta guía.

## Selección tipográfica
- Elegir `tipografia_id` únicamente entre los IDs suministrados por el sistema.
- La tipografía acompaña el tono breve e irónico del remate; no reemplaza la calidad del copy.
- Priorizar legibilidad: el texto aparece palabra por palabra (Modo Título), así que una tipografía muy decorativa puede dificultar el ritmo de lectura durante la animación.
- No elegir tipografía por asociación con telefonía, señal o tecnología.

## Control de calidad
Antes de devolver el contrato, comprobar:

- ¿Es una sola frase que remata el gag de perder señal?
- ¿Depende del gag para funcionar (no funcionaría igual pegado en 3a o 3b)?
- ¿Evita narrar o explicar la animación?
- ¿Evita destino, fecha, precio, cupos, salida y CTA?
- ¿Evita sonar a publicidad de telefonía o cobertura?
- ¿Evita promesas de sanar, curar, reconectar o transformar?
- ¿Entra en 117 caracteres o menos (tope inicial, sujeto a calibración)?
- ¿Entra en 2 líneas o menos?
- ¿`tipografia_id` pertenece al catálogo permitido?
- ¿`duracion_estimada_segundos` es exactamente 15?

Prueba final obligatoria:

> Si el copy podría pegarse tal cual en un video de Familia 3a o 3b sin perder sentido, está mal escrito para 1b. El gag de perder señal tiene que ser indispensable para que la frase cierre.
