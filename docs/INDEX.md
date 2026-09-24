# Índice documental maestro — Hub Clínico Badajoz / PROMueve Nexus

| Metadato | Valor |
| --- | --- |
| Última actualización | 2026-09-24 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Línea Farmacia de procedencia | `origin/recovery/farmacia-pr-replay-20260727`; conserva la historia funcional publicada previa a F0.2, pero su condición ACTIVE/HISTORICAL para nuevo desarrollo depende de PR #381 |
| Autoridad canónica de desarrollo (F0.2) | Resolver por estado GitHub de PR #381: sin merge → recovery **ACTIVE** / `origin/promueve/nexus-v4` **CANDIDATE**; desde merge autorizado → Nexus **ACTIVE** / recovery **HISTORICAL**. Nexus nació de `a8cec03522017a1f4b68e18b92c944601659c84f` con equivalencia inicial exacta. Detalle: [`ops/PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md`](ops/PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md) |
| Tip Git de recovery (volátil) | Consultar GitHub live; verificado 2026-09-24 tras PR #374: `771fb80c5081aa974b86d6a0119ab30059970a25`. Puede avanzar por commits documentales/administrativos sin cambiar producto. |
| Último HEAD de producto publicado | `771fb80c5081aa974b86d6a0119ab30059970a25` (merge PR #374 — robustez de resolución de hojas Enfermería v6 / FH-DEBT-002/003) |
| HEAD clínico funcional congelado | `e1120ba85817a1807cea8c1e938867ad778921f4` (PR #341; `source_sha`/`last_functional_sha` del snapshot 0.6) |
| Candidate Train C | `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` |
| CI del último HEAD de producto | Farmacia smoke run `35936756453` `success` y Pages build/deployment run `35936755598` `success` sobre `771fb80c5081aa974b86d6a0119ab30059970a25` |
| `origin/main` verificado | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68` |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.6` (issue #345 / PR #346; manifest source `e1120ba85817a1807cea8c1e938867ad778921f4`) |
| Snapshot 0.6 candidate | `749c82409a415e800500b39018027b189fd6a131` |
| Snapshot 0.6 publicación | merge `19d10c9abefb7b25130b4b17e3289d54a17315ee` (PR #346) |
| Paquete externo | `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`; no refrozen por PR #333/#335/#337/#341/#346 |
| Actividad del servicio | Demo |
| Alcance | Evaluación con datos sintéticos; sin piloto / sin producción |
| WO / instrucción vigente | Consultar GitHub live; este índice no fija una WO “actual” estática para evitar deuda circular tras cierres documentales |
| Unified Clinical Intake V0 | **PUBLICADO Y VERIFICADO**: baseline T1–T10 + hardening; A auto-reveal (#334/#335); B D17_EXT_V1 (#336/#337); Train C C1/C2 (#338/#339/#340) promovido por #342/#341 |

## Architecture Decision Freeze — 2026-09-24

La dirección futura de plataforma queda adjudicada en:

- [`architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md`](architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md) — autoridad de arquitectura de ingeniería para el Foundation de PROMueve Nexus;
- [`architecture/adr/`](architecture/adr/) — ADR-001…ADR-008;
- [`ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`](ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md) — dependencias, WOs candidatas y lanes de ejecución;
- [`architecture/reviews/`](architecture/reviews/) — baseline, revisión adversarial, alignment y revisión final de completitud preservados como evidencia, no como autoridad automática.

**Este freeze no cambia por sí mismo la autoridad Git ni el estado asistencial.** `recovery/farmacia-pr-replay-20260727` continúa como rama publicada hasta que la WO separada de transición se fusione; `main` y snapshots congelados no cambian. PROMueve sigue en evaluación sintética, no piloto/producción.

**Transición Git F0.2 (#380):** `promueve/nexus-v4` fue creada desde el SHA live `a8cec03522017a1f4b68e18b92c944601659c84f` con equivalencia inicial demostrada (mismo commit, mismo tree, diff vacío, cero cherry-pick/rewrite). El estado efectivo es deliberadamente condicional a PR #381: mientras esté sin merge, recovery = **ACTIVE** y Nexus = **CANDIDATE**; desde su merge autorizado, Nexus = **ACTIVE** y recovery = **HISTORICAL** para nuevo desarrollo. Detalle en [`ops/PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md`](ops/PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md).

Principios nuevos/reconciliados que prevalecen para trabajo futuro cuando exista conflicto con documentos históricos: monolito modular; Home hospitalaria sin carga clínica; site fijo por deployment; qualification hospital×módulo; configuración mínima y gobernada por propiedad; Read Ports por módulo mediante strangler; acto completo independiente de Excel; Excel como adapter soportado con garantías explícitas; no paciente universal/V5 genérica ahora.

**Foundation Bootstrap Train (TRAIN-NEXUS-BOOTSTRAP-01, #387):** **PUBLICADO** mediante PR #388, candidate final `38f966033c0f7dc6084bb67d565a07a06d9e2470` y merge `5b47c146b63ae5ab10abe68c4788c649b029fcaa` sobre `promueve/nexus-v4`. Entregó norma documental/handover ([`engineering/PRODUCT_DOCUMENTATION_STANDARD.md`](engineering/PRODUCT_DOCUMENTATION_STANDARD.md)), tooling reproducible Node 20 ([`engineering/TOOLING_BASELINE.md`](engineering/TOOLING_BASELINE.md)), deployment contracts v0 (#384), readiness/navigation contract v0 (#385) y primer oracle de lectura Reuma con clasificación `KNOWN_LEGACY` ([`engineering/REUMA_READ_CHARACTERIZATION.md`](engineering/REUMA_READ_CHARACTERIZATION.md)). Promotion Review v1 independiente: PASS, 0 blocking findings. Deuda no bloqueante preservada en issue #389; desbloquea F1.2/F1.3B y PlatformContext + Home.

**Foundation Train 02 (TRAIN-NEXUS-FOUNDATION-02, #399):** **EJECUTADO — pendiente de merge autorizado.** Siete work units (#394 EOL/provenance; #395 completitud manifest/readiness; #398 PlatformContext: ConfigurationRepository/EffectiveDeployment + facade; #396 oracle export Reuma 497: corpus+harness + acceptance/KNOWN_LEGACY ([`engineering/REUMA_EXPORT_KNOWN_LEGACY.md`](engineering/REUMA_EXPORT_KNOWN_LEGACY.md)); #397 consolidación CI en `verify:fast`/`verify:nexus` y workflow `nexus-checks.yml`). Base `66f1ddff7dea0ccf3ce84511bcff0f26694e7696`; rama `work/nexus-foundation-02-399-20260924`; candidate final `aa52b60b3f68d92123d79a808327cc1c1f99005b`; PR única abierta contra `promueve/nexus-v4` (ver GitHub live). Revisión nativa Gentle cerrada por work unit (approved/burned; under_budget en #394/#395). Deuda D1/D2 cerradas en el registro Nexus; el siguiente train planificado es F3.2 Home → F3.3 navegación → F3.4 release sintética. Antes de cualquier merge: Atenea Promotion Review v1 fresca e independiente sobre BASE/HEAD/diff exactos.

> **Estado vivo:** el tip Git de `recovery/farmacia-pr-replay-20260727` es deliberadamente volátil y se verifica live en GitHub. El último HEAD de producto publicado es `771fb80c5081aa974b86d6a0119ab30059970a25` (PR #374). El HEAD clínico funcional congelado por `CÁCERES-REVIEW-0.6` sigue siendo `e1120ba85817a1807cea8c1e938867ad778921f4` (PR #341): el snapshot Cáceres permanece congelado y **no** incorpora automáticamente SEFH #362/#363 ni Enfermería v6 #364–#370.

> **Fronteras clínicas:** tratamiento solicitado no equivale a validado; pegar/importar nunca valida; datos ausentes no limpian controles; valores existentes quedan protegidos; no hay inferencia desde fármaco/CIMA/catálogo/historial; campos compuestos siguen provenance-only; `VHB/VHC/VIH` combinado no se reparte a tres controles.

> **Recovery publicado y snapshot Cáceres son artefactos distintos y ya no están alineados funcionalmente.** `recovery` avanzó con acceso SEFH (#362/#363) y Enfermería v6/reconciliación por `solicitud_id` (#364–#370), mientras `CÁCERES-REVIEW-0.6` conserva su manifest con `source_sha`/`last_functional_sha = e1120ba85817a1807cea8c1e938867ad778921f4`. El paquete externo/workbooks tampoco se ha refrozen.

---

## 1. Lectura recomendada actual

1. [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md) — estado vivo de recovery y relación con el snapshot Cáceres 0.6, actualizado 2026-09-24.
2. [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) — trazabilidad de WOs, candidates, PRs y merges.
3. [`docs/ops/NEXUS_DEBT_REGISTER.md`](/docs/ops/NEXUS_DEBT_REGISTER.md) — registro vivo de deuda transversal de plataforma/Foundation; issues conservan la evidencia detallada.
4. [`docs/ops/FARMACIA_DEBT_REGISTER.md`](/docs/ops/FARMACIA_DEBT_REGISTER.md) — deuda aceptada específica del módulo Farmacia; no sustituye backlog ni decisiones futuras.
5. [`docs/specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md`](/docs/specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md) — contrato Unified Intake y addendum post-implementación.
6. [`docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md`](/docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md) — auditoría histórica del train T8→T10; no sustituye el estado vivo actual.
7. [`docs/evaluation/FARMACIA_EVALUATION_GUIDE.md`](/docs/evaluation/FARMACIA_EVALUATION_GUIDE.md) y [`FARMACIA_EVALUATION_CHECKLIST.md`](/docs/evaluation/FARMACIA_EVALUATION_CHECKLIST.md) — evaluación sintética.
8. [`docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md`](/docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md) — freeze del paquete externo; permanece independiente del recovery actual.

---

## 2. Orden de verdad

1. WO/instrucción vigente: consultar GitHub live; este índice no fija una WO “actual” estática para evitar deuda circular tras cierres documentales.
2. GitHub live: el estado de PR #381 determina la autoridad canónica de desarrollo durante F0.2. Para trazabilidad Farmacia, consultar además el tip live de `recovery`; último HEAD de producto publicado: `771fb80c5081aa974b86d6a0119ab30059970a25`; HEAD clínico funcional congelado por 0.6: `e1120ba85817a1807cea8c1e938867ad778921f4`.
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
| `origin/promueve/nexus-v4` | Rama creada por F0.2 desde `a8cec035...`; **CANDIDATE** mientras PR #381 esté sin merge y **ACTIVE** desde su merge autorizado | Nuevo desarrollo Nexus/Foundation cuando ACTIVE | Piloto/producción o cambio automático del snapshot Cáceres |
| `origin/recovery/farmacia-pr-replay-20260727` | Línea Farmacia de procedencia; **ACTIVE** para nuevo desarrollo mientras PR #381 esté sin merge y **HISTORICAL** desde su merge autorizado; conserva trazabilidad del último producto Farmacia publicado y del snapshot | Historia/código Farmacia y recuperación | Autoridad canónica Nexus tras activación, piloto o producción |
| `previews/caceres-fh/` | **Snapshot estable `CÁCERES-REVIEW-0.6`**; manifest source/last-functional `e1120ba85817a1807cea8c1e938867ad778921f4` | Evaluación Pharmacy-only Cáceres con datos sintéticos | Piloto, producción o espejo automático de futuros merges |
| `origin/work/*`, `origin/docs/*` | Trabajo/revisión | WOs atómicas | Estado publicado sin merge |
| `origin/backup/*` y tags demo | Retorno/historia | Recuperación de estados | Desarrollo activo |

### Convención de SHAs de publicación

- **Tip Git de `recovery`**: último commit de la rama, incluya producto o solo documentación/administración. Es volátil y se consulta live en GitHub; no se mantiene como SHA canónico estático en los documentos.
- **Último HEAD de producto publicado**: último commit/merge que cambió código funcional o un snapshot distribuible. Solo cambia cuando cambia producto/snapshot.
- **HEAD clínico funcional congelado**: SHA funcional que un snapshot declara en `source_sha` / `last_functional_sha`; puede ser anterior al HEAD de producto si la promoción del snapshot añade solo artefactos de publicación.
- Un merge `documentation-only` puede mover el tip Git sin cambiar el HEAD de producto ni el HEAD clínico funcional. **No abrir una nueva reconciliación solo porque haya cambiado el tip por documentación.**

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
| Tip Git de recovery | Volátil; consultar GitHub live. Verificado 2026-09-24 tras PR #374: `771fb80c5081aa974b86d6a0119ab30059970a25` |
| Último HEAD de producto publicado | `771fb80c5081aa974b86d6a0119ab30059970a25` — merge PR #374 |
| HEAD clínico funcional | `e1120ba85817a1807cea8c1e938867ad778921f4` — merge PR #341; congelado por 0.6 |
| CI del último HEAD de producto | Farmacia smoke run `35936756453` `success`; Pages build/deployment run `35936755598` `success` |
| Baseline Unified Intake | #323 / PR #324 → `bff76ff7095fb568948b1bfbc6288df551971add`; histórico, preservado en la cadena actual |
| Cáceres 0.6 | #345 / PR #346 → candidate `749c82409a415e800500b39018027b189fd6a131`, merge `19d10c9abefb7b25130b4b17e3289d54a17315ee`; manifest source/last-functional `e1120ba85817a1807cea8c1e938867ad778921f4` |
| A — auto-reveal | #334 / PR #335 → candidate `ad4088c...`, merge `7b99eda50e9f7b92cf921d0d6e1bd2090ca917f7`; presentación Dermatología/patología sin preescritura clínica |
| B — D17_EXT_V1 | #336 / PR #337 → candidate `773f66f...`, merge `775a8c08c00d3b678838d71b958775bba726009b`; transporte clínico versionado y fail-closed |
| Train C | #338 completado; C1 #339 `bbf898bc789840c0b4bc7635636b81d740afe60e`; C2 #340 `e5e52e2bc8f94805b4771ec40aa19820bb6be02f`; verifier final PASS |
| Promoción Train C | #342 / PR #341 → merge `e1120ba85817a1807cea8c1e938867ad778921f4` |
| Acceso estratificación SEFH | #362 / PR #363 → merge `6c36ce5d1126b3032937e8e3627b045e1e2ea081` |
| Enfermería v6 / `solicitud_id` | train #364; N1 #365, N2 #366, N3 #367, N4 correctiva, N5 #368; promoción #369 / PR #370 → merge `e058f0d25a1856ace4a8bec63dfca53584e8a9cb` |
| Deuda aceptada | [`FARMACIA_DEBT_REGISTER.md`](/docs/ops/FARMACIA_DEBT_REGISTER.md): FH-DEBT-001 sigue OPEN y debe resolverse antes de piloto real; FH-DEBT-002/003 RESOLVED por PR #374 |
| C1 | 39 conceptos explícitos de patología/comorbilidades pasan por proposals + D5/D16; adapters cerrados; gates patología y parent/child |
| C2 | 7 conceptos seguros de analítica/vacunación + superficie compartida única `formAnaliticaVacunacion` |
| Serologías combinadas | `derma_viral_serologies` permanece `NONE/NO_PROPOSAL`; nunca se divide en VHB/VHC/VIH |
| Tratamiento validado | Separado e intacto por el intake; requested/imported nunca equivale a validated |
| Patient/session | Intake no crea/selecciona paciente ni persiste una sesión por pegar/importar |
| QA Train C | final oracle PASS; T10 14/14 ejecutado una vez al final del Train; auditoría post-Train C1 147/147, C2 134/134, C2 browser 5/5, final oracle PASS; `git diff --check` PASS |
| Snapshot/package | `CÁCERES-REVIEW-0.6` sigue congelado en source `e1120ba...` y NO incorpora automáticamente #363/#370/#374; package externo/workbooks siguen sin refreeze |
| Estado asistencial | Evaluación/demo sintética; no piloto ni producción |
| Siguiente frontera | Mantener evaluación sintética; resolver FH-DEBT-001 antes de piloto real; cualquier refreeze Cáceres/paquete requiere decisión separada |
| Documento vivo | [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md) |

> Los estados documentales previos a 2026-09-08 conservan trazabilidad histórica. Cuando describan Cáceres 0.4/0.5 o un recovery anterior como estado vivo, quedan superseded por GitHub, este índice, WOS y el estado vivo 20260908.

## 5. Plan y arquitectura V4

### Plan operativo histórico

[`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md)

Este plan conserva objetivos, dependencias y aprendizaje de julio, pero **ya no gobierna la secuencia de Foundation**. Para el trabajo Nexus actual prevalece [`docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`](/docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md) bajo el Architecture Decision Freeze. Supabase, calendarios y WOs históricos del plan no se interpretan como compromisos vigentes salvo reconciliación explícita.

Históricamente definía:

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
| [`AGENTS.md`](/AGENTS.md) | Vigente — ejecución Pi + Gentle nativo | Gobernanza operativa |
| [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) | Vigente | Trazabilidad de WOs y PRs |
| [`docs/ops/PROMUEVE_BACKLOG.md`](/docs/ops/PROMUEVE_BACKLOG.md) | Vigente / propuestas no autorizantes | Backlog vivo de producto y arquitectura; separa ideas de deuda y decisiones |
| [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) | Propuesta canónica + addendum 2026-07-31 | Evolución post-SES |
| [`docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md`](/docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md) | Vigente | Separación Reuma/Farmacia |
| [`docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md`](/docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md) | Vigente | Discovery Badajoz/Mérida |
| [`docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`](/docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md) | Vigencia parcial / histórica; subordinada al Architecture Decision Freeze | Principios clínicos conservables; integración por CIP y stack histórico no gobiernan Foundation |
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
- [`docs/ops/FARMACIA_DEBT_REGISTER.md`](/docs/ops/FARMACIA_DEBT_REGISTER.md) — registro vivo de deuda aceptada/no bloqueante
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

Desde PR #370, el Hub soporta el workbook Enfermería v6 multihoja (`DERMATOLOGÍA`, `REUMATOLOGÍA`, `DIGESTIVO`) y reconcilia solicitudes con Farmacia exclusivamente por `solicitud_id`. `OK FARMACIA` sigue significando lista para tramitación, no validada; `validado`/`denegado` requieren acto FH explícito con el mismo ID; misma CIP con IDs distintos permanece independiente. El handoff Inicio→Validación y el fallo de persistencia están cubiertos de forma fail-closed.

---

## 10. Treatment Lifecycle y renovaciones

- [`docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`](/docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md)

Principios conservados bajo el Architecture Decision Freeze (el documento original sigue siendo exploratorio y no constituye un contrato de configuración aprobado):

- renovación por línea;
- fechas confirmadas, verificadas y estimadas separadas;
- la configuración no introduce lógica clínica arbitraria: solo puede seleccionar políticas implementadas, versionadas, probadas y autorizadas;
- tareas, alertas y notificaciones son conceptos distintos;
- no marcar renovado por silencio;
- Presalud solo alimentará el motor desde campos reales verificados;
- la necesidad de lifecycle e interoperabilidad se conserva como evolución futura sin activar automáticamente el mecanismo histórico propuesto.

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

La deuda funcional/técnica aceptada de producto se registra separadamente en [`docs/ops/FARMACIA_DEBT_REGISTER.md`](/docs/ops/FARMACIA_DEBT_REGISTER.md). Esta sección conserva únicamente deuda documental.

Requiere WO posterior, sin mezclarla con quick wins clínicos:

| Documento | Deuda |
| --- | --- |
| `README.md` | Reconciliado 2026-09-24; mantenerlo como front door y evitar estado volátil duplicado |
| `ARCHITECTURE.md` | Marcado como referencia histórica; la arquitectura/estado actuales se resuelven desde este índice y documentos vivos |
| `CHANGELOG.md` | No recoge la línea recovery reciente |
| `AGENTS.md` | Reconciliado 2026-09-24; sin deuda activa de runtime |
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

- `ARCHITECTURE.md` — referencia histórica explícitamente marcada;
- `TODO.md` — navegación, no backlog vivo;
- `CHANGELOG.md` — historia, no estado vivo;
- documentos `FARMACIA_V0_3_*` y `FARMACIA_V0_4_*`;
- issues replay históricos abiertos de julio.

Cuando contradigan el estado vivo, prevalecen GitHub live para el tip de `recovery`, el último HEAD de producto publicado (`771fb80c5081aa974b86d6a0119ab30059970a25`), el HEAD clínico funcional (`e1120ba85817a1807cea8c1e938867ad778921f4`), este índice, `WORK_ORDER_STATUS.md` y el estado vivo actualizado en `FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`. Los documentos de #289, #323/#324, trains previos y freezes 0.4/0.5 conservan valor histórico sin convertirse automáticamente en estado vivo.

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

*Estado reconciliado 2026-09-24 tras PR #374; tip Git verificado en `771fb80c...`. El tip Git de recovery es volátil y se consulta live; último HEAD de producto publicado: `771fb80c5081aa974b86d6a0119ab30059970a25`; HEAD clínico funcional congelado por Cáceres 0.6: `e1120ba85817a1807cea8c1e938867ad778921f4`. `CÁCERES-REVIEW-0.6` y el paquete externo siguen sin refreeze. Uso: evaluación/demo sintética; no piloto ni producción.*
