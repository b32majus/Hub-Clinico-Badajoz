# Índice documental maestro — Hub Clínico Badajoz / PROMueve Nexus

| Metadato | Valor |
| --- | --- |
| Última actualización | 2026-09-06 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama publicada Farmacia | `origin/recovery/farmacia-pr-replay-20260727` |
| Estado publicado | `bff76ff7095fb568948b1bfbc6288df551971add` (merge issue #323 / PR #324 — Unified Clinical Intake T1–T10 + hardening post-train publicado en recovery) |
| Último HEAD funcional | `bff76ff7095fb568948b1bfbc6288df551971add` (merge funcional issue #323 / PR #324); previo `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb` (issue #288 / PR #289 — Dashboard PROMs P1) |
| `origin/main` verificado | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68` |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.4` (promovido por issue #271 / PR #272) |
| Snapshot 0.4 candidate | `d9cbd56b515ee75c871bfb5e63f96320c963b1e0` |
| Snapshot 0.4 publicación | merge `9125518a74151010eaa2d48b913c5954fa54b8a1` (PR #272) |
| Integridad manifest 0.4 | merge `451d02361fc54cc01f493ca2a89192bde52d7fd9` (PR #276) |
| Freeze documental | PR #278 mergeado; snapshot `CÁCERES-REVIEW-0.4`; un único workbook de Farmacia + workbook complementario de Enfermería |
| Paquete final | `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION` |
| Actividad del servicio | Demo |
| Alcance | Sin piloto / sin producción |
| Work order actual | issue #325 — WO-DOC-FH-POST-UNIFIED-INTAKE-PUBLICATION-RECONCILIATION-01 |
| Unified Clinical Intake V0 | **PUBLICADO Y VERIFICADO** en `bff76ff7095fb568948b1bfbc6288df551971add` vía #323 / PR #324; T1–T10 físicamente integrados, Repair C #317 y SES atomic hardening #319 incluidos; post-merge T10 `14/14 PASS`; evaluación sintética/demo, no piloto/producción |

> Este índice orienta. La verdad publicada actual de Farmacia está en `bff76ff7095fb568948b1bfbc6288df551971add`, merge del issue #323 / PR #324, que incorpora Unified Clinical Intake V0 T1–T10 físicamente integrado más Repair C #317 y SES atomic hardening #319. Conserva el fix P1 Dashboard de `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb` (#288/#289) y la cadena previa de patient-flow. El snapshot Cáceres y el paquete externo son artefactos separados y no se actualizan automáticamente con recovery.

> El modelo de evaluación Farmacia es **un único workbook** (`PROMueve_FH_EVALUATION_FARMACIA.xlsx`) que alimenta Inicio, Quick View, Dashboard, Longitudinal, Validación, Primera Visita, Seguimiento, Estadísticas y CSV, complementado por un workbook de Enfermería. Estadísticas usa la misma cohorte (55) y el CSV sin filtros es 55 × 37. El hosted single-workbook es PASS. El paquete de evaluación sintética está en estado final `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION` (PR #278); Activity permanece demo.

> El estado publicado de Farmacia es `bff76ff7095fb568948b1bfbc6288df551971add` (issue #323 / PR #324). El SHA funcional publicado previo era `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb` (#288/#289, Dashboard PROMs P1). El estado publicado se verifica siempre en GitHub.

> **Recovery/Pages actualizado ≠ snapshot Cáceres refrozen ≠ package refrozen.** El merge #324 actualizó `recovery/farmacia-pr-replay-20260727` y la superficie genérica de Farmacia servida por GitHub Pages. La vertical `/previews/caceres-fh/` permanece explícitamente en `CÁCERES-REVIEW-0.4` (Hospital Universitario de Cáceres) y **no incorpora todavía Unified Clinical Intake V0**. El evaluation package / manifest / ZIP tampoco fue refrozen por #324 ni por esta WO.

---

## 1. Lectura recomendada actual

1. [`docs/evaluation/FARMACIA_EVALUATION_GUIDE.md`](/docs/evaluation/FARMACIA_EVALUATION_GUIDE.md) — recorrido práctico del paquete final para farmacéuticas evaluadoras, solo con datos sintéticos.
2. [`docs/evaluation/FARMACIA_EVALUATION_CHECKLIST.md`](/docs/evaluation/FARMACIA_EVALUATION_CHECKLIST.md) — recogida homogénea de feedback clínico y de producto sin datos reales.
3. [`docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md`](/docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md) — manifest canónico y gates del paquete final `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`.
4. [`docs/ops/FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md`](/docs/ops/FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md) — estado funcional reconciliado tras Patient Longitudinal raw.
5. [`docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](/docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md) — decisión de persistencia temporal y evaluación.
6. [`docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md`](/docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md) — auditoría histórica del train T8→T10, routing/RDD/telemetría, con addendum posterior de Repair C, hardening, composición y publicación recovery.
7. [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) — trazabilidad de WOs, PRs y candidate.
8. [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md) — publicación regional y snapshot Cáceres sin promoción automática.

Para ejecución y merges: [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md).

---

## 2. Orden de verdad

1. Work order actual: `WO-DOC-FH-POST-UNIFIED-INTAKE-PUBLICATION-RECONCILIATION-01` (issue #325).
2. GitHub: estado funcional publicado `bff76ff7095fb568948b1bfbc6288df551971add` (issue #323 / PR #324), que conserva `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb` (#288/#289 Dashboard PROMs P1) y la cadena previa de patient-flow; `main` permanece fuera de esta línea.
3. Decisiones vinculantes del ciclo, subordinadas al estado publicado de #323/#324 y a la especificación Unified Clinical Intake V0 para ese alcance.
4. Este índice reconciliado.
5. `docs/ops/WORK_ORDER_STATUS.md` reconciliado.
6. [`docs/ops/FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md`](/docs/ops/FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md).
7. Documentos históricos y biblioteca.

Una rama, SHA, prioridad o PR recordados no son fuente de verdad sin verificación.

---

## 3. Ramas y referencias

| Rama / ref | Estado | Fuente de verdad para | No es fuente de verdad para |
| --- | --- | --- | --- |
| `origin/main` | Legacy / congelada | Historia previa a Reuma v2 | Estado actual |
| `origin/feature/reuma-v2-prebiologico-fh-les-sjogren` | Base canónica Reuma v2 | Reumatología y contrato Excel v2 | Farmacia recovery |
| `origin/recovery/farmacia-pr-replay-20260727` | **Rama regional publicada Farmacia**; estado funcional `bff76ff7095fb568948b1bfbc6288df551971add` (issue #323 / PR #324); Dashboard P1 `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb` conservado; snapshot `CÁCERES-REVIEW-0.4` y evaluation package no refrozen por #324 | Código Farmacia / superficie genérica Pages | Snapshot Cáceres actualizado, piloto, producción o datos reales |
| `previews/caceres-fh/` | **Snapshot estable CÁCERES-REVIEW-0.4**; promovido por issue #271 / PR #272; integridad de manifest por issue #273 / PR #276 | Evaluación Pharmacy-only Cáceres autónoma | Evolución regional automática |
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

## 4. Estado vivo de Farmacia post Unified Clinical Intake V0

| Elemento | Estado actual |
| --- | --- |
| Rama | `recovery/farmacia-pr-replay-20260727` |
| Estado publicado | `bff76ff7095fb568948b1bfbc6288df551971add` (merge issue #323 / PR #324 — Unified Clinical Intake T1–T10 + hardening post-train publicado en recovery) |
| Último HEAD funcional | `bff76ff7095fb568948b1bfbc6288df551971add` (merge funcional issue #323 / PR #324); previo `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb` (issue #288 / PR #289 — Dashboard PROMs P1) |
| issue #250 / PR #251 | Data Port, `RawExcelDataSource` y `CurrentPatientSession` integrados; merge `de830803...` |
| issue #252 / PR #253 | Cutover del flujo normal publicado; merge histórico `3f7bf9bb...` con CI verde, superseded como HEAD regional por #257/#258 y posteriormente #261/#262 y #265/#266 |
| issue #257 / PR #258 | Issue CLOSED; PR MERGED_AND_VERIFIED; Estadísticas raw publicadas para evaluación sintética en el merge histórico previo `a9d6d464...`; candidate `5a7ad559...` |
| issue #261 / PR #262 | Issue CLOSED; PR MERGED_AND_VERIFIED; Quick View raw PROMs implementado, publicado y demostrado para evaluación sintética; merge histórico `f2b827fed26728e2103a9ebca1f4c524d28dfac3`; candidate `13963f89a28cd590e01ed0acaea160c93a9ec848` |
| issue #265 / PR #266 | Issue CLOSED / completed; PR `MERGED_AND_VERIFIED`; Patient Longitudinal raw restaurado, publicado y demostrado para evaluación sintética; merge `fb7b70c50c991baf6a375b42112048d190fe0178` (histórico; superado como HEAD publicado por #288/#289); candidate `a7b8deb7079d46603abcc1a3b1c86763a79bc410` |
| issue #288 / PR #289 | Issue CLOSED / completed; PR `MERGED_AND_VERIFIED`; fix P1 F-01/F-04 Dashboard PROMs publicado en `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb`; QA Chromium + hosted smoke #943 `success`; preservado en el HEAD actual `bff76ff7095fb568948b1bfbc6288df551971add`; sin refreeze de snapshot/package |
| issue #317 — Repair C T8 | CLOSED/completed; `d6d4bac8410ddd50ae66fd36e5c1740e65e24c8e`; expira staging al cambiar `parse_run_id`; oracle independiente `14/14 PASS`, lifecycle/frozen/browser regresiones PASS; posteriormente integrado en #324 |
| issue #319 — SES atomic hardening | CLOSED/completed; `4ec70f54a475e0d25fd1c311feeff9ed61b97428`; write-set patología+SES code+label fail-closed/all-or-nothing; atomic oracle `5/5`, pure `49/49`, frozen `3/3`, T10 `14/14`; posteriormente integrado en #324 |
| issue #322 — composición T1–T10 | CLOSED/completed; candidate físico `0916989c02cf4e7e4732fe1246d3c5d76f0bfa63`; T1 18/18 + browser 3/3, T8 Repair C 14/14, T9 atomic 5/5, T10 14/14; Promotion Review PASS; base de la promoción #323 |
| issue #323 / PR #324 | **MERGED_AND_VERIFIED**; candidate `b213458214a80e72a02931be0c4ee5007ff030fb`; merge recovery `bff76ff7095fb568948b1bfbc6288df551971add`; hosted smoke #994 `success`; post-merge smoke `48/48`, Dashboard `56/56` + Chromium limpio y T10 single-tree `14/14 PASS`; snapshot/package NO refrozen |
| Unified Clinical Intake V0 | Publicado dentro de Validación como flujo de ingesta/revisión/aplicación explícita; tratamiento solicitado sigue separado del validado; datos ausentes permanecen ausentes/desconocidos; no inferencia terapéutica desde fármaco/CIMA/catálogo |
| Flujo clínico | Excel raw 152 columnas → reader/selectors → Data Port → sesión del paciente actual → Inicio/Quick View → dashboards → Validación → Primera Visita → Seguimiento |
| Modo Bridge visible | No existe como experiencia soportada; Bridge queda como nombre técnico de reader/selectors históricos |
| `sessionStorage` | Solo envelope versionado del paciente actual; no workbook, bytes, read model completo, población, cohorte ni otros pacientes |
| Excel Enfermería | Solo enriquece huecos explícitos; Farmacia raw mantiene precedencia |
| Estadísticas | RAW publicado para evaluación sintética; cohorte desde Data Port, handoff efímero y CSV completo de 37 columnas |
| Quick View raw PROMs | Renderer estructurado publicado y demostrado; preserva `0` y `false`, muestra fecha solo si existe y representa ausencias como `No registrado`; sin thresholds ni interpretación clínica |
| Patient Longitudinal raw | Implementado, publicado y demostrado para evaluación sintética mediante el issue #265 / PR #266; reconstruye actos de Primera Visita y Seguimiento, agrupa multifila, conserva snapshots explícitos por acto y no fabrica fechas ni interpreta clínicamente; detalle en la subsección "Estadísticas, Quick View, Longitudinal y Actividad" |
| Deuda post-checkpoint | `LONGITUDINAL_FULL_HISTORY_NOT_DEMONSTRATED` queda resuelto/publicado por #265/#266; `PREEXISTING_QUICKVIEW_P2` queda resuelto/publicado por #261/#262 |
| Actividad del servicio | Demo, contenido funcional no decidido y fuera de la siguiente WO técnica |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.4`, promovido por issue #271 / PR #272 (candidate `d9cbd56b515ee75c871bfb5e63f96320c963b1e0`, merge publicación `9125518a74151010eaa2d48b913c5954fa54b8a1`); integridad de manifest por issue #273 / PR #276 (merge `451d02361fc54cc01f493ca2a89192bde52d7fd9`) |
| `origin/main` | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68`; intacta |
| Datos / uso | Exclusivamente sintéticos; evaluación/demo funcional, no piloto ni producción |
| Modelo de workbook | **Un único workbook** de Farmacia (`PROMueve_FH_EVALUATION_FARMACIA.xlsx`, 55 pacientes / 93 eventos / 95 filas / 152 columnas) alimenta Inicio, Quick View, Dashboard, Longitudinal, Validación, Primera Visita, Seguimiento, Estadísticas y CSV; hosted single-workbook PASS |
| Work order actual | issue #325 — WO-DOC-FH-POST-UNIFIED-INTAKE-PUBLICATION-RECONCILIATION-01 |
| Evaluation Package | El paquete de evaluación evolucionó a **autónomo**: mismo workbook maestro de Farmacia (55/93/95/152) compartido por todos los módulos y Estadísticas desde la misma cohorte, con un workbook complementario de Enfermería; estado final `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION` tras el merge del freeze documental PR #278; sin cambios funcionales |

> Los SHA históricos de PR #238/#242/#246, #253, #258, #262, #266 y #289 no son el HEAD actual. La verdad funcional publicada se verifica contra `bff76ff7095fb568948b1bfbc6288df551971add` (issue #323 / PR #324), que conserva las capacidades previas y añade Unified Clinical Intake V0. `CÁCERES-REVIEW-0.4` sigue siendo un snapshot anterior independiente.

> El guard P1 rechaza `IDENTIFIER_COMPONENT_EMPTY`, `IDENTIFIER_COMPONENT_TYPE`, `NORMALIZED_IDENTIFIER_COLLISION`, `IDENTIFIER_NOT_INDEXED` e `IDENTIFIER_INDEX_PATIENT_MISMATCH`, comprueba coherencia bidireccional pacientes ↔ índice, usa lookup directo sobre tabla privada `Object.create(null)`, conserva sensibilidad a mayúsculas, permite pacientes sin identificador pero no buscables operativamente y no muta el read model. Para el candidate de #258, integrado en el merge histórico `a9d6d464...`, la evidencia es `LOCAL_CI_EQUIVALENT_PASS` sobre archive inmutable del SHA exacto: smoke 48/48, dashboard handoff 37/37, Selectors 82/82, Reader 21/21, Data Port 11/11, patient-flow 17/17, cohorte/CSV/handoff 30 escenarios, Chromium patient-flow y Estadísticas PASS, `console.error = 0`, `pageerror = 0` y `git diff --check = PASS`. GitHub Actions no despachó un run sobre el SHA final durante la incidencia externa.

> PR #246 queda como referencia técnica histórica del handoff. #252/#253 retiraron esa experiencia Bridge visible del flujo soportado y trasladaron la navegación al buscador CIP, Quick View y páginas clínicas normales.

> El runtime publicado conserva la no inferencia clínica: lo ausente permanece vacío, pendiente o no registrado; no se infieren principio activo, dosis, vía, pauta, tratamiento activo, adherencia, causalidad ni ausencia de EA. Quick View raw PROMs solo estructura y presenta valores explícitos, sin thresholds ni interpretación clínica. JARA, CSV y Excel v1 permanecen intactos; no existe deploy, promoción de Cáceres por #258/#261, piloto ni producción.

Documento de estado del snapshot Cáceres 0.4: [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md). Conserva la trazabilidad de ese snapshot; no sustituye al HEAD recovery `bff76ff…`.

El documento [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md) queda histórico y superseded como estado vivo; conserva la fotografía de `CÁCERES-REVIEW-0.1`.

### Reconciliación común post patient-flow y Quick View

- La sesión temporal usa `sessionStorage` únicamente para el envelope versionado del paciente actual: identificador explícito, `patient_id`, generación, proyección actual, provenance, borradores y `dirty`.
- Nunca se guardan en ese envelope el workbook, bytes, read model completo, población, cohorte ni otros pacientes. `localStorage` e IndexedDB no son almacenamiento clínico soportado y la sesión no es persistencia longitudinal definitiva.
- El reload permite continuar o empezar de cero; los borradores pertenecen solo al paciente actual y el cambio de CIP purga el contexto anterior antes de cargar otro.
- Excel Enfermería solo enriquece huecos explícitos. Farmacia raw conserva precedencia; la ausencia queda vacía, pendiente o no registrada y no se infiere información terapéutica.

### Estadísticas, Quick View, Longitudinal y Actividad

Estadísticas está publicada para evaluación sintética mediante el issue #257 / PR #258, en el merge histórico `a9d6d464...`: el Excel de Farmacia se carga una sola vez en Inicio, la cohorte raw se construye desde el Data Port y se entrega mediante handoff efímero same-origin. La cohorte raw sustituye completamente la demo; el acceso directo o la recarga usa únicamente los 3 pacientes demo versionados. Filtros, KPIs, gráficos, tabla y paginación usan la cohorte activa. El CSV exporta la cohorte filtrada completa, con 37 columnas; las líneas activas usan solo `active_at_event === true`, `unknown` se separa de `false`, `no_change_recorded` no se presenta como movimiento, una suspensión explícita conserva estado, motivo y fecha efectiva, y el PROM del último acto conserva todas las mediciones simultáneas. No se almacena una cohorte clínica en storage.

Quick View raw PROMs está implementado, publicado y demostrado mediante el issue #261 / PR #262, merge `f2b827fed26728e2103a9ebca1f4c524d28dfac3`, para evaluación exclusivamente sintética. El renderer estructura los PROMs sin `[object Object]`, preserva `0` y `false`, muestra fecha solo cuando existe explícitamente y representa el valor ausente como `No registrado`; no aplica thresholds ni interpretación clínica. La demo permanece intacta y el cambio de CIP no mezcla PROMs. La evidencia publicada incluye Reader 21/21 PASS, Selectors 82/82 PASS, Data Port 11/11 PASS, patient-flow 17/17 PASS, smoke 48/48 PASS, Patient-flow Chromium PASS, Quick View PROM Chromium PASS, cohorte de Estadísticas con 30 escenarios PASS, Estadísticas Chromium PASS (raw 55 / CSV 55x37), `console.error = 0`, `pageerror = 0` y `git diff --check = PASS`. La revisión independiente read-only no encontró findings de producto ni scope drift.

Actividad del servicio permanece demo, con definición funcional pendiente, no se cablea ahora y no bloquea el paquete de evaluación.

Patient Longitudinal raw está implementado, publicado y demostrado para evaluación sintética mediante el issue #265 / PR #266, merge `fb7b70c50c991baf6a375b42112048d190fe0178`, candidate `a7b8deb7079d46603abcc1a3b1c86763a79bc410`. Usa `CurrentPatientSession` → `FarmaciaPatientFlowRuntime.getCurrentEnvelope()` → `explicit_data` → `FarmaciaLongitudinalRawAdapter` → dashboard Longitudinal. Reconstruye todos los actos disponibles de Primera Visita y Seguimiento, agrupa correctamente actos multifila y conserva snapshots explícitos por acto. `active_at_event` distingue activo explícito (`true`), no activo explícito (`false`) y no registrado (otro/ausente). Muestra únicamente movimientos explícitos relevantes, excluye `no_change_recorded` y `not_recorded`, y diferencia `schedule_change`, `dose_change`, `dose_and_schedule_change`, `suspension` y `other`. No fabrica fechas terapéuticas, no sustituye `movement_effective_date` ausente por fecha del acto, conserva PROMs históricos y simultáneos (incluidos `0` y `false`; fecha PROM solo si la contiene), conserva la historia explícita de adherencia, agrupa EA `present` por identidad explícita conservando updates y no interpreta `absent`/`not_recorded` como resolución de un EA previo (la resolución solo se afirma por campos explícitos). La causalidad es solo explícita. La actividad clínica raw permanece `[]` / No registrado porque el contrato actual no la estructura; no se aplican thresholds ni interpretación clínica automática y raw y demo no se mezclan. Evidencia hosted post-PR: Farmacia smoke check #914 (SUCCESS); la batería local/Chromium (Longitudinal raw PASS, Reader 21/21, Selectors 82/82, Data Port 11/11, patient-flow 17/17, smoke 48/48, Dashboard Paciente 37/37, Quick View PROM, Statistics 30 escenarios) no se confunde con el smoke hosted.

### Secuencia vigente post Longitudinal

1. Paquete de evaluación sintética publicado y congelado: estado final `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION` (issue #277 / PR #278).
2. Evaluación con farmacéuticas usando el package sintético aprobado por la operadora.
3. Solo después, decidir evolución funcional según feedback.

Actividad del servicio continúa demo y no bloquea esta secuencia. No se anteponen Office Script, `APP_*`, PostgreSQL, Supabase, Identity Plane, V5 ni refactor general. El package ha superado QA y revisión y está en estado final `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`.

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

Cuando contradigan el estado publicado de Farmacia en `bff76ff7095fb568948b1bfbc6288df551971add` (issue #323 / PR #324), prevalecen GitHub/código publicado, este índice y `WORK_ORDER_STATUS.md`. Los documentos de #289, del train previo al merge y del freeze 0.4 conservan su valor histórico sin convertirse en estado vivo.

---

## 15. Decisiones pendientes

| Tema | Estado |
| --- | --- |
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

*Edición de la WO documental #325 (reconciliación post-publicación Unified Clinical Intake). Estado funcional publicado: `bff76ff7095fb568948b1bfbc6288df551971add` (issue #323 / PR #324). Estado funcional previo: `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb` (#288/#289, Dashboard PROMs P1). El snapshot `CÁCERES-REVIEW-0.4` y el evaluation package / manifest / ZIP permanecen **sin refreeze** por #324/#325; la vertical Cáceres en Pages sigue mostrando Hospital Universitario de Cáceres sobre 0.4 y no debe confundirse con la superficie genérica recovery. Uso: evaluación/demo sintética; no piloto ni producción.*
