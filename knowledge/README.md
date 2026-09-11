# Base de Conocimiento de Between Outdoor (Estándar Claude Agent Plugin)

Esta base de conocimiento implementa la arquitectura de **Agentes y Subagentes con Skills Propias**, siguiendo estrictamente la especificación canónica de Claude Code y Claude Managed Agents (inspirada en la estructura de `Claude/agent/financial-services`).

## Principio de Diseño

- **No hay skills ni estándares sueltos en la raíz:** Cada agente es una unidad autónoma y autocontenida que incluye su manifiesto, su prompt de orquestación, sus subagentes especializados y sus propias habilidades (skills) con sus archivos de referencia.
- **Agentes Orquestadores:** Gestionan el flujo de trabajo end-to-end, definen el contrato de entrega y delegan en subagentes y skills específicas según el contexto del viaje y formato.
- **Subagentes:** Trabajadores hoja (leaf workers) con responsabilidades acotadas (redacción local recurrente, redacción de expediciones, auditoría de calidad).
- **Skills del Agente:** Módulos de conocimiento especializado (`SKILL.md` + carpeta `reference/`) empaquetados dentro del agente para resolver tareas concretas (crafting de hooks, políticas de salidas locales, manejo de objeciones, estándares editoriales, etc.).

---

## Topología del Directorio

```
knowledge/
└── agents/
    ├── copy-agent/                             # Agente Principal de Redacción de Copy
    │   ├── .claude-plugin/
    │   │   └── plugin.json                    # Manifiesto de Claude Plugin
    │   ├── agent.md                           # System prompt canónico (Workflow, Roles, Guardrails)
    │   ├── manifest.json                      # Registro de subagentes y skills activas
    │   │
    │   ├── subagents/                         # Subagentes especializados (Hojas)
    │   │   ├── local-recurring-writer.md      # Redactor de salidas locales, grupos semanales y bajo ticket
    │   │   ├── expedition-writer.md           # Redactor de grandes expediciones y alto valor (high-ticket)
    │   │   └── quality-auditor.md             # Auditor de calidad editorial, anti-patrones y formato
    │   │
    │   └── skills/                            # Habilidades y referencias propias del agente
    │       ├── hook-crafting/                 # Ganchos de alta retención (< 10 palabras)
    │       │   ├── SKILL.md
    │       │   └── reference/hook-patterns.md
    │       ├── local-recurring-content/       # Foco en comunidad, hábito y baja fricción
    │       │   ├── SKILL.md
    │       │   └── reference/local-policies.md
    │       ├── expedition-high-ticket/        # Épica del destino, seguridad y valor integral
    │       │   ├── SKILL.md
    │       │   └── reference/expedition-guidelines.md
    │       ├── objection-handling/            # Neutralización de dudas reales (físico, soledad, precio)
    │       │   ├── SKILL.md
    │       │   └── reference/validated-objections.md
    │       ├── format-carousel/               # Estructuras de carruseles slide por slide
    │       │   ├── SKILL.md
    │       │   └── reference/carousel-structures.md
    │       ├── format-video-reel/             # Familias de guiones para video vertical (9:16)
    │       │   ├── SKILL.md
    │       │   └── reference/video-families.md
    │       ├── conversion-cta/                # Canales directos de conversión (DM, WhatsApp)
    │       │   ├── SKILL.md
    │       │   └── reference/cta-channels.md
    │       ├── editorial-standards/           # Voz de marca, modelo de negocio, anti-patrones y esquemas
    │       │   ├── SKILL.md
    │       │   └── reference/
    │       │       ├── brand-voice.md
    │       │       ├── business-model.md
    │       │       ├── anti-patterns.md
    │       │       └── schemas/
    │       ├── vertical-trekking/             # Dominio, patrones y spots verificados de Trekking
    │       │   ├── SKILL.md
    │       │   └── reference/ (domain.md, patterns.md, verified-spots.md, real-examples.md)
    │       ├── vertical-running/              # Dominio y patrones de Trail Running
    │       │   ├── SKILL.md
    │       │   └── reference/ (domain.md, patterns.md, verified-spots.md, real-examples.md)
    │       ├── vertical-ciclismo/             # Dominio y patrones de Ciclismo / MTB
    │       │   ├── SKILL.md
    │       │   └── reference/ (domain.md, patterns.md, verified-spots.md, real-examples.md)
    │       └── vertical-turismo-aventura/     # Dominio y patrones de Turismo Aventura combinada
    │           ├── SKILL.md
    │           └── reference/ (domain.md, patterns.md, verified-spots.md, real-examples.md)
    │
    └── batch-planner/                          # Agente de Planificación de Grillas
        ├── .claude-plugin/
        │   └── plugin.json
        ├── agent.md
        ├── manifest.json
        ├── subagents/
        │   ├── calendar-scheduler.md
        │   └── mix-balancer.md
        └── skills/
            └── mix-distribution/
                ├── SKILL.md
                └── reference/
```

---

## Flujo Operativo del Copy Agent

1. **Clasificación de la Salida:**
   - Si la salida es de proximidad o grupo semanal recurrente: Activa `local-recurring-writer` + skill `local-recurring-content`.
   - Si la salida es de alta montaña o multi-día: Activa `expedition-writer` + skill `expedition-high-ticket`.
2. **Hook y Tensión:** Invoca la skill `hook-crafting`.
3. **Manejo de Objeciones:** Invoca `objection-handling`.
4. **Formato y CTA:** Aplica `format-carousel` o `format-video-reel` junto con `conversion-cta`.
5. **Auditoría de Calidad:** El subagente `quality-auditor` valida el resultado contra `editorial-standards` antes de emitir el entregable.
