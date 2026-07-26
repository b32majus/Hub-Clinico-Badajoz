# Índice documental maestro — Hub Clínico Badajoz / PROMueve

| Metadato | Valor |
|---|---|
| Última actualización | 2026-07-27 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama de rescate integrada | `origin/rescue/farmacia-v4`. Último HEAD funcional reconciliado: `c5a0da77fb8707c6d85cb4e3f8f67df331aaec1e` (PR #144 / issue #143, completados). PR #142 / issue #141 completaron antes la reconciliación exclusivamente documental en `d2c4d88d204fe2a8600a41067065aebb33a782d4`; no constituyó un HEAD funcional nuevo. |
| Fuente Pages configurada/publicada | `origin/preview/demo-lunes-wo4-20260614` en `2ee3b34739abec874424a572d445798fef565765` |
| Ref candidata coincidente | `origin/preview/farmacia-v4-rescue` también en `2ee3b34739abec874424a572d445798fef565765`; no es una segunda fuente Pages publicada |
| Trazabilidad de publicación temporal | El issue #80 inició el movimiento de Pages hasta `8902aa334ab2ed51ae47c187603595f6e75f9d92`; el avance posterior hasta el SHA actual no se atribuye a ese issue |
| Rama de trabajo de este índice | `work/docs/fh-post-pr144-followup-e2e-guard-reconciliation-v4-20260727` |

> Este índice es una guía de navegación. No sustituye a los documentos que referencia; su función es orientar sobre qué documento consultar para cada propósito y qué estado tiene.

---

## 1. Lectura recomendada para incorporarse al proyecto (máximo 5 documentos)

1. [`README.md`](/README.md) — visión general, contexto y alcance del proyecto.
2. [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) — estado post-reunión SES, fases propuestas, decisiones cerradas y pendientes.
3. [`AGENTS.md`](/AGENTS.md) — reglas operativas para agentes, ramas protegidas, datos prohibidos y definición de done.
4. [`docs/ops/AI_HARNESS_PROMUEVE_V1.md`](/docs/ops/AI_HARNESS_PROMUEVE_V1.md) — arnés OpenCode mínimo, agentes, modelos y procedimiento de work orders.
4. [`ARCHITECTURE.md`](/ARCHITECTURE.md) — arquitectura técnica e implementación actual (estado post-SES).
5. [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) — tablero de work orders y estado de ejecución.

> Después de estos cinco, el siguiente paso depende del interés: Reumatología → contrato y arquitectura funcional; Farmacia → [`docs/ops/PLAN_MAESTRO_RESCATE_FARMACIA_V4_20260724.md`](/docs/ops/PLAN_MAESTRO_RESCATE_FARMACIA_V4_20260724.md), [`docs/contratos/CONTRATO_ESCENARIOS_FARMACIA_V4.md`](/docs/contratos/CONTRATO_ESCENARIOS_FARMACIA_V4.md), manifiesto de ramas y documentos v0.3–v0.5; descubrimiento → guía Badajoz/Mérida.

---

## 2. Estado de ramas y fuentes de verdad

| Rama / ref | Estado | Fuente de verdad para | No es fuente de verdad para |
|---|---|---|---|
| `origin/main` | Legacy / stale. Congelada en `a25cccb` (2026-03-07). | Historia del proyecto antes de Reuma v2. | Estado actual, Reuma v2, Farmacia, Enfermería ni roadmap post-SES. |
| `origin/feature/reuma-v2-prebiologico-fh-les-sjogren` | Base canónica viva de Reuma v2. | Reumatología multipatología, contrato Excel v2, decisiones DEC-001..019. | Post-demo Farmacia (v0.3–v0.5), preview publicada ni decisiones post-SES. |
| `origin/rescue/farmacia-v4` | Integración viva del rescate V4. Último HEAD funcional reconciliado: `c5a0da77fb8707c6d85cb4e3f8f67df331aaec1e` (PR #144 / issue #143, completados). PR #142 / issue #141 fue la reconciliación exclusivamente documental `d2c4d88d204fe2a8600a41067065aebb33a782d4`, no un HEAD funcional nuevo. | S01–S08 cerrados en su alcance técnico previo. El cierre técnico E2E soportado enlaza contexto canónico activo → borrador por línea → persistido → visita demo confirmada → TXT/CSV/Excel canónicos. El guard de salida existe solo desde Seguimiento y usa exclusivamente el dirty real de `FarmaciaFollowupDraftsV4`: `isDirty()` es read-only y `beforePageExit()` es la API. Navegación limpia sin prompt; cancelar dirty conserva URL/UI/contexto/inputs/baseline/outputs y stores; aceptar dirty descarta solo el dirty de UI, preserva byte a byte borrador persistido, visitas confirmadas y multitratamiento, y al volver restaura únicamente lo persistido. Navega una vez al `href` exacto y evita un segundo `beforeunload`; `beforeunload` solo actúa con dirty real y nunca muta datos. Se probaron Inicio Farmacia, Validación, Primera Visita, Dashboard Paciente y Reumatología. S09 conserva identidad común TXT/CSV/Excel e invariancia dirty; S10 mantiene histórica visible/no elegible sin visita ni salidas; S11 aísla líneas activas y separa histórica; S12 cubre CIP, línea y salida de página desde Seguimiento. `PATIENT_NOT_FOUND` y `PATIENT_MISMATCH` fallan cerrado; smoke, contexto/S12, outputs y E2E están verdes, con consola/`pageerror` a cero. | No acredita publicación, demo-ready, piloto, producción, datos reales, backend o V5. El guard S12 no está implementado dentro de las pantallas destino ni acredita cierre clínico completo de Seguimiento. Siguen pendientes interpretación de adherencia/EA/PROM; DLQI calculado; causalidad; sospechoso, corrección y acciones de EA; respuesta clínica, alertas, recomendaciones, umbrales y tendencias; movimientos terapéuticos y dashboards. JARA real, firma clínica, validez legal y registro asistencial/productivo no están implementados. Legacy clínico, causalidad, movimientos y dashboards permanece inerte. |
| `origin/preview/demo-lunes-wo4-20260614` | Fuente Pages configurada/publicada; estado actual verificado `2ee3b34739abec874424a572d445798fef565765`, hasta PR #86. La cronología del movimiento inicial y el avance posterior se registra en las notas. | QA/demo supervisada del rescate publicado hasta Validación reversible pre-inicio. | PR #88 y posteriores, HEAD actual del rescate, piloto, producción ni datos reales. |
| `origin/preview/farmacia-v4-rescue` | Ref candidata coincidente en `2ee3b34739abec874424a572d445798fef565765`. | Comparación/candidata al mismo estado que la fuente Pages verificada. | Fuente Pages configurada independiente, segunda publicación, PR #88 y posteriores, piloto o producción. |
| `origin/backup/preview-hospital-before-v4-qa-20260725` | Referencia hospitalaria preservada en `35a2cdd58a43f588a94882824bf1de9444521ad6`; el baseline anterior `a6b15353...` queda como antecedente histórico. | Retorno y comparación del estado previo a la publicación temporal V4. | Rama de integración, estado actual del rescate o publicación vigente. |
| `origin/backup/preview-before-hospital-demo-rollback-20260722` | Estado avanzado preservado en `c19297b68cd188cc455ffcd7a45bc6831f8fb54a`. | Recuperación selectiva de código, contratos y tests posteriores al estado hospitalario. | Nueva base automática, restauración masiva, piloto o producción. |
| `origin/docs/promueve-fh-control-plane-federado-20260713` | **HOLD / propuesta arquitectónica. No mergear.** | Concepto de control plane federado y configuración no-paciente derivado del análisis post-SES. | Arquitectura aprobada, capacidad implementada ni decisión institucional. |
| `origin/work/*` | Ramas de trabajo en progreso o históricas. | Desarrollo atómico revisable; trazabilidad de WO. | Estado publicado ni canónico sin merge previo y validación. |
| `origin/preview/*` | Previews publicables / demos. | Referencia de demo validada para Pages. | Producción ni base canónica automática. |
| `origin/backup/*` y tags `farmacia-demo-lunes-*` | Puntos de retorno operativos. | Recuperar estados demo congelados. | No son ramas de desarrollo activo. |

> En PR #144, el guard de salida exclusivamente desde Seguimiento añadió solo la API mínima `isDirty()` read-only + `beforePageExit()`: no cambió esquema ni store y no introdujo identidades ficticias.

### Notas sobre ramas

- `main` es legacy por decisión DEC-001; su conservación obedece a DEC-002 (no eliminar sin trazabilidad). Los tags propuestos en DEC-002 aún no existen.
- La rama `feature/reuma-v2...` no contiene los avances V4 integrados en `rescue/farmacia-v4`.
- El issue #80 inició la publicación temporal llevando la fuente Pages `preview/demo-lunes-wo4-20260614` hasta `8902aa...`. La rama fue avanzada posteriormente y su estado actual verificado es `2ee3b347...` mediante PR #86. Esta reconciliación registra el estado actual sin atribuir todo el avance posterior al alcance original del issue #80. La candidata `preview/farmacia-v4-rescue` coincide en el SHA actual, pero no constituye una segunda fuente Pages publicada; ambas refs van por detrás del último HEAD funcional reconciliado `c5a0da77...` (PR #144). PR #88–#144 no están acreditados como publicados.
- `backup/preview-hospital-before-v4-qa-20260725` conserva en `35a2cdd...` la referencia previa al tramo de QA/publicación V4; `a6b15353...` permanece como baseline hospitalario anterior en la historia.
- `backup/preview-before-hospital-demo-rollback-20260722` se conserva como cantera de recuperación selectiva; no debe usarse como rama de integración ni restaurarse en bloque.
- El HOLD `docs/promueve-fh-control-plane-federado-20260713` contiene una propuesta de control plane federado; su destino (integrar, descartar o redefinir) es una decisión pendiente.

---

## 3. Documentos canónicos actuales

| Documento | Estado | Sirve para | No sirve para |
|---|---|---|---|
| [`AGENTS.md`](/AGENTS.md) | Vigente | Gobernanza operativa de agentes, ramas, commits, DoD. | Decisiones clínicas ni arquitectura funcional detallada. |
| [`docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md`](/docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md) | Parcial | Marco operativo completo, pipeline v1. | Modelo operativo v2 Cora-Hermes (parcialmente reflejado en `AGENTS.md`). |
| [`docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`](/docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md) | Vigente | Decisiones cerradas DEC-001..019. | Aprobación de tags DEC-002 (pendientes) ni decisiones post-SES. |
| [`docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`](/docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md) | Parcial | Visión funcional de Reuma v2 y planificación inicial. | Estado real de Farmacia post-demo (aún describe Farmacia como no implementado). |
| [`ARCHITECTURE.md`](/ARCHITECTURE.md) | Vigente post-SES | Arquitectura técnica, módulos, flujo de datos, transición propuesta. | Aprobación institucional ni producción. |
| [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) | Propuesta canónica post-SES | Estado post-SES, fases propuestas, decisiones pendientes, nomenclatura provisional. | Arquitectura aprobada ni plan de implementación vinculante. |
| [`docs/ops/PLAN_MAESTRO_RESCATE_FARMACIA_V4_20260724.md`](/docs/ops/PLAN_MAESTRO_RESCATE_FARMACIA_V4_20260724.md) | Plan vivo reconciliado hasta PR #144 | Gobierno y estado del rescate V4, referencias, fases, dependencias, aptitud y trabajo restante. | Autorización automática de código, publicación, piloto, backend o V5. |
| [`docs/contratos/CONTRATO_ESCENARIOS_FARMACIA_V4.md`](/docs/contratos/CONTRATO_ESCENARIOS_FARMACIA_V4.md) | Integrado en PR #64 | Contrato sintético/no inferencial S01–S12 que gobierna el rescate V4. | Evidencia por sí solo de implementación, publicación, demo-ready o piloto. |
| [`CHANGELOG.md`](/CHANGELOG.md) | Vigente | Release log principal del proyecto. | Historial detallado de WOs (ver `WORK_ORDER_STATUS.md`). |
| [`docs/CONTRATO_DATOS_REUMA_V2.md`](/docs/CONTRATO_DATOS_REUMA_V2.md) | Vigente | Contrato Excel 497 columnas para Reuma v2. | Farmacia, Enfermería ni contratos interservicios definitivos. |
| [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) | Vigente | Estado y trazabilidad de work orders. | Decisiones de arquitectura ni contratos clínicos. |
| [`docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md`](/docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md) | Vigente | Protocolo de fases F0–F6 y plan formativo. | Cronograma ejecutivo ni asignación de recursos. |
| [`docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md`](/docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md) | Vigente post-SES | Decisión reversible de no integrar Farmacia en main ni Reuma v2 por ahora. | Autorización de merge ni campos finales. |
| [`docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md`](/docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md) | Vigente | Guía práctica de reuniones discovery Badajoz/Mérida. | Contratos clínicos ni integraciones aprobadas. |
| [`docs/farmacia_branch_manifest_20260614.md`](/docs/farmacia_branch_manifest_20260614.md) | Parcial / log operativo | Historial operativo de ramas y WOs Farmacia. | Roadmap ejecutivo ni documento canónico de arquitectura. |
| [`docs/farmacia_data_contracts.md`](/docs/farmacia_data_contracts.md) | Vigente (preview) | Contrato de pautas Farmacia en preview. | Contrato clínico definitivo sin validación. |
| [`docs/farmacia_treatment_data_contract.md`](/docs/farmacia_treatment_data_contract.md) | Vigente (preview) | Contrato de tratamiento Farmacia en preview. | Contrato clínico definitivo sin validación. |
| [`docs/farmacia_wo_execution_protocol.md`](/docs/farmacia_wo_execution_protocol.md) | Vigente | Protocolo de ejecución de WOs Farmacia. | Otros módulos ni decisiones de alcance. |

---

## 4. Documentos por línea de trabajo

### General, roadmap y gobernanza
- [`README.md`](/README.md)
- [`ARCHITECTURE.md`](/ARCHITECTURE.md)
- [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md)
- [`docs/ops/PLAN_MAESTRO_RESCATE_FARMACIA_V4_20260724.md`](/docs/ops/PLAN_MAESTRO_RESCATE_FARMACIA_V4_20260724.md)
- [`docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`](/docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md)
- [`AGENTS.md`](/AGENTS.md)
- [`docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md`](/docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md)
- [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md)
- [`docs/ops/WORK_ORDER_TEMPLATE.md`](/docs/ops/WORK_ORDER_TEMPLATE.md)
- [`docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md`](/docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md)
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
- [`docs/ops/PLAN_MAESTRO_RESCATE_FARMACIA_V4_20260724.md`](/docs/ops/PLAN_MAESTRO_RESCATE_FARMACIA_V4_20260724.md)
- [`docs/contratos/CONTRATO_ESCENARIOS_FARMACIA_V4.md`](/docs/contratos/CONTRATO_ESCENARIOS_FARMACIA_V4.md)
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
- [`docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md`](/docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md)
- [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md)
- [`docs/ops/WORK_ORDER_TEMPLATE.md`](/docs/ops/WORK_ORDER_TEMPLATE.md)
- [`docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md`](/docs/ops/HERMES_EXECUTION_REPORT_TEMPLATE.md)
- [`docs/ops/NIGHTLY_GREEN_BATCH_REPORT_20260606.md`](/docs/ops/NIGHTLY_GREEN_BATCH_REPORT_20260606.md)

### Contratos y plantillas
- [`docs/CONTRATO_DATOS_REUMA_V2.md`](/docs/CONTRATO_DATOS_REUMA_V2.md)
- [`docs/template_ar_excel.md`](/docs/template_ar_excel.md), [`docs/template_les_excel.md`](/docs/template_les_excel.md), [`docs/template_prebiologico_excel.md`](/docs/template_prebiologico_excel.md), [`docs/template_sjogren_excel.md`](/docs/template_sjogren_excel.md), [`docs/template_solicitud_fh.md`](/docs/template_solicitud_fh.md)
- [`docs/farmacia_data_contracts.md`](/docs/farmacia_data_contracts.md)
- [`docs/farmacia_treatment_data_contract.md`](/docs/farmacia_treatment_data_contract.md)
- [`docs/contratos/CONTRATO_ESCENARIOS_FARMACIA_V4.md`](/docs/contratos/CONTRATO_ESCENARIOS_FARMACIA_V4.md)
- Otros borradores de `docs/contratos/` asociados a `work/hermes/wo-002-contratos-minimos` siguen exploratorios/pausados y no están disponibles en el árbol actual.

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
| Destino canónico posterior del rescate Farmacia V4 | Pendiente | El rescate está integrado en `rescue/farmacia-v4`; su integración futura con otras líneas requiere decisión humana y WO específica. |
| Seguimiento V4 S09–S12 | Cierre técnico E2E soportado; cierre clínico pendiente | La cadena demostrada es contexto canónico activo → borrador por línea → persistido → visita demo confirmada → TXT/CSV/Excel canónicos. PR #144 añade guard de salida exclusivamente desde Seguimiento sobre dirty real de `FarmaciaFollowupDraftsV4`; no implementa guard dentro de destinos. La API mínima es `isDirty()` read-only + `beforePageExit()`, sin cambio de esquema ni store y sin identidades ficticias. Limpio no pregunta; cancelar dirty conserva todo; aceptar descarta solo UI dirty, conserva byte a byte borrador persistido, visitas y multitratamiento, restaura después solo persistido y navega una vez al `href` exacto sin segundo `beforeunload`. `beforeunload` nunca muta. Probado hacia Inicio Farmacia, Validación, Primera Visita, Dashboard Paciente y Reumatología. S09–S12, `PATIENT_NOT_FOUND`/`PATIENT_MISMATCH`, smoke, contexto/S12, outputs y E2E pasan con consola/`pageerror` cero. Persisten pendientes interpretación de adherencia/EA/PROM, DLQI calculado, causalidad, sospechoso/corrección/acciones de EA, respuesta clínica, alertas/recomendaciones/umbrales/tendencias, movimientos terapéuticos y dashboards. JARA real, firma/validez legal y registro asistencial/productivo no existen; legacy clínico, causalidad, movimientos y dashboards sigue inerte. |
| Dashboards V4 | Pendientes posteriores | No están reconstruidos contra la fuente canónica. |
| Publicación, release y freeze V4 | Pendientes separados | El último HEAD funcional reconciliado no está publicado ni congelado. La fuente Pages y la candidata permanecen en `2ee3b347...` mediante PR #86; PR #88–#144 no están acreditados en Pages y el estado actual no está acreditado como demo-ready, piloto ni producción. |
| Tags DEC-002 (`legacy-v1-main-antes-reuma-v2`, `v2.0.0-*`) | Pendiente | Decisión de Sil/Cora; requiere WO específica. |
| Nomenclatura externa (framework, piloto, módulos) | Propuesta / pendiente validación | [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md), sección 2. |
| Versionado unificado producto / técnico | Propuesta / pendiente | [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md), sección 6. |
| Control plane federado y configuración no-paciente | HOLD / propuesta derivada de `origin/docs/promueve-fh-control-plane-federado-20260713` | [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md); no es arquitectura aprobada ni implementada. |
| PROM Capture Gateway con QR permanente | Exploratorio avanzado / pendiente de validación | [`docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`](/docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md); no autoriza datos reales, producción ni despliegue sin validación institucional/STIC/DPO. |
| Identity Plane local y Nursing Readiness Gateway | Exploratorio avanzado / pendiente de validación | [`docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md`](/docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md) + roadmap post-SES. No autoriza datos reales, producción ni despliegue sin validación institucional/STIC/DPO. |
| Treatment Lifecycle Engine y renovaciones | Exploratorio avanzado / pendiente validación | Arquitectura por línea de tratamiento, fechas confirmadas/estimadas, reglas configurables, roles y scheduler futuro. No autoriza automatización productiva ni datos reales. |
| Destino del HOLD `origin/docs/promueve-fh-control-plane-federado-20260713` | Pendiente | Decisión humana: integrar, descartar o redefinir. No mergear sin WO. |

---

*Índice generado en el contexto de `WO-DOC-INDEX-CONTROL-PLANE-POST-SES-01-20260713` y reconciliado actualmente hasta PR #144. `WO-DOC-FH-POST-PR140-CANONICAL-OUTPUTS-RECONCILIATION-V4-01` quedó completada por PR #142 / issue #141 mediante merge documental `d2c4d88d204fe2a8600a41067065aebb33a782d4`, que no fue un HEAD funcional nuevo. `WO-FH-FOLLOWUP-E2E-NAVIGATION-GUARD-V4-01` quedó completada por PR #144 / issue #143 y fijó el HEAD funcional `c5a0da77fb8707c6d85cb4e3f8f67df331aaec1e`. La reconciliación actual `WO-DOC-FH-POST-PR144-FOLLOWUP-E2E-GUARD-RECONCILIATION-V4-01` (issue #145) está `READY_FOR_CORA_REVIEW`, sin PR ni merge. No autoriza cambios de código, publicación, merges ni integraciones.*
