# F4.5 · Mapeo clínico F4.4 Pharmacy Act → Export V2 (152 columnas)

**Publicación documental · WO [#750](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/750):** este inventario de correspondencias y limitaciones se versiona como **evidencia preparatoria**. Su publicación **NO aprueba** el diccionario clínico de los bloques opacos F4.4 ni autoriza ejecución, resultado positivo F4.5, datos reales, puente Excel o piloto. [WO y controles de publicación](../../ops/WO_NEXUS_F45_F44_V2_MAPPING_SPEC_20261013.md).

**Estado:** `MAPPING_SPEC_CANDIDATE_READ_ONLY` — revisión técnica preparatoria, **NO `MAPPING_APPROVED`**, **NO `IMPLEMENTED`**, **NO `PILOT_READY`**.
**Fecha:** 2026-10-13 (corte documental). **GitHub live verificado:** `b32majus/Hub-Clinico-Badajoz`, `promueve/nexus-v4@cd5e698de09b0ef8b099aefb4890c4d0d94c7a20`.
**Issue F4.5 implementación:** [#721](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/721), abierto, sin `status:approved`. #671 permanece abierto para seguimiento de su contrato, aunque el DTO mínimo fase 1 sí fue publicado por [PR #747](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/747). Reconciliación [PR #749](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/749).
**Datos:** solo esquema público y ejemplos sintéticos. **Ningún paciente real.**

## 1. Fuentes efectivamente contrastadas

- `modules/farmacia_act_contract.js` y `modules/farmacia_act_payloads.js` (F4.4): contrato independiente, `payload.request` / `validation?` / `transversal?` / `firstVisit` / `followup` como objetos **opacos**; `lines[]` explícitas, incluso `[]`, preservando orden y ausencia/own-undefined.
- `scripts/farmacia_export_v2_core.js`, `schemas/farmacia_export_row_v2.schema.json` y `docs/contracts/FARMACIA_EXPORT_V2_CORE_CONTRACT.md`: 152 columnas, 15 requeridas por fila, conjunto no vacío, `rowKey` estable obligatorio y `line_id` explícito para filas de visita.
- Los tres `scripts/farmacia_export_v2_*_adapter.js` y sus contratos: reglas de entrada cerrada, cardinalidad, datos técnicos, resultados y límites clínicos de Validación, Primera Visita y Seguimiento.
- `scripts/farmacia_export_v2_context.js` y su contrato: registro de datos **sintéticos** por CIP demo, no proveedor de identidad/autorización real ni mapeo de F4.4.
- `docs/architecture/reviews/FARMACIA_F44_EXPORT_V2_BRIDGE_EQUIVALENCE_20261012.md` (matriz publicada por PR #744), `docs/contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md` (fase 1 publicada) y `docs/ops/WORK_ORDER_STATUS.md` (estado tras PR #749).

La documentación histórica de los adaptadores dice a veces “no hay cutover público v2”: describe su corte de creación. El estado posterior ya documenta copia demo V2 visible, pero **no** integración `F4.4→F4.5→Export V2`.

## 2. Dictamen técnico previo: NO existe hoy equivalencia clínica general

El núcleo F4.4 **valida la estructura por bloques, no el diccionario de atributos clínicos interiores**. Así, `payload.request.drugName`, `payload.validation.result`, `payload.lines[i].lineId` o `payload.followup.visitDate` serían hipótesis de mapeo, **no propiedades garantizadas por F4.4**. La mera presencia de nombres similares no permite aprobarlas. **El diccionario de entradas de los adaptadores V2 que sí está publicado (columna «Entrada V2 publicada» de la tabla) no define automáticamente una ruta desde los bloques F4.4 opacos.** Un acto `ok:true` no garantiza un evento V2 representable.

**La frontera debe dividirse en tres responsabilidades:**

1. **F4.4:** recibir y conservar un acto con `kind`, contexto de origen declarado, bloques opacos y líneas explícitas; no reescribirlo.
2. **Proyección autorizada (todavía inexistente):** comprobar `kind` y una versión de *reglas de correspondencia por caso de uso*, leer SOLO propiedades propias cuya semántica y formato estén validados, exigir datos técnicos separados (`eventId`, `sourceEventId`, `patientId`, `recordedAt`, IDs de línea/rowKey cuando proceda), y producir el input cerrado del adaptador V2. Sin reglas vigentes → `PROJECTION_NOT_AUTHORIZED`.
3. **Core Export V2 y F4.5:** validar evento + filas completas y generar TSV (152 columnas, sin cabecera); solo entonces `prepared_for_transfer`, garantía `export_v2_projection_valid`, `evidence.external:null` y `destination.persistence:'none'`. No asegura pegado, escritura, deduplicación ni persistencia.

### Separaciones de identidad obligatorias

| Origen F4.4 | V2 | Dictamen de autorización |
|---|---|---|
| `kind` | `event_type` | **Correspondencia estructural exacta verificable** entre los tres tokens. |
| `occurredAt` | `occurred_at` | **Plausible**, pero requiere regla explícita de misma fecha/evento; no sustituir a `recorded_at`. |
| `authoredAt` | `recorded_at` | **No equivale automáticamente**: autoría y registro son hitos diferentes. |
| `actId` | `event_id` / `source_event_id` | **No homologados**; aportados por contexto técnico de proyección o política de identidad aprobada, no reutilizar silenciosamente. |
| `siteId` | `hospital_code` | **No homologados** sin tabla/política del despliegue. |
| `patientRef` | `patient_id` / `identifier_value` | **No homologados**; `patient_id` es técnico y CIP/identificador es otra dimensión. Sin registro válido: fallo. |
| `authorRef` / `attributionAssurance` | `professional_ref` / `professional_display` | Solo autoría declarada; no autenticación ni firma. Requiere regla de procedencia explícita. |
| `revision` / `amendment` / `provenance` opaco | sin equivalente íntegro | El artefacto V2 **no** prueba conservar F4.4 íntegro (L2 sigue pendiente). |
| `payload.lines[]` | `rowPayloads[]` | **No siempre 1:1**. Identidad, estado, actividad, cardinalidad y `rowKey` deben justificarse por cada línea. |

## 3. Cobertura clínica por caso de uso — política conservadora propuesta

| F4.4 kind y líneas | Export V2 disponible | Resultado de mapping propuesto antes de autorización clínica |
|---|---|---|
| **Validación** con `lines:[]` | Una fila `validation` sin necesidad de línea | **Candidato condicionable**: requiere estructura `request` explícita y, si existe decisión, correspondencia validada sin confundir solicitado/validado; IDs y contexto V2 completos. Sin regla aprobada: `PROJECTION_NOT_AUTHORIZED`. |
| **Validación** con 1/N líneas | Adaptador genera una sola fila `validation` | No asumir preservación de líneas. **Rechazar por defecto** para esta primera proyección hasta que se apruebe qué hechos son representables y cuáles se pierden; prohibido elegir una línea arbitraria. |
| **Primera Visita** con 0 líneas | Adapter exige al menos una | `REPRESENTATION_NOT_REPRESENTABLE`; no generar línea a partir de solicitud, fármaco o tratamiento previo. |
| **Primera Visita** con 1/N líneas | 1..N filas | Candidato solo si **cada** línea tiene IDs/estado explícitos, es activa e identificable; exactamente una principal y `rowKey`/`lineId` únicos; visita con `firstVisitDate` válido y PROMs coherentes. F4.4 no garantiza esos atributos interiores. |
| **Seguimiento** con 0 líneas | Adapter exige `activeLines` no vacío | `REPRESENTATION_NOT_REPRESENTABLE`; no generar dispensación ni tratamiento desde histórico. |
| **Seguimiento** con 1/N líneas explícitamente activas | 1..N filas | Candidato si todas las líneas seleccionadas tienen actividad/identidad/rol explícitos, como máximo una principal, orden conservado y `visitDate` válido. No deducir `activeAtEvent` del mero hecho de figurar en F4.4. |
| **Seguimiento** con líneas inactivas o mezcla no resuelta | Adapter `activeLines` solo acepta activas | Fallo seguro de esta ruta hasta disponer de **política clínica explícita de selección**; nunca filtrar silenciosamente líneas inactivas, ni desmarcar líneas arbitrariamente. |

**Aviso crítico:** la prueba sintética histórica de F4.4 confirmó que acepta `lines:[]` en los tres constructores, y que V2 no acepta filas de visita vacías. El **core V2 sí normaliza ausencia de celdas opcionales a `null`**, por lo que nunca se puede prometer que un roundtrip TSV conserve la distinción *missing/own `undefined`/null* del acto original. Tampoco debe inferirse que `first_visit_date` constituye por sí sola primera dispensación o administración.

### Reglas clínicas sin excepción

- **Solicitud ≠ validación.** `payload.request` no autoriza valores `validated_*`, estado `validated` ni línea creada. Una validación positiva exige resultado y relación terapéutica explícitos, dos snapshots identificables y la coherencia exigida por el adaptador. `same_as_requested` es una **decisión explícita**, nunca default.
- **Hallazgo acotado en el seam V2 Primera Visita (código publicado):** `validateLines` exige `lineRole` no vacío y exactamente un `isPrimaryLine === true`, pero **no valida que `lineRole` sea `principal|additional` ni que coincida con `isPrimaryLine`**. En cambio, Seguimiento sí exige ambos. Por tanto, el mapeador **no puede confiar en que el adapter de Primera Visita compruebe esta coherencia**: hay que imponerla como gate del mapper o corregir el adapter en una WO técnica separada antes de éxito positivo. Este hallazgo procede de revisión estática del código, **sin QA de navegador**; no se clasifica como defecto UI demostrado.
- **Previo ≠ nuevo inicio.** Tratamientos relacionados, historial, catálogo/CIMA o línea visible anterior no generan `payload.lines`, `active_at_event`, nueva dispensación ni inicio.
- **Importante déficit de cobertura del adaptador de Seguimiento:** aunque el *core* reserva 34 columnas de Seguimiento, el adaptador actual solo rellena `visit_date`; **las otras 33 quedan sin emisión**, igual que `adverse_event_id` en los tres adaptadores. Un acto F4.4 que contenga información clínica material sobre dispensación, reacción adversa, cambio, adherencia o causalidad **no puede publicarse como resumen V2 fiel con este adaptador**. Antes de un resultado positivo debe existir contrato explícito de cobertura/pérdida y, cuando proceda, una WO independiente que amplíe el adaptador.
- **Dispensación, revisión, movimiento, suspensión, adherencia y causalidad no se deducen** del tipo de visita ni de una ausencia. El adaptador de Seguimiento inicialmente deja tales campos como `null`, sin convertir ese vacío en un resultado asistencial negativo.
- **Identificación de medicamento no aporta dosis/vía/pauta/presentación**. Ninguna regla de V2 debe completar estos campos desde un nombre, principio activo, ficha o estado del formulario.
- **Fechas** con semántica independiente: acto, autoría, registro, primera visita y seguimiento solo se asignan si tienen fuente inequívoca y formato válido. Nada de `Date.now()`, fecha actual ni primer valor encontrado.

## 4. Inventario completo de las 152 columnas (clasificación preliminar, no autorización)

Los 152 nombres y su orden se transcriben del `BLOCKS` del core V2 publicado, coincidente con `x-column-order` del esquema. **La columna “procedencia” es una regla de diseño propuesta, no un mapping implementado.** Incluso las columnas `CLÍNICO PENDIENTE` necesitan clave de origen, tipo, nulos, ejemplos negativos, responsable clínico y firma de aceptación antes de habilitar una proyección positiva.

| Nº | Bloque V2 | Columna Export V2 | Entrada V2 publicada (NO fuente F4.4) | Clasificación | Procedencia o barrera |
|---:|---|---|---|---|---|
| 1 | Bridge/evento/control | `bridge_status` | — Núcleo V2 (generado/control del Bridge), requiere `rowKey` explícito | **CORE** | Generado por `FarmaciaExportV2Core` desde evento + `rowKey` autorizados; no dato clínico |
| 2 | Bridge/evento/control | `bridge_processed_at` | — Núcleo V2 (generado/control del Bridge), requiere `rowKey` explícito | **FUERA** | Salida inicial `PENDIENTE`; metadatos de procesamiento posteriores no acreditables en F4.5 |
| 3 | Bridge/evento/control | `bridge_error_code` | — Núcleo V2 (generado/control del Bridge), requiere `rowKey` explícito | **FUERA** | Salida inicial `PENDIENTE`; metadatos de procesamiento posteriores no acreditables en F4.5 |
| 4 | Bridge/evento/control | `bridge_error_detail` | — Núcleo V2 (generado/control del Bridge), requiere `rowKey` explícito | **FUERA** | Salida inicial `PENDIENTE`; metadatos de procesamiento posteriores no acreditables en F4.5 |
| 5 | Bridge/evento/control | `event_schema_version` | — Núcleo V2 (generado/control del Bridge), requiere `rowKey` explícito | **CORE** | Generado por `FarmaciaExportV2Core` desde evento + `rowKey` autorizados; no dato clínico |
| 6 | Bridge/evento/control | `row_schema_version` | — Núcleo V2 (generado/control del Bridge), requiere `rowKey` explícito | **CORE** | Generado por `FarmaciaExportV2Core` desde evento + `rowKey` autorizados; no dato clínico |
| 7 | Bridge/evento/control | `event_id` | `technical.eventId` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 8 | Bridge/evento/control | `source_event_id` | `technical.sourceEventId` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 9 | Bridge/evento/control | `row_id` | — Núcleo V2 (generado/control del Bridge), requiere `rowKey` explícito | **CORE** | Generado por `FarmaciaExportV2Core` desde evento + `rowKey` autorizados; no dato clínico |
| 10 | Bridge/evento/control | `row_role` | — Núcleo V2 (generado/control del Bridge), requiere `rowKey` explícito | **CORE** | Generado por `FarmaciaExportV2Core` desde evento + `rowKey` autorizados; no dato clínico |
| 11 | Bridge/evento/control | `row_index` | — Núcleo V2 (generado/control del Bridge), requiere `rowKey` explícito | **CORE** | Generado por `FarmaciaExportV2Core` desde evento + `rowKey` autorizados; no dato clínico |
| 12 | Bridge/evento/control | `row_count` | — Núcleo V2 (generado/control del Bridge), requiere `rowKey` explícito | **CORE** | Generado por `FarmaciaExportV2Core` desde evento + `rowKey` autorizados; no dato clínico |
| 13 | Bridge/evento/control | `event_type` | — Token exacto de `PharmacyAct.kind`, definido como literal por cada adaptador | **DIRECTO** | `PharmacyAct.kind` ↔ `event_type` por token idéntico; comprobar kind exacto |
| 14 | Bridge/evento/control | `event_status` | `technical.eventStatus` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 15 | Bridge/evento/control | `occurred_at` | `technical.occurredAt` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 16 | Bridge/evento/control | `recorded_at` | `technical.recordedAt` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 17 | Bridge/evento/control | `demo_flag` | `technical.demoFlag` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 18 | Paciente/site/profesional | `patient_id` | `technical.patientId` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 19 | Paciente/site/profesional | `identifier_system` | `technical.identifierSystem` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 20 | Paciente/site/profesional | `identifier_value` | `context.identifierValue` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 21 | Paciente/site/profesional | `hospital_code` | `technical.hospitalCode` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 22 | Paciente/site/profesional | `service_code` | `context.serviceCode` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 23 | Paciente/site/profesional | `service_label` | `context.serviceLabel` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 24 | Paciente/site/profesional | `pathology_code` | `context.pathologyCode` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 25 | Paciente/site/profesional | `pathology_label` | `context.pathologyLabel` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 26 | Paciente/site/profesional | `professional_ref` | `technical.professionalRef` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 27 | Paciente/site/profesional | `professional_display` | `context.professionalDisplay` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 28 | Referencias de solicitud/visita/línea | `request_id` | `validation.technical.requestId` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 29 | Referencias de solicitud/visita/línea | `validation_id` | `validation.technical.validationId` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 30 | Referencias de solicitud/visita/línea | `first_visit_id` | `firstVisit.technical.firstVisitId` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 31 | Referencias de solicitud/visita/línea | `visit_id` | `followup.technical.visitId` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 32 | Referencias de solicitud/visita/línea | `treatment_id` | `firstVisit.lines[i].treatmentId / followup.activeLines[i].treatmentId` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 33 | Referencias de solicitud/visita/línea | `line_id` | `firstVisit.lines[i].lineId / followup.activeLines[i].lineId` | **TÉCNICO** | Contexto técnico **externo y explícito**; no equiparar IDs/fechas/identidades de F4.4 sin regla aprobada |
| 34 | Referencias de solicitud/visita/línea | `adverse_event_id` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 35 | Solicitud | `request_origin` | `validation.request.origin` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 36 | Solicitud | `request_date` | `validation.request.date` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 37 | Solicitud | `validation_type` | `validation.request.validationType` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 38 | Solicitud | `pharmacy_appointment_date` | `validation.request.appointmentDate` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 39 | Solicitud | `requested_drug_name` | `validation.requestedTreatment.drugName` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 40 | Solicitud | `requested_active_ingredient` | `validation.requestedTreatment.activeIngredient` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 41 | Solicitud | `requested_presentation` | `validation.requestedTreatment.presentation` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 42 | Solicitud | `requested_dose_text` | `validation.requestedTreatment.doseText` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 43 | Solicitud | `requested_route` | `validation.requestedTreatment.route` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 44 | Solicitud | `requested_schedule_code` | `validation.requestedTreatment.scheduleCode` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 45 | Solicitud | `requested_schedule_label` | `validation.requestedTreatment.scheduleLabel` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 46 | Solicitud | `requested_schedule_other_text` | `validation.requestedTreatment.scheduleOtherText` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 47 | Solicitud | `requested_induction_status` | `validation.requestedTreatment.inductionStatus` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 48 | Solicitud | `requested_weight_text` | `validation.request.weightText` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 49 | Solicitud | `requested_justification` | `validation.request.justification` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 50 | Solicitud | `request_source_observations` | `validation.request.sourceObservations` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 51 | Solicitud | `requested_selected_drug_id` | `validation.requestedTreatment.selectedDrugId` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 52 | Solicitud | `requested_catalog_source` | `validation.requestedTreatment.catalogSource` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 53 | Solicitud | `requested_national_code` | `validation.requestedTreatment.nationalCode` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 54 | Solicitud | `requested_registration_number` | `validation.requestedTreatment.registrationNumber` | **CLÍNICO PENDIENTE** | payload.request (bloque opaco) → input V2 `request`/`requestedTreatment` [mapa pendiente] |
| 55 | Validación | `validation_result` | `validation.decision.result` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 56 | Validación | `validation_pending_reason` | `validation.decision.pendingReason` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 57 | Validación | `validation_denial_reason` | `validation.decision.denialReason` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 58 | Validación | `pharmacy_observations` | `validation.decision.pharmacyObservations` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 59 | Validación | `other_validation_observations` | `validation.decision.otherObservations` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 60 | Validación | `validated_treatment_relation` | `validation.decision.validatedTreatmentRelation` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 61 | Validación | `validated_drug_name` | `validation.validatedTreatment.drugName` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 62 | Validación | `validated_active_ingredient` | `validation.validatedTreatment.activeIngredient` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 63 | Validación | `validated_presentation` | `validation.validatedTreatment.presentation` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 64 | Validación | `validated_dose_text` | `validation.validatedTreatment.doseText` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 65 | Validación | `validated_route` | `validation.validatedTreatment.route` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 66 | Validación | `validated_schedule_code` | `validation.validatedTreatment.scheduleCode` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 67 | Validación | `validated_schedule_label` | `validation.validatedTreatment.scheduleLabel` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 68 | Validación | `validated_schedule_other_text` | `validation.validatedTreatment.scheduleOtherText` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 69 | Validación | `validated_induction_status` | `validation.validatedTreatment.inductionStatus` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 70 | Validación | `validated_selected_drug_id` | `validation.validatedTreatment.selectedDrugId` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 71 | Validación | `validated_catalog_source` | `validation.validatedTreatment.catalogSource` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 72 | Validación | `validated_national_code` | `validation.validatedTreatment.nationalCode` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 73 | Validación | `validated_registration_number` | `validation.validatedTreatment.registrationNumber` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 74 | Validación | `validated_treatment_id` | `validation.technical.validatedTreatmentId` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 75 | Validación | `validated_line_id` | `validation.technical.validatedLineId` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 76 | Validación | `line_creation_status` | `validation.technical.lineCreationStatus` | **CLÍNICO PENDIENTE** | payload.validation? (bloque opcional opaco) → `decision`/`validatedTreatment` [mapa pendiente] |
| 77 | Transversal | `prebiologic_required` | `validation.technical.prebiologicRequired` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 78 | Transversal | `prebiologic_overall_status` | `validation.technical.prebiologicOverallStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 79 | Transversal | `analysis_date` | `validation.prebiologic.analysisDate` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 80 | Transversal | `analysis_recent_status` | `validation.prebiologic.analysisRecentStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 81 | Transversal | `hemogram_verified` | `validation.prebiologic.hemogramVerified` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 82 | Transversal | `biochemistry_verified` | `validation.prebiologic.biochemistryVerified` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 83 | Transversal | `tb_status` | `validation.prebiologic.tbStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 84 | Transversal | `hbv_status` | `validation.prebiologic.hbvStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 85 | Transversal | `hcv_status` | `validation.prebiologic.hcvStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 86 | Transversal | `hiv_status` | `validation.prebiologic.hivStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 87 | Transversal | `vaccination_status` | `validation.prebiologic.vaccinationStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 88 | Transversal | `vaccination_observations` | `validation.prebiologic.vaccinationObservations` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 89 | Transversal | `preventive_medicine_status` | `validation.technical.preventiveMedicineStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 90 | Transversal | `validation_blockers_json` | `validation.technical.validationBlockers` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 91 | Transversal | `recurrent_infections_status` | `validation.comorbidities.recurrentInfectionsStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 92 | Transversal | `cardiovascular_risk_status` | `validation.comorbidities.cardiovascularRiskStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 93 | Transversal | `neurologic_disorder_status` | `validation.comorbidities.neurologicDisorderStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 94 | Transversal | `neoplasia_history_or_risk_status` | `validation.comorbidities.neoplasiaHistoryOrRiskStatus` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 95 | Transversal | `clinical_observations_json` | `validation.clinicalObservations` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 96 | Transversal | `related_treatments_json` | `validation.relatedTreatments` | **CLÍNICO PENDIENTE** | payload.transversal? (bloque opcional opaco) → `prebiologic`/observaciones [mapa pendiente] |
| 97 | Snapshot de línea | `line_role` | `firstVisit.lines[i].lineRole` / `followup.activeLines[i].lineRole` | **GATE** | Rol/actividad por línea **explícitos**, no deducibles del nombre o estado previo |
| 98 | Snapshot de línea | `is_primary_line` | `firstVisit.lines[i].isPrimaryLine` / `followup.activeLines[i].isPrimaryLine` | **GATE** | Rol/actividad por línea **explícitos**, no deducibles del nombre o estado previo |
| 99 | Snapshot de línea | `line_status_at_event` | `firstVisit.lines[i].lineStatusAtEvent` / `followup.activeLines[i].lineStatusAtEvent` | **GATE** | Rol/actividad por línea **explícitos**, no deducibles del nombre o estado previo |
| 100 | Snapshot de línea | `active_at_event` | `firstVisit.lines[i].activeAtEvent` / `followup.activeLines[i].activeAtEvent` | **GATE** | Rol/actividad por línea **explícitos**, no deducibles del nombre o estado previo |
| 101 | Snapshot de línea | `line_drug_name` | `firstVisit.lines[i].drugName` / `followup.activeLines[i].drugName` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 102 | Snapshot de línea | `line_active_ingredient` | `firstVisit.lines[i].activeIngredient` / `followup.activeLines[i].activeIngredient` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 103 | Snapshot de línea | `line_presentation` | `firstVisit.lines[i].presentation` / `followup.activeLines[i].presentation` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 104 | Snapshot de línea | `line_dose_text` | `firstVisit.lines[i].doseText` / `followup.activeLines[i].doseText` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 105 | Snapshot de línea | `line_route` | `firstVisit.lines[i].route` / `followup.activeLines[i].route` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 106 | Snapshot de línea | `line_schedule_code` | `firstVisit.lines[i].scheduleCode` / `followup.activeLines[i].scheduleCode` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 107 | Snapshot de línea | `line_schedule_label` | `firstVisit.lines[i].scheduleLabel` / `followup.activeLines[i].scheduleLabel` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 108 | Snapshot de línea | `line_schedule_other_text` | `firstVisit.lines[i].scheduleOtherText` / `followup.activeLines[i].scheduleOtherText` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 109 | Snapshot de línea | `line_selected_drug_id` | `firstVisit.lines[i].selectedDrugId` / `followup.activeLines[i].selectedDrugId` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 110 | Snapshot de línea | `line_catalog_source` | `firstVisit.lines[i].catalogSource` / `followup.activeLines[i].catalogSource` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 111 | Snapshot de línea | `line_national_code` | `firstVisit.lines[i].nationalCode` / `followup.activeLines[i].nationalCode` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 112 | Snapshot de línea | `line_registration_number` | `firstVisit.lines[i].registrationNumber` / `followup.activeLines[i].registrationNumber` | **CLÍNICO PENDIENTE** | payload.lines[i] (opaco) → línea V2 con identidad/rol/estado explícitos [mapa pendiente] |
| 113 | Primera Visita | `first_visit_date` | `firstVisit.visit.firstVisitDate` | **CLÍNICO PENDIENTE** | payload.firstVisit (bloque opaco) → `visit`/`proms` [mapa pendiente] |
| 114 | Primera Visita | `induction_performed_status` | `firstVisit.visit.inductionPerformedStatus` | **CLÍNICO PENDIENTE** | payload.firstVisit (bloque opaco) → `visit`/`proms` [mapa pendiente] |
| 115 | Primera Visita | `stratification_level` | `firstVisit.visit.stratificationLevel` | **CLÍNICO PENDIENTE** | payload.firstVisit (bloque opaco) → `visit`/`proms` [mapa pendiente] |
| 116 | Primera Visita | `baseline_proms_collection_status` | `firstVisit.visit.baselinePromsCollectionStatus` | **CLÍNICO PENDIENTE** | payload.firstVisit (bloque opaco) → `visit`/`proms` [mapa pendiente] |
| 117 | Primera Visita | `pharmacy_visit_notes` | `firstVisit.visit.pharmacyVisitNotes` | **CLÍNICO PENDIENTE** | payload.firstVisit (bloque opaco) → `visit`/`proms` [mapa pendiente] |
| 118 | Primera Visita | `proms_json` | `firstVisit.proms` | **CLÍNICO PENDIENTE** | payload.firstVisit (bloque opaco) → `visit`/`proms` [mapa pendiente] |
| 119 | Seguimiento | `visit_date` | `followup.visit.visitDate` | **CLÍNICO PENDIENTE** | payload.followup (bloque opaco) y lines[i] → datos de visita/línea [mapa pendiente] |
| 120 | Seguimiento | `stratification_review_status` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 121 | Seguimiento | `previous_stratification_level` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 122 | Seguimiento | `new_stratification_level` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 123 | Seguimiento | `stratification_change_reason` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 124 | Seguimiento | `followup_proms_collection_status` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 125 | Seguimiento | `visit_general_observations` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 126 | Seguimiento | `dispensation_status` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 127 | Seguimiento | `dispensation_observations` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 128 | Seguimiento | `specific_review_status` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 129 | Seguimiento | `specific_review_reason` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 130 | Seguimiento | `therapeutic_movement_type` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 131 | Seguimiento | `new_dose_text` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 132 | Seguimiento | `new_schedule_code` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 133 | Seguimiento | `new_schedule_label` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 134 | Seguimiento | `new_schedule_other_text` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 135 | Seguimiento | `new_route` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 136 | Seguimiento | `movement_reason` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 137 | Seguimiento | `movement_effective_date` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 138 | Seguimiento | `suspension_status` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 139 | Seguimiento | `suspension_reason` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 140 | Seguimiento | `suspension_effective_date` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 141 | Seguimiento | `line_observations` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 142 | Seguimiento | `adherence_collection_status` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 143 | Seguimiento | `adherence_instrument` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 144 | Seguimiento | `adherence_result` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 145 | Seguimiento | `adherence_answers_json` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 146 | Seguimiento | `adverse_event_status` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 147 | Seguimiento | `adverse_event_description` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 148 | Seguimiento | `adverse_event_severity` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 149 | Seguimiento | `adverse_event_resolution_status` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 150 | Seguimiento | `adverse_event_action` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 151 | Seguimiento | `adverse_event_suspects_json` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |
| 152 | Seguimiento | `causality_assessments_json` | — **Sin ruta en los 3 adaptadores actuales** (el core sí tiene columna) | **NO EMITIDO** | Columna soportada por el core pero **no poblada por el adaptador V2 actual**; no mapearla sin WO independiente |

### Lectura de las clasificaciones

- `DIRECTO` (1): solo el token `kind→event_type`, con validación estricta del token.
- `CORE` (7): campos *calculados por el núcleo V2*, después de obtener un evento y `rowKey` explícitos autorizados; `bridge_status` inicial siempre `PENDIENTE`.
- `FUERA` (3): metadatos de ejecución del Bridge; no acreditables durante preparación manual.
- `TÉCNICO` (22): necesarios desde **un proveedor técnico explícito**, que **no puede ser inferido** sin mapeo de identidades/fechas. Que una columna V2 tenga nombre parecido a F4.4 no demuestra equivalencia.
- `GATE` (4): estado y rol de línea, obligatoriamente explícitos y consistentes.
- `NO EMITIDO` (34): la columna existe en el core pero los adaptadores actuales **no la asignan** (33 campos de Seguimiento y `adverse_event_id`); no atribuirlas a una ruta positiva sin ampliar el adaptador en WO separada.
- `CLÍNICO PENDIENTE` (81): pertenecen a los bloques opacos y requieren un subcontrato de correspondencias versionado y autorizado por cada caso de uso. La mayoría son opcionales V2, pero opcional **no** implica inferible.

No se propone completar automáticamente las 152 columnas ni exigir información clínica que actualmente no existe. La representabilidad debe evaluarse contra la versión aprobada del mapping y los campos realmente exigibles por caso de uso.

## 5. Decisiones de dominio y contexto sin las que no puedo declarar el mapping aprobado

| Gate | Aprobación concreta requerida | Fallo si falta |
|---|---|---|
| **C1 — Diccionario de bloques F4.4** | Para `request`, `validation?`, `transversal?`, `firstVisit`, `followup` y `lines[i]`, identificar las claves efectivamente emitidas por cada caso de uso, origen asistencial, obligatoriedad, tipos y discriminación de ausencia/propiedad propia. **Hoy F4.4 solo garantiza objeto opaco.** | `PROJECTION_NOT_AUTHORIZED` |
| **C2 — Identidades** | Definir procedencia autorizada de `eventId`, `sourceEventId`, `patientId`, `validationId`/`firstVisitId`/`visitId`, `rowKey`, `lineId` y `treatmentId`, sin equiparar `actId`, `patientRef`, CIP ni líneas por intuición. La capa llamadora debe suministrarlos de forma explícita. | `PROJECTION_NOT_AUTHORIZED` o `REPRESENTATION_NOT_REPRESENTABLE` |
| **C3 — Semántica clínica por caso** | Validación solicitado/validado y decisión; Primera Visita vs primera dispensación; Seguimiento activo/inactivo, dispensación y movimientos; tratamiento previo nunca inicia uno. Decidir explícitamente si Validación F4.4 con 1/N líneas puede proyectarse a una fila V2 sin falsear garantías, o si siempre se rechaza en fase 1. | `REPRESENTATION_NOT_REPRESENTABLE` |
| **C4 — Fechas y estados** | Origen real de `occurredAt`/`occurred_at`, `recorded_at`, `first_visit_date`, `visit_date`, `event_status`, `demo_flag`; `authoredAt` no se reasigna a `recorded_at` por semejanza. | `PROJECTION_NOT_AUTHORIZED` |
| **C5 — Tests de equivalencia y seguridad** | Casos positivos sintéticos explícitos y negativos 0/1/N; clave heredada vs propia, ausente vs undefined/null, identidad cruzada, solicitado≠validado, tratamiento previo, catálogo, estado ambiguo, duplicados de líneas/rowKey, orden, ciclo/celda TSV y no efectos secundarios. | No desbloquear #721 |

## 6. Casuística mínima de validación que debe quedar congelada

| Caso | Acto sintético / condición | Resultado exigido |
|---|---|---|
| M01 | `kind` F4.4 distinto de cualquiera de los tres tokens | Rechazo estructural, sin proyección |
| M02 | Validación sin líneas, bloques e identidad completos **según mapping aprobado** | 1 fila `validation`, nunca tratamiento validado inferido |
| M03 | Validación con N líneas que no tienen política explícita de descarte/proyección | Falla cerrada; ninguna línea escogida arbitrariamente |
| M04 | Primera Visita con `lines:[]` | `REPRESENTATION_NOT_REPRESENTABLE` |
| M05 | Primera Visita con 2 líneas y exactamente una principal, todas activas/identificables | 2 filas en mismo orden si fuente y mapping explícitos |
| M06 | Primera Visita sin línea principal o con 2 principales | Falla, sin reparación automática |
| M06b | Primera Visita con `lineRole='principal'` pero `isPrimaryLine=false`, o `lineRole` extraño | **Fallo exigido en el mapeador**; no delegar esta invariancia al adapter actual, que no la impone |
| M07 | Seguimiento sin líneas o sin actividad explícita | Falla; no se inventa activo ni dispensado |
| M08 | Seguimiento con N líneas activas explícitas, 0/1 principal | N filas, orden conservado; ninguna revisión/dispensación inferida |
| M09 | Seguimiento con una línea inactiva entre las activas | Falla la ruta sin política de selección autorizada |
| M10 | `patientRef` válido pero `patientId` técnico ausente | Falla, no se usa CIP o `patientRef` como sustituto |
| M11 | `actId` válido pero faltan `eventId` o `sourceEventId` | Falla, no se copia el identificador por semejanza |
| M12 | `authoredAt` válido y `recordedAt` ausente | Falla, no se usa autoría como registro |
| M13 | Solicitud con fármaco y dosis, pero sin validación explícita | Los campos validados siguen ausentes/no afirmados; fallo si otro requisito positivo no se cumple |
| M14 | Tratamiento anterior o seleccionado en CIMA sin línea explícita | No se crea línea, ni se completa dosis, vía, presentación o pauta |
| M15 | `undefined` propio, ausencia, `null`, `''`, `0`, `false` en bloques F4.4 | Nunca se declara L2; proyección V2 solo según reglas autorizadas y sin reconstrucción infundada |
| M16 | Falta mapping C1–C4 incluso con F4.4 `ok:true` | `PROJECTION_NOT_AUTHORIZED`, `ok:false`, sin artifact ni `deliveryStatus` |
| M17 | ID/rowKey duplicados o count/orden discordantes | Fallo de adapter/core tipado y envoltura F4.5 negativa sin TSV parcial |
| M18 | TSV válido a nivel core pero no pegado por la persona | `prepared_for_transfer` como máximo, jamás `persisted` |
| M19 | `manual_download` o `pharmacy_act_full` solicitados | Errores de capacidad específicos del DTO; jamás degradación silenciosa |
| M20 | El caller propone un `first_visit_date` como evidencia de primera dispensación | No se afirma dispensación/inicio salvo dato independiente explícito |

Los M01–M20 y M06b son **casos de aceptación propuestos**, no tests ejecutados. Los O-01..O-18 de #671 permanecen intactos como oráculos documentales propios de DeliveryResult.

## 7. WO clínica/documental FUTURA — cerrar C1–C5, NO implementación

**No confundir:** la WO #750 publica **este candidato**; la WO de esta sección es una **propuesta futura** para resolver con fuentes clínicas autorizadas C1–C5. Ninguno de esos gates queda cerrado por publicar el presente dossier.

**PROPUESTA:** `WO-DOC-NEXUS-F45-F44-V2-MAPPING-01`.

**Objetivo/contexto.** Elaborar y validar un diccionario de correspondencias **campo a campo** entre las fuentes clínicas reales que alimentan F4.4 y los inputs cerrados V2, con propietario y pruebas de pérdidas por caso; actualizar esta matriz hasta una propuesta autorizable. No escribir proyector runtime, adaptar UI ni activar entregas.

**Base/HEAD esperado.** `b32majus/Hub-Clinico-Badajoz`, canónica `promueve/nexus-v4@cd5e698de09b0ef8b099aefb4890c4d0d94c7a20` para preflight; verificar HEAD **live** antes de rama/edición. Sin usar commits recordados como verdad viva.

**Preflight.** Git status limpio en rama/worktree aislado; leer `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, F4.4, core 152, tres adapters, contrato #671 publicado, matriz de equivalencia y #721; confirmar autoridad concreta sobre campos clínicos; muestras únicamente sintéticas.

**RUTAS propuestas** (presentar a aprobación antes de editar repo):
- `docs/contracts/FARMACIA_F44_EXPORT_V2_MAPPING_CONTRACT.md` (NUEVO; especificación de mapeo clínico y tests M01–M20 por campo/caso).
- `docs/ops/WO_NEXUS_F45_F44_V2_MAPPING_20261013.md` (NUEVO; WO, QA, reversión, closeout).
- Índice/status/contrato F4.5 solo mediante reconciliación documental separada **tras** aprobar y publicar el mapping; no mezclar con esta especificación.

**NO TOCA.** `main`; #721; F4.4 runtime, core, adapters, datos demo existentes, interfaces, API, Farmatool, Excel/Office Script, routing #577, L2; no nuevos campos clínicos ni normalizaciones oportunistas.

**Tests/QA.** En esta fase: revisar los 152 nombres, correspondencias C1–C5 y resultados negativos M01–M20; `git diff --check`, enlaces, semántica Q-1..Q-4 y oráculos #671 sin cambios. **NO declaramos browser/Excel QA ni tests de runtime**, porque es una WO documental.

**Aceptación.** Cada campo clínico que sí vaya a proyectarse tiene origen, semántica, valor ausente, autor de dato y evidencia sintética; cada campo no sustentado queda `NO_MAPPING/UNSUPPORTED`; 0/1/N y errores cerrados. Mapping `APPROVED` **solo con aceptación humana/autoridad clínica explícita**. Sin ella, únicamente `MAPPING_SPEC_CANDIDATE`.

**Reversión.** Revert documental acotado con autorización; sin reset/force-push/borrados destructivos, y sin sobrescribir cambios ajenos.

**Política Git.** El “adelante” del análisis autoriza este diagnóstico y dossier de trabajo, **no** da permiso automático para crear issue, push, PR, merge ni desbloquear #721. Antes de publicar, crear WO/issue con `status:approved` de este alcance mediante autorización específica; pruebas verdes no bastan para aprobación clínica.

**OUTPUT.** Especificación campo a campo, decisiones clínicas faltantes C1–C5, plan de tests negativos, SHA de evidencia y STOP hasta disponer de mapping clínico realmente autorizado.

## 8. Conclusión operativa

**Se puede avanzar sin inventar nada:** el mapa de formatos, cardinalidad, requisitos técnicos, fallos seguros y reglas de no inferencia está preparado. **No se puede declarar cerrado el mapping clínico completo** desde los contratos existentes, porque faltan los nombres/semántica aprobados del interior de bloques F4.4 y la fuente institucional de IDs/fechas. Debemos resolver explícitamente C1–C5 y, solo entonces, autorizar la primera implementación de la ruta positiva F4.5 → V2.