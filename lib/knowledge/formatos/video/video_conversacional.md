# FORMATO DE VIDEO: FAMILIA 3D — CONVERSACIONAL / PREGUNTA-RESPUESTA

## Qué es
Un video breve con un único copy dividido en dos bloques: una pregunta cotidiana arriba y una respuesta abajo. La misma voz formula la pregunta y se la responde; la imagen outdoor produce el contraste.

La pregunta nace en el mundo cotidiano, urbano o digital. La respuesta revela dónde está, qué está haciendo o qué situación representa su felicidad.

No es un diálogo entre personajes. Es una auto-pregunta con remate visual.

## Objetivo
- Generar identificación mediante una pregunta reconocible.
- Contrastar la vida cotidiana con la montaña, el viaje o la salida.
- Usar el destino o la escena real como respuesta concreta.
- Crear un copy breve que se entienda en dos tiempos dentro del mismo video.
- Favorecer compartidos sin convertir la pieza en una promoción.

## Contrato de salida
Generar una única pieza con este contrato:

```json
{
  "copy": "¿Pregunta cotidiana?\nRespuesta: lugar o situación real",
  "tipografia_id": "identificador del catálogo habilitado",
  "duracion_estimada_segundos": 4.5
}
```

Reglas del contrato:
- `copy` contiene todo el texto visible del video.
- El patrón principal contiene dos bloques separados por un único salto de línea.
- El primer bloque es la pregunta.
- El segundo bloque es la respuesta o la etiqueta que la imagen completa.
- `tipografia_id` debe elegirse únicamente del catálogo habilitado por el sistema. Nunca inventar nombres o identificadores tipográficos.
- `duracion_estimada_segundos` representa el tiempo mínimo estimado para leer ambos bloques con comodidad.
- No devolver título, subtítulo, bullets, CTA, descripción, slides, escenas ni instrucciones de motion.

## Estructura principal
Dos bloques. Una sola voz. Un video.

```text
¿PREGUNTA COTIDIANA?
RESPUESTA: CONTRASTE OUTDOOR
```

### Bloque 1 — Pregunta
- Una situación cotidiana, urbana o digital reconocible.
- Una sola línea.
- Debe instalar una expectativa que la respuesta pueda cambiar.
- Usar signos de apertura y cierre: `¿...?`
- No preguntar directamente por precio, fecha, cupos o características de la salida.

### Bloque 2 — Respuesta
- Una sola línea.
- Puede nombrar el lugar real, una situación visible o una etiqueta que la imagen termina.
- Debe incluir dos puntos cuando presenta el remate: `Donde ando:`, `Yo:`, `Mi respuesta:`, `Mi momento más feliz:`.
- No explicar el contraste después del remate.
- Si nombra un destino, debe usar exactamente el destino verificado de la salida.

Aunque tenga dos bloques, el resultado sigue siendo un único `copy`. No generar dos campos, dos escenas ni dos piezas independientes.

## Una sola voz: diferencia obligatoria con Carrusel Conversación
`video_conversacional` y `carrusel_conversacion` no son el mismo formato adaptado a soportes diferentes. Tienen mecanismos distintos.

### Video conversacional — Familia 3d
- Una sola voz.
- La misma persona formula y responde la pregunta.
- Un único copy.
- Dos bloques simultáneos o sucesivos dentro del mismo video.
- La imagen produce el contraste o completa la respuesta.
- No hay turnos entre personajes.
- No hay progresión narrativa por slides.

### Carrusel Conversación
- Dos o más voces o posiciones reconocibles.
- Cada intervención responde, contradice o reinterpreta a la anterior.
- Tiene turnos de diálogo.
- El intercambio progresa a través de múltiples slides.
- Puede incorporar hablantes y un giro visual posterior.
- La conversación es la estructura narrativa.

Prueba de diferenciación:

> Si las dos líneas podrían asignarse a dos personajes que conversan, revisar la pieza: probablemente se está escribiendo un Carrusel Conversación. En Familia 3d ambas líneas pertenecen a la misma perspectiva.

No convertir el video en:

```text
Persona A: ¿Dónde estás?
Persona B: En la montaña.
```

Eso es diálogo. La Familia 3d funciona así:

```text
¿Dónde estás que no te llegan los mensajes?
Donde ando: [respuesta propia]
```

## Cómo razonar la pieza
Antes de escribir, identificar:

1. Qué pregunta cotidiana puede recibir esa imagen como respuesta.
2. Qué contraste existe entre la expectativa urbana y la escena outdoor.
3. Si la respuesta necesita nombrar el destino o si la imagen ya la completa.
4. Qué dato de ubicación está realmente verificado.
5. Si ambas líneas suenan como partes de una misma perspectiva.

La pregunta debe ser reconocible antes de ver la respuesta. El remate debe ganar fuerza al mirar el video.

El razonamiento no parte de:

> Tengo que mencionar este destino.

Parte de:

> ¿Qué pregunta cotidiana respondería naturalmente esta escena?

## Tipos de pregunta

### Ausencia digital
La pregunta supone que la persona no contesta, no tiene señal o está fuera de su rutina.

Mecanismo:
> ¿Dónde estás que no respondés? → ubicación o escena real.

No afirmar falta de señal si no está documentada. La ausencia puede ser una decisión o una dramatización evidente, pero no un dato técnico inventado.

### Preferencia o felicidad
La pregunta instala que la persona es difícil de complacer; la respuesta muestra una alegría simple y visible.

Mecanismo:
> ¿Qué necesitás para estar feliz? → la imagen responde.

No atribuir felicidad, emoción o preferencia a una persona identificable que no la expresó. La voz debe sentirse como la del creador o como autoidentificación general.

### Contraste con la rutina
La pregunta nace de trabajo, ciudad, mensajes, horarios o compromisos. La respuesta es una escena outdoor.

Mecanismo:
> ¿Por qué no estás disponible? → porque elegiste estar acá.

### Descubrimiento editorial
Variante secundaria: una única pregunta informativa invita a reconocer un paisaje real.

Mecanismo:
> ¿Sabías que este paisaje existe en [ubicación verificada]?

Esta variante puede prescindir del segundo bloque cuando la propia imagen funciona como respuesta. Sigue perteneciendo a Familia 3d sólo si conserva el mecanismo pregunta → revelación visual.

No usar esta excepción como forma predeterminada. El patrón principal sigue siendo pregunta arriba y respuesta abajo.

## Lugar y destino
A diferencia de las Familias 3a, 3b y 3c, Familia 3d puede mencionar un lugar o destino porque la ubicación puede ser literalmente la respuesta.

Reglas:
- Usar sólo el destino, localidad, provincia o país que esté verificado en los datos de la salida.
- Preferir el nivel de precisión disponible en la fuente. No completar una localidad con una provincia inferida.
- No reemplazar el destino verificado por un lugar cercano más conocido.
- No inventar que una escena pertenece a un punto específico del itinerario.
- No usar `acá`, `este lugar` o `[lugar]` como placeholder en la salida final.
- Si el dato real es ambiguo, dejar que la imagen complete la respuesta sin nombrar una ubicación.
- Mencionar el lugar no habilita agregar fecha, precio, cupos ni información comercial.

## Voz
- Conversacional, breve y natural.
- La pregunta debe sonar como algo que alguien realmente diría.
- Se admite voseo según la voz del cliente.
- Argentina en ritmo y sintaxis, sin caricatura ni acumulación de modismos.
- La respuesta puede ser seca, cómplice, afectiva o levemente irónica.
- No sonar a acertijo publicitario.
- No usar una pregunta sólo como excusa para insertar el nombre del destino.
- No escribir en español neutro forzado si contradice la voz de marca.

## Relación entre texto e imagen
- La imagen es la respuesta visual o la evidencia de la respuesta escrita.
- La pregunta debe crear una expectativa que el video resuelva.
- Si la respuesta dice `Yo en mi momento más feliz:`, la escena debe sostener esa lectura sin atribuírsela falsamente a una persona real.
- Si la respuesta nombra nieve, amanecer, cumbre, bosque u otro elemento, debe aparecer o estar verificado.
- Si menciona un destino, el material debe corresponder a ese destino o la fuente debe confirmarlo.
- No usar una imagen genérica para afirmar una ubicación específica.
- No describir todo lo que aparece en pantalla.

## Neutralidad comercial
Aunque pueda mencionar el destino, la pieza no vende.

Prohibido incluir:

- fecha o duración de la salida;
- precio, seña, cupos o disponibilidad;
- nombre comercial de la salida;
- prestaciones, nivel, dificultad o itinerario;
- CTA de venta, reserva, consulta o comentario;
- urgencia o escasez;
- superlativos turísticos;
- nombre de la marca dentro del copy.

El destino funciona como remate o contexto, no como producto ofrecido.

## Longitud y legibilidad
- Pregunta: idealmente entre 5 y 12 palabras.
- Respuesta: idealmente entre 2 y 8 palabras.
- Una línea visual por bloque.
- Un único salto de línea entre pregunta y respuesta.
- Evitar respuestas explicativas.
- El copy completo debe entrar en el presupuesto de lectura calculado para el clip.
- Contar pregunta, respuesta, signos y salto de línea dentro del límite total.
- Nunca cortar una palabra, pregunta o remate para cumplir el límite.
- Si no entra, reescribir de forma más breve antes de considerar truncamiento.

## Ejemplos reales de referencia
Estos textos calibran tono, ritmo, longitud y mecanismo. Son material de observación: no copiarlos, parafrasearlos ni convertirlos en plantillas cambiando una palabra.

```text
¿Dónde estás que no te llegan los mensajes?
Donde ando: [lugar]
```

```text
¿Eres muy difícil de complacer?
Yo en mi momento más feliz: [video]
```

```text
¿Sabías que puedes encontrar este paisaje en Argentina?
```

Los marcadores `[lugar]` y `[video]` describen la función del material observado. Nunca deben aparecer en una salida generada.

Los ejemplos pueden usar conjugaciones distintas de la voz argentina prevista. Sirven para calibrar el mecanismo; el copy generado debe obedecer la voz del cliente y el contexto de nicho.

## Uso correcto de los ejemplos
Extraer el mecanismo, no las palabras.

Correcto:
- encontrar una pregunta cotidiana nueva que la escena responda;
- usar una ubicación real como remate cuando sea necesaria;
- dejar que la imagen complete una etiqueta breve;
- mantener ambas líneas dentro de una sola perspectiva;
- crear contraste entre disponibilidad urbana y experiencia outdoor.

Incorrecto:
- cambiar `mensajes` por `llamadas` conservando el resto;
- reemplazar `Argentina` por otro país en la misma pregunta;
- usar siempre `Yo en mi momento más feliz:`;
- copiar la estructura exacta y cambiar solamente el destino;
- insertar `[lugar]`, `[destino]` o `[video]`;
- convertir las líneas en intervenciones de dos personajes;
- combinar dos ejemplos en una sola pieza.

## Qué NO hacer

### No escribir un diálogo entre personajes
Incorrecto:

```text
—¿Dónde estás?
—En la montaña.
```

Incorrecto:

```text
Mi amiga: ¿Otra vez te vas?
Yo: Sí.
```

Estas estructuras pertenecen al mecanismo de Carrusel Conversación.

### No usar una pregunta comercial
Incorrecto:
- "¿Querés conocer este destino?"
- "¿Ya reservaste tu lugar?"
- "¿Sabías que quedan tres cupos?"
- "¿Cuánto pagarías por vivir esto?"

### No inventar el lugar
Incorrecto:
- Nombrar Patagonia cuando la salida sólo informa otro destino.
- Afirmar una cumbre porque se ve una montaña.
- Inferir una provincia desde el nombre de un sendero.
- Usar un país más reconocible que la ubicación real.

### No escribir una respuesta larga
Incorrecto:

```text
¿Dónde estás?
Estoy haciendo una travesía de varios días para desconectarme de la rutina.
```

La respuesta explica en vez de rematar.

### No escribir una reflexión de Familia 3a
Incorrecto:
- "¿Y si el éxito fuera que tu vida te guste?"
- "¿Cuánto tiempo te queda para vivir?"
- "¿Los verdaderos lujos serán estos momentos?"

Estas preguntas hablan de ideas abstractas y no construyen pregunta-respuesta visual.

### No escribir un POV de Familia 3b
Incorrecto:
- "POV: cuando nadie logra encontrarte..."
- "POV: tu momento más feliz..."

El prefijo POV instala otra perspectiva y pertenece a su propia familia.

### No usar superlativos turísticos
Incorrecto:
- "¿Sabías que el paisaje más increíble está en...?"
- "¿Dónde queda este lugar único?"
- "¿Querés conocer el destino más épico?"

## Reglas duras de veracidad
- Todo destino, localidad, provincia o país mencionado debe coincidir con una fuente verificada de la salida.
- No inventar emociones, experiencias, diálogos, logros o escenas atribuidas a una persona real.
- No afirmar falta de señal, desconexión, cumbre, amanecer, nieve, clima o dificultad si el material o los datos no lo demuestran.
- No convertir una actividad planificada en un hecho ocurrido.
- No usar una imagen genérica como evidencia de una ubicación específica.
- No hacer afirmaciones médicas o psicológicas.
- No agregar información comercial aunque esté disponible en otras capas del contexto.
- Si una capa de contexto contradice estas reglas, prevalecen las reglas de esta guía.

## Selección tipográfica
- Elegir `tipografia_id` únicamente entre los IDs suministrados por el sistema.
- Priorizar la lectura inmediata de ambos bloques.
- Pregunta y respuesta pueden diferenciarse por tamaño, peso o posición únicamente si el catálogo y el renderer lo contemplan; el contrato sigue usando un solo `tipografia_id`.
- La respuesta debe conservar suficiente contraste sobre la imagen que funciona como remate.
- No elegir tipografía por una asociación inventada con el destino.

## Control de calidad
Antes de devolver el contrato, comprobar:

- ¿Hay una sola voz?
- ¿La pregunta es cotidiana y reconocible?
- ¿La respuesta produce un contraste outdoor?
- ¿Los dos bloques pertenecen a la misma perspectiva?
- ¿La imagen completa o demuestra la respuesta?
- Si aparece un lugar, ¿coincide exactamente con una fuente verificada?
- ¿Se eliminaron todos los placeholders?
- ¿Pregunta y respuesta caben en una línea visual cada una?
- ¿Evita fecha, precio, cupos, itinerario y CTA?
- ¿Evita superlativos turísticos?
- ¿Evita inventar señal, emoción, actividad o contexto físico?
- ¿Es original respecto de los ejemplos?
- ¿Entra completo en el tiempo disponible?
- ¿`tipografia_id` pertenece al catálogo permitido?
- ¿`duracion_estimada_segundos` alcanza para leer ambos bloques sin apuro?

Prueba final obligatoria:

> Si el copy necesita dos personajes para funcionar, no es Familia 3d. Si la misma voz puede hacer la pregunta y responderla mediante el texto o la imagen, el mecanismo es correcto.
