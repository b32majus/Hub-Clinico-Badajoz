# Contrato N0 — Handoff de renovaciones Farmacia Hospitalaria ↔ Enfermería

| Metadato | Valor |
| --- | --- |
| Estado | `SHAPING_N0 / CONTRACT_PENDING` — contrato funcional mínimo congelado para N1/N2/N3; sin runtime |
| Fecha | 2026-10-04 |
| Issue / WO | #446 — `WO-SHAPE-NEXUS-RENEWALS-N0` (`OPEN`, `status:approved`) |
| Autoridad de shaping | Autoridad viva de producto: [`../ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`](../ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md) (#501, posterior a la creación de #446) y [`../ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](../ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md) §9 (`SIL-REV-012/013 = SHAPING_APPROVED`) |
| Base (rama / SHA) | `work/nexus-renewals-n0-446-20261004` desde `promueve/nexus-v4` @ `fca8b7d9fc5f73a84599b8c36999cb73e2351fa6` (merge PR #503); último HEAD de producto `3bf45760a27630823b61b0d19da8b64aeb060693` (PR #490, F4.4 Pharmacy Act v1) |
| Referencia exploratoria a reconciliar | [`../architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`](../architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md) (no autoridad de contrato; ver §11) |
| Madurez | **Contrato únicamente.** No hay runtime, integración, scheduler, UI, persistencia ni piloto/producción. Datos exclusivamente sintéticos. |
| Autoridad legible por máquina | Schemas [`../../schemas/renewal/`](../../schemas/renewal/) y máquina de estados [`renewal_state_machine_v1.json`](../../schemas/renewal/renewal_state_machine_v1.json) (autoridad única de estados; este documento describe y enlaza, no la duplica) |
| Verificación | `npm run check:renewal:contract` (`tools/renewal_handoff_contract_check.mjs`) |
| Delivery boundary | Rama local + commit local. **STOP antes de push/PR/merge** salvo autorización explícita adicional de Sil. |

Este documento es la **única autoridad N0** del circuito de renovaciones FH ↔ Enfermería. Su objetivo es que N1/N2/N3 puedan implementarse desde extremos distintos sin inventar semántica. No introduce documentación ritual duplicada.

## 1. Propósito y alcance

Farmacia Hospitalaria necesita anticipar prescripciones próximas a caducar y coordinar la renovación con el servicio prescriptor **sin confundir una comunicación operativa con una validación farmacoterapéutica**. Este contrato fija:

- identidad estable de línea/ciclo/renovación;
- qué fecha inicia el cómputo y cómo se distingue `confirmed / verified / estimated`;
- qué significa la caducidad (`valid_until`) y cómo se computa la ventana;
- estados y autoridad de cada transición;
- el envelope versionado de ida (FH → Enfermería) y vuelta (Enfermería → FH);
- idempotencia, conflictos, version mismatch y errores tipados;
- la separación entre **contrato de acto/dominio** y **transporte**, coherente con F4.4 Pharmacy Act v1 — **sin ejecutar ni extender F4.5 dentro de #446**.

Fuera de alcance: implementación N1/N2/N3/N4, scheduler/Actions, CIMA, Reuma, Dermatología, Presalud, backend V5, `main`, snapshots, datos reales y la resolución de preguntas abiertas de #501 (§10).

## 2. Invariantes vinculantes

1. La renovación pertenece a una **línea/ciclo de tratamiento**, nunca al paciente global.
2. **`RENEWED_REPORTED ≠ FH_UPDATED`**: una comunicación, check o import de Enfermería **nunca** prolonga ni confirma por sí mismo la validación farmacoterapéutica.
3. Enfermería, Excel y la comunicación operativa nunca actualizan FH.
4. `switch` / `add-on` / renovación **jamás** se infieren desde nombre de fármaco, historial o ausencia de datos.
5. `confirmed / verified / estimated` permanecen distintos; una estimación nunca pasa a confirmada en silencio.
6. `warningWindowDays` y la duración de referencia son **hipótesis configurables, no constantes universales**.
7. Excel es un **adapter soportado**, nunca la autoridad conceptual del workflow.
8. El contrato de acto/dominio se mantiene separado del transporte (coherente con F4.4); **F4.5 no se ejecuta aquí**.
9. `PENDIENTE_RECOGIDA` (dispensación esperada no registrada) **no** es renovación de prescripción.
10. Datos exclusivamente sintéticos; ningún identificador o dato clínico real.

## 3. Vocabulario de identidad

Se ancla en el contrato publicado [`FARMACIA_EXPORT_V2_TECHNICAL_CONTEXT_CONTRACT.md`](./FARMACIA_EXPORT_V2_TECHNICAL_CONTEXT_CONTRACT.md): `patientId` es estable entre actos del mismo paciente; `treatmentId`/`lineId` son estables entre eventos de la misma línea; los IDs de acto/evento son por evento.

### A. Identidad

- **Unidad de renovación = línea de tratamiento.** El ciclo de renovación se abre para una línea, no para el paciente.
- `renewal_id`: identificador estable, **opaco, no vacío y único**, acuñado por FH al abrir un ciclo de renovación de una línea. Se transporta **verbatim** por todo el circuito. Nunca se deriva del nombre del paciente, del fármaco ni del CIP. Nunca se reutiliza: una corrección abre un **nuevo** `renewal_id`.
- `line_id`: identidad de línea, estable entre eventos de la misma línea.
- `treatment_id` (opcional): identidad de tratamiento (estable entre líneas de un mismo tratamiento cuando aplique).
- `patient_id`: identificador explícito del paciente en el flujo soportado FH ↔ Enfermería (fixtures sintéticos). No es un CIP.
- `service_id`: código **explícito, no vacío y opaco** del servicio clínico. Un servicio ausente/desconocido **falla cerrado**: no se reconcilia por heurística de nombre. El vocabulario canónico de `service_id` queda `CONTRACT_PENDING` (§10, mismo problema de nomenclatura SES que `SIL-REV-001`).
- `renewal_id` **no** es `solicitud_id`: la identidad de reconciliación Enfermería v6 (`solicitud_id`, ver [`../INDEX.md`](../INDEX.md) §9) pertenece a **otro circuito**. No se infiere ninguna correspondencia entre ambos.

## 4. B. Fechas y caducidad

Modelo cerrado:

- `valid_until`: **endpoint operativo de caducidad del ciclo actual** (fecha, `YYYY-MM-DD`).
- `valid_until_kind ∈ {confirmed, verified, estimated, unknown}`.
- `valid_until_source`: enum cerrado con mapeo explícito a `kind`.
- `evaluated_at`: instante (RFC 3339) de la evaluación; se registra siempre.
- `warning_window_days`: ventana de aviso gobernada, eco por registro para auditabilidad.
- `default_validity_days`: duración de referencia, configuración gobernada (no universal).

### Mapeo `valid_until_source` → `valid_until_kind` y campos exigidos

| `valid_until_source` | `valid_until_kind` | Campos adicionales exigidos |
| --- | --- | --- |
| `prescription_valid_until_confirmed` | `confirmed` | `valid_until` |
| `prescription_issue_date_confirmed_duration_confirmed` | `confirmed` | `valid_until`, `issue_date`, `validity_days` |
| `prescription_issue_date_confirmed_duration_configured` | **`estimated`** | `valid_until`, `issue_date`, `validity_days` |
| `pharmacy_verified_remaining_period` | `verified` | `valid_until` |
| `circuit_entry_estimate` | `estimated` | `valid_until` |
| `manual_estimate` | `estimated` | `valid_until` |
| `not_recorded` | `unknown` | `valid_until = null` |

Reglas duras:

- Una duración **configurada** (`..._duration_configured`) **jamás** asciende a `confirmed`. La duración de referencia puede ser un default gobernado (`default_validity_days`), pero su origen siempre queda visible por el enum de `source`.
- `unknown` **nunca materializa fecha**: `valid_until = null` y `window_state = not_evaluable`.
- No existe fabricación `+365d`: la duración proviene de `validity_days` explícito o de `default_validity_days` gobernado, con su `source` visible.
- Cuando el endpoint se deriva de `issue_date + duración`, FH lo **materializa explícitamente** en `valid_until` (o lo marca `estimated`/`unknown`). El transporte nunca recalcula ni completa la fecha.

### Una sola fuente por registro / jerarquía de fuentes

- Cada registro exportado lleva **exactamente una** `valid_until_source` (campo único del envelope; nunca una lista de fuentes).
- Cuando coexisten varias fuentes candidatas para el mismo endpoint, FH aplica esta **jerarquía de precedencia** (de mayor a menor; reconcilia la §7 de [`TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`](../architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md) en este contrato v1):

  1. `prescription_valid_until_confirmed`
  2. `prescription_issue_date_confirmed_duration_confirmed`
  3. `pharmacy_verified_remaining_period`
  4. `prescription_issue_date_confirmed_duration_configured`
  5. `circuit_entry_estimate`
  6. `manual_estimate`
  7. `not_recorded`

- Si dos candidatas del **mismo nivel de precedencia** (o dos fuentes `confirmed` que discrepan en la fecha resultante) no coinciden, FH **falla cerrado**: el registro **no se exporta** hasta que un acto FH explícito resuelva la fuente (`DATE_SOURCE_CONFLICT`; código del lado de exportación FH, **no** es un código de retorno de Enfermería). Nunca se elige en silencio, nunca se promedia ni se mezcla. La comparación es por **fecha resultante** (endpoint): dos candidatas que **concuerdan** en la fecha resultante **no** son un conflicto y la jerarquía resuelve con normalidad (gana la de mayor precedencia; en el mismo nivel, esa misma fuente); solo la **discrepancia** en la fecha resultante —mismo nivel o dos `confirmed`— dispara el fallo cerrado. El checker demuestra esta jerarquía con un helper puro de precedencia/conflicto sobre candidatos `{source, endpoint}` (gana el nivel más alto; colisión de endpoints en el mismo nivel o entre dos `confirmed` ⇒ conflicto).
- Una fuente estimada jamás se convierte en confirmada en silencio (invariante 5).
- **Validez de calendario:** los patrones de fecha del schema son anotativos; la validación semántica en runtime (días reales del mes, años bisiestos, rangos de hora y offset, sin normalización) es **autoritativa** en el checker — misma postura que `FARMACIA_EXPORT_V2_CORE_CONTRACT.md`. Una fecha imposible (`2026-02-31`) se rechaza con `INVALID_FIELD` aunque el patrón la admita, y el cómputo de ventana solo se ejecuta sobre fechas ya validadas.

### Semántica exacta de ventana

Con `days = valid_until − fecha(evaluated_at)`:

| Condición | `window_state` |
| --- | --- |
| `days < 0` | `expired` |
| `0 ≤ days ≤ warning_window_days` | `due_soon` |
| `days > warning_window_days` | `outside_window` |
| `valid_until_kind = unknown` | `not_evaluable` |

- **Hipótesis candidata:** `warning_window_days = 60` y `default_validity_days` configurables. **No son constantes universales** hasta validación del equipo (§10).
- El checker recomputa `window_state` de forma independiente y rechaza un registro que lo declare incoherente con las fechas.

## 5. C. Estados y autoridad

El eje **derivado** `window_state` (`outside_window | due_soon | expired | not_evaluable`) y el eje **registrado** `lifecycle_state` (`OPEN | REQUESTED_TO_SERVICE | IN_PROGRESS | RENEWED_REPORTED | PENDING_FH_REVIEW | FH_UPDATED | CANCELLED | NOT_APPLICABLE`) están **separados y son disjuntos**.

> **Autoridad única de estados:** [`schemas/renewal/renewal_state_machine_v1.json`](../../schemas/renewal/renewal_state_machine_v1.json). Los estados, transiciones, conjuntos de actores, estados terminales, disparadores prohibidos e invariantes viven ahí; este documento los describe y los enlaza, sin crear una segunda fuente de verdad.

Actores:

- `pharmacy` — acto profesional FH explícito, independiente del transporte. Único actor que puede producir `FH_UPDATED`.
- `nursing` — comunicación operativa por el transporte de retorno soportado.
- `pharmacy_module` — comportamiento FH determinista sobre entrada explícita; **nunca** se dispara por tiempo, silencio o ausencia.

Transiciones invariantes-críticas (conjunto de actores declarado en la máquina de estados):

| Transición | Actores |
| --- | --- |
| `RENEWED_REPORTED → PENDING_FH_REVIEW` | `{pharmacy_module}` — solo por recepción explícita del reporte |
| `PENDING_FH_REVIEW → FH_UPDATED` | **`{pharmacy}`** — acto explícito; registra `renewed_at`/actor; la validez nueva procede **solo** de valores aportados explícitamente, nunca inferida |
| `FH_UPDATED`, `CANCELLED`, `NOT_APPLICABLE` | **terminales**: sin transiciones salientes, sin resurrección |
| Disparadores prohibidos | `time` / `silence` / `absence` (y derivados): ninguna transición se dispara por tiempo, silencio o ausencia |

**Matriz completa, actores y terminales: JSON de autoridad** [`schemas/renewal/renewal_state_machine_v1.json`](../../schemas/renewal/renewal_state_machine_v1.json) — este documento no la duplica.

Reglas:

- **La recomputación de ventana nunca avanza ni crea por sí misma un estado de lifecycle.** `pharmacy_module` **puede** abrir de forma idempotente **un único** ciclo `OPEN` por línea cuando la evaluación alcanza por primera vez `due_soon`/`expired`; nunca un segundo ciclo abierto, y nunca para `not_evaluable`.
- `RENEWED_REPORTED` y `PENDING_FH_REVIEW` **nunca** modifican `valid_until`, `valid_until_kind`, `valid_until_source`, `service_id` ni el estado de línea.
- El único borde hacia `FH_UPDATED` es el acto explícito de `pharmacy`: esta es la forma impuesta por máquina de `RENEWED_REPORTED ≠ FH_UPDATED`.
- `FH_UPDATED`, `CANCELLED` y `NOT_APPLICABLE` son **terminales**: no hay resurrección. Una corrección abre un ciclo nuevo con nuevo `renewal_id`.
- `switch` sigue siendo una operación explícita: la aparición de otro fármaco no crea ni cierra una renovación.

## 6. D. Contrato FH → Enfermería

Schema: [`renewal_handoff_fh_to_nursing_v1.schema.json`](../../schemas/renewal/renewal_handoff_fh_to_nursing_v1.schema.json). Envelope versionado `contract_version = "renewal-handoff/v1"`; el campo `record_type = "renewal_handoff_fh_to_nursing"` discrimina el envelope. `additionalProperties: false`.

**Obligatorios:** `contract_version`, `record_type`, `renewal_id`, `line_id`, `patient_id`, `service_id`, `lifecycle_state`, `window_state`, `evaluated_at`, `warning_window_days`, `valid_until`, `valid_until_kind`, `valid_until_source`, `exported_at`, `exported_by_role = "pharmacy"`, `demo_flag`.

**Opcionales:** `treatment_id`, `issue_date`, `validity_days`, `service_label`, `requested_at`, `comment`, y el bloque `treatment` (`line_label`, `drug_display`) **explícitamente display-only** y **nullable** (`null` explícito = ausencia): no es identidad y no autoriza switch/renovación. Ninguna regla cross-field deriva estado desde ese bloque.

Reglas de presencia: un campo opcional ausente y un `null` explícito significan ambos **ausencia** (los schemas declaran `string|null`/`date|null` para los opcionales, en línea con `farmacia_export_event_v2.schema.json`); la ausencia nunca se convierte en valor. Una fuente que **exige** un campo por regla cross-field (p. ej. `issue_date`/`validity_days` bajo una fuente de duración) falla con `INVALID_FIELD` si el campo está presente pero `null`: el `null` cuenta como ausencia. `valid_until` permanece obligatorio pero nullable (`null` solo legal con `valid_until_source = not_recorded`); `renewal_id`/`line_id`/`patient_id`/`service_id` nunca son null. No se fija ningún dato clínico más allá de lo explícitamente conocido.

## 7. E. Contrato Enfermería → FH

Schema: [`renewal_handoff_nursing_to_fh_v1.schema.json`](../../schemas/renewal/renewal_handoff_nursing_to_fh_v1.schema.json). `contract_version = "renewal-handoff/v1"`; `record_type = "renewal_report_nursing_to_fh"`. `additionalProperties: false`.

**Obligatorios:** `contract_version`, `record_type`, `renewal_id`, `line_id`, `patient_id`, `service_id`, `report_type ∈ {requested_to_service, in_progress, renewal_reported}`, `reported_at`, `reported_by_role = "nursing"`, `demo_flag`.

**Opcionales:** `reported_by`, `comment` (`maxLength: 1000`, observación operativa; nunca se interpreta clínicamente). Ambos son `string|null`: ausente o `null` explícito = ausencia, misma regla de presencia que §6.

**Prohibido por construcción** (no está en el schema y se documenta): cualquier `valid_until`/duración/tipo de fecha nuevos, cualquier campo terapéutico (dosis/vía/pauta/presentación/inducción), cualquier flag de validación, el estado `FH_UPDATED`, cualquier cambio de `patient_id`/`line_id`/`service_id`, y cualquier identificador de acto/commit. Un campo prohibido presente en el retorno se rechaza a **nivel de schema** con `FORBIDDEN_FIELD_IN_RETURN`.

`nursing` **nunca** puede alcanzar `FH_UPDATED`: el enum de `report_type` no lo incluye y el único borde hacia `FH_UPDATED` exige `pharmacy` (ver §5).

## 8. F. Idempotencia, conflictos y errores

Códigos tipados, fail-closed, con atomicidad **por fila**:

| Código | Semántica |
| --- | --- |
| `UNSUPPORTED_CONTRACT_VERSION` | Rechaza el **lote completo**, sin parseo parcial. |
| `MISSING_REQUIRED_FIELD` | Falta un campo obligatorio del envelope. |
| `INVALID_FIELD` | Campo/enum/formato/cross-field inválido. |
| `UNKNOWN_RENEWAL_ID` | El retorno **nunca crea** una renovación: `renewal_id` desconocido. |
| `IDENTITY_MISMATCH` | `patient_id`/`line_id`/`service_id` difieren del registro FH. |
| `DUPLICATE_RENEWAL_ID_IN_BATCH` | El mismo `renewal_id` aparece dos veces en un lote; se rechaza el lote. |
| `STATE_CONFLICT` | Misma operación (`renewal_id` + `report_type` + `reported_at`) ya aplicada con payload distinto; el estado FH se preserva, **sin merge**. |
| `REPORT_NOT_APPLICABLE` | El target no es alcanzable desde el lifecycle actual (incluye estados terminales y targets regresivos, con o sin retorno previo). |
| `LINE_NOT_ACTIVE` | La línea del ciclo no está `active`; solo cambia por evento de línea explícito (ver abajo). |
| `SERVICE_CHANGE_REQUIRES_FH_ACT` | Un cambio de `service_id` no puede venir del retorno; exige acto FH. |
| `FORBIDDEN_FIELD_IN_RETURN` | El retorno porta un campo prohibido (§7). |

Precedencia de aplicación (orden único y exhaustivo; los pasos 1 y 3 son **de lote**, el paso 2 es **de fila** —validación de parseo/schema ejecutada **antes de reconciliar esa fila**—, y los pasos 4–10 son **de fila**):

1. `UNSUPPORTED_CONTRACT_VERSION` — rechaza el **lote completo**, `applied=0`.
2. `MISSING_REQUIRED_FIELD` | `INVALID_FIELD` | `FORBIDDEN_FIELD_IN_RETURN` — validación de schema + calendario **por fila**, ejecutada **antes de reconciliar esa fila**: la fila rechazada **no aplica nada** y el resto del lote continúa (atomicidad por fila).
3. `DUPLICATE_RENEWAL_ID_IN_BATCH` — lote completo, `applied=0`.
4. `UNKNOWN_RENEWAL_ID` — el retorno nunca crea renovaciones.
5. `IDENTITY_MISMATCH` — `patient_id`/`line_id`/`service_id` difieren del registro FH.
6. `LINE_NOT_ACTIVE` — la línea del ciclo no está `active`.
7. **Replay idempotente primero**: reimportación **exacta** de **cualquier** operación ya aplicada para esa renovación —**historial completo de operaciones aceptadas, no solo la última**: mismo `renewal_id` + mismo `report_type` + mismo `reported_at` + payload deep-equal— ⇒ **`no_op`**, **independientemente del lifecycle actual, incluidos los estados terminales**.
8. `STATE_CONFLICT` — misma identidad de operación (`renewal_id` + `report_type` + `reported_at`) **presente en cualquier punto del historial de operaciones ya aplicadas** con **payload distinto** (replay modificado); el estado FH se preserva, **sin merge**.
9. `REPORT_NOT_APPLICABLE` — el target no es alcanzable desde el lifecycle actual (estados terminales incluidos, targets regresivos/no alcanzables incluidos, **con o sin retorno previo aplicado**).
10. En otro caso se aplica la transición permitida: un reporte genuinamente nuevo cuyo target es alcanzable es un **reporte sucesivo** y se acepta (**no** es conflicto); la operación aceptada se **añade al historial** de la renovación.

El checker implementa este orden de forma determinista y porta una batería de mutaciones de precedencia: la ordenación antigua (terminal antes que replay), la ausencia del guard de línea, la memoria **solo de la última operación** (debe discrepar del `no_op`/`STATE_CONFLICT` reglado en el replay histórico) y un camino de lote que **se salta el paso 2** (debe aceptar la fila prohibida) **deben** discrepar del modelo reglado.

Reglas adicionales:

- El estado FH **nunca** regresa por efecto de un import.
- Filas aceptadas y rechazadas se reportan **por fila**; una fila rechazada **no aplica nada**.
- Ningún error se oculta tras un fallback silencioso: `UNKNOWN ≠ SUCCESS`.

### Elegibilidad de línea (`LINE_NOT_ACTIVE`)

- Un retorno solo es aplicable si la línea del ciclo está `active`. Un retorno sobre una línea `stopped|switched|cancelled|completed|suspended` con renovación no terminal ⇒ `LINE_NOT_ACTIVE`, aunque el target fuera alcanzable.
- El estado de línea **solo cambia por un evento de línea explícito** — disparador `explicit_line_event` de la transición `not_applicable` en [`renewal_state_machine_v1.json`](../../schemas/renewal/renewal_state_machine_v1.json) (`stopped|switched|cancelled|completed`); nunca se deriva del retorno ni de la ausencia de datos.

## 9. Ejemplos sintéticos trabajados

Fixtures: [`tools/fixtures/renewal/`](../../tools/fixtures/renewal/) y bundle [`scenarios_v1.json`](../../tools/fixtures/renewal/scenarios_v1.json). Semilla sintética `REN-SYN-0001/0002/0003/0004/0005`.

1. **Ida** — `valid/fh_to_nursing_open_due_soon.json`: `OPEN`, `valid_until=2026-11-15`, `evaluated_at=2026-10-04` ⇒ `days=42 ≤ 60` ⇒ `window_state=due_soon`, `kind=confirmed`. Aceptado.
2. **Vuelta** — `valid/nursing_to_fh_renewal_reported.json`: `report_type=renewal_reported` sobre `REN-SYN-0002` (`IN_PROGRESS`) ⇒ `RENEWED_REPORTED`. Aceptado. **No** produce `FH_UPDATED`.
3. **Duplicado idempotente** — el mismo retorno aplicado dos veces: la segunda es `no_op` (sin efectos).
4. **Conflicto de replay modificado** (`STATE_CONFLICT`) — tras aplicar `valid/nursing_to_fh_renewal_reported.json` (`renewal_reported`, `reported_at=2026-10-06T10:00:00Z`), una reimportación con el **mismo** `report_type` y el **mismo** `reported_at` pero **payload distinto** (`semantic/return_conflicting_changed_payload.json`: `comment` alterado) ⇒ `STATE_CONFLICT`; el estado FH se preserva, sin merge (escenario `conflicting_reimport`).
5. **Target no aplicable** (`REPORT_NOT_APPLICABLE`) — tras el mismo `renewal_reported` ya aplicado, un `requested_to_service` (`semantic/return_conflicting_report_type.json`) ya no es alcanzable desde `RENEWED_REPORTED` ⇒ `REPORT_NOT_APPLICABLE`; es un target regresivo/inalcanzable, **no** un conflicto (escenario `regressive_report_not_applicable`).
6. **Replay exacto sobre ciclo terminal** — `REN-SYN-0003` está en `FH_UPDATED` (terminal) con un retorno ya aplicado; la reimportación exacta (`semantic/return_replay_on_terminal_noop.json`) es `no_op`: el paso 7 de la precedencia precede a cualquier comprobación de terminal (escenario `replay_identical_on_terminal_no_op`).
7. **Línea no activa** (`LINE_NOT_ACTIVE`) — retorno sobre `REN-SYN-0005` (`line_status=stopped`, renovación `OPEN`) ⇒ `LINE_NOT_ACTIVE`, aunque `requested_to_service` sería alcanzable (escenario `line_not_active_return_rejected`).
8. **`renewal_id` desconocido** — `REN-SYN-9999` ⇒ `UNKNOWN_RENEWAL_ID` (el retorno no crea renovaciones).
9. **Version mismatch** — lote con un registro `renewal-handoff/v2` ⇒ `UNSUPPORTED_CONTRACT_VERSION`, lote completo rechazado, `applied=0`.
10. **Replay de una operación histórica** — sobre `REN-SYN-0001` se aplican A (`requested_to_service`) y después B (`in_progress`, `semantic/return_in_progress_ren_syn_0001.json`); la reimportación **exacta** de A es `no_op` aunque exista un reporte posterior ya aplicado (escenario `replay_historical_after_intervening_report`), y una A modificada (mismo `report_type` + mismo `reported_at`, otro `comment`: `semantic/return_replay_modified_ren_syn_0001.json`) ⇒ `STATE_CONFLICT` sin merge (escenario `historical_replay_modified_state_conflict`). El modelo reglado recuerda **todas** las operaciones aceptadas por renovación; una memoria solo de la última operación **debe** discrepar (mutación del checker).
11. **Lote con fila inválida** — `batch/mixed_invalid_row_batch.json`: fila válida (`REN-SYN-0001`, `requested_to_service`) + fila con `valid_until` prohibido (`REN-SYN-0002`) + fila con `reported_at` imposible `2026-02-30` (`REN-SYN-0004`) ⇒ la fila válida se aplica (`applied=1`) y las inválidas se rechazan **por fila** con su código exacto (`FORBIDDEN_FIELD_IN_RETURN` / `INVALID_FIELD`) preservando su estado FH; el paso 2 es una validación **por fila** ejecutada antes de reconciliar esa fila (escenario `batch_invalid_row_rejected_row_level`).

**Demostración de `RENEWED_REPORTED ≠ FH_UPDATED`:** el único camino es

```text
RENEWED_REPORTED --(pharmacy_module, recepción explícita del reporte)--> PENDING_FH_REVIEW --(pharmacy, acto explícito)--> FH_UPDATED
```

No existe arista directa `RENEWED_REPORTED → FH_UPDATED`, y todo borde hacia `FH_UPDATED` tiene conjunto de actores exactamente `{pharmacy}`. El checker lo verifica estructuralmente y con una batería de mutaciones.

## 10. Registro de incógnitas (no resueltas aquí)

| ID | Incógnita | Estado |
| --- | --- | --- |
| REN-OPEN-001 | Valor exacto de `warningWindowDays` y duraciones por programa (hipótesis 60) | `PENDIENTE_EQUIPO` |
| REN-OPEN-002 | Vocabulario canónico de `service_id` (nomenclatura SES; ligado a `SIL-REV-001`) | `CONTRACT_PENDING` |
| REN-OPEN-003 | Si `FH_UPDATED` se modela como extensión de `pharmacy-act/v1` o como acto de renovación independiente del transporte | `CONTRACT_PENDING` (decisión de N3; **no** se decide ni se toca F4.4) |
| REN-OPEN-004 | Fuente real de verdad de la validez de prescripción (integración Presalud vs verificación manual FH; lista pendiente de 2026-07 §27) | `PENDIENTE_EQUIPO` |
| REN-OPEN-005 | Canal/formato operativo con el servicio prescriptor | `FUERA_DE_ALCANCE` (humano/operativo) |
| REN-OPEN-006 | Validación del equipo de los umbrales/duraciones candidatos | `PENDIENTE_EQUIPO` |
| — | `OCT-OPEN-001/002/003/004` y demás abiertos de #501 | `PENDIENTE_EQUIPO` — **no resueltos aquí** |
| REN-OPEN-007 | Layout físico de hoja/workbook Excel para N2 (los nombres canónicos los fija el schema; el mapeo de presentación es responsabilidad del adapter N2, fail-closed ante columnas requeridas desconocidas/ausentes) | `CONTRACT_PENDING` |
| REN-OPEN-008 | Dashboard Enfermería (N4) | `DEFERRED` tras el MVP (`SIL-REV-014`) |

## 11. Reconciliación con la arquitectura exploratoria 2026-07

Referencia: [`TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`](../architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md) — **exploratoria, no contrato aprobado**.

| Decisión 2026-07 | Disposición en este v1 |
| --- | --- |
| Renovación por línea, no por paciente (§5.1) | **Preservada** (invariante 1) |
| Identidad técnica de línea (`treatment_id`/`treatment_key`) (§5.2) | **Adoptada**: `line_id` + `renewal_id` opaco |
| Fechas confirmadas/verificadas/estimadas distintas (§5.3) | **Adoptada**: `valid_until_kind` |
| Switch explícito; aparición de fármaco no lo prueba (§5.4, §12) | **Preservada** |
| Reglas temporales configurables, sin cron por paciente (§5.6, §15–17) | **Preservada**: configuración gobernada; la recomputación no crea lifecycle |
| Jerarquía de fuentes de fecha (§7) | **Adoptada y cerrada**: mapeo `source → kind` (§4) **más** jerarquía de precedencia entre fuentes con fallo cerrado ante discrepancia del mismo nivel (`DATE_SOURCE_CONFLICT`, §4) |
| Nombres concretos de estados (§14) | **Superseded**: taxonomía cerrada en la máquina de estados v1 |
| Modelo de entidades SQL/tablas/RLS (§22) | **Pendiente / fuera de alcance** (no es contrato N0) |
| Cron / job diario / Supabase (§16, §24–25) | **Pendiente**, no autorizado aquí |
| Integración Presalud (§27) | **Pendiente** (`REN-OPEN-004`) |
| Preservar histórico sin sobrescribir (§26) | **Adoptada**: terminales sin resurrección; corrección = nuevo `renewal_id` |

## 12. Propuesta atómica N1 / N2 / N3

Base común: **este contrato congelado** (schemas + máquina de estados). Orden de integración **estricto N1 → N2 → N3**; aun así, **ambos extremos** (N1 en FH y N3 en FH) pueden implementarse **en paralelo** contra el schema congelado, porque comparten la misma autoridad. La fase N2 es el adapter de transporte intermedio.

Reglas transversales:

- Cada ticket debe congelar su **oráculo de aceptación principal derivado de este contrato antes** de que la implementación reciba autoridad de escritura. El builder puede ejecutar el oráculo, pero **no** debilitarlo ni reemplazarlo.
- Cada ticket debe aportar **fixtures negativos plantados** (cada uno con su código de error esperado) además de los positivos.
- **N0 no requiere QA de navegador** (no hay runtime). **N1 requiere QA de navegador con interacción soportada cuando aterrice la superficie de bandeja** (reglas de QA de `AGENTS.md`).

### N1 — FH: evaluación `due_soon`/`expired` + bandeja + export FH → Enfermería

- **Alcance:** evaluar ventana desde fechas + config; abrir a lo sumo un ciclo `OPEN` por línea (`due_soon`/`expired`); emitir el envelope `renewal-handoff/v1` de ida.
- **Dependencias:** este contrato congelado.
- **Oráculo principal congelado:** derivado de §4 (mapeo source→kind, semántica de ventana, `unknown` no materializa fecha) y §5 (una sola apertura).
- **Negativos exigidos:** ventana incoherente, `unknown` con fecha, mapping source/kind inválido, duración configurada ascendida a confirmada.
- **NO TOCA:** scheduler / GitHub Actions / job periódico; CIMA; ninguna modificación de las pantallas existentes de Validación / Primera Visita / Seguimiento / Dashboard (la bandeja de renovaciones es la **única** superficie nueva); F4.4/F4.5.

### N2 — Adapter Excel Enfermería (soporte de ida/vuelta)

- **Alcance:** mapear columnas del workbook soportado a los campos canónicos del schema; ida y vuelta; fail-closed ante columnas requeridas desconocidas/ausentes.
- **Dependencias:** N1 (envelope de ida) para round-trip; el schema congelado.
- **Oráculo principal congelado:** paridad canónica ↔ columnas y rechazo fail-closed de layout no soportado (§10 `REN-OPEN-007`).
- **Negativos exigidos:** columna requerida ausente; columna desconocida; fila con campo prohibido en el retorno.
- **NO TOCA:** **ningún campo clínico nuevo**; ninguna decisión terapéutica; Excel como autoridad conceptual (solo adapter).

### N3 — Reconciliación del retorno + acto FH explícito

- **Alcance:** importar el retorno, aplicar §8 (idempotencia, conflictos, errores tipados) y ejecutar el **acto FH explícito** que produce `FH_UPDATED`.
- **Dependencias:** N1 + N2; contrato congelado; decisión `REN-OPEN-003` (`CONTRACT_PENDING`).
- **Oráculo principal congelado:** §5 (autoridad de transición), §7 (campos prohibidos), §8 (códigos y atomicidad).
- **Negativos exigidos:** `UNKNOWN_RENEWAL_ID`, `IDENTITY_MISMATCH`, `STATE_CONFLICT`, `REPORT_NOT_APPLICABLE`, `UNSUPPORTED_CONTRACT_VERSION`, `FORBIDDEN_FIELD_IN_RETURN`.
- **NO TOCA:** F4.4/F4.5; **ningún `FH_UPDATED` automático**; ninguna modificación de `valid_until`/`service_id` procedente del retorno.

## 13. Verificación y reversión

```bash
node tools/renewal_handoff_contract_check.mjs
npm run check:renewal:contract
git diff --check
```

El checker valida los dos schemas (draft 2020-12, `additionalProperties: false`; el bloque `treatment` admite `null` explícito), aplica validación semántica estricta de calendario a cada campo `date`/`date-time` (sin normalización: una fecha imposible se rechaza), recomputa la ventana de forma independiente, ejecuta los escenarios del bundle —precedencia 4–10 incluida, con el paso 2 validado **por fila** en el camino de lote y el historial de operaciones aplicadas por renovación—, verifica los invariantes estructurales de la máquina de estados y los conjuntos cerrados de campos (guard de no-inferencia), y demuestra la jerarquía de fuentes de fecha con un helper puro de precedencia/conflicto sobre candidatos `{source, endpoint}` (concordancia resuelve, discrepancia de fecha resultante falla cerrado). La batería de mutaciones exige que la ordenación antigua (terminal antes que replay), la ausencia del guard de línea, la memoria solo de la última operación y un camino de lote que se salta el paso 2 **discrepen** del modelo reglado.

**Reversión:** al ser shaping, revertir únicamente este contrato, los schemas, las fixtures, el checker y el enganche de `package.json`. No hay migración, runtime ni persistencia que deshacer.
