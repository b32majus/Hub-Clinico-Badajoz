# Índice Documental — Hub Clínico Badajoz

**Última actualización:** 2026-07-10
**Repo:** `b32majus/Hub-Clinico-Badajoz`  
**Rama viva:** `feature/reuma-v2-prebiologico-fh-les-sjogren`

---

## 1. Gobernanza operativa (agentes y VPS)

| Documento | Ubicación | Propósito |
|-----------|-----------|-----------|
| Reglas para agentes del proyecto | [`AGENTS.md`](/AGENTS.md) | Reglas obligatorias: pipeline Hermes → Builder, ramas protegidas, datos prohibidos, DoD |
| Gobernanza Hermes/agentes | [`docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md`](/docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md) | Marco operativo: roles, pipeline, ramas, política de commits, escalado, niveles de riesgo |
| Plantilla de work order | [`docs/ops/WORK_ORDER_TEMPLATE.md`](/docs/ops/WORK_ORDER_TEMPLATE.md) | Plantilla estándar para crear work orders |
| Plantilla de reporte de ejecución | [`docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md`](/docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md) | Plantilla para reportes post-ejecución |

---

## 2. Roadmap y evolución

| Documento | Ubicación | Propósito |
|-----------|-----------|-----------|
| Roadmap de arquitectura post-SES | [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) | Fuente de verdad post-SES para estado, arquitectura objetivo, fases propuestas y decisiones pendientes |
| Decisiones de evolución | [`docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`](/docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md) | Decisiones cerradas (DEC-001 a DEC-019) que guían el desarrollo |
| Arquitectura funcional v2.1 | [`docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`](/docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md) | Visión funcional del sistema actual y planificado (recomendado como primera lectura) |
| Plan de implementación Reuma v2 | [`docs/PLAN_IMPLEMENTACION_REUMA_V2.md`](/docs/PLAN_IMPLEMENTACION_REUMA_V2.md) | Plan detallado de implementación v2 (3.500 líneas) |

---

## 3. Release Reuma v2

| Documento | Ubicación | Propósito |
|-----------|-----------|-----------|
| Resumen de release v2 | [`docs/RESUMEN_RELEASE_REUMA_V2.md`](/docs/RESUMEN_RELEASE_REUMA_V2.md) | Qué se implementó en v2: LES, Sjögren, prebiológico, FH, eventos |
| Contrato de datos Reuma v2 | [`docs/CONTRATO_DATOS_REUMA_V2.md`](/docs/CONTRATO_DATOS_REUMA_V2.md) | Contrato Excel de 497 columnas por hoja clínica |

> 🗃️ **Documentos archivados (legacy):** El changelog y el estado de implementación anteriores a Reuma v2 se movieron a `docs/archive/`. No deben usarse como fuentes canónicas actuales.
>
> | Documento | Ubicación de archivo |
> |---|---|
> | Changelog legacy | [`docs/archive/CHANGELOG_20260307.md`](/docs/archive/CHANGELOG_20260307.md) |
> | Estado de implementación legacy | [`docs/archive/ESTADO_IMPLEMENTACION_20260307.md`](/docs/archive/ESTADO_IMPLEMENTACION_20260307.md) |

---

## 4. Contratos mínimos interservicios (WO-002 — rama pausada, no mergeada)

> ⚠️ **Importante:** WO-002 está en pausa. Los contratos listados abajo existen solo en la rama `work/hermes/wo-002-contratos-minimos`, que **NO está mergeada** a la rama viva. No enlazan a archivos disponibles en la rama actual.
>
> Pendientes de validación con Sil/Cora. No deben usarse como base para implementación hasta decisión humana.

| Documento | Ubicación (en rama WO-002) | Estado |
|-----------|-----------|--------|
| Evento longitudinal común v1 | `docs/contratos/CONTRATO_EVENTO_LONGITUDINAL_COMUN_V1.md` | 🔴 **Borrador exploratorio — no usar como fuente definitiva** |
| Enfermería Reuma v1 | `docs/contratos/CONTRATO_ENFERMERIA_REUMA_V1.md` | 🔴 **Borrador exploratorio — no usar como fuente definitiva** |
| Farmacia Reuma v1 | `docs/contratos/CONTRATO_FARMACIA_REUMA_V1.md` | 🔴 **Borrador exploratorio — no usar como fuente definitiva** |

---

## 5. Plantillas clínicas

| Documento | Ubicación |
|-----------|-----------|
| Template AR Excel | [`docs/template_ar_excel.md`](/docs/template_ar_excel.md) |
| Template LES Excel | [`docs/template_les_excel.md`](/docs/template_les_excel.md) |
| Template prebiológico Excel | [`docs/template_prebiologico_excel.md`](/docs/template_prebiologico_excel.md) |
| Template Sjögren Excel | [`docs/template_sjogren_excel.md`](/docs/template_sjogren_excel.md) |
| Template Solicitud FH | [`docs/template_solicitud_fh.md`](/docs/template_solicitud_fh.md) |

---

## 6. Auditorías y validaciones

| Documento | Ubicación |
|-----------|-----------|
| Auditoría Excel Maestro v2 | [`docs/AUDITORIA_EXCEL_MAESTRO_V2.md`](/docs/AUDITORIA_EXCEL_MAESTRO_V2.md) |
| Auditoría fuentes de dato Reuma v2 | [`docs/AUDITORIA_FUENTES_DATO_REUMA_V2.md`](/docs/AUDITORIA_FUENTES_DATO_REUMA_V2.md) |
| Checklist E2E clínico | [`docs/CHECKLIST_E2E_CLINICO.md`](/docs/CHECKLIST_E2E_CLINICO.md) |
| Checklist E2E clínico v2 | [`docs/CHECKLIST_E2E_CLINICO_V2.md`](/docs/CHECKLIST_E2E_CLINICO_V2.md) |
| Validación manual demo v2 | [`docs/VALIDACION_MANUAL_DEMO_V2.md`](/docs/VALIDACION_MANUAL_DEMO_V2.md) |
| Reporte diferencias Excel demo v2 | [`docs/REPORTE_DIFERENCIAS_EXCEL_DEMO_V2.md`](/docs/REPORTE_DIFERENCIAS_EXCEL_DEMO_V2.md) |

---

## 7. Documentos generados en lote nocturno (2026-06-05)

| Documento | Ubicación | Work Order |
|-----------|-----------|-----------|
| Inventario técnico app Reuma v2 | [`docs/ops/INVENTARIO_TECNICO_APP_REUMA_V2_20260606.md`](/docs/ops/INVENTARIO_TECNICO_APP_REUMA_V2_20260606.md) | WO-003 |
| Mapa de flujos actuales | [`docs/ops/MAPA_FLUJOS_APP_REUMA_V2_20260606.md`](/docs/ops/MAPA_FLUJOS_APP_REUMA_V2_20260606.md) | WO-004 |
| Smoke test checklist | [`docs/ops/SMOKE_TEST_REUMA_V2_CHECKLIST_20260606.md`](/docs/ops/SMOKE_TEST_REUMA_V2_CHECKLIST_20260606.md) | WO-005 |
| Estado de ramas y decisiones | [`docs/ops/BRANCH_AND_DECISION_STATUS_20260606.md`](/docs/ops/BRANCH_AND_DECISION_STATUS_20260606.md) | WO-007 |
| Auditoría riesgos técnicos | [`docs/ops/AUDITORIA_RIESGOS_TECNICOS_REUMA_V2_20260606.md`](/docs/ops/AUDITORIA_RIESGOS_TECNICOS_REUMA_V2_20260606.md) | WO-008 |
| Reporte lote nocturno | [`docs/ops/NIGHTLY_GREEN_BATCH_REPORT_20260606.md`](/docs/ops/NIGHTLY_GREEN_BATCH_REPORT_20260606.md) | WO-009 |

---

## 8. Farmacia Hospitalaria v0.1 — demo 2026-06-08

> **Rama:** `work/hermes/nightly-farmacia-v0-1-20260606` (congelada, no mergeada)
> **Estado:** `ready_for_demo` / `pending human review`

| Documento | Ubicación | Propósito |
|-----------|-----------|-----------|
| Cierre de bloque Farmacia v0.1 | [`docs/ops/CIERRE_BLOQUE_FARMACIA_V0_1_20260606.md`](/docs/ops/CIERRE_BLOQUE_FARMACIA_V0_1_20260606.md) | Cierre documental global: estado, flujos, decisiones, auditorías, deuda, aprendizaje |
| Especificación funcional Farmacia v0.1 | [`docs/ops/ESPECIFICACION_FUNCIONAL_FARMACIA_HOSPITALARIA_V0_1_20260606.md`](/docs/ops/ESPECIFICACION_FUNCIONAL_FARMACIA_HOSPITALARIA_V0_1_20260606.md) | Especificación funcional del módulo para la demo |
| Executive summary demo | [`docs/ops/EXECUTIVE_SUMMARY_FARMACIA_DEMO_20260606.md`](/docs/ops/EXECUTIVE_SUMMARY_FARMACIA_DEMO_20260606.md) | Resumen ejecutivo para revisión Sil/Cora |
| Freeze demo | [`docs/ops/FARMACIA_DEMO_FREEZE_20260606.md`](/docs/ops/FARMACIA_DEMO_FREEZE_20260606.md) | Congelación de rama para demo del lunes |
| Deuda técnica post-demo | [`docs/ops/DEUDA_TECNICA_FARMACIA_POST_DEMO_20260606.md`](/docs/ops/DEUDA_TECNICA_FARMACIA_POST_DEMO_20260606.md) | Deuda técnica identificada y plan de abordaje |
| Auditoría visual Claude | [`docs/ops/audits/FARMACIA_VISUAL_AUDIT_CLAUDE_20260606.md`](/docs/ops/audits/FARMACIA_VISUAL_AUDIT_CLAUDE_20260606.md) | Auditoría visual con navegador real (WO-028) |
| Auditoría global Claude | [`docs/ops/audits/FARMACIA_VISUAL_AUDIT_GLOBAL_CLAUDE_20260606.md`](/docs/ops/audits/FARMACIA_VISUAL_AUDIT_GLOBAL_CLAUDE_20260606.md) | Auditoría global: código, WCAG, UX (WO-028) |
| Reporte implementación nocturna | [`docs/ops/NIGHTLY_FARMACIA_IMPLEMENTATION_REPORT_20260606.md`](/docs/ops/NIGHTLY_FARMACIA_IMPLEMENTATION_REPORT_20260606.md) | Reporte de cierre de la macro WO nocturna |
| Smoke check / CI | [`tools/farmacia_smoke_check.mjs`](/tools/farmacia_smoke_check.mjs) + [workflow](/.github/workflows/farmacia-smoke-check.yml) | Smoke check automatizado (33/33 OK) + CI workflow |

---

## 9. Documentos de sistema

| Documento | Ubicación |
|-----------|-----------|
| Architecture | [`ARCHITECTURE.md`](/ARCHITECTURE.md) |
| Changelog raíz | [`CHANGELOG.md`](/CHANGELOG.md) |
| TODO | [`TODO.md`](/TODO.md) |
| README | [`README.md`](/README.md) |
| Manual de usuario (PDF) | [`docs/Manual_Usuario_Hub_Clinico_Badajoz.pdf`](/docs/Manual_Usuario_Hub_Clinico_Badajoz.pdf) |
| Contrato de datos unificado (legacy) | [`docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md`](/docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md) — archivado; no vigente para Reuma v2 |
| Decisiones estructura Excel demo v2 | [`docs/DECISION_ESTRUCTURA_EXCEL_DEMO_V2.md`](/docs/DECISION_ESTRUCTURA_EXCEL_DEMO_V2.md) |
| Mejoras propuestas | [`docs/MEJORAS_PROPUESTAS.md`](/docs/MEJORAS_PROPUESTAS.md) |
| Orden columnas Excel Reuma v2 | [`docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md`](/docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md) |
| Plan formativo y protocolo de decisiones | [`docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md`](/docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md) |
| Capa entrada Farmacia multipatología | [`docs/ops/DECISION_CAPA_ENTRADA_FARMACIA_MULTIPATOLOGIA_20260605.md`](/docs/ops/DECISION_CAPA_ENTRADA_FARMACIA_MULTIPATOLOGIA_20260605.md) |

---

## Orden de lectura recomendado

Para entender el proyecto desde cero:

1. **`README.md`** — visión general del proyecto.
2. **`docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`** — arquitectura funcional: qué hace y hacia dónde va.
3. **`ARCHITECTURE.md`** — detalle técnico de implementación.
4. **`docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`** — decisiones cerradas y roadmap completo.
5. **`AGENTS.md`** — reglas operativas para agentes.
6. **`docs/ops/WORK_ORDER_STATUS.md`** — estado actual de ejecución.
7. Según interés: `docs/ops/INVENTARIO_TECNICO_*`, `docs/ops/MAPA_FLUJOS_*`, `docs/ops/AUDITORIA_RIESGOS_*`.
