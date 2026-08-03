# Contrato del adaptador Export v2 — Primera Visita de Farmacia

**Estado:** candidato interno, no publicado  
**Adaptador:** `1.0.0-draft.1`  
**Core requerido:** `FarmaciaExportV2Core` `2.0.0-draft.1`

## Alcance y límites

El adaptador transforma un input explícito de Primera Visita en un evento `pharmacy_first_visit`, una proyección de `1..N` filas `first_visit_line` y un TSV reversible delegado al core. Es síncrono, determinista y puro: no accede a DOM, storage, red, reloj ni aleatoriedad, y no genera IDs o timestamps.

Este contrato **no activa** una salida pública v2, no cambia el exportador v1 de 61 columnas y no constituye un cutover ni una habilitación para piloto real.

## API pública exacta

`window.FarmaciaExportV2FirstVisitAdapter` expone únicamente:

1. `ADAPTER_VERSION`
2. `buildFirstVisitEvent(input)`
3. `buildFirstVisitProjection(input)`
4. `validateFirstVisitInput(input)`
5. `normalizeTriState(value)`

Los builders rechazan inputs inválidos con `FarmaciaExportV2FirstVisitAdapterError`, que incluye `code`, `message` y `details`.

## Input cerrado

El nivel superior contiene exactamente `technical`, `context`, `visit`, `proms` y `lines`. Se rechazan claves ajenas en cualquier bloque.

### `technical`

Obligatorios: `eventId`, `sourceEventId`, `firstVisitId`, `patientId`, `occurredAt`, `recordedAt`, `demoFlag` y `eventStatus`. Opcionales explícitos: `hospitalCode`, `professionalRef` e `identifierSystem`. Ningún valor obligatorio se completa automáticamente.

### `context`

Campos admitidos: `identifierValue`, `serviceCode`, `serviceLabel`, `pathologyCode`, `pathologyLabel` y `professionalDisplay`.

### `visit`

Campos admitidos: `firstVisitDate`, `inductionPerformedStatus`, `stratificationLevel`, `baselinePromsCollectionStatus` y `pharmacyVisitNotes`.

`firstVisitDate` es obligatorio y acepta únicamente una fecha real `YYYY-MM-DD`. Es la fecha canónica única de Primera Visita, inicio, primera dispensación y primera administración en el circuito actual. El adaptador no usa la fecha del sistema.

Inducción y estado de recogida PROM normalizan `Sí/yes`, `No/no`, `not_recorded` y ausencia/`No informado`; el literal `No informado` está permitido únicamente en esos dos campos triestado y se construye como `null`. En cualquier otro campo string continúa siendo un placeholder rechazado. Ninguno de estos valores se deduce. La estratificación ausente permanece `null`.

### `proms`

Es `null` o un array. Estado `yes` exige al menos un PROM; cualquier otro estado exige `null`. Instrumentos permitidos: `DLQI`, `EVA_DOLOR` y `EVA_PRURITO`.

Cada PROM contiene exactamente `instrument`, `value`, `complete`, `answeredCount` y `answers`. Los números deben ser finitos. DLQI exige al menos una respuesta explícita `{ item, score, response }`: `answers=[]`/`answeredCount=0` no constituye una medición. Se conservan la parcialidad y un total cero cuando procede de una o más respuestas explícitas con puntuación cero. EVA usa `answers=null` y solo existe si hubo interacción explícita; por ello un `0` tocado es distinto de un slider visual no tocado. Se rechazan placeholders.

### `lines`

Array no vacío. Cada objeto cerrado contiene:

- identidad técnica: `rowKey`, `treatmentId`, `lineId`, `lineRole`, `isPrimaryLine`;
- estado explícito: `lineStatusAtEvent="active"`, `activeAtEvent=true`;
- snapshot clínico opcional: `drugName`, `activeIngredient`, `presentation`, `doseText`, `route`, `scheduleCode`, `scheduleLabel`, `scheduleOtherText`;
- metadatos opcionales: `selectedDrugId`, `catalogSource`, `nationalCode`, `registrationNumber`.

Cada línea requiere `drugName` o `activeIngredient` no vacío. Dosis, presentación, pauta o metadatos aislados no crean identidad. Debe haber exactamente una principal; `rowKey` y `lineId` son únicos.

## Evento y proyección

El evento contiene los campos comunes de Primera Visita y `proms_json`, pero ningún snapshot de línea ni campos de Validación, Seguimiento, dispensación, revisión, movimiento, adherencia, evento adverso o causalidad.

`buildFirstVisitProjection` delega en `FarmaciaExportV2Core.projectEventRows`, conserva el orden y devuelve `{ event, rows, tsv }`. No devuelve un singular `row`. Todas las filas comparten los campos del evento, usan `bridge_status=PENDIENTE`, tienen índices/recuento coherentes y son reversibles mediante `parseTsvRows`.

## Bridge DOM actual

`window.FarmaciaPrimeraVisita` añade:

- `buildFirstVisitV2Input(technicalContext)`
- `buildFirstVisitV2Projection(technicalContext)`
- `buildFirstVisitPromsV2()`
- `buildFirstVisitVisibleLineV2(lineContext)`

El bridge acepta exactamente un `lineContext` porque la UI actual representa una sola línea visible. Lee solo los controles visibles actuales. No usa `patient.farmaco`, contexto stale, tratamientos previos, campos ocultos ni coincidencias implícitas.

Un snapshot aporta únicamente principio activo, IDs/códigos de catálogo y presentación cuando coinciden el slot `primera_visita.tratamiento`, el CIP visible y el nombre visible actual. No se reconsulta el catálogo al exportar. Vía y pauta proceden de controles visibles.

Para el control combinado `Presentación / dosis`:

- literal igual a la presentación del snapshot exacto → `presentation`, con `doseText=null`;
- cualquier otro literal visible → `doseText`, con `presentation=null`.

No se duplica ni se descompone el literal.

## No inferencia y ausencia

No se infieren dosis, presentación, vía, pauta, inducción, duración, fecha, línea terapéutica, IDs, estado ni resultado clínico. `null`, `0` y `false` se mantienen distintos a través del evento, filas y TSV.

## Verificación

El checker contractual cubre API, versión, pureza, input cerrado, errores tipados, fechas e IDs explícitos, PROMs, `1..N` líneas, estado activo, campos prohibidos, validación contra core y reversibilidad TSV. El checker Chromium usa servidor efímero e interacción soportada para cubrir los 14 criterios de navegador de la WO, incluida la regresión v1 de 61 columnas.
