# Atlas profundo de guardados de Instagram

Este documento amplía la auditoría inicial después de un segundo recorrido visual completo. Se volvió a recorrer la colección desde la primera fila hasta el pie final de Instagram. Se revisaron portadas, videos en movimiento y slides internos de carruseles representativos.

## Alcance confirmado

- Total: 153 referencias.
- Videos: 129 (84,3%).
- Carruseles: 9 (5,9%).
- Posts y flyers: 15 (9,8%).
- Se verificó el final real de la colección: última fila visible y pie de Instagram.

La colección está fuertemente inclinada hacia video corto. No significa que Between deba copiar esa proporción en cada calendario, pero sí que el laboratorio visual de video necesita más variedad interna que el de flyers.

## Hallazgo principal: tres lenguajes que no deben mezclarse

### 1. Premium editorial

- Serif fina o de alto contraste.
- Mayúsculas con bastante aire entre letras.
- Texto pequeño o mediano.
- Ubicación, fecha o nombre del destino.
- Casi nunca usa stroke.
- La foto conserva protagonismo.

Sirve para playa, Caribe, hoteles, destinos aspiracionales, bienvenida y marca personal.

### 2. Social nativo

- Sans bold o semibold.
- Texto blanco con stroke negro fino.
- Frases reconocibles, POV, contraste y humor.
- De una a tres líneas, normalmente centradas.
- Se siente como una persona publicando, no como una agencia diseñando.

Sirve para alcance, memes, objeciones, deseo, amigos, dinero, rutina y conversación.

### 3. Informativo editorial

- Display condensada para el título.
- Sans neutral para la explicación.
- Jerarquías claras: título, desarrollo, conclusión o dato.
- Puede sostener más texto, pero repartido y relacionado con la foto.

Sirve para listas, itinerarios, educación de destino, ficha de experiencia e información comercial.

Una pieza puede mezclar dos familias tipográficas, pero no dos lenguajes visuales completos. Un reel premium no debe recibir un outline de meme. Un POV no necesita una serif de lujo.

## Cuatro modos temporales de video

La tipografía sola no define un template de video. También hay que guardar cómo vive el texto durante el tiempo.

### `fixed_full_clip`

El mismo título permanece durante todo el video mientras cambian los clips.

- Ideal para ubicación, bienvenida, frase viral, salida recurrente y promesa corta.
- Funciona porque el usuario puede entender la pieza en cualquier segundo.
- Recomendado para videos de 6 a 14 segundos.

### `sequenced_by_clip`

Cada corte recibe un título diferente.

- Ideal para listas, itinerarios, lugares y experiencias.
- Cada texto debe corresponder exactamente al material visible.
- Si falta material para un punto, ese punto se elimina o se reemplaza por destino general.

### `intro_then_clean`

El título aparece al inicio y después el material respira sin texto.

- Ideal para contenido aspiracional y escenas muy fuertes.
- El título debe alcanzar a leerse entre 1,5 y 2,5 segundos.
- Puede volver al final como cierre o CTA.

### `clean_with_caption`

El video no lleva texto o sólo una ubicación mínima. Toda la información vive en la descripción.

- Ideal cuando la imagen tiene mucho valor por sí sola.
- No usar si la publicación depende de fecha, precio, horario o punto de encuentro.

## Nuevos formatos descubiertos

Los diez formatos de la auditoría inicial siguen vigentes. El recorrido profundo suma estas variaciones, sin convertirlas en nuevas verticales comerciales.

### Evidencia visual educativa

Portada con una afirmación fuerte; slides internos con título, explicación, conclusión y un dato pequeño.

Ejemplo observado: salud del arrecife explicada a través de señales visibles bajo el agua.

- Compatible con carrusel.
- Requiere fuente verificable.
- La foto demuestra el dato; no es sólo fondo decorativo.
- Puede usar hasta tres jerarquías, nunca un párrafo uniforme.

### Collage de destino

Cada slide combina dos o tres fotos del mismo lugar y un rótulo central.

- Compatible con listas de playas, hoteles o lugares.
- Todas las imágenes del slide deben corresponder al mismo destino.
- No repetir la misma foto dentro del carrusel.
- El nombre del lugar es la única capa obligatoria.

### Contraste cotidiano

Compara la vida habitual con la experiencia del viaje.

Estructuras:

- `No es lo mismo [rutina] que [misma hora en destino]`.
- `Necesito [algo]. El [algo] que necesito:`.
- `Tengo ganas de un plan. El plan:`.

Es social nativo, no reflexivo. Debe ser concreto y visualmente comprobable.

### Ironía económica

El sueldo, las deudas o la irresponsabilidad financiera funcionan como remate humorístico.

- Frecuencia baja.
- Evitar repetir siempre `salario mínimo`, `deudas` o `mi pobreza`.
- Rotar con amigos, horarios, rutina, descanso y decisiones impulsivas.

### Autoridad local

Curiosidad o conocimiento específico explicado con material del lugar.

- Ejemplos: pueblo colgado de la montaña, temporada de ballenas, playa sin sargazo.
- Necesita datos verificados.
- Permite que la marca deje de ser sólo aspiracional y se vuelva útil.

### Sello temporal

Destino y fecha como recuerdo o anticipación: `Cancún, México — 30 de agosto de 2026`.

- No es una fecha comercial salvo que la salida realmente ocurra ese día.
- Puede funcionar como diario de viaje o como fecha confirmada.
- El motor debe distinguir `fecha_estetica` de `fecha_comercial`.

## Arquitecturas de carrusel encontradas

### A. Foto hero + título

- Una fotografía por slide.
- Título grande y bajada opcional.
- Logo pequeño en zona limpia.
- Es el más adaptable al template `main`.

### B. Tres franjas fotográficas

- Dos o tres fotos por slide.
- Nombre del lugar centrado.
- Logo o firma en la parte inferior.
- Es útil cuando un destino necesita variedad visual en un mismo slide.

### C. Educación sobre la foto

- Título superior.
- Explicación en zona limpia.
- Conclusión destacada.
- Microdato al pie.
- Requiere un motor de copy distinto al carrusel aspiracional.

### D. Itinerario secuencial

- Portada: duración + promesa.
- Interior: día, lugar y acción.
- Cierre: CTA o resumen.
- El orden surge del itinerario cargado y del material disponible.

### E. Declaración emocional

- Una frase por slide.
- Fondo fotográfico fuerte.
- Progresión de idea, no cinco sinónimos de la misma frase.
- Uso limitado para evitar monotonía.

## Escala tipográfica por lenguaje

Los porcentajes son relativos al ancho útil de una pieza vertical 9:16 o cuadrada; el renderizador debe adaptarlos a la relación final.

| Perfil | Tamaño aproximado | Líneas | Tracking | Uso |
| --- | --- | --- | --- | --- |
| `geo_luxury_micro` | 2,2–3,4% | 1–2 | alto | Ubicación, país, fecha |
| `welcome_script` | 2,5–4% | 1 | normal | Acento de bienvenida |
| `destination_serif` | 5–9% | 1–2 | medio/alto | Nombre de destino premium |
| `social_native` | 4,5–6,5% | 1–3 | normal | POV, contraste, meme |
| `condensed_editorial` | 7–13% | 1–4 | compacto | Portada, lista, declaración |
| `information_title` | 4,5–7% | 1–3 | compacto | Consejo o evidencia |
| `information_body` | 2,8–4% | 2–6 | normal | Explicación verificada |
| `micro_footer` | 1,8–2,8% | 1–2 | alto | Dato, fuente o cierre |

## Tipografías observadas y equivalentes de Google Fonts

No se pretende identificar archivos exactos de terceros. El objetivo es guardar alternativas reproducibles y compatibles con Between.

### Serif premium

- Cormorant Garamond: destino, país, hotel, fecha.
- Bodoni Moda: lujo, playa y editorial de alto contraste.
- DM Serif Display: títulos premium con mejor legibilidad móvil.
- Cinzel: ubicación monumental o histórica; usar con moderación.
- Crimson Text: bajadas y reflexión.

### Condensadas y display

- Oswald: listas, rótulos de destino y datos directos.
- Bebas Neue: títulos muy cortos y portadas.
- League Gothic: mayor impacto con poco ancho.
- Archivo Narrow: información editorial menos agresiva.
- Lilita One: variante orgánica y amigable para títulos muy cortos.

### Sans sociales

- Poppins: hook limpio y directo.
- IBM Plex Sans: información y subtítulos.
- Inter: apariencia nativa y neutral.
- Montserrat: portada comercial limpia.

### Script de acento

- Allura: bienvenida o una palabra emocional.
- Parisienne: acento premium legible.
- Italianno: gesto más editorial.

Reglas para script:

- Una sola frase corta o una palabra.
- Nunca fechas, precios, itinerarios ni párrafos.
- Nunca combinar dos scripts.
- Debe existir una segunda tipografía más legible.

## Zonas de composición para 9:16

- Zona superior segura: 12–25% de la altura.
- Zona central: 36–58%.
- Zona inferior útil: 64–78%.
- Evitar 0–10% por interfaz y respiración.
- Evitar 80–100% por descripción, audio y controles.
- Margen horizontal mínimo: 7%.

El motor visual debe puntuar cada zona por:

1. cantidad de rostros o sujetos,
2. bordes y detalle,
3. contraste local,
4. movimiento estimado,
5. espacio negativo.

Primero se cambia la zona. Después se ajusta tamaño. El stroke fino es el último recurso. Un overlay general no debe ser la solución automática.

## Logo

- Ancho sugerido: 4–8% de la pieza según complejidad.
- Margen: 4–6%.
- Elegir una esquina limpia por slide o clip.
- Si la marca es personal y no tiene logo, no inventar uno ni dejar un hueco visual.
- En carruseles fotográficos, el logo puede cambiar de esquina entre slides.
- En video social nativo puede omitirse; la identidad también vive en la cuenta y en el tono.

## Emojis

Se detectaron cuatro usos legítimos:

- ubicación: `📍`;
- país: bandera;
- ambiente: playa, palmera, delfín, concha, sol;
- remate: risa, picardía o sorpresa.

Reglas:

- Premium: 0 a 4 emojis pequeños.
- Social nativo: 0 a 3, integrados al remate.
- Información directa: sólo emojis funcionales para fecha, hora, punto de encuentro o precio.
- No aplicar emojis automáticamente a una reflexión seria.

## Contrato que debería recibir el renderizador

Cada pieza debería llegar con estas decisiones ya tomadas:

```json
{
  "visualLanguage": "premium_editorial | native_social | editorial_information",
  "presentationMode": "fixed_full_clip | sequenced_by_clip | intro_then_clean | clean_with_caption",
  "textDensity": "micro | short | medium",
  "fontProfile": "destination_serif",
  "preferredZones": ["center_lower", "top_center"],
  "assetScope": "general | destination | material_slot | exact_experience",
  "strokePolicy": "never | contrast_only",
  "emojiPolicy": "none | geographic | ambient | punchline | functional",
  "logoPolicy": "adaptive | fixed | omit"
}
```

Esto evita que el motor de copy decida diseño y que el renderizador tenga que interpretar intención comercial.

## Reglas anti-repetición adicionales

- No repetir el mismo `presentationMode` en dos videos consecutivos, salvo una campaña intencional.
- No repetir estructura verbal aunque cambie el destino.
- No usar `geo_minimal` más de dos veces por semana para el mismo destino.
- Alternar serif premium, social nativo y contenido útil según objetivo.
- Una misma tipografía puede repetirse; lo que no debe repetirse es la combinación completa de fuente, zona, tamaño y estructura.
- Registrar los últimos hooks, formatos, fotos y experiencias utilizados por cliente y salida.

## Decisiones listas para implementar

1. Mantener los diez esqueletos originales.
2. Agregar `evidence_education` y `destination_collage` como variantes visuales, no como verticales nuevas.
3. Agregar los cuatro modos temporales al contrato de video.
4. Agregar perfiles tipográficos reproducibles con Google Fonts.
5. Distinguir `fecha_estetica` de `fecha_comercial`.
6. Aplicar un bloqueo duro para experiencias sin material específico.
7. Permitir clips limpios cuando el formato y la información lo admitan.
8. Mantener título fijo para información recurrente, ubicación mínima y frases de una idea.

