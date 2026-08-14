# FORMATO DE VIDEO: FAMILIA 3C — MEME / AUTOIDENTIFICACIÓN

## Qué es
Un video breve sostenido por una observación humorística en la que el espectador se reconoce. El chiste nace de una contradicción propia, una conducta exagerada pero familiar o la distancia entre lo que una persona dice y lo que termina haciendo.

No se ríe de otra persona. La voz se incluye dentro del comportamiento: "yo también soy así".

Puede funcionar como una sola frase o como una estructura de dos partes — setup y remate — dentro de un único bloque de copy.

## Objetivo
- Generar identificación inmediata.
- Provocar el impulso de compartir o etiquetar a alguien.
- Convertir una contradicción real del público outdoor en humor.
- Hacer que la cuenta suene humana, cercana y consciente de sus propias manías.
- Construir afinidad sin vender.

## Contrato de salida
Generar una única pieza con este contrato:

```json
{
  "copy": "setup + remate dentro de un único bloque",
  "tipografia_id": "identificador del catálogo habilitado",
  "duracion_estimada_segundos": 4.5
}
```

Reglas del contrato:
- `copy` contiene todo el texto visible del video.
- Puede incluir un salto de línea cuando exista una estructura clara de setup y remate.
- `tipografia_id` debe elegirse únicamente del catálogo habilitado por el sistema. Nunca inventar nombres o identificadores tipográficos.
- `duracion_estimada_segundos` representa el tiempo mínimo estimado para leer el copy completo con comodidad.
- No devolver título, subtítulo, bullets, CTA, descripción, slides, escenas ni instrucciones de motion.

## Estructura
Un chiste. Un video. Nada más.

Hay dos estructuras válidas:

### Variante A — CONTRADICCIÓN EN UNA FRASE
La misma oración presenta dos conductas incompatibles o irónicamente desproporcionadas.

Mecanismo:
> Antes evitaba un esfuerzo mínimo; ahora pago para hacer uno mucho mayor.

### Variante B — SETUP + REMATE
La primera parte instala una frase, problema o expectativa. La segunda parte cambia su sentido cuando aparece la imagen.

Puede representarse en un único string con salto de línea:

```text
SETUP
REMATE
```

Mecanismo:
> "Necesito X" → la imagen muestra qué entiende esta persona por X.

Aunque tenga dos partes, sigue siendo un único copy y una única idea. No crear secuencia de escenas, slides ni múltiples campos.

## Cómo razonar el meme
Antes de escribir, identificar una conducta real del público en la que la propia voz pueda incluirse:

- evitar ejercicio cotidiano pero elegir esfuerzos grandes por voluntad propia;
- insistir durante semanas para hacer una salida y después sufrirla con entusiasmo;
- gastar dinero o energía en una actividad que desde afuera parece poco razonable;
- salir con comida mínima y volver satisfecho por la experiencia;
- buscar naturaleza como respuesta impulsiva al cansancio cotidiano;
- describir una ruta difícil con dramatización claramente humorística;
- aceptar incomodidad, frío o cansancio porque fueron elegidos;
- comportarse como si el plan outdoor resolviera simbólicamente todo.

Después, encontrar la contradicción concreta.

El meme debe responder:

> ¿Qué hacemos los que elegimos esto que, visto desde afuera, resulta absurdo pero reconocible?

No debe responder:

> ¿Qué tiene de ridícula otra persona?

## Humor de autoidentificación
- La voz se ríe de sí misma o de un hábito compartido.
- El lector debe poder pensar "soy yo".
- Se permite exageración evidente, pero no atribuir hechos falsos a una persona real.
- La contradicción debe ser específica; no alcanza con decir que alguien está loco por la montaña.
- El remate puede depender de la imagen, pero el setup tiene que entenderse sin explicación adicional.
- El humor puede ser seco, absurdo, dramático o cómplice.
- Nunca humillar a principiantes, personas con otro estado físico, guías, clientes o compañeros.

## Mecanismo propio: LA MONTAÑA COMO "TERAPIA"
Este subpatrón es recurrente y central en la familia.

La persona dice que necesita terapia, descanso o resolver algo; la imagen revela, de manera irónica, que su respuesta impulsiva es salir, caminar o ir a la montaña.

Estructuras frecuentes:

### Declaración + revelación
> "Necesito terapia" → el video revela la actividad outdoor.

### Frase ajena + respuesta visual
> "Me dicen que necesito terapia" → "la terapia:" + imagen.

### Autojustificación absurda
> La voz reconoce que está eligiendo una actividad exigente en vez de afrontar su vida cotidiana.

Reglas duras del mecanismo:
- Es una metáfora humorística sobre la conducta del hablante, no una recomendación de salud.
- Nunca afirmar que la montaña cura, sana, reemplaza terapia o resuelve una condición psicológica.
- Nunca desalentar ayuda profesional.
- Nunca burlarse de una persona por ir a terapia.
- No asociar un diagnóstico, crisis o trastorno real con un chiste.
- No usar depresión, ansiedad, trauma, suicidio, autolesión o medicación como remate.
- La gracia está en la autoironía y en la preferencia por el plan outdoor, no en negar la salud mental.
- Evitar repetir este mecanismo en todas las piezas: es fuerte porque aparece con criterio, no porque sea la única fórmula.

## Voz
- Coloquial y argentina.
- Más hablada que las Familias 3a y 3b.
- Se permiten voseo, ritmo oral y modismos cuando resultan naturales.
- `Che` o `boludo` pueden aparecer en contexto, con moderación y si la voz de marca lo admite.
- No insertar modismos para demostrar argentinidad.
- No imitar de manera caricaturesca un acento regional.
- No abusar de insultos, groserías o mayúsculas.
- Debe sonar como algo que una persona mandaría a un amigo, no como una marca intentando hacer memes.

## Relación entre texto e imagen
- La imagen puede funcionar como remate.
- Si el copy dice `la terapia:`, el video debe mostrar con claridad la actividad o escena que completa la ironía.
- Si se menciona nieve, amanecer, comida, cansancio o ruta, ese elemento debe aparecer o estar verificado en el material.
- No afirmar peligro real, pérdida, accidente, cumbre o hazaña que el video no demuestre.
- No usar una escena de una persona real para atribuirle pensamientos, problemas o decisiones que no expresó.
- El humor debe poder entenderse sin inventar una historia alrededor del material.

## Atemporalidad y neutralidad comercial
El copy debe funcionar:

- sin fecha de publicación;
- sin precio, cupos ni itinerario;
- sin conocer el nombre de la salida;
- sin CTA posterior;
- con cualquier cliente cuya voz admita humor coloquial.

Prohibido mencionar:

- nombre de destino, ciudad, provincia, región o país;
- fecha, duración o temporada comercial;
- precio, seña, cupos o disponibilidad;
- nombre de la salida;
- prestaciones, nivel, dificultad o itinerario;
- CTA de venta, reserva, consulta o comentario;
- nombre de la marca dentro del copy.

Un contexto físico genérico puede aparecer si lo sostiene la imagen. `Nieve`, `cerro`, `montaña`, `ruta` o `amanecer` no son destinos; un nombre geográfico específico sí.

## Longitud y legibilidad
- Una frase o dos partes muy breves.
- Ideal: entre 8 y 22 palabras totales.
- El setup debe ser lo bastante corto para que el remate llegue rápido.
- Contar ambas partes y cualquier salto de línea dentro del presupuesto total.
- Evitar explicaciones después del remate.
- El copy debe entrar completo en el tiempo de lectura calculado para el clip.
- Nunca cortar una palabra, setup o remate para cumplir el límite.
- Si no entra, reescribir de forma más breve antes de considerar truncamiento.

## Mecanismos que funcionan

### Pasado improbable + presente elegido
Contrasta una versión anterior con la conducta outdoor actual.

Mecanismo:
> Antes evitaba una actividad simple; ahora elige una versión mucho más exigente.

### Problema cotidiano + solución desproporcionada
La respuesta al problema es una salida o actividad mucho más grande de lo necesario.

Mecanismo:
> "Necesito despejarme" → termina en una jornada completa de montaña.

### Insistencia + consecuencia
La misma persona que pidió el plan dramatiza después el esfuerzo.

Mecanismo:
> Insistió para ir → ahora procesa la decisión.

### Pocos recursos + satisfacción total
Una preparación mínima contrasta con la sensación de plenitud posterior.

Mecanismo:
> Comió casi nada, vivió una historia enorme y está feliz.

### Dramatización absurda de la ruta
Exagera de forma evidentemente ficticia una situación incómoda.

Mecanismo:
> El camino parece llevar a una anécdota o a un titular.

No usar este mecanismo si la escena muestra peligro real o si puede interpretarse como una afirmación de inseguridad del servicio.

## Emoji de remate
Uno o dos emojis son opcionales — el uso más permisivo de la Familia 3, coherente con el tono humorístico del formato.

Puede usarse cuando:
- refuerza el remate o la autoironía, sin explicar el chiste;
- aparece al final del copy, después del remate;
- el catálogo visual lo permite;
- mantiene la pieza legible, sin saturar el bloque de texto.

No usarlo:
- para explicar o subrayar por qué es gracioso — el chiste se sostiene solo;
- más de dos por pieza;
- en piezas que tocan el mecanismo de terapia o salud mental — ahí no corresponde ningún emoji;
- como sustituto de una palabra del remate;
- si el renderer no garantiza el glifo.

## Ejemplos reales de referencia
Estos textos calibran tono, ritmo, longitud y mecanismo. Son material de observación: no copiarlos, parafrasearlos ni convertirlos en plantillas cambiando una palabra.

- "No corrí ni dos vueltas en educación física y ahora pago para subir cerros y montañas"
- "Cuando la ruta se convierte en: 'o salimos de acá o salimos en las noticias'"
- "Necesito ir a terapia"
- "Necesito ir a terapia"
- "Yo yendo a poner mi vida en riesgo para sentir algo, porque para ir a terapia no me alcanza"
- "Cuando me dicen que necesito terapia: la terapia:"
- "Después de estar jode y jode, que vayamos al nevado"
- "Yo con una galleta en la panza y con mis historias"

La repetición literal de "Necesito ir a terapia" en el corpus confirma que el mecanismo aparece en ejecuciones distintas. Esa frecuencia es evidencia del patrón, no autorización para repetir el mismo copy.

Algunos ejemplos observados mencionan riesgo, terapia o un contexto físico particular. Sirven para reconocer el registro, pero no anulan las reglas duras:

- no afirmar riesgo real ni presentar una actividad insegura;
- no glorificar conductas peligrosas;
- no convertir terapia en insulto;
- no prometer que la montaña reemplaza ayuda profesional;
- no mencionar nieve, nevado, ruta u otro contexto si el material no lo sostiene.

## Uso correcto de los ejemplos
Extraer el mecanismo, no las palabras.

Correcto:
- construir una contradicción nueva basada en una conducta real del público;
- usar el material como remate de un setup breve;
- escribir autoironía sin atacar a otra persona;
- reconocer la montaña-como-terapia como metáfora humorística;
- encontrar un detalle concreto que vuelva propio el meme.

Incorrecto:
- cambiar `educación física` por `gimnasio` conservando el resto;
- reemplazar `galleta` por otro alimento en la misma frase;
- usar siempre `cuando me dicen...`;
- repetir `necesito terapia`;
- cambiar `noticias` por `documental` manteniendo el mismo chiste;
- combinar dos ejemplos en un solo copy;
- tratar los ejemplos como banco de captions.

## Qué NO hacer

### No escribir un chiste sobre otra persona
Incorrecto:
- "El que se anotó sin entrenar:"
- "Mi amigo creyendo que podía seguirnos"
- "Cuando llevás al flojo del grupo"
- "Los principiantes en su primera subida"

### No glorificar peligro
Incorrecto:
- "Yo arriesgando la vida porque me aburro"
- "Si no casi morís, no cuenta"
- "La seguridad es para los que no se animan"
- "Sin equipo porque así tiene más emoción"

### No convertir salud mental en consejo
Incorrecto:
- "Dejá terapia y andá a la montaña"
- "La montaña cura la depresión"
- "No necesitás psicólogo, necesitás viajar"
- "Una salida reemplaza cualquier medicación"

### No escribir publicidad disfrazada de meme
Incorrecto:
- "Yo pagando esta salida porque quedan pocos cupos"
- "Cuando reservás la mejor aventura de tu vida"
- "Mi terapia cuesta USD 300 y sale el viernes"
- "Etiquetá al que te debe este viaje"

### No mencionar destinos
Incorrecto:
- "Yo gastando todo para volver a Patagonia"
- "Cuando El Chaltén es tu única personalidad"
- "Mi terapia queda en Bariloche"
- "Después de insistir para ir al Nevado del Aconquija"

### No usar humor genérico sin contradicción
Incorrecto:
- "Los que amamos la montaña somos así"
- "Modo aventura activado"
- "Necesito vacaciones urgente"
- "Yo siendo feliz en la naturaleza"

### No explicar el chiste
Incorrecto:
> "Yo diciendo que necesito terapia, pero en realidad prefiero ir a la montaña porque eso me hace sentir mejor."

La explicación destruye el remate y agrega una promesa emocional.

## Reglas duras de veracidad
- No inventar emociones, experiencias, diálogos, logros o escenas atribuidas a una persona real.
- No afirmar que alguien llegó a una cumbre, sufrió un accidente, estuvo en peligro o venció un miedo.
- No convertir una actividad planificada en un hecho ocurrido.
- No presentar dramatización humorística como información real sobre seguridad.
- No hacer afirmaciones médicas o psicológicas.
- No mencionar un contexto físico que no aparezca o no esté verificado en el material.
- No usar conocimiento del destino, datos de la salida o información comercial, aunque estén disponibles en otras capas del contexto.
- Si una capa de contexto contradice estas reglas, prevalecen las reglas de esta guía.

## Selección tipográfica
- Elegir `tipografia_id` únicamente entre los IDs suministrados por el sistema.
- Priorizar legibilidad y timing del remate.
- Setup y remate pueden diferenciarse por jerarquía visual únicamente si el catálogo tipográfico lo contempla; el contrato sigue usando un solo `tipografia_id`.
- Una tipografía expresiva no debe hacer que el meme parezca una publicidad.
- No elegir tipografía por una asociación inventada con un destino o una persona.

## Control de calidad
Antes de devolver el contrato, comprobar:

- ¿El humor nace de autoidentificación?
- ¿Existe una contradicción concreta?
- ¿El lector puede pensar "soy yo" sin que otra persona sea humillada?
- ¿Es una frase o un setup + remate dentro de un único copy?
- ¿La imagen completa o potencia el chiste?
- ¿Evita destino, fecha, precio, cupos, salida y CTA?
- ¿Todo contexto físico mencionado aparece en el material?
- ¿Evita afirmar peligro real?
- Si usa el mecanismo de terapia, ¿queda claro que es autoironía y no consejo de salud?
- ¿Evita promesas de sanar, curar, reemplazar terapia o transformar?
- ¿Suena argentino sin caricatura ni modismos forzados?
- ¿Es original respecto de los ejemplos?
- ¿Entra completo en el tiempo disponible?
- ¿`tipografia_id` pertenece al catálogo permitido?
- ¿`duracion_estimada_segundos` alcanza para leer setup y remate sin apuro?

Prueba final obligatoria:

> Si el chiste necesita burlarse de otra persona, inventar peligro o explicar por qué es gracioso, todavía no funciona. La contradicción debe reconocerse sola.
