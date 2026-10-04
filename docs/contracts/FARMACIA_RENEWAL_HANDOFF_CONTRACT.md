# Contrato N0 — Handoff de renovaciones Farmacia Hospitalaria ↔ Enfermería (refrozen)

| Metadato | Valor |
| --- | --- |
| Estado | `SHAPING_N0_REFREEZE / CONTRACT_PENDING` — contrato funcional mínimo refrozen para N1/N2/N3; sin runtime |
| Fecha | 2026-10-04 |
| Issue / WO | #446 (shaping) + **#509** (recovery/refreeze) — `WO-RECOVERY-NEXUS-RENEWALS-N0-REFREEZE-20261004` |
| Autoridad | **HUMAN SHAPING REFREEZE** + auditoría adversarial (#446, 2026-10-04) + #509 |
| Base (rama / SHA) | `recovery/nexus-renewals-n0-refreeze-509-20261004` desde `d829939cb3622227a7f0810c8d6a5e6944765dbc` (candidato **RECHAZADO**, checkpoint preservado) sobre `promueve/nexus-v4` @ `fca8b7d9fc5f73a84599b8c36999cb73e2351fa6` |
| Madurez | **Contrato únicamente.** Sin runtime, integración, scheduler, UI, persistencia ni piloto/producción. Datos exclusivamente sintéticos. |
| Autoridad legible por máquina | Schemas [`../../schemas/renewal/`](../../schemas/renewal/) y máquina de estados [`renewal_state_machine_v1.json`](../../schemas/renewal/renewal_state_machine_v1.json) (autoridad única de estados; este documento describe y enlaza, no la duplica) |
| Verificación | `npm run check:renewal:contract` (`tools/renewal_handoff_contract_check.mjs`) |
| Delivery boundary | Rama local + commits locales. **STOP antes de push/PR/merge** salvo autorización explícita adicional. |

Esta es la **única autoridad N0** del circuito de renovaciones FH ↔ Enfermería. Es una **recuperación/refreeze**, no una tercera ronda de corrección ni shaping nuevo: toda semántica procede del HUMAN SHAPING REFREEZE (#446) y de #509. El objetivo es que N1/N2/N3 se implementen desde extremos distintos sin inventar semántica.

## 1. Propósito y alcance

Farmacia Hospitalaria necesita anticipar prescripciones próximas a caducar y coordinar su comunicación operativa con el servicio prescriptor, **sin confundir una comunicación operativa con una validación farmacoterapéutica**. Este contrato fija únicamente: identidad de línea/ciclo/renovación, fecha/calidad de `valid_until`, semántica de ventana, estados y autoridad de cada transición, los envelopes de ida/vuelta, el orden de lote y de reconciliación, y los errores tipados.

Fuera de alcance: implementación N1/N2/N3/N4, scheduler/Actions, CIMA, Reuma, Dermatología, backend V5, `main`, snapshots, datos reales y la resolución de las preguntas abiertas (§12).

## 2. Detección ≠ gestión (principio rector)

Una línea **activa** puede entrar automáticamente en la condición derivada `PRÓXIMA_A_RENOVACIÓN` cuando cruza la ventana configurada. Eso **no** inicia gestión. La gestión comienza **solo** por un acto FH explícito que envía la línea a Enfermería (inclusión/envío por lote). El `renewal_id` se acuña en ese acto. **La evaluación de ventana nunca crea un ciclo ni un estado.**

`PRÓXIMA_A_RENOVACIÓN ⇔ line_status == active ∧ window_state ∈ {due_soon, expired}` es una **condición derivada**, no un estado de lifecycle (`is_lifecycle_state: false`). La gestión empieza con `ENVIADA_A_ENFERMERÍA`.

## 3. Invariantes vinculantes

1. `RENOVACIÓN_COMUNICADA ≠ ACTUALIZADA_POR_FH`; `SUSPENSIÓN_COMUNICADA ≠ TRATAMIENTO_SUSPENDIDO`.
2. Enfermería/Excel **nunca** cambian validez, tratamiento ni estado terapéutico autoritativo; solo Farmacia ejecuta los actos finales.
3. `switch`/`add-on`/renovación/suspensión **jamás** se infieren desde nombre de fármaco, ausencia de datos, historial o paso del tiempo.
4. La renovación pertenece a una **línea/ciclo**, nunca al paciente global.
5. Las líneas con `line_status ∈ {stopped, switched, cancelled, completed, suspended}` **nunca** continúan el circuito (no se abre ciclo; el retorno se rechaza `LINE_NOT_ACTIVE`). Una reactivación futura solo ocurre por un **evento de línea explícito registrado**, nunca inferida.
6. `confirmed / verified / estimated` permanecen distintos; `unknown` nunca materializa fecha; `warningWindowDays` es configurable (60 = hipótesis candidata, no constante).
7. Excel es un **adapter soportado**, nunca la autoridad conceptual.
8. Datos exclusivamente sintéticos (`demo_flag`).

## 4. Identidad

Unidad de renovación = **línea de tratamiento**. `renewal_id` lo acuña Farmacia al ejecutar el envío a Enfermería; es opaco, no vacío, no derivado del paciente/fármaco/CIP. `line_id`, `patient_id`, `service_id` son explícitos y opacos; un `service_id` ausente/desconocido falla cerrado (no se reconcilia por nombre). Un único ciclo abierto por línea; una re-extracción con ciclo abierto **no** acuña identidad nueva (misma identidad reenviada hasta el cierre). `renewal_id` **no** es `solicitud_id` (otro circuito).

## 5. Fechas, calidad y ventana

Modelo cerrado: `valid_until` (`YYYY-MM-DD`), `valid_until_kind ∈ {confirmed, verified, estimated, unknown}`, `valid_until_source` (enum de 7 valores), `evaluated_at`, `warning_window_days`.

| `valid_until_source` | `valid_until_kind` | Campos exigidos |
| --- | --- | --- |
| `prescription_valid_until_confirmed` | `confirmed` | `valid_until` |
| `prescription_issue_date_confirmed_duration_confirmed` | `confirmed` | `valid_until`, `issue_date`, `validity_days` |
| `prescription_issue_date_confirmed_duration_configured` | **`estimated`** | `valid_until`, `issue_date`, `validity_days` |
| `pharmacy_verified_remaining_period` | `verified` | `valid_until` |
| `circuit_entry_estimate` | `estimated` | `valid_until` |
| `manual_estimate` | `estimated` | `valid_until` |
| `not_recorded` | `unknown` | `valid_until = null` |

- Una duración **configurada** jamás asciende a `confirmed`. `unknown` nunca materializa fecha (`valid_until = null`, `window_state = not_evaluable`).
- **Derivación (finding 4, #509):** cuando la fuente declara derivación (`..._duration_confirmed` / `..._duration_configured`) se exige `issue_date` + `validity_days` y se cumple `valid_until == issue_date + validity_days` (por ejemplo 2026-06-01 + 365 = 2027-06-01); una discrepancia ⇒ `INVALID_FIELD`.
- **Sin jerarquía universal (finding 6 / OCT-OPEN-013):** la jerarquía de precedencia de fuentes y `DATE_SOURCE_CONFLICT` del candidato rechazado quedan **ELIMINADAS**. Hasta validación humana se conserva fecha + calidad/origen explícitos y se falla cerrado ante discrepancia material; la regla de exportación (discrepancia material entre fuentes candidatas ⇒ el registro no se exporta) es **prosa N1, sin código aquí**.
- Ventana: `days = valid_until − fecha(evaluated_at)`; `<0` `expired`; `0..warning_window_days` `due_soon`; `> warning_window_days` `outside_window`; `unknown` ⇒ `not_evaluable`. El checker la **recomputa** de forma independiente y rechaza una declaración incoherente.
- Validación de calendario semántica **autoritativa** en el checker (sin normalización): una fecha imposible (`2026-02-31`) se rechaza `INVALID_FIELD` aunque el patrón la admita.

## 6. Actores y flujo MVP

Actores: `pharmacy` (acto FH explícito; únicos actos terminales), `nursing` (comunicación operativa del retorno), `pharmacy_module` (evaluación de ventana determinista; nunca transita el lifecycle).

Autoridad única: [`renewal_state_machine_v1.json`](../../schemas/renewal/renewal_state_machine_v1.json). Flujo MVP (tokens españoles del refreeze; los tokens de medición temporal `window_state` permanecen en inglés):

```text
new --(pharmacy, explícito)--> ENVIADA_A_ENFERMERÍA --(nursing)--> SOLICITADA_AL_PRESCRIPTOR
SOLICITADA_AL_PRESCRIPTOR --(nursing)--> RENOVACIÓN_COMUNICADA --(pharmacy, explícito)--> ACTUALIZADA_POR_FH
SOLICITADA_AL_PRESCRIPTOR --(nursing)--> SUSPENSIÓN_COMUNICADA --(pharmacy, explícito)--> TRATAMIENTO_SUSPENDIDO
```

`ACTUALIZADA_POR_FH` y `TRATAMIENTO_SUSPENDIDO` son los **dos únicos terminales** (sin aristas salientes). No hay bucles, aristas regresivas, estados `CANCELLED`/`NOT_APPLICABLE` ni estado previo al acto de envío. Todo borde hacia un terminal tiene actores exactamente `{pharmacy}`. El cierre por `ACTUALIZADA_POR_FH` congela cuatro **postcondiciones** del refreeze §6 (#446): un **evento de renovación explícito** queda asociado a la línea (`explicit_renewal_event_on_line`), una **nueva validez** es confirmada/propuesta y aceptada por Farmacia (`new_validity_explicitly_accepted_by_fh`), la línea **permanece activa** (`line_remains_active`) y **sale de la lista de pendientes** hasta re-entrar en la ventana futura de renovación (`leaves_pending_until_window_reentry`) — solo el mecanismo de captura del acto (fecha explícita vs duración 12/6/3 meses) permanece abierto como `OCT-OPEN-010`. La forma de captura del acto de actualización es `OCT-OPEN-010`; el dato mínimo del acto de suspensión es `OCT-OPEN-011` — ninguno se congela aquí.

El prebiológico se mantiene en hoja separada; la **segunda hoja** de cada Excel de trabajo de Enfermería es la bandeja de renovaciones de Enfermería (Farmacia exporta lotes periódicos agrupados por servicio). La cadencia de lote es operativa, no lógica de producto (`OCT-OPEN-012`). El servicio prescriptor **no** opera PROMueve en el MVP.

## 7. Contrato FH → Enfermería

Schema: [`renewal_handoff_fh_to_nursing_v1.schema.json`](../../schemas/renewal/renewal_handoff_fh_to_nursing_v1.schema.json). Envelope `contract_version = "renewal-handoff/v1"`, `record_type = "renewal_handoff_fh_to_nursing"`, `additionalProperties: false`.

**Obligatorios:** `contract_version, record_type, renewal_id, line_id, patient_id, service_id, window_state, evaluated_at, warning_window_days, valid_until, valid_until_kind, valid_until_source, exported_at, exported_by_role("pharmacy"), demo_flag`.

**Opcionales:** `service_label` (nullable), `treatment_id` (nullable), `issue_date` (nullable), `validity_days` (entero|null), y el bloque `treatment` (`line_label`, `drug_display`) **explícitamente display-only** y **nullable**. Un campo opcional ausente y un `null` explícito significan ambos ausencia; ninguna regla cross-field deriva estado desde `treatment`.

**Eliminados respecto al candidato rechazado:** `lifecycle_state`, `requested_at`, `comment` (mini-representación del motor interno innecesaria para Enfermería).

Se conservan todas las cláusulas cross-field: mapeo `source → kind`, exigencia de `issue_date`+`validity_days` con referencia de fecha real bajo fuentes de duración, `unknown ⇒ valid_until null + not_evaluable`, y kind conocido ⇒ fecha concreta + `window_state ∈ {outside_window, due_soon, expired}`.

## 8. Contrato Enfermería → FH

Schema: [`renewal_handoff_nursing_to_fh_v1.schema.json`](../../schemas/renewal/renewal_handoff_nursing_to_fh_v1.schema.json). `contract_version = "renewal-handoff/v1"`, `record_type = "renewal_report_nursing_to_fh"`, `additionalProperties: false`.

**Obligatorios:** `contract_version, record_type, renewal_id, line_id, patient_id, service_id, report_type, reported_at, reported_by_role("nursing"), demo_flag`.

`report_type` enum **exactamente** `["SOLICITADA_AL_PRESCRIPTOR", "RENOVACIÓN_COMUNICADA", "SUSPENSIÓN_COMUNICADA"]`. **Opcionales:** `reported_by` (string|null), `comment` (string|null, `maxLength: 1000`, operativo; nunca se interpreta clínicamente).

**Prohibido por construcción:** cualquier `valid_until`/duración/tipo de fecha, cualquier campo terapéutico (dosis/vía/pauta/presentación/inducción), flags de validación, el estado o los tokens `ACTUALIZADA_POR_FH`/`TRATAMIENTO_SUSPENDIDO`, cambios de `patient_id`/`line_id`/`service_id`, `line_status`, `lifecycle_state`, `window_state` e identificadores de acto/commit. Un campo prohibido presente en el retorno se rechaza a nivel de schema con `FORBIDDEN_FIELD_IN_RETURN`. Enfermería **no puede nombrar** el acto FH terminal (lo prueba el fixture `nursing_to_fh_bad_report_type.json`).

## 9. Orden de lote y reconciliación

**Precedencia de lote (una sola secuencia; prosa y código coinciden — finding 2):**

1. **Preflight de versión** — cualquier `contract_version` distinta ⇒ lote completo rechazado `UNSUPPORTED_CONTRACT_VERSION`, `applied=0`.
2. **Duplicado de `renewal_id` en el lote** — solo cuentan ids string no vacíos; una fila sin `renewal_id` cae a validación de fila ⇒ lote completo `DUPLICATE_RENEWAL_ID_IN_BATCH`, `applied=0`.
3. **Validación por fila** — schema + calendario + derivación. Error tipado de fila, **nada se aplica**, el resto del lote continúa (atomicidad por fila).
4. **Reconciliación por fila.**

**Orden de reconciliación por fila (modelo mínimo):** `UNKNOWN_RENEWAL_ID` → `IDENTITY_MISMATCH` (paciente/línea/servicio difieren; un `service_id` cambiado es solo `IDENTITY_MISMATCH`) → `LINE_NOT_ACTIVE` → replay exacto de la **última operación aplicada** (mismo `renewal_id`+`report_type`+`reported_at`+payload deep-equal) ⇒ `no_op` → misma identidad de operación con payload distinto ⇒ `STATE_CONFLICT` (estado preservado, sin merge) → target inalcanzable/regresivo desde el estado actual por una arista de Enfermería ⇒ `REPORT_NOT_APPLICABLE` → en otro caso se acepta la transición.

La memoria de idempotencia es **solo la última operación aplicada**; el historial multi-operación y `report_id` quedan explícitamente diferidos a N3 (no congelados aquí).

**Códigos tipados (conjunto final exacto de 10):**

| Código | Semántica |
| --- | --- |
| `UNSUPPORTED_CONTRACT_VERSION` | Preflight de versión; rechaza el lote completo. |
| `DUPLICATE_RENEWAL_ID_IN_BATCH` | Duplicado en el lote; rechaza el lote completo. |
| `MISSING_REQUIRED_FIELD` | Falta un campo obligatorio (fila). |
| `INVALID_FIELD` | Campo/enum/formato/cross-field/derivación/calendario inválido (fila). |
| `FORBIDDEN_FIELD_IN_RETURN` | El retorno porta un campo prohibido (fila). |
| `UNKNOWN_RENEWAL_ID` | El retorno nunca crea una renovación. |
| `IDENTITY_MISMATCH` | `patient_id`/`line_id`/`service_id` difieren del registro FH. |
| `LINE_NOT_ACTIVE` | La línea del ciclo no está `active`. |
| `STATE_CONFLICT` | Misma identidad de operación (última aplicada) con payload distinto; sin merge. |
| `REPORT_NOT_APPLICABLE` | Target inalcanzable/regresivo desde el estado actual. |

`SERVICE_CHANGE_REQUIRES_FH_ACT` queda **eliminado** (código muerto e inalcanzable — finding 3). Ningún error se oculta tras un fallback silencioso: `UNKNOWN ≠ SUCCESS`.

## 10. Elegibilidad de línea

Un retorno solo es aplicable si la línea está `active`. `line_status_values` es el conjunto cerrado `["active","stopped","switched","cancelled","completed","suspended"]` con `circuit_eligible == ["active"]` (finding 5: `suspended` es coherente en detección, `LINE_NOT_ACTIVE` y prosa). El estado de línea solo cambia por un **evento de línea explícito registrado**; nunca se deriva del retorno ni de la ausencia de datos. La reactivación solo ocurre por evento explícito. Un único ciclo abierto por línea.

## 11. Ejemplos sintéticos trabajados

Fixtures: [`tools/fixtures/renewal/`](../../tools/fixtures/renewal/) y bundle [`scenarios_v1.json`](../../tools/fixtures/renewal/scenarios_v1.json).

1. **Ida `due_soon`** — `valid/fh_to_nursing_due_soon.json`: `valid_until=2026-11-15`, `evaluated_at=2026-10-04` ⇒ `days=42 ≤ 60` ⇒ `due_soon`, `confirmed`. Aceptado.
2. **Ida derivada** — `valid/fh_to_nursing_duration_derived.json`: `2026-06-01 + 365 = 2027-06-01`, `estimated`, `outside_window`. Aceptado (prueba la igualdad de derivación).
3. **Ida unknown** — `valid/fh_to_nursing_unknown_not_evaluable.json`: `not_recorded`/`null`/`not_evaluable`. Aceptado.
4. **Retorno renovación** — `valid/nursing_to_fh_renovacion_comunicada.json` sobre `REN-SYN-0002` (`SOLICITADA_AL_PRESCRIPTOR`) ⇒ `RENOVACIÓN_COMUNICADA`. **No** produce `ACTUALIZADA_POR_FH`.
5. **Reimportación exacta** — el mismo retorno aplicado dos veces: la segunda es `no_op` sin efectos.
6. **Reimportación modificada** — mismo `report_type`+`reported_at`, payload distinto ⇒ `STATE_CONFLICT`; estado preservado, sin merge.
7. **Línea suspendida** — retorno sobre `REN-SYN-0004` (`line_status=suspended`) ⇒ `LINE_NOT_ACTIVE`.
8. **`renewal_id` desconocido** — `REN-SYN-9999` ⇒ `UNKNOWN_RENEWAL_ID`.
9. **Identidad** — `service_id` distinto sobre `REN-SYN-0002` ⇒ `IDENTITY_MISMATCH`.
10. **No aplicable** — retorno sobre `REN-SYN-0003` (ya `RENOVACIÓN_COMUNICADA`) ⇒ `REPORT_NOT_APPLICABLE`; Enfermería no puede avanzar a un terminal.
11. **Puertas de lote** — `batch/unsupported_version_batch.json` (con duplicado + fila inválida) ⇒ `UNSUPPORTED_CONTRACT_VERSION`; `batch/duplicate_renewal_id_batch.json` (con fila inválida) ⇒ `DUPLICATE_RENEWAL_ID_IN_BATCH`; `batch/mixed_row_batch.json` ⇒ `processed`, `applied=1`, filas `[accepted, FORBIDDEN_FIELD_IN_RETURN, INVALID_FIELD]` con las rechazadas dejando el estado FH intacto.

## 12. Registro de incógnitas (no resueltas aquí)

| ID | Incógnita | Estado |
| --- | --- | --- |
| REN-OPEN-001 | Valor exacto de `warningWindowDays` y duraciones por programa (hipótesis 60) | `PENDIENTE_EQUIPO` |
| REN-OPEN-002 | Vocabulario canónico de `service_id` (nomenclatura SES; ligado a `SIL-REV-001`) | `CONTRACT_PENDING` |
| REN-OPEN-003 | Mecánica de `ACTUALIZADA_POR_FH` (acto independiente vs extensión de Pharmacy Act) e historial/`report_id` de N3 | `CONTRACT_PENDING` (decisión de N3) |
| REN-OPEN-004 | Fuente real de verdad de la validez de prescripción | `PENDIENTE_EQUIPO` |
| REN-OPEN-005 | Canal/formato operativo con el servicio prescriptor | `FUERA_DE_ALCANCE` (humano/operativo) |
| REN-OPEN-006 | Validación del equipo de umbrales/duraciones candidatos | `PENDIENTE_EQUIPO` |
| REN-OPEN-007 | Layout físico de hoja/workbook Excel para N2 | `CONTRACT_PENDING` |
| REN-OPEN-008 | Dashboard Enfermería (N4) | `DEFERRED` tras el MVP |
| OCT-OPEN-010 | Cierre de renovación: fecha explícita vs duración (12 meses habitual; posibles 6/3) con cálculo/confirmación de nueva validez | `PENDIENTE_EQUIPO` |
| OCT-OPEN-011 | Suspensión: dato mínimo del acto FH (hipótesis: fecha del acto + observación opcional) y fecha clínica distinta posterior | `PENDIENTE_EQUIPO` |
| OCT-OPEN-012 | Organización operativa del lote por servicio (cadencia/corte/distribución; evitar duplicar ciclo ya enviado); no condiciona N0 | `PENDIENTE_EQUIPO` |
| OCT-OPEN-013 | Fuente/precedencia real de `valid_until`; hasta validación: fecha + calidad/origen explícitos y fallo cerrado ante discrepancia material, sin jerarquía universal | `PENDIENTE_EQUIPO` |

## 13. Propuesta atómica N1 → N2 → N3

Base: **este contrato refrozen** + máquina de estados. Orden de integración **estricto N1 → N2 → N3**. Cada ticket debe congelar su **oráculo de aceptación principal derivado de este contrato antes** de que la implementación reciba autoridad de escritura; el builder puede ejecutar el oráculo pero **no** debilitarlo ni reemplazarlo. Cada ticket aporta fixtures negativos plantados con su código esperado.

- **N1 — FH:** detección `due_soon`/`expired` + bandeja + export FH → Enfermería (acuña `renewal_id`; un ciclo abierto por línea). Negativos exigidos: ventana incoherente, `unknown` con fecha, mapping source/kind inválido, duración configurada ascendida a confirmada, derivación de duración incumplida. **N1 requiere QA de navegador con interacción soportada** cuando aterrice la bandeja.
- **N2 — Adapter Excel Enfermería:** round-trip canónico ↔ columnas; fail-closed ante columnas requeridas desconocidas/ausentes. Layout físico **no** congelado aquí (`REN-OPEN-007`).
- **N3 — Reconciliación del retorno + acto FH explícito:** importar el retorno, aplicar §9, ejecutar el acto FH explícito (`ACTUALIZADA_POR_FH`/`TRATAMIENTO_SUSPENDIDO`); incluye la mecánica de `report_id`/historial si es necesaria (`REN-OPEN-003`). Sin `ACTUALIZADA_POR_FH` automático.

**N0 no requiere QA de navegador** (no hay runtime).

## 14. Verificación y reversión

```bash
node tools/renewal_handoff_contract_check.mjs
node tools/renewal_handoff_contract_check.mjs --probe-exception-fail-closed   # debe fallar con FAIL y exit != 0
npm run check:renewal:contract
npm run verify:nexus
git diff --check
```

El checker compila ambos schemas (draft 2020-12, `additionalProperties:false`), aplica calendario semántico estricto sin normalización, **recomputa** la ventana y la **igualdad de derivación** de duración, ejecuta fixtures positivos/negativos y los escenarios (detección, retorno, idempotencia de última operación, conflicto, línea no activa, identidad, no aplicable y puertas de lote), verifica invariantes estructurales de la máquina de estados con una batería de mutaciones etiquetada por invariante, y **falla cerrado ante excepciones** (`runCase` + sonda ejecutable `--probe-exception-fail-closed`).

**Reversión:** al ser shaping, revertir únicamente este contrato, los schemas, las fixtures, el checker y el enganche de `package.json`. No hay migración, runtime ni persistencia que deshacer.

## 15. Clasificación KEEP / SIMPLIFY / DELETE sobre `d829939`

| Disposición | Elementos |
| --- | --- |
| **KEEP** | Renovación por línea/ciclo; identidad `renewal_id`/`line_id`/`patient_id`/`service_id`; modelo cerrado `valid_until` + `kind` + mapping `source→kind`; semántica de ventana; calendario fail-closed; `additionalProperties:false`; Excel como adapter; datos sintéticos; actos FH explícitos; atomicidad por fila; enlace a la máquina de estados como autoridad única. |
| **SIMPLIFY** | Lifecycle de 8 estados ingleses → **6 tokens de flujo españoles**; retorno a **3 tokens**; orden de lote en **una** secuencia; idempotencia reducida a **última operación aplicada**; condición derivada `PRÓXIMA_A_RENOVACIÓN`; guard de campos cerrados; checkers con `runCase` sin verdes enmascarados. |
| **DELETE** | Jerarquía `DATE_SOURCE_PRECEDENCE`/resolver/`DATE_SOURCE_CONFLICT` (OCT-OPEN-013); `SERVICE_CHANGE_REQUIRES_FH_ACT` (muerto); `lifecycle_state`/`requested_at`/`comment` del envelope FH→Enfermería; estados `CANCELLED`/`NOT_APPLICABLE`; baterías de mutación obsoletas (terminal-antes-que-replay, memoria histórica). |

| Finding #509 | Cómo se cierra |
| --- | --- |
| 1. Verdes enmascarados (sin fail-closed) | `runCase` fuerza FAIL ante excepción; metaregistro + sonda ejecutable `--probe-exception-fail-closed` (el checker detectó un bug real durante la recuperación). |
| 2. Precedencia de lote prosa ≠ código | Una sola secuencia §9: versión → duplicado → filas → reconciliación; fixtures de lote que prueban el gate. |
| 3. `SERVICE_CHANGE_REQUIRES_FH_ACT` muerto | Eliminado; conjunto final exacto de 10 códigos. |
| 4. Derivación de duración no exigida | `valid_until == issue_date + validity_days`; positivo + negativo en checker. |
| 5. `suspended` incoherente | Vocabulario cerrado de 6 `line_status_values` con `circuit_eligible == ["active"]`, asertado en el checker. |
| 6. Precedencia de fuentes contradictoria | Jerarquía ELIMINADA; `OCT-OPEN-013` preservado abierto. |
