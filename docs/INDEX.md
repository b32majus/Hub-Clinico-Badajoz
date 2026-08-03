# Índice documental maestro — Hub Clínico Badajoz / PROMueve Nexus

| Metadato | Valor |
|---|---|
| Última actualización | 2026-08-03 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama publicada Farmacia | `origin/recovery/farmacia-pr-replay-20260727` |
| Base Git publicada de esta edición | `c45b7d13d4de7d145087333b2c11d3e9d2135dd3` |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.3` |
| Rama documental de esta edición | `work/fh-export-v2-adapters-doc-reconciliation-01-20260803` |

> Este índice orienta. La verdad funcional procede del código publicado, el manifest del despliegue, el estado vivo y los contratos relacionados. No convierte propuestas arquitectónicas en capacidades implementadas.

> La PR que publique esta edición generará un merge SHA posterior. Por ello se registra la base Git de la edición y, por separado, el último SHA que modificó código funcional; el HEAD actual se verifica siempre en GitHub.

---

## 1. Lectura recomendada actual

1. [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md) — estado publicado actual, trazabilidad, QA y feedback de Farmacia.
2. [`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md) — plan operativo 2026-07-31 a 2026-08-15.
3. [`docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`](/docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md) — secuencia WO1–WO9 y gates de revisión.
4. [`docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md`](/docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md) — core candidate `2.0.0-draft.1` integrado en recovery; consumido internamente por los adaptadores de Validación y Primera Visita; sin salida pública v2 ni cutover.
5. [`docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md) — adaptador interno de Validación v2 integrado mediante PR #215.
6. [`docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md) — adaptador interno de Primera Visita v2 integrado mediante PR #217.
7. [`docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](/docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md) — arquitectura objetivo V4 por planos.
8. [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) — roadmap post-SES y relación V4/V4.5/V5.
9. [`AGENTS.md`](/AGENTS.md) — reglas operativas de agentes y Git.

Para ejecución y merges: [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md).

---

## 2. Orden de verdad

1. Instrucción o WO actual.
2. GitHub: código y documentación publicados.
3. Este índice.
4. `docs/ops/WORK_ORDER_STATUS.md`.
5. Documento vivo más reciente relacionado.
6. Documentos históricos y biblioteca.

Una rama, SHA, prioridad o PR recordados no son fuente de verdad sin verificación.

---

## 3. Ramas y referencias

| Rama / ref | Estado | Fuente de verdad para | No es fuente de verdad para |
|---|---|---|---|
| `origin/main` | Legacy / congelada | Historia previa a Reuma v2 | Estado actual |
| `origin/feature/reuma-v2-prebiologico-fh-les-sjogren` | Base canónica Reuma v2 | Reumatología y contrato Excel v2 | Farmacia recovery |
| `origin/recovery/farmacia-pr-replay-20260727` | **Rama regional publicada Farmacia** | Código Farmacia y snapshots hospitalarios | Piloto, producción o datos reales |
| `previews/caceres-fh/` | **Snapshot estable 0.3** | Evaluación Pharmacy-only Cáceres | Evolución regional automática |
| `origin/preview/demo-lunes-wo4-20260614` | Histórico | Evidencia post-demo y documentación de origen | Desarrollo publicado vigente |
| `origin/docs/promueve-fh-control-plane-federado-20260713` | HOLD | Cantera histórica del concepto Control Plane | Arquitectura aprobada o rama a mergear |
| `origin/work/*`, `origin/docs/*` | Trabajo/revisión | WOs atómicas | Estado publicado sin merge |
| `origin/backup/*` y tags demo | Retorno | Recuperación de estados | Desarrollo activo |

### Reglas

- No tocar `main` sin autorización explícita.
- Reuma v2 y Farmacia permanecen separadas mientras siga vigente la decisión de no merge.
- El snapshot Cáceres solo cambia por promoción explícita desde un SHA regional aprobado.
- No editar manualmente `previews/caceres-fh/`.

---

## 4. Estado vivo de Farmacia

| Elemento | Estado actual |
|---|---|
| Rama | `recovery/farmacia-pr-replay-20260727` |
| Base Git de esta edición | `c45b7d13d4de7d145087333b2c11d3e9d2135dd3` |
| Último SHA funcional regional | `c42eeceffa7a3a9b751576d3338d11132f10b3f0` |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.3` |
| Fuente funcional del snapshot | `815e16f9564c82f469a95745c5c6917593a8c3f0` |
| QA pública regional del HEAD actual | PASS focal para realineación del flujo y Excel de Primera Visita; core v2 y adaptadores internos con smoke-check PASS en PR #215/#217; no equivale a QA integral de piloto |
| QA humana Cáceres | PASS |
| Core Export v2 | Integrado en recovery; consumido internamente por los adaptadores |
| Validación v2 | Integrada internamente mediante PR #215; sin salida pública v2 |
| Primera Visita v2 | Integrada internamente mediante PR #217; sin salida pública v2 |
| Salida pública v2 / cutover | No |
| Salida pública v1 | Preservada (61 columnas) |
| `main` | No modificada |
| Datos | Exclusivamente sintéticos |
| Piloto real | No |

> Desde PR #193 se publicaron la reconciliación y promoción de Cáceres 0.3, el ledger/workbook técnico de evaluación, la realineación del flujo y la corrección P0 del Excel de Primera Visita. El HEAD regional actual tiene QA pública focal, pero continúa sin acreditación para piloto real.

> Desde PR #215 y PR #217, los adaptadores internos de Validación y Primera Visita v2 están integrados en recovery sobre el core (PR #211). No existe salida pública v2 ni cutover; la salida Excel v1 de 61 columnas permanece preservada y `main` no ha sido modificada. El circuito v2 completo no está apto todavía para piloto real.

Documento vivo reconciliado: [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md).

El documento [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md) queda histórico y superseded como estado vivo; conserva la fotografía de `CÁCERES-REVIEW-0.1`.

---

## 5. Plan y arquitectura V4

### Plan operativo

[`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md)

Define:

- entrega rápida del 2026-08-03;
- modelo canónico;
- Export Manager;
- Excel Bridge;
- roundtrip;
- Control Plane Supabase;
- CIMA;
- parsers;
- renovaciones;
- FHIR/openEHR;
- dependencias y WOs.

### Arquitectura objetivo

[`docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](/docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md)

Decisiones principales:

- `PROMueve Nexus` como plataforma provisional;
- `FarmaNEXus` como módulo Farmacia;
- V4 local-first y backend-ready;
- un Data Plane por hospital;
- Supabase solo para configuración no-paciente;
- CIMA oficial versionado en GitHub;
- Identity Plane físico diferido hasta servidor/PROM Gateway automatizado;
- un acto canónico puede proyectarse en 1..N filas; Seguimiento v2 usa visita × línea activa;
- modelo canónico como fuente de Excel, JARA, FHIR y openEHR;
- V5 agnóstica diferida.

---

## 6. Documentos canónicos generales

| Documento | Estado | Uso |
|---|---|---|
| [`AGENTS.md`](/AGENTS.md) | Vigente con metadata histórica pendiente de alinear | Gobernanza operativa |
| [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) | Vigente | Trazabilidad de WOs y PRs |
| [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) | Propuesta canónica + addendum 2026-07-31 | Evolución post-SES |
| [`docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md`](/docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md) | Vigente | Separación Reuma/Farmacia |
| [`docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md`](/docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md) | Vigente | Discovery Badajoz/Mérida |
| [`docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`](/docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md) | Vigente para DEC-001..019 | Decisiones históricas Reuma |
| [`docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md`](/docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md) | Vigente | Aprendizaje y decisiones por fases |

---

## 7. Reumatología

Fuentes principales:

- [`docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`](/docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md)
- [`docs/CONTRATO_DATOS_REUMA_V2.md`](/docs/CONTRATO_DATOS_REUMA_V2.md)
- [`docs/PLAN_IMPLEMENTACION_REUMA_V2.md`](/docs/PLAN_IMPLEMENTACION_REUMA_V2.md)
- [`docs/RESUMEN_RELEASE_REUMA_V2.md`](/docs/RESUMEN_RELEASE_REUMA_V2.md)
- [`docs/CHECKLIST_E2E_CLINICO_V2.md`](/docs/CHECKLIST_E2E_CLINICO_V2.md)
- [`docs/VALIDACION_MANUAL_DEMO_V2.md`](/docs/VALIDACION_MANUAL_DEMO_V2.md)

El contrato ancho de Reuma no debe reutilizarse automáticamente como modelo V4 de Farmacia ni normalizarse sin WO específica.

---

## 8. Farmacia Hospitalaria

### Estado y ejecución

- [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md)
- [`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md)
- [`docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md) — reporte operativo de WO2 (Validación v2)
- [`docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md) — reporte operativo de WO3 (Primera Visita v2)
- Los planes históricos de recuperación PR replay y rescate V4 citados en ediciones previas no están publicados en la rama `recovery`; no se usan como estado vivo.
- [`docs/farmacia_wo_execution_protocol.md`](/docs/farmacia_wo_execution_protocol.md)

### Contratos

- [`docs/farmacia_data_contracts.md`](/docs/farmacia_data_contracts.md) — contrato regional actualizado por PR #193 con `CADA_3_SEMANAS`; incluido en la fuente funcional promovida a `CÁCERES-REVIEW-0.3`.
- [`docs/farmacia_treatment_data_contract.md`](/docs/farmacia_treatment_data_contract.md)
- [`docs/farmacia_export_longitudinal_contract_WO8.md`](/docs/farmacia_export_longitudinal_contract_WO8.md) — v3 reconciliada: fila común v2, Seguimiento por línea activa y Excel Bridge
- [`docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`](/docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md) — orden exacto WO1–WO9
- [`docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md`](/docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md) — core candidate `2.0.0-draft.1` integrado en recovery; consumido internamente por los adaptadores de Validación y Primera Visita; sin salida pública v2 ni cutover
- [`docs/contracts/FARMACIA_EXPORT_V2_VALIDATION_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_VALIDATION_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Validación v2; integrado mediante PR #215
- [`docs/contracts/FARMACIA_EXPORT_V2_FIRST_VISIT_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_FIRST_VISIT_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Primera Visita v2; integrado mediante PR #217
- El contrato de escenarios Farmacia V4 citado en ediciones previas no está publicado en `recovery`; su incorporación formal permanece pendiente.

### Historia y auditoría

- [`docs/farmacia_branch_manifest_20260614.md`](/docs/farmacia_branch_manifest_20260614.md) — inventario histórico extenso.
- [`docs/ops/audits/FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md`](/docs/ops/audits/FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md)
- `docs/ops/FARMACIA_V0_3_*`, `FARMACIA_V0_4_*`, `FARMACIA_V0_5_*` — exploración histórica, no estado vivo.

---

## 9. Enfermería, PROMs e identidad

- [`docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md`](/docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md)
- [`docs/farmacia_enfermeria_excel_sintetico_gap_WO8.md`](/docs/farmacia_enfermeria_excel_sintetico_gap_WO8.md)
- [`docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`](/docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md)
- [`docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md`](/docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md)

Decisión 2026-07-31: el Identity Plane físico no se implementa durante el ciclo de vacaciones. Se reservan identificadores e interfaz, pero se evita todo doble registro manual hasta disponer de servidor/PROM Gateway automatizado.

---

## 10. Treatment Lifecycle y renovaciones

- [`docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`](/docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md)

Reglas vigentes:

- renovación por línea;
- fechas confirmadas, verificadas y estimadas separadas;
- JSON define reglas, no las ejecuta;
- tareas, alertas y notificaciones son conceptos distintos;
- no marcar renovado por silencio;
- Presalud solo alimentará el motor desde campos reales verificados.

---

## 11. Catálogo CIMA y catálogo local

- [`docs/ops/FARMACIA_V0_3_CIMA_AUTOUPDATE_PLAN_20260607.md`](/docs/ops/FARMACIA_V0_3_CIMA_AUTOUPDATE_PLAN_20260607.md)
- [`docs/deuda-tecnica/cdc-001-cima-auto-update.md`](/docs/deuda-tecnica/cdc-001-cima-auto-update.md)

Estado real:

- CIMA oficial puede permanecer versionado en GitHub.
- El snapshot Cáceres usa el artefacto de junio de 2026.
- No existe todavía una Action mensual activa.
- La futura Action debe extraer, validar, generar diff y abrir PR revisable.
- El catálogo local especial no se sobrescribe al actualizar CIMA.

---

## 12. Backend, Control Plane e interoperabilidad

- [`docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](/docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md)
- [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md)
- [`ARCHITECTURE.md`](/ARCHITECTURE.md) — útil, pero desactualizado respecto a recovery.

Fronteras:

- Excel Bridge: datos clínico-operativos por hospital.
- Supabase: configuración no-paciente.
- Identity Plane: servidor local futuro.
- FHIR/openEHR: adaptadores del modelo canónico, no conversión directa del Excel.
- V5: diferida.

---

## 13. Deuda documental abierta

Requiere WO posterior, sin mezclarla con quick wins clínicos:

| Documento | Deuda |
|---|---|
| `README.md` | Presenta Farmacia como no implementada |
| `ARCHITECTURE.md` | Baseline, ramas y persistencia Farmacia desactualizados |
| `CHANGELOG.md` | No recoge la línea recovery reciente |
| `AGENTS.md` | Metadata/rama base histórica; verificar arnés real antes de editar |
| `docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md` | Modelo operativo antiguo |
| `opencode.jsonc` | No existe en recovery; verificar entorno VPS antes de afirmar el arnés efectivo |
| Planes históricos PR replay/rescate V4 | Referenciados previamente, pero sus archivos no están publicados en recovery |
| Contrato de escenarios Farmacia V4 | Referenciado previamente, pero no publicado en recovery |

---

## 14. Documentos históricos / no usar como estado vivo

- [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md) — fotografía 0.1.
- [`docs/archive/CHANGELOG_20260307.md`](/docs/archive/CHANGELOG_20260307.md)
- [`docs/archive/ESTADO_IMPLEMENTACION_20260307.md`](/docs/archive/ESTADO_IMPLEMENTACION_20260307.md)
- [`docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md`](/docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md)
- ramas nocturnas/demo antiguas sin merge.

---

## 15. Decisiones pendientes

| Tema | Estado |
|---|---|
| Formato Presalud | Solicitado, pendiente |
| Diccionario regional de patologías | Solicitado, pendiente |
| Formulario Digestivo | Pendiente |
| Consenso SEFH/PROs | Preparación por Silvia |
| Trigger HTML Power Automate | Pendiente de PoC |
| Servidor local por hospital | Disponibilidad comunicada en Badajoz/Mérida; diseño pendiente |
| Identity Plane físico | Diferido hasta servidor/PROM Gateway automatizado |
| Auth/permisos | Pendiente institucional |
| Arquitectura FHIR/openEHR SES | Pendiente institucional |
| Nomenclatura externa PROMueve Nexus/FarmaNEXus | Provisional |

---

*Edición reconciliada por `WO-FH-EXPORT-V2-ADAPTERS-DOC-RECONCILIATION-01`. Core Export v2, Validación v2 y Primera Visita v2 están integrados internamente en recovery (PR #211, #215 y #217); no existe salida pública v2 ni cutover; la salida pública v1 permanece preservada y `main` no ha sido modificada. El circuito v2 completo no está apto todavía para piloto real; tampoco autoriza datos reales, producción, FHIR/openEHR o Identity Plane operativo.*
