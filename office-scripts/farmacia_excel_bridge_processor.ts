/* PROMueve FH Excel Bridge Processor. Synthetic/demo candidate only. */

const EMBEDDED_MANIFEST_VERSION = "1.0.0-draft.1";
const EMBEDDED_MANIFEST_SHA256 = "a6212bb392997fcb6c704d956b13cdd2be44c8a9f2f8010a98128f5339048eff";
const EMBEDDED_MANIFEST_JSON = `{"$id":"https://promueve.example/schemas/farmacia_excel_bridge_relational_v1.json","$schema":"https://json-schema.org/draft/2020-12/schema","common_fields_by_event_type":{"pharmacy_first_visit":["event_schema_version","row_schema_version","event_id","source_event_id","event_type","event_status","occurred_at","recorded_at","demo_flag","patient_id","identifier_system","identifier_value","hospital_code","service_code","service_label","pathology_code","pathology_label","professional_ref","professional_display","first_visit_id","validation_blockers_json","clinical_observations_json","related_treatments_json","first_visit_date","induction_performed_status","stratification_level","baseline_proms_collection_status","pharmacy_visit_notes","proms_json"],"pharmacy_followup":["event_schema_version","row_schema_version","event_id","source_event_id","event_type","event_status","occurred_at","recorded_at","demo_flag","patient_id","identifier_system","identifier_value","hospital_code","service_code","service_label","pathology_code","pathology_label","professional_ref","professional_display","visit_id","adverse_event_id","validation_blockers_json","clinical_observations_json","related_treatments_json","proms_json","visit_date","stratification_review_status","previous_stratification_level","new_stratification_level","stratification_change_reason","followup_proms_collection_status","visit_general_observations","adverse_event_status","adverse_event_description","adverse_event_severity","adverse_event_resolution_status","adverse_event_action","adverse_event_suspects_json","causality_assessments_json"],"pharmacy_validation":["event_schema_version","row_schema_version","event_id","source_event_id","event_type","event_status","occurred_at","recorded_at","demo_flag","patient_id","identifier_system","identifier_value","hospital_code","service_code","service_label","pathology_code","pathology_label","professional_ref","professional_display","request_id","validation_id","request_origin","request_date","validation_type","pharmacy_appointment_date","requested_drug_name","requested_active_ingredient","requested_presentation","requested_dose_text","requested_route","requested_schedule_code","requested_schedule_label","requested_schedule_other_text","requested_induction_status","requested_weight_text","requested_justification","request_source_observations","requested_selected_drug_id","requested_catalog_source","requested_national_code","requested_registration_number","validation_result","validation_pending_reason","validation_denial_reason","pharmacy_observations","other_validation_observations","validated_treatment_relation","validated_drug_name","validated_active_ingredient","validated_presentation","validated_dose_text","validated_route","validated_schedule_code","validated_schedule_label","validated_schedule_other_text","validated_induction_status","validated_selected_drug_id","validated_catalog_source","validated_national_code","validated_registration_number","validated_treatment_id","validated_line_id","line_creation_status","prebiologic_required","prebiologic_overall_status","analysis_date","analysis_recent_status","hemogram_verified","biochemistry_verified","tb_status","hbv_status","hcv_status","hiv_status","vaccination_status","vaccination_observations","preventive_medicine_status","validation_blockers_json","recurrent_infections_status","cardiovascular_risk_status","neurologic_disorder_status","neoplasia_history_or_risk_status","clinical_observations_json","related_treatments_json"]},"entity_mapping_by_event_type":{"pharmacy_first_visit":["PATIENTS","TREATMENTS","TREATMENT_LINES","VISITS_FIRST_VISIT","VISIT_LINES","OBSERVATIONS","PROMS"],"pharmacy_followup":["PATIENTS","TREATMENTS","TREATMENT_LINES","VISITS_FOLLOWUP","VISIT_LINES","TREATMENT_MOVEMENTS_IF_EXPLICIT","OBSERVATIONS","PROMS","ADVERSE_EVENTS_IF_PRESENT","CAUSALITY_IF_EXPLICIT"],"pharmacy_validation":["PATIENTS","REQUESTS","VALIDATIONS","OBSERVATIONS","TREATMENTS_IF_VALIDATED_LINE_CREATED_OR_UPDATED","TREATMENT_LINES_IF_VALIDATED_LINE_CREATED_OR_UPDATED"]},"error_codes":["HEADER_MISMATCH","TECHNICAL_TABLE_MISMATCH","FORMULA_DETECTED","CELL_COERCED","INVALID_CANONICAL_CELL","INVALID_JSON_CELL","UNSUPPORTED_VERSION","SOURCE_EVENT_ID_MISSING","SOURCE_EVENT_ID_INVALID","MISSING_REQUIRED_ID","UNSUPPORTED_EVENT_TYPE","ROW_ROLE_EVENT_MISMATCH","INVALID_CARDINALITY","INCOMPLETE_ROW_SET","ROW_COUNT_MISMATCH","DUPLICATE_ROW_ID","DUPLICATE_LINE_ID","COMMON_FIELD_MISMATCH","SOURCE_EVENT_CONFLICT","EVENT_ID_CONFLICT","DUPLICATE_SOURCE_EVENT","STRUCTURED_ITEM_INVALID","ENTITY_KEY_CONFLICT","MOVEMENT_INCONSISTENT","WRITE_FAILED","ROLLBACK_FAILED","INTERNAL_ERROR"],"event_schema_version":"2.0.0-draft.1","input_column_count":152,"input_schema":"schemas/farmacia_export_row_v2.schema.json","input_tables":[{"sheet":"01_DERMA","table":"tblBridgeDermaInput"},{"sheet":"03_DIGESTIVO","table":"tblBridgeDigestivoInput"}],"json_projection":{"adherence_field":"adherence_answers_json","adverse_suspects_field":"adverse_event_suspects_json","causality_field":"causality_assessments_json","observation_fields":["validation_blockers_json","clinical_observations_json","related_treatments_json"],"proms_field":"proms_json","proms_measurements_path":"$.measurements","related_reference_fields":["treatment_ref","source_row_uid"]},"manifest_version":"1.0.0-draft.1","movement":{"detail_fields":["new_dose_text","new_schedule_code","new_schedule_label","new_schedule_other_text","new_route","movement_reason","movement_effective_date","suspension_reason","suspension_effective_date"],"ignored_types":["no_change_recorded","not_recorded"],"suspension_trigger":{"field":"suspension_status","value":"yes"},"type_field":"therapeutic_movement_type"},"processor_control_fields":["bridge_status","bridge_processed_at","bridge_error_code","bridge_error_detail"],"required_ids_by_event_type":{"pharmacy_first_visit":["event_id","source_event_id","row_id","patient_id","first_visit_id","treatment_id","line_id"],"pharmacy_followup":["event_id","source_event_id","row_id","patient_id","visit_id","treatment_id","line_id"],"pharmacy_validation":["event_id","source_event_id","row_id","patient_id","request_id","validation_id"]},"row_fields_by_event_type":{"pharmacy_first_visit":["row_id","row_role","row_index","row_count","treatment_id","line_id","line_role","is_primary_line","line_status_at_event","active_at_event","line_drug_name","line_active_ingredient","line_presentation","line_dose_text","line_route","line_schedule_code","line_schedule_label","line_schedule_other_text","line_selected_drug_id","line_catalog_source","line_national_code","line_registration_number"],"pharmacy_followup":["row_id","row_role","row_index","row_count","treatment_id","line_id","line_role","is_primary_line","line_status_at_event","active_at_event","line_drug_name","line_active_ingredient","line_presentation","line_dose_text","line_route","line_schedule_code","line_schedule_label","line_schedule_other_text","line_selected_drug_id","line_catalog_source","line_national_code","line_registration_number","dispensation_status","dispensation_observations","specific_review_status","specific_review_reason","therapeutic_movement_type","new_dose_text","new_schedule_code","new_schedule_label","new_schedule_other_text","new_route","movement_reason","movement_effective_date","suspension_status","suspension_reason","suspension_effective_date","line_observations","adherence_collection_status","adherence_instrument","adherence_result","adherence_answers_json"],"pharmacy_validation":["row_id","row_role","row_index","row_count"]},"row_identity_fields":["row_id","row_role","row_index","row_count"],"row_schema_version":"2.0.0-draft.1","stable_entities":{"PATIENTS":{"compatible_fields":["identifier_system","identifier_value","hospital_code","demo_flag"],"enrichment":"absence_to_explicit_only","key":["patient_id"]},"TREATMENTS":{"compatible_fields":["patient_id"],"key":["treatment_id"]},"TREATMENT_LINES":{"compatible_fields":["treatment_id","patient_id"],"key":["line_id"]}},"technical_tables":[{"headers":["patient_id","identifier_system","identifier_value","hospital_code","demo_flag","first_seen_event_id","first_seen_source_event_id","first_seen_source_table","first_seen_source_row_id","first_seen_processed_at"],"key":["patient_id"],"sheet":"PATIENTS","table":"tblBridgePatients"},{"headers":["request_id","patient_id","event_id","source_event_id","event_status","occurred_at","recorded_at","hospital_code","service_code","pathology_code","professional_ref","request_origin","request_date","validation_type","pharmacy_appointment_date","requested_drug_name","requested_active_ingredient","requested_presentation","requested_dose_text","requested_route","requested_schedule_code","requested_schedule_label","requested_schedule_other_text","requested_induction_status","requested_weight_text","requested_justification","request_source_observations","requested_selected_drug_id","requested_catalog_source","requested_national_code","requested_registration_number","demo_flag","source_table","source_row_id","processed_at"],"key":["request_id"],"sheet":"REQUESTS","table":"tblBridgeRequests"},{"headers":["validation_id","request_id","patient_id","event_id","source_event_id","event_status","occurred_at","recorded_at","hospital_code","service_code","pathology_code","professional_ref","validation_result","validation_pending_reason","validation_denial_reason","pharmacy_observations","other_validation_observations","validated_treatment_relation","validated_drug_name","validated_active_ingredient","validated_presentation","validated_dose_text","validated_route","validated_schedule_code","validated_schedule_label","validated_schedule_other_text","validated_induction_status","validated_selected_drug_id","validated_catalog_source","validated_national_code","validated_registration_number","validated_treatment_id","validated_line_id","line_creation_status","prebiologic_required","prebiologic_overall_status","analysis_date","analysis_recent_status","hemogram_verified","biochemistry_verified","tb_status","hbv_status","hcv_status","hiv_status","vaccination_status","vaccination_observations","preventive_medicine_status","recurrent_infections_status","cardiovascular_risk_status","neurologic_disorder_status","neoplasia_history_or_risk_status","demo_flag","source_table","source_row_id","processed_at"],"key":["validation_id"],"sheet":"VALIDATIONS","table":"tblBridgeValidations"},{"headers":["treatment_id","patient_id","first_seen_event_id","first_seen_source_event_id","first_seen_source_table","first_seen_source_row_id","first_seen_processed_at"],"key":["treatment_id"],"sheet":"TREATMENTS","table":"tblBridgeTreatments"},{"headers":["line_id","treatment_id","patient_id","first_seen_event_id","first_seen_source_event_id","first_seen_source_table","first_seen_source_row_id","first_seen_processed_at"],"key":["line_id"],"sheet":"TREATMENT_LINES","table":"tblBridgeTreatmentLines"},{"headers":["movement_key","event_id","source_event_id","source_row_id","patient_id","treatment_id","line_id","therapeutic_movement_type","new_dose_text","new_schedule_code","new_schedule_label","new_schedule_other_text","new_route","movement_reason","movement_effective_date","suspension_status","suspension_reason","suspension_effective_date","source_table","processed_at"],"key":["movement_key"],"sheet":"TREATMENT_MOVEMENTS","table":"tblBridgeTreatmentMovements"},{"headers":["visit_id","visit_type","patient_id","event_id","source_event_id","event_status","occurred_at","recorded_at","visit_date","hospital_code","service_code","service_label","pathology_code","pathology_label","professional_ref","professional_display","induction_performed_status","stratification_level","baseline_proms_collection_status","pharmacy_visit_notes","stratification_review_status","previous_stratification_level","new_stratification_level","stratification_change_reason","followup_proms_collection_status","visit_general_observations","demo_flag","source_table","source_row_id","processed_at"],"key":["visit_id"],"sheet":"VISITS","table":"tblBridgeVisits"},{"headers":["visit_id","visit_type","line_id","treatment_id","patient_id","event_id","source_event_id","source_row_id","line_role","is_primary_line","line_status_at_event","active_at_event","line_drug_name","line_active_ingredient","line_presentation","line_dose_text","line_route","line_schedule_code","line_schedule_label","line_schedule_other_text","line_selected_drug_id","line_catalog_source","line_national_code","line_registration_number","dispensation_status","dispensation_observations","specific_review_status","specific_review_reason","therapeutic_movement_type","new_dose_text","new_schedule_code","new_schedule_label","new_schedule_other_text","new_route","movement_reason","movement_effective_date","suspension_status","suspension_reason","suspension_effective_date","line_observations","adherence_collection_status","adherence_instrument","adherence_result","adherence_answers_json","source_table","processed_at"],"key":["visit_id","line_id"],"sheet":"VISIT_LINES","table":"tblBridgeVisitLines"},{"headers":["observation_key","event_id","source_event_id","patient_id","scope_type","scope_ref","source_field","source_json_path","explicit_scope","explicit_reference_field","explicit_reference","content_json","source_table","source_row_id","processed_at"],"key":["observation_key"],"sheet":"OBSERVATIONS","table":"tblBridgeObservations"},{"headers":["prom_key","event_id","source_event_id","patient_id","visit_id","visit_type","source_field","source_json_path","instrument_ref","content_json","source_table","source_row_id","processed_at"],"key":["prom_key"],"sheet":"PROMS","table":"tblBridgeProms"},{"headers":["adverse_event_id","event_id","source_event_id","patient_id","visit_id","status","description","severity","resolution_status","action","suspects_json","source_table","source_row_id","processed_at"],"key":["adverse_event_id"],"sheet":"ADVERSE_EVENTS","table":"tblBridgeAdverseEvents"},{"headers":["causality_key","adverse_event_id","event_id","source_event_id","patient_id","visit_id","suspect_ref","method","result","score","content_json","source_json_path","source_table","source_row_id","processed_at"],"key":["causality_key"],"sheet":"CAUSALITY","table":"tblBridgeCausality"},{"headers":["renewal_cycle_id","line_id","patient_id","event_id","source_event_id","status","confirmed_date","verified_date","estimated_date","source_table","source_row_id","processed_at"],"key":["renewal_cycle_id"],"populate":false,"sheet":"RENEWAL_CYCLES","table":"tblBridgeRenewalCycles"},{"headers":["renewal_task_id","renewal_cycle_id","line_id","patient_id","status","due_at","event_id","source_event_id","source_table","source_row_id","processed_at"],"key":["renewal_task_id"],"populate":false,"sheet":"RENEWAL_TASKS","table":"tblBridgeRenewalTasks"},{"headers":["audit_key","processed_at","outcome","source_table","source_physical_rows_json","event_id","source_event_id","row_count","row_ids_json","entity_counts_json","error_code","error_detail"],"key":["audit_key"],"sheet":"AUDIT_EVENTS","table":"tblBridgeAuditEvents"},{"headers":["error_key","occurred_at","source_table","source_physical_row","event_id","source_event_id","row_ids_json","error_code","error_detail","raw_preserved"],"key":["error_key"],"sheet":"IMPORT_ERRORS","table":"tblBridgeImportErrors"}]}`;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject { [key: string]: JsonValue; }
interface InputTableDefinition { sheet: string; table: string; }
interface TechnicalTableDefinition { sheet: string; table: string; key: string[]; headers: string[]; populate?: boolean; }
interface StableEntityDefinition { key: string[]; compatible_fields: string[]; enrichment?: string; }
interface Manifest {
  manifest_version: string;
  event_schema_version: string;
  row_schema_version: string;
  input_column_count: number;
  input_tables: InputTableDefinition[];
  processor_control_fields: string[];
  row_identity_fields: string[];
  stable_entities: { [key: string]: StableEntityDefinition };
  technical_tables: TechnicalTableDefinition[];
  common_fields_by_event_type: { [key: string]: string[] };
  row_fields_by_event_type: { [key: string]: string[] };
  required_ids_by_event_type: { [key: string]: string[] };
  entity_mapping_by_event_type: { [key: string]: string[] };
  json_projection: {
    observation_fields: string[];
    related_reference_fields: string[];
    proms_field: string;
    proms_measurements_path: string;
    adherence_field: string;
    adverse_suspects_field: string;
    causality_field: string;
  };
  movement: {
    type_field: string;
    ignored_types: string[];
    suspension_trigger: { field: string; value: string };
    detail_fields: string[];
  };
  error_codes: string[];
}
interface SourceRow {
  tableName: string;
  physicalRow: number;
  bodyRowIndex: number;
  table: ExcelScript.Table;
  raw: string[];
  decoded: JsonObject;
}
interface PlannedRecord { tableName: string; values: JsonObject; }
interface GroupPlan { records: PlannedRecord[]; counts: JsonObject; }
interface JournalEntry {
  kind: "append" | "placeholder" | "update" | "raw";
  table: ExcelScript.Table;
  rowIndex: number;
  previous: (string | number | boolean)[][];
  columnIndexes?: number[];
}
interface ProcessorSummary {
  manifestVersion: string;
  manifestSha256: string;
  processedActs: number;
  rejectedActs: number;
  rejectedRows: number;
  skippedRows: number;
}

class BridgeError extends Error {
  code: string;
  field: string;
  constructor(code: string, field: string) {
    super(code);
    this.name = "BridgeError";
    this.code = code;
    this.field = field;
  }
}

function own(value: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isObject(value: JsonValue | unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item));
  if (typeof value === "object") {
    return Object.keys(value as object).every((key) => isJsonValue((value as { [key: string]: unknown })[key]));
  }
  return false;
}

function stableStringify(value: JsonValue): string {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function encodeCanonical(value: JsonValue): string {
  if (value === null) return "";
  if (value === true) return "TRUE";
  if (value === false) return "FALSE";
  return stableStringify(value);
}

function decodeCanonical(text: string, field: string): JsonValue {
  if (text === "") return null;
  if (text === "TRUE") return true;
  if (text === "FALSE") return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (_error) {
    throw new BridgeError("INVALID_CANONICAL_CELL", field);
  }
  if (!isJsonValue(parsed) || parsed === null) throw new BridgeError("INVALID_CANONICAL_CELL", field);
  if (encodeCanonical(parsed) !== text) throw new BridgeError("INVALID_CANONICAL_CELL", field);
  return parsed;
}

function parseManifest(): Manifest {
  const parsed: unknown = JSON.parse(EMBEDDED_MANIFEST_JSON);
  if (!isObject(parsed) || parsed.manifest_version !== EMBEDDED_MANIFEST_VERSION) {
    throw new BridgeError("TECHNICAL_TABLE_MISMATCH", "manifest_version");
  }
  return parsed as unknown as Manifest;
}

function stringValue(row: JsonObject, field: string, required: boolean = false): string | null {
  const value = own(row, field) ? row[field] : null;
  if (value === null) {
    if (required) throw new BridgeError("MISSING_REQUIRED_ID", field);
    return null;
  }
  if (typeof value !== "string" || (required && value.length === 0)) {
    throw new BridgeError(required ? "MISSING_REQUIRED_ID" : "INVALID_CANONICAL_CELL", field);
  }
  return value;
}

function value(row: JsonObject, field: string): JsonValue {
  return own(row, field) ? row[field] : null;
}

function tableDefinition(manifest: Manifest, tableName: string): TechnicalTableDefinition {
  const definition = manifest.technical_tables.find((item) => item.table === tableName);
  if (!definition) throw new BridgeError("TECHNICAL_TABLE_MISMATCH", tableName);
  return definition;
}

function requireHeaders(table: ExcelScript.Table, expected: string[], code: string): void {
  const actual = table.getHeaderRowRange().getTexts()[0];
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw new BridgeError(code, table.getName());
  }
}

function formulaBodyRows(table: ExcelScript.Table): { [key: string]: boolean } {
  const rows: { [key: string]: boolean } = {};
  const body = table.getRangeBetweenHeaderAndTotal();
  let formulas: ExcelScript.RangeAreas | undefined;
  try {
    formulas = body.getSpecialCells(ExcelScript.SpecialCellType.formulas);
  } catch (_error) {
    formulas = undefined;
  }
  if (!formulas) return rows;
  formulas.getAreas().forEach((area) => {
    const first = area.getRowIndex() - body.getRowIndex();
    for (let offset = 0; offset < area.getRowCount(); offset += 1) rows[String(first + offset)] = true;
  });
  return rows;
}

function errorDetail(code: string, tableName: string, physicalRow: number, field: string): string {
  return `${code}|table=${tableName}|row=${physicalRow}|field=${field}`;
}

function recordFrom(definition: TechnicalTableDefinition, fields: JsonObject): JsonObject {
  const result: JsonObject = {};
  definition.headers.forEach((header) => { result[header] = own(fields, header) ? fields[header] : null; });
  return result;
}

function encodedRecord(definition: TechnicalTableDefinition, fields: JsonObject): string[] {
  return definition.headers.map((header) => encodeCanonical(own(fields, header) ? fields[header] : null));
}

function logicalRows(table: ExcelScript.Table): { rows: string[][]; placeholder: boolean } {
  const texts = table.getRangeBetweenHeaderAndTotal().getTexts();
  if (texts.length === 1 && texts[0].every((item) => item === "")) return { rows: [], placeholder: true };
  if (texts.some((row) => row.every((item) => item === ""))) throw new BridgeError("TECHNICAL_TABLE_MISMATCH", table.getName());
  return { rows: texts, placeholder: false };
}

function appendTechnical(table: ExcelScript.Table, encoded: string[], journal: JournalEntry[]): number {
  const state = logicalRows(table);
  if (state.placeholder) {
    const range = table.getRangeBetweenHeaderAndTotal().getCell(0, 0).getResizedRange(0, encoded.length - 1);
    range.setNumberFormat("@");
    journal.push({ kind: "placeholder", table, rowIndex: 0, previous: range.getValues() });
    range.setValues([encoded]);
    return 0;
  }
  const index = table.getRowCount();
  table.addRows(-1, [encoded]);
  journal.push({ kind: "append", table, rowIndex: index, previous: [] });
  table.getRangeBetweenHeaderAndTotal().getCell(index, 0).getResizedRange(0, encoded.length - 1).setNumberFormat("@");
  return index;
}

function updateTechnical(table: ExcelScript.Table, rowIndex: number, encoded: string[], journal: JournalEntry[]): void {
  const range = table.getRangeBetweenHeaderAndTotal().getCell(rowIndex, 0).getResizedRange(0, encoded.length - 1);
  journal.push({ kind: "update", table, rowIndex, previous: range.getValues() });
  range.setNumberFormat("@");
  range.setValues([encoded]);
}

function findExisting(table: ExcelScript.Table, definition: TechnicalTableDefinition, keyValues: JsonObject): { rowIndex: number; row: JsonObject } | null {
  const state = logicalRows(table);
  for (let rowIndex = 0; rowIndex < state.rows.length; rowIndex += 1) {
    const decoded: JsonObject = {};
    definition.headers.forEach((header, column) => { decoded[header] = decodeCanonical(state.rows[rowIndex][column], header); });
    const match = definition.key.every((field) => stableStringify(value(decoded, field)) === stableStringify(value(keyValues, field)));
    if (match) return { rowIndex, row: decoded };
  }
  return null;
}

function upsertStable(workbook: ExcelScript.Workbook, manifest: Manifest, record: PlannedRecord, journal: JournalEntry[]): boolean {
  const definition = tableDefinition(manifest, record.tableName);
  const table = workbook.getTable(record.tableName);
  const existing = findExisting(table, definition, record.values);
  if (!existing) {
    appendTechnical(table, encodedRecord(definition, record.values), journal);
    return true;
  }
  const stable = manifest.stable_entities[definition.sheet];
  let changed = false;
  stable.compatible_fields.forEach((field) => {
    const before = value(existing.row, field);
    const incoming = value(record.values, field);
    if (before === null && incoming !== null && stable.enrichment === "absence_to_explicit_only") {
      existing.row[field] = incoming;
      changed = true;
    } else if (incoming !== null && stableStringify(before) !== stableStringify(incoming)) {
      throw new BridgeError("ENTITY_KEY_CONFLICT", field);
    }
  });
  if (changed) updateTechnical(table, existing.rowIndex, encodedRecord(definition, existing.row), journal);
  return false;
}

function rollback(journal: JournalEntry[]): void {
  for (let index = journal.length - 1; index >= 0; index -= 1) {
    const entry = journal[index];
    if (entry.kind === "append") {
      entry.table.deleteRowsAt(entry.rowIndex, 1);
    } else if (entry.kind === "placeholder") {
      const width = entry.table.getHeaderRowRange().getColumnCount();
      const range = entry.table.getRangeBetweenHeaderAndTotal().getCell(0, 0).getResizedRange(0, width - 1);
      range.clear(ExcelScript.ClearApplyTo.contents);
      range.setNumberFormat("@");
    } else if (entry.kind === "update") {
      const width = entry.previous[0].length;
      entry.table.getRangeBetweenHeaderAndTotal().getCell(entry.rowIndex, 0).getResizedRange(0, width - 1).setValues(entry.previous);
    } else if (entry.kind === "raw" && entry.columnIndexes) {
      entry.columnIndexes.forEach((columnIndex, valueIndex) => {
        entry.table.getRangeBetweenHeaderAndTotal().getCell(entry.rowIndex, columnIndex).setValues([[entry.previous[0][valueIndex]]]);
      });
    }
  }
}

function setRawOutcome(row: SourceRow, status: string, processedAt: string, code: string | null, detail: string | null, journal?: JournalEntry[]): void {
  const columns = ["bridge_status", "bridge_processed_at", "bridge_error_code", "bridge_error_detail"];
  const headers = row.table.getHeaderRowRange().getTexts()[0];
  const indexes = columns.map((field) => headers.indexOf(field));
  const body = row.table.getRangeBetweenHeaderAndTotal();
  const previous = indexes.map((column) => body.getCell(row.bodyRowIndex, column).getValues()[0][0]);
  if (journal) journal.push({ kind: "raw", table: row.table, rowIndex: row.bodyRowIndex, previous: [previous], columnIndexes: indexes });
  const encoded = [status, processedAt, code, detail].map((item) => encodeCanonical(item));
  indexes.forEach((column, index) => {
    const cell = body.getCell(row.bodyRowIndex, column);
    cell.setNumberFormat("@");
    cell.setValues([[encoded[index]]]);
  });
}

function sourceFields(row: SourceRow, processedAt: string): JsonObject {
  return {
    source_table: row.tableName,
    source_row_id: value(row.decoded, "row_id"),
    processed_at: processedAt
  };
}

function firstSeen(row: SourceRow, processedAt: string): JsonObject {
  return {
    first_seen_event_id: value(row.decoded, "event_id"),
    first_seen_source_event_id: value(row.decoded, "source_event_id"),
    first_seen_source_table: row.tableName,
    first_seen_source_row_id: value(row.decoded, "row_id"),
    first_seen_processed_at: processedAt
  };
}

function mergeObjects(parts: JsonObject[]): JsonObject {
  const result: JsonObject = {};
  parts.forEach((part) => Object.keys(part).forEach((key) => { result[key] = part[key]; }));
  return result;
}

function pick(row: JsonObject, fields: string[]): JsonObject {
  const result: JsonObject = {};
  fields.forEach((field) => { result[field] = value(row, field); });
  return result;
}

function occurrences(input: JsonValue, measurementsPath: boolean): { path: string; content: JsonValue }[] {
  if (input === null) return [];
  if (Array.isArray(input)) return input.map((content, index) => ({ path: `$[${index}]`, content }));
  if (measurementsPath && isObject(input) && Array.isArray(input.measurements)) {
    return input.measurements.map((content, index) => ({ path: `$.measurements[${index}]`, content }));
  }
  return [{ path: "$", content: input }];
}

function addObservations(plan: GroupPlan, manifest: Manifest, row: SourceRow, processedAt: string): void {
  manifest.json_projection.observation_fields.forEach((field) => {
    occurrences(value(row.decoded, field), false).forEach((occurrence) => {
      let referenceField: JsonValue = null;
      let reference: JsonValue = null;
      let explicitScope: JsonValue = null;
      if (isObject(occurrence.content)) {
        if (typeof occurrence.content.scope === "string") explicitScope = occurrence.content.scope;
        for (const candidate of manifest.json_projection.related_reference_fields) {
          if (typeof occurrence.content[candidate] === "string" && occurrence.content[candidate] !== "") {
            referenceField = candidate;
            reference = occurrence.content[candidate];
            break;
          }
        }
      }
      const key = `${stringValue(row.decoded, "source_event_id", true)}|${field}|${occurrence.path}`;
      plan.records.push({ tableName: "tblBridgeObservations", values: mergeObjects([{
        observation_key: key,
        event_id: value(row.decoded, "event_id"),
        source_event_id: value(row.decoded, "source_event_id"),
        patient_id: value(row.decoded, "patient_id"),
        scope_type: "event",
        scope_ref: value(row.decoded, "event_id"),
        source_field: field,
        source_json_path: occurrence.path,
        explicit_scope: explicitScope,
        explicit_reference_field: referenceField,
        explicit_reference: reference,
        content_json: occurrence.content
      }, sourceFields(row, processedAt)]) });
    });
  });
}

function addProms(plan: GroupPlan, manifest: Manifest, row: SourceRow, visitId: string, visitType: string, processedAt: string): void {
  occurrences(value(row.decoded, manifest.json_projection.proms_field), true).forEach((occurrence) => {
    const instrument = isObject(occurrence.content) && typeof occurrence.content.instrument === "string" ? occurrence.content.instrument : null;
    const key = `${stringValue(row.decoded, "source_event_id", true)}|proms_json|${occurrence.path}`;
    plan.records.push({ tableName: "tblBridgeProms", values: mergeObjects([{
      prom_key: key,
      event_id: value(row.decoded, "event_id"),
      source_event_id: value(row.decoded, "source_event_id"),
      patient_id: value(row.decoded, "patient_id"),
      visit_id: visitId,
      visit_type: visitType,
      source_field: "proms_json",
      source_json_path: occurrence.path,
      instrument_ref: instrument,
      content_json: occurrence.content
    }, sourceFields(row, processedAt)]) });
  });
}

function stableIdentityRecords(row: SourceRow, processedAt: string): PlannedRecord[] {
  return [
    { tableName: "tblBridgeTreatments", values: mergeObjects([{ treatment_id: value(row.decoded, "treatment_id"), patient_id: value(row.decoded, "patient_id") }, firstSeen(row, processedAt)]) },
    { tableName: "tblBridgeTreatmentLines", values: mergeObjects([{ line_id: value(row.decoded, "line_id"), treatment_id: value(row.decoded, "treatment_id"), patient_id: value(row.decoded, "patient_id") }, firstSeen(row, processedAt)]) }
  ];
}

function buildPlan(manifest: Manifest, rows: SourceRow[], processedAt: string): GroupPlan {
  const first = rows[0];
  const eventType = stringValue(first.decoded, "event_type", true) as string;
  const plan: GroupPlan = { records: [], counts: {} };
  plan.records.push({ tableName: "tblBridgePatients", values: mergeObjects([pick(first.decoded, ["patient_id", "identifier_system", "identifier_value", "hospital_code", "demo_flag"]), firstSeen(first, processedAt)]) });

  addObservations(plan, manifest, first, processedAt);
  if (eventType === "pharmacy_validation") {
    const requestFields = tableDefinition(manifest, "tblBridgeRequests").headers.filter((field) => !["source_table", "source_row_id", "processed_at"].includes(field));
    const validationFields = tableDefinition(manifest, "tblBridgeValidations").headers.filter((field) => !["source_table", "source_row_id", "processed_at"].includes(field));
    plan.records.push({ tableName: "tblBridgeRequests", values: mergeObjects([pick(first.decoded, requestFields), sourceFields(first, processedAt)]) });
    plan.records.push({ tableName: "tblBridgeValidations", values: mergeObjects([pick(first.decoded, validationFields), sourceFields(first, processedAt)]) });
    const creation = stringValue(first.decoded, "line_creation_status");
    if (creation === "created" || creation === "updated") {
      const treatmentId = stringValue(first.decoded, "validated_treatment_id", true) as string;
      const lineId = stringValue(first.decoded, "validated_line_id", true) as string;
      plan.records.push({ tableName: "tblBridgeTreatments", values: mergeObjects([{ treatment_id: treatmentId, patient_id: value(first.decoded, "patient_id") }, firstSeen(first, processedAt)]) });
      plan.records.push({ tableName: "tblBridgeTreatmentLines", values: mergeObjects([{ line_id: lineId, treatment_id: treatmentId, patient_id: value(first.decoded, "patient_id") }, firstSeen(first, processedAt)]) });
    }
  } else if (eventType === "pharmacy_first_visit") {
    const visitId = stringValue(first.decoded, "first_visit_id", true) as string;
    const visitFields = pick(first.decoded, ["patient_id", "event_id", "source_event_id", "event_status", "occurred_at", "recorded_at", "hospital_code", "service_code", "service_label", "pathology_code", "pathology_label", "professional_ref", "professional_display", "induction_performed_status", "stratification_level", "baseline_proms_collection_status", "pharmacy_visit_notes", "demo_flag"]);
    plan.records.push({ tableName: "tblBridgeVisits", values: mergeObjects([{ visit_id: visitId, visit_type: "first_visit", visit_date: value(first.decoded, "first_visit_date") }, visitFields, sourceFields(first, processedAt)]) });
    addProms(plan, manifest, first, visitId, "first_visit", processedAt);
    rows.forEach((row) => {
      stableIdentityRecords(row, processedAt).forEach((record) => plan.records.push(record));
      const lineFields = tableDefinition(manifest, "tblBridgeVisitLines").headers.filter((field) => !["visit_id", "visit_type", "source_table", "processed_at"].includes(field));
      plan.records.push({ tableName: "tblBridgeVisitLines", values: mergeObjects([{ visit_id: visitId, visit_type: "first_visit" }, pick(row.decoded, lineFields), sourceFields(row, processedAt)]) });
    });
  } else if (eventType === "pharmacy_followup") {
    const visitId = stringValue(first.decoded, "visit_id", true) as string;
    const visitFields = tableDefinition(manifest, "tblBridgeVisits").headers.filter((field) => !["visit_id", "visit_type", "source_table", "source_row_id", "processed_at"].includes(field));
    plan.records.push({ tableName: "tblBridgeVisits", values: mergeObjects([{ visit_id: visitId, visit_type: "followup" }, pick(first.decoded, visitFields), sourceFields(first, processedAt)]) });
    addProms(plan, manifest, first, visitId, "followup", processedAt);
    rows.forEach((row) => {
      stableIdentityRecords(row, processedAt).forEach((record) => plan.records.push(record));
      const lineFields = tableDefinition(manifest, "tblBridgeVisitLines").headers.filter((field) => !["visit_id", "visit_type", "source_table", "processed_at"].includes(field));
      plan.records.push({ tableName: "tblBridgeVisitLines", values: mergeObjects([{ visit_id: visitId, visit_type: "followup" }, pick(row.decoded, lineFields), sourceFields(row, processedAt)]) });
      const movementType = stringValue(row.decoded, manifest.movement.type_field);
      const suspension = stringValue(row.decoded, manifest.movement.suspension_trigger.field);
      const movementTriggered = movementType !== null && !manifest.movement.ignored_types.includes(movementType);
      const suspensionTriggered = suspension === manifest.movement.suspension_trigger.value;
      const hasDetails = manifest.movement.detail_fields.some((field) => value(row.decoded, field) !== null);
      if (hasDetails && !movementTriggered && !suspensionTriggered) throw new BridgeError("MOVEMENT_INCONSISTENT", manifest.movement.type_field);
      if (movementTriggered || suspensionTriggered) {
        const movementFields = tableDefinition(manifest, "tblBridgeTreatmentMovements").headers.filter((field) => !["movement_key", "source_table", "processed_at"].includes(field));
        plan.records.push({ tableName: "tblBridgeTreatmentMovements", values: mergeObjects([{ movement_key: value(row.decoded, "row_id") }, pick(row.decoded, movementFields), sourceFields(row, processedAt)]) });
      }
    });
    if (stringValue(first.decoded, "adverse_event_status") === "present") {
      const adverseId = stringValue(first.decoded, "adverse_event_id", true) as string;
      plan.records.push({ tableName: "tblBridgeAdverseEvents", values: mergeObjects([{
        adverse_event_id: adverseId,
        event_id: value(first.decoded, "event_id"),
        source_event_id: value(first.decoded, "source_event_id"),
        patient_id: value(first.decoded, "patient_id"),
        visit_id: visitId,
        status: value(first.decoded, "adverse_event_status"),
        description: value(first.decoded, "adverse_event_description"),
        severity: value(first.decoded, "adverse_event_severity"),
        resolution_status: value(first.decoded, "adverse_event_resolution_status"),
        action: value(first.decoded, "adverse_event_action"),
        suspects_json: value(first.decoded, manifest.json_projection.adverse_suspects_field)
      }, sourceFields(first, processedAt)]) });
      occurrences(value(first.decoded, manifest.json_projection.causality_field), false).forEach((occurrence) => {
        if (!isObject(occurrence.content) || typeof occurrence.content.suspect_ref !== "string" || occurrence.content.suspect_ref === "") {
          throw new BridgeError("STRUCTURED_ITEM_INVALID", manifest.json_projection.causality_field);
        }
        const key = `${stringValue(first.decoded, "source_event_id", true)}|${adverseId}|${occurrence.path}`;
        plan.records.push({ tableName: "tblBridgeCausality", values: mergeObjects([{
          causality_key: key,
          adverse_event_id: adverseId,
          event_id: value(first.decoded, "event_id"),
          source_event_id: value(first.decoded, "source_event_id"),
          patient_id: value(first.decoded, "patient_id"),
          visit_id: visitId,
          suspect_ref: occurrence.content.suspect_ref,
          method: own(occurrence.content, "method") ? occurrence.content.method : null,
          result: own(occurrence.content, "result") ? occurrence.content.result : null,
          score: own(occurrence.content, "score") ? occurrence.content.score : null,
          content_json: occurrence.content,
          source_json_path: occurrence.path
        }, sourceFields(first, processedAt)]) });
      });
    }
  } else {
    throw new BridgeError("UNSUPPORTED_EVENT_TYPE", "event_type");
  }
  plan.records.forEach((record) => { plan.counts[record.tableName] = Number(plan.counts[record.tableName] || 0) + 1; });
  return plan;
}

function validateGroup(manifest: Manifest, rows: SourceRow[]): SourceRow[] {
  const first = rows[0];
  const eventType = stringValue(first.decoded, "event_type", true) as string;
  if (!manifest.required_ids_by_event_type[eventType]) throw new BridgeError("UNSUPPORTED_EVENT_TYPE", "event_type");
  const expectedRole: { [key: string]: string } = {
    pharmacy_validation: "validation",
    pharmacy_first_visit: "first_visit_line",
    pharmacy_followup: "followup_line"
  };
  const common = manifest.common_fields_by_event_type[eventType];
  const expectedCount = value(first.decoded, "row_count");
  if (typeof expectedCount !== "number" || !Number.isInteger(expectedCount) || expectedCount < 1) throw new BridgeError("INVALID_CARDINALITY", "row_count");
  if (eventType === "pharmacy_validation" && expectedCount !== 1) throw new BridgeError("INVALID_CARDINALITY", "row_count");
  if (rows.length !== expectedCount) throw new BridgeError("INCOMPLETE_ROW_SET", "row_count");
  const sorted = rows.slice().sort((left, right) => Number(value(left.decoded, "row_index")) - Number(value(right.decoded, "row_index")));
  const rowIds: { [key: string]: boolean } = {};
  const lineIds: { [key: string]: boolean } = {};
  sorted.forEach((row, index) => {
    if (value(row.decoded, "row_count") !== expectedCount) throw new BridgeError("ROW_COUNT_MISMATCH", "row_count");
    if (value(row.decoded, "row_index") !== index + 1) throw new BridgeError("INCOMPLETE_ROW_SET", "row_index");
    if (stringValue(row.decoded, "row_role", true) !== expectedRole[eventType]) throw new BridgeError("ROW_ROLE_EVENT_MISMATCH", "row_role");
    manifest.required_ids_by_event_type[eventType].forEach((field) => stringValue(row.decoded, field, true));
    const rowId = stringValue(row.decoded, "row_id", true) as string;
    if (rowIds[rowId]) throw new BridgeError("DUPLICATE_ROW_ID", "row_id");
    rowIds[rowId] = true;
    if (eventType !== "pharmacy_validation") {
      const lineId = stringValue(row.decoded, "line_id", true) as string;
      if (lineIds[lineId]) throw new BridgeError("DUPLICATE_LINE_ID", "line_id");
      lineIds[lineId] = true;
    }
    common.forEach((field) => {
      if (encodeCanonical(value(row.decoded, field)) !== encodeCanonical(value(first.decoded, field))) throw new BridgeError("COMMON_FIELD_MISMATCH", field);
    });
  });
  if (stringValue(first.decoded, "event_schema_version", true) !== manifest.event_schema_version || stringValue(first.decoded, "row_schema_version", true) !== manifest.row_schema_version) {
    throw new BridgeError("UNSUPPORTED_VERSION", "event_schema_version");
  }
  return sorted;
}

function auditExists(workbook: ExcelScript.Workbook, manifest: Manifest, sourceEventId: string): boolean {
  const definition = tableDefinition(manifest, "tblBridgeAuditEvents");
  const table = workbook.getTable(definition.table);
  const state = logicalRows(table);
  const sourceColumn = definition.headers.indexOf("source_event_id");
  const outcomeColumn = definition.headers.indexOf("outcome");
  return state.rows.some((row) => decodeCanonical(row[sourceColumn], "source_event_id") === sourceEventId && decodeCanonical(row[outcomeColumn], "outcome") === "PROCESADA");
}

function addAudit(workbook: ExcelScript.Workbook, manifest: Manifest, fields: JsonObject, journal?: JournalEntry[]): void {
  const definition = tableDefinition(manifest, "tblBridgeAuditEvents");
  appendTechnical(workbook.getTable(definition.table), encodedRecord(definition, recordFrom(definition, fields)), journal || []);
}

function addImportError(workbook: ExcelScript.Workbook, manifest: Manifest, fields: JsonObject, journal: JournalEntry[]): void {
  const definition = tableDefinition(manifest, "tblBridgeImportErrors");
  appendTechnical(workbook.getTable(definition.table), encodedRecord(definition, recordFrom(definition, fields)), journal);
}

function rejectRows(workbook: ExcelScript.Workbook, manifest: Manifest, rows: SourceRow[], processedAt: string, error: BridgeError): void {
  const journal: JournalEntry[] = [];
  try {
    rows.forEach((row) => {
      const detail = errorDetail(error.code, row.tableName, row.physicalRow, error.field);
      setRawOutcome(row, "ERROR", processedAt, error.code, detail, journal);
      const sourceEvent = typeof value(row.decoded, "source_event_id") === "string" ? value(row.decoded, "source_event_id") : null;
      const eventId = typeof value(row.decoded, "event_id") === "string" ? value(row.decoded, "event_id") : null;
      const rowId = typeof value(row.decoded, "row_id") === "string" ? [value(row.decoded, "row_id")] : [];
      const technicalKey = `${row.tableName}|${row.physicalRow}|${error.code}|${processedAt}`;
      addImportError(workbook, manifest, {
        error_key: technicalKey,
        occurred_at: processedAt,
        source_table: row.tableName,
        source_physical_row: row.physicalRow,
        event_id: eventId,
        source_event_id: sourceEvent,
        row_ids_json: rowId,
        error_code: error.code,
        error_detail: detail,
        raw_preserved: true
      }, journal);
      addAudit(workbook, manifest, {
        audit_key: technicalKey,
        processed_at: processedAt,
        outcome: "ERROR",
        source_table: row.tableName,
        source_physical_rows_json: [row.physicalRow],
        event_id: eventId,
        source_event_id: sourceEvent,
        row_count: 1,
        row_ids_json: rowId,
        entity_counts_json: {},
        error_code: error.code,
        error_detail: detail
      }, journal);
    });
  } catch (caught) {
    try {
      rollback(journal);
    } catch (_rollbackError) {
      throw new BridgeError("ROLLBACK_FAILED", "journal");
    }
    throw caught;
  }
}

function readCandidates(workbook: ExcelScript.Workbook, manifest: Manifest, processedAt: string, summary: ProcessorSummary): SourceRow[] {
  const inputColumns = workbook.getTable(manifest.input_tables[0].table).getHeaderRowRange().getTexts()[0];
  if (inputColumns.length !== manifest.input_column_count) throw new BridgeError("HEADER_MISMATCH", manifest.input_tables[0].table);
  const candidates: SourceRow[] = [];
  manifest.input_tables.forEach((input) => {
    const table = workbook.getTable(input.table);
    requireHeaders(table, inputColumns, "HEADER_MISMATCH");
    const body = table.getRangeBetweenHeaderAndTotal();
    const texts = body.getTexts();
    const values = body.getValues();
    const formulaRows = formulaBodyRows(table);
    const statusColumn = inputColumns.indexOf("bridge_status");
    texts.forEach((raw, rowIndex) => {
      if (raw.every((item) => item === "")) { summary.skippedRows += 1; return; }
      let status: JsonValue;
      try {
        if (formulaRows[String(rowIndex)]) throw new BridgeError("FORMULA_DETECTED", "source_event_id");
        if (values[rowIndex].some((item, column) => item !== "" && typeof item !== "string" && raw[column] !== "")) throw new BridgeError("CELL_COERCED", "source_event_id");
        status = decodeCanonical(raw[statusColumn], "bridge_status");
      } catch (caught) {
        const error = caught instanceof BridgeError ? caught : new BridgeError("INTERNAL_ERROR", "bridge_status");
        const defective: SourceRow = { tableName: input.table, physicalRow: rowIndex + 2, bodyRowIndex: rowIndex, table, raw, decoded: {} };
        rejectRows(workbook, manifest, [defective], processedAt, error);
        summary.rejectedRows += 1;
        return;
      }
      if (status !== "PENDIENTE") { summary.skippedRows += 1; return; }
      const decoded: JsonObject = {};
      try {
        raw.forEach((text, column) => { decoded[inputColumns[column]] = decodeCanonical(text, inputColumns[column]); });
        stringValue(decoded, "source_event_id", true);
      } catch (caught) {
        const error = caught instanceof BridgeError ? caught : new BridgeError("SOURCE_EVENT_ID_INVALID", "source_event_id");
        const defective: SourceRow = { tableName: input.table, physicalRow: rowIndex + 2, bodyRowIndex: rowIndex, table, raw, decoded };
        rejectRows(workbook, manifest, [defective], processedAt, error.code === "MISSING_REQUIRED_ID" ? new BridgeError("SOURCE_EVENT_ID_MISSING", "source_event_id") : error);
        summary.rejectedRows += 1;
        return;
      }
      candidates.push({ tableName: input.table, physicalRow: rowIndex + 2, bodyRowIndex: rowIndex, table, raw, decoded });
    });
  });
  return candidates;
}

function processGroup(workbook: ExcelScript.Workbook, manifest: Manifest, rows: SourceRow[], processedAt: string): void {
  const journal: JournalEntry[] = [];
  const sorted = validateGroup(manifest, rows);
  const sourceEventId = stringValue(sorted[0].decoded, "source_event_id", true) as string;
  if (auditExists(workbook, manifest, sourceEventId)) throw new BridgeError("DUPLICATE_SOURCE_EVENT", "source_event_id");
  const plan = buildPlan(manifest, sorted, processedAt);
  try {
    plan.records.forEach((record) => {
      if (["tblBridgePatients", "tblBridgeTreatments", "tblBridgeTreatmentLines"].includes(record.tableName)) {
        upsertStable(workbook, manifest, record, journal);
      } else {
        const definition = tableDefinition(manifest, record.tableName);
        const table = workbook.getTable(record.tableName);
        const existing = findExisting(table, definition, record.values);
        if (existing) throw new BridgeError("ENTITY_KEY_CONFLICT", definition.key.join("+"));
        appendTechnical(table, encodedRecord(definition, recordFrom(definition, record.values)), journal);
      }
    });
    const first = sorted[0];
    addAudit(workbook, manifest, {
      audit_key: `${sourceEventId}|PROCESADA|${processedAt}`,
      processed_at: processedAt,
      outcome: "PROCESADA",
      source_table: first.tableName,
      source_physical_rows_json: sorted.map((row) => row.physicalRow),
      event_id: value(first.decoded, "event_id"),
      source_event_id: sourceEventId,
      row_count: sorted.length,
      row_ids_json: sorted.map((row) => value(row.decoded, "row_id")),
      entity_counts_json: plan.counts,
      error_code: null,
      error_detail: null
    }, journal);
    sorted.forEach((row) => setRawOutcome(row, "PROCESADA", processedAt, null, null, journal));
  } catch (caught) {
    try {
      rollback(journal);
    } catch (_rollbackError) {
      throw new BridgeError("ROLLBACK_FAILED", "journal");
    }
    throw caught;
  }
}

function validateTechnicalTables(workbook: ExcelScript.Workbook, manifest: Manifest): void {
  manifest.technical_tables.forEach((definition) => {
    const table = workbook.getTable(definition.table);
    if (table.getWorksheet().getName() !== definition.sheet) throw new BridgeError("TECHNICAL_TABLE_MISMATCH", definition.table);
    requireHeaders(table, definition.headers, "TECHNICAL_TABLE_MISMATCH");
    logicalRows(table);
  });
}

function main(workbook: ExcelScript.Workbook): ProcessorSummary {
  const manifest = parseManifest();
  validateTechnicalTables(workbook, manifest);
  const processedAt = new Date().toISOString();
  const summary: ProcessorSummary = {
    manifestVersion: EMBEDDED_MANIFEST_VERSION,
    manifestSha256: EMBEDDED_MANIFEST_SHA256,
    processedActs: 0,
    rejectedActs: 0,
    rejectedRows: 0,
    skippedRows: 0
  };
  const candidates = readCandidates(workbook, manifest, processedAt, summary);
  const grouped: { [key: string]: SourceRow[] } = {};
  candidates.forEach((row) => {
    const sourceEventId = stringValue(row.decoded, "source_event_id", true) as string;
    if (!grouped[sourceEventId]) grouped[sourceEventId] = [];
    grouped[sourceEventId].push(row);
  });
  Object.keys(grouped).forEach((sourceEventId) => {
    const rows = grouped[sourceEventId];
    try {
      if (new Set(rows.map((row) => row.tableName)).size !== 1) throw new BridgeError("SOURCE_EVENT_CONFLICT", "source_event_id");
      processGroup(workbook, manifest, rows, processedAt);
      summary.processedActs += 1;
    } catch (caught) {
      const error = caught instanceof BridgeError ? caught : new BridgeError("INTERNAL_ERROR", "processor");
      if (error.code === "ROLLBACK_FAILED") throw error;
      rejectRows(workbook, manifest, rows, processedAt, error);
      summary.rejectedActs += 1;
    }
  });
  return summary;
}
