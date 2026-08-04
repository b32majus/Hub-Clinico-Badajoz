#!/usr/bin/env python3
"""Check the Cáceres FH Excel Bridge workbook and its TSV truth boundary."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

from openpyxl import load_workbook

import generate_farmacia_excel_bridge_workbook as generator


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKBOOK = ROOT / "templates" / "PROMueve_FH_Caceres_Bridge_DEMO.xlsx"
EXPECTED_SHEETS = [name for name, _ in generator.OPERATIONAL_SHEETS] + list(generator.TECHNICAL_SHEETS)
EXPECTED_TABLES = {
    "01_DERMA": "tblBridgeDermaInput",
    "03_DIGESTIVO": "tblBridgeDigestivoInput",
}


class CheckFailure(AssertionError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def require(condition: bool, message: str, code: str = "FAIL_STRUCTURE") -> None:
    if not condition:
        raise CheckFailure(code, message)


def load_core_truth() -> dict:
    script = r"""
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.argv[1];
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'scripts/farmacia_export_v2_core.js'), 'utf8'), sandbox);
const core = sandbox.window.FarmaciaExportV2Core;
const readFixture = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data/demo/farmacia/export_v2', name), 'utf8'));
const validation = readFixture('validation_event_v2.json');
const firstVisit = readFixture('first_visit_event_v2.json');
const followup = readFixture('followup_event_v2.json');

const validationRows = core.projectEventRows(validation.event, validation.rowPayloads);
const firstVisitRows = core.projectEventRows(firstVisit.event, firstVisit.rowPayloads);
const followupRows = core.projectEventRows(followup.event, followup.rowPayloads);

const secondFirstVisitLine = {
  ...firstVisit.rowPayloads[0],
  rowKey: 'line-demo-first-002',
  treatment_id: 'treatment-demo-first-002',
  line_id: 'line-demo-first-002',
  line_role: 'additional',
  is_primary_line: false,
  line_drug_name: 'Fármaco sintético B'
};
const firstVisitMultilineRows = core.projectEventRows(
  firstVisit.event,
  [firstVisit.rowPayloads[0], secondFirstVisitLine]
);

const formulaEvent = {
  ...validation.event,
  event_id: 'evt-demo-formula-neutral-001',
  source_event_id: 'src-demo-formula-neutral-001',
  requested_drug_name: '=1+1',
  requested_active_ingredient: '+SUM(A1:A2)',
  requested_presentation: '-2+3',
  requested_dose_text: '@command'
};
const formulaRows = core.projectEventRows(formulaEvent, [{ rowKey: 'validation-formula-neutral' }]);

const cases = [
  ['validation', validationRows],
  ['first_visit', firstVisitRows],
  ['first_visit_multiline', firstVisitMultilineRows],
  ['followup', followupRows],
  ['formula_neutral', formulaRows]
].map(([name, rows]) => ({ name, rows: rows.length, tsv: core.serializeRowsToTsv(rows) }));

process.stdout.write(JSON.stringify({ columns: core.ROW_COLUMNS, cases }));
"""
    result = subprocess.run(
        ["node", "-e", script, str(ROOT)],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


def table_values(worksheet) -> list:
    return list(worksheet.tables.values())


def assert_package_has_no_active_content(path: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        names = [name.lower() for name in archive.namelist()]
    forbidden = ("vbaproject", "externallinks", "connections", "embeddings", "activex")
    require(not any(token in name for name in names for token in forbidden), "workbook contains active or external package parts")


def assert_structure(path: Path, *, expect_empty: bool, expected_data_rows: int | None = None) -> None:
    require(path.is_file(), f"workbook does not exist: {path}")
    assert_package_has_no_active_content(path)
    workbook = load_workbook(path, data_only=False, keep_links=True)
    require(workbook.sheetnames == EXPECTED_SHEETS, "sheet list or order differs")
    require(not workbook._external_links, "workbook contains external links")

    for name in EXPECTED_SHEETS:
        expected_state = "visible" if name in EXPECTED_TABLES else "hidden"
        require(workbook[name].sheet_state == expected_state, f"unexpected visibility for {name}")

    columns = generator.load_columns()
    for sheet_name, table_name in EXPECTED_TABLES.items():
        worksheet = workbook[sheet_name]
        tables = table_values(worksheet)
        require(len(tables) == 1, f"{sheet_name} must contain exactly one table")
        require(tables[0].displayName == table_name, f"unexpected table name in {sheet_name}")
        expected_ref = "A1:EV2" if expected_data_rows is None else f"A1:EV{expected_data_rows + 1}"
        require(tables[0].ref == expected_ref, f"unexpected table range in {sheet_name}: {tables[0].ref}")
        headers = [worksheet.cell(1, index).value for index in range(1, 153)]
        require(headers == columns, f"152-column header parity failed in {sheet_name}")
        require(worksheet.freeze_panes == "A2", f"freeze pane differs in {sheet_name}")
        if expect_empty:
            for index in range(1, 153):
                require(worksheet.cell(2, index).number_format == "@", f"row 2 is not Text in {sheet_name} column {index}")
                require(worksheet.column_dimensions[worksheet.cell(2, index).column_letter].number_format == "@", f"column is not Text in {sheet_name} column {index}")
            values = [worksheet.cell(2, index).value for index in range(1, 153)]
            require(all(value is None for value in values), f"{sheet_name} contains a non-empty native row")

    for sheet_name in generator.TECHNICAL_SHEETS:
        worksheet = workbook[sheet_name]
        require(not table_values(worksheet), f"technical sheet {sheet_name} must not contain tables")
        require(worksheet.max_row == 1 and worksheet.max_column == 1 and worksheet["A1"].value is None, f"technical sheet {sheet_name} is not empty")

    require(not any(name.startswith("APP_") for name in workbook.sheetnames), "APP_* sheet found")
    for worksheet in workbook.worksheets:
        for row in worksheet.iter_rows():
            for cell in row:
                require(cell.data_type != "f", f"formula found at {worksheet.title}!{cell.coordinate}", "FAIL_FORMULA_DETECTED")


def semantic_snapshot(path: Path) -> dict:
    workbook = load_workbook(path, data_only=False, keep_links=True)
    snapshot = {"sheets": [], "active": workbook.active.title}
    for worksheet in workbook.worksheets:
        item = {
            "name": worksheet.title,
            "state": worksheet.sheet_state,
            "freeze": str(worksheet.freeze_panes or ""),
            "tables": sorted((table.displayName, table.ref) for table in table_values(worksheet)),
            "values": [[worksheet.cell(row, column).value for column in range(1, worksheet.max_column + 1)] for row in range(1, worksheet.max_row + 1)],
        }
        if worksheet.title in EXPECTED_TABLES:
            item["row2_formats"] = [worksheet.cell(2, index).number_format for index in range(1, 153)]
            item["column_formats"] = [worksheet.column_dimensions[worksheet.cell(2, index).column_letter].number_format for index in range(1, 153)]
        snapshot["sheets"].append(item)
    return snapshot


def truth_corpus(core_truth: dict) -> tuple[str, dict[str, dict]]:
    cases = {case["name"]: case for case in core_truth["cases"]}
    require(cases["first_visit"]["rows"] == 1, "published first-visit fixture must remain single-line")
    require(cases["first_visit_multiline"]["rows"] == 2, "in-memory first-visit variant must project two explicit lines")
    for case in cases.values():
        lines = case["tsv"].split("\n")
        require(len(lines) == case["rows"], f"row cardinality failed for {case['name']}")
        require(all(len(line.split("\t")) == 152 for line in lines), f"152-column TSV failed for {case['name']}")
    selected = [cases[name]["tsv"] for name in ("validation", "first_visit_multiline", "followup", "formula_neutral")]
    return "\n".join(selected), cases


def paste_tsv(worksheet, tsv: str) -> None:
    lines = tsv.split("\n")
    for row_offset, line in enumerate(lines, start=2):
        cells = line.split("\t")
        require(len(cells) == 152, "truth TSV row does not contain 152 cells")
        for column, value in enumerate(cells, start=1):
            cell = worksheet.cell(row_offset, column)
            cell.value = None if value == "" else value
            cell.number_format = "@"
    table_values(worksheet)[0].ref = f"A1:EV{len(lines) + 1}"


def reconstruct_tsv(worksheet, row_count: int) -> str:
    rows = []
    for row in range(2, row_count + 2):
        rows.append("\t".join("" if worksheet.cell(row, column).value is None else str(worksheet.cell(row, column).value) for column in range(1, 153)))
    return "\n".join(rows)


def assert_qa_rows(workbook, corpus: str, row_count: int) -> None:
    expected_rows = [line.split("\t") for line in corpus.split("\n")]
    require(len(expected_rows) == row_count, "truth corpus row count differs", "FAIL_TSV_ROUNDTRIP_MISMATCH")
    require(all(len(row) == 152 for row in expected_rows), "truth corpus column count differs", "FAIL_TSV_ROUNDTRIP_MISMATCH")
    for sheet_name in EXPECTED_TABLES:
        worksheet = workbook[sheet_name]
        for row in worksheet.iter_rows():
            for cell in row:
                if cell.row > row_count + 1 or cell.column > 152:
                    require(
                        cell.value is None,
                        f"unexpected data outside six-row TSV range at {sheet_name}!{cell.coordinate}",
                        "FAIL_TSV_ROUNDTRIP_MISMATCH",
                    )
        for row_offset, expected_row in enumerate(expected_rows, start=2):
            for column, expected_value in enumerate(expected_row, start=1):
                cell = worksheet.cell(row_offset, column)
                require(cell.data_type != "f", f"formula found at {sheet_name}!{cell.coordinate}", "FAIL_FORMULA_DETECTED")
                if expected_value == "":
                    require(cell.value is None, f"expected empty cell changed at {sheet_name}!{cell.coordinate}", "FAIL_TSV_ROUNDTRIP_MISMATCH")
                else:
                    require(
                        isinstance(cell.value, str) and cell.number_format == "@",
                        f"value type or Text format changed at {sheet_name}!{cell.coordinate}",
                        "FAIL_VALUE_OR_TYPE_MISMATCH",
                    )
        actual = reconstruct_tsv(worksheet, row_count)
        require(
            actual.encode("utf-8") == corpus.encode("utf-8"),
            f"manual Excel TSV differs in {sheet_name}",
            "FAIL_TSV_ROUNDTRIP_MISMATCH",
        )


def assert_formula_neutrality(workbook, corpus: str, cases: dict[str, dict]) -> None:
    formula_tsv = cases["formula_neutral"]["tsv"]
    formula_cells = formula_tsv.split("\t")
    columns = generator.load_columns()
    expected = {
        "requested_drug_name": '"=1+1"',
        "requested_active_ingredient": '"+SUM(A1:A2)"',
        "requested_presentation": '"-2+3"',
        "requested_dose_text": '"@command"',
    }
    formula_row = corpus.split("\n").index(formula_tsv) + 2
    for field, canonical_cell in expected.items():
        column = columns.index(field) + 1
        require(formula_cells[column - 1] == canonical_cell, f"core TSV changed formula-neutral value for {field}")
        for sheet_name in EXPECTED_TABLES:
            cell = workbook[sheet_name].cell(formula_row, column)
            require(cell.value == canonical_cell, f"formula-neutral text changed in {sheet_name} for {field}")
            require(cell.data_type != "f", f"formula created in {sheet_name} for {field}")


def run_truth_test(candidate: Path, core_truth: dict) -> tuple[str, int]:
    corpus, cases = truth_corpus(core_truth)
    row_count = len(corpus.split("\n"))
    with tempfile.TemporaryDirectory(prefix="fh-excel-bridge-truth-") as temp_dir:
        truth_path = Path(temp_dir) / "truth.xlsx"
        workbook = load_workbook(candidate, data_only=False, keep_links=True)
        for sheet_name in EXPECTED_TABLES:
            paste_tsv(workbook[sheet_name], corpus)
        workbook.save(truth_path)
        reopened = load_workbook(truth_path, data_only=False, keep_links=True)
        assert_qa_rows(reopened, corpus, row_count)
        assert_formula_neutrality(reopened, corpus, cases)
    return corpus, row_count


def expect_negative_failure(path: Path, corpus: str, cases: dict[str, dict], row_count: int, expected_code: str) -> None:
    try:
        assert_structure(path, expect_empty=False, expected_data_rows=row_count)
        workbook = load_workbook(path, data_only=False, keep_links=True)
        assert_qa_rows(workbook, corpus, row_count)
        assert_formula_neutrality(workbook, corpus, cases)
    except CheckFailure as error:
        require(error.code == expected_code, f"negative control returned {error.code}, expected {expected_code}")
        return
    raise CheckFailure("FAIL_NEGATIVE_CONTROL", f"negative control did not produce {expected_code}")


def run_negative_controls(candidate: Path, core_truth: dict) -> list[str]:
    corpus, cases = truth_corpus(core_truth)
    row_count = len(corpus.split("\n"))

    def displace_text_cells(worksheet) -> None:
        worksheet["A2"].value, worksheet["E2"].value = worksheet["E2"].value, worksheet["A2"].value

    controls = (
        ("FAIL_FORMULA_DETECTED", lambda worksheet: setattr(worksheet["AM7"], "value", "=1+1")),
        ("FAIL_VALUE_OR_TYPE_MISMATCH", lambda worksheet: setattr(worksheet["K2"], "value", 1)),
        ("FAIL_TSV_ROUNDTRIP_MISMATCH", displace_text_cells),
    )
    passed = []
    with tempfile.TemporaryDirectory(prefix="fh-excel-bridge-negative-") as temp_dir:
        for index, (expected_code, mutate) in enumerate(controls, start=1):
            path = Path(temp_dir) / f"negative-{index}.xlsx"
            workbook = load_workbook(candidate, data_only=False, keep_links=True)
            for sheet_name in EXPECTED_TABLES:
                paste_tsv(workbook[sheet_name], corpus)
            mutate(workbook["01_DERMA"])
            workbook.save(path)
            expect_negative_failure(path, corpus, cases, row_count, expected_code)
            passed.append(expected_code)
    return passed


def check_clean_candidate(path: Path, core_truth: dict) -> tuple[str, int, list[str]]:
    assert_structure(path, expect_empty=True)
    require(core_truth["columns"] == generator.load_columns(), "core ROW_COLUMNS differs from schema x-column-order")
    with tempfile.TemporaryDirectory(prefix="fh-excel-bridge-generated-") as temp_dir:
        generated = generator.build_workbook(Path(temp_dir) / "generated.xlsx")
        assert_structure(generated, expect_empty=True)
        require(semantic_snapshot(path) == semantic_snapshot(generated), "versioned workbook differs semantically from a clean generation")
    corpus, row_count = run_truth_test(path, core_truth)
    return corpus, row_count, run_negative_controls(path, core_truth)


def check_manual_qa_copy(path: Path, core_truth: dict) -> tuple[str, int, list[str]]:
    corpus, cases = truth_corpus(core_truth)
    row_count = len(corpus.split("\n"))
    assert_structure(path, expect_empty=False, expected_data_rows=row_count)
    workbook = load_workbook(path, data_only=False, keep_links=True)
    assert_qa_rows(workbook, corpus, row_count)
    assert_formula_neutrality(workbook, corpus, cases)
    return corpus, row_count, run_negative_controls(DEFAULT_WORKBOOK, core_truth)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=DEFAULT_WORKBOOK)
    parser.add_argument("--qa-copy", action="store_true", help="validate a copy saved by Excel containing the manual truth corpus")
    parser.add_argument("--emit-manual-tsv", type=Path, help="write the exact TSV corpus for manual Excel QA")
    args = parser.parse_args()

    core_truth = load_core_truth()
    corpus, row_count = truth_corpus(core_truth)
    if args.emit_manual_tsv:
        args.emit_manual_tsv.parent.mkdir(parents=True, exist_ok=True)
        args.emit_manual_tsv.write_text(corpus, encoding="utf-8", newline="")
        print(f"manual_tsv={args.emit_manual_tsv}")
        return

    if args.qa_copy:
        corpus, row_count, negative_controls = check_manual_qa_copy(args.workbook, core_truth)
        mode = "manual_excel_qa"
    else:
        corpus, row_count, negative_controls = check_clean_candidate(args.workbook, core_truth)
        mode = "candidate"

    print("farmacia_excel_bridge_workbook_check: PASS")
    print(f"mode={mode} sheets={len(EXPECTED_SHEETS)} columns=152 truth_rows={row_count} truth_bytes={len(corpus.encode('utf-8'))}")
    print(f"negative_controls={','.join(negative_controls)}")


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, ValueError, subprocess.CalledProcessError) as error:
        code = error.code if isinstance(error, CheckFailure) else "FAIL_UNEXPECTED"
        print(f"farmacia_excel_bridge_workbook_check: {code}: {error}", file=sys.stderr)
        raise SystemExit(1)
