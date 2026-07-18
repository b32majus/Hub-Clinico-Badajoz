# Índice documental maestro — Hub Clínico Badajoz / PROMueve

| Metadato | Valor |
|---|---|
| Última actualización | 2026-07-18 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama publicada de referencia | `origin/preview/demo-lunes-wo4-20260614` |
| Estado de ref y HEAD | Verificar en GitHub antes de cada WO; este índice no fija una rama de trabajo viva. |

> Este índice es una guía de navegación. No sustituye a los documentos que referencia; su función es orientar sobre qué documento consultar para cada propósito y qué estado tiene.

---

## 1. Lectura recomendada para incorporarse al proyecto (máximo 7 documentos)

1. [`README.md`](/README.md) — visión general, contexto y alcance del proyecto.
2. [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) — estado post-reunión SES, fases propuestas, decisiones cerradas y pendientes.
3. [`AGENTS.md`](/AGENTS.md) — contrato operativo breve: fuentes de verdad, riesgo, seguridad, Git y gates de cierre.
4. [`docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md`](/docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md) — protocolo canónico global de evidencia pre-commit, revisión, commit y publicación.
5. [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) — tablero de work orders y estado de ejecución.
6. [`docs/ops/AI_HARNESS_PROMUEVE_V1.md`](/docs/ops/AI_HARNESS_PROMUEVE_V1.md) — arnés OpenCode mínimo y procedimiento trazable de WOs; la base se verifica en cada ejecución.
7. [`ARCHITECTURE.md`](/ARCHITECTURE.md) — arquitectura técnica e implementación actual (estado post-SES).

> Después de estos siete, el siguiente paso depende del interés: Reumatología → contrato y arquitectura funcional; Farmacia → manifiesto de ramas y documentos v0.3–v0.5; descubrimiento → guía Badajoz/Mérida.

---

## 2. Estado de ramas y fuentes de verdad

| Rama / ref | Estado | Fuente de verdad para | No es fuente de verdad para |
|---|---|---|---|
| `origin/main` | Legacy / stale. Congelada en `a25cccb` (2026-03-07). | Historia del proyecto antes de Reuma v2. | Estado actual, Reuma v2, Farmacia, Enfermería ni roadmap post-SES. |
| `origin/feature/reuma-v2-prebiologico-fh-les-sjogren` | Base canónica viva de Reuma v2. | Reumatología multipatología, contrato Excel v2, decisiones DEC-001..019. | Post-demo Farmacia (v0.3–v0.5), preview publicada ni decisiones post-SES. |
| `origin/preview/demo-lunes-wo4-20260614` | Rama publicada en GitHub Pages. Referencia operativa Farmacia post-demo. | Estado funcional de Farmacia validado en demo/preview: validación farmacoterapéutica, primera visita, seguimiento, dashboard, importación Enfermería/Farmacia, catálogo CIMA/local, exportaciones. | Arquitectura aprobada, contratos clínicos definitivos, producción ni datos reales. |
| `origin/docs/promueve-fh-control-plane-federado-20260713` | **HOLD / propuesta arquitectónica. No mergear.** | Concepto de control plane federado y configuración no-paciente derivado del análisis post-SES. | Arquitectura aprobada, capacidad implementada ni decisión institucional. |
| `origin/work/*` | Ramas de trabajo en progreso o históricas. | Desarrollo atómico revisable; trazabilidad de WO. | Estado publicado ni canónico sin merge previo y validación. |
| `origin/preview/*` | Previews publicables / demos. | Referencia de demo validada para Pages. | Producción ni base canónica automática. |
| `origin/backup/*` y tags `farmacia-demo-lunes-*` | Puntos de retorno operativos. | Recuperar estados demo congelados. | No son ramas de desarrollo activo. |

### Notas sobre ramas

- `main` es legacy por decisión DEC-001; su conservación obedece a DEC-002 (no eliminar sin trazabilidad). Los tags propuestos en DEC-002 aún no existen.
- La rama `feature/reuma-v2...` no contiene los avances post-demo de Farmacia documentados en v0.3–v0.5; estos viven principalmente en `preview/demo-lunes-wo4-20260614` y en worktrees locales.
- `preview/demo-lunes-wo4-20260614` es la referencia publicada actual; cualquier modificación requiere WO autorizada.
- El HOLD `docs/promueve-fh-control-plane-federado-20260713` contiene una propuesta de control plane federado; su destino (integrar, descartar o redefinir) es una decisión pendiente.

---

## 3. Documentos canónicos actuales

| Documento | Estado | Sirve para | No sirve para |
|---|---|---|---|
| [`AGENTS.md`](/AGENTS.md) | Vigente | Contrato operativo breve, clasificación de riesgo, seguridad, Git y gates de ejecución. | Especificación completa del paquete de evidencia ni decisiones clínicas. |
| [`docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md`](/docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md) | Canónico global | Preparación, cierre, paquete pre/post-commit, handoff, revisión y publicación de todas las WOs PROMueve. | Sustituir el objetivo, alcance o controles clínicos de una WO concreta. |
| [`docs/ops/AI_HARNESS_PROMUEVE_V1.md`](/docs/ops/AI_HARNESS_PROMUEVE_V1.md) | Vigente | Agentes, modelos y procedimiento trazable del arnés; verificación de base por WO. | Configuración clínica, autorización de commit o estado publicado. |
| [`docs/ops/WORK_ORDER_TEMPLATE.md`](/docs/ops/WORK_ORDER_TEMPLATE.md) | Vigente | Redactar WOs con riesgo razonado, base verificable, diagnóstico, RED/GREEN, QA y política de revisión. | Evidencia de una ejecución real. |
| [`docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md`](/docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md) | Vigente | Estructurar `REPORT.md` pre-commit sin presuponer commit ni publicación. | Sustituir `DIFF.patch`, `TESTS.log` o el worktree. |
| [`docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md`](/docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md) | Parcial | Marco operativo completo, pipeline v1. | Modelo operativo v2 Cora-Hermes (parcialmente reflejado en `AGENTS.md`). |
| [`docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`](/docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md) | Vigente | Decisiones cerradas DEC-001..019. | Aprobación de tags DEC-002 (pendientes) ni decisiones post-SES. |
| [`docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`](/docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md) | Parcial | Visión funcional de Reuma v2 y planificación inicial. | Estado real de Farmacia post-demo (aún describe Farmacia como no implementado). |
| [`ARCHITECTURE.md`](/ARCHITECTURE.md) | Vigente post-SES | Arquitectura técnica, módulos, flujo de datos, transición propuesta. | Aprobación institucional ni producción. |
| [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) | Propuesta canónica post-SES | Estado post-SES, fases propuestas, decisiones pendientes, nomenclatura provisional. | Arquitectura aprobada ni plan de implementación vinculante. |
| [`CHANGELOG.md`](/CHANGELOG.md) | Vigente | Release log principal del proyecto. | Historial detallado de WOs (ver `WORK_ORDER_STATUS.md`). |
| [`docs/CONTRATO_DATOS_REUMA_V2.md`](/docs/CONTRATO_DATOS_REUMA_V2.md) | Vigente | Contrato Excel 497 columnas para Reuma v2. | Farmacia, Enfermería ni contratos interservicios definitivos. |
| [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) | Vigente | Estado y trazabilidad de work orders. | Decisiones de arquitectura ni contratos clínicos. |
| [`docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md`](/docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md) | Vigente | Protocolo de fases F0–F6 y plan formativo. | Cronograma ejecutivo ni asignación de recursos. |
| [`docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md`](/docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md) | Vigente post-SES | Decisión reversible de no integrar Farmacia en main ni Reuma v2 por ahora. | Autorización de merge ni campos finales. |
| [`docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md`](/docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md) | Vigente | Guía práctica de reuniones discovery Badajoz/Mérida. | Contratos clínicos ni integraciones aprobadas. |
| [`docs/farmacia_branch_manifest_20260614.md`](/docs/farmacia_branch_manifest_20260614.md) | Parcial / log operativo | Historial operativo de ramas y WOs Farmacia. | Roadmap ejecutivo ni documento canónico de arquitectura. |
| [`docs/farmacia_data_contracts.md`](/docs/farmacia_data_contracts.md) | Vigente (preview) | Contrato de pautas Farmacia en preview. | Contrato clínico definitivo sin validación. |
| [`docs/farmacia_treatment_data_contract.md`](/docs/farmacia_treatment_data_contract.md) | Vigente (preview) | Contrato de tratamiento Farmacia en preview. | Contrato clínico definitivo sin validación. |
| [`docs/farmacia_wo_execution_protocol.md`](/docs/farmacia_wo_execution_protocol.md) | Suplemento vigente | Controles clínicos y técnicos específicos para WOs de Farmacia. | Cierre o handoff paralelo al protocolo global; otros módulos. |

---

## 4. Documentos por línea de trabajo

### General, roadmap y gobernanza
- [`README.md`](/README.md)
- [`ARCHITECTURE.md`](/ARCHITECTURE.md)
- [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md)
- [`docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`](/docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md)
- [`AGENTS.md`](/AGENTS.md)
- [`docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md`](/docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md) — fuente canónica global para cierre, evidencia, revisión, commit y publicación de WOs.
- [`docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md`](/docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md)
- [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md)
- [`docs/ops/WORK_ORDER_TEMPLATE.md`](/docs/ops/WORK_ORDER_TEMPLATE.md) — plantilla de WO con riesgo razonado, base/SHA, diagnóstico, RED/GREEN, QA y reconciliación.
- [`docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md`](/docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md) — plantilla de evidencia pre-commit que distingue diff local, commit y publicación.
- [`docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md`](/docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md)
- [`docs/ops/BRANCH_AND_DECISION_STATUS_20260606.md`](/docs/ops/BRANCH_AND_DECISION_STATUS_20260606.md)
- [`docs/ops/BRANCH_CLEANUP_POLICY.md`](/docs/ops/BRANCH_CLEANUP_POLICY.md)

### Reumatología
- [`docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`](/docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md)
- [`docs/PLAN_IMPLEMENTACION_REUMA_V2.md`](/docs/PLAN_IMPLEMENTACION_REUMA_V2.md)
- [`docs/RESUMEN_RELEASE_REUMA_V2.md`](/docs/RESUMEN_RELEASE_REUMA_V2.md)
- [`docs/CONTRATO_DATOS_REUMA_V2.md`](/docs/CONTRATO_DATOS_REUMA_V2.md)
- [`docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md`](/docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md)
- [`docs/AUDITORIA_EXCEL_MAESTRO_V2.md`](/docs/AUDITORIA_EXCEL_MAESTRO_V2.md)
- [`docs/AUDITORIA_FUENTES_DATO_REUMA_V2.md`](/docs/AUDITORIA_FUENTES_DATO_REUMA_V2.md)
- [`docs/CHECKLIST_E2E_CLINICO_V2.md`](/docs/CHECKLIST_E2E_CLINICO_V2.md)
- [`docs/VALIDACION_MANUAL_DEMO_V2.md`](/docs/VALIDACION_MANUAL_DEMO_V2.md)
- [`docs/REPORTE_DIFERENCIAS_EXCEL_DEMO_V2.md`](/docs/REPORTE_DIFERENCIAS_EXCEL_DEMO_V2.md)
- [`docs/DECISION_ESTRUCTURA_EXCEL_DEMO_V2.md`](/docs/DECISION_ESTRUCTURA_EXCEL_DEMO_V2.md)
- [`docs/template_ar_excel.md`](/docs/template_ar_excel.md), [`docs/template_les_excel.md`](/docs/template_les_excel.md), [`docs/template_prebiologico_excel.md`](/docs/template_prebiologico_excel.md), [`docs/template_sjogren_excel.md`](/docs/template_sjogren_excel.md)
- [`docs/template_solicitud_fh.md`](/docs/template_solicitud_fh.md)

### Farmacia Hospitalaria
- [`docs/farmacia_branch_manifest_20260614.md`](/docs/farmacia_branch_manifest_20260614.md)
- [`docs/ops/ESPECIFICACION_FUNCIONAL_FARMACIA_HOSPITALARIA_V0_1_20260606.md`](/docs/ops/ESPECIFICACION_FUNCIONAL_FARMACIA_HOSPITALARIA_V0_1_20260606.md)
- [`docs/ops/CIERRE_BLOQUE_FARMACIA_V0_1_20260606.md`](/docs/ops/CIERRE_BLOQUE_FARMACIA_V0_1_20260606.md)
- [`docs/ops/EXECUTIVE_SUMMARY_FARMACIA_DEMO_20260606.md`](/docs/ops/EXECUTIVE_SUMMARY_FARMACIA_DEMO_20260606.md)
- [`docs/ops/FARMACIA_DEMO_FREEZE_20260606.md`](/docs/ops/FARMACIA_DEMO_FREEZE_20260606.md)
- [`docs/ops/FARMACIA_DEMO_V0_2_FREEZE_20260607.md`](/docs/ops/FARMACIA_DEMO_V0_2_FREEZE_20260607.md)
- [`docs/ops/CHECKPOINT_FARMACIA_V0_3_POST_DEMO_20260608.md`](/docs/ops/CHECKPOINT_FARMACIA_V0_3_POST_DEMO_20260608.md)
- [`docs/ops/FARMACIA_V0_3_CATALOGO_TRANSVERSAL_HUB_CLINICO_20260607.md`](/docs/ops/FARMACIA_V0_3_CATALOGO_TRANSVERSAL_HUB_CLINICO_20260607.md)
- [`docs/ops/FARMACIA_V0_3_CIMA_AUTOUPDATE_PLAN_20260607.md`](/docs/ops/FARMACIA_V0_3_CIMA_AUTOUPDATE_PLAN_20260607.md)
- [`docs/ops/FARMACIA_V0_3_DASHBOARD_LONGITUDINAL_REFINEMENT_20260607.md`](/docs/ops/FARMACIA_V0_3_DASHBOARD_LONGITUDINAL_REFINEMENT_20260607.md)
- [`docs/ops/FARMACIA_V0_3_DASHBOARD_SERVICIO_FILTROS_20260607.md`](/docs/ops/FARMACIA_V0_3_DASHBOARD_SERVICIO_FILTROS_20260607.md)
- [`docs/ops/FARMACIA_V0_3_MODELO_LONGITUDINAL_20260607.md`](/docs/ops/FARMACIA_V0_3_MODELO_LONGITUDINAL_20260607.md)
- [`docs/ops/FARMACIA_V0_3_POST_DEMO_EXPLORATORY_START_20260607.md`](/docs/ops/FARMACIA_V0_3_POST_DEMO_EXPLORATORY_START_20260607.md)
- [`docs/ops/FARMACIA_V0_3_REALIGNMENT_CORRECTION_20260607.md`](/docs/ops/FARMACIA_V0_3_REALIGNMENT_CORRECTION_20260607.md)
- [`docs/ops/FARMACIA_V0_3_REALINEACION_DASHBOARD_ESTADISTICAS_20260607.md`](/docs/ops/FARMACIA_V0_3_REALINEACION_DASHBOARD_ESTADISTICAS_20260607.md)
- [`docs/ops/FARMACIA_V0_4_BACKLOG_NEOPLASIAS_20260611.md`](/docs/ops/FARMACIA_V0_4_BACKLOG_NEOPLASIAS_20260611.md)
- [`docs/ops/FARMACIA_V0_4_CAUSALIDAD_EA_20260611.md`](/docs/ops/FARMACIA_V0_4_CAUSALIDAD_EA_20260611.md)
- [`docs/ops/FARMACIA_V0_4_MODELO_MULTIBIOLOGICO_20260611.md`](/docs/ops/FARMACIA_V0_4_MODELO_MULTIBIOLOGICO_20260611.md)
- [`docs/ops/FARMACIA_V0_5_PROGRAMMING_MODEL_REFACTOR_20260611.md`](/docs/ops/FARMACIA_V0_5_PROGRAMMING_MODEL_REFACTOR_20260611.md)
- [`docs/ops/FARMACIA_DATA_IMPORT_ENFERMERIA_FARMACIA_20260612.md`](/docs/ops/FARMACIA_DATA_IMPORT_ENFERMERIA_FARMACIA_20260612.md)
- [`docs/ops/FARMACIA_EXPERIMENTAL_CAUSALIDAD_HOLD_20260612.md`](/docs/ops/FARMACIA_EXPERIMENTAL_CAUSALIDAD_HOLD_20260612.md)
- [`docs/ops/DEUDA_TECNICA_FARMACIA_POST_DEMO_20260606.md`](/docs/ops/DEUDA_TECNICA_FARMACIA_POST_DEMO_20260606.md)
- [`docs/ops/NIGHTLY_FARMACIA_IMPLEMENTATION_REPORT_20260606.md`](/docs/ops/NIGHTLY_FARMACIA_IMPLEMENTATION_REPORT_20260606.md)
- [`docs/ops/farmacia-roadmap-post-demo-v0-3-20260607.md`](/docs/ops/farmacia-roadmap-post-demo-v0-3-20260607.md)
- [`docs/farmacia_data_contracts.md`](/docs/farmacia_data_contracts.md)
- [`docs/farmacia_treatment_data_contract.md`](/docs/farmacia_treatment_data_contract.md)
- [`docs/farmacia_export_longitudinal_contract_WO8.md`](/docs/farmacia_export_longitudinal_contract_WO8.md)
- [`docs/farmacia_enfermeria_excel_sintetico_gap_WO8.md`](/docs/farmacia_enfermeria_excel_sintetico_gap_WO8.md)
- [`docs/farmacia_wo_execution_protocol.md`](/docs/farmacia_wo_execution_protocol.md)

### Enfermería
- [`docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md`](/docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md)
- [`docs/ops/DECISION_CAPA_ENTRADA_FARMACIA_MULTIPATOLOGIA_20260605.md`](/docs/ops/DECISION_CAPA_ENTRADA_FARMACIA_MULTIPATOLOGIA_20260605.md)
- [`docs/farmacia_enfermeria_excel_sintetico_gap_WO8.md`](/docs/farmacia_enfermeria_excel_sintetico_gap_WO8.md)

### Backend, interoperabilidad y evolución técnica futura
- [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) — sección de arquitectura futura y control plane federado.
- [`ARCHITECTURE.md`](/ARCHITECTURE.md) — repository layer, diccionario de variables, backend e integraciones.
- [`docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`](/docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md) — propuesta exploratoria avanzada para captura PROM/PREM seudonimizada con tarjeta PROM universal, QR permanente, código corto de asignación manual, token temporal de visita y backend intercambiable.
- [`docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md`](/docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md) — propuesta exploratoria avanzada para Identity Plane local, tabla maestra de correspondencia de seudonimización, Nursing Readiness Gateway, eventos clínico-operativos seudonimizados y control de profesionales/roles por tenant.
- [`docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`](/docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md) — propuesta exploratoria avanzada para gestión longitudinal por línea de tratamiento, ciclos de renovación, reglas temporales declarativas, tareas por roles, switches y ejecución al abrir el Hub o mediante scheduler futuro.
- [`docs/deuda-tecnica/cdc-001-cima-auto-update.md`](/docs/deuda-tecnica/cdc-001-cima-auto-update.md)

### Gobernanza KairOS / Hermes y operativa
- [`AGENTS.md`](/AGENTS.md)
- [`docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md`](/docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md)
- [`docs/ops/AI_HARNESS_PROMUEVE_V1.md`](/docs/ops/AI_HARNESS_PROMUEVE_V1.md) — procedimiento y trazabilidad del arnés sin SHA vivo permanente.
- [`docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md`](/docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md)
- [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md)
- [`docs/ops/WORK_ORDER_TEMPLATE.md`](/docs/ops/WORK_ORDER_TEMPLATE.md) — preparación contractual y gates de cada WO.
- [`docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md`](/docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md) — reporte pre-commit y visibilidad de evidencia.
- [`docs/ops/NIGHTLY_GREEN_BATCH_REPORT_20260606.md`](/docs/ops/NIGHTLY_GREEN_BATCH_REPORT_20260606.md)

### Contratos y plantillas
- [`docs/CONTRATO_DATOS_REUMA_V2.md`](/docs/CONTRATO_DATOS_REUMA_V2.md)
- [`docs/template_ar_excel.md`](/docs/template_ar_excel.md), [`docs/template_les_excel.md`](/docs/template_les_excel.md), [`docs/template_prebiologico_excel.md`](/docs/template_prebiologico_excel.md), [`docs/template_sjogren_excel.md`](/docs/template_sjogren_excel.md), [`docs/template_solicitud_fh.md`](/docs/template_solicitud_fh.md)
- [`docs/farmacia_data_contracts.md`](/docs/farmacia_data_contracts.md)
- [`docs/farmacia_treatment_data_contract.md`](/docs/farmacia_treatment_data_contract.md)
- `docs/contratos/` (solo en rama `work/hermes/wo-002-contratos-minimos`; exploratorio/pausado; no disponible en el árbol actual)

### Auditorías
- [`docs/AUDITORIA_EXCEL_MAESTRO_V2.md`](/docs/AUDITORIA_EXCEL_MAESTRO_V2.md)
- [`docs/AUDITORIA_FUENTES_DATO_REUMA_V2.md`](/docs/AUDITORIA_FUENTES_DATO_REUMA_V2.md)
- [`docs/ops/AUDITORIA_RIESGOS_TECNICOS_REUMA_V2_20260606.md`](/docs/ops/AUDITORIA_RIESGOS_TECNICOS_REUMA_V2_20260606.md)
- [`docs/ops/audits/FARMACIA_SCREEN_AUDIT_POST_PR20_20260714.md`](/docs/ops/audits/FARMACIA_SCREEN_AUDIT_POST_PR20_20260714.md) — auditoría técnica pantalla a pantalla de Farmacia post-PR20; fuente histórica preservada para la reconciliación técnica + Sil, no autoriza implementación o piloto.
- [`docs/ops/audits/FARMACIA_SCREEN_REVIEW_SIL_POST_PR20_20260714.md`](/docs/ops/audits/FARMACIA_SCREEN_REVIEW_SIL_POST_PR20_20260714.md) — revisión funcional/manual de Sil post-PR20 de pantallas Farmacia; complementa y no sustituye la auditoría técnica, y no autoriza implementación ni piloto.
- [`docs/ops/audits/FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md`](/docs/ops/audits/FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md) — reconciliación técnica + criterio Sil con seguimiento post-PR29 (`reviewed_with_partial_implementation_followup`): FH-R01 resuelto; FH-R02 y FH-R03 resueltos en alcance mínimo de demo; FH-R04 y FH-R09-FH-R11 parcialmente resueltos; FH-R05, FH-R06 y FH-R08 pendientes; FH-R07 requiere diagnóstico; FH-R12 y FH-R13 diferidos deliberadamente; FH-R14 solo documentado, no implementado. No autoriza piloto, backlog ni contratos clínicos.
- [`docs/ops/audits/FARMACIA_VISUAL_AUDIT_CLAUDE_20260606.md`](/docs/ops/audits/FARMACIA_VISUAL_AUDIT_CLAUDE_20260606.md)
- [`docs/ops/audits/FARMACIA_VISUAL_AUDIT_GLOBAL_CLAUDE_20260606.md`](/docs/ops/audits/FARMACIA_VISUAL_AUDIT_GLOBAL_CLAUDE_20260606.md)

---

## 5. Documentos archivados / legacy (no son fuentes actuales)

> Estos documentos se conservan como evidencia histórica. No deben usarse como fuentes de verdad actuales.

| Documento | Ubicación de archivo | Motivo |
|---|---|---|
| Changelog legacy | [`docs/archive/CHANGELOG_20260307.md`](/docs/archive/CHANGELOG_20260307.md) | Duplicado y obsoleto frente a [`CHANGELOG.md`](/CHANGELOG.md). |
| Estado de implementación legacy | [`docs/archive/ESTADO_IMPLEMENTACION_20260307.md`](/docs/archive/ESTADO_IMPLEMENTACION_20260307.md) | Obsoleto (2026-03-07); no refleja Reuma v2, LES, Sjögren, prebiológico, FH ni Farmacia. |
| Contrato de datos unificado legacy | [`docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md`](/docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md) | Reemplazado para Reuma por [`docs/CONTRATO_DATOS_REUMA_V2.md`](/docs/CONTRATO_DATOS_REUMA_V2.md). |

---

## 6. Documentos operativos extensos (logs y evidencia, no lectura inicial)

> Estos documentos son valiosos para trazabilidad operativa, pero no son el punto de entrada para nuevos colaboradores.

- [`docs/farmacia_branch_manifest_20260614.md`](/docs/farmacia_branch_manifest_20260614.md) — manifiesto completo de ramas, WOs y evolución Farmacia.
- Documentos `docs/ops/FARMACIA_V0_3_*` — evolución post-demo v0.3.
- Documentos `docs/ops/FARMACIA_V0_4_*` — evolución v0.4.
- [`docs/ops/FARMACIA_V0_5_PROGRAMMING_MODEL_REFACTOR_20260611.md`](/docs/ops/FARMACIA_V0_5_PROGRAMMING_MODEL_REFACTOR_20260611.md) — refactor v0.5.
- [`docs/ops/NIGHTLY_FARMACIA_IMPLEMENTATION_REPORT_20260606.md`](/docs/ops/NIGHTLY_FARMACIA_IMPLEMENTATION_REPORT_20260606.md) — reporte nocturno de implementación.
- [`docs/ops/audits/FARMACIA_VISUAL_AUDIT_*`](/docs/ops/audits/) — auditorías visuales de la demo.
- [`docs/ops/PROMUEVE_HUB_FARMACIA_*`](/docs/ops/) — continuación, prompts y cierres de bloque.

---

## 7. Decisiones pendientes

| Tema | Estado | Dónde se documentará / decide |
|---|---|---|
| Integración de Farmacia preview en base canónica | Pendiente | Decisión humana; no autoriza este índice. Afecta a `feature/reuma-v2...` vs `preview/demo-lunes-wo4-20260614`. |
| Tags DEC-002 (`legacy-v1-main-antes-reuma-v2`, `v2.0.0-*`) | Pendiente | Decisión de Sil/Cora; requiere WO específica. |
| Nomenclatura externa (framework, piloto, módulos) | Propuesta / pendiente validación | [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md), sección 2. |
| Versionado unificado producto / técnico | Propuesta / pendiente | [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md), sección 6. |
| Control plane federado y configuración no-paciente | HOLD / propuesta derivada de `origin/docs/promueve-fh-control-plane-federado-20260713` | [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md); no es arquitectura aprobada ni implementada. |
| PROM Capture Gateway con QR permanente | Exploratorio avanzado / pendiente de validación | [`docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`](/docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md); no autoriza datos reales, producción ni despliegue sin validación institucional/STIC/DPO. |
| Identity Plane local y Nursing Readiness Gateway | Exploratorio avanzado / pendiente de validación | [`docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md`](/docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md) + roadmap post-SES. No autoriza datos reales, producción ni despliegue sin validación institucional/STIC/DPO. |
| Treatment Lifecycle Engine y renovaciones | Exploratorio avanzado / pendiente validación | Arquitectura por línea de tratamiento, fechas confirmadas/estimadas, reglas configurables, roles y scheduler futuro. No autoriza automatización productiva ni datos reales. |
| Destino del HOLD `origin/docs/promueve-fh-control-plane-federado-20260713` | Pendiente | Decisión humana: integrar, descartar o redefinir. No mergear sin WO. |

---

*Índice generado en el contexto de `WO-DOC-INDEX-CONTROL-PLANE-POST-SES-01-20260713`. No autoriza cambios de código, merges ni integraciones.*
