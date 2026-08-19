# Contrato final de contenido estático

## Formatos

- `banner` y `flyer` son la misma pieza estática individual de feed: **1080×1350**. `flyer` es un nombre comercial, no otro renderer.
- `story` es una biblioteca independiente de **1080×1920**. Puede reutilizar el contenido neutral de un molde, pero nunca una plantilla de feed ni sus caps visuales.
- `carousel_slide` pertenece al motor de carruseles existente. No se selecciona desde la biblioteca de banners.
- `still_image_with_music` no es un formato estático: es un video vertical de **1080×1920**, dura 10 segundos y usa `TemplateStillImageMusic`.

La selección productiva filtra siempre `piece_type`, ancho, alto, molde, estado aprobado y prueba extrema aprobada. Esto impide que una futura Story o una versión en revisión se use como banner por accidente.

## Identidad visual

Terreno (Bricolage Grotesque, Inter, nieve, tinta y cardón) es el sistema de la plataforma Between. Las piezas que Between produce para un cliente usan el logo, colores y tipografías configurados en `brand_identity` de ese cliente. No se aplica Terreno a la comunicación del cliente salvo que Between sea el cliente de esa pieza.

## Moldes de feed habilitados

1. Mínimo: lugar, fecha, copy e ítems.
2. Ficha: lugar, fecha, ficha técnica y CTA.
3. Comercial: precio, reserva, financiación y disponibilidad verificadas.
4. Cronograma: entre 2 y 4 salidas verificadas.
5. Agencia: noches, alojamiento, régimen e incluidos estructurados.
6. Comunidad: mensaje aspiracional y convocatoria.

Los seis moldes requieren al menos una fila `approved` con `stress_test_passed=true` antes de que una pieza pueda aprobarse y despacharse.

## Caps y desborde

Los caps viven en el contrato versionado de cada plantilla. La prueba extrema se ejecuta con los valores máximos y el mismo renderer Puppeteer usado en producción. Tras inyectar foto, logo, fuentes y copy, producción vuelve a renderizar con `strict_layout=true`: si aparece desborde, dimensiones incorrectas o un asset inválido, el render falla y no se publica.

Por lo tanto, un cap no se considera cerrado sólo porque el generador lo cumpla: debe existir además una plantilla aprobada que haya pasado la prueba extrema y el gate estricto productivo.

## Versionado

- Una plantilla nueva se crea con un `template_id` y versión inmutables.
- `draft` y `review` nunca son productivos.
- `approved` sólo es válido si `stress_test_passed=true`.
- Producción elige de forma estable entre las versiones aprobadas compatibles usando el ID de la pieza; no usa azar ni OpenAI.
- Reemplazar visualmente una versión no sobreescribe la anterior: se aprueba una versión nueva y se desactiva o rechaza la vieja durante curaduría.

## Música por tono

El payload usa la key `tono_musical` con uno de estos valores exactos:

- `reflexivo`: pistas de audio ubicadas en la raíz del banco.
- `comico`: carpeta existente `meme` (también se admiten alias `Comico`/`comico`).
- `epico`: carpeta existente `Beats` (también se admiten alias `Epico`/`epico`).

Familia 1a busca voz en `Discursos` o `discursos`; su duración se deriva del audio real. El contenedor `still_image_with_music` siempre dura 10 segundos aunque la pista sea más larga.
