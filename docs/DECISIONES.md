# DECISIONES — registro único (27-10-2026)

Una línea por decisión: fecha, qué se decidió, fuente y estado. Esto es un **índice**: la fuente manda. Las decisiones históricas se listan sin valorar si siguen vigentes salvo que la propia fuente lo diga (ver `docs/MAPA.md`).

Estados: **VIGENTE**, **SUSTITUIDA** (con por qué), **HISTÓRICA** (contexto de su época), **DIFERIDA**.

## 1. Producto y proceso (Sil)

| Fecha | Decisión | Fuente | Estado |
|---|---|---|---|
| 26-10 | La rama canónica es `promueve/nexus-v4`; `main`, `reuma-v2` y `recovery` están contenidas en ella y no se tocan | Sil, 26-10; ADR-001 | VIGENTE |
| 26-10 | Un issue por funcionalidad con su checklist; documentación en la misma PR; sin `status:approved` por PR ni PRs posmerge | PR #853; `AGENTS.md` | VIGENTE |
| 26-10 | Todo lo desarrollado hasta hoy es **core**; la diversificación por hospital/servicio empieza ahora. Sil decide por cada funcionalidad si va al core o a una vertical | Sil, 26-10 | VIGENTE |
| 26-10 | Origen del core: Dermatología, Digestivo y la Farmacia actual salen de Cáceres; Reuma sale de Mérida-Badajoz y es teórico (sin validar con equipos) | Sil, 26-10 | VIGENTE |
| 26-10 | Prioridades: 1) cerrar el módulo de efectos adversos; 2) corregir las auditorías de Sil (Farmacia ya; Reuma, solo seguridad y errores); 3) desarrollo real de Reuma tras las revisiones de proceso | Sil, 26-10 | VIGENTE |
| 26-10 | No pulir Reuma (UX, cosmético) antes de las conclusiones de Mérida (empezó 26-10) y Badajoz (06-11) | Sil, 26-10 | VIGENTE |
| 27-10 | EA **no** se congela: se cierra «EA v1 demo» reflejando el modelo nuevo en Dashboard del paciente, Quick View y Estadísticas (ya existentes); después guardar/reabrir por Bridge. Las farmacéuticas pidieron EA; no se espera feedback. Las reparaciones de FH van a continuación | Sil, 27-10 | VIGENTE |
| 26-10 | G2 (autoridad de paciente + IndexedDB) y JIT quedan abandonados: no se fusionan, solo se preservan. C3a (Metis) parada | Sil, 26-10 | VIGENTE |
| 26-10 | Metis solo para trabajo grande, de riesgo y desatendido; lo atendido va directo o por DIA. Versión de Metis congelada durante cada funcionalidad | Sil, 26-10 | VIGENTE |
| 26-10 | Seguimiento por issues + etiquetas + epics con lista de tareas + `ESTADO.md`; el tablero Project queda como vista opcional posterior | Sil, 26-10 | VIGENTE |
| 27-10 | Engram conectado a Claude Code solo como MCP, sin plugin ni hooks; auxiliar, nunca autoridad | Sil, 27-10 | VIGENTE |

## 2. Arquitectura (publicadas en el repo)

| Fecha | Decisión | Fuente | Estado |
|---|---|---|---|
| 24-09 | **Architecture Decision Freeze:** configuración mínima (registry/profile/manifest); form-builder, motor de reglas, configuración remota y V5 **diferidos**, se reabren solo con variación repetida | `docs/architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md` | VIGENTE |
| 24-09 | ADR-001 Autoridad de producto y línea canónica | `docs/architecture/adr/ADR-001-…` | ACCEPTED_ENGINEERING |
| 24-09 | ADR-002 Monolito modular y límites de módulos | `ADR-002-…` | ACCEPTED_ENGINEERING |
| 24-09 | ADR-003 Despliegue hospitalario y configuración gobernada | `ADR-003-…` | ACCEPTED_ENGINEERING |
| 24-09 | ADR-004 Contratos de lectura clínica por módulo | `ADR-004-…` | ACCEPTED_ENGINEERING |
| 24-09 | ADR-005 Contratos de escritura y semántica del acto | `ADR-005-…` | ACCEPTED_ENGINEERING |
| 24-09 | ADR-006 Persistence adapters y Excel como modo soportado | `ADR-006-…` | ACCEPTED_ENGINEERING |
| 24-09 | ADR-007 Tooling, CI, release y calidad | `ADR-007-…` | ACCEPTED_ENGINEERING |
| 24-09 | ADR-008 Límites de seguridad clínica y confianza | `ADR-008-…` | ACCEPTED_ENGINEERING |
| 03-10 | Reconciliación Farmacia + Dermatología: aprender la variación real antes de generalizar; «no diseñar el JSON universal» | `docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md` | VIGENTE |
| 12-10 | Salida agnóstica: un acto, varios destinos que conviven (Excel manual, Bridge, Power Automate, API/BD), no una secuencia obligatoria | `docs/architecture/PROMUEVE_NEXUS_SALIDA_AGNOSTICA_FH_V4_ALIGNMENT_20261012.md`; ADR-006 | VIGENTE |
| 25-10 | Bridge raw manual primero, procesamiento relacional después (C1–C5). C1, C2a y C2b publicados; C3–C5 pendientes | `docs/architecture/FH_BRIDGE_RAW_MANUAL_FIRST_DECISION_20261025.md` | VIGENTE |

## 3. Históricas

| Fecha | Decisión | Fuente | Estado |
|---|---|---|---|
| 04-06 | DEC-001…DEC-019 (Reuma v2 como base, no eliminar `main` sin trazabilidad, MVP local-first, app común modular, SharePoint Lists no como backend, FHIR/HL7 como horizonte, congelación Farmacia v0.1, etc.) | `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md` | HISTÓRICA; el Freeze del 24-09 prevalece donde se solapan |
| 10-07 | No integrar Farmacia en `main` ni en Reuma v2 post-SES; revisable tras discovery con equipos de Badajoz/Mérida | `docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md` | Principio vigente, topología histórica parcialmente sustituida (reconciliación 24-09) |
| 13-07 | Control Plane federado V4.6 | `docs/legacy/ramas/FH_V4_6_control_plane_federado_20260713.md` | DIFERIDA por el Freeze |
| 31-07 | Arquitectura objetivo V4 (Supabase como Control Plane v0.1, un libro Excel por hospital) | `docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md` | Parcialmente sustituida por el Freeze |

## Cómo mantenerlo

Al tomar una decisión, añadir una línea aquí en la misma PR que la implementa. Si una decisión sustituye a otra, marcar la antigua `SUSTITUIDA por …` en lugar de borrarla.
