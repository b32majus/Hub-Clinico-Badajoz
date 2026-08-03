# Contrato del adaptador Export v2 — Seguimiento de Farmacia por líneas activas

**Estado:** implementado en la rama `work/fh-export-v2-followup-active-lines-01-20260803` como infraestructura interna; sin cutover ni salida pública v2.
**Adaptador:** `1.0.0-draft.1`  
**Core requerido:** `FarmaciaExportV2Core` `2.0.0-draft.1`  
**Granularidad:** un evento `pharmacy_followup` por visita y una fila `followup_line` por línea de tratamiento **explícitamente activa** incluida en `activeLines`.

## Alcance y límites

El adaptador transforma un input explícito en un evento `pharmacy_followup`, una proyección de `1..N` filas `followup_line` y un TSV reversible delegado al core. Es síncrono, determinista y puro: no accede a DOM, storage, red, reloj ni aleatoriedad, y no genera IDs, fechas ni timestamps.

Este contrato **no activa** una salida pública v2, no cambia el exportador v1 (JARA, CSV, Excel FH de 61 columnas), no toca dispensación ni revisión específica, y no constituye un cutover ni una habilitación para piloto real. La dispensación y la revisión de línea son independientes de esta WO (secuencia WO2–WO4, documento `docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`).

## API pública exacta

`window.FarmaciaExportV2FollowupActiveLinesAdapter` expone únicamente:

1. `ADAPTER_VERSION`
2. `buildFollowupEvent(input)`
3. `buildFollowupProjection(input)`
4. `validateFollowupInput(input)`

`validateFollowupInput` devuelve `{ valid, errors }`. Los builders rechazan inputs inválidos con `FarmaciaExportV2FollowupActiveLinesAdapterError` (`code`, `message`, `details`), incluida la ausencia de líneas activas (`EMPTY_ACTIVE_LINES`); nunca devuelven una proyección vacía como resultado válido.

## Input cerrado

El nivel superior contiene exactamente `technical`, `context`, `visit` y `activeLines`. Se rechazan claves ajenas en cualquier bloque y cualquier campo C2–C5.

### `technical`

Obligatorios: `eventId`, `sourceEventId`, `visitId`, `patientId`, `occurredAt`, `recordedAt`, `demoFlag` y `eventStatus`. Opcionales explícitos: `hospitalCode`, `professionalRef` e `identifierSystem`. Ningún valor obligatorio se completa, deduce ni genera: `occurredAt` y `recordedAt` deben ser ISO explícitos sin fallback a reloj o `Date`.

### `context`

Campos admitidos: `identifierValue`, `serviceCode`, `serviceLabel`, `pathologyCode`, `pathologyLabel` y `professionalDisplay`. Los códigos (`serviceCode`, `pathologyCode`) provienen únicamente del input técnico, nunca del label visible. `identifierValue` es el CIP del paciente del acto y nunca se convierte en `patient_id`.

### `visit`

Único campo admitido: `visitDate`, obligatorio y con fecha real `YYYY-MM-DD` (los timestamps se rechazan). Procede exclusivamente del contexto técnico explícito; el control DOM autocompletado por reloj de la pantalla de Seguimiento no alimenta v2 en ningún caso.

### `activeLines`

Array no vacío; cada objeto cerrado contiene:

- identidad técnica: `rowKey`, `treatmentId`, `lineId`, `lineRole`, `isPrimaryLine`;
- estado explícito: `lineStatusAtEvent="active"`, `activeAtEvent=true`;
- snapshot clínico opcional: `drugName`, `activeIngredient`, `presentation`, `doseText`, `route`, `scheduleCode`, `scheduleLabel`, `scheduleOtherText`;
- metadatos opcionales: `selectedDrugId`, `catalogSource`, `nationalCode`, `registrationNumber`.

Reglas:

- **Fuente única:** `activeLines` es la única fuente del conjunto activo. El adaptador no añade, filtra, completa ni reordena líneas.
- **Orden:** se conserva exactamente el orden explícito del array; no se ordena por principal, `rowKey`, nombre, DOM, catálogo ni histórico. `row_index=1..N` sigue ese orden y `row_count=N`.
- **Rol cerrado:** `lineRole` admite únicamente `principal` y `additional` (mismo vocabulario ya publicado por el adaptador de Primera Visita v2, PR #217). Coherencia: `(lineRole === 'principal') ⇔ (isPrimaryLine === true)` y `(lineRole === 'additional') ⇔ (isPrimaryLine === false)`; se admiten cero o una principal y se rechaza más de una. El literal inglés `primary` se rechaza con `INVALID_LINE_ROLE`; no se normaliza silenciosamente ni se aceptan ambos vocabularios.
- **Identidad clínica:** cada línea requiere `drugName` o `activeIngredient` no vacío tras normalización. Dosis, presentación, pauta o metadatos aislados no crean identidad.
- **Estado:** toda línea debe declarar `lineStatusAtEvent="active"` y `activeAtEvent=true`; una línea inactiva dentro del array rechaza el input completo (nunca se filtra en silencio).
- `rowKey` y `lineId` son obligatorios y únicos.

## Ausencia (Ajuste 4)

- `null`, `false` y `0` se preservan como valores distintos a través de evento, filas y TSV; `false` se serializa `FALSE` y `null` como celda vacía.
- Los strings opcionales vacíos o de solo espacios se construyen como `null` (no son estado clínico).
- Los strings obligatorios vacíos o de solo espacios producen error (`EMPTY_REQUIRED`), nunca se completan.
- `drugName=""` y `activeIngredient=""` no identifican una línea.

## Evento y proyección

El evento contiene los campos comunes del core (`event_id`, `source_event_id`, `event_type`, `event_status`, `occurred_at`, `recorded_at`, `demo_flag`, `patient_id`, `visit_id`), el contexto admitido y `visit_date`. No contiene bloques de Validación, Primera Visita, PROMs, dispensación, revisión específica, movimiento terapéutico, suspensión, adherencia, evento adverso, causalidad ni tratamientos relacionados.

`buildFollowupProjection` delega en `FarmaciaExportV2Core.projectEventRows` (que conserva el orden y asigna `row_index` en consecuencia), y devuelve `{ event, rows, tsv }`. Todas las filas usan `row_role="followup_line"`, `bridge_status="PENDIENTE"`, comparten los campos del evento, tienen `row_index`/`row_count` coherentes y son reversibles mediante `parseTsvRows`.

## Bridge DOM de Seguimiento

`window.FarmaciaSeguimiento` añade:

- `buildFollowupV2Input(technicalContext)`
- `buildFollowupV2Projection(technicalContext)`

El `technicalContext` es un objeto cerrado con los campos técnicos, contexto, `identifierValue`, `visitDate` y `activeLines`. El bridge:

1. **Guarda CIP:** exige coincidencia exacta entre el CIP visible (`#fhSegCip`) y `identifierValue` técnico; una discrepancia produce `BRIDGE_CIP_MISMATCH` y nunca mezcla pacientes.
2. **Correspondencia visible:** cada `lineId` técnico debe tener correspondencia visible inequívoca (una línea con ese `linea_id` en las líneas visibles del paciente actual); ausente → `BRIDGE_LINE_NOT_VISIBLE`, duplicada → `BRIDGE_AMBIGUOUS_LINE`.
3. **Sin igualdad de conjuntos:** no exige que `activeLines` cubra todas las líneas visibles; una línea visible adicional no se incorpora ni invalida por sí sola.
4. **Sin mutación ni reordenación:** no añade, filtra, completa ni reordena `activeLines`, y no muta el `technicalContext`.
5. **Sin fecha DOM:** `visitDate` proviene solo del contexto técnico; el control autocompletado de la pantalla no se lee para v2.

`currentBiologicLines`, `patient.biologicos`, `DEMO_LINE_CONTRACT`, storage, ledger, `selected_line_ids` y `dispensed_line_ids` no son fuentes v2.

## Clasificación campo a campo (Ajuste 6)

| Campo actual / hecho | Campo v2 | Clase | Decisión |
|---|---|---:|---|
| CIP visible | `identifier_value` | C1 | Contexto y guard; nunca `patient_id` |
| Origen (servicio) | `service_code`, `service_label` | C1 | Código solo desde input técnico |
| Indicación | `pathology_code`, `pathology_label` | C1 | Código solo desde input técnico |
| Profesional visible | `professional_display` | C1 | `professional_ref` solo desde input técnico |
| Fecha de seguimiento (técnica) | `visit_date` | C1 | Solo contexto técnico explícito real `YYYY-MM-DD` |
| Fecha de seguimiento (control DOM) | `visit_date` | C4 | Autocompletada por reloj; no clínicamente explícita; fuera |
| IDs evento/origen/visita/paciente | `event_id`, `source_event_id`, `visit_id`, `patient_id` | C1 | Obligatorios desde `technical` |
| `linea_id` | `line_id` | C1 | Obligatorio y único desde `activeLines` |
| `tratamiento_id_principal` | `treatment_id` | C1 | Obligatorio desde `activeLines`; sin fallback a `line_id` |
| Principal/adicional | `line_role`, `is_primary_line` | C1 | Preservados explícitamente; rol cerrado `principal`/`additional`; 0..1 principal; `primary` rechazado |
| Estado de línea | `line_status_at_event` | C1 | Debe ser exactamente `active` |
| Actividad | `active_at_event` | C1 | Debe ser exactamente `true` |
| Marca / nombre de línea | `line_drug_name` | C1 | Solo desde `activeLines` |
| Principio activo | `line_active_ingredient` | C1 | Solo desde `activeLines` |
| Presentación | `line_presentation` | C1 | No derivada de dosis |
| Dosis | `line_dose_text` | C1 | No derivada de presentación |
| Vía | `line_route` | C1 | Sin normalización inferida |
| Pauta / intervalo | `line_schedule_*` | C1 | Solo valores técnicos explícitos |
| Catálogo / CN / registro | `line_selected_drug_id`, `line_catalog_source`, `line_national_code`, `line_registration_number` | C1 | Solo provenance explícita |
| Fecha de inicio de línea | — | C2 | Visible, sin campo canónico en snapshot v2; fuera |
| Etiquetas de línea | — | C2 | Visible, sin campo canónico; fuera |
| Adherencia / Morisky | `adherence_*` | C3 | Fuera de WO4 |
| DLQI / EVA / demás PROMs | `proms_json` | C3 | Fuera de WO4 |
| Eventos adversos | `adverse_event_*` | C3 | Fuera de WO4 |
| Sospechosos y causalidad | `adverse_event_suspects_json`, `causality_assessments_json` | C3 | Fuera de WO4 |
| Dispensación | `dispensation_status`, `dispensation_observations` | C3 | WO4 no depende de ella; queda `null` |
| Selección / evaluación de línea | `specific_review_status` | C4 | La selección, incluida la automática, no prueba revisión |
| Estratificación | `stratification_review_status`, `previous_stratification_level`, `new_stratification_level`, `stratification_change_reason` | C3/C4 | "No cambia" no equivale a "no revisado"; fuera |
| Optimización / nueva dosis / pauta | `therapeutic_movement_type`, `new_dose_text`, `new_schedule_*`, `new_route` | C3 | Fuera de WO4 |
| Movimientos / suspensión / motivo | `movement_*`, `suspension_*` | C3 | Fuera de WO4 |
| Observaciones de línea | `line_observations` | C3 | Reservadas; requieren revisión específica |
| Observaciones generales de visita | `visit_general_observations` | C3 | Fuera de WO4 |
| Tratamientos relacionados | `related_treatments_json` | C3/C4 | No son líneas activas actuales |
| Catálogo manual sin línea técnica | — | C4 | La selección farmacológica no crea línea v2 |
| Estado del ledger / restauración | — | C5 | No cableado ni demostrado; nunca fuente |

Solo C1 puede entrar en el evento o las filas de WO4.

## Errores tipados

`FarmaciaExportV2FollowupActiveLinesAdapterError` y `FarmaciaSeguimientoV2BridgeError` incluyen `code`, `message` y `details`. Códigos destacados del adaptador: `EMPTY_ACTIVE_LINES`, `MISSING_REQUIRED`, `EMPTY_REQUIRED`, `INVALID_VISIT_DATE`, `INVALID_ISO_DATE`, `LINE_NOT_IDENTIFIABLE`, `FOLLOWUP_LINE_STATUS`, `FOLLOWUP_LINE_MUST_BE_ACTIVE`, `INVALID_LINE_ROLE`, `INVALID_PRIMARY_COHERENCE`, `MULTIPLE_PRIMARY_LINES`, `DUPLICATE_ROW_KEY`, `DUPLICATE_LINE_ID`, `PLACEHOLDER_NOT_ALLOWED`, `UNKNOWN_FIELD`. Códigos del bridge: `BRIDGE_INVALID_TECHNICAL_CONTEXT`, `BRIDGE_EMPTY_ACTIVE_LINES`, `BRIDGE_CIP_MISMATCH`, `BRIDGE_LINE_NOT_VISIBLE`, `BRIDGE_AMBIGUOUS_LINE`, `BRIDGE_INVALID_ACTIVE_LINE`, `BRIDGE_ADAPTER_UNAVAILABLE`.

## Verificación

`tools/farmacia_export_v2_followup_active_lines_adapter_check.mjs` cubre API, versión, pureza, input cerrado, errores tipados, IDs y fechas explícitas, orden preservado, reglas de principal, ausencia, campos C2–C5 ausentes, validación contra core y reversibilidad TSV. `tools/farmacia_export_v2_followup_browser_check.mjs` cubre con Chromium y servidor efímero los guard del bridge (CIP, líneas visibles, contexto stale, cero líneas), la fecha técnica frente a la DOM autocompletada, la no creación de líneas por catálogo y la regresión v1 (JARA, CSV y Excel FH de 61 columnas).
