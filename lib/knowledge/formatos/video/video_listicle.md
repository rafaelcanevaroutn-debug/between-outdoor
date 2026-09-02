# FORMATO DE VIDEO: FAMILIA 2A — LISTICLE DE DESTINOS SECUENCIAL

## Qué es
Un video que presenta una lista breve y ordenada de lugares o datos. Abre con un título numérico, revela los ítems uno por uno sobre el video y termina con un CTA suave de compartir.

No es una frase estática como las piezas de Familia 3. Su unidad narrativa es la secuencia completa: título, ítems ordenados y cierre.

## Objetivo
- Organizar información útil en una secuencia fácil de seguir.
- Generar curiosidad mediante una cantidad concreta.
- Dar visibilidad a varios destinos o datos verificados.
- Sostener la atención con revelaciones sucesivas.
- Favorecer guardados y compartidos sin convertir la pieza en una venta directa.

## Contrato de salida
Familia 2a tiene un contrato tipado propio — no comparte `copy: string` con Familia 3 y Familia 4.

```ts
interface GeneratedVideoListicle {
  formato: 'video'
  subfamilia: '2a'
  titulo: string
  items: string[]
  cta: string
  tipografia_id: string
  duracion_estimada_segundos: number
}
```

Implementado en `lib/generators/video-familia-2.ts`, en producción. `titulo`, `items` y `cta` llegan como campos independientes desde el generador hasta el render — no se serializan como un único string con saltos de línea.

Reglas del contrato:
- `titulo` empieza con la cantidad exacta de `items`.
- `items` es la secuencia de lugares verificados, cada uno una unidad independiente.
- `cta` es un cierre editorial suave, separado de `items`.
- `duracion_estimada_segundos` se calcula a partir de la cantidad de `items` (ver Duración y legibilidad) — no es un valor fijo ni lo decide Gemini.

## Estructura obligatoria

```text
[NÚMERO] + [CATEGORÍA O PROMESA]
[ÍTEM 1]
[ÍTEM 2]
...
[ÍTEM N]
[CTA SUAVE DE COMPARTIR]
```

La cantidad declarada en el título debe coincidir exactamente con la cantidad de ítems.

## Título o gancho
El título empieza con un número arábigo.

Patrones válidos:
- `5 trekkings para hacer en invierno`
- `7 lugares para conocer en [región real]`
- `4 datazos para tu escapada a [destino real]`
- `3 senderos para sumar a tu lista`

Reglas:
- El número debe ser el primer elemento significativo.
- Debe describir con precisión qué se va a enumerar.
- No usar una cantidad mayor que la información verificada disponible.
- No agregar `imperdibles`, `secretos`, `los mejores` o `que nadie conoce` sin sustento.
- No prometer lugares y luego enumerar actividades o consejos.
- No prometer datos y luego listar solamente nombres.
- No usar un número como clickbait si la secuencia no lo cumple.

## Ítems
Cada ítem aparece como una unidad breve y autónoma.

Formato base:

```text
1. Nombre real
```

Formato con un dato:

```text
1. Nombre real — dato verificado
```

Reglas:
- Un nombre de lugar y, como máximo, un dato breve.
- Mantener el orden elegido durante toda la pieza.
- Usar numeración visible cuando ayude a seguir la cuenta.
- No desarrollar párrafos.
- No repetir el título dentro de cada ítem.
- No incluir CTA entre los ítems.
- No mezclar dos lugares en un mismo número para alcanzar artificialmente la cantidad.
- No usar placeholders como `[lugar]`, `[distancia]` o `[dato]` en la salida final.

## Tipos de secuencia

### Variante A — Lista de destinos
Enumera lugares o puntos de interés reales.

```text
5 trekkings para hacer en invierno
1. [trekking verificado]
2. [trekking verificado]
3. [trekking verificado]
4. [trekking verificado]
5. [trekking verificado]
[CTA]
```

Todos los ítems deben pertenecer a la categoría anunciada. Un mirador, una localidad o una ruta vehicular no son automáticamente un trekking.

### Variante B — Lugares dentro de una región
Enumera puntos reales asociados con una provincia, localidad o recorrido.

```text
4 lugares para conocer en [región verificada]
1. [lugar]
2. [lugar]
3. [lugar]
4. [lugar]
[CTA]
```

La pertenencia geográfica debe estar confirmada. No completar región, provincia o cercanía mediante conocimiento general.

### Variante C — Datazos de una escapada
Enumera información breve y útil sobre un destino real.

```text
4 datazos para tu escapada a [destino]
1. [distancia verificada]
2. [temporalidad verificada]
3. [actividad verificada]
4. [dato verificado]
[CTA]
```

Los ítems pueden pertenecer a categorías distintas porque el título promete datos, no destinos. Cada afirmación debe tener una fuente concreta.

## Fuente única de verdad
Los nombres y datos pueden salir únicamente de información estructurada y verificada, por ejemplo:

- `salida.destino`;
- `salida.puntos_interes`;
- lugares presentes en `salida.itinerario_dias`;
- actividades explícitamente cargadas;
- distancias estructuradas o verificadas;
- duración, dificultad o temporada cuando estén confirmadas;
- información editorial aprobada dentro de la knowledge base específica del cliente.

No usar como fuente:

- los ejemplos de este archivo;
- conocimiento geográfico general del modelo;
- cercanía aparente entre lugares;
- texto inferido de imágenes;
- nombres de carpetas ambiguos;
- distancias estimadas;
- actividades típicas de la región;
- afirmaciones promocionales sin respaldo.

Si no hay suficientes ítems verificados para cumplir el número, reducir el número del título. Nunca completar la lista inventando.

## Veracidad de lugares
- Copiar los nombres con la grafía confirmada.
- Conservar tildes, eñes y denominaciones locales.
- No sustituir un destino por una atracción cercana.
- No atribuir un punto de interés a una región sin fuente.
- No renombrar una actividad como trekking si no está clasificada así.
- No duplicar el mismo lugar con dos variantes de nombre.
- No convertir etapas de una misma ruta en destinos distintos salvo que sean puntos de interés independientes y verificados.
- No incluir un lugar sólo porque aparece en los ejemplos.

## Veracidad de distancias y datos
Las distancias requieren origen, destino, unidad y valor confirmados.

Correcto:

```text
A 110 km de [origen verificado]
```

sólo cuando los cuatro elementos están documentados.

Prohibido:
- redondear una distancia por cuenta propia;
- cambiar kilómetros por tiempo de viaje;
- decir `a una hora` sin fuente;
- omitir el origen;
- calcular rutas con conocimiento general;
- afirmar accesibilidad, clima o estado del camino sin datos;
- decir `todo el año` a partir de una observación aislada;
- listar deportes “típicos” que no estén cargados.

Una frase breve sigue siendo una afirmación factual completa.

## Orden de los ítems
El orden debe responder a un criterio reconocible.

Criterios válidos:
- orden del itinerario real;
- cercanía o recorrido, si está estructurado;
- dificultad ascendente, si todos los niveles están verificados;
- prioridad editorial explícita;
- orden curado de puntos de interés;
- progresión temática para datazos.

No afirmar un ranking si no existe un criterio validado. La numeración organiza; no necesariamente clasifica.

Evitar títulos como:
- `Los 5 mejores...`
- `Top 7...`
- `El número 1 te va a sorprender`

salvo que exista una metodología editorial que sostenga ese orden.

## CTA suave
El cierre invita a compartir, guardar o elegir compañía. No debe convertir la pieza en una convocatoria comercial.

Ejemplos de mecanismo:
- `Mandáselo a quien haría estos trekkings con vos.`
- `Guardalo para tu próxima escapada.`
- `¿Cuál sumarías primero?`
- `Compartilo con tu compañero de ruta.`

Reglas:
- Un solo CTA.
- Preferir compartir o guardar.
- Mantener relación directa con la lista.
- No pedir reserva, WhatsApp, MP ni compra.
- No agregar precio, cupos o urgencia.
- No usar `comentá INFO`.
- No prometer enviar información automáticamente.

Si la pieza busca conversión comercial directa, corresponde evaluar Familia 4.

## Diferencia con una lista en carrusel
Familia 2a no es un carrusel trasladado a video.

### Video Listicle — Familia 2a
- Una secuencia temporal dentro de un video.
- Un título, varios ítems y un CTA.
- Cada unidad aparece durante un intervalo.
- El ritmo y la duración condicionan la cantidad.
- Cada ítem es extremadamente breve.
- La imagen acompaña o cambia con cada revelación.

### Carrusel
- Distribuye información en slides navegables.
- El lector controla el ritmo.
- Puede desarrollar cada punto con más texto.
- Usa roles de portada, desarrollo y cierre.
- Puede incorporar `pill_text`, texto de apoyo o CTA separado.

Familia 2a no debe heredar roles de slides ni campos de carrusel. Necesita un contrato secuencial propio.

## Diferencia con Familia 3
Familia 3 sostiene un único copy durante el video. Familia 2a revela varias unidades ordenadas.

Prueba de diferenciación:

> Si todo el texto debe permanecer visible al mismo tiempo para entender la pieza, probablemente no es un listicle secuencial.

En Familia 2a:
- el título instala la promesa;
- cada ítem agrega una unidad;
- la suma completa la promesa;
- el CTA cierra después del último ítem.

## Duración y legibilidad
Implementado como modelo de ventanas fijas, no como cálculo de una frase estática.

Mecanismo real (`lib/generators/video-sequence-limits.ts`):
- Cada ítem: ventana fija de 2.5 segundos en pantalla, uno atrás del otro (`WINDOW_DURATION_SECONDS`).
- Tope de 30 caracteres por ítem (`WINDOW_MAX_CHARACTERS`), confirmado por Mati tras validar la convergencia real. El contenedor envuelve el texto automáticamente hasta 3 líneas si hace falta — el límite es de caracteres, no de líneas.
- `titulo` y `cta` no consumen ventana: quedan fijos en pantalla (título desde el arranque, CTA desde que termina el último ítem), con su propio tope de 30 caracteres (`FIELD_MAX_CHARACTERS`).
- Objetivo y tope duro de 4 ítems (`TARGET_BULLETS`/`MAX_BULLETS`) — la cantidad la calcula el sistema según cuántos lugares verificados hay disponibles para la salida, Gemini no la decide.
- `duracion_estimada_segundos` = (título + ítems + CTA) × 2.5s, clampeado al techo del clip.

Reglas:
- Cada ítem debe poder leerse completo antes del siguiente — la ventana fija ya lo garantiza.
- No truncar nombres ni datos.
- Si un lugar verificado no entra en 30 caracteres, no es candidato para esta pieza — se filtra antes de pedírselo a Gemini, no se trunca después.

## Relación entre texto y material
- Idealmente, cada ítem debe corresponder al tramo o clip mostrado durante su aparición.
- No rotular una imagen con un lugar específico si no está identificada.
- Si el video usa un único fondo, evitar que parezca que todos los lugares son el mismo.
- No presentar imágenes genéricas como evidencia de distancias, clima o actividades.
- El orden visual debe coincidir con el orden textual.
- No reutilizar un clip para dos lugares distintos sin aclaración.

## Emoji y pin de ubicación
Dos cosas distintas, no confundir.

Pin de ubicación (📍): estructural, no decorativo. Opcional en cada ítem, igual que en 3e. Marca el lugar, no adorna — por eso no cuenta contra el límite de emoji decorativo.

Emoji decorativo: opcional únicamente en el CTA, nunca en título ni ítems.

Puede usarse (decorativo, solo CTA) cuando:
- refuerza la invitación a compartir, guardar o elegir;
- aparece al final del CTA;
- el catálogo visual lo permite;
- mantiene la pieza limpia y legible.

No usarlo:
- como adorno en título o ítems — son informativos, nombran lugares reales; ahí solo entra el 📍 estructural, nada más;
- si el CTA ya funciona sin él — nunca forzarlo;
- más de uno por pieza;
- combinado con otro emoji decorativo;
- como sustituto de una palabra del CTA;
- si el renderer no garantiza el glifo.

## Ejemplos reales de referencia
Estos ejemplos calibran título, cantidad y mecanismo. Los lugares y datos no forman un catálogo reutilizable.

### Lista de trekkings

```text
5 trekkings para hacer en invierno
Ojo del Albino
Cerro Mogote
Salinas Grandes de Córdoba
...
```

La observación confirma el mecanismo secuencial, no autoriza completar los ítems faltantes ni valida que todos esos lugares pertenezcan a cualquier salida.

### Lista regional

```text
7 lugares imperdibles en Mendoza
Potrerillos
Puente del Inca
...
```

`Imperdibles` pertenece al ejemplo observado. No adoptarlo como regla ni como superlativo predeterminado.

### Datazos

```text
4 datazos para tu escapada a Tafí del Valle
A 110 km de Tucumán
Se puede visitar durante todo el año
[deportes verificados]
[dato verificado]
Mandáselo a un amigo
```

Cada dato del ejemplo requiere verificación independiente antes de reutilizarse.

## Uso correcto de los ejemplos
Extraer:
- número al comienzo;
- categoría clara;
- revelación secuencial;
- ítems breves;
- un dato como máximo por ítem;
- CTA suave final.

No extraer:
- número de ítems si no hay material suficiente;
- nombres de destinos;
- distancias;
- temporalidad;
- actividades;
- pertenencia geográfica;
- afirmaciones como `imperdible`.

## Qué NO hacer

### No incumplir la cantidad
Incorrecto:

```text
5 lugares para conocer
1. Lugar A
2. Lugar B
3. Lugar C
```

Correcto:
- Generar cinco ítems verificados o cambiar el título a tres.

### No escribir un párrafo
Incorrecto:

```text
Estos son cinco lugares que podés conocer durante el invierno y que ofrecen paisajes...
```

Correcto:
- Título breve seguido de unidades separadas.

### No inventar para completar
Incorrecto:
- Agregar destinos conocidos de la provincia que no figuran en las fuentes.
- Deducir una distancia mediante conocimiento general.
- Afirmar deportes habituales sin registro.

Correcto:
- Reducir la cantidad o declarar la pieza no elegible.

### No mezclar categorías
Incorrecto:

```text
4 trekkings
1. Un sendero
2. Una ciudad
3. Un restaurante
4. Una ruta
```

Correcto:
- Todos los ítems responden a la categoría del título.

### No vender
Incorrecto:
- `Reservá por WhatsApp.`
- `Últimos cupos.`
- `Desde $...`

Correcto:
- CTA de compartir, guardar o elegir.

### No devolver estructura de carrusel
Incorrecto:
- `slides`;
- `pill_text`;
- `texto_apoyo`;
- portada y cierre como roles;
- descripción del post.

Correcto:
- Una secuencia temporal tipada para video.

## Checklist de validación
Antes de aceptar la salida:

- [ ] ¿El título empieza con un número?
- [ ] ¿La categoría anunciada coincide con todos los ítems?
- [ ] ¿La cantidad del título coincide exactamente con `items.length`?
- [ ] ¿Cada ítem contiene un lugar y como máximo un dato breve?
- [ ] ¿Todos los nombres provienen de fuentes verificadas?
- [ ] ¿Distancias, temporalidad y actividades tienen fuente explícita?
- [ ] ¿No se completó la lista con conocimiento general?
- [ ] ¿El orden es consistente y no se presenta como ranking inventado?
- [ ] ¿El CTA es suave y aparece después del último ítem?
- [ ] ¿Cada unidad tiene tiempo suficiente de lectura?
- [ ] ¿`titulo`, `items` y `cta` llegan como campos independientes del contrato tipado?
- [ ] ¿La tipografía pertenece al catálogo habilitado?

Si falla cantidad, pertenencia, factualidad u orden, rechazar y corregir. No sacrificar veracidad para sostener un número atractivo.
