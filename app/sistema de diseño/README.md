# Between — Kit de marca Terreno v1.1

Paquete de entrega para implementar el sistema visual de Between en producto, marketing y contenido estático.

## Fuente de verdad

1. `docs/TERRENO-Sistema-de-Diseno-Between-v1.1.docx`: especificación completa y presentable.
2. `docs/TERRENO.md`: especificación técnica original.
3. `tokens/terreno.css`: variables listas para integrar.

Ante una diferencia entre una pantalla existente y estos documentos, prevalece Terreno v1.1.

## Logo

- Logo primario: `logos/between-wordmark-canonical.svg`.
- Marca contextual: `logos/between-b-contextual-mark.svg`, sólo para carga, favicon, avatar o espacios donde el wordmark no entra.
- El descriptor “Outdoors” no forma parte del logo. Se usa únicamente como posicionamiento de cuenta o texto editorial.
- El símbolo verde/turquesa entrelazado que aparece en partes antiguas de la plataforma es legado y no debe seguir usándose.

El wordmark requiere Bricolage Grotesque 600. Si se usa el SVG como imagen sin cargar esa fuente, el navegador puede sustituirla; para una entrega final de imprenta conviene convertir el texto a contornos desde Figma/Illustrator.

## Tipografías

- Títulos y display: Bricolage Grotesque 400/500/600.
- Cuerpo y UI: Inter 400/500/600.
- Carga web: `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600&family=Inter:wght@400;500;600&display=swap`

No se incluyen archivos de fuente locales porque la implementación canónica de la landing las carga desde Google Fonts.

## Activos incluidos

- `assets/2d/contour.svg`: curvas topográficas de apoyo.
- `assets/2d/noise.svg`: textura mineral muy sutil.
- `assets/3d/montana.glb`: diorama canónico de trekking usado en la landing.
- `ASSET-MANIFEST.md`: inventario de los demás modelos encontrados y criterio de uso.

## Reglas rápidas de aplicación

- Base clara y cálida; evitar fondos oscuros dominantes.
- Cardón es el único acento de interfaz por pantalla.
- Jerarquía tranquila, mucho aire y radios amplios.
- Las piezas 3D identifican el nicho en dos segundos; no son decoración genérica.
- No inventar colores fuera de los tokens.
- No mezclar el catálogo tipográfico de videos con la tipografía de producto.

