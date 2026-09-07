# Índice documental maestro — Hub Clínico Badajoz / PROMueve Nexus

| Metadato | Valor |
| --- | --- |
| Última actualización | 2026-09-08 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama publicada Farmacia | `origin/recovery/farmacia-pr-replay-20260727` |
| HEAD publicado recovery | `19d10c9abefb7b25130b4b17e3289d54a17315ee` (merge issue #345 / PR #346 — promoción `CÁCERES-REVIEW-0.6`) |
| HEAD clínico funcional congelado | `e1120ba85817a1807cea8c1e938867ad778921f4` (PR #341; `source_sha`/`last_functional_sha` del snapshot 0.6) |
| Candidate Train C | `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` |
| Post-merge smoke | Farmacia smoke #1025 — `success` sobre `19d10c9abefb7b25130b4b17e3289d54a17315ee` |
| `origin/main` verificado | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68` |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.6` (issue #345 / PR #346; manifest source `e1120ba85817a1807cea8c1e938867ad778921f4`) |
| Snapshot 0.6 candidate | `749c82409a415e800500b39018027b189fd6a131` |
| Snapshot 0.6 publicación | merge `19d10c9abefb7b25130b4b17e3289d54a17315ee` (PR #346) |
| Paquete externo | `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`; no refrozen por PR #333/#335/#337/#341/#346 |
| Actividad del servicio | Demo |
| Alcance | Evaluación con datos sintéticos; sin piloto / sin producción |
| Work order actual | issue #347 — WO-DOC-FH-POST-CACERES-0.6-RECONCILIATION-01 |
| Unified Clinical Intake V0 | **PUBLICADO Y VERIFICADO**: baseline T1–T10 + hardening; A auto-reveal (#334/#335); B D17_EXT_V1 (#336/#337); Train C C1/C2 (#338/#339/#340) promovido por #342/#341 |

> **Estado vivo:** `recovery/farmacia-pr-replay-20260727` está publicado en `19d10c9abefb7b25130b4b17e3289d54a17315ee` tras PR #346. El HEAD clínico funcional congelado por el snapshot es `e1120ba85817a1807cea8c1e938867ad778921f4` (PR #341). `CÁCERES-REVIEW-0.6` incorpora A + B + Train C y está publicado en el enlace estable de Cáceres.

> **Fronteras clínicas:** tratamiento solicitado no equivale a validado; pegar/importar nunca valida; datos ausentes no limpian controles; valores existentes quedan protegidos; no hay inferencia desde fármaco/CIMA/catálogo/historial; campos compuestos siguen provenance-only; `VHB/VHC/VIH` combinado no se reparte a tres controles.

> **Recovery publicado y snapshot Cáceres están ahora alineados funcionalmente, pero siguen siendo artefactos distintos.** `CÁCERES-REVIEW-0.6` fue regenerado explícitamente por #345/#346 y su manifest congela `source_sha`/`last_functional_sha = e1120ba85817a1807cea8c1e938867ad778921f4`. El paquete externo/workbooks no se refrozen por #346.

---

## 1. Lectura recomendada actual

1. [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md) — estado vivo post publicación de `CÁCERES-REVIEW-0.6`.
2. [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) — trazabilidad de WOs, candidates, PRs y merges.
3. [`docs/specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md`](/docs/specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md) — contrato Unified Intake y addendum post-implementación.
4. [`docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md`](/docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md) — auditoría histórica del train T8→T10; no sustituye el estado vivo 2026-09-08.
5. [`docs/evaluation/FARMACIA_EVALUATION_GUIDE.md`](/docs/evaluation/FARMACIA_EVALUATION_GUIDE.md) y [`FARMACIA_EVALUATION_CHECKLIST.md`](/docs/evaluation/FARMACIA_EVALUATION_CHECKLIST.md) — evaluación sintética.
6. [`docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md`](/docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md) — freeze del paquete externo; permanece independiente del recovery actual.

---

## 2. Orden de verdad

1. WO/instrucción actual: issue #347 para esta reconciliación documental.
2. GitHub/código publicado: `recovery/farmacia-pr-replay-20260727` @ `19d10c9abefb7b25130b4b17e3289d54a17315ee`; HEAD clínico funcional congelado por 0.6: `e1120ba85817a1807cea8c1e938867ad778921f4`.
3. `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` una vez reconciliados.
4. Estado vivo [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md).
5. Spec Unified Clinical Intake V0 y documentos vivos relacionados.
6. Documentos históricos y biblioteca.

Una rama, SHA, prioridad o PR recordados no son fuente de verdad sin verificación.

---

## 3. Ramas y referencias

| Rama / ref | Estado | Fuente de verdad para | No es fuente de verdad para |
| --- | --- | --- | --- |
| `origin/main` | Legacy / congelada; verificado `a25cccb8...` | Historia previa | Estado Farmacia actual |
| `origin/recovery/farmacia-pr-replay-20260727` | **Rama regional publicada Farmacia**; HEAD publicado `19d10c9abefb7b25130b4b17e3289d54a17315ee`; HEAD clínico funcional `e1120ba85817a1807cea8c1e938867ad778921f4` | Código Farmacia / superficie regional genérica | Piloto o producción |
| `previews/caceres-fh/` | **Snapshot estable `CÁCERES-REVIEW-0.6`**; manifest source/last-functional `e1120ba85817a1807cea8c1e938867ad778921f4` | Evaluación Pharmacy-only Cáceres con datos sintéticos | Piloto, producción o espejo automático de futuros merges |
| `origin/work/*`, `origin/docs/*` | Trabajo/revisión | WOs atómicas | Estado publicado sin merge |
| `origin/backup/*` y tags demo | Retorno/historia | Recuperación de estados | Desarrollo activo |

### Reglas

- No tocar `main` sin autorización explícita.
- El snapshot Cáceres solo cambia por promoción/refreeze explícito; no editar manualmente `previews/caceres-fh/`.
- Recovery, snapshot Cáceres y paquete externo son artefactos distintos.
- Evaluación/demo con datos sintéticos no equivale a piloto ni producción.

---

## 4. Estado vivo de Farmacia post Cáceres 0.6

| Elemento | Estado actual |
| --- | --- |
| Rama | `recovery/farmacia-pr-replay-20260727` |
| HEAD publicado recovery | `19d10c9abefb7b25130b4b17e3289d54a17315ee` — merge PR #346 |
| HEAD clínico funcional | `e1120ba85817a1807cea8c1e938867ad778921f4` — merge PR #341; congelado por 0.6 |
| Post-merge CI | Farmacia smoke #1025 `success`; Pages #219 `success` |
| Baseline Unified Intake | #323 / PR #324 → `bff76ff7095fb568948b1bfbc6288df551971add`; histórico, preservado en la cadena actual |
| Cáceres 0.6 | #345 / PR #346 → candidate `749c82409a415e800500b39018027b189fd6a131`, merge `19d10c9abefb7b25130b4b17e3289d54a17315ee`; manifest source/last-functional `e1120ba85817a1807cea8c1e938867ad778921f4` |
| A — auto-reveal | #334 / PR #335 → candidate `ad4088c...`, merge `7b99eda50e9f7b92cf921d0d6e1bd2090ca917f7`; presentación Dermatología/patología sin preescritura clínica |
| B — D17_EXT_V1 | #336 / PR #337 → candidate `773f66f...`, merge `775a8c08c00d3b678838d71b958775bba726009b`; transporte clínico versionado y fail-closed |
| Train C | #338 completado; C1 #339 `bbf898bc789840c0b4bc7635636b81d740afe60e`; C2 #340 `e5e52e2bc8f94805b4771ec40aa19820bb6be02f`; verifier final PASS |
| Promoción Train C | #342 / PR #341 → merge `e1120ba85817a1807cea8c1e938867ad778921f4` |
| C1 | 39 conceptos explícitos de patología/comorbilidades pasan por proposals + D5/D16; adapters cerrados; gates patología y parent/child |
| C2 | 7 conceptos seguros de analítica/vacunación + superficie compartida única `formAnaliticaVacunacion` |
| Serologías combinadas | `derma_viral_serologies` permanece `NONE/NO_PROPOSAL`; nunca se divide en VHB/VHC/VIH |
| Tratamiento validado | Separado e intacto por el intake; requested/imported nunca equivale a validated |
| Patient/session | Intake no crea/selecciona paciente ni persiste una sesión por pegar/importar |
| QA Train C | final oracle PASS; T10 14/14 ejecutado una vez al final del Train; auditoría post-Train C1 147/147, C2 134/134, C2 browser 5/5, final oracle PASS; `git diff --check` PASS |
| Snapshot/package | `CÁCERES-REVIEW-0.6` publicado por #345/#346; package externo/workbooks siguen sin refreeze |
| Estado asistencial | Evaluación/demo sintética; no piloto ni producción |
| Siguiente frontera | Evaluación humana de `CÁCERES-REVIEW-0.6`; cualquier piloto real, refreeze del paquete externo o evolución posterior requiere decisión/WO separada |
| Documento vivo | [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md) |

> Los estados documentales previos a 2026-09-08 conservan trazabilidad histórica. Cuando describan Cáceres 0.4/0.5 o un recovery anterior como estado vivo, quedan superseded por GitHub, este índice, WOS y el estado vivo 20260908.

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
| --- | --- | --- |
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

- [`docs/evaluation/FARMACIA_EVALUATION_GUIDE.md`](/docs/evaluation/FARMACIA_EVALUATION_GUIDE.md)
- [`docs/evaluation/FARMACIA_EVALUATION_CHECKLIST.md`](/docs/evaluation/FARMACIA_EVALUATION_CHECKLIST.md)
- [`docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md`](/docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md)
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
- [`docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`](/docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md) — secuencia histórica y estado post patient-flow; flujo normal integrado; WO7 candidate pausada; Estadísticas raw/CSV superados como pendientes por #257/#258; `APP_*`, descomposición, Processor y roundtrip pendientes
- [`docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md`](/docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md) — core candidate `2.0.0-draft.1` integrado; Export v2 demo paralelo visible desde PR #227, sin cutover ni retirada v1
- [`docs/contracts/FARMACIA_EXPORT_V2_VALIDATION_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_VALIDATION_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Validación v2; integrado mediante PR #215
- [`docs/contracts/FARMACIA_EXPORT_V2_FIRST_VISIT_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_FIRST_VISIT_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Primera Visita v2; integrado mediante PR #217
- [`docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Seguimiento v2; integrado mediante PR #221
- El contrato de escenarios Farmacia V4 citado en ediciones previas no está publicado en `recovery`; su incorporación formal permanece pendiente.

### Historia y auditoría

- [`docs/farmacia_branch_manifest_20260614.md`](/docs/farmacia_branch_manifest_20260614.md) — inventario histórico extenso.
- [`docs/ops/audits/FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md`](/docs/ops/audits/FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md)
- [`docs/audits/FARMACIA_BASELINE_AUDIT_V1_20260904.md`](/docs/audits/FARMACIA_BASELINE_AUDIT_V1_20260904.md) — auditoría baseline Farmacia V1 (issue #285 / PR #287), histórica sobre `097396a1...`; su P1 F-01/F-04 fue resuelto posteriormente por #288/#289 (merge `9fd6888b...`) según el postscript §13 añadido por la WO #290
- [`docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md`](/docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md) — auditoría factual del train T8→T10; el addendum §11 registra después Repair C #317, SES hardening #319, composición #322 y publicación #323/#324 sin reescribir la auditoría original.
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
- Identity Plane: backend local futuro.
- FHIR/openEHR: adaptadores del modelo canónico, no conversión directa del Excel.
- V5: diferida.

---

## 13. Deuda documental abierta

Requiere WO posterior, sin mezclarla con quick wins clínicos:

| Documento | Deuda |
| --- | --- |
| `README.md` | Presenta Farmacia como no implementada |
| `ARCHITECTURE.md` | Baseline, ramas y persistencia Farmacia desactualizados |
| `CHANGELOG.md` | No recoge la línea recovery reciente |
| `AGENTS.md` | Metadata/rama base histórica; verificar arnés real antes de editar |
| `docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md` | Modelo operativo antiguo |
| `opencode.jsonc` | No existe en recovery; ausencia esperada y no bloqueante para esta edición documental |
| Planes históricos PR replay/rescate V4 | Referenciados previamente, pero sus archivos no están publicados en recovery |
| Contrato de escenarios Farmacia V4 | Referenciado previamente, pero no publicado en recovery |

---

## 14. Documentos históricos / no usar como estado vivo

- [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md) — fotografía 0.1.
- [`docs/archive/CHANGELOG_20260307.md`](/docs/archive/CHANGELOG_20260307.md)
- [`docs/archive/ESTADO_IMPLEMENTACION_20260307.md`](/docs/archive/ESTADO_IMPLEMENTACION_20260307.md)
- [`docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md`](/docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md)
- ramas nocturnas/demo antiguas sin merge.

Para el estado actual de Farmacia también son memoria histórica o referencia secundaria, no fuente de estado vivo:

- `README.md`;
- `ARCHITECTURE.md`;
- `TODO.md`;
- `CHANGELOG.md`;
- `AGENTS.md`;
- documentos `FARMACIA_V0_3_*` y `FARMACIA_V0_4_*`;
- issues replay históricos abiertos de julio.

Cuando contradigan el estado vivo publicado en GitHub (`recovery/farmacia-pr-replay-20260727` @ `19d10c9abefb7b25130b4b17e3289d54a17315ee`; HEAD clínico funcional `e1120ba85817a1807cea8c1e938867ad778921f4`), prevalecen GitHub/código publicado, este índice, `WORK_ORDER_STATUS.md` y el estado vivo 20260908. Los documentos de #289, #323/#324, trains previos y freezes 0.4/0.5 conservan valor histórico sin convertirse automáticamente en estado vivo.

---

## 15. Decisiones pendientes

| Tema | Estado |
| --- | --- |
| Formato PreSalud | Contrato/parser V0 estricto implementado; ampliaciones futuras pendientes |
| Diccionario regional de patologías | Allowlist SES Dermatología V0 implementada; diccionario regional amplio pendiente |
| Formulario Digestivo | Pendiente |
| Consenso SEFH/PROs | Preparación por Silvia |
| Trigger HTML Power Automate | Pendiente de PoC |
| Servidor local por hospital | Disponibilidad comunicada en Badajoz/Mérida; diseño pendiente |
| Identity Plane físico | Diferido hasta servidor/PROM Gateway automatizado |
| Auth/permisos | Pendiente institucional |
| Arquitectura FHIR/openEHR SES | Pendiente institucional |
| Nomenclatura externa PROMueve Nexus/FarmaNEXus | Provisional |

---

*Reconciliación post-Cáceres 0.6 — issue #347. Recovery publicado: `19d10c9abefb7b25130b4b17e3289d54a17315ee` (PR #346); HEAD clínico funcional congelado: `e1120ba85817a1807cea8c1e938867ad778921f4`. `CÁCERES-REVIEW-0.6` es el snapshot estable vigente; paquete externo/workbooks sin refreeze. Uso: evaluación/demo sintética; no piloto ni producción.*
