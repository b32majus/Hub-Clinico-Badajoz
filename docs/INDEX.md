# Índice Documental — Hub Clínico Badajoz

**Última actualización:** 2026-06-05  
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
| Decisiones de evolución | [`docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`](/docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md) | Decisiones cerradas (DEC-001 a DEC-016) que guían el desarrollo |
| Plan de implementación Reuma v2 | [`docs/PLAN_IMPLEMENTACION_REUMA_V2.md`](/docs/PLAN_IMPLEMENTACION_REUMA_V2.md) | Plan detallado de implementación v2 (3.500 líneas) |

---

## 3. Release Reuma v2

| Documento | Ubicación | Propósito |
|-----------|-----------|-----------|
| Resumen de release v2 | [`docs/RESUMEN_RELEASE_REUMA_V2.md`](/docs/RESUMEN_RELEASE_REUMA_V2.md) | Qué se implementó en v2: LES, Sjögren, prebiológico, FH, eventos |
| Contrato de datos Reuma v2 | [`docs/CONTRATO_DATOS_REUMA_V2.md`](/docs/CONTRATO_DATOS_REUMA_V2.md) | Contrato Excel de 497 columnas por hoja clínica |
| Changelog | [`docs/CHANGELOG.md`](/docs/CHANGELOG.md) | Histórico de cambios |
| Estado de implementación | [`docs/ESTADO_IMPLEMENTACION.md`](/docs/ESTADO_IMPLEMENTACION.md) | Estado puntual de implementación |

---

## 4. Contratos mínimos interservicios (WO-002 — pendiente de merge)

| Documento | Ubicación | Estado |
|-----------|-----------|--------|
| Evento longitudinal común v1 | [`docs/contratos/CONTRATO_EVENTO_LONGITUDINAL_COMUN_V1.md`](/docs/contratos/CONTRATO_EVENTO_LONGITUDINAL_COMUN_V1.md) | 🔴 **Borrador exploratorio — no usar como fuente definitiva** |
| Enfermería Reuma v1 | [`docs/contratos/CONTRATO_ENFERMERIA_REUMA_V1.md`](/docs/contratos/CONTRATO_ENFERMERIA_REUMA_V1.md) | 🔴 **Borrador exploratorio — no usar como fuente definitiva** |
| Farmacia Reuma v1 | [`docs/contratos/CONTRATO_FARMACIA_REUMA_V1.md`](/docs/contratos/CONTRATO_FARMACIA_REUMA_V1.md) | 🔴 **Borrador exploratorio — no usar como fuente definitiva** |

> ⚠️ **Importante**: WO-002 está en pausa. Los contratos de `docs/contratos/` están en una rama sin mergear y pendientes de validación con Sil/Cora. No deben usarse como base para implementación hasta decisión humana.

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

## 8. Documentos de sistema

| Documento | Ubicación |
|-----------|-----------|
| Architecture | [`ARCHITECTURE.md`](/ARCHITECTURE.md) |
| Changelog raíz | [`CHANGELOG.md`](/CHANGELOG.md) |
| TODO | [`TODO.md`](/TODO.md) |
| README | [`README.md`](/README.md) |
| Manual de usuario (PDF) | [`docs/Manual_Usuario_Hub_Clinico_Badajoz.pdf`](/docs/Manual_Usuario_Hub_Clinico_Badajoz.pdf) |
| Contrato de datos unificado | [`docs/CONTRATO_DATOS_UNIFICADO.md`](/docs/CONTRATO_DATOS_UNIFICADO.md) |
| Decisiones estructura Excel demo v2 | [`docs/DECISION_ESTRUCTURA_EXCEL_DEMO_V2.md`](/docs/DECISION_ESTRUCTURA_EXCEL_DEMO_V2.md) |
| Mejoras propuestas | [`docs/MEJORAS_PROPUESTAS.md`](/docs/MEJORAS_PROPUESTAS.md) |
| Orden columnas Excel Reuma v2 | [`docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md`](/docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md) |
