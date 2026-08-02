# WO-FH-EXPORT-V2-CANONICAL-CORE-01

**Título:** Núcleo canónico y fila común v2 sin activación pública
**Fecha:** 2026-08-02
**Prioridad:** P1 estructural previa al Export Manager v2
**Riesgo:** 🟡 Amarillo
**Base remota:** `origin/recovery/farmacia-pr-replay-20260727`
**Base de ejecución efectiva:** `5e9b59ba36dc7760f4529deece33248922ce0b9a`
**Commit funcional:** `7109b5f1a9411793666e1e1f239e3ac25ce9437e`
**Merge publicado:** `6ac041f8d5faa445140b32a7daccd3724dac3529`
**Rama propuesta:** `work/fh-export-v2-canonical-core-01-20260802`
**Intent:** `canonical_contract_core`
**Estado:** `merged_not_wired`

## 1. Objetivo y contexto

Construir el núcleo técnico, puro y versionado de la futura fila común v2 de Farmacia Hospitalaria sin modificar ninguna salida pública ni pantalla.

El núcleo debe proporcionar:

- JSON Schemas de evento y fila;
- registro único y ordenado de columnas v2;
- tipos, enums, nulabilidad y bloques;
- creación y validación determinista de envelopes y filas;
- proyección `evento → 1..N filas` sin inferencia clínica;
- serialización TSV reversible y segura para Excel;
- preservación exacta de `0`, `false` y ausencia;
- soporte probado para estructuras JSON 1:N;
- ejemplos sintéticos de Validación, Primera Visita y Seguimiento.

Esta WO no conecta el núcleo a Validación, Primera Visita, Seguimiento, CSV, TXT JARA ni botones Excel. Las 61 columnas v1 continúan intactas y son la salida pública vigente.

## 2. Preflight obligatorio

Antes de escribir:

1. Verificar repositorio `b32majus/Hub-Clinico-Badajoz`.
2. Verificar que la rama base es `recovery/farmacia-pr-replay-20260727`.
3. Resolver el HEAD remoto exacto y anotarlo en el reporte final.
4. Confirmar que el HEAD contiene:
   - `docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`;
   - esta WO;
   - contrato WO8 v3 reconciliado.
5. Crear backup local antes de crear la rama de trabajo.
6. Crear worktree aislado y limpio.
7. No usar, limpiar ni restaurar el checkout principal.
8. Verificar que no existen rama o worktree incompatibles con el mismo nombre.
9. Leer:
   - `docs/INDEX.md`;
   - `docs/ops/WORK_ORDER_STATUS.md`;
   - `docs/farmacia_export_longitudinal_contract_WO8.md`;
   - `docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`;
   - `scripts/farmacia_excel_row_export.js` solo para asegurar que permanece intacto.

Si la base cambia durante el start, bloquear. No elegir automáticamente entre el SHA antiguo y el nuevo.

## 3. PROPUESTA técnica cerrada

### 3.1 Superficie pública del núcleo

Crear `scripts/farmacia_export_v2_core.js` como módulo browser-compatible, sin dependencias runtime y sin acceso a DOM, storage, red o reloj.

Debe exponer:

```text
window.FarmaciaExportV2Core
```

API mínima:

```text
EVENT_SCHEMA_VERSION
ROW_SCHEMA_VERSION
ROW_COLUMNS
FIELD_DEFINITIONS
createEventEnvelope(input)
createRow(input)
projectEventRows(event, rowPayloads)
validateEvent(event)
validateRow(row)
validateRowSet(rows)
buildRowId(sourceEventId, rowRole, rowKey)
stableStringify(value)
serializeRowToTsv(row)
serializeRowsToTsv(rows)
parseTsvRow(tsv)
parseTsvRows(tsv)
```

Reglas:

- no generar silenciosamente `event_id`, `source_event_id`, `patient_id`, timestamps ni `demo_flag`;
- no usar `Date.now()`, posición de array, nombre del medicamento ni primera coincidencia para construir identidades;
- `buildRowId()` exige un `rowKey` explícito y estable;
- `createEventEnvelope()` y `createRow()` no completan campos clínicos;
- `projectEventRows()` conserva identidad común, exige filas explícitas y bloquea duplicados o cardinalidad incoherente;
- `row_index` es 1-based, `row_count >= 1` y cada conjunto debe cubrir exactamente `1..row_count`;
- errores devuelven resultado estructurado o lanzan errores tipados documentados, no corrigen datos.

### 3.2 Versiones candidatas

```text
event_schema_version = 2.0.0-draft.1
row_schema_version   = 2.0.0-draft.1
```

La etiqueta `draft.1` indica que aún no existe cutover público. WO5 decidirá la promoción a `2.0.0`.

### 3.3 Schemas

Crear:

- `schemas/farmacia_export_event_v2.schema.json`;
- `schemas/farmacia_export_row_v2.schema.json`.

Requisitos:

- JSON Schema draft 2020-12;
- `additionalProperties: false`;
- tipos, enums y nulabilidad explícitos;
- el schema de fila incluye `x-column-order` con orden exacto;
- `x-column-order`, propiedades del schema, `ROW_COLUMNS` y `FIELD_DEFINITIONS` deben tener paridad exacta;
- los schemas no contienen datos clínicos reales.

### 3.4 Registro de columnas v2 candidate

WO1 fija una candidate ordenada de **152 columnas**. No se activa públicamente y puede revisarse antes de WO2.

#### A. Bridge, identidad y evento — 17

```text
bridge_status
bridge_processed_at
bridge_error_code
bridge_error_detail
event_schema_version
row_schema_version
event_id
source_event_id
row_id
row_role
row_index
row_count
event_type
event_status
occurred_at
recorded_at
demo_flag
```

#### B. Paciente y contexto — 10

```text
patient_id
identifier_system
identifier_value
hospital_code
service_code
service_label
pathology_code
pathology_label
professional_ref
professional_display
```

#### C. Referencias — 7

```text
request_id
validation_id
first_visit_id
visit_id
treatment_id
line_id
adverse_event_id
```

#### D. Solicitud — 20

```text
request_origin
request_date
validation_type
pharmacy_appointment_date
requested_drug_name
requested_active_ingredient
requested_presentation
requested_dose_text
requested_route
requested_schedule_code
requested_schedule_label
requested_schedule_other_text
requested_induction_status
requested_weight_text
requested_justification
request_source_observations
requested_selected_drug_id
requested_catalog_source
requested_national_code
requested_registration_number
```

#### E. Validación — 22

```text
validation_result
validation_pending_reason
validation_denial_reason
pharmacy_observations
other_validation_observations
validated_treatment_relation
validated_drug_name
validated_active_ingredient
validated_presentation
validated_dose_text
validated_route
validated_schedule_code
validated_schedule_label
validated_schedule_other_text
validated_induction_status
validated_selected_drug_id
validated_catalog_source
validated_national_code
validated_registration_number
validated_treatment_id
validated_line_id
line_creation_status
```

#### F. Prebiológico, comorbilidades y estructuras transversales — 20

```text
prebiologic_required
prebiologic_overall_status
analysis_date
analysis_recent_status
hemogram_verified
biochemistry_verified
tb_status
hbv_status
hcv_status
hiv_status
vaccination_status
vaccination_observations
preventive_medicine_status
validation_blockers_json
recurrent_infections_status
cardiovascular_risk_status
neurologic_disorder_status
neoplasia_history_or_risk_status
clinical_observations_json
related_treatments_json
```

#### G. Fotografía de línea — 16

```text
line_role
is_primary_line
line_status_at_event
active_at_event
line_drug_name
line_active_ingredient
line_presentation
line_dose_text
line_route
line_schedule_code
line_schedule_label
line_schedule_other_text
line_selected_drug_id
line_catalog_source
line_national_code
line_registration_number
```

#### H. Primera Visita — 6

```text
first_visit_date
induction_performed_status
stratification_level
baseline_proms_collection_status
pharmacy_visit_notes
proms_json
```

`first_visit_date` representa en el circuito actual visita, inicio, primera dispensación y primera administración. No se crean cuatro fechas redundantes.

#### I. Seguimiento — 34

```text
visit_date
stratification_review_status
previous_stratification_level
new_stratification_level
stratification_change_reason
followup_proms_collection_status
visit_general_observations
dispensation_status
dispensation_observations
specific_review_status
specific_review_reason
therapeutic_movement_type
new_dose_text
new_schedule_code
new_schedule_label
new_schedule_other_text
new_route
movement_reason
movement_effective_date
suspension_status
suspension_reason
suspension_effective_date
line_observations
adherence_collection_status
adherence_instrument
adherence_result
adherence_answers_json
adverse_event_status
adverse_event_description
adverse_event_severity
adverse_event_resolution_status
adverse_event_action
adverse_event_suspects_json
causality_assessments_json
```

### 3.5 Enums mínimos

```text
bridge_status:
  PENDIENTE | PROCESADA | ERROR

event_type:
  pharmacy_validation | pharmacy_first_visit | pharmacy_followup

row_role:
  validation | first_visit_line | followup_line

yes_no_not_recorded:
  yes | no | not_recorded

validation_result:
  pending | validated | denied | not_recorded

validated_treatment_relation:
  same_as_requested | modified_from_requested |
  no_treatment_validated | not_recorded

line_creation_status:
  created | updated | not_created | not_applicable | not_recorded

dispensation_status:
  dispensed | not_dispensed | not_recorded

specific_review_status:
  performed | not_performed | not_recorded

specific_review_reason:
  dose_or_schedule_change | suspension | adverse_event |
  adherence_review | other | not_recorded

therapeutic_movement_type:
  no_change_recorded | dose_change | schedule_change |
  dose_and_schedule_change | suspension | other | not_recorded

adverse_event_status:
  present | absent | not_recorded
```

No usar `—`, `Pendiente de completar por Farmacia` ni textos visuales como valores canónicos. Los enums anteriores quedan cerrados en WO1; los campos de dominio todavía no cerrados se tipan como `string | null` y solo podrán restringirse en una WO adaptadora posterior, sin que OpenCode invente listas adicionales.

### 3.6 Tipos y ausencia

- ausencia: celda vacía y propiedad `null`/omitida según schema;
- `0`: número cero;
- `false`: booleano falso;
- booleanos TSV: `TRUE` / `FALSE`;
- fechas: ISO, sin rellenar con fecha de exportación;
- textos: codificación reversible de tabuladores, barras y saltos de línea;
- JSON: `stableStringify()` canónico, sin saltos ni tabuladores literales;
- no convertir vacío en `no`, `false`, `not_recorded` o `pending`.

### 3.7 Roundtrip TSV obligatorio

Debe demostrarse:

```text
objeto tipado
→ fila ordenada
→ TSV de una línea
→ parse
→ objeto tipado equivalente
```

Cobertura mínima:

- comillas y Unicode;
- tabuladores y saltos de línea en textos;
- barras invertidas literales;
- arrays y objetos anidados;
- varios tratamientos relacionados;
- varios sospechosos y causalidades;
- `0`, `false`, `null` y cadena vacía;
- dos filas del mismo evento con IDs de fila distintos.

No basta comprobar que el JSON sea válido: debe recuperarse semánticamente igual.

### 3.8 Ejemplos sintéticos

Crear:

- `data/demo/farmacia/export_v2/validation_event_v2.json`;
- `data/demo/farmacia/export_v2/first_visit_event_v2.json`;
- `data/demo/farmacia/export_v2/followup_event_v2.json`.

El ejemplo de Seguimiento contiene al menos dos filas:

1. línea activa y dispensada, sin revisión específica;
2. línea activa no dispensada, con revisión específica y cambio de pauta.

Los ejemplos no deben afirmar que ya existe un adaptador del runtime. Son fixtures contractuales del core.

## 4. RUTAS autorizadas

1. `scripts/farmacia_export_v2_core.js`
2. `schemas/farmacia_export_event_v2.schema.json`
3. `schemas/farmacia_export_row_v2.schema.json`
4. `docs/contracts/FARMACIA_EXPORT_V2_CORE_CONTRACT.md`
5. `tools/farmacia_export_v2_core_check.mjs`
6. `data/demo/farmacia/export_v2/validation_event_v2.json`
7. `data/demo/farmacia/export_v2/first_visit_event_v2.json`
8. `data/demo/farmacia/export_v2/followup_event_v2.json`
9. `docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md` — únicamente reporte final y estado de ejecución

No modificar ninguna ruta adicional.

## 5. NO TOCA

- `scripts/farmacia_excel_row_export.js` y sus 61 columnas.
- `scripts/farmacia_validacion.js`.
- `scripts/farmacia_primera_visita.js`.
- `scripts/farmacia_seguimiento.js`.
- cualquier HTML o CSS.
- TXT JARA, CSV o portapapeles públicos.
- workbook, ledger, localStorage/sessionStorage.
- `previews/caceres-fh/`.
- `main`, Pages o workflows.
- Office Script, Excel Bridge, vistas `APP_*` o PostgreSQL.
- catálogo CIMA, pautas o tratamiento común.
- datos reales.

No añadir `<script>` en ninguna pantalla. La API existe en código, pero no está cableada ni visible.

## 6. Tests obligatorios

### 6.1 Estáticos y contrato

```bash
node --check scripts/farmacia_export_v2_core.js
node tools/farmacia_export_v2_core_check.mjs
git diff --check
```

El check debe validar al menos:

- API pública exacta;
- ausencia de DOM, storage, fetch/XHR, reloj y aleatoriedad;
- 152 columnas únicas en orden exacto;
- paridad schema ↔ `ROW_COLUMNS` ↔ `FIELD_DEFINITIONS`;
- `additionalProperties: false`;
- required fields comunes;
- tipos y enums;
- rechazo de columnas extra;
- rechazo de IDs ausentes o duplicados;
- coherencia `row_index`/`row_count`;
- conservación de identidad entre filas del mismo evento;
- roundtrip TSV tipado;
- estructuras JSON 1:N;
- ejemplos sintéticos válidos;
- ninguna copia automática de solicitado a validado;
- ninguna creación de línea desde nombre de fármaco;
- ningún valor visual prohibido.

### 6.2 Regresión v1

Ejecutar sin modificar sus fuentes:

```bash
node tools/farmacia_excel_row_export_check.mjs
node tools/farmacia_smoke_check.mjs
node tools/farmacia_common_check.mjs
node tools/farmacia_tratamiento_common_check.mjs
```

Cualquier fallo nuevo bloquea. Un fallo histórico solo puede declararse excepción si se reproduce exactamente en la base y se documenta; WO1 no corrige tests ajenos.

### 6.3 QA navegador

`N/A` para esta WO: no existe integración HTML ni interacción visible. No presentar esta ausencia como QA de navegador realizada.

### 6.4 Revisión independiente

Ejecutar revisión read-only crítica sobre el diff completo, centrada en:

- determinismo;
- seguridad clínica y no inferencia;
- pérdida de información;
- estabilidad de IDs;
- reversibilidad TSV;
- cumplimiento de rutas;
- riesgo de activar accidentalmente v2.

## 7. Criterios de aceptación

- Todas las rutas autorizadas y solo esas rutas están modificadas.
- El núcleo es puro y determinista.
- Las versiones son `2.0.0-draft.1`.
- Existen 152 columnas candidate con paridad completa entre código y schema.
- Los ejemplos de los tres actos validan.
- Seguimiento demuestra 1 evento → 2 filas con contexto común e identidades de línea diferentes.
- `0`, `false`, ausencia, Unicode y texto multilinea sobreviven al roundtrip.
- JSON 1:N sobrevive al ciclo TSV sin pérdida.
- El exportador v1 y las pantallas permanecen byte-for-byte fuera del diff.
- No hay integración visible ni promesa de piloto.
- La revisión independiente concluye `APTO` o deja bloqueos concretos.

## 8. Reversión

Revertir exclusivamente el commit de WO1. Al no estar cableado en HTML ni persistencia, la reversión elimina core, schemas, fixtures y tests sin migración ni impacto sobre v1.

## 9. Política de commit, push, PR y merge

- OpenCode implementa y prueba; no hace commit, push, issue, PR ni merge.
- Tras revisión Cora/Sil, un único commit local atómico:

```text
feat(farmacia): add export v2 canonical core
```

- Push, issue `status:approved`, PR y merge requieren autorización separada.
- La PR tendrá como base `recovery/farmacia-pr-replay-20260727`.
- No mezclar WO2 ni cambios documentales generales.
- No borrar rama o worktree al cerrar.

## 10. OUTPUT / reporte final obligatorio

```text
WO: WO-FH-EXPORT-V2-CANONICAL-CORE-01
BASE_BRANCH:
BASE_SHA:
WORK_BRANCH:
HEAD_LOCAL:
ROUTES_CHANGED:
CORE_API:
EVENT_SCHEMA_VERSION:
ROW_SCHEMA_VERSION:
COLUMN_COUNT:
SCHEMA_PARITY:
TSV_ROUNDTRIP:
EXAMPLES:
V1_REGRESSION:
BROWSER_QA: N/A — no integration
INDEPENDENT_REVIEW:
KNOWN_EXCEPTIONS:
CLINICAL_NONINFERENCE:
COMMIT: NOT_CREATED
PUSH: NOT_DONE
PR: NOT_CREATED
MERGE: NOT_DONE
FINAL_STATUS: READY_FOR_CORA_REVIEW | BLOCKED
```

## 11. Condición de salida

WO2 no comienza hasta que:

1. WO1 esté revisada;
2. cualquier bloqueo del core esté resuelto;
3. el commit y merge de WO1 estén autorizados y verificados;
4. el HEAD publicado nuevo sea la base explícita del stack WO2–WO4.

## 12. Reporte de ejecución — 2026-08-02

```text
WO: WO-FH-EXPORT-V2-CANONICAL-CORE-01
BASE_BRANCH: origin/recovery/farmacia-pr-replay-20260727
BASE_SHA: 5e9b59ba36dc7760f4529deece33248922ce0b9a
WORK_BRANCH: work/fh-export-v2-canonical-core-01-20260802
HEAD_LOCAL: 5e9b59ba36dc7760f4529deece33248922ce0b9a
ROUTES_CHANGED: scripts/farmacia_export_v2_core.js; schemas/farmacia_export_event_v2.schema.json; schemas/farmacia_export_row_v2.schema.json; docs/contracts/FARMACIA_EXPORT_V2_CORE_CONTRACT.md; tools/farmacia_export_v2_core_check.mjs; data/demo/farmacia/export_v2/validation_event_v2.json; data/demo/farmacia/export_v2/first_visit_event_v2.json; data/demo/farmacia/export_v2/followup_event_v2.json; docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md (estado y reporte)
CORE_API: PASS — 16 nombres públicos exactos en window.FarmaciaExportV2Core; proyección Bridge fijada a PENDIENTE y campos Bridge rechazados en payload
EVENT_SCHEMA_VERSION: 2.0.0-draft.1
ROW_SCHEMA_VERSION: 2.0.0-draft.1
COLUMN_COUNT: 152 únicas y en el orden aprobado
SCHEMA_PARITY: PASS — x-column-order, properties, ROW_COLUMNS y FIELD_DEFINITIONS; paridad de enums prebiológicos corregida para TB, HBV/HCV/HIV y vacunación, con preventive_medicine_status string|null
TSV_ROUNDTRIP: PASS — tipado, 0/false/null/cadena vacía, Unicode, multilinea, barras, comillas, prefijos de fórmula y JSON 1:N
EXAMPLES: PASS — Validación 1 fila; Primera Visita 1 fila; Seguimiento 2 filas con contexto común, adverse_event_id compartido e identidades de línea distintas
V1_REGRESSION: PASS — farmacia_excel_row_export_check, farmacia_smoke_check, farmacia_common_check y farmacia_tratamiento_common_check
BROWSER_QA: N/A — no integration
INDEPENDENT_REVIEW: APTO — revisión independiente fresca posterior a las correcciones de Cora, sin findings; higiene de las nueve rutas PASS (CRLF-only, sin espacios o tabuladores finales y con exactamente un CRLF final)
KNOWN_EXCEPTIONS: QA en la aplicación Excel N/A por no existir integración; format de JSON Schema depende del validador consumidor y la validación runtime semántica es autoritativa
CLINICAL_NONINFERENCE: PASS — no genera IDs/timestamps/demo_flag, no copia solicitado a validado y no crea tratamiento o línea desde nombres
COMMIT: 7109b5f1a9411793666e1e1f239e3ac25ce9437e
PUSH: DONE — work/fh-export-v2-canonical-core-01-20260802
ISSUE: #210 — CLOSED / COMPLETED
PR: #211 — MERGED
MERGE: 6ac041f8d5faa445140b32a7daccd3724dac3529
PAGES: 30754082136 — SUCCESS
FINAL_STATUS: MERGED_NOT_WIRED
```

## 13. Estado publicado reconciliado — 2026-08-02

- El core candidate `2.0.0-draft.1` existe en código y está publicado en `recovery/farmacia-pr-replay-20260727`.
- La API, schemas, 152 columnas, fixtures y checker están fusionados mediante PR #211.
- El core no está cargado por ningún HTML ni conectado a los actos clínicos.
- Las 61 columnas v1 permanecen como única salida pública.
- Browser QA y Excel QA continúan como `N/A` para WO1.
- La aptitud para piloto o producción no está acreditada.
- El siguiente bloque autorizado es el stack secuencial WO2–WO4, con base en el HEAD que publique la reconciliación documental posterior a WO1.
