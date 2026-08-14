# Video Ficha técnica (Familia 5)

## Qué es
Un formato que muestra un lugar y sus **datos duros de terreno**: altitud, desnivel, distancia, duración, dificultad, acceso. El dato es el contenido. No narra el recorrido, no vende, no reflexiona. Se lee como una ficha —en bloque, dato por dato— no como prosa.

Nace del dictado, donde el patrón aparece repetido y no tenía casa:
- "Cerro Slalgi, 2500 msnm, 5 km" — arranca con la información dura, sin itinerario.
- "Laguna Brava 300 msnm, Quebrada de Escoipe, Salta."
- "Dificultad media, 3 horas de recorrido, de dónde sale, hasta dónde van."
- "El segundo volcán más alto del mundo" + cómo llegar, te va escribiendo el dato.
- "Este lugar está a 240 km de Calafate" — informativo puro.

No es 3e (3e es solo el nombre del lugar), no es itinerario/2b (el itinerario narra el recorrido paso a paso), no es Familia 4 (Familia 4 vende: precio, fecha, cupo). Ficha informa terreno y nada más.

## Contrato de salida
`{lugar, datos[], tipografia_id, duracion_estimada_segundos}`

- **lugar**: nombre del lugar / sendero / cerro. Identidad real y verificada (mismo estándar que el `lugar` de 3e y el destino de Familia 4).
- **datos[]**: lista de `{etiqueta, valor}`. Cada elemento es un dato duro de terreno, verificado. Es el núcleo del formato.
- **tipografia_id**: del catálogo, como el resto.
- **duracion_estimada_segundos**: calculada, no fija (ver Target de caracteres).

`lugar` y `datos` nunca se pisan: el lugar es la identidad, los datos son las magnitudes. El lugar no lleva un dato adentro ("Cerro Slalgi 2500msnm" como un solo string está mal: `lugar = "Cerro Slalgi"`, `datos = [{altitud, 2500 msnm}]`).

## Etiquetas de datos (vocabulario controlado)
Cerrado. Gemini elige entre estas, no inventa etiquetas nuevas:

- **altitud** — msnm (ej. "2500 msnm")
- **desnivel** — metros de desnivel positivo del tramo (ej. "1000 m")
- **distancia** — km del recorrido (ej. "5 km")
- **duración** — tiempo de recorrido (ej. "3 h")
- **dificultad** — escala controlada: Baja / Media / Alta, sola o en par adyacente ("Baja-Media"). No adjetivo libre — ver normalización obligatoria en Target de caracteres.
- **acceso** — cómo se llega / desde dónde (ej. "a 240 km de Calafate")

Si el motor recibe un dato que no encaja en ninguna etiqueta, se descarta el dato, no se crea una etiqueta ad-hoc — confirmado en corrida real: Gemini devolvió una vez una etiqueta "Lugar" no solicitada, y se descartó sin problema.

## Cantidad de datos
Entre **3 y 6**. Piso mínimo confirmado por Mati: **con menos de 3 datos duros verificados, el motor no arma Ficha — hace fallback a otra familia (4 o 2)**. Con menos de 3 datos deja de leerse como dashboard y pasa a ser texto suelto; ya no es Ficha.

El techo de 6 viene del vocabulario controlado (6 etiquetas posibles: altitud, desnivel, distancia, duración, dificultad, acceso) y de la grilla que Mati confirmó, que nunca queda asimétrica (ver Target de caracteres).

> Los dos ejemplos del dictado citados en "Qué es" —Cerro Slalgi (2 datos: altitud, distancia) y Laguna Brava (2 datos: altitud, acceso)— tienen solo 2 datos de terreno cada uno: bajo el piso mínimo de 3. Con la regla confirmada, hoy caerían a fallback (Familia 4/2), no armarían Ficha. Se mantienen en este doc porque ilustran el origen del formato y, justamente, dónde empieza y termina Ficha — no se borran, se reencuadran como casos de fallback documentados. Los ejemplos de ficha completa (3+ datos, piso cumplido) son los senderos del Chaltén — ver Ejemplos reales de referencia.

## Target de caracteres
**Calibrado — mecanismo confirmado por Mati, caps y forma canónica validados en corrida real.**

### Mecanismo
Grilla fija, staggered entry (~0.3s por dato), todos los datos en pantalla a la vez — **no hay ventanas de tiempo secuenciales**, a diferencia de Familia 2. El límite es de **ancho de render**, no de tiempo de lectura.

La grilla se reacomoda sola según la cantidad de datos, sin quedar nunca asimétrica:
- 6 datos → 2×3
- 5 datos → 2+2+1, centrado
- 4 datos → 2×2
- 3 datos → 2+1, centrado

### Caps
- **valor**: máximo **18 caracteres**, tope estricto, una sola línea — nunca rompe a dos. Se valida sobre el string **trimmeado**: los espacios finales no cuentan como longitud ni se publican (corrida real mostró a Gemini devolviendo espacios de relleno más de una vez).
- **etiqueta**: hardcodeada en el template (30px sans, tracking amplio) — no la genera el motor, no cuenta contra ningún cap.
- **lugar**: **sin cap**. El template hace shrink-to-fit dinámico (Playfair, 110px → 90px → 70px según el largo). El motor manda el nombre real y completo siempre — nunca abrevia, nunca corta. Abreviar un nombre propio rompe veracidad.

### Forma canónica por etiqueta (validada en corrida real)
Cada `valor` se escribe en esta forma, no en prosa:

- **altitud** → `"N msnm"` (ej. `"2500 msnm"`)
- **desnivel** → `"N m"` (ej. `"753 m"`)
- **distancia** → `"N km"` / `"N-M km"`, opcionalmente `"i/v"` — nunca escribir `"(ida y vuelta)"` completo
- **duración** → `"N h"` / `"N-M h"` / `"N min"` (si el dato real es en minutos y no llega a una hora) — nunca `"(ida y vuelta)"` completo
- **dificultad** → escala `{Baja, Media, Alta}`, sola o en par adyacente (`"Baja-Media"`). Normalización **obligatoria** de la fuente: fácil → Baja, moderada/intermedia → Media, exigente → Alta. Nunca dejar el texto crudo de la fuente.
- **acceso** → un solo ancla, terso: `"Desde [lugar]"` o `"N km de [lugar]"`. Descartar la prosa geográfica larga y quedarse con el dato más específico que entre limpio.

### Regla de compresión y veracidad
Comprimir preserva el dato **y** la ortografía. Acortar está bien; comerse una tilde o un espacio de un nombre propio para entrar en el cap, no. `"37km de El Chalten"` está mal —perdió el espacio entre "37" y "km" y la tilde de "Chaltén"— aunque entre en 18 caracteres. Si un valor solo entra degradando ortografía, se usa otra forma válida que sí entre limpia (por ejemplo, `"Desde El Chaltén"` en vez de forzar el nombre completo de la avenida de acceso).

### Nota para el generador (no implementar todavía)
`acceso` fue el único campo con convergencia menor al 100% en la corrida real (~93% al primer intento — 1 de 15 generaciones superó el cap). Cuando se construya el generador, `acceso` necesita rechazo-duro + reintento si supera 18 caracteres — no publicarse tal cual, mismo criterio que ya usan otras familias del catálogo para sus campos de mayor riesgo.

## Veracidad
El más estricto del catálogo, junto con Familia 4. Anclado duro:

- **lugar**: identidad real verificada. Sin lugar verificado, no hay ficha.
- **cada valor**: sale de la ficha real del lugar / de la salida. Cero estimado por Gemini.
- **números**: validados contra fuente (`unsupportedNumericClaims` aplica a altitud, desnivel, distancia, duración, distancias de acceso).
- **dificultad**: solo de la escala controlada (Baja/Media/Alta) y solo si la fuente la declara. No se infiere de "parece exigente" — se normaliza según la tabla de Target de caracteres.
- **acceso / distancia**: verificado, no calculado al vuelo.

Regla dura de omisión: si no hay dato verificado para una etiqueta, **se omite la etiqueta** — nunca se rellena con un valor plausible para que la ficha "quede más completa". Una ficha de tres datos verificados es válida; una ficha de seis datos con uno inventado se rechaza entera.

## Fronteras (para el clasificador)
- **vs 3e (Lugar)** → 3e es *solo* el nombre. Si hay una sola magnitud de terreno acompañando al nombre, ya es Ficha.
- **vs itinerario / 2b (Storytelling)** → el itinerario *narra el recorrido* ("día 1 salimos, día 2 subimos"). Ficha da el dato *estático* del terreno, sin secuencia narrativa.
- **vs Familia 4 (Comercial)** → Familia 4 vende: precio, fecha, cupo, "todo incluido". Ficha no tiene ningún dato comercial. Si aparece un precio o una fecha de salida, no es Ficha.

## Emoji y pin de ubicación
Misma lógica que 2a, aplicada a la naturaleza de dato duro de este formato.

- **Pin de ubicación (📍)**: estructural, opcional, solo en `lugar` (precedente 3e/2a). Marca el lugar, no adorna.
- **datos[]**: sin emoji, nunca, sin excepción. Un valor de terreno es dato duro —misma regla que el `dato_duro` de Familia 4—. Un emoji ahí es ruido sobre el único contenido del formato.
- **Emoji decorativo**: no aplica a Ficha. No hay campo de tono expresivo (no hay CTA, no hay cierre). Ficha es data, no invitación.

## Qué NO hacer

### No inventar datos
Incorrecto: la fuente da la altitud, y el motor agrega una distancia "estimada" para completar. Si no está verificado, no va.

### No adjetivar el dato
Incorrecto: "2500 msnm impresionantes", "una distancia exigente de 5 km". El dato va seco. El adjetivo es tono, y el tono no es de este formato.

### No narrar el recorrido
Incorrecto: "salís temprano, cruzás el río y a las 3 h llegás a la cima". Eso es itinerario (2b). Ficha da "duración: 3 h", no el relato.

### No meter dato comercial
Incorrecto: agregar precio, fecha de salida o cupo. Eso es Familia 4. Ficha no vende.

### No fundir lugar y dato en un solo string
Incorrecto: `lugar = "Cerro Slalgi 2500 msnm 5 km"`. Correcto: `lugar` y `datos[]` separados, para que el render y la validación operen sobre cada uno.

### No sacrificar ortografía por el cap
Incorrecto: `"37km de El Chalten"` — perdió el espacio de "37 km" y la tilde de "Chaltén" para entrar en 18 caracteres. Si ninguna forma cabe sin degradar el nombre, se usa una forma más corta que sí preserve la ortografía (`"Desde El Chaltén"`); nunca se le saca una tilde o un espacio a un nombre propio para que entre.

### No abreviar o cortar el lugar
Incorrecto: acortar "Sendero Laguna de los Tres" a "Sendero L. de los Tres" para que "quede más prolijo". `lugar` no tiene cap — el render hace shrink-to-fit. Abreviar un nombre propio real es un problema de veracidad, no de espacio.

### No rellenar hasta el máximo
Seis datos no es la meta, es el techo. Una ficha honesta de tres datos le gana a una inflada con datos de más inventados.

## Checklist de validación
- [ ] `lugar` es un lugar real y verificado, completo y sin abreviar (sin cap).
- [ ] `datos[]` tiene entre 3 y 6 elementos — menos de 3 no es Ficha, hace fallback a otra familia.
- [ ] Cada `etiqueta` pertenece al vocabulario controlado (altitud / desnivel / distancia / duración / dificultad / acceso).
- [ ] Cada `valor` está verificado contra fuente; ningún número sin respaldo.
- [ ] Cada `valor` sigue su forma canónica y entra en 18 caracteres, trimmeado.
- [ ] `dificultad`, si aparece, usa la escala normalizada (Baja/Media/Alta), nunca el texto crudo de la fuente.
- [ ] Ninguna compresión sacrificó tilde, espacio o exactitud ortográfica de un nombre propio.
- [ ] Ningún dato comercial (precio / fecha / cupo).
- [ ] Ningún relato de recorrido.
- [ ] Sin emoji en `datos[]`; 📍 solo (y opcional) en `lugar`.
- [ ] `lugar` y `datos` no fusionados en un mismo string.

## Ejemplos reales de referencia
Calibran mecanismo, forma canónica y tono. Los lugares y datos **no** forman un catálogo reutilizable — cada ficha se arma con la fuente real de esa pieza.

### Ficha completa (3+ datos, piso mínimo cumplido)
Del Chaltén (Dic 2026/Ene 2027), datos reales verificados vía `itinerario_dias`/`puntos_interes`, fraseados en forma canónica:

- **Sendero Laguna de los Tres** — distancia: 26 km i/v · desnivel: 1000 m · duración: 8-9 h · dificultad: Alta · acceso: Desde El Chaltén
- **Sendero Laguna y Glaciar Huemul** — distancia: 4 km · desnivel: 200 m · duración: 45 min · dificultad: Media · acceso: Desde El Chaltén
- **Sendero Torre** — distancia: 20 km i/v · desnivel: 700 m · duración: 7-8 h i/v · dificultad: Media · acceso: Desde El Chaltén
- **Miradores de los Cóndores y de las Águilas** — distancia: 5-7 km i/v · duración: 2-3 h · dificultad: Baja-Media · acceso: Desde El Chaltén *(sin desnivel disponible en la fuente — se omite, no se inventa)*

### Casos de fallback (bajo el piso mínimo — ver Cantidad de datos)
- **Cerro Slalgi** — altitud: 2500 msnm · distancia: 5 km *(2 datos — no llega a Ficha)*
- **Laguna Brava** — altitud: 300 msnm · acceso: Desde Quebrada de Escoipe *(2 datos — no llega a Ficha)*

> Calibración cerrada. Mati confirmó mecanismo (grilla fija, sin ventanas de tiempo) y caps (18 caracteres por valor, lugar sin cap); dos corridas reales validaron forma canónica, normalización de dificultad, piso mínimo y el único punto de fricción real (`acceso`, ~93% de convergencia al primer intento). Contrato, veracidad, mecanismo, caps y forma canónica quedan firmes. Pendiente real: el generador de Familia 5 todavía no existe — este doc es la especificación completa a implementar cuando se construya.
