# Video Discurso (Familia 1a)

> **Alcance de este doc:** solo el **motor de copy** — la generación del texto del discurso. La transcripción de audio existente, la narración con ElevenLabs, la sincronización y el render son responsabilidad de Mati y quedan **fuera** de esta especificación. Este doc define únicamente qué texto genera el motor y bajo qué reglas.

## Qué es
Un fragmento **narrado y extenso** —un discurso filosófico de vida, un refrán largo, un pedazo de película o de canción— que transcurre en el video como una escena. No es una frase suelta: es un texto con **arco** (entrada, desarrollo, desenlace) que mete al espectador en un estado, lo lleva por una progresión y cierra. El peso está en el **recorrido**, no en el golpe.

Nace de una vertical que ya existe del lado de Mati: agarrar un audio hablado con peso (viral, una canción, una escena) y transcribirlo a texto sincronizado en pantalla. Este doc cubre la pata que le falta a esa vertical: **generar el discurso desde cero** cuando no hay un audio de origen, para que Mati lo pueda narrar (ElevenLabs) y renderizar.

## Las dos patas del formato (contexto, no alcance)
Para ubicar dónde entra el motor de copy:

- **Pata A — audio existente → transcripción → video.** Ya implementada por Mati. El motor de copy **no participa**: el texto viene del audio.
- **Pata B — copy generado → narración (ElevenLabs) → video.** Acá entra este motor: **genera el discurso**. La narración y el render son de Mati; el motor entrega solo el texto.

Todo lo que sigue especifica la Pata B, y solo su porción de copy.

## Contrato de salida
`{discurso, tipografia_id, duracion_estimada_segundos}`

- **discurso**: el texto extenso, con arco narrativo. Es el núcleo del formato. Puede estructurarse internamente en segmentos (para que Mati los sincronice con la narración), pero es una sola pieza coherente, no una lista.
- **tipografia_id**: del catálogo, como el resto.
- **duracion_estimada_segundos**: calculada. **Pendiente de definir el mecanismo con Mati** — la duración de un discurso narrado depende del ritmo de voz (TTS), no del tiempo de lectura en pantalla como en las otras familias. No fijar número hasta que Mati confirme cómo se estima sobre audio.

## Frontera con 3a (Reflexivo) — la línea dura
Los dos son filosóficos; se confunden si no se traza la línea. La regla:

- **3a condensa.** Una frase corta, cerrada, que se **lee**. El impacto está en la condensación — un solo golpe.
- **1a transcurre.** Un fragmento largo que se **narra** y tiene arco — entrada, desarrollo, desenlace. El impacto está en el recorrido.

Test para el clasificador: **¿tiene arco?** Si el texto entra, desarrolla y cierra —si te lleva por una progresión—, es 1a. Si es un solo remate condensado, es 3a. Una frase reflexiva **puede vivir dentro** de un discurso como parte de su arco (como cierre, como bisagra), pero una frase reflexiva **sola** es 3a, no 1a.

Señales prácticas de 1a frente a 3a:
- Longitud: 1a es un párrafo / refrán extenso; 3a es una línea.
- Estructura: 1a tiene más de un movimiento; 3a es un movimiento.
- Destino: 1a se pensó para ser **escuchado** (narrado); 3a para ser **leído**.

## Fronteras con el resto
- **vs 2b (Storytelling)** → 2b narra **un recorrido concreto** (la salida, el sendero, el itinerario). 1a narra una **idea** — un discurso de vida, no una excursión. 2b tiene lugar y terreno; 1a tiene solo el texto y su arco.
- **vs 3c (Meme)** → 3c es humor identificatorio. 1a no hace chiste — sostiene un tono, no lo rompe.
- **vs Familia 4 (Comercial)** → 1a no vende nada. Sin precio, sin fecha, sin convocatoria.

## Registro y tono
El discurso sostiene **un** tono de punta a punta —reflexivo, épico, íntimo— sin quebrarlo. Menos palabras, más peso: cada línea del arco tiene que ganarse el lugar. Evitar el cliché vacío ("seguí tus sueños"); buscar la frase que suena a que **te la están contando**, no a que la sacaron de una taza. El criterio del dictado: que tenga sentido y textura, no que suene a frase hecha.

## Qué NO hacer

### No generar una frase suelta
Incorrecto: `discurso = "Todo lo que deseás está del otro lado del miedo."` Eso es 3a. Un discurso tiene arco; si lo que sale es una sola línea, el formato es 3a, no 1a.

### No narrar un recorrido concreto
Incorrecto: convertir el discurso en el relato de una salida ("salimos temprano, subimos al refugio..."). Eso es 2b. 1a narra una idea, no una excursión.

### No vender
Sin precio, fecha, cupo ni CTA. Si aparece convocatoria, es Familia 4.

### No romper el tono
Un discurso épico no cierra con un chiste; uno íntimo no mete un dato comercial. Un solo registro, sostenido.

### No caer en cliché de taza
Evitar la frase motivacional genérica. El discurso tiene que tener textura propia, sonar contado, no estampado.

## Checklist de validación (motor de copy)
- [ ] `discurso` tiene arco: entra, desarrolla y cierra — no es una sola línea.
- [ ] Es más largo que una frase 3a (párrafo / refrán extenso).
- [ ] Sostiene un solo tono de punta a punta.
- [ ] No narra un recorrido concreto (eso es 2b).
- [ ] No vende (sin precio / fecha / cupo / CTA).
- [ ] No es cliché motivacional genérico.

## Pendientes (fuera del motor de copy)
Anotados para no perderlos, pero **no** son parte de esta especificación:
- **Integración ElevenLabs** (narración de la Pata B) — de Mati.
- **Sincronización copy ↔ audio** (`@remotion/captions` + TTS) — de Mati.
- **Estimación de `duracion_estimada_segundos` sobre audio narrado** — depende del ritmo de voz; definir con Mati antes de fijar cualquier número.

> Estado: especificación del motor de copy. El generador de Familia 1a (Pata B) todavía no existe — este doc es el spec a implementar. La Pata A (audio → transcripción) ya la tiene Mati y no pasa por este motor.
