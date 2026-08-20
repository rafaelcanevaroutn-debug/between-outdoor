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
- El logo requerido ocupa como mínimo 11% del ancho y 3,2% del alto; conserva
  proporción y contraste. Un logo menor hace fallar el render estricto.

La imagen y el logo se inyectan como recursos privados autorizados por el
renderer. El HTML almacenado nunca contiene credenciales ni URLs privadas.

Las tandas de renovación visual adjuntan capturas aprobadas como referencias
reales de visión, además de sus descripciones. Son una vara de dirección de
arte, proporción y detalle: el prompt prohíbe copiar su texto o convertirlas en
fondos. Esto evita que una referencia rica se reduzca a una descripción
genérica y que todos los candidatos converjan al mismo layout seguro.

Para los Moldes 2 a 6 el DOM queda bloqueado con todos los slots exactos y
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

`npm run creative:moldes-2-6` prepara las tandas restantes. `-- --execute`
genera direcciones diferenciadas para los Moldes 2 a 6, usando capturas
aprobadas reales y DOM bloqueado. El checkpoint hereda el gasto liquidado de
Molde 1; cambiar de molde o reanudar no reinicia el tope acumulado de USD 2.
La tanda inicial ya terminó: los seis moldes tienen al menos una versión
aprobada con `stress_test_passed=true`. El gasto total liquidado fue USD
0,533557; crear banners en producción no vuelve a llamar a OpenAI.

`npm run creative:audit-stress -- --execute` no usa OpenAI ni cambia el estado
editorial del candidato: guarda el resultado técnico en `stress_test_*`,
carga los candidatos experimentales y vuelve a renderizarlos localmente con
todos los slots presentes y textos cercanos a sus caps. Un candidato que falla
esta auditoría no debe aprobarse; el reporte conserva el ID y el motivo exacto.

Los caps dejan de ser provisorios por versión cuando el HTML real de 1080×1350
supera esta auditoría con la tipografía productiva. Son parte del contrato del
molde aprobado, no una cifra global estimada: cualquier cambio de CSS, fuente o
cap invalida el resultado y obliga a repetir el estrés antes de aprobar.

## Producción desde la biblioteca

El consumidor productivo vive en `production-library.ts`. Selecciona exclusivamente filas
`approved` que además superaron la prueba extrema, revalida contrato/HTML y
adapta el copy neutral sin regenerarlo. Si recibe una `selectionKey` estable
(por ejemplo el UUID de la pieza), distribuye determinísticamente las piezas
entre los moldes aptos: la misma pieza conserva el mismo diseño y una biblioteca
con varias opciones no queda reducida al último aprobado. El
logo legado sólo puede descargarse desde el bucket `logos` del Supabase
configurado, se valida y se convierte a data URL acotado para mantener al
renderer sin acceso de red arbitrario.

Para los seis moldes, Between arma un payload con UUID de plantilla y contenido
neutral, sin HTML, y llama a la cola `POST /api/generar-banner-library`. El
renderer vuelve a consultar `template_library`, exige `status=approved` y
estrés superado, comprueba que molde y contenido coincidan, inyecta foto/logo
privados, renderiza con Puppeteer en modo estricto y sube el PNG a la carpeta
`contenido generado/banners` del Drive del cliente. Between persiste el estado,
expone el PNG mediante un proxy autenticado y permite descargarlo en el panel.

La pantalla de cada salida ofrece `Banner / Flyer` como formato productivo,
permite elegir Molde 1–6 y una foto concreta del banco privado. Molde 4 exige
entre dos y cuatro salidas. La pieza se guarda como `pending_review`: editarla
reconstruye su contrato neutral sin perder iconos o campos opcionales y sólo la
aprobación explícita dispara el renderer.

`scripts/preview-approved-creative-template.ts --execute` comprueba la
reutilización sin IA contra una fila aprobada real, con copy y fotografía
distintos. La primera ejecución de Molde 6 detectó un secundario con contraste
bajo y el renderer incorporó un fallback celeste legible. La prueba productiva
real de Molde 1 cerró después el circuito completo hasta Drive con una foto y
una marca reales.

## Prueba productiva preparada

`npm run banner:e2e -- --salida-id=<uuid> --background-file-id=<drive-id>` hace
un preflight de solo lectura sobre una salida, su foto privada, el copy
determinístico de Molde 3, la plantilla aprobada, la marca y la configuración
del renderer. No inserta contenido ni despacha un render sin `--execute`.

Cuando el worker de Mati esté publicado, agregar `--execute` recorre el circuito
real salida → copy → molde aprobado → foto Drive → renderer → PNG Drive y exige
que la pieza termine en `rendered`. No llama a OpenAI en ningún punto.
