#!/usr/bin/env python3
"""Validate the Excel Bridge manifest and execute the Office Script against a fake workbook."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import tempfile
from copy import deepcopy
from pathlib import Path

import farmacia_excel_bridge_workbook_check as workbook_check
import generate_farmacia_excel_bridge_workbook as generator


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "schemas" / "farmacia_excel_bridge_relational_v1.json"
SCRIPT_PATH = ROOT / "office-scripts" / "farmacia_excel_bridge_processor.ts"


class CheckFailure(AssertionError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise CheckFailure(message)


def canonical_manifest(manifest: dict) -> str:
    return json.dumps(manifest, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def extract_embedded(source: str) -> tuple[str, str, str]:
    version = re.search(r'const EMBEDDED_MANIFEST_VERSION = "([^"]+)";', source)
    digest = re.search(r'const EMBEDDED_MANIFEST_SHA256 = "([0-9a-f]{64})";', source)
    payload = re.search(r"const EMBEDDED_MANIFEST_JSON = `(.+?)`;", source, re.DOTALL)
    require(bool(version and digest and payload), "Office Script embedded manifest block is incomplete")
    return version.group(1), digest.group(1), payload.group(1)


def validate_manifest(manifest: dict) -> None:
    require(manifest["manifest_version"] == "1.0.0-draft.1", "unexpected manifest version")
    require(manifest["event_schema_version"] == "2.0.0-draft.1", "unexpected event version")
    require(manifest["row_schema_version"] == "2.0.0-draft.1", "unexpected row version")
    require(manifest["input_column_count"] == 152, "manifest input column count differs")
    require(manifest["input_tables"] == [{"sheet": name, "table": table} for name, table in generator.OPERATIONAL_SHEETS], "input tables differ")
    require(len(manifest["technical_tables"]) == 16, "manifest must define 16 technical tables")
    require([item["sheet"] for item in manifest["technical_tables"]] == list(generator.TECHNICAL_SHEETS), "technical sheet order differs")
    for definition in manifest["technical_tables"]:
        require(definition["headers"] and len(definition["headers"]) == len(set(definition["headers"])), f"invalid headers in {definition['sheet']}")
        require(all(field in definition["headers"] for field in definition["key"]), f"invalid key in {definition['sheet']}")
    require(manifest["movement"]["type_field"] == "therapeutic_movement_type", "movement field alias introduced")
    require("movement_type" not in manifest["technical_tables"][5]["headers"], "movement_type alias found")
    require(set(manifest["common_fields_by_event_type"]) == {"pharmacy_validation", "pharmacy_first_visit", "pharmacy_followup"}, "common fields incomplete")
    require(set(manifest["row_fields_by_event_type"]) == set(manifest["common_fields_by_event_type"]), "row fields incomplete")
    require(set(manifest["required_ids_by_event_type"]) == set(manifest["common_fields_by_event_type"]), "required IDs incomplete")
    require(set(manifest["entity_mapping_by_event_type"]) == set(manifest["common_fields_by_event_type"]), "entity mappings incomplete")
    forbidden_errors = {"SOURCE_TABLE_SERVICE_MISMATCH", "WORKBOOK_HOSPITAL_MISMATCH"}
    require(not forbidden_errors.intersection(manifest["error_codes"]), "forbidden hospital/service error code found")
    require(manifest["technical_tables"][12].get("populate") is False, "renewal cycles must remain unpopulated")
    require(manifest["technical_tables"][13].get("populate") is False, "renewal tasks must remain unpopulated")


def office_declarations() -> str:
    return r"""
declare namespace ExcelScript {
  enum SpecialCellType { formulas }
  enum ClearApplyTo { contents }
  interface Workbook { getTable(name: string): Table; }
  interface Worksheet { getName(): string; }
  interface Table {
    getName(): string;
    getWorksheet(): Worksheet;
    getHeaderRowRange(): Range;
    getRangeBetweenHeaderAndTotal(): Range;
    getRowCount(): number;
    addRows(index?: number, values?: (string | number | boolean)[][]): void;
    deleteRowsAt(index: number, count?: number): void;
  }
  interface RangeAreas { getAreas(): Range[]; }
  interface Range {
    getTexts(): string[][];
    getValues(): (string | number | boolean)[][];
    setValues(values: (string | number | boolean)[][]): void;
    setNumberFormat(value: string): void;
    getSpecialCells(type: SpecialCellType): RangeAreas | undefined;
    getCell(row: number, column: number): Range;
    getResizedRange(deltaRows: number, deltaColumns: number): Range;
    getRowIndex(): number;
    getRowCount(): number;
    getColumnCount(): number;
    clear(applyTo?: ClearApplyTo): void;
  }
}
"""


def compile_script(temp_dir: Path) -> Path:
    declarations = temp_dir / "office-script.d.ts"
    declarations.write_text(office_declarations(), encoding="utf-8")
    output = temp_dir / "processor.js"
    command = [
        "npx", "--yes", "--package=typescript@4.0.3", "tsc",
        "--target", "ES2019", "--module", "none", "--lib", "ES2019",
        "--strict", "--noImplicitAny", "--skipLibCheck", "--outFile", str(output),
        str(declarations), str(SCRIPT_PATH),
    ]
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, encoding="utf-8")
    require(result.returncode == 0, f"TypeScript 4.0.3 compile failed:\n{result.stdout}{result.stderr}")
    return output


def fake_runner_source() -> str:
    return r"""
const fs = require('fs');
const vm = require('vm');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const processorSource = fs.readFileSync(process.argv[3], 'utf8');

class FakeWorksheet { constructor(name) { this.name = name; } getName() { return this.name; } }
class FakeRangeAreas { constructor(areas) { this.areas = areas; } getAreas() { return this.areas; } }
class FakeRange {
  constructor(table, row, column, rows, columns, header = false) {
    this.table = table; this.row = row; this.column = column; this.rows = rows; this.columns = columns; this.header = header;
  }
  matrix() {
    if (this.header) return [this.table.headers.slice(this.column, this.column + this.columns)];
    return Array.from({ length: this.rows }, (_, r) => Array.from({ length: this.columns }, (_, c) => this.table.rows[this.row + r][this.column + c]));
  }
  getTexts() { return this.matrix().map(row => row.map(value => value === null || value === undefined ? '' : String(value))); }
  getValues() { return this.matrix(); }
  setValues(values) { values.forEach((valuesRow, r) => valuesRow.forEach((value, c) => { this.table.rows[this.row + r][this.column + c] = value; })); }
  setNumberFormat(_value) {}
  getSpecialCells(_type) {
    const affected = Object.keys(this.table.formulaRows).filter(key => this.table.formulaRows[key]).map(key => new FakeRange(this.table, Number(key), 0, 1, this.table.headers.length));
    return affected.length ? new FakeRangeAreas(affected) : undefined;
  }
  getCell(row, column) { return new FakeRange(this.table, this.row + row, this.column + column, 1, 1); }
  getResizedRange(deltaRows, deltaColumns) { return new FakeRange(this.table, this.row, this.column, this.rows + deltaRows, this.columns + deltaColumns); }
  getRowIndex() { return this.row + 1; }
  getRowCount() { return this.rows; }
  getColumnCount() { return this.columns; }
  clear(_applyTo) { for (let r = 0; r < this.rows; r += 1) for (let c = 0; c < this.columns; c += 1) this.table.rows[this.row + r][this.column + c] = ''; }
}
class FakeTable {
  constructor(definition) {
    this.name = definition.table; this.sheet = new FakeWorksheet(definition.sheet); this.headers = definition.headers;
    this.rows = definition.rows.length ? definition.rows : [Array(this.headers.length).fill('')];
    this.formulaRows = definition.formulaRows || {};
  }
  getName() { return this.name; }
  getWorksheet() { return this.sheet; }
  getHeaderRowRange() { return new FakeRange(this, 0, 0, 1, this.headers.length, true); }
  getRangeBetweenHeaderAndTotal() { return new FakeRange(this, 0, 0, this.rows.length, this.headers.length); }
  getRowCount() { return this.rows.length; }
  addRows(_index, values) { values.forEach(row => this.rows.push(row.slice())); }
  deleteRowsAt(index, count = 1) { this.rows.splice(index, count); if (!this.rows.length) this.rows.push(Array(this.headers.length).fill('')); }
}
class FakeWorkbook {
  constructor(definitions) { this.tables = {}; definitions.forEach(definition => { this.tables[definition.table] = new FakeTable(definition); }); }
  getTable(name) { if (!this.tables[name]) throw new Error(`missing table ${name}`); return this.tables[name]; }
}

const sandbox = {
  ExcelScript: { SpecialCellType: { formulas: 'formulas' }, ClearApplyTo: { contents: 'contents' } },
  Date, JSON, Object, Array, String, Number, Boolean, Error, Set, Map, Math
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(processorSource, sandbox, { filename: 'farmacia_excel_bridge_processor.js' });
const workbook = new FakeWorkbook(spec.tables);
let first;
let second;
let thrown = null;
try {
  first = sandbox.main(workbook);
  second = sandbox.main(workbook);
} catch (error) {
  thrown = { name: error.name, message: error.message, code: error.code || null, field: error.field || null };
}
const output = { first, second, thrown, tables: {} };
Object.keys(workbook.tables).forEach(name => { output.tables[name] = workbook.tables[name].rows; });
process.stdout.write(JSON.stringify(output));
"""


def make_fake_spec(manifest: dict, core_truth: dict, mutation: str | None = None) -> dict:
    columns = core_truth["columns"]
    tables = []
    for input_definition in manifest["input_tables"]:
        rows = [line.split("\t") for line in core_truth["services"][input_definition["sheet"]]["tsv"].split("\n")]
        formula_rows: dict[str, bool] = {}
        tables.append({"sheet": input_definition["sheet"], "table": input_definition["table"], "headers": columns, "rows": rows, "formulaRows": formula_rows})
    for definition in manifest["technical_tables"]:
        tables.append({"sheet": definition["sheet"], "table": definition["table"], "headers": definition["headers"], "rows": [], "formulaRows": {}})
    by_name = {table["table"]: table for table in tables}
    derma = by_name["tblBridgeDermaInput"]
    digestivo = by_name["tblBridgeDigestivoInput"]
    index = {name: columns.index(name) for name in columns}
    if mutation == "source_conflict":
        digestivo["rows"][0][index["source_event_id"]] = derma["rows"][0][index["source_event_id"]]
    elif mutation == "movement_inconsistent":
        derma["rows"][3][index["therapeutic_movement_type"]] = '"not_recorded"'
        derma["rows"][3][index["new_schedule_label"]] = '"Detalle sin trigger"'
    elif mutation == "missing_source":
        derma["rows"][0][index["source_event_id"]] = ""
    elif mutation == "coercion":
        derma["rows"][0][index["source_event_id"]] = 42
    elif mutation == "formula":
        derma["formulaRows"] = {"0": True}
    elif mutation == "suspension_trigger":
        derma["rows"][3][index["therapeutic_movement_type"]] = '"no_change_recorded"'
        derma["rows"][3][index["suspension_status"]] = '"yes"'
    elif mutation == "patient_conflict":
        derma["rows"][0][index["identifier_value"]] = '"CIP-DER-CONFLICT-A"'
        derma["rows"][5][index["identifier_value"]] = '"CIP-DER-CONFLICT-B"'
    elif mutation == "json_no_reference":
        payload = [{"relationship": "same"}, {"relationship": "same"}]
        encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        derma["rows"][0][index["related_treatments_json"]] = encoded
        derma["rows"][5][index["related_treatments_json"]] = encoded
    return {"tables": tables}


def run_fake(temp_dir: Path, compiled: Path, manifest: dict, core_truth: dict, mutation: str | None = None) -> dict:
    spec_path = temp_dir / f"spec-{mutation or 'positive'}.json"
    runner_path = temp_dir / "fake-runner.js"
    spec_path.write_text(json.dumps(make_fake_spec(manifest, core_truth, mutation), ensure_ascii=False), encoding="utf-8")
    runner_path.write_text(fake_runner_source(), encoding="utf-8")
    result = subprocess.run(["node", str(runner_path), str(spec_path), str(compiled)], cwd=ROOT, text=True, capture_output=True, encoding="utf-8")
    require(result.returncode == 0, f"fake workbook runner failed: {result.stdout}{result.stderr}")
    return json.loads(result.stdout)


def logical_rows(rows: list[list]) -> list[list]:
    if len(rows) == 1 and all(value == "" for value in rows[0]):
        return []
    return rows


def decode(text):
    if text == "":
        return None
    if text == "TRUE":
        return True
    if text == "FALSE":
        return False
    return json.loads(text)


def assert_positive(result: dict, manifest: dict, core_truth: dict) -> None:
    require(result["thrown"] is None, f"positive processor run threw {result['thrown']}")
    require(result["first"]["processedActs"] == 8, "positive run must process eight acts")
    require(result["first"]["rejectedActs"] == 0 and result["first"]["rejectedRows"] == 0, "positive run rejected data")
    require(result["second"]["processedActs"] == 0, "second execution must not process acts")
    definitions = {item["sheet"]: item for item in manifest["technical_tables"]}
    for sheet, expected in workbook_check.EXPECTED_PROCESSOR_COUNTS.items():
        actual = len(logical_rows(result["tables"][definitions[sheet]["table"]]))
        require(actual == expected, f"{sheet} has {actual} rows, expected {expected}")
    columns = core_truth["columns"]
    status_index = columns.index("bridge_status")
    for input_definition in manifest["input_tables"]:
        require(all(row[status_index] == '"PROCESADA"' for row in result["tables"][input_definition["table"]]), f"raw rows not processed in {input_definition['table']}")
    treatment_definition = definitions["TREATMENTS"]
    source_index = treatment_definition["headers"].index("first_seen_source_event_id")
    treatment_rows = logical_rows(result["tables"][treatment_definition["table"]])
    expected_sources = {service["firstSourceEventId"] for service in core_truth["services"].values()}
    require({decode(row[source_index]) for row in treatment_rows} == expected_sources, "treatment first_seen changed after follow-up")
    patient_definition = definitions["PATIENTS"]
    patient_headers = patient_definition["headers"]
    patients = logical_rows(result["tables"][patient_definition["table"]])
    identifier_index = patient_headers.index("identifier_value")
    require(sum(decode(row[identifier_index]) is not None for row in patients) == 2, "patient absence-to-value enrichment failed")


def assert_negative(result: dict, expected_code: str, minimum_errors: int = 1) -> None:
    require(result["thrown"] is None, f"recoverable negative control threw globally: {result['thrown']}")
    errors = logical_rows(result["tables"]["tblBridgeImportErrors"])
    require(len(errors) >= minimum_errors, f"{expected_code} did not create import error")
    require(any(f'"{expected_code}"' in row for row in errors), f"{expected_code} not recorded")


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    source = SCRIPT_PATH.read_text(encoding="utf-8")
    validate_manifest(manifest)
    canonical = canonical_manifest(manifest)
    expected_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    version, digest, embedded = extract_embedded(source)
    require(version == manifest["manifest_version"], "embedded manifest version differs")
    require(digest == expected_hash, "embedded manifest hash differs")
    require(embedded.encode("utf-8") == canonical.encode("utf-8"), "embedded manifest differs byte-for-byte")
    require(" any" not in source and ":any" not in source and "eval(" not in source, "Office Script contains any/eval")
    require("movement_type" not in re.sub(r"therapeutic_movement_type", "", source), "movement_type alias found")
    core_truth = workbook_check.load_core_truth()
    workbook_check.truth_corpora(core_truth)
    with tempfile.TemporaryDirectory(prefix="fh-excel-bridge-processor-") as temp:
        temp_dir = Path(temp)
        compiled = compile_script(temp_dir)
        positive = run_fake(temp_dir, compiled, manifest, core_truth)
        assert_positive(positive, manifest, core_truth)
        assert_negative(run_fake(temp_dir, compiled, manifest, core_truth, "source_conflict"), "SOURCE_EVENT_CONFLICT")
        assert_negative(run_fake(temp_dir, compiled, manifest, core_truth, "movement_inconsistent"), "MOVEMENT_INCONSISTENT")
        assert_negative(run_fake(temp_dir, compiled, manifest, core_truth, "missing_source"), "SOURCE_EVENT_ID_MISSING")
        assert_negative(run_fake(temp_dir, compiled, manifest, core_truth, "coercion"), "CELL_COERCED")
        assert_negative(run_fake(temp_dir, compiled, manifest, core_truth, "formula"), "FORMULA_DETECTED")
        assert_negative(run_fake(temp_dir, compiled, manifest, core_truth, "patient_conflict"), "ENTITY_KEY_CONFLICT")
        suspension = run_fake(temp_dir, compiled, manifest, core_truth, "suspension_trigger")
        require(suspension["thrown"] is None, "suspension trigger run failed")
        movement_rows = logical_rows(suspension["tables"]["tblBridgeTreatmentMovements"])
        require(len(movement_rows) == 3, f"suspension trigger produced {len(movement_rows)} movements, expected 3")
        no_reference = run_fake(temp_dir, compiled, manifest, core_truth, "json_no_reference")
        require(no_reference["thrown"] is None and len(logical_rows(no_reference["tables"]["tblBridgeObservations"])) == 12, "reference-free or duplicate-content JSON was lost")
    print("farmacia_excel_bridge_processor_check: PASS")
    print(f"manifest_sha256={expected_hash}")
    print("typescript=4.0.3 acts=8 raw_rows=12 idempotence=PASS")
    print("negative_controls=SOURCE_EVENT_CONFLICT,MOVEMENT_INCONSISTENT,SOURCE_EVENT_ID_MISSING,CELL_COERCED,FORMULA_DETECTED,ENTITY_KEY_CONFLICT")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, KeyError, json.JSONDecodeError, subprocess.CalledProcessError) as error:
        print(f"farmacia_excel_bridge_processor_check: FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
