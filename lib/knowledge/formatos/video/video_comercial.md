# FORMATO DE VIDEO: FAMILIA 4 — COMERCIAL / CONVOCATORIA

## Qué es
Un video de convocatoria que convierte una salida real en una invitación concreta. El copy nombra el destino o la actividad, incorpora al menos un dato comercial verificable y le dice a la audiencia qué acción realizar.

Es el único formato de video del catálogo actual donde precio, fecha, cupos o condiciones de venta pueden ocupar el centro de la pieza. No disimula la intención comercial: convoca con una voz humana, directa y específica.

## Objetivo
- Conseguir consultas, mensajes, reservas o compartidos con intención concreta.
- Presentar una salida real mediante un dato duro relevante.
- Hacer que la convocatoria suene personal, no institucional.
- Reducir la distancia entre “me interesa” y una acción clara.
- Comunicar oportunidad sin fabricar urgencia.

## Contrato de salida
Generar una única pieza con este contrato:

```json
{
  "copy": "Convocatoria principal con CTA concreto",
  "dato_duro": "Precio, fecha o cupos verificados",
  "tipografia_id": "identificador del catálogo habilitado",
  "duracion_estimada_segundos": 5
}
```

Reglas del contrato:
- `copy` contiene la convocatoria principal y un CTA concreto; no repite precio, fecha ni cupos.
- `dato_duro` contiene un único precio, fecha o cantidad de cupos verificados para mostrarse en grande.
- `tipografia_id` debe elegirse únicamente del catálogo habilitado por el sistema. Nunca inventar nombres o identificadores tipográficos.
- `duracion_estimada_segundos` representa el tiempo mínimo estimado para leer `copy` y `dato_duro` con comodidad.
- No devolver caption, descripción, slides, escenas ni instrucciones de motion.
- `copy` y `dato_duro` son dos bloques del mismo video y deben respetar juntos el presupuesto de lectura.

## Regla central
La Familia 4 necesita tres componentes distribuidos en dos campos:

```text
CONVOCATORIA + DATO DURO VERIFICADO + CTA CONCRETO
```

- `copy` reúne CONVOCATORIA + CTA CONCRETO.
- `dato_duro` contiene solamente el DATO DURO VERIFICADO.

Ejemplo de mecanismo:

```text
Este sábado vamos a [destino real].
¿Te sumás? Escribinos por WhatsApp.
```

Una frase atractiva sin dato duro no alcanza. Un aviso con precio pero sin convocatoria no alcanza. Una convocatoria que termina sin acción concreta tampoco alcanza.

## Dato duro obligatorio
A diferencia de toda la Familia 3, acá el dato duro es central y obligatorio.

La pieza debe incluir por lo menos uno de estos datos, siempre tomado de la salida real:

- fecha o referencia temporal verificable;
- precio real;
- cupos reales o tamaño confirmado del grupo;
- destino real;
- actividad real;
- prestación incluida de manera explícita;
- punto y hora de salida confirmados.

El destino o la actividad identifican la propuesta, pero no sustituyen por sí solos un dato comercial cuando la salida dispone de fecha, precio o cupos. Priorizar el dato que mejor permita actuar.

No inventar un dato para completar la estructura. Si no existe ningún dato duro comercial verificado, la Familia 4 no es elegible.

## Jerarquía de fuentes
Usar únicamente datos estructurados y confirmados de la salida:

- `salida.destino`;
- `salida.nombre`, cuando identifica fielmente la experiencia;
- `salida.fecha_inicio` y `salida.fecha_fin`;
- `salida.precio_usd` junto con su moneda real;
- `salida.cupos`;
- `salida.que_incluye`;
- `salida.punto_encuentro`;
- `salida.hora_encuentro`;
- `salida.link_inscripcion`;
- un canal comercial configurado y habilitado para el cliente.

No usar como fuente:

- los ejemplos de este archivo;
- conocimiento general del modelo;
- precios habituales o estimados;
- fechas inferidas por el nombre de un feriado;
- cupos supuestos por el tipo de actividad;
- teléfonos, enlaces o usuarios sociales no entregados;
- prestaciones que suelen incluir otras salidas;
- información de una edición anterior del mismo viaje.

## Veracidad comercial estricta
Un dato falso en Familia 4 puede producir una compra o una consulta bajo condiciones incorrectas. Por eso, la fidelidad comercial tiene prioridad sobre tono, persuasión y fluidez.

Reglas duras:
- Copiar precio, moneda, fecha y cupos sin modificarlos.
- No redondear ni convertir monedas.
- No presentar la seña como precio total.
- No sumar impuestos, cuotas, descuentos o financiación no documentados.
- No decir `todo incluido` salvo que la fuente lo afirme literalmente y no existan exclusiones relevantes que vuelvan engañosa la frase.
- No convertir cupos totales en cupos disponibles.
- No afirmar `últimos lugares` sin disponibilidad actual confirmada.
- No decir `mañana`, `este sábado`, `este finde` o `Semana Santa` sin resolverlo contra la fecha real y la fecha de publicación prevista.
- No inventar punto de encuentro, horario ni medio de transporte.
- No prometer respuesta por un canal que el cliente no tenga configurado.
- No publicar un teléfono o enlace como texto si no fue suministrado y validado.
- No mezclar datos de salidas diferentes.

Ante cualquier contradicción entre una frase más vendedora y el dato real, conservar el dato real.

## Referencias temporales
Las expresiones relativas son válidas sólo cuando el sistema conoce la fecha de publicación.

Ejemplos:
- `mañana`;
- `este sábado`;
- `este finde`;
- `la semana que viene`;
- `Semana Santa`.

Reglas:
- Verificar que la referencia relativa coincida exactamente con `salida.fecha_inicio`.
- Si no existe fecha prevista de publicación, usar la fecha absoluta.
- Incluir día y mes cuando reduzca ambigüedad.
- Incluir año cuando la salida no pertenece al ciclo temporal inmediato.
- No llamar feriado a una fecha sin validarla contra el calendario correspondiente.
- No usar una fecha pasada.

## Voz de convocatoria
La invitación debe sonar como una persona convocando a otras personas.

Verbos y formas válidas:
- `busco` / `buscamos`;
- `te invito` / `los invito`;
- `vamos`;
- `¿te sumás?`;
- `¿quién se apunta?`;
- `venite`;
- `acompañanos`;
- `armamos grupo`.

Reglas:
- Preferir primera persona singular o plural según la voz real de la marca.
- Mantener voseo si corresponde al cliente.
- Ser directo y cálido.
- Evitar lenguaje corporativo: `adquiera`, `consulte disponibilidad`, `servicio premium`.
- Evitar impostar amistad: no llamar `amigos` a la audiencia si la voz de la marca no lo sostiene.
- No acumular varios verbos de convocatoria.
- No usar presión, culpa o miedo a quedarse afuera.

## CTA concreto
La pieza cierra con una acción específica. El CTA no debe ser el cierre genérico de un carrusel.

CTAs válidos cuando el canal está disponible:
- `Escribinos por WhatsApp.`
- `Pedime la info por MP.`
- `Mandanos “TAFÍ” y te pasamos los detalles.`
- `Enviáselo a quien vendría con vos.`
- `Reservá desde el link.`
- `Respondé “me sumo”.`

Reglas:
- Elegir una sola acción principal.
- Usar únicamente canales configurados.
- Si el CTA requiere una palabra clave, debe estar definida en la pieza.
- Si pide compartir, indicar con quién o para qué.
- No cerrar solamente con `más info`, `consultanos` o `link en bio` si existe una acción más precisa.
- No afirmar que se enviará información por MP automáticamente si esa automatización no existe.
- No usar `reservá ahora` cuando el enlace o flujo de reserva no está disponible.

## Estructuras válidas

### Variante A — Convocatoria breve
Destino o actividad, dato temporal y pregunta de adhesión.

```text
copy: "Vamos a [destino real]. ¿Te sumás? Escribinos por WhatsApp."
dato_duro: "[fecha real]"
```

### Variante B — Búsqueda de grupo
Convoca a una audiencia o grupo concreto y comunica cupos o fecha.

```text
copy: "Buscamos personas para [actividad real]. Pedime la info por MP."
dato_duro: "[cantidad real] cupos"
```

No inventar segmentaciones como `tucumanos`, familias, parejas o principiantes salvo que la convocatoria real las defina.

### Variante C — Precio protagonista
Presenta destino y precio real, seguido por una acción.

```text
copy: "[Destino real]. Escribinos por WhatsApp."
dato_duro: "[moneda y precio reales]"
```

El precio debe poder entenderse: aclarar por persona, total, desde o seña sólo cuando esa condición esté confirmada.

### Variante D — Fecha especial
Usa un feriado, fin de semana o temporada verificados.

```text
copy: "[Destino real]. ¿Quién se suma? Pedinos la info por MP."
dato_duro: "[Feriado o fecha real]"
```

La oportunidad temporal no habilita urgencia falsa.

### Variante E — Pregunta tipo WhatsApp
Simula una propuesta breve y reconocible.

```text
copy: "¿Y si nos escapamos a [destino real]? Mandáselo a quien vendría con vos."
dato_duro: "[fecha real]"
```

Es una sola voz proponiendo un plan. No inventar una conversación completa ni presentar capturas o respuestas ficticias como testimonios.

### Variante F — Información secuencial
Distribuye convocatoria, un dato protagonista y CTA en dos bloques dentro del mismo video.

```text
copy: "[Destino real]. [CTA concreto]"
dato_duro: "[Fecha, precio o cupos reales]"
```

El renderer recibe `copy` como título y `dato_duro` como subtítulo destacado. Ambos deben respetar el presupuesto total de lectura.

## Comparación de precio
La comparación puede ser una técnica de venta, pero exige dos referencias verificables.

Se permite:
- comparar con otra opción cuyo precio y alcance estén cargados;
- mostrar ahorro absoluto o porcentual calculado correctamente;
- contrastar precio total y prestaciones equivalentes;
- explicar qué incluye el precio real.

Se prohíbe:
- inventar el precio de mercado;
- afirmar `más barato que...` sin fuente;
- comparar servicios con alcances diferentes sin aclararlo;
- usar precios desactualizados;
- tachar un precio anterior que nunca estuvo vigente;
- presentar una seña como descuento;
- usar `desde` para ocultar el precio aplicable.

Si no existe una comparación verificable, mostrar solamente el precio real.

## Qué incluye
Puede mencionarse una prestación cuando ayuda a entender el valor.

Reglas:
- Elegir una o dos inclusiones decisivas, no copiar una lista completa.
- Reproducir solamente lo documentado.
- No resumir varias prestaciones como `todo incluido` salvo confirmación expresa y precisa.
- No sugerir hospedaje, comidas, traslados, guía o seguro por costumbre del rubro.
- No omitir una condición esencial que vuelva engañoso el precio.
- Si la lista no entra en el clip, priorizar CTA y dato principal; el detalle puede vivir fuera de esta pieza.

## Longitud y legibilidad
- El copy debe entrar en el presupuesto calculado según la duración real del clip.
- El default técnico de cinco segundos es sólo un placeholder; no obliga a comprimir una oferta compleja de forma ilegible.
- Mantener un máximo de dos líneas cuando la pieza sea simultánea.
- Cuando los datos aparezcan en secuencia, cada bloque debe tener tiempo suficiente de lectura.
- No reducir la claridad factual para cumplir un límite.
- No truncar precios, fechas, nombres, teléfonos ni CTA.
- Si la información no entra, elegir menos datos o usar un clip más largo.
- Un itinerario día por día sólo es válido si la duración permite leerlo; nunca condensarlo hasta volverlo ambiguo.

## Relación entre copy y video
- El material debe corresponder al destino o actividad ofrecidos.
- No usar imágenes de otra edición o lugar si pueden inducir a error.
- No afirmar una prestación mediante imágenes genéricas.
- Si aparece hospedaje, transporte o comida, eso no prueba que estén incluidos.
- El video puede crear deseo; el copy debe mantener la precisión.
- La secuencia visual no puede ocultar condiciones esenciales.

## Emoji en copy
Un emoji es opcional únicamente dentro de copy (convocatoria/CTA), nunca en dato_duro.

Puede usarse cuando:
- refuerza la convocatoria o el CTA sin restarle claridad;
- aparece al final de copy;
- el catálogo visual lo permite;
- mantiene la pieza limpia y legible.

No usarlo:
- en dato_duro, bajo ninguna circunstancia — es el dato que mejor convierte de todo el catálogo, un emoji ahí es ruido visual que arriesga esa conversión, no una decoración;
- si copy ya funciona sin él — nunca forzarlo;
- más de uno por pieza;
- combinado con otro emoji;
- como sustituto de una palabra de la convocatoria o el CTA;
- si el renderer no garantiza el glifo.

## Ejemplos reales de referencia
Estos ejemplos calibran mecanismo, tono y densidad. No son fuentes de datos y no deben copiarse para otra salida.

- "Busco tucumanos para venir a Tafí del Valle"
- "Busco amigos que se sumen a esta salida"
- "Los invito mañana a un trekking en los funiculares, salimos desde Plaza Independencia, te paso info por MP"
- "Buscamos un grupo de 6-7 amigos, salimos el 11 de julio, todo incluido"
- "Este sábado vamos a Villa Padre Mondi, ¿te sumás?"
- "Cabalgata con amigos en la Patagonia 2027"
- "Semana Santa en Tafí del Valle"
- "Te traemos a Tafí del Valle por $158.000"
- "El Chaltén, $250.000"
- "¿Quién se apunta?"
- "¿Y si nos escapamos a Tafí del Valle este finde?"

Algunos ejemplos observados no contienen por sí solos los tres componentes requeridos. Funcionan como calibración parcial y deben completarse con dato duro y CTA verificados al generar una pieza nueva.

## Uso correcto de los ejemplos
Extraer:
- convocatoria personal;
- dato concreto;
- brevedad;
- destino visible;
- cierre accionable;
- posibilidad de revelar información en secuencia.

No extraer:
- destinos;
- fechas;
- precios;
- cupos;
- puntos de encuentro;
- prestaciones;
- teléfonos;
- canales de contacto.

Los ejemplos nunca autorizan a reutilizar `$158.000`, `$250.000`, `11 de julio`, `6-7 amigos`, `Plaza Independencia` ni ningún otro dato en una salida distinta.

## Qué NO hacer

### No inventar urgencia
Incorrecto:
- "Últimos cupos para este sábado."
- "Se agota hoy."

Correcto:
- Comunicar cupos o cierre sólo cuando estén actualizados y confirmados.

### No fabricar una oferta
Incorrecto:
- "Antes $300.000, hoy $158.000."
- "Dos por uno por tiempo limitado."

Correcto:
- Usar únicamente precio y promoción vigentes en la fuente.

### No reemplazar precisión por entusiasmo
Incorrecto:
- "Todo incluido para que no te preocupes por nada."
- "La mejor escapada al precio más bajo."

Correcto:
- Nombrar prestaciones verificadas sin absolutos.

### No usar un CTA inexistente
Incorrecto:
- "Escribinos al WhatsApp de pantalla" sin número configurado.
- "Reservá en el link" sin enlace disponible.

Correcto:
- Elegir un canal real o declarar la pieza no elegible hasta tenerlo.

### No copiar un mini carrusel
Incorrecto:
- desarrollar portada, itinerario, inclusiones, precio y cierre como si fueran slides;
- agregar campos distintos de `copy` y `dato_duro` para fragmentar un mini carrusel;
- generar una descripción adicional.

Correcto:
- Dos bloques breves: `copy` para convocatoria + CTA y `dato_duro` para el dato destacado.

### No convertir la pieza en Familia 3
Incorrecto:
- una reflexión atemporal sin fecha, precio ni cupos;
- un POV sin acción;
- un meme que menciona la salida pero no convoca;
- solamente el nombre del lugar.

Correcto:
- Convocatoria explícita, dato real y CTA concreto.

## Checklist de validación
Antes de aceptar la salida:

- [ ] ¿Hay un verbo o pregunta de convocatoria?
- [ ] ¿`dato_duro` contiene al menos un dato comercial verificable?
- [ ] ¿El destino o actividad corresponden a la salida real?
- [ ] ¿Precio, moneda, fecha y cupos coinciden exactamente con la fuente?
- [ ] ¿Las referencias `mañana`, `este sábado` o `este finde` fueron resueltas contra la fecha de publicación?
- [ ] ¿No se confundió seña con precio total ni cupos totales con disponibles?
- [ ] ¿No se inventaron inclusiones, descuentos, urgencia o comparación?
- [ ] ¿El CTA pide una acción concreta?
- [ ] ¿El canal del CTA está configurado?
- [ ] ¿`copy` evita repetir el dato que ya aparece en `dato_duro`?
- [ ] ¿`copy` y `dato_duro` entran juntos y legibles en la duración disponible?
- [ ] ¿La tipografía pertenece al catálogo habilitado?

Si falla veracidad, canal de acción o legibilidad, rechazar la pieza y corregirla. No compensar un dato dudoso con una frase más persuasiva.
