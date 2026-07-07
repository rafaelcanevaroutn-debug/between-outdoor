-- Seed Fase 0 — región Norte + elementos structural + template mes_salida
-- Ejecutar con admin auth (service_role key) para saltear RLS

do $$
declare
  v_norte_id uuid;
begin

  -- ── Región Norte ──────────────────────────────────────────────────────────
  insert into regions (slug, name, mood)
  values ('norte', 'Norte', 'Árido, vibrante, piedra y luz dura')
  on conflict (slug) do nothing;

  select id into v_norte_id from regions where slug = 'norte';

  -- ── Tokens placeholder para Norte ────────────────────────────────────────
  -- Paleta: desierto + cardón + sol
  insert into tokens (region_id, category, role, value) values
    (v_norte_id, 'color', 'bg',        '#110D06'),
    (v_norte_id, 'color', 'accent',    '#E8A04A'),
    (v_norte_id, 'color', 'highlight', '#C45B1E'),
    (v_norte_id, 'color', 'text',      '#F2E8D4'),
    (v_norte_id, 'color', 'card',      '#1E1509'),
    (v_norte_id, 'font',  'heading',   'Georgia, serif'),
    (v_norte_id, 'font',  'body',      'system-ui, sans-serif'),
    (v_norte_id, 'radius','card',      '12px')
  on conflict do nothing;

  -- ── Elementos structural (globales — sin region_id) ───────────────────────
  insert into elements (kind, type, component_key, props_schema)
  values
    ('structural', 'titular',    'titular',    '{"maxChars": 60}'),
    ('structural', 'chip',       'chip',       '{"maxChars": 40}'),
    ('structural', 'calendario', 'calendario', '{"showDots": true}'),
    ('structural', 'bajada',     'bajada',     '{"maxChars": 120}'),
    ('structural', 'polaroid',   'polaroid',   '{"maxImages": 1}')
  on conflict do nothing;

  -- ── Template mes_salida ───────────────────────────────────────────────────
  insert into templates (name, archetype, region_id, composition)
  values (
    'Mes Salida',
    'mes',
    v_norte_id,
    '{
      "template_id": "mes_salida",
      "region": "norte",
      "canvas": { "ratio": "4:5", "w": 1080, "h": 1350 },
      "slots": {
        "mes":    { "type": "text" },
        "dias":   { "type": "text" },
        "fechas": { "type": "text" },
        "salida": { "type": "text" },
        "fotos":  { "type": "image[]", "max": 2 },
        "fondo":  { "type": "image" }
      },
      "layers": [
        { "element": "fondo",      "bind": "fondo",                                              "z": 0 },
        { "element": "calendario", "bind": { "mes": "mes", "dias_activos": "fechas" }, "x": 90,  "y": 180, "w": 900, "z": 1 },
        { "element": "titular",    "bind": "dias",   "x": 90, "y": 960,  "w": 900, "token": "accent",    "z": 2 },
        { "element": "chip",       "bind": "fechas", "x": 90, "y": 1085, "w": 520, "token": "highlight", "z": 3 },
        { "element": "bajada",     "bind": "salida", "x": 90, "y": 1170, "w": 900, "token": "text",      "z": 4 }
      ]
    }'::jsonb
  )
  on conflict do nothing;

end $$;
