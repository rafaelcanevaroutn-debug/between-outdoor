# TERRENO — Sistema de Diseño Between

**v1.1 — Agosto 2026** · *(v1.1: paleta por ecosistema + test de legibilidad; la paleta única de 3 colores para todos los objetos queda derogada)*
Un solo sistema de punta a punta: plataforma, landing, propuestas de venta, redes, templates de contenido. Si una pieza no podría convivir en la misma pantalla que las demás, no es Between.

---

## 1. Idea madre

**Una porción de la Tierra sobre una mesa de estudio.**

Between trae el mundo outdoor —serio, mineral, real— a un espacio limpio, blanco, calmo. No es aventura ruidosa ni juguete amigable: es la maqueta de arquitecto de la montaña. Respeto por el terreno, obsesión por el detalle, silencio alrededor del objeto.

Tres palabras que filtran toda decisión: **mineral, calmo, premium.**
Tres que la descartan: juguete, ruido, genérico.

---

## 2. Color

| Token | Hex | Uso |
|---|---|---|
| `nieve` | `#FAFAF7` | Fondo universal. Nunca blanco puro. |
| `tinta` | `#161915` | Texto principal, botones primarios. |
| `piedra` | `#8B908A` | Texto secundario, iconografía pasiva. |
| `piedra-clara` | `#E4E4DC` | Roca de los objetos 3D, superficies elevadas. |
| `blanco-piedra` | `#F3F2EC` | Nieve de los objetos 3D, tarjetas sobre nieve. |
| `cardón` | `#3E5C48` | ÚNICO acento. Vegetación 3D, links, eyebrows, foco. |
| `cardón-tenue` | `#EDF1EC` | Fondos de acento (badges, avatares, hovers). |
| `línea` | `#E8E9E5` | Bordes, divisores. |

Reglas duras:
- Un solo acento por pantalla. El cardón no compite consigo mismo.
- Prohibidos: azules, saturados, gradientes de fondo, negro puro (#000).
- Las identidades biogeográficas por región (Cardón/Norte, Lenga/Sur, Jarilla/Cuyo) viven en los **templates de contenido de los clientes**, no en la UI de la plataforma. La plataforma es neutra-mineral; el color regional es de ellos.

---

## 3. Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Display | **Bricolage Grotesque** (500–600) | Titulares, wordmark. Tracking -0.02 a -0.03em. |
| Cuerpo | **Inter** (400–600) | Todo lo demás. |
| Eyebrow | Inter 600, 11.5px, uppercase, tracking +0.14em, color cardón | Etiquetas de contexto sobre titulares. |

Escala base: 46 / 30 / 19 / 15 / 13.5 / 11.5. Sin cursivas decorativas; el énfasis dentro de un titular se hace con color `piedra`, no con itálica ni bold.

---

## 4. El objeto 3D (el corazón del sistema)

**Estilo cerrado: punto B–C de la exploración.** Geología expresada solo con planos y pliegues. Ni juguete clay (A), ni maqueta texturada (E–F).

### Línea madre (va en el prompt de TODO objeto nuevo)
> *matte plaster and fine sandstone look, clean faceted planes with defined main ridgelines, no micro-texture — form expressed through planes and folds only*

### Receta completa
- **Materia:** yeso mate / arenisca fina. Cero brillo, cero grano, cero weathering.
- **Forma:** planos facetados limpios + ridgelines/aristas definidas + pliegues grandes. La complejidad está en la silueta, no en la superficie.
- **Base:** corte limpio tipo maqueta de sitio — borde vertical o levemente inclinado que revela la "porción de Tierra".
- **Luz:** difusa de estudio desde arriba-derecha (~45°), sombra suave y tenue debajo. Fondo `nieve`.
- **Cámara:** tres cuartos, levemente elevada (15–20° de picado), objeto centrado, aire generoso.
- **Prohibido:** cartoon, brillo plástico, texturas foto, contornos, colores saturados, cielo/escena de fondo.

### Ecosistemas, no objetos sueltos (v1.1)
Cada nicho se representa con **su ecosistema**: la porción de mundo con los elementos básicos que lo identifican de inmediato. No un símbolo abstracto ni "terreno genérico con algo arriba".

**Test de legibilidad (obligatorio):** tapá todo el texto de la pantalla — ¿un guía del nicho reconoce SU disciplina en el objeto en 2 segundos? Si no, faltan elementos del ecosistema. El minimalismo tiene un piso, y el piso es la legibilidad.

### Color de los ecosistemas (v1.1 — deroga la paleta única)
La paleta de 3 colores para todo quedó derogada: hacía todos los ecosistemas iguales y empujaba al look juguete.

- **Base mineral compartida** (esto es lo que hermana a la familia): fondo `nieve`, base/roca en `piedra-clara`/`blanco-piedra`, materia yeso mate.
- **Cada ecosistema tiene sus propios colores**, los que su mundo pide — con una sola condición: **misma tonalidad Terreno** = apagados, cálidos, empolvados, mate. Nunca saturados, nunca neón, nunca plástico.
- Regla práctica de prompt: *"muted, desaturated, powdery matte tones"* + nombrar los colores reales del mundo del nicho.
- `cardón` sigue siendo el acento de la **UI** (links, eyebrows, botones); los ecosistemas ya no están atados a él.

Paleta orientativa por ecosistema (ajustable al generar):
| Ecosistema | Colores propios (siempre apagados) |
|---|---|
| Trekking | roca gris cálida, nieve, verde cardón |
| Kayak | agua verde-petróleo apagado, casco en color bote real (rojo ladrillo o mostaza empolvados), remo madera clara |
| Cabalgata | marrón cuero apagado, crin oscura, pasto seco |
| Running | camino arena, arco/conos en terracota suave, señalética blanca |
| Ciclismo (MTB) | tierra ocre del circuito, peraltes marcados, bici en un color real apagado |

### Librería de ecosistemas (uno por nicho)
| Nicho | Ecosistema | Estado |
|---|---|---|
| Trekking | Diorama de montaña nevada + variante yungas | Cerrado — en producción |
| Kayak | Porción de río con kayak y remo | Pendiente |
| Cabalgata | Caballo en porción de campo | Pendiente |
| Running | Camino con arco de llegada, línea de salida, conos | Pendiente |
| Ciclismo | Circuito de mountain bike: huella ocre con peraltes y saltos, bici | Pendiente |

**Regla de fábrica:** todo ecosistema nuevo = línea madre (materia/forma) + base mineral + colores propios del nicho en tonalidad Terreno + luz + cámara. Debe pasar el test de legibilidad antes de entrar a la librería. Se genera imagen (grilla si hay dudas) → multi-ángulo → image-to-3D → GLB → materiales ajustados → embed.

### Pipeline técnico
GPT (imágenes multi-ángulo con receta) → Meshy Image-to-3D (topología Quad, polycount medio, **tier pago para uso comercial**) → ajuste en Spline si hace falta suavizar → GLB embebido (three.js / Spline embed). Materiales siempre pisados en código: roughness ~0.9, metalness 0.

---

## 5. UI

- **Composición:** objeto en el centro, contenido en la periferia. La pantalla respira; el 3D es el protagonista único.
- **Superficies:** tarjetas blancas sobre `nieve`, borde `línea` de 1px, radio 18px (999px en pills y botones). Sombras: `0 8px 30px rgba(22,25,21,.05)` en reposo, `0 14px 36px rgba(22,25,21,.16)` en elementos primarios.
- **Botón primario:** `tinta` sobre `nieve`, pill, hover que eleva 2px. Uno solo por pantalla.
- **Navegación:** mínima, texto plano, activo en `tinta`, resto en `piedra`.
- **Motion:** entrada con `sube` (14px + fade, 0.7s, escalonado 0.12s); el objeto 3D rota lento y flota sutil. Nada más se mueve. `prefers-reduced-motion` siempre respetado.
- **Dónde vive el espectáculo:** hero y selector de nichos. Formularios, tablas, calendario y checkout son quietos y directos. Espectáculo arriba, claridad abajo.

---

## 6. Voz

- Argentina, con voseo. Directa, calma, sin exclamaciones.
- Habla del negocio del guía, no de features: "Cargá tu salida. El contenido sale solo." — nunca "automatización con IA".
- Frases canónicas: **"Creá tu próxima salida. El resto lo hacemos juntos."** (plataforma) · **"Tu salida es el contenido."** (landing/ventas).
- Botones dicen lo que hacen: "Crear salida", nunca "Comenzar" ni "Enviar".
- Prohibido el tono "comerciante feliz": sin emojis en UI, sin superlativos vacíos, sin "¡increíble!".

---

## 7. Aplicación por superficie

- **Plataforma:** este documento aplicado tal cual. El objeto del nicho del guía preside la creación de salida.
- **Landing:** mismo sistema. Hero = objeto 3D con piezas de contenido orbitando; secciones de prueba y cierre, quietas. La landing es el primer template: demuestra el producto siendo hermosa.
- **Propuestas de venta / PDFs:** fondo `nieve`, tipografía del sistema, un render del objeto por portada. Serio, sin decoración.
- **Redes de Between:** los renders de la librería son activos de marca listos para publicar.
- **Templates de clientes:** heredan calidad y disciplina, pero llevan la identidad biogeográfica regional del cliente — ahí sí entra el color y el ornamento (Cardón, Lenga, Jarilla).

---

## 8. Gobernanza

1. Nada entra al sistema sin pasar el filtro: ¿es mineral, calmo, premium?
2. Todo objeto nuevo nace de la línea madre. Si hay que "interpretar" el estilo, se vuelve a este documento.
3. Un cambio de token es un cambio de versión de este documento, no una excepción local.
4. Ante la duda, sacar algo (Chanel): menos ruido siempre gana.
