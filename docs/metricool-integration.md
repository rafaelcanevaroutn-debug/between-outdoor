# Integración Metricool — contrato inicial

Estado: preparación segura, sin credenciales y sin publicaciones externas.

## Decisión

Between debe usar la API HTTP de Metricool para sincronizar el calendario y,
en una fase posterior, crear borradores programados. El MCP de Metricool sirve
para interacción conversacional; no es el contrato adecuado para una integración
determinística del producto.

Fuentes oficiales verificadas el 19 de agosto de 2026:

- Documentación OpenAPI: https://app.metricool.com/resources/apidocs/index.html
- Guía de acceso: https://help.metricool.com/api-access-export-your-metricool-data-to-other-tools-and-automate-tasks-x8ln5
- Errores y multimedia: https://help.metricool.com/common-questions-and-errors-when-using-the-api-8x9nq

## Contrato confirmado

- Base: `https://app.metricool.com/api`.
- Autenticación: token en `X-Mc-Auth`; nunca en URL ni logs.
- Toda llamada lleva `userId` y `blogId`.
- La API requiere un plan Advanced o Custom.
- Lectura del calendario: `GET /v2/scheduler/posts` con `start`, `end` y
  `timezone`.
- Creación: `POST /v2/scheduler/posts`, con `text`, `providers` y
  `publicationDate` obligatorios.
- Las imágenes deben ser públicas y no expirar; antes de programar se
  normalizan en Metricool. Esto no coincide con los PNG privados actuales de
  Between, por lo que hace falta un puente de entrega temporal y revocable.

## Fases

1. **Lectura (implementada, sin conectar):** cliente con credenciales por
   entorno, rango explícito y validación fail-closed.
2. **Mapeo de marcas:** guardar por cliente `Metricool userId/blogId` y redes
   conectadas, sin compartir el token con el navegador.
3. **Composición del calendario:** contrastar el calendario semanal de Between
   con los slots ya ocupados en Metricool.
4. **Borradores solamente:** subir multimedia y crear posts con `draft=true`,
   siempre después de aprobación humana en Between.
5. **Publicación automática:** fuera de alcance hasta validar permisos,
   idempotencia, reintentos y una autorización explícita de producto.

## Guardarraíles

- El navegador nunca recibe `METRICOOL_API_TOKEN`.
- Ninguna generación de contenido publica por sí sola.
- Una pieza necesita aprobación y render final antes de salir de Between.
- Cada envío tendrá una clave idempotente persistida antes de llamar a Metricool.
- No se implementa `POST` hasta resolver el puente de medios privados y probar
  primero contra borradores.
