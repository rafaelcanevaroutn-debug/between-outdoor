# Video Ficha técnica (Familia 5)

## Qué es
Un formato que muestra un lugar y sus **datos duros de terreno**: altitud, distancia, duración, dificultad, acceso. El dato es el contenido. No narra el recorrido, no vende, no reflexiona. Se lee como una ficha —en bloque, dato por dato— no como prosa.

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
- **duracion_estimada_segundos**: calculada, no fija (ver Duración y legibilidad).

`lugar` y `datos` nunca se pisan: el lugar es la identidad, los datos son las magnitudes. El lugar no lleva un dato adentro ("Cerro Slalgi 2500msnm" como un solo string está mal: `lugar = "Cerro Slalgi"`, `datos = [{altitud, 2500 msnm}]`).

## Etiquetas de datos (vocabulario controlado)
Cerrado. Gemini elige entre estas, no inventa etiquetas nuevas:

- **altitud** — msnm (ej. "2500 msnm")
- **distancia** — km del recorrido (ej. "5 km")
- **duración** — tiempo de recorrido (ej. "3 h")
- **dificultad** — escala controlada: baja / media / alta. No adjetivo libre.
- **acceso** — cómo se llega / desde dónde (ej. "a 240 km de Calafate")
- **desde–hasta** — punto de salida y de llegada del tramo (ej. "sale de X, llega a Z")

Si el motor recibe un dato que no encaja en ninguna etiqueta, se descarta el dato, no se crea una etiqueta ad-hoc.

## Cantidad de datos
Entre **1 y 4**. El dictado va de un dato único ("a 240 km de Calafate") a tres o cuatro combinados ("2500 msnm + 5 km + dificultad media"). Por encima de 4 deja de leerse como ficha y se vuelve pantalla saturada.

> Rango tomado del dictado, no de corridas. Si al calibrar el máximo real converge más abajo (p. ej. 3), se ajusta acá.

## Target de caracteres
**Pendiente de calibración — no fijar todavía.**

Mecanismo (para cuando se corra): el `lugar` va fijo en pantalla (header, no consume ventana, igual que el título de 2c). Cada `valor` es una magnitud corta que se lee en bloque, no como frase —más cerca del `dato_duro` de Familia 4 que de un bullet de 2a—. La `etiqueta` puede ir implícita en el render (un ícono, una unidad) y no siempre suma caracteres.

Si Ficha se renderiza revelando los datos en secuencia, el mecanismo de ventana es análogo al de Familia 2, **pero la duración de ventana y el cap por valor necesitan su propia corrida** — no se heredan las constantes de 2a/2c sin validar (ese atajo ya nos rompió la convergencia una vez). No hay número editorial confirmado hasta correrlo.

## Veracidad
El más estricto del catálogo, junto con Familia 4. Anclado duro:

- **lugar**: identidad real verificada. Sin lugar verificado, no hay ficha.
- **cada valor**: sale de la ficha real del lugar / de la salida. Cero estimado por Gemini.
- **números**: validados contra fuente (`unsupportedNumericClaims` aplica a altitud, distancia, duración, distancias de acceso).
- **dificultad**: solo de la escala controlada (baja/media/alta) y solo si la fuente la declara. No se infiere de "parece exigente".
- **acceso / distancia**: verificado, no calculado al vuelo.

Regla dura de omisión: si no hay dato verificado para una etiqueta, **se omite la etiqueta** — nunca se rellena con un valor plausible para que la ficha "quede más completa". Una ficha de un solo dato verificado es válida; una ficha de cuatro datos con uno inventado se rechaza entera.

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

### No rellenar hasta el máximo
Cuatro datos no es la meta, es el techo. Una ficha honesta de un dato le gana a una inflada con tres inventados.

## Checklist de validación
- [ ] `lugar` es un lugar real y verificado.
- [ ] `datos[]` tiene entre 1 y 4 elementos.
- [ ] Cada `etiqueta` pertenece al vocabulario controlado.
- [ ] Cada `valor` está verificado contra fuente; ningún número sin respaldo.
- [ ] `dificultad`, si aparece, usa la escala controlada.
- [ ] Ningún dato comercial (precio / fecha / cupo).
- [ ] Ningún relato de recorrido.
- [ ] Sin emoji en `datos[]`; 📍 solo (y opcional) en `lugar`.
- [ ] `lugar` y `datos` no fusionados en un mismo string.

## Ejemplos reales de referencia
Del dictado. Calibran mecanismo y tono. Los lugares y datos **no** forman un catálogo reutilizable — cada ficha se arma con la fuente real de esa pieza.

- **Cerro Slalgi** — altitud: 2500 msnm · distancia: 5 km
- **Laguna Brava** (Quebrada de Escoipe, Salta) — altitud: 300 msnm
- Sendero sin nombrar — dificultad: media · duración: 3 h · desde–hasta: salida y llegada del tramo
- Destino a **240 km de Calafate** — acceso: 240 km desde Calafate

> Nota de calibración: este doc queda con contrato y veracidad firmes desde el día uno (hereda la disciplina de Familia 4), pero los targets de caracteres por campo y la duración de ventana están **sin correr**. Marcarlos como validados recién después de la primera tanda real.
