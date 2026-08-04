#!/usr/bin/env python3
"""Generate the Cáceres FH Excel Bridge workbook container."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schemas" / "farmacia_export_row_v2.schema.json"
DEFAULT_OUTPUT = ROOT / "templates" / "PROMueve_FH_Caceres_Bridge_DEMO.xlsx"

OPERATIONAL_SHEETS = (
    ("01_DERMA", "tblBridgeDermaInput"),
    ("03_DIGESTIVO", "tblBridgeDigestivoInput"),
)
TECHNICAL_SHEETS = (
    "PATIENTS",
    "REQUESTS",
    "VALIDATIONS",
    "TREATMENTS",
    "TREATMENT_LINES",
    "TREATMENT_MOVEMENTS",
    "VISITS",
    "VISIT_LINES",
    "OBSERVATIONS",
    "PROMS",
    "ADVERSE_EVENTS",
    "CAUSALITY",
    "RENEWAL_CYCLES",
    "RENEWAL_TASKS",
    "AUDIT_EVENTS",
    "IMPORT_ERRORS",
)


def load_columns() -> list[str]:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    columns = schema.get("x-column-order")
    if not isinstance(columns, list) or len(columns) != 152:
        raise ValueError("x-column-order must contain exactly 152 columns")
    if any(not isinstance(name, str) or not name for name in columns):
        raise ValueError("x-column-order must contain non-empty string names")
    if len(set(columns)) != 152:
        raise ValueError("x-column-order must contain 152 unique names")
    return columns


def build_workbook(output: Path = DEFAULT_OUTPUT) -> Path:
    columns = load_columns()
    workbook = Workbook()
    workbook.remove(workbook.active)
    workbook.creator = "PROMueve"
    workbook.title = "PROMueve FH Cáceres Excel Bridge DEMO"
    workbook.subject = "Excel Bridge V4 workbook container"
    workbook.description = "Synthetic/demo workbook container; no real patient data."

    table_style = TableStyleInfo(
        name="TableStyleMedium2",
        showFirstColumn=False,
        showLastColumn=False,
        showRowStripes=True,
        showColumnStripes=False,
    )
    header_fill = PatternFill(fill_type="solid", fgColor="1F4E78")
    header_font = Font(color="FFFFFF", bold=True)

    for sheet_name, table_name in OPERATIONAL_SHEETS:
        worksheet = workbook.create_sheet(sheet_name)
        worksheet.freeze_panes = "A2"
        worksheet.sheet_view.showGridLines = False
        for index, name in enumerate(columns, start=1):
            header = worksheet.cell(row=1, column=index, value=name)
            header.fill = header_fill
            header.font = header_font
            header.alignment = Alignment(horizontal="center", vertical="center")
            placeholder = worksheet.cell(row=2, column=index)
            placeholder.number_format = "@"
            column_letter = placeholder.column_letter
            worksheet.column_dimensions[column_letter].number_format = "@"
            worksheet.column_dimensions[column_letter].width = max(12, min(28, len(name) + 2))
        worksheet.row_dimensions[1].height = 30
        table = Table(displayName=table_name, ref="A1:EV2")
        table.tableStyleInfo = table_style
        worksheet.add_table(table)

    for sheet_name in TECHNICAL_SHEETS:
        worksheet = workbook.create_sheet(sheet_name)
        worksheet.sheet_state = "hidden"

    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output)
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    output = build_workbook(args.output)
    print(output)


if __name__ == "__main__":
    main()
