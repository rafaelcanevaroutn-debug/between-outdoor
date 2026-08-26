# Integración Metricool — contrato inicial

Estado: backend de integración implementado; faltan credenciales, dominio público
y aplicar la migración `030_metricool_publications.sql`. Ninguna publicación se
envía automáticamente.

## Decisión

Between debe usar la API HTTP de Metricool para sincronizar el calendario y,
en una fase posterior, crear borradores programados. El MCP de Metricool sirve
para interacción conversacional; no es el contrato adecuado para una integración
determinística del producto.

Fuentes oficiales verificadas el 25 de agosto de 2026:

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
4. **Borradores solamente (backend implementado):** normalizar multimedia y
   crear posts con `draft=true`, siempre después de aprobación humana en Between.
5. **Publicación automática:** fuera de alcance hasta validar permisos,
   idempotencia, reintentos y una autorización explícita de producto.

## Guardarraíles

- El navegador nunca recibe `METRICOOL_API_TOKEN`.
- Ninguna generación de contenido publica por sí sola.
- Una pieza necesita aprobación y render final antes de salir de Between.
- Cada envío tendrá una clave idempotente persistida antes de llamar a Metricool.
- El `POST` crea únicamente borradores y usa el puente firmado de medios; la
  autopublicación permanece bloqueada hasta completar las pruebas con credenciales reales.

## Implementación disponible

- `GET /api/metricool/status`: indica si el cliente y el entorno están listos.
- `GET /api/metricool/calendar`: lee el calendario remoto para detectar horarios ocupados.
- `POST /api/metricool/drafts`: crea un borrador idempotente; nunca autopublica.
- `GET /api/metricool/publications`: lista el estado local.
- `POST /api/metricool/publications`: reconcilia borrador/programado/publicado/error.
- `GET /api/metricool/media/:contentId/:index`: puente público firmado para los
  renders privados de Drive. Metricool lo normaliza antes de crear el borrador.
- `POST /api/admin/clientes/metricool`: configura y verifica `userId/blogId` por cliente.

## Configuración pendiente

Variables de servidor — nunca prefijarlas con `NEXT_PUBLIC_`:

```env
METRICOOL_API_TOKEN=...
METRICOOL_MEDIA_SIGNING_SECRET=... # mínimo 32 caracteres aleatorios
BETWEEN_PUBLIC_APP_URL=https://app.between.example
```

Por cada cliente, el admin debe registrar:

- `metricoolUserId`;
- `blogId` de la marca;
- zona horaria IANA;
- redes habilitadas (`instagram`, `facebook`, `tiktok`).

Antes de conectar la UI hay que aplicar `supabase/migrations/030_metricool_publications.sql`.
