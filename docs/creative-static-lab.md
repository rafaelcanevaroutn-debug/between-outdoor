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

## OpenAI en el laboratorio

El orquestador usa Responses API con Structured Outputs para recibir candidatos
y una imagen PNG como `input_image` para una única crítica visual. Se configura
con `OPENAI_API_KEY` y `OPENAI_CREATIVE_MODEL`; no existe modelo hardcodeado.
Las llamadas usan `store: false`. La crítica devuelve CSS, nunca HTML, y sólo
puede reemplazar el bloque `style[data-template-css]`.
