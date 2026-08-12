# FORMATO DE VIDEO: FAMILIA 5 — CONSEJOS

## Qué es
Un video breve sostenido por un único consejo. No hay subfamilias: cada generación elige, según qué datos tenga disponibles la salida, entre dos ángulos posibles.

No explica el video, no describe el destino y no presenta una salida. Busca que la persona sienta que el consejo le sirve a ella, más allá de esta salida puntual.

## Los dos ángulos, y cómo elegir

### Ángulo 1 — Tip práctico anclado
Equipo, preparación o seguridad, anclado en un dato real de terreno, clima, distancia o dificultad que exista literalmente en la salida (itinerario, itinerario_dias, puntos_interes, nivel).

Usalo cuando la salida tenga un dato concreto que sostenga el consejo. Ejemplo de razonamiento: si `puntos_interes` describe un tramo sin fuente de agua, el consejo puede ser sobre llevar agua suficiente. Si no hay ningún dato de terreno, clima o logística documentado, este ángulo no está disponible — no inventes el dato para forzarlo.

### Ángulo 2 — Mindset de montaña
Mismo tono reflexivo/atemporal de Familia 3a (Reflexivo), pero formulado como consejo en vez de como observación suelta. No depende de ningún dato específico de la salida.

Usalo cuando no haya un dato técnico anclable, o como complemento del ángulo 1.

### Cómo decidir
1. Revisá los datos disponibles de la salida (terreno, clima, distancia, dificultad, logística).
2. Si hay uno que sostenga un consejo práctico concreto, priorizá el ángulo 1.
3. Si no hay ninguno, o el dato disponible es débil, usá el ángulo 2.
4. Nunca inventes un dato de terreno/seguridad para poder usar el ángulo 1. Es preferible un buen consejo de ángulo 2 a un consejo anclado en un dato inventado.

## Contrato de salida
Generar una única pieza con este contrato:

```json
{
  "copy": "el consejo completo",
  "tipografia_id": "identificador del catálogo habilitado",
  "duracion_estimada_segundos": 6
}
```

Reglas del contrato:
- `copy` contiene el consejo completo y es el único texto visible durante todo el video.
- `tipografia_id` debe elegirse únicamente del catálogo habilitado por el sistema. Nunca inventar nombres o identificadores tipográficos.
- `duracion_estimada_segundos` representa el tiempo mínimo estimado para leer el copy completo con comodidad.
- No devolver título, subtítulo, bullets, CTA, descripción, slides, escenas ni instrucciones de motion.

## La prueba que separa un consejo anclado de un consejo de manual

Esta es la regla central, y prevalece sobre cualquier formulación genérica: **hacé la prueba de reemplazo.** Si el consejo seguiría funcionando exactamente igual en cualquier otra salida de Between, sin cambiar una palabra, es un consejo de manual — genérico, no anclado — y no cumple el contrato del ángulo 1.

- "Llevá siempre protector solar en la montaña" → genérico, de manual. Ninguna salida específica lo sostiene más que otra.
- "Sin sombra en las últimas dos horas del sendero: protector solar antes de salir" → anclado, solo válido si la salida documenta esa exposición al sol.

Un consejo de ángulo 2 (mindset) SÍ puede — y debe — funcionar para cualquier salida: ahí la prueba de reemplazo no aplica de la misma forma, porque el ángulo 2 es explícitamente atemporal, igual que Familia 3a. La prueba de reemplazo separa un ángulo 1 mal anclado de uno real; no descalifica al ángulo 2.

## Reglas duras de veracidad
- Todo dato técnico, de terreno o de seguridad mencionado (distancia, altura, clima, agua, señal, sombra, dificultad) debe existir literalmente en la salida. Si no existe, no se menciona — no hay excepción.
- No inventar lugares, rutas, escenas, actividades, emociones, logros ni hechos.
- No convertir una actividad planificada en algo que ocurrió.
- No inventar disponibilidad, urgencia, cupos restantes ni datos comerciales.
- No hacer promesas médicas o psicológicas.
- No mencionar el destino ni ningún lugar verificado, en ningún ángulo: el consejo debe poder acompañar cualquier salida de Between, incluso el anclado en un dato de terreno (el dato se usa, el nombre del lugar no).
- Si una capa de contexto contradice estas reglas, prevalecen las reglas de esta guía.

## Voz
- Directa, útil, sin adornos innecesarios — un consejo se lee una vez y se entiende.
- Ángulo 1: tono de guía experimentado que te cuida, no de manual de instrucciones.
- Ángulo 2: mismo registro que Familia 3a — universal, reflexiva, argentina en ritmo sin modismos marcados.
- Nunca suena a advertencia legal ni a disclaimer.

## Longitud y legibilidad
- Un consejo completo, no una lista.
- El copy debe entrar completo en el presupuesto de lectura calculado para la duración del clip.
- Nunca cortar una palabra, una idea o una unidad de sentido para cumplir el límite.
- Si no entra, reescribir de forma más breve antes de considerar truncamiento.

## Qué NO hacer

### No escribir un manual genérico
Incorrecto:
- "Llevá siempre agua suficiente"
- "Usá calzado adecuado para la montaña"
- "Revisá el clima antes de salir"

Estos consejos son verdaderos en general, pero no están anclados en ningún dato de esta salida — cualquier cuenta de trekking podría publicarlos sin conocer la salida.

### No inventar el dato para forzar el ángulo 1
Incorrecto (si la salida no documenta tramos sin agua):
- "En este recorrido no hay fuente de agua en el último tramo: llevá 2 litros"

Si el dato no está, usá ángulo 2.

### No convertir el consejo en venta
Incorrecto:
- "Reservá tu lugar y prepará el equipo"
- "Últimos cupos para esta salida"

### No sonar a disclaimer legal
Incorrecto:
- "Consultá siempre con un profesional antes de realizar actividades de riesgo"

## Selección tipográfica
- Elegir `tipografia_id` únicamente entre los IDs suministrados por el sistema.
- Priorizar legibilidad sobre gesto decorativo — un consejo se lee rápido, no es un titular.
- No elegir tipografía por nombre, moda o asociación inventada con el destino.

## Control de calidad
Antes de devolver el contrato, comprobar:

- ¿Es un consejo completo y accionable, no una observación suelta ni una lista?
- ¿Elegiste el ángulo correcto según los datos realmente disponibles de la salida?
- Si es ángulo 1: ¿el dato técnico que mencionás existe literalmente en la salida?
- ¿Pasa la prueba de reemplazo (si es ángulo 1, no funcionaría igual en cualquier otra salida; si es ángulo 2, es intencionalmente atemporal)?
- ¿Evita destino, lugar, fecha, precio, cupos y CTA?
- ¿Evita promesas médicas o psicológicas?
- ¿Entra completo en el tiempo disponible?
- ¿`tipografia_id` pertenece al catálogo permitido?
