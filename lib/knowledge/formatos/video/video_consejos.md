# FORMATO DE VIDEO: FAMILIA 2C — CONSEJOS EN SECUENCIA

## Qué es
Un video que presenta una lista breve y ordenada de tips —cosas para hacer o evitar— sobre una salida puntual. Abre con un título que nombra el destino real y la cantidad, revela los tips uno por uno sobre el video y termina con un CTA suave.

Mismo mecanismo estructural que Familia 2A (Listicle): título fijo, cada tip en su ventana de tiempo, CTA fijo al final. A diferencia de 2A, los tips no son nombres de lugar — son texto libre, anclado en un dato real.

## Contrato de salida
```json
{
  "titulo": "empieza con la cantidad exacta, ej. \"5 tips para Tilcara\"",
  "items": ["tip 1, accionable y anclado en un dato real", "tip 2, ..."],
  "cta": "CTA editorial suave",
  "tipografia_id": "identificador del catálogo habilitado",
  "duracion_estimada_segundos": 0
}
```

`items` no tiene una cantidad fija calculada por el sistema (a diferencia de 2A, donde el sistema constriñe a una lista cerrada de lugares verificados): es un objetivo de 4 tips, nunca más de 5 —el mismo tope duro que ya usa Familia 2 para bullets—, decidido por cuántos tips reales puede sostener la salida.

## Los dos ángulos de un tip, y cómo elegir

### Ángulo 1 — Tip práctico anclado
Equipo, preparación o seguridad, anclado en un dato real de terreno, clima, distancia, dificultad o logística que exista literalmente en la salida (`itinerario`, `itinerario_dias`, `puntos_interes`, `nivel`, `que_incluye`, `que_no_incluye`).

### Ángulo 2 — Mindset de montaña
Mismo tono reflexivo/atemporal de Familia 3A, formulado como consejo. No depende de ningún dato específico.

### Cómo decidir, tip por tip
1. Revisá los datos disponibles de la salida.
2. Si hay uno que sostenga un tip práctico concreto, priorizá el ángulo 1.
3. Si no hay ninguno, o ya usaste ese dato en otro tip, usá el ángulo 2.
4. Nunca inventes un dato para forzar el ángulo 1. Preferí un tip real de menos (bajar a 4, incluso a menos si hace falta) antes que uno genérico o inventado.
5. Un video puede mezclar ángulos libremente — no hace falta que todos los tips sean del mismo tipo.

## Título
Empieza con un número arábigo y, a diferencia de 3A/3B/3C, **sí corresponde nombrar el destino real** — esta pieza está anclada a UNA salida, no busca ser reutilizable para cualquier otra.

Patrones válidos:
- `5 tips para Tilcara`
- `4 cosas para llevar a [destino real]`
- `5 cosas para hacer y evitar en [destino real]`

Reglas:
- La cantidad declarada debe coincidir exactamente con `items.length`.
- No usar una cantidad mayor que la cantidad de tips reales disponibles.
- No prometer "tips" y entregar solo nombres de lugares (eso es 2A).

## Ítems (tips)
Cada tip es una unidad breve, accionable y autónoma — no un párrafo, no una lista de sub-puntos.

Reglas:
- Un tip, una idea. Nada de "llevá agua y también protector solar y también..." en el mismo tip.
- Puede nombrar el destino o un lugar verificado si ayuda a anclar el tip — no está prohibido como en 2A/3A-3C.
- No repetir el mismo tip (ni una variante mínima) dos veces.
- No incluir CTA ni dato comercial dentro de un tip — eso vive solo en el CTA final.
- No usar placeholders como `[dato]` en la salida final.

## Fuente única de verdad y veracidad
Todo dato técnico o de terreno mencionado en un tip anclado (distancia, altura, clima, agua, señal, sombra, dificultad, logística) debe existir literalmente en la salida — mismo estándar que el resto de video-familias:

- Un dato **numérico** (km, horas, msnm) se valida contra el corpus factual de la salida completo, incluyendo `que_incluye`/`que_no_incluye` — si Gemini cita un número que no está ahí, el tip se rechaza.
- Una afirmación **cualitativa fuerte** ("no hay agua", "sin señal", "sin sombra", "terreno técnico") pasa por un heurístico de alarma de humo: exige que exista al menos una palabra relacionada en algún campo de la salida. No es una prueba de veracidad completa —eso requeriría entender si la frase está realmente sostenida por texto libre, un problema que no se resuelve con regex—, es una red de seguridad más angosta. La garantía real sigue siendo el gate de aprobación humana antes de que la pieza llegue a Mati.

Si no hay dato que sostenga un tip anclado, no se inventa — se usa el ángulo 2 (mindset) en su lugar.

## CTA suave
Mismo criterio que 2A: invita a compartir, guardar o elegir. Nunca comercial (reservas, cupos, precio, WhatsApp).

Ejemplos dentro del límite de campo:
- `Compartí cuál te gustó más` (26 caracteres)
- `Guardalo para tu próximo viaje`
- `Elegí tu favorito`

## Duración y legibilidad
- Cada tip: ventana fija de 2.5 segundos, igual que un bullet de 2A — no depende de cuánto texto tenga, todos los tips ocupan lo mismo en pantalla.
- Máximo de caracteres por tip: el mismo tope compartido de Familia 2 (ver el sistema, no un número fijado en esta guía). Un tip escrito no es un nombre propio que se lee "como bloque" — si tu frase natural no entra, acortala vos, no hay corrección automática de longitud para bullets.
- Título y CTA: fijos en pantalla, no consumen ventana, mismo límite de campo que 2A.

## Qué NO hacer

### No incumplir la cantidad
Incorrecto: título dice "5 tips" y `items` tiene 4 (o viceversa).

### No devolver nombres de lugar en vez de tips
Incorrecto:
```text
5 tips para Tilcara
1. Casa Colorada
2. Abra de la Cruz
```
Eso es 2A (Listicle), no 2C. Un tip es un consejo accionable, no un punto del recorrido.

### No inventar el dato para forzar el ángulo 1
Incorrecto (si la salida no documenta tramos sin agua): "No hay agua en todo el camino, llevá 3 litros." Si el dato no está, usá ángulo 2.

### No vender
Incorrecto: "Reservá tu lugar", "Últimos cupos", "Escribinos por WhatsApp" — ni en un tip ni en el CTA.

## Checklist de validación
- [ ] ¿El título empieza con la cantidad exacta y nombra el destino real?
- [ ] ¿La cantidad del título coincide exactamente con `items.length`?
- [ ] ¿Cada tip es accionable (algo para hacer o evitar), no una descripción?
- [ ] ¿Cada tip anclado tiene un dato real que lo sostiene en la salida?
- [ ] ¿Ningún tip inventa un dato técnico o de terreno?
- [ ] ¿El CTA es suave, sin dato comercial?
- [ ] ¿Ningún tip repite otro?
- [ ] ¿`tipografia_id` pertenece al catálogo permitido?
