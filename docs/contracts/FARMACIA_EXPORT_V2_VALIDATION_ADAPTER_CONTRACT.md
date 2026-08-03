# Farmacia Export v2 — contrato del adaptador de Validación

**Adaptador:** `1.0.0-draft.1`
**Core requerido:** `2.0.0-draft.1`
**Estado:** integrado en la rama recovery como infraestructura interna; sin cutover ni salida pública v2.

## Límite

`scripts/farmacia_export_v2_validation_adapter.js` instala `window.FarmaciaExportV2ValidationAdapter`. Es browser-compatible, síncrono y puro: no accede a DOM, storage, red, reloj ni aleatoriedad. Su única dependencia es `window.FarmaciaExportV2Core`.

La API pública exacta es:

```text
ADAPTER_VERSION
buildValidationEvent                 buildValidationProjection
validateValidationInput              normalizeTriState
normalizeTbStatus                    normalizeSerologyStatus
normalizeVaccinationStatus           normalizeValidationResult
normalizeValidatedTreatmentRelation
```

Los builders lanzan `FarmaciaExportV2ValidationAdapterError` con `code`, `message` y `details`. El validador devuelve `{ valid, errors }`, no corrige ni muta el input y no lanza por errores de contrato. Todos los bloques son objetos planos cerrados: los escalares clínicos/técnicos son `string | null`, salvo `demoFlag`, `hemogramVerified` y `biochemistryVerified` (`boolean | null`, con `demoFlag` obligatorio), y `validationBlockers`, que cuando aparece debe ser un array. Objetos o arrays arbitrarios en escalares, bloques ausentes/no planos y claves no declaradas son inválidos.

## Input normalizado

El input separa estrictamente:

```text
technical, context, request, requestedTreatment, decision,
validatedTreatment, prebiologic, comorbidities,
clinicalObservations, relatedTreatments
```

`technical` exige `eventId`, `sourceEventId`, `rowKey`, `validationId`, `patientId`, `occurredAt`, `recordedAt`, `demoFlag` y `eventStatus`. Solo se trasladan, cuando el llamador los aporta, `requestId`, `hospitalCode`, `professionalRef`, `identifierSystem`, `validatedTreatmentId`, `validatedLineId`, `lineCreationStatus`, `prebiologicRequired`, `prebiologicOverallStatus`, `preventiveMedicineStatus` y `validationBlockers`. El adaptador no genera identificadores, fechas, estados ni valores clínicos.

El CIP visible se representa como `context.identifierValue`. `identifierSystem`, referencias profesionales y códigos técnicos solo proceden de input explícito. `request.date` es la fecha de solicitud; `request.appointmentDate`, la cita de Farmacia. `occurredAt` y `recordedAt` pertenecen exclusivamente a `technical`.

## Solicitud, decisión y tratamiento validado

Solicitud y validación nunca comparten objeto ni fallback. Los campos terapéuticos son nombre, principio activo, presentación, dosis, vía, código/label/texto libre de pauta, inducción y cuatro metadatos regulatorios. Los IDs de tratamiento y línea existen solo en `technical`.

- `pending|pendiente`, `validated|validado` y `denied|denegado` normalizan a los valores canónicos; el vacío normaliza a `null`; `not_recorded` explícito se preserva en todos los normalizadores cuando el core lo admite; un valor desconocido se conserva para que la validación lo rechace.
- Un snapshot terapéutico es **identificable** solo si es un objeto plano con `drugName` o `activeIngredient` string no vacío tras `trim`. Dosis, vía, pauta, inducción y metadatos, solos o combinados, no lo identifican.
- `validated` admite únicamente `same_as_requested|modified_from_requested` y exige que solicitud y validado sean identificables. `same_as_requested` exige igualdad contractual completa por todos los campos: `undefined`, propiedad omitida, `null` y `""` son la misma ausencia; no se admite añadir o cambiar un valor explícito, incluidos metadatos. Dos snapshots vacíos no son un `same` válido. `modified_from_requested` exige al menos una diferencia contractual explícita; snapshots iguales son inválidos. No copia ni repara la solicitud.
- `denied` exige exactamente `no_treatment_validated`, tratamiento validado completamente vacío, ausencia de `validatedTreatmentId|validatedLineId` y `lineCreationStatus` distinto de `created|updated`. `denialReason` no se vuelve obligatorio.
- `pending` admite únicamente relación `null|not_recorded`; resultado `null|not_recorded` aplica la misma regla. En los tres casos el tratamiento validado debe estar completamente vacío, no puede haber IDs validados y no se puede crear ni actualizar línea.
- `no_treatment_validated` solo es compatible con `denied` bajo las condiciones anteriores.
- Con `validated`, `created|updated` exigen ambos IDs técnicos validados. `not_created|not_applicable|not_recorded` se permiten sin IDs. El adaptador nunca genera ninguno.

La matriz se reporta con códigos estables y específicos: `VALIDATED_TREATMENT_REQUIRED`, `REQUESTED_TREATMENT_REQUIRED`, `RESULT_RELATION_MISMATCH`, `MODIFIED_TREATMENT_NOT_DIFFERENT`, `SAME_AS_REQUESTED_MISMATCH`, `VALIDATED_TREATMENT_NOT_ALLOWED`, `VALIDATED_IDS_NOT_ALLOWED`, `RESULT_CANNOT_CREATE_LINE` y, para IDs ausentes al crear/actualizar, `MISSING_REQUIRED` sobre el campo concreto.

La UI solo ejecuta `same_as_requested` mediante el botón **“Validar tratamiento solicitado sin cambios”**. La opción `no_treatment_validated` se muestra como **“No se valida tratamiento”** y el pendiente usa **“Motivo / información pendiente”**. Antes de mutar, pide confirmación si ya hay contenido validado distinto; cancelar no cambia controles ni snapshots. La copia usa solo valores explícitos visibles, filtra placeholders y transfiere metadatos únicamente si el snapshot solicitado coincide exactamente en slot, CIP y nombre. No reconsulta catálogo y no sincroniza cambios posteriores. La selección CIMA en validado no propone pauta ni inducción. El badge del formulario describe una selección con propuesta regulatoria editable, nunca una precarga automática.

La inducción solicitada procede únicamente del control representado por el flujo activo: manual usa `fhManualInduccion`, Dermatología no manual usa `fhDermaInduccion`, y Reumatología/Digestivo permanecen ausentes mientras sus bloques no expongan un control propio.

La pauta Reumatología/Enfermería parte exclusivamente del label visible explícito. Se compara por label exacto mediante el catálogo de pautas ya cargado: un resultado reconocido conserva `scheduleCode` y `scheduleLabel` canónicos; cualquier texto no reconocido exactamente se representa reversiblemente como `OTRO`, usando el texto explícito tanto en `scheduleLabel` como en `scheduleOtherText`. La acción `same_as_requested` copia code/label/other mediante el select y su campo OTRO, sin usar el nombre del fármaco, patrones inferidos, búsquedas de catálogo farmacológico ni primeras coincidencias. Placeholders continúan como ausencia.

## Prebiológico, observaciones y relacionados

No existe inferencia prebiológica. Las casillas no marcadas son `null`. TB, serologías y vacunación conservan dominios separados del core. Los cuatro estados de comorbilidad son trivalentes y el blanco es `null`. Los controles comunes de comorbilidad solo se leen cuando hay una patología Dermatología activa; Reumatología, Digestivo y manual no-Derma emiten cuatro `null` aunque queden valores ocultos residuales. Los opcionales globales de prebiológico/preventiva/bloqueos solo llegan por `technical` explícito.

Las observaciones clínicas v2 se emiten únicamente para controles explícitos de la patología Dermatología activa. `clinicalObservations` es `null` o un array de objetos planos cerrados a `code,value,source,pathology_label,unit,display`. Cada entrada exige `code` y `pathology_label` no vacíos, `source` exactamente `validation_origin_form` y `value` escalar explícito; `0` y `false` se preservan. `unit` y `display`, si aparecen, son strings no vacíos. Se rechazan claves extra, IDs, objetos/arrays como valor, EA y causalidad. Tratamientos previos son observaciones codificadas, no líneas. No se inventan observaciones para Reumatología o Digestivo.

`relatedTreatments` es `null` o un array 1:N de objetos planos cerrados a `source_row_uid,relation_type,drug_name,active_ingredient,dose_text,route,schedule_text,start_date,end_date,reason,adverse_event_suspect`; cada propiedad presente es un string no vacío. `source_row_uid` conserva solo la identidad de la fila origen y, como `relation_type`, no cuenta como dato terapéutico: cada elemento exige al menos nombre, principio, dosis, vía, pauta, fecha, motivo o sospecha EA explícitos. Se rechazan claves extra, IDs de catálogo/tratamiento/línea, códigos regulatorios, `adverse_event_id` y causalidad. El builder DOM omite tarjetas con solo UID/relación y usa `null` sin filas útiles. Campos de efecto adverso y causalidad del core permanecen `null` en la fila proyectada.

## Proyección y no activación

`buildValidationProjection` devuelve `{ event, rows, row, tsv }`. El evento es `pharmacy_validation`, la única fila tiene rol `validation`, y el core impone `bridge_status=PENDIENTE` y construye `row_id` con el `rowKey` explícito. El TSV es reversible mediante el core.

La página carga core y adaptador antes del controlador DOM, pero no añade botón/download v2 ni cambia las salidas públicas. Excel v1 conserva 61 columnas.

## Verificación

```bash
node --check scripts/farmacia_export_v2_validation_adapter.js
node --check scripts/farmacia_validacion.js
node tools/farmacia_export_v2_validation_adapter_check.mjs
node tools/farmacia_validacion_ui_cleanup_check.mjs
node tools/farmacia_validacion_derma_pathologies_check.mjs
node tools/farmacia_validacion_enfermeria_import_check.mjs
```
