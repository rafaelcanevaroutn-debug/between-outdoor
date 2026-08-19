# Laboratorio creativo de contenido estático

OpenAI crea candidatos HTML/CSS sólo en el laboratorio. Producción reutiliza
únicamente versiones aprobadas y no llama a OpenAI.

`template_library` no reemplaza la tabla `templates`: esta última pertenece a
la Fábrica de composiciones JSON y al editor de Mesa.

## Reglas del molde

- Semver inmutable por combinación `template_id + version`.
- Lienzo explícito; primer formato de banner: 1080×1350.
- Slots únicos mediante `data-slot`.
- Texto con `max_chars`; imagen sin `max_chars`.
- Tipografías y colores exclusivamente mediante los seis branding tokens.
- Sin scripts, handlers, iframes, imports, fuentes o recursos HTTP externos.
- Estados: experimental → approved; rejected/archived no entran en producción.
- Aprobar exige persona y fecha de aprobación.

La imagen y el logo se inyectan como recursos privados autorizados por el
renderer. El HTML almacenado nunca contiene credenciales ni URLs privadas.

## Semillas visuales recuperadas

El primer estudio visual de Caminantes dejó seis piezas útiles: tres direcciones
para El Chaltén y tres para Cancún/Playa del Carmen. Sus HTML originales son
prototipos, no moldes productivos: agrupan tres composiciones por documento,
incluyen copy y rutas de imágenes hardcodeadas, usan una taxonomía de slots
anterior y no respetan todavía los branding tokens canónicos.

Por eso no se importan en `template_library`. Su valor visual se conserva en
`lib/creative-lab/reference-seeds.ts` como un catálogo portable de arquetipos,
jerarquías, tratamiento de imagen, recursos distintivos y antipatrones. El
laboratorio puede seleccionar las semillas compatibles con un molde y pasar el
resultado de `formatCreativeVisualSeedsForPrompt` como `approvedExamples` al
diseñador. OpenAI debe reinterpretar los principios dentro del contrato actual;
nunca copiar el HTML heredado ni sus datos.

Las seis direcciones catalogadas son:

- editorial claro asimétrico;
- cinematográfico oscuro con riel;
- journal modular premium;
- editorial costero luminoso;
- ticket aéreo con riel;
- resort premium por bloques.

Esto mantiene separadas dos bibliotecas: las **referencias creativas**, que
orientan nuevas tandas, y los **moldes aprobados**, que sí pueden renderizarse en
producción.

## OpenAI en el laboratorio

El orquestador usa Responses API con Structured Outputs para recibir candidatos
y una imagen PNG como `input_image` para una única crítica visual. Se configura
con `OPENAI_API_KEY` y `OPENAI_CREATIVE_MODEL`; no existe modelo hardcodeado.
Las llamadas usan `store: false`. La crítica devuelve CSS, nunca HTML, y sólo
puede reemplazar el bloque `style[data-template-css]`.

El presupuesto es acumulativo dentro de una tanda y reserva el peor caso antes
de cada llamada. Variables requeridas:

- `OPENAI_CREATIVE_MODEL`;
- `OPENAI_CREATIVE_BUDGET_USD` (el runner de Molde 1 rechaza valores mayores a 2);
- `OPENAI_CREATIVE_INPUT_USD_PER_1M`;
- `OPENAI_CREATIVE_OUTPUT_USD_PER_1M`.

## Primera tanda de Molde 1

`npm run creative:molde-1` ejecuta solamente un preflight: no llama a OpenAI.
Comprueba renderer local, foto, logo, configuración y migración. La tanda real
requiere el flag explícito `-- --execute`; genera como máximo dos candidatos,
usa un presupuesto compartido, render inicial tolerante, una crítica visual,
render final estricto y persistencia privada del PNG. Ningún candidato queda
aprobado automáticamente.

Mientras el endpoint remoto no esté desplegado, el runner carga directamente el
renderer local del repo de Mati. El endpoint HTTP del laboratorio falla cerrado
si no existe `MATI_SKILL_TOKEN`.
