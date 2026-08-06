# FORMATO DE VIDEO: FAMILIA 3E — LUGAR

## Qué es
Un video breve cuyo único copy es el nombre real del lugar que aparece en pantalla. Puede mostrar solamente el destino, combinar lugar y región o representar una ruta mediante varios nombres unidos por flechas.

Es el formato con menos texto de toda la Familia 3. No reflexiona, no conversa, no hace humor y no describe la experiencia. Identifica el lugar y deja que el video haga todo lo demás.

## Objetivo
- Ubicar al espectador de inmediato.
- Convertir el nombre del lugar en el centro de la pieza.
- Dar contexto geográfico sin agregar desarrollo editorial.
- Permitir que la imagen sostenga el interés.
- Presentar una ruta real de manera mínima cuando el recorrido sea relevante.

## Contrato de salida
Generar una única pieza con este contrato:

```json
{
  "copy": "Nombre exacto del lugar",
  "tipografia_id": "identificador del catálogo habilitado",
  "duracion_estimada_segundos": 2.5
}
```

Reglas del contrato:
- `copy` contiene todo el texto visible del video.
- `copy` usa únicamente nombres geográficos verificados.
- `tipografia_id` debe elegirse únicamente del catálogo habilitado por el sistema. Nunca inventar nombres o identificadores tipográficos.
- `duracion_estimada_segundos` representa el tiempo mínimo estimado para leer el copy completo con comodidad.
- No devolver título, subtítulo, bullets, CTA, descripción, slides, escenas ni instrucciones de motion.

El motion mínimo puede aplicarse después en el renderer según la familia o el preset visual. No forma parte de este contrato de copy.

## Estructura
Un nombre. Un video. Nada más.

Hay tres variantes válidas:

### Variante A — LUGAR
Solamente el nombre verificado.

```text
La Ciénega
```

- Ideal para nombres de una a cuatro palabras.
- Puede incluir `📍` si el sistema visual lo habilita.
- No agregar una descripción debajo.

### Variante B — LUGAR + UBICACIÓN
Nombre principal y contexto geográfico verificado.

En una línea:

```text
Villa Nougués, Tucumán
```

Con jerarquía visual:

```text
Cerro de la Cruz
Tafí del Valle
```

- Ambas partes deben provenir de datos verificados.
- La separación puede usar coma, raya o salto de línea.
- La segunda parte ubica; no describe ni promociona.

### Variante C — RUTA
Varios lugares verificados unidos en el orden real del recorrido.

```text
Buenos Aires → El Calafate → El Chaltén
```

- Usar la flecha `→` como separador.
- Conservar el orden documentado.
- Incluir sólo hitos que formen parte real de la ruta.
- No agregar conexiones, escalas o puntos intermedios inferidos.
- Si el recorrido no está estructurado o confirmado, no usar esta variante.

## Fuente única de verdad
La factualidad tiene prioridad absoluta.

El nombre puede salir únicamente de fuentes estructuradas y verificadas, por ejemplo:

- `salida.destino`;
- `salida.nombre`, sólo cuando funciona realmente como nombre geográfico y no como nombre comercial;
- `salida.puntos_interes[].nombre`;
- lugares identificados explícitamente en el itinerario estructurado;
- origen, escala o destino cargados como parte confirmada de una ruta.

No usar como fuente:

- conocimiento general del modelo;
- una suposición basada en la imagen;
- cercanía geográfica;
- nombres encontrados en ejemplos;
- metadatos ambiguos de carpetas o archivos;
- una búsqueda externa no incorporada al sistema de fuentes;
- nombres comerciales que parezcan lugares pero no estén confirmados.

Si no existe un nombre verificable, este formato no es elegible.

## Exactitud de nombres
- Copiar el nombre real sin inventar, traducir ni embellecer.
- Conservar tildes, eñes, mayúsculas y grafía oficial presentes en la fuente.
- Se pueden corregir errores tipográficos evidentes sólo cuando exista otra fuente verificada que confirme la forma correcta.
- No abreviar provincias, regiones o países por cuenta propia.
- No expandir abreviaturas sin confirmación.
- No completar ciudad, provincia o país mediante conocimiento general.
- No reemplazar un nombre local por otro más conocido.
- No llamar al punto de interés por el nombre de una localidad cercana.
- No confundir destino de la salida, punto de encuentro, inicio del sendero y lugar filmado.
- No agregar `Argentina` salvo que el país esté confirmado y sea necesario para la pieza.

## Relación entre texto e imagen
- El lugar nombrado debe corresponder al material mostrado.
- No usar una imagen genérica de montaña para nombrar un punto específico.
- No afirmar que un video fue filmado en un lugar sólo porque estaba dentro de su carpeta.
- Si el material mezcla ubicaciones y no se puede identificar el clip, usar únicamente un destino general confirmado o declarar la pieza no elegible.
- En la variante ruta, la imagen puede mostrar el recorrido completo o una secuencia de sus tramos; el copy no debe afirmar que un único plano corresponde a todos.
- No describir clima, altura, dificultad, distancia, duración ni actividad.

## Diferencia obligatoria con Carrusel Lugar
`video_lugar` y `carrusel_lugar` comparten una fuente geográfica, pero no comparten mecanismo ni contrato.

### Video Lugar — Familia 3e
- Un único copy.
- Identifica un lugar o una ruta.
- Sin desarrollo.
- Sin datos técnicos.
- Sin explicación.
- Sin estructura narrativa.
- El video sostiene la pieza.

### Carrusel Lugar
- Desarrolla varios puntos de interés.
- Usa múltiples slides.
- Explica características verificadas de cada punto.
- Puede incluir distancia, duración, dificultad y actividad.
- Construye una secuencia editorial y una descripción del post.
- Requiere selección, jerarquía y validación de varios datos.

Prueba de diferenciación:

> Si el texto explica qué hacer, cuánto dura, qué dificultad tiene o por qué visitar el lugar, pertenece al mecanismo de Carrusel Lugar. Familia 3e solamente lo nombra.

No reducir el carrusel a video ni expandir este video como si fuera un carrusel resumido. Son piezas diferentes.

## Voz
- Nominal, limpia y factual.
- Sin tono publicitario.
- Sin reflexión, humor ni conversación.
- Sin adjetivos emocionales.
- Sin invitaciones.
- Sin fórmulas como `conocé`, `descubrí`, `viví` o `animate`.
- La personalidad surge de la tipografía, la imagen y el timing, no de adornar el nombre.

## Neutralidad comercial
El copy identifica; no vende.

Prohibido incluir:

- fecha o duración de la salida;
- precio, seña, cupos o disponibilidad;
- nombre comercial de la salida si no es un topónimo confirmado;
- prestaciones, nivel o dificultad;
- CTA de venta, reserva, consulta o comentario;
- urgencia o escasez;
- superlativos turísticos;
- nombre de la marca;
- hashtags o slogans.

## Longitud y legibilidad
- Es el formato con menos texto del catálogo.
- Variante Lugar: idealmente entre una y cuatro palabras.
- Variante Lugar + ubicación: idealmente hasta dos unidades geográficas breves.
- Variante Ruta: idealmente entre dos y cuatro lugares.
- No agregar palabras para alcanzar una longitud mínima.
- El copy debe entrar completo en el presupuesto de lectura calculado para el clip.
- En rutas, contar nombres, espacios y flechas dentro del límite.
- Nunca truncar un nombre geográfico.
- Si una ruta no entra, reducir la cantidad de hitos sin alterar el orden y sin eliminar el origen o destino esenciales.
- Si un nombre individual no entra en el diseño, adaptar tipografía o layout; nunca abreviarlo automáticamente.

## Motion mínimo
La pieza puede usar una presentación visual mínima:

- aparición lenta o `fade-in`;
- efecto de máquina de escribir;
- aparición al inicio y permanencia durante el clip;
- revelación secuencial de los hitos de una ruta.

Reglas:
- El motion no modifica el copy.
- No agregar palabras, íconos o frases durante la animación.
- No usar transiciones complejas para compensar una pieza débil.
- El nombre debe permanecer visible el tiempo suficiente para leerse.
- En máquina de escribir, `duracion_estimada_segundos` debe contemplar tanto la aparición como la lectura posterior.
- La elección de motion pertenece al renderer o preset visual, no al generador de copy.

## Emoji de ubicación
El pin `📍` es opcional.

Puede usarse cuando:
- el catálogo visual lo permite;
- acompaña un único lugar;
- no compite con la tipografía;
- mantiene la pieza limpia.

No usarlo:
- como sustituto de una ubicación faltante;
- en cada hito de una ruta;
- junto con otros emojis;
- si el renderer o la tipografía no garantizan el glifo;
- para dar apariencia factual a un nombre no verificado.

## Ejemplos reales de referencia
Estos textos calibran jerarquía, longitud y variantes. Los nombres son ejemplos observados, no un catálogo disponible para cualquier salida.

- "La Ciénega 📍"
- "Villa Nougués, Tucumán"
- "Cerro de la Cruz — Tafí del Valle"
- "Buenos Aires → El Calafate → El Chaltén"
- "Campo de las Azucenas"
- "Laguna Blanca — Cabra Corral, Salta"

Contextos visuales observados:

- `Campo de las Azucenas`: aparición lenta o `fade-in`.
- `Laguna Blanca — Cabra Corral, Salta`: animación al inicio del video.

Estos contextos calibran la presentación mínima. No obligan a devolver motion dentro del contrato ni habilitan esos lugares para otras salidas.

## Uso correcto de los ejemplos
Extraer el mecanismo, no los nombres.

Correcto:
- usar un nombre real de la salida como único copy;
- agregar una región confirmada cuando ayuda a ubicar;
- construir una ruta sólo con hitos documentados;
- conservar la grafía y el orden de las fuentes;
- dejar que el renderer presente el nombre con movimiento mínimo.

Incorrecto:
- usar cualquiera de los lugares de ejemplo sin relación con la salida;
- cambiar `Tucumán` por otra provincia manteniendo el resto;
- copiar la ruta y sustituir solamente el destino final;
- completar automáticamente ciudad, provincia o país;
- tratar los ejemplos como lista de destinos posibles;
- imitar la grafía de un ejemplo cuando contradice la fuente real.

## Qué NO hacer

### No agregar descripción
Incorrecto:
- "La Ciénega, un rincón para desconectar"
- "Campo de las Azucenas en todo su esplendor"
- "Villa Nougués, naturaleza cerca de la ciudad"
- "El Chaltén, capital del trekking"

### No usar superlativos turísticos
Incorrecto:
- "El lugar más increíble de Tucumán"
- "Un destino único"
- "La laguna más hermosa"
- "La ruta épica de la Patagonia"

### No convertirlo en CTA
Incorrecto:
- "Conocé La Ciénega"
- "Descubrí Villa Nougués"
- "Visitá este lugar"
- "¿Te gustaría estar acá?"

### No agregar datos técnicos
Incorrecto:
- "Cerro de la Cruz — 4 km"
- "Laguna Blanca — dificultad media"
- "Campo de las Azucenas — 2 horas"
- "El Chaltén — 3 días de trekking"

### No inventar jerarquía geográfica
Incorrecto:
- agregar una provincia que no figura en la fuente;
- nombrar un país deducido por conocimiento general;
- reemplazar una localidad por una región turística;
- afirmar que un punto pertenece a un destino porque aparece cerca en un mapa.

### No fabricar una ruta
Incorrecto:
- ordenar lugares según conveniencia visual;
- agregar una escala probable;
- unir puntos de salidas diferentes;
- presentar puntos de interés como trayecto confirmado;
- omitir un cambio de orden documentado para que el copy se vea mejor.

## Reglas duras de veracidad
- Cada nombre del copy debe tener una fuente verificable.
- La grafía debe coincidir con la fuente confirmada.
- La relación entre lugar y región debe estar documentada, no inferida.
- El orden de una ruta debe estar documentado.
- El material visual debe corresponder al lugar nombrado o a un contexto geográfico general expresamente confirmado.
- No confundir punto de interés, destino, punto de encuentro, origen y lugar de filmación.
- No inventar ubicación, recorrido, actividad, distancia, duración, dificultad, clima o logro.
- No convertir una actividad planificada en un hecho ocurrido.
- No agregar información comercial aunque esté disponible en otras capas del contexto.
- Si una capa de contexto contradice estas reglas, prevalecen las fuentes verificadas y esta guía.
- Si hay duda sobre un nombre o relación geográfica, no generar la pieza.

## Selección tipográfica
- Elegir `tipografia_id` únicamente entre los IDs suministrados por el sistema.
- Priorizar legibilidad del nombre y fidelidad de caracteres.
- La tipografía debe soportar tildes, eñes, flechas y, si corresponde, el pin de ubicación.
- Una ruta necesita una tipografía contenida que preserve la lectura de todos los hitos.
- Un nombre breve puede admitir una tipografía más expresiva.
- No elegir tipografía por estereotipos del destino o región.
- Nunca modificar el topónimo para adaptarlo a la fuente.

## Control de calidad
Antes de devolver el contrato, comprobar:

- ¿El copy contiene únicamente un lugar, lugar + ubicación o ruta?
- ¿Cada nombre tiene una fuente verificable?
- ¿La grafía coincide exactamente con la fuente?
- Si aparece una región, ¿la relación está documentada?
- Si es una ruta, ¿el orden está confirmado?
- ¿El material corresponde al lugar nombrado?
- ¿Se evitó todo desarrollo, adjetivo, dato técnico y CTA?
- ¿Se evitó inferir ciudad, provincia, país o punto específico?
- ¿Es más breve que las demás familias?
- ¿Entra completo en el tiempo disponible?
- ¿Se conservaron íntegros todos los nombres?
- ¿`tipografia_id` pertenece al catálogo permitido y soporta los glifos?
- ¿`duracion_estimada_segundos` contempla la lectura y la aparición mínima?

Prueba final obligatoria:

> Si una sola palabra del copy no proviene del nombre o de la ubicación verificada —salvo el separador o el pin habilitado— sobra. Familia 3e nombra el lugar; no lo explica.
