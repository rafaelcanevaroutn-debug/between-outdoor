# Zernio en Between

Zernio es el proveedor inicial de publicación social. La API key nunca llega al navegador.

## Modelo

- Un registro en `zernio_profiles` representa un grupo de cuentas de un cliente.
- Un cliente normal usa un perfil con un Instagram y un TikTok.
- Renzo puede usar varios perfiles para conectar cuentas repetidas de la misma plataforma.
- `zernio_accounts` persiste los `accountId` que se usan al programar.
- `content_publications.publisher = 'zernio'` conserva el estado de cada publicación.

## Variables

```dotenv
ZERNIO_API_KEY=...
ZERNIO_WEBHOOK_SECRET=... # mínimo 32 caracteres aleatorios
SOCIAL_MEDIA_SIGNING_SECRET=... # mínimo 32 caracteres aleatorios
BETWEEN_PUBLIC_APP_URL=https://app.between.example
```

Aplicar `supabase/migrations/031_zernio_social_publishing.sql` antes de abrir la pantalla de conexiones.

## Webhook

Con un administrador autenticado, ejecutar una vez:

```http
POST /api/zernio/setup
```

Esto registra `/api/webhooks/zernio` para eventos de cuentas y publicaciones. El endpoint verifica `X-Zernio-Signature`, deduplica por event ID y actualiza el estado local.

## Flujo del cliente

1. En `Cuenta`, crear el primer grupo.
2. Conectar Instagram y TikTok mediante OAuth alojado.
3. Zernio redirige a `/api/zernio/callback`.
4. Between sincroniza los `accountId`.
5. `POST /api/zernio/publications` programa una pieza renderizada en las cuentas seleccionadas.

## Analíticas

Zernio incluye métricas por publicación y por cuenta conectada. Between expone el puente autenticado:

```http
GET /api/zernio/analytics?accountId=...&startDate=2026-08-01&endDate=2026-08-31
```

El endpoint verifica que la cuenta pertenezca al usuario antes de consultar Zernio. La respuesta se conserva sin normalizar porque Instagram y TikTok no entregan exactamente las mismas métricas. La capa visual debe normalizar sólo los indicadores comunes y mostrar los específicos por red por separado.
