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

Las tandas de renovación visual adjuntan capturas aprobadas como referencias
reales de visión, además de sus descripciones. Son una vara de dirección de
arte, proporción y detalle: el prompt prohíbe copiar su texto o convertirlas en
fondos. Esto evita que una referencia rica se reduzca a una descripción
genérica y que todos los candidatos converjan al mismo layout seguro.

Para los Moldes 2 y 6 el DOM queda bloqueado con todos los slots exactos y
OpenAI diseña únicamente el CSS. Conserva libertad de composición, pero ya no
puede perder, duplicar o renombrar campos. El validador también rechaza
placeholders visibles entre corchetes antes de renderizar.

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

`npm run creative:moldes-2-6` prepara la segunda tanda. `-- --execute` genera
dos direcciones diferenciadas para Molde 2 y dos para Molde 6, usando capturas
aprobadas reales y DOM bloqueado. El checkpoint hereda el gasto liquidado de
Molde 1; cambiar de molde o reanudar no reinicia el tope acumulado de USD 2.

`npm run creative:audit-stress -- --execute` no usa OpenAI ni cambia el estado
editorial del candidato: guarda el resultado técnico en `stress_test_*`,
carga los candidatos experimentales y vuelve a renderizarlos localmente con
todos los slots presentes y textos cercanos a sus caps. Un candidato que falla
esta auditoría no debe aprobarse; el reporte conserva el ID y el motivo exacto.

## Producción desde la biblioteca

El consumidor está preparado en `production-library.ts`, apagado por defecto con
`CREATIVE_TEMPLATE_LIBRARY_PRODUCTION`. Selecciona exclusivamente filas
`approved` que además superaron la prueba extrema, revalida contrato/HTML y
adapta el copy neutral sin regenerarlo. Si recibe una `selectionKey` estable
(por ejemplo el UUID de la pieza), distribuye determinísticamente las piezas
entre los moldes aptos: la misma pieza conserva el mismo diseño y una biblioteca
con varias opciones no queda reducida al último aprobado. El
logo legado sólo puede descargarse desde el bucket `logos` del Supabase
configurado, se valida y se convierte a data URL acotado para mantener al
renderer sin acceso de red arbitrario.

El draft legado sigue marcado `renderer_library_contract_pending`. El contrato
seguro de preview ya está disponible para Moldes 1, 2 y 6: Between arma un
payload con UUID y copy neutral, sin HTML, y llama a
`POST /api/banner/library-preview`. El renderer vuelve a consultar
`template_library`, exige `status=approved` y estrés superado, comprueba que molde y contenido
coincidan y recién entonces arma los slots. El flujo fijo actual continúa
intacto, el feature flag permanece apagado y todavía falta llevar este camino a
la cola final con subida a Drive.
