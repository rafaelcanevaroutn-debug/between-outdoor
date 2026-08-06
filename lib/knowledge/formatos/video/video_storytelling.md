# FORMATO DE VIDEO: FAMILIA 2B — STORYTELLING NARRADO SIN PERSONA EN CÁMARA

## Qué es
Un video que desarrolla una única salida, sendero o recorrido mediante una narración breve y progresiva. El texto está escrito para sonar como una persona contando la experiencia en voz alta, aunque en la versión actual aparezca como texto secuencial sobre el video.

La voz existe en el copy, no en una persona frente a cámara. Puede funcionar en primera persona o como relato directo al espectador, siempre con naturalidad oral.

## Objetivo
- Convertir datos reales de un recorrido en una historia fácil de seguir.
- Llevar al espectador desde una apertura concreta hasta el desarrollo de la experiencia.
- Explicar dificultad, duración, salida y llegada sin sonar como una ficha técnica.
- Mantener un tono orgánico durante todo el video.
- Dejar preparada una narración que, en una etapa futura, pueda adaptarse a voz en off o TTS.

## Unidad narrativa
Familia 2b desarrolla una sola salida o sendero.

No enumera múltiples destinos como Familia 2a. Puede mencionar varios hitos únicamente cuando forman parte del mismo recorrido y permiten entender su progresión.

La unidad es:

```text
UNA SALIDA → UN RECORRIDO → UNA PROGRESIÓN NARRATIVA
```

## Advertencia de contrato
Este formato no debería forzarse dentro de un único `copy: string` sin estructura.

La narración contiene unidades con funciones diferentes:

1. apertura;
2. desarrollo secuencial;
3. cierre orgánico opcional.

Por compatibilidad provisional puede serializarse en un solo campo con una unidad por línea:

```json
{
  "copy": "¿Conocías este sendero?\nEl recorrido empieza en [punto verificado].\nSon [duración verificada] de dificultad [nivel verificado].\nTermina en [llegada verificada].",
  "tipografia_id": "identificador del catálogo habilitado",
  "duracion_estimada_segundos": 12
}
```

Ese `copy` representa una secuencia temporal, no un bloque estático ni un párrafo que deba mostrarse completo.

## Contrato recomendado antes de implementar el generador
La implementación debería usar un tipo específico:

```ts
interface GeneratedVideoStorytelling {
  formato: 'video'
  subfamilia: '2b'
  apertura: string
  desarrollo: string[]
  cierre?: string
  tipografia_id: string
  duracion_estimada_segundos: number
}
```

Interpretación:
- `apertura` instala la historia o pregunta.
- `desarrollo` contiene segmentos ordenados que avanzan por el recorrido.
- `cierre` es opcional y nunca debe convertirse automáticamente en CTA comercial.
- La versión completa para pantalla se deriva mediante una serialización determinista.

No fijar el contrato definitivo desde este archivo. Resolverlo al diseñar el generador de Familia 2 junto con los límites temporales por segmento.

## TTS futuro
El copy debe tener oralidad suficiente para una futura voz en off o conversión mediante TTS.

Eso no significa:
- generar audio;
- devolver SSML;
- indicar voces, pausas o emociones sintéticas;
- escribir instrucciones de locución;
- agregar fonética;
- calcular actualmente una pista de audio.

TTS es una capacidad futura y separada. El contrato actual sigue describiendo texto secuencial para video.

## Estructura narrativa

```text
GANCHO O PREGUNTA
→ INICIO DEL RECORRIDO
→ PROGRESIÓN
→ DATO ÚTIL INTEGRADO
→ LLEGADA O CIERRE ORGÁNICO
```

La historia debe avanzar. No alcanza con acomodar datos técnicos en frases consecutivas.

## Apertura
La apertura instala una experiencia específica.

Mecanismos válidos:

### Intención personal

```text
Venía a conocer [lugar real].
```

### Pregunta de descubrimiento

```text
¿Conocías este sendero?
```

### Inicio en situación

```text
La aventura empieza en [punto real].
```

Reglas:
- Una frase breve.
- Debe poder continuarse naturalmente.
- Evitar hooks genéricos intercambiables.
- No adelantar todos los datos.
- No abrir con precio, cupos o una orden de compra.
- No usar superlativos turísticos.
- Si nombra un lugar, debe estar verificado.
- Si usa primera persona, mantener esa perspectiva durante la narración.

## Desarrollo
El desarrollo cuenta el recorrido en su orden lógico.

Puede integrar:
- punto de salida;
- dificultad;
- duración;
- distancia;
- desnivel;
- hitos intermedios;
- tipo de terreno;
- punto de llegada;
- cambio observable durante la experiencia.

Cada dato debe cumplir dos condiciones:

1. estar verificado;
2. ayudar a entender la progresión.

No copiar todos los campos disponibles. Seleccionar solamente los que construyen la historia.

## Cómo integrar datos técnicos
Los datos deben sonar narrados, no pegados desde una ficha.

Ficha técnica:

```text
Dificultad: media. Duración: 3 horas. Inicio: punto A. Fin: punto B.
```

Narración:

```text
Salimos desde [punto A]. El recorrido es de dificultad media y lleva unas 3 horas hasta [punto B].
```

La segunda forma es válida sólo si todos los datos están confirmados.

Reglas:
- No modificar unidades.
- No redondear por cuenta propia.
- No transformar tiempo de marcha en duración total.
- No presentar dificultad como garantía subjetiva.
- No ocultar un dato relevante para hacer el recorrido parecer más fácil.
- No llenar la narración de cifras cuando una secuencia más simple alcanza.

## Progresión lógica
La narración debe respetar la dirección real del recorrido.

Orden recomendado:

1. por qué o cómo empieza;
2. desde dónde se sale;
3. qué caracteriza el trayecto;
4. cuánto exige o cuánto dura;
5. hacia dónde llega;
6. qué deja la experiencia, si existe un cierre.

No alterar el orden de hitos para producir dramatismo.
No convertir dos ubicaciones independientes en origen y destino.
No inventar obstáculos, giros, clima o emociones.

## Cierre
El cierre es opcional.

Puede:
- nombrar la llegada;
- completar la idea de la apertura;
- dejar una observación breve;
- terminar naturalmente en el último dato del recorrido.

Ejemplos de mecanismo:

```text
Y desde ahí, el sendero termina en [llegada real].
```

```text
Así se completa un recorrido de [duración real].
```

No necesita CTA. La ausencia de CTA es válida.

Si se usa uno, debe ser editorial y suave:
- `Guardalo para cuando quieras hacer este recorrido.`
- `Compartilo con quien caminaría este sendero con vos.`

Prohibido cerrar con:
- `Reservá ahora`;
- `Últimos cupos`;
- `Pedime precio`;
- `Escribinos por WhatsApp`;
- urgencia, escasez o presión comercial.

Si la intención central es convocatoria o venta, corresponde Familia 4.

## Voz en off implícita
El copy debe pasar esta prueba:

> ¿Una persona podría decirlo en voz alta de corrido sin sonar como una placa informativa ni como un anuncio?

Reglas:
- Usar frases respirables.
- Mantener conexiones naturales entre segmentos.
- Preferir verbos concretos.
- Evitar enumeraciones mecánicas.
- Evitar sintaxis publicitaria.
- No repetir el nombre del lugar en cada segmento.
- No explicar lo que la imagen ya deja claro.
- Mantener una única perspectiva.
- Usar voseo sólo si coincide con la voz del cliente.

## Perspectiva narrativa
Elegir una perspectiva y sostenerla.

### Primera persona

```text
Venía a conocer...
Arranqué desde...
Después de...
Llegué a...
```

No inventar una experiencia personal atribuida a una persona real. Esta perspectiva sólo es válida cuando la voz de la marca puede asumir el relato o existe experiencia documentada.

### Primera persona plural

```text
Salimos desde...
Seguimos por...
Llegamos a...
```

Usar cuando la salida grupal y la voz de marca lo sostengan.

### Narración directa

```text
El sendero empieza en...
El recorrido sigue por...
Después de...
Termina en...
```

Es la opción más segura cuando no hay experiencia personal confirmada.

No cambiar de `yo` a `nosotros` o a una voz impersonal dentro de la misma pieza.

## Fuente única de verdad
Los datos pueden provenir únicamente de fuentes estructuradas y verificadas:

- `salida.destino`;
- `salida.nombre`;
- `salida.nivel`;
- duración confirmada del recorrido;
- distancia y desnivel estructurados;
- `salida.punto_encuentro`, cuando realmente es el inicio narrado;
- inicio y llegada cargados como tales;
- `salida.itinerario_dias`;
- `salida.puntos_interes`;
- observaciones aprobadas del guía o cliente.

No usar como fuente:

- conocimiento general del modelo;
- ejemplos de este archivo;
- información habitual de otras rutas;
- mapas o estimaciones no incorporados a las fuentes;
- imágenes sin identificación;
- tiempos inferidos por distancia;
- dificultad deducida por el terreno visible;
- opiniones o reseñas externas no verificadas.

## Veracidad estricta
- Dificultad, duración, distancia y desnivel deben coincidir exactamente con la fuente.
- No usar `aproximadamente` para disimular un valor inventado.
- No llamar fácil a una dificultad media.
- No confundir duración de la actividad con duración de la salida.
- No confundir punto de encuentro con inicio del sendero.
- No asumir que el destino general es el punto de llegada.
- No inventar un trayecto entre puntos cargados sin orden.
- No afirmar que se llegó a una cumbre si sólo figura un mirador.
- No narrar clima, nieve, vegetación o fauna sin respaldo.
- No transformar una posibilidad en parte garantizada del recorrido.

Si falta un dato, omitirlo. La narración no necesita cubrir dificultad, tiempo, salida y llegada en todos los casos; necesita ser completa con los datos que sí existen.

## Relación con el material visual
- Cada segmento debe corresponder al tramo mostrado o a una parte verificable del recorrido.
- La secuencia de imágenes debe respetar la secuencia narrativa.
- No rotular un clip con un punto exacto si no está identificado.
- No usar material de otro destino como continuidad.
- No afirmar que una escena representa inicio o llegada sólo por su posición en el video.
- La imagen puede completar ambiente y escala, pero no funciona como fuente factual automática.

## Diferencia con Familia 2a — Listicle

### Familia 2a
- Múltiples lugares o datos equivalentes.
- Título numérico.
- Ítems independientes.
- La cantidad organiza la pieza.
- Cada unidad puede entenderse por separado.

### Familia 2b
- Una sola salida o sendero.
- Gancho narrativo, no necesariamente numérico.
- Segmentos dependientes entre sí.
- La progresión organiza la pieza.
- Cada unidad avanza la misma historia.

Prueba de diferenciación:

> Si se pueden cambiar de orden los segmentos sin alterar el sentido, probablemente es un listicle. En Storytelling 2b, el orden importa.

## Diferencia con carrusel Itinerario
Familia 2b no es un itinerario de carrusel leído sobre video.

### Storytelling 2b
- Una narración continua.
- Texto breve y oral.
- Segmentos temporales dentro de un video.
- Selecciona pocos datos que permiten seguir el recorrido.
- No usa roles de portada, desarrollo y cierre por slides.

### Carrusel Itinerario
- Distribuye jornadas o etapas en múltiples slides.
- Puede desarrollar más información por día.
- El lector controla el ritmo.
- Tiene contrato, límites y jerarquía de carrusel.

No heredar `slides`, `pill_text`, `texto_apoyo`, descripción ni CTA separado.

## Neutralidad comercial
El tono se mantiene orgánico durante todo el video.

Prohibido:
- precio, seña, cupos o disponibilidad como eje;
- urgencia comercial;
- promesas de transformación;
- `lugar maravilloso`;
- `paisaje fantástico`;
- `experiencia increíble`;
- `aventura única`;
- `destino imperdible`;
- `paraíso escondido`;
- `no te lo podés perder`;
- acumulación de adjetivos;
- venta disfrazada de relato.

La palabra `aventura` puede usarse sólo como transición natural y no como sustituto de información.

## Especificidad sin sobreventa
La fuerza debe salir de:
- un punto de inicio real;
- un cambio concreto del recorrido;
- una duración útil;
- una dificultad bien expresada;
- una llegada verificable;
- una observación específica.

No debe salir de:
- superlativos;
- exageración emocional;
- misterio artificial;
- preguntas vacías;
- afirmaciones grandilocuentes.

## Duración y legibilidad
La duración debe calcularse por segmentos y para una lectura con ritmo oral.

Debe contemplar:
- apertura;
- permanencia de cada segmento;
- pausas entre ideas;
- nombres propios;
- cifras y unidades;
- cierre opcional.

Reglas:
- Una idea principal por segmento.
- Una o dos líneas visuales por aparición.
- No mostrar toda la narración simultáneamente.
- No truncar nombres ni datos.
- No acelerar la revelación para incluir información secundaria.
- Reducir segmentos antes que comprimir la lectura.
- El default de cinco segundos de Familia 3 no debe aplicarse automáticamente.
- La estimación futura para TTS deberá considerar palabras por minuto y pausas; no reemplaza la estimación visual actual.

## Ejemplos reales de referencia
Estos ejemplos calibran mecanismo y tono. No autorizan datos ni lugares para otras piezas.

### Fitz Roy

```text
Venía a conocer el Monte Fitz Roy...
[dónde empieza el sendero]
[cómo comienza el recorrido]
[progresión real de la aventura]
```

El valor del ejemplo está en empezar desde una intención personal y avanzar con lógica. Los datos concretos deben obtenerse de la salida correspondiente.

### Sendero contado de forma orgánica

```text
¿Conocías este sendero?
[desde dónde sale]
[dificultad media verificada]
[3 horas de recorrido verificadas]
[hasta dónde llega]
```

La pregunta abre; los datos desarrollan; el último tramo cierra. No hace falta agregar una venta.

## Uso correcto de los ejemplos
Extraer:
- apertura con intención o pregunta;
- oralidad;
- una sola salida;
- progresión geográfica;
- datos integrados en frases;
- cierre sin venta fuerte.

No extraer:
- Fitz Roy;
- dificultad media;
- tres horas;
- origen o llegada;
- primera persona si no está autorizada;
- la palabra `aventura` como fórmula obligatoria.

## Qué NO hacer

### No crear una ficha técnica
Incorrecto:

```text
Dificultad: media.
Duración: 3 horas.
Inicio: A.
Final: B.
```

Correcto:
- Integrar los datos en una progresión narrada.

### No crear un listicle
Incorrecto:

```text
4 cosas sobre este sendero
1. Dificultad
2. Duración
3. Inicio
4. Llegada
```

Correcto:
- Contar el avance de una sola experiencia.

### No inventar una vivencia
Incorrecto:
- `Me quedé sin aire en la subida` sin experiencia documentada.
- `Sentí que tocaba el cielo` como emoción fabricada.

Correcto:
- Usar narración directa o hechos observables.

### No vender agresivamente
Incorrecto:
- `Este lugar maravilloso te espera. Reservá ahora.`
- `Una experiencia fantástica que no te podés perder.`

Correcto:
- Terminar en la llegada o con una observación concreta.

### No mezclar rutas
Incorrecto:
- Tomar el inicio de una salida y la llegada de otra.
- Reordenar hitos para construir suspenso.

Correcto:
- Respetar una única fuente y su orden real.

### No devolver estructura de carrusel
Incorrecto:
- slides;
- portada;
- `pill_text`;
- texto de apoyo;
- descripción de publicación;
- CTA separado de carrusel.

Correcto:
- Segmentos narrativos temporales para un único video.

## Checklist de validación
Antes de aceptar la salida:

- [ ] ¿Desarrolla una sola salida o sendero?
- [ ] ¿La apertura instala una historia concreta?
- [ ] ¿Los segmentos tienen progresión lógica?
- [ ] ¿El orden coincide con el recorrido real?
- [ ] ¿Dificultad, duración, distancia, inicio y llegada están verificados?
- [ ] ¿No se confundió punto de encuentro con inicio del sendero?
- [ ] ¿La perspectiva narrativa se mantiene?
- [ ] ¿Suena natural al leerlo en voz alta?
- [ ] ¿Cada segmento aporta una idea nueva?
- [ ] ¿No hay superlativos ni venta disfrazada?
- [ ] ¿El cierre es orgánico o está correctamente omitido?
- [ ] ¿Cada unidad tiene tiempo suficiente de lectura?
- [ ] ¿La tipografía pertenece al catálogo habilitado?

Si falla progresión, perspectiva o veracidad, rechazar y corregir. No cubrir huecos narrativos con invención ni con entusiasmo publicitario.
