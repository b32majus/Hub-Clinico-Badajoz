# Índice documental maestro — Hub Clínico Badajoz / PROMueve Nexus

| Metadato | Valor |
|---|---|
| Última actualización | 2026-08-05 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama publicada Farmacia | `origin/recovery/farmacia-pr-replay-20260727` |
| HEAD regional publicado verificado | `a94a42f1d603e4259aece09c14b18ae19a74fefc` |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.3` |
| Rama documental de esta edición | `work/doc-fh-post-ledger-workbook-reconciliation-01-20260805` |

> Este índice orienta. La verdad funcional procede del código publicado, el manifest del despliegue, el estado vivo y los contratos relacionados. No convierte propuestas arquitectónicas en capacidades implementadas.

> La PR que publique esta edición generará un merge SHA posterior. Por ello se registra la base Git de la edición y, por separado, el último SHA que modificó código funcional; el HEAD actual se verifica siempre en GitHub.

---

## 1. Lectura recomendada actual

1. [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md) — estado publicado actual, incluida la retirada del ledger del runtime soportado y el workbook Excel Bridge publicado.
2. [`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md) — plan operativo 2026-07-31 a 2026-08-15.
3. [`docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`](/docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md) — secuencia WO1–WO9; WO6 fusionada y verificada, WO7 siguiente.
4. [`docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](/docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md) — decisión vigente reconciliada con ledger retirado del runtime, workbook implementado y procesamiento longitudinal aún pendiente.
5. [`docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md`](/docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md) — core candidate `2.0.0-draft.1` integrado en recovery y visible desde PR #227 mediante Export v2 demo paralelo; no equivale a cutover.
6. [`docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md) — adaptador interno de Validación v2 integrado mediante PR #215.
7. [`docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md) — adaptador interno de Primera Visita v2 integrado mediante PR #217.
8. [`docs/ops/WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01.md`](/docs/ops/WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01.md) — adaptador interno de Seguimiento v2 integrado mediante PR #221.
9. [`docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Seguimiento v2; integrado mediante PR #221.
10. [`docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](/docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md) — arquitectura objetivo V4 por planos.
11. [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) — roadmap post-SES y relación V4/V4.5/V5.
12. [`AGENTS.md`](/AGENTS.md) — reglas operativas de agentes y Git.

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
| HEAD regional publicado | `a94a42f1d603e4259aece09c14b18ae19a74fefc` |
| Activación funcional Export v2 demo | `fe84d83c7d3574840696c9fed70f98e581ec8916` (PR #227) |
| Retirada del ledger del runtime soportado | `b1ee11e00affa39c4a91626bb03f493fbcdce7d9` (PR #231), merge `19867ef16127548d0b596482360d8e5cbe6e54e5` |
| Workbook Excel Bridge Cáceres | `c286afab70c0e396f16378212e6e29cf56792064` (PR #233), merge/HEAD `a94a42f1d603e4259aece09c14b18ae19a74fefc` |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.3` |
| Fuente funcional del snapshot | `815e16f9564c82f469a95745c5c6917593a8c3f0` |
| QA pública regional del HEAD actual | PR #231: ledger ausente del runtime soportado, sin restauración ni acceso a la clave legacy; PR #233: smoke PASS y QA manual Microsoft Excel PASS; no equivale a QA integral ni piloto |
| QA humana Cáceres | PASS |
| Core Export v2 | Integrado en recovery; consumido internamente por los adaptadores de Validación, Primera Visita y Seguimiento |
| Validación v2 | Export v2 demo paralelo visible mediante interacción soportada desde PR #227 |
| Primera Visita v2 | Export v2 demo paralelo visible; adaptador `1..N` por líneas explícitas aunque la UI actual pueda mostrar una |
| Seguimiento v2 | Export v2 demo paralelo visible; `1..N`, una fila por línea explícitamente activa |
| Export v2 demo paralelo | TSV común de 152 columnas: Validación 1 fila; Primera Visita/Seguimiento `1..N`; `unknown/stale` bloquea solo v2 |
| Ledger clínico en runtime | Retirado de Validación, Primera Visita y Seguimiento; módulo histórico permanece versionado y desacoplado |
| `sessionStorage` | Imports y snapshots de contexto aún lo utilizan; retirada pendiente con reemplazo |
| Excel Bridge | Workbook operativo creado y verificado: `01_DERMA`, `03_DIGESTIVO`, 152 columnas y 16 shells técnicos vacíos |
| Office Script / tablas relacionales | Pendiente — siguiente WO aprobada en la secuencia |
| `APP_*` / Read Adapter / roundtrip | Pendientes después de WO7 |
| Cutover completo / retirada v1 | No; aplazados |
| Salida pública v1 | Preservada (61 columnas) |
| `main` | No modificada |
| Datos | Exclusivamente sintéticos |
| Piloto real | No |

> Desde PR #193 se publicaron la reconciliación y promoción de Cáceres 0.3, el ledger/workbook técnico de evaluación, la realineación del flujo y la corrección P0 del Excel de Primera Visita. PR #231 retiró el ledger del runtime soportado sin introducir persistencia alternativa. El HEAD regional actual tiene QA pública focal, pero continúa sin acreditación para piloto real.

> PR #223 reconcilió Seguimiento v2; PR #225 publicó el proveedor técnico cerrado a FH-001/FH-004; PR #227 activó Export v2 demo visible en paralelo; PR #233 publicó el workbook operativo del Bridge. No existe cutover completo ni retirada v1: JARA, CSV y Excel v1 de 61 columnas permanecen intactos, las versiones siguen en `draft` y el circuito longitudinal todavía carece de Office Script, `APP_*`, Read Adapter y roundtrip.

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
- cardinalidad por acto: Validación genera 1 fila; Primera Visita `1..N` por líneas explícitamente presentes; Seguimiento `1..N` por líneas explícitamente activas;
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
- [`docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](/docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md)
- [`docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md) — reporte operativo de WO2 (Validación v2)
- [`docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md) — reporte operativo de WO3 (Primera Visita v2)
- [`docs/ops/WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01.md`](/docs/ops/WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01.md) — reporte operativo de WO4 (Seguimiento v2)
- Los planes históricos de recuperación PR replay y rescate V4 citados en ediciones previas no están publicados en la rama `recovery`; no se usan como estado vivo.
- [`docs/farmacia_wo_execution_protocol.md`](/docs/farmacia_wo_execution_protocol.md)

### Contratos

- [`docs/farmacia_data_contracts.md`](/docs/farmacia_data_contracts.md) — contrato regional actualizado por PR #193 con `CADA_3_SEMANAS`; incluido en la fuente funcional promovida a `CÁCERES-REVIEW-0.3`.
- [`docs/farmacia_treatment_data_contract.md`](/docs/farmacia_treatment_data_contract.md)
- [`docs/farmacia_export_longitudinal_contract_WO8.md`](/docs/farmacia_export_longitudinal_contract_WO8.md) — v3 reconciliada: fila común v2, Seguimiento por línea activa y Excel Bridge
- [`docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`](/docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md) — orden exacto WO1–WO9; WO6 publicada y WO7 siguiente
- [`docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md`](/docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md) — core candidate `2.0.0-draft.1` integrado; Export v2 demo paralelo visible desde PR #227, sin cutover ni retirada v1
- [`docs/contracts/FARMACIA_EXPORT_V2_VALIDATION_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_VALIDATION_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Validación v2; integrado mediante PR #215
- [`docs/contracts/FARMACIA_EXPORT_V2_FIRST_VISIT_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_FIRST_VISIT_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Primera Visita v2; integrado mediante PR #217
- [`docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Seguimiento v2; integrado mediante PR #221
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

*Edición reconciliada post-PR #231/#233. Export v2 demo sigue visible en paralelo con 152 columnas por fila; el ledger ya no se carga en el runtime soportado y el workbook operativo del Excel Bridge está publicado y probado en Microsoft Excel. No existe todavía Office Script, tablas relacionales pobladas, `APP_*`, Read Adapter, roundtrip, cutover completo, retirada v1 ni promoción a `2.0.0`. JARA, CSV y Excel v1 de 61 columnas permanecen preservados. No autoriza piloto, datos reales, producción, FHIR/openEHR o Identity Plane operativo.*
