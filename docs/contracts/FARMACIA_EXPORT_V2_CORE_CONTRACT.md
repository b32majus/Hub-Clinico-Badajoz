# Farmacia Export v2 canonical core contract

**Candidate:** `2.0.0-draft.1`
**Scope:** pure technical core only; no public export, form, workbook, storage, or runtime adapter is activated.

## Contract boundary

`scripts/farmacia_export_v2_core.js` installs `window.FarmaciaExportV2Core`. It is browser-compatible, dependency-free, synchronous, and has no DOM, storage, network, clock, or randomness access. Its public surface contains exactly:

```text
EVENT_SCHEMA_VERSION  ROW_SCHEMA_VERSION  ROW_COLUMNS  FIELD_DEFINITIONS
createEventEnvelope   createRow            projectEventRows
validateEvent         validateRow          validateRowSet
buildRowId            stableStringify      serializeRowToTsv
serializeRowsToTsv    parseTsvRow          parseTsvRows
```

The event and row versions are independently fixed to `2.0.0-draft.1`. `ROW_COLUMNS` is the ordered 152-column candidate from WO1. `FIELD_DEFINITIONS`, the row schema properties, and `x-column-order` have the same names and order.

## Event and projection model

An event contains explicit common context. Required event fields are:

```text
event_schema_version, event_id, source_event_id, event_type, event_status,
occurred_at, recorded_at, demo_flag, patient_id
```

Line identity and line-specific follow-up facts belong to explicit row payloads, not the event. Every payload passed to `projectEventRows(event, rowPayloads)` requires a non-empty, stable `rowKey`. The function:

1. validates the event without filling it;
2. rejects empty payload sets, duplicate `rowKey` values, unknown fields, common-field overrides, and line projections without an explicit `line_id`;
3. maps the event type to `validation`, `first_visit_line`, or `followup_line`;
4. builds `row_id` only from `source_event_id`, `row_role`, and the explicit `rowKey`;
5. assigns the ordered 1-based `row_index` and exact `row_count`;
6. validates the complete set before returning it.

`buildRowId` percent-encodes each explicit identity component and joins them with `::`. It does not use array position, medication name, time, or random input. Consumers must keep `rowKey` stable; for line projections it should be based on an already established technical line identity, never a drug label.

`validateRowSet` rejects duplicate row or projected-line IDs, missing line IDs, gaps/reordering in `1..row_count`, count mismatches, invalid rows, or disagreement in common event fields. For comparison only, an omitted optional common property and an explicit `null` both mean absence. Sparse schema-valid rows therefore remain valid; no clinical value is created. Validators catch non-JSON/cyclic comparison input and always return structured `{ valid, errors }` results rather than throwing. The validator does not select a “winning” row or repair discrepancies.

## Types, absence, and schemas

Both schemas use JSON Schema draft 2020-12 and `additionalProperties: false`. Required IDs are non-empty strings. Cardinalities are positive integers. `demo_flag` and other booleans are JSON booleans. Closed enums are those approved by WO1; unconstrained clinical domains remain `string | null` rather than receiving invented enums.

Prebiological domains remain distinct: `tb_status` is `negative | positive_treated | pending | not_recorded`; `hbv_status`, `hcv_status`, and `hiv_status` are `negative | positive | pending | not_recorded`; and `vaccination_status` is `yes | no | pending | not_recorded`. `preventive_medicine_status` remains unconstrained `string | null`. The generic `yes | no | not_recorded` enum is used only by the separately approved binary/tristate fields.

Date values are either `YYYY-MM-DD` or an RFC 3339-style date-time with mandatory `T`, seconds, and `Z` or a numeric offset. The pure runtime validator checks Gregorian month lengths and leap years, time ranges, and offsets up to `±14:00`; it reads no clock. Year `0000`, impossible dates, `24:00`, leap seconds, and offsets beyond that range are rejected. The draft-2020-12 schemas combine `format: date` / `format: date-time` annotations with restrictive patterns; runtime semantic validation remains authoritative where a schema engine does not enable format assertions.

Creation functions validate and copy supplied values. A row is materialized in column order; omitted optional row properties become `null`, which represents absence and is not a clinical default. The core never generates or infers IDs, patient identity, timestamps, `demo_flag`, validation facts, treatment facts, line identity, dose, route, schedule, dispensing, review, adverse-event assessment, or any other clinical value. Requested treatment fields never populate validated fields. A drug name never creates a treatment or line.

Validators return `{ valid, errors }`. Creation, projection, ID, stringify, and TSV operations throw `FarmaciaExportV2CoreError` with stable `code`, human-readable `message`, and optional `details`. Inputs are not silently corrected.

## Reversible one-line TSV

Cells are joined by a literal tab. Absence (`null`) is an empty cell, booleans are the required tokens `TRUE` and `FALSE`, and every other typed value uses canonical JSON generated by `stableStringify`. Therefore an empty string is encoded as the two literal quote characters `""` and remains distinct from absence; strings encode literal tabs, CR/LF, backslashes, and quotes as JSON escapes while Unicode remains intact. Each row occupies exactly one physical line. Row sets use LF only between rows.

Under **verbatim tabular-cell transport**, every string cell begins with a literal double quote. A source string beginning with `=`, `+`, `-`, or `@` is consequently transported as a JSON string such as `"=1+1"`, never with a formula prefix in the first character of the cell. Encoded string cells contain no physical tab, CR, or LF, so those characters cannot split a row or cell. Blank (`null`), `""` (empty string), quoted formula-like strings, numbers, booleans, arrays, and objects remain distinct. This is a transport invariant verified by the checker, not a claim of QA in the Excel application or of workbook-specific import behavior.

This encoding distinguishes and recovers:

- `null` (absence), `""` (present empty string), `0`, `false`, and `true`;
- strings containing tabs, line breaks, quotes, backslashes, and Unicode;
- nested arrays and objects, with object keys sorted deterministically;
- 1:N related treatments, PROMs, adherence answers, suspects, and causality assessments.

`parseTsvRow` requires exactly 152 cells, maps empty cells to `null` and uppercase boolean tokens to booleans, then validates the reconstructed typed row. `parseTsvRows` additionally validates row-set consistency. Browser and Excel-runtime QA are N/A for this unwired core.

## Event and bridge ownership

`adverse_event_id` is common event context. When present, every projected row carries the same value; row payloads cannot override it. This candidate does not model multiple adverse events per event.

Projection owns the initial bridge boundary: every projected row starts with `bridge_status = PENDIENTE`. Row payloads cannot provide `bridge_status`, `bridge_processed_at`, `bridge_error_code`, or `bridge_error_detail`. Later bridge processing may produce rows with `PROCESADA` or `ERROR`; `createRow` and TSV parsing continue to validate those canonical states, but projection never manufactures them.

## Synthetic contractual fixtures

- `validation_event_v2.json`: requested and validated blocks remain separate, includes `0`, `false`, `null`, empty text, Unicode, escaped text, and two related treatments.
- `first_visit_event_v2.json`: one canonical first-visit date and one explicit line projection.
- `followup_event_v2.json`: one visit projects to two active lines with stable distinct identities. One is dispensed without a specific review; the other is not dispensed and has an explicit schedule review/change. It also carries multiple suspects and causality assessments.

Fixtures use invented technical identifiers and clinical-neutral demo labels. They describe the core contract only and do not assert that a form adapter, Excel Bridge, public v2 output, or pilot exists.

## Verification and non-activation

Run:

```bash
node --check scripts/farmacia_export_v2_core.js
node tools/farmacia_export_v2_core_check.mjs
git diff --check
```

The checker verifies API exactness, purity, schema/column parity, types/enums/nullability, rejection paths, stable IDs, cardinality and common identity, semantic TSV roundtrip, 1:N structures, fixtures, and clinical non-inference. The existing 61-column exporter remains the only wired public Excel row and is outside this contract.
