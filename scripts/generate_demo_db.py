#!/usr/bin/env python3
"""
Genera la base demo v2 canónica para Reuma:
- 321 columnas históricas del maestro (AR) intactas.
- 170 columnas v2 (322-491) según docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md.
- 5 hojas clínicas: AR, ESPA, APS, LES, SJOGREN (491 columnas cada una).
- Hojas auxiliares: Profesionales, Fármacos.
- Sin hoja Prebiologico obligatoria y sin columnas de Solicitud FH.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

try:
    from openpyxl import Workbook, load_workbook
except ImportError as exc:
    raise SystemExit("ERROR: openpyxl no está instalado. Ejecuta: pip install openpyxl") from exc


PROJECT_DIR = Path(__file__).resolve().parents[1]
MASTER_XLSX = PROJECT_DIR / "Hub_Clinico_Maestro.xlsx"
OUTPUT_XLSX = PROJECT_DIR / "data" / "Hub_Clinico_Maestro_V2_DEMO.xlsx"
ORDER_MD = PROJECT_DIR / "docs" / "ORDEN_COLUMNAS_EXCEL_REUMA_V2.md"
REPORT_MD = PROJECT_DIR / "docs" / "REPORTE_DIFERENCIAS_EXCEL_DEMO_V2.md"

CLINICAL_SHEETS = ["AR", "ESPA", "APS", "LES", "SJOGREN"]
MASTER_BASE_SHEETS = ["AR", "ESPA", "APS"]
FINAL_COLUMN_COUNT = 491
HISTORICAL_COLUMN_COUNT = 321
V2_START = 322
V2_END = 491


@dataclass
class ValidationCheck:
    label: str
    ok: bool
    detail: str = ""


def normalize_header(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def read_header(ws) -> List[str]:
    return [normalize_header(c) for c in next(ws.iter_rows(min_row=1, max_row=1, values_only=True))]


def parse_v2_headers_from_contract(path: Path) -> List[str]:
    if not path.exists():
        raise FileNotFoundError(f"No existe contrato de columnas: {path}")

    line_re = re.compile(r"^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|")
    positions: Dict[int, str] = {}

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        m = line_re.match(raw_line.strip())
        if not m:
            continue
        pos = int(m.group(1))
        col = m.group(2).strip()
        if V2_START <= pos <= V2_END:
            positions[pos] = col

    expected_positions = list(range(V2_START, V2_END + 1))
    missing = [p for p in expected_positions if p not in positions]
    if missing:
        raise ValueError(f"Contrato incompleto: faltan posiciones v2 {missing[:5]} ... total {len(missing)}")

    v2_headers = [positions[p] for p in expected_positions]
    if len(v2_headers) != 170:
        raise ValueError(f"Se esperaban 170 columnas v2 y se obtuvieron {len(v2_headers)}")

    return v2_headers


def load_master_historical_headers(master_path: Path) -> Tuple[List[str], Dict[str, List[str]]]:
    if not master_path.exists():
        raise FileNotFoundError(f"No existe Excel maestro: {master_path}")

    wb = load_workbook(master_path, read_only=True, data_only=True)
    headers_by_sheet: Dict[str, List[str]] = {}
    for sheet in MASTER_BASE_SHEETS:
        if sheet not in wb.sheetnames:
            raise ValueError(f"Falta hoja {sheet} en maestro.")
        headers = read_header(wb[sheet])
        headers_by_sheet[sheet] = headers

    ar_headers = headers_by_sheet["AR"]
    return ar_headers, headers_by_sheet


def build_empty_row(headers: List[str]) -> Dict[str, str]:
    return {h: "" for h in headers}


def set_if_exists(row: Dict[str, str], value, *keys: str) -> None:
    for key in keys:
        if key in row:
            row[key] = value


def base_visit_row(headers: List[str], patient_id: str, name: str, sex: str, pathology: str) -> Dict[str, str]:
    row = build_empty_row(headers)
    set_if_exists(row, patient_id, "ID_Paciente")
    set_if_exists(row, name, "Nombre_Paciente")
    set_if_exists(row, sex, "Sexo")
    set_if_exists(row, pathology, "Diagnostico_Primario", "Diagnostico_Principal")
    set_if_exists(row, "NO", "Comorbilidad_DM", "Comorbilidad_ECV")
    set_if_exists(row, "ND", "Toxico_Tabaco", "Toxico_Alcohol")
    return row


def apply_common_v2_prebiologic(row: Dict[str, str], payload: Dict[str, str]) -> None:
    for key, value in payload.items():
        if key in row:
            row[key] = value


def apply_payload_to_row(row: Dict[str, str], payload: Dict[str, str]) -> None:
    for key, value in payload.items():
        if key in row:
            row[key] = value

    # Compatibilidad histórica: muchas hojas legacy no tienen Decision_Terapeutica plano.
    if "Decision_Terapeutica" in payload and "Decision_Terapeutica" not in row:
        tipo = str(payload.get("Tipo_Visita", "")).strip().lower()
        decision = payload.get("Decision_Terapeutica", "")
        if tipo == "primera" and "Decision_Terapeutica_PV" in row:
            row["Decision_Terapeutica_PV"] = decision
        if tipo == "seguimiento" and "Decision_Terapeutica_SEG" in row:
            row["Decision_Terapeutica_SEG"] = decision


def build_clinical_rows(headers: List[str]) -> Dict[str, List[Dict[str, str]]]:
    rows: Dict[str, List[Dict[str, str]]] = defaultdict(list)

    # AR — DEMO-AR-001 (4 visitas)
    ar_base = ("DEMO-AR-001", "Paciente Demo AR", "F", "ar")
    ar_visits = [
        {
            "Fecha_Visita": "2026-01-10",
            "Tipo_Visita": "primera",
            "Profesional": "PROF-REU-001",
            "Peso": "70",
            "Talla": "165",
            "IMC": "25.7",
            "TA": "132/84",
            "Comorbilidad_HTA": "SI",
            "Comorbilidad_DLP": "SI",
            "Comorbilidad_Obesidad": "SI",
            "HLA_B27": "Negativo",
            "FR": "Positivo",
            "APCC": "Positivo",
            "ANA": "Negativo",
            "NAD_Total": "11",
            "NAT_Total": "9",
            "NAD28": "8",
            "NAT28": "7",
            "EVA_Global": "78",
            "EVA_Dolor": "82",
            "EVA_Medico": "76",
            "PCR": "16",
            "VSG": "42",
            "DAS28_CRP_Result": "6.2",
            "DAS28_ESR_Result": "6.4",
            "CDAI_Result": "30",
            "SDAI_Result": "34",
            "RAPID3_Score": "17",
            "RAPID3_Categoria": "Alta actividad",
            "HAQ_Total": "1.9",
            "Tratamiento_Actual": "Metotrexato 15 mg/semana",
            "Fecha_Inicio_Tratamiento": "2026-01-10",
            "Decision_Terapeutica_PV": "iniciar",
            "Decision_Terapeutica": "iniciar",
            "Fecha_Proxima_Revision": "2026-04-15",
            "Comentarios_Adicionales": "Inicio DMARD. Caso ficticio.",
            "Fecha_Diagnostico": "2025-12-20",
            "Estado_Prebiologico_Final": "NO_EVALUADO",
            "Hemograma_Solicitado": "SI",
            "Bioquimica_Solicitada": "SI",
            "Serologias_Solicitadas": "SI",
            "IGRA_Mantoux_Solicitado": "SI",
            "IGRA_Mantoux_Tipo": "IGRA",
            "Rx_Torax_Solicitada": "SI",
            "Vacunacion_Revisada": "SI",
            "Vacunacion_OK": "ND",
            "Medicina_Preventiva_Requiere_Derivacion": "SI",
            "Vacunas_Pendientes": "Neumococo; VHB",
        },
        {
            "Fecha_Visita": "2026-04-15",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-001",
            "NAD_Total": "7",
            "NAT_Total": "6",
            "NAD28": "5",
            "NAT28": "5",
            "EVA_Global": "58",
            "EVA_Dolor": "62",
            "EVA_Medico": "55",
            "PCR": "9",
            "VSG": "30",
            "DAS28_CRP_Result": "4.8",
            "DAS28_ESR_Result": "5.0",
            "CDAI_Result": "19",
            "SDAI_Result": "23",
            "RAPID3_Score": "12",
            "RAPID3_Categoria": "Actividad moderada",
            "HAQ_Total": "1.3",
            "Tratamiento_Actual": "Metotrexato 15 mg/semana + Adalimumab 40 mg/14d",
            "Fecha_Inicio_Tratamiento": "2026-04-15",
            "Decision_Terapeutica_SEG": "cambiar",
            "Decision_Terapeutica": "cambiar",
            "Cambio_Motivo": "Respuesta insuficiente",
            "Cambio_Efectos_Adversos": "NO",
            "Cambio_Biologico_Farmaco": "Adalimumab",
            "Cambio_Biologico_Dosis": "40 mg/14d",
            "Fecha_Proxima_Revision": "2026-08-10",
            "Comentarios_Adicionales": "Añadido biológico por actividad persistente.",
            "Fecha_Diagnostico": "2025-12-20",
            "Estado_Prebiologico_Final": "APTO",
            "Fecha_Validacion_Prebiologico": "2026-04-10",
            "Profesional_Validador": "PROF-REU-001",
            "Decision_Clinica_Manual": "SI",
            "Hemograma_Recibido": "SI",
            "Hemograma_Fecha_Recepcion": "2026-04-08",
            "Hemograma_Correcto": "SI",
            "Bioquimica_Recibida": "SI",
            "Bioquimica_Correcta": "SI",
            "Serologias_Recibidas": "SI",
            "Serologias_Correctas": "SI",
            "IGRA_Mantoux_Recibido": "SI",
            "IGRA_Mantoux_Resultado": "NEGATIVO",
            "Rx_Torax_Recibida": "SI",
            "Rx_Torax_Correcta": "SI",
            "Vacunacion_OK": "SI",
            "Medicina_Preventiva_Derivada": "SI",
            "Medicina_Preventiva_Fecha_Derivacion": "2026-04-09",
        },
        {
            "Fecha_Visita": "2026-08-10",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-001",
            "NAD_Total": "4",
            "NAT_Total": "3",
            "NAD28": "3",
            "NAT28": "2",
            "EVA_Global": "34",
            "EVA_Dolor": "36",
            "EVA_Medico": "30",
            "PCR": "4",
            "VSG": "18",
            "DAS28_CRP_Result": "3.2",
            "DAS28_ESR_Result": "3.4",
            "CDAI_Result": "11",
            "SDAI_Result": "12",
            "RAPID3_Score": "8",
            "RAPID3_Categoria": "Baja actividad",
            "HAQ_Total": "0.8",
            "Tratamiento_Actual": "Metotrexato 15 mg/semana + Baricitinib 4 mg/día",
            "Fecha_Inicio_Tratamiento": "2026-08-10",
            "Decision_Terapeutica": "cambiar",
            "Cambio_Motivo": "Efecto adverso local anti-TNF",
            "Cambio_Efectos_Adversos": "SI",
            "Cambio_Descripcion_Efectos": "Reacción local repetida. Caso ficticio.",
            "Cambio_Biologico_Farmaco": "Baricitinib",
            "Cambio_Biologico_Dosis": "4 mg/día",
            "Fecha_Proxima_Revision": "2026-12-15",
            "Comentarios_Adicionales": "Cambio de terapia por tolerancia.",
            "Fecha_Diagnostico": "2025-12-20",
            "Estado_Prebiologico_Final": "APTO",
            "Fecha_Validacion_Prebiologico": "2026-04-10",
            "Vacunacion_Revisada": "SI",
            "Vacunacion_OK": "SI",
        },
        {
            "Fecha_Visita": "2026-12-15",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-001",
            "NAD_Total": "1",
            "NAT_Total": "1",
            "NAD28": "1",
            "NAT28": "1",
            "EVA_Global": "12",
            "EVA_Dolor": "14",
            "EVA_Medico": "10",
            "PCR": "1.5",
            "VSG": "11",
            "DAS28_CRP_Result": "2.1",
            "DAS28_ESR_Result": "2.3",
            "CDAI_Result": "4",
            "SDAI_Result": "5",
            "RAPID3_Score": "3",
            "RAPID3_Categoria": "Remisión/baja actividad",
            "HAQ_Total": "0.3",
            "Tratamiento_Actual": "Metotrexato 15 mg/semana + Baricitinib 4 mg/día",
            "Fecha_Inicio_Tratamiento": "2026-08-10",
            "Decision_Terapeutica": "continuar",
            "Cambio_Efectos_Adversos": "NO",
            "Fecha_Proxima_Revision": "2027-04-10",
            "Comentarios_Adicionales": "Remisión clínica ficticia.",
            "Fecha_Diagnostico": "2025-12-20",
            "Estado_Prebiologico_Final": "APTO",
            "Fecha_Validacion_Prebiologico": "2026-04-10",
            "Vacunacion_Revisada": "SI",
            "Vacunacion_OK": "SI",
        },
    ]

    for payload in ar_visits:
        row = base_visit_row(headers, *ar_base)
        apply_payload_to_row(row, payload)
        rows["AR"].append(row)

    # AR — DEMO-AR-002: Alta actividad inicial con biológico (4 visitas)
    ar2_base = ("DEMO-AR-002", "Paciente Demo AR 002", "F", "ar")
    ar2 = [
        {"Fecha_Visita": "2026-01-15", "Tipo_Visita": "primera", "Profesional": "PROF-REU-001",
         "Peso": "68", "Talla": "162", "IMC": "25.9", "TA": "138/86",
         "Comorbilidad_HTA": "SI", "Comorbilidad_DLP": "SI",
         "FR": "Positivo", "APCC": "Positivo",
         "NAD_Total": "12", "NAT_Total": "10", "NAD28": "9", "NAT28": "8",
         "EVA_Global": "80", "EVA_Dolor": "85", "EVA_Medico": "78",
         "PCR": "18", "VSG": "48",
         "DAS28_CRP_Result": "6.8", "DAS28_ESR_Result": "7.0",
         "CDAI_Result": "32", "SDAI_Result": "36",
         "RAPID3_Score": "19", "RAPID3_Categoria": "Alta actividad", "HAQ_Total": "2.0",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana", "Fecha_Inicio_Tratamiento": "2026-01-15",
         "Decision_Terapeutica_PV": "iniciar", "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-04-20",
         "Comentarios_Adicionales": "Alta actividad. Caso AR 002.", "Fecha_Diagnostico": "2025-11-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "Hemograma_Solicitado": "SI", "Bioquimica_Solicitada": "SI",
         "Serologias_Solicitadas": "SI", "IGRA_Mantoux_Solicitado": "SI",
         "IGRA_Mantoux_Tipo": "IGRA", "Rx_Torax_Solicitada": "SI",
         "Vacunacion_Revisada": "SI", "Vacunas_Pendientes": "Neumococo; Herpes Zóster",
        },
        {"Fecha_Visita": "2026-04-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "7", "NAT_Total": "6", "NAD28": "5", "NAT28": "5",
         "EVA_Global": "60", "EVA_Dolor": "62", "EVA_Medico": "55",
         "PCR": "10", "VSG": "32",
         "DAS28_CRP_Result": "5.2", "DAS28_ESR_Result": "5.3",
         "CDAI_Result": "20", "SDAI_Result": "23",
         "RAPID3_Score": "13", "RAPID3_Categoria": "Actividad moderada", "HAQ_Total": "1.5",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana + Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-04-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Respuesta insuficiente",
         "Cambio_Biologico_Farmaco": "Adalimumab", "Cambio_Biologico_Dosis": "40 mg/14d",
         "Fecha_Proxima_Revision": "2026-08-15", "Comentarios_Adicionales": "Inicio anti-TNF.",
         "Fecha_Diagnostico": "2025-11-15",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-04-14",
         "Profesional_Validador": "PROF-REU-001", "Decision_Clinica_Manual": "SI",
         "Hemograma_Recibido": "SI", "Hemograma_Correcto": "SI",
         "Bioquimica_Recibida": "SI", "Bioquimica_Correcta": "SI",
         "Serologias_Recibidas": "SI", "Serologias_Correctas": "SI",
         "IGRA_Mantoux_Recibido": "SI", "IGRA_Mantoux_Resultado": "NEGATIVO",
         "Rx_Torax_Recibida": "SI", "Rx_Torax_Correcta": "SI",
         "Vacunacion_OK": "SI",
        },
        {"Fecha_Visita": "2026-08-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "4", "NAT_Total": "3", "NAD28": "3", "NAT28": "2",
         "EVA_Global": "42", "EVA_Dolor": "40", "EVA_Medico": "38",
         "PCR": "5", "VSG": "20",
         "DAS28_CRP_Result": "3.8", "DAS28_ESR_Result": "4.0",
         "CDAI_Result": "14", "SDAI_Result": "15",
         "RAPID3_Score": "8", "RAPID3_Categoria": "Baja actividad", "HAQ_Total": "0.9",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana + Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-04-20",
         "Decision_Terapeutica": "continuar", "Cambio_Efectos_Adversos": "NO",
         "Fecha_Proxima_Revision": "2027-01-10",
         "Comentarios_Adicionales": "Buena respuesta clínica.", "Fecha_Diagnostico": "2025-11-15",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-04-14",
         "Vacunacion_Revisada": "SI", "Vacunacion_OK": "SI",
        },
        {"Fecha_Visita": "2027-01-10", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "1", "NAT_Total": "1", "NAD28": "1", "NAT28": "1",
         "EVA_Global": "15", "EVA_Dolor": "16", "EVA_Medico": "12",
         "PCR": "2", "VSG": "12",
         "DAS28_CRP_Result": "2.4", "DAS28_ESR_Result": "2.5",
         "CDAI_Result": "5", "SDAI_Result": "6",
         "RAPID3_Score": "3", "RAPID3_Categoria": "Remisión/baja actividad", "HAQ_Total": "0.4",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana",
         "Fecha_Inicio_Tratamiento": "2027-01-10",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Remisión clínica",
         "Cambio_Efectos_Adversos": "NO",
         "Fecha_Proxima_Revision": "2027-05-20",
         "Comentarios_Adicionales": "Retirada de biológico por remisión.", "Fecha_Diagnostico": "2025-11-15",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-04-14",
        },
    ]
    for payload in ar2:
        row = base_visit_row(headers, *ar2_base)
        apply_payload_to_row(row, payload)
        rows["AR"].append(row)

    # AR — DEMO-AR-003: Respuesta parcial con comorbilidades (3 visitas)
    ar3_base = ("DEMO-AR-003", "Paciente Demo AR 003", "M", "ar")
    ar3 = [
        {"Fecha_Visita": "2026-02-05", "Tipo_Visita": "primera", "Profesional": "PROF-REU-001",
         "Peso": "88", "Talla": "172", "IMC": "29.7", "TA": "148/92",
         "Comorbilidad_HTA": "SI", "Comorbilidad_DM": "SI", "Comorbilidad_DLP": "SI",
         "FR": "Positivo", "APCC": "Positivo",
         "NAD_Total": "10", "NAT_Total": "8", "NAD28": "8", "NAT28": "6",
         "EVA_Global": "75", "EVA_Dolor": "78", "EVA_Medico": "72",
         "PCR": "15", "VSG": "40",
         "DAS28_CRP_Result": "5.8", "DAS28_ESR_Result": "6.0",
         "CDAI_Result": "26", "SDAI_Result": "30",
         "RAPID3_Score": "15", "RAPID3_Categoria": "Alta actividad", "HAQ_Total": "1.7",
         "Tratamiento_Actual": "Metotrexato 20 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-02-05",
         "Decision_Terapeutica_PV": "iniciar", "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-06-15",
         "Comentarios_Adicionales": "AR con comorbilidades múltiples.", "Fecha_Diagnostico": "2025-12-01",
         "Estado_Prebiologico_Final": "NO_APTO", "Fecha_Validacion_Prebiologico": "2026-02-02",
         "Vacunacion_Revisada": "SI", "Vacunacion_OK": "NO",
         "Vacunas_Pendientes": "VHB; Neumococo",
        },
        {"Fecha_Visita": "2026-06-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "7", "NAT_Total": "6", "NAD28": "6", "NAT28": "5",
         "EVA_Global": "58", "EVA_Dolor": "60", "EVA_Medico": "55",
         "PCR": "8", "VSG": "28",
         "DAS28_CRP_Result": "4.5", "DAS28_ESR_Result": "4.7",
         "CDAI_Result": "18", "SDAI_Result": "20",
         "RAPID3_Score": "11", "RAPID3_Categoria": "Actividad moderada", "HAQ_Total": "1.3",
         "Tratamiento_Actual": "Metotrexato 20 mg/semana + Baricitinib 4 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-06-15",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Respuesta insuficiente a MTX",
         "Cambio_Biologico_Farmaco": "Baricitinib", "Cambio_Biologico_Dosis": "4 mg/día",
         "Fecha_Proxima_Revision": "2026-11-10",
         "Comentarios_Adicionales": "Añadido JAKi. Mejoría parcial.", "Fecha_Diagnostico": "2025-12-01",
         "Estado_Prebiologico_Final": "NO_APTO", "Fecha_Validacion_Prebiologico": "2026-02-02",
        },
        {"Fecha_Visita": "2026-11-10", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "6", "NAT_Total": "5", "NAD28": "5", "NAT28": "4",
         "EVA_Global": "48", "EVA_Dolor": "50", "EVA_Medico": "45",
         "PCR": "7", "VSG": "25",
         "DAS28_CRP_Result": "4.1", "DAS28_ESR_Result": "4.3",
         "CDAI_Result": "16", "SDAI_Result": "18",
         "RAPID3_Score": "9", "RAPID3_Categoria": "Actividad moderada", "HAQ_Total": "1.1",
         "Tratamiento_Actual": "Metotrexato 20 mg/semana + Baricitinib 4 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-06-15",
         "Decision_Terapeutica": "continuar", "Cambio_Efectos_Adversos": "NO",
         "Fecha_Proxima_Revision": "2027-03-20",
         "Comentarios_Adicionales": "Respuesta parcial. Valorar cambio futuro.", "Fecha_Diagnostico": "2025-12-01",
         "Estado_Prebiologico_Final": "NO_APTO",
        },
    ]
    for payload in ar3:
        row = base_visit_row(headers, *ar3_base)
        apply_payload_to_row(row, payload)
        rows["AR"].append(row)

    # AR — DEMO-AR-004: Cambio por efecto adverso (4 visitas)
    ar4_base = ("DEMO-AR-004", "Paciente Demo AR 004", "F", "ar")
    ar4 = [
        {"Fecha_Visita": "2026-01-28", "Tipo_Visita": "primera", "Profesional": "PROF-REU-001",
         "Peso": "62", "Talla": "158", "IMC": "24.8", "TA": "125/80",
         "Comorbilidad_HTA": "NO", "FR": "Positivo", "APCC": "Positivo",
         "NAD_Total": "11", "NAT_Total": "9", "NAD28": "9", "NAT28": "7",
         "EVA_Global": "76", "EVA_Dolor": "80", "EVA_Medico": "74",
         "PCR": "15", "VSG": "42",
         "DAS28_CRP_Result": "6.4", "DAS28_ESR_Result": "6.6",
         "CDAI_Result": "29", "SDAI_Result": "33",
         "RAPID3_Score": "17", "RAPID3_Categoria": "Alta actividad", "HAQ_Total": "1.8",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-01-28",
         "Decision_Terapeutica_PV": "iniciar", "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-05-30", "Fecha_Diagnostico": "2025-10-20",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "Hemograma_Solicitado": "SI", "Bioquimica_Solicitada": "SI",
         "Serologias_Solicitadas": "SI", "IGRA_Mantoux_Solicitado": "SI",
         "IGRA_Mantoux_Tipo": "Quantiferon", "Rx_Torax_Solicitada": "SI",
         "Vacunacion_Revisada": "SI", "Vacunas_Pendientes": "VHB",
        },
        {"Fecha_Visita": "2026-05-30", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "7", "NAT_Total": "5", "NAD28": "5", "NAT28": "4",
         "EVA_Global": "58", "EVA_Dolor": "62", "EVA_Medico": "55",
         "PCR": "9", "VSG": "30",
         "DAS28_CRP_Result": "5.0", "DAS28_ESR_Result": "5.1",
         "CDAI_Result": "18", "SDAI_Result": "22",
         "RAPID3_Score": "12", "RAPID3_Categoria": "Actividad moderada", "HAQ_Total": "1.3",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana + Tocilizumab 162 mg/semana SC",
         "Fecha_Inicio_Tratamiento": "2026-05-30",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Persistencia de actividad",
         "Cambio_Biologico_Farmaco": "Tocilizumab", "Cambio_Biologico_Dosis": "162 mg/semana SC",
         "Fecha_Proxima_Revision": "2026-10-15",
         "Comentarios_Adicionales": "Inicio anti-IL6.", "Fecha_Diagnostico": "2025-10-20",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "Hemograma_Recibido": "SI", "Bioquimica_Recibida": "SI",
         "Serologias_Recibidas": "SI", "IGRA_Mantoux_Recibido": "SI",
         "IGRA_Mantoux_Resultado": "NEGATIVO", "Rx_Torax_Recibida": "SI",
         "Vacunacion_OK": "SI",
        },
        {"Fecha_Visita": "2026-10-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "4", "NAT_Total": "3", "NAD28": "3", "NAT28": "2",
         "EVA_Global": "42", "EVA_Dolor": "44", "EVA_Medico": "38",
         "PCR": "5", "VSG": "20",
         "DAS28_CRP_Result": "3.5", "DAS28_ESR_Result": "3.7",
         "CDAI_Result": "12", "SDAI_Result": "14",
         "RAPID3_Score": "8", "RAPID3_Categoria": "Baja actividad", "HAQ_Total": "0.8",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana + Rituximab 1 g/6 meses",
         "Fecha_Inicio_Tratamiento": "2026-10-15",
         "Decision_Terapeutica": "cambiar",
         "Cambio_Motivo": "Reacción infusional con Tocilizumab",
         "Cambio_Efectos_Adversos": "SI",
         "Cambio_Descripcion_Efectos": "Reacción infusional con prurito y rash. Caso AR 004.",
         "Cambio_Biologico_Farmaco": "Rituximab", "Cambio_Biologico_Dosis": "1 g/6 meses",
         "Fecha_Proxima_Revision": "2027-02-20",
         "Comentarios_Adicionales": "Rotación a anti-CD20 por efecto adverso.", "Fecha_Diagnostico": "2025-10-20",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "Vacunacion_Revisada": "SI", "Vacunacion_OK": "SI",
        },
        {"Fecha_Visita": "2027-02-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "2", "NAT_Total": "1", "NAD28": "1", "NAT28": "1",
         "EVA_Global": "24", "EVA_Dolor": "22", "EVA_Medico": "20",
         "PCR": "3", "VSG": "12",
         "DAS28_CRP_Result": "2.8", "DAS28_ESR_Result": "3.0",
         "CDAI_Result": "8", "SDAI_Result": "9",
         "RAPID3_Score": "5", "RAPID3_Categoria": "Baja actividad", "HAQ_Total": "0.5",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana + Rituximab 1 g/6 meses",
         "Fecha_Inicio_Tratamiento": "2026-10-15",
         "Decision_Terapeutica": "continuar", "Cambio_Efectos_Adversos": "NO",
         "Fecha_Proxima_Revision": "2027-07-15",
         "Comentarios_Adicionales": "Buena tolerancia y respuesta a Rituximab.", "Fecha_Diagnostico": "2025-10-20",
         "Estado_Prebiologico_Final": "EN_CURSO",
        },
    ]
    for payload in ar4:
        row = base_visit_row(headers, *ar4_base)
        apply_payload_to_row(row, payload)
        rows["AR"].append(row)

    # AR — DEMO-AR-005: Alta actividad persistente (3 visitas)
    ar5_base = ("DEMO-AR-005", "Paciente Demo AR 005", "M", "ar")
    ar5 = [
        {"Fecha_Visita": "2026-02-20", "Tipo_Visita": "primera", "Profesional": "PROF-REU-001",
         "Peso": "92", "Talla": "175", "IMC": "30.0", "TA": "150/95",
         "Comorbilidad_HTA": "SI", "Comorbilidad_DLP": "SI", "Comorbilidad_Obesidad": "SI",
         "FR": "Positivo", "APCC": "Positivo", "ANA": "Positivo",
         "NAD_Total": "14", "NAT_Total": "12", "NAD28": "12", "NAT28": "10",
         "EVA_Global": "88", "EVA_Dolor": "90", "EVA_Medico": "85",
         "PCR": "22", "VSG": "55",
         "DAS28_CRP_Result": "7.1", "DAS28_ESR_Result": "7.3",
         "CDAI_Result": "38", "SDAI_Result": "42",
         "RAPID3_Score": "22", "RAPID3_Categoria": "Alta actividad", "HAQ_Total": "2.2",
         "Tratamiento_Actual": "Metotrexato 20 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-02-20",
         "Decision_Terapeutica_PV": "iniciar", "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-06-25", "Fecha_Diagnostico": "2026-01-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "Vacunacion_Revisada": "SI", "Vacunacion_OK": "NO",
         "Vacunas_Pendientes": "Neumococo; VHB; Gripe",
        },
        {"Fecha_Visita": "2026-06-25", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "12", "NAT_Total": "10", "NAD28": "10", "NAT28": "9",
         "EVA_Global": "75", "EVA_Dolor": "78", "EVA_Medico": "72",
         "PCR": "16", "VSG": "45",
         "DAS28_CRP_Result": "6.5", "DAS28_ESR_Result": "6.7",
         "CDAI_Result": "34", "SDAI_Result": "38",
         "RAPID3_Score": "18", "RAPID3_Categoria": "Alta actividad", "HAQ_Total": "1.9",
         "Tratamiento_Actual": "Metotrexato 20 mg/semana + Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-06-25",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Actividad alta persistente",
         "Cambio_Biologico_Farmaco": "Adalimumab", "Cambio_Biologico_Dosis": "40 mg/14d",
         "Fecha_Proxima_Revision": "2026-11-20",
         "Comentarios_Adicionales": "Inicio anti-TNF. Respuesta muy parcial.", "Fecha_Diagnostico": "2026-01-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
        },
        {"Fecha_Visita": "2026-11-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "11", "NAT_Total": "9", "NAD28": "9", "NAT28": "8",
         "EVA_Global": "70", "EVA_Dolor": "72", "EVA_Medico": "68",
         "PCR": "14", "VSG": "40",
         "DAS28_CRP_Result": "6.0", "DAS28_ESR_Result": "6.2",
         "CDAI_Result": "30", "SDAI_Result": "34",
         "RAPID3_Score": "16", "RAPID3_Categoria": "Alta actividad", "HAQ_Total": "1.7",
         "Tratamiento_Actual": "Metotrexato 20 mg/semana + Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-06-25",
         "Decision_Terapeutica": "continuar", "Cambio_Efectos_Adversos": "NO",
         "Fecha_Proxima_Revision": "2027-04-15",
         "Comentarios_Adicionales": "Persistencia de alta actividad. Valorar cambio de biológico.",
         "Fecha_Diagnostico": "2026-01-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
        },
    ]
    for payload in ar5:
        row = base_visit_row(headers, *ar5_base)
        apply_payload_to_row(row, payload)
        rows["AR"].append(row)

    # AR — DEMO-AR-006: Comorbilidad cardiovascular relevante (4 visitas)
    ar6_base = ("DEMO-AR-006", "Paciente Demo AR 006", "F", "ar")
    ar6 = [
        {"Fecha_Visita": "2026-01-12", "Tipo_Visita": "primera", "Profesional": "PROF-REU-001",
         "Peso": "65", "Talla": "160", "IMC": "25.4", "TA": "140/88",
         "Comorbilidad_HTA": "SI", "Comorbilidad_ECV": "SI", "Comorbilidad_DLP": "SI",
         "FR": "Positivo", "APCC": "Positivo",
         "NAD_Total": "9", "NAT_Total": "7", "NAD28": "7", "NAT28": "6",
         "EVA_Global": "70", "EVA_Dolor": "72", "EVA_Medico": "65",
         "PCR": "13", "VSG": "38",
         "DAS28_CRP_Result": "5.5", "DAS28_ESR_Result": "5.7",
         "CDAI_Result": "24", "SDAI_Result": "28",
         "RAPID3_Score": "14", "RAPID3_Categoria": "Actividad moderada-alta", "HAQ_Total": "1.6",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-01-12",
         "Decision_Terapeutica_PV": "iniciar", "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-05-20", "Fecha_Diagnostico": "2025-09-28",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-05-10",
         "Profesional_Validador": "PROF-REU-001", "Decision_Clinica_Manual": "SI",
         "Hemograma_Solicitado": "SI", "Bioquimica_Solicitada": "SI",
         "Serologias_Solicitadas": "SI", "Vacunacion_Revisada": "SI", "Vacunacion_OK": "SI",
        },
        {"Fecha_Visita": "2026-05-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "6", "NAT_Total": "4", "NAD28": "4", "NAT28": "3",
         "EVA_Global": "50", "EVA_Dolor": "52", "EVA_Medico": "45",
         "PCR": "8", "VSG": "26",
         "DAS28_CRP_Result": "4.2", "DAS28_ESR_Result": "4.4",
         "CDAI_Result": "16", "SDAI_Result": "18",
         "RAPID3_Score": "10", "RAPID3_Categoria": "Actividad moderada", "HAQ_Total": "1.1",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana + Abatacept 125 mg/semana SC",
         "Fecha_Inicio_Tratamiento": "2026-05-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Respuesta insuficiente",
         "Cambio_Biologico_Farmaco": "Abatacept", "Cambio_Biologico_Dosis": "125 mg/semana SC",
         "Fecha_Proxima_Revision": "2026-10-10",
         "Comentarios_Adicionales": "Inicio Abatacept. Considerar perfil CV.", "Fecha_Diagnostico": "2025-09-28",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-05-10",
        },
        {"Fecha_Visita": "2026-10-10", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "3", "NAT_Total": "2", "NAD28": "2", "NAT28": "1",
         "EVA_Global": "32", "EVA_Dolor": "30", "EVA_Medico": "28",
         "PCR": "4", "VSG": "16",
         "DAS28_CRP_Result": "3.0", "DAS28_ESR_Result": "3.2",
         "CDAI_Result": "10", "SDAI_Result": "11",
         "RAPID3_Score": "6", "RAPID3_Categoria": "Baja actividad", "HAQ_Total": "0.6",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana + Abatacept 125 mg/semana SC",
         "Fecha_Inicio_Tratamiento": "2026-05-20",
         "Decision_Terapeutica": "continuar", "Cambio_Efectos_Adversos": "NO",
         "Fecha_Proxima_Revision": "2027-02-15",
         "Comentarios_Adicionales": "Buena respuesta. Perfil CV estable.", "Fecha_Diagnostico": "2025-09-28",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-05-10",
        },
        {"Fecha_Visita": "2027-02-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-001",
         "NAD_Total": "1", "NAT_Total": "0", "NAD28": "1", "NAT28": "0",
         "EVA_Global": "14", "EVA_Dolor": "12", "EVA_Medico": "10",
         "PCR": "2", "VSG": "10",
         "DAS28_CRP_Result": "2.2", "DAS28_ESR_Result": "2.3",
         "CDAI_Result": "4", "SDAI_Result": "5",
         "RAPID3_Score": "3", "RAPID3_Categoria": "Remisión/baja actividad", "HAQ_Total": "0.3",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana + Abatacept 125 mg/semana SC",
         "Fecha_Inicio_Tratamiento": "2026-05-20",
         "Decision_Terapeutica": "continuar", "Cambio_Efectos_Adversos": "NO",
         "Fecha_Proxima_Revision": "2027-07-20",
         "Comentarios_Adicionales": "Remisión clínica mantenida.", "Fecha_Diagnostico": "2025-09-28",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-05-10",
        },
    ]
    for payload in ar6:
        row = base_visit_row(headers, *ar6_base)
        apply_payload_to_row(row, payload)
        rows["AR"].append(row)

    # ESPA — DEMO-ESPA-001 (4 visitas)
    espa_base = ("DEMO-ESPA-001", "Paciente Demo ESPA", "M", "espa")
    espa_visits = [
        {
            "Fecha_Visita": "2026-01-20",
            "Tipo_Visita": "primera",
            "Profesional": "PROF-REU-002",
            "Peso": "82",
            "Talla": "178",
            "IMC": "25.9",
            "TA": "124/78",
            "Comorbilidad_HTA": "NO",
            "Comorbilidad_DLP": "NO",
            "HLA_B27": "Positivo",
            "FR": "Negativo",
            "APCC": "Negativo",
            "NAD_Total": "4",
            "NAT_Total": "3",
            "Dactilitis_Total": "1",
            "EVA_Global": "80",
            "EVA_Dolor": "84",
            "PCR": "14",
            "VSG": "48",
            "BASDAI_Result": "7.2",
            "ASDAS_CRP_Result": "3.8",
            "ASDAS_ESR_Result": "3.9",
            "Tratamiento_Actual": "Naproxeno 500 mg/12h + Sulfasalazina 2 g/día",
            "Fecha_Inicio_Tratamiento": "2026-01-20",
            "Decision_Terapeutica_PV": "iniciar",
            "Decision_Terapeutica": "iniciar",
            "Fecha_Proxima_Revision": "2026-05-25",
            "Comentarios_Adicionales": "Inicio tratamiento sintético.",
            "Fecha_Diagnostico": "2025-11-30",
            "Estado_Prebiologico_Final": "EN_CURSO",
            "Hemograma_Solicitado": "SI",
            "Bioquimica_Solicitada": "SI",
            "Serologias_Solicitadas": "SI",
            "IGRA_Mantoux_Solicitado": "SI",
            "IGRA_Mantoux_Tipo": "Quantiferon",
            "Rx_Torax_Solicitada": "SI",
            "Vacunacion_Revisada": "SI",
            "Vacunacion_OK": "ND",
            "Vacunas_Pendientes": "Neumococo",
        },
        {
            "Fecha_Visita": "2026-05-25",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-002",
            "NAD_Total": "3",
            "NAT_Total": "2",
            "Dactilitis_Total": "1",
            "EVA_Global": "68",
            "EVA_Dolor": "70",
            "PCR": "10",
            "VSG": "36",
            "BASDAI_Result": "6.1",
            "ASDAS_CRP_Result": "3.0",
            "ASDAS_ESR_Result": "3.1",
            "Tratamiento_Actual": "Secukinumab 150 mg/mes + Sulfasalazina 2 g/día",
            "Fecha_Inicio_Tratamiento": "2026-05-25",
            "Decision_Terapeutica": "cambiar",
            "Cambio_Motivo": "Persistencia de actividad",
            "Cambio_Biologico_Farmaco": "Secukinumab",
            "Cambio_Biologico_Dosis": "150 mg/mes",
            "Fecha_Proxima_Revision": "2026-09-20",
            "Comentarios_Adicionales": "Inicio biológico ficticio.",
            "Fecha_Diagnostico": "2025-11-30",
            "Estado_Prebiologico_Final": "EN_CURSO",
            "Hemograma_Recibido": "SI",
            "Hemograma_Correcto": "SI",
            "Bioquimica_Recibida": "SI",
            "Bioquimica_Correcta": "SI",
            "Serologias_Recibidas": "SI",
            "Serologias_Correctas": "SI",
            "IGRA_Mantoux_Recibido": "SI",
            "IGRA_Mantoux_Resultado": "NEGATIVO",
            "Rx_Torax_Recibida": "SI",
            "Rx_Torax_Correcta": "SI",
            "Vacunacion_OK": "NO",
            "Medicina_Preventiva_Requiere_Derivacion": "SI",
            "Medicina_Preventiva_Derivada": "SI",
            "Medicina_Preventiva_Fecha_Derivacion": "2026-05-18",
        },
        {
            "Fecha_Visita": "2026-09-20",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-002",
            "NAD_Total": "2",
            "NAT_Total": "1",
            "Dactilitis_Total": "0",
            "EVA_Global": "44",
            "EVA_Dolor": "42",
            "PCR": "5",
            "VSG": "22",
            "BASDAI_Result": "3.4",
            "ASDAS_CRP_Result": "2.0",
            "ASDAS_ESR_Result": "2.1",
            "Tratamiento_Actual": "Secukinumab 150 mg/mes",
            "Fecha_Inicio_Tratamiento": "2026-05-25",
            "Decision_Terapeutica": "continuar",
            "Cambio_Efectos_Adversos": "NO",
            "Fecha_Proxima_Revision": "2027-01-25",
            "Comentarios_Adicionales": "Respuesta favorable.",
            "Fecha_Diagnostico": "2025-11-30",
            "Estado_Prebiologico_Final": "EN_CURSO",
            "Vacunacion_Revisada": "SI",
            "Vacunacion_OK": "SI",
        },
        {
            "Fecha_Visita": "2027-01-25",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-002",
            "NAD_Total": "1",
            "NAT_Total": "1",
            "Dactilitis_Total": "0",
            "EVA_Global": "18",
            "EVA_Dolor": "16",
            "PCR": "2",
            "VSG": "12",
            "BASDAI_Result": "1.9",
            "ASDAS_CRP_Result": "1.2",
            "ASDAS_ESR_Result": "1.3",
            "Tratamiento_Actual": "Secukinumab 150 mg/mes",
            "Fecha_Inicio_Tratamiento": "2026-05-25",
            "Decision_Terapeutica": "continuar",
            "Fecha_Proxima_Revision": "2027-05-30",
            "Comentarios_Adicionales": "Baja actividad/remisión clínica.",
            "Fecha_Diagnostico": "2025-11-30",
            "Estado_Prebiologico_Final": "EN_CURSO",
            "Vacunacion_Revisada": "SI",
            "Vacunacion_OK": "SI",
        },
    ]
    for payload in espa_visits:
        row = base_visit_row(headers, *espa_base)
        apply_payload_to_row(row, payload)
        rows["ESPA"].append(row)

    # ESPA — DEMO-ESPA-002: Baja actividad estable, no biológico (3 visitas)
    espa2_base = ("DEMO-ESPA-002", "Paciente Demo ESPA 002", "M", "espa")
    espa2 = [
        {"Fecha_Visita": "2026-02-10", "Tipo_Visita": "primera", "Profesional": "PROF-REU-002",
         "Peso": "76", "Talla": "175", "IMC": "24.8", "TA": "120/76",
         "HLA_B27": "Positivo", "FR": "Negativo",
         "NAD_Total": "2", "NAT_Total": "1", "Dactilitis_Total": "0",
         "EVA_Global": "32", "EVA_Dolor": "30",
         "PCR": "4", "VSG": "16",
         "BASDAI_Result": "2.8", "ASDAS_CRP_Result": "1.6",
         "Tratamiento_Actual": "Naproxeno 500 mg/12h",
         "Fecha_Inicio_Tratamiento": "2026-02-10",
         "Decision_Terapeutica_PV": "iniciar", "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-06-20", "Fecha_Diagnostico": "2025-08-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
        },
        {"Fecha_Visita": "2026-06-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "1", "NAT_Total": "1", "Dactilitis_Total": "0",
         "EVA_Global": "24", "EVA_Dolor": "22",
         "PCR": "3", "VSG": "12",
         "BASDAI_Result": "2.4", "ASDAS_CRP_Result": "1.3",
         "Tratamiento_Actual": "Naproxeno 500 mg/12h",
         "Fecha_Inicio_Tratamiento": "2026-02-10",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2026-11-15", "Fecha_Diagnostico": "2025-08-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
        },
        {"Fecha_Visita": "2026-11-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "1", "NAT_Total": "0", "Dactilitis_Total": "0",
         "EVA_Global": "18", "EVA_Dolor": "16",
         "PCR": "2", "VSG": "10",
         "BASDAI_Result": "2.1", "ASDAS_CRP_Result": "1.1",
         "Tratamiento_Actual": "Naproxeno 500 mg/12h",
         "Fecha_Inicio_Tratamiento": "2026-02-10",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-04-10",
         "Comentarios_Adicionales": "Baja actividad mantenida con AINE.", "Fecha_Diagnostico": "2025-08-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
        },
    ]
    for payload in espa2:
        row = base_visit_row(headers, *espa2_base)
        apply_payload_to_row(row, payload)
        rows["ESPA"].append(row)

    # ESPA — DEMO-ESPA-003: Brote intercurrente con escalada (4 visitas)
    espa3_base = ("DEMO-ESPA-003", "Paciente Demo ESPA 003", "F", "espa")
    espa3 = [
        {"Fecha_Visita": "2026-01-25", "Tipo_Visita": "primera", "Profesional": "PROF-REU-002",
         "Peso": "63", "Talla": "164", "IMC": "23.4", "TA": "122/74",
         "HLA_B27": "Positivo", "FR": "Negativo",
         "NAD_Total": "3", "NAT_Total": "2", "Dactilitis_Total": "1",
         "EVA_Global": "40", "EVA_Dolor": "38",
         "PCR": "6", "VSG": "22",
         "BASDAI_Result": "3.2", "ASDAS_CRP_Result": "2.0",
         "Tratamiento_Actual": "Sulfasalazina 2 g/día",
         "Fecha_Inicio_Tratamiento": "2026-01-25",
         "Decision_Terapeutica_PV": "iniciar", "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-05-30", "Fecha_Diagnostico": "2025-11-01",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "Hemograma_Solicitado": "SI", "Bioquimica_Solicitada": "SI",
         "Serologias_Solicitadas": "SI", "Vacunacion_Revisada": "SI",
        },
        {"Fecha_Visita": "2026-05-30", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "2", "NAT_Total": "1", "Dactilitis_Total": "0",
         "EVA_Global": "32", "EVA_Dolor": "30",
         "PCR": "5", "VSG": "18",
         "BASDAI_Result": "2.8", "ASDAS_CRP_Result": "1.8",
         "Tratamiento_Actual": "Sulfasalazina 2 g/día",
         "Fecha_Inicio_Tratamiento": "2026-01-25",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2026-10-15", "Fecha_Diagnostico": "2025-11-01",
         "Estado_Prebiologico_Final": "EN_CURSO",
        },
        {"Fecha_Visita": "2026-10-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "6", "NAT_Total": "4", "Dactilitis_Total": "2",
         "EVA_Global": "72", "EVA_Dolor": "75",
         "PCR": "12", "VSG": "36",
         "BASDAI_Result": "6.5", "ASDAS_CRP_Result": "3.2",
         "Tratamiento_Actual": "Sulfasalazina 2 g/día + Secukinumab 150 mg/mes",
         "Fecha_Inicio_Tratamiento": "2026-10-15",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Brote clínico intercurrente",
         "Cambio_Biologico_Farmaco": "Secukinumab", "Cambio_Biologico_Dosis": "150 mg/mes",
         "Fecha_Proxima_Revision": "2027-02-20",
         "Comentarios_Adicionales": "Brote agudo articular y dactilitis.", "Fecha_Diagnostico": "2025-11-01",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "Hemograma_Recibido": "SI", "Bioquimica_Recibida": "SI",
         "Serologias_Recibidas": "SI", "IGRA_Mantoux_Resultado": "NEGATIVO",
        },
        {"Fecha_Visita": "2027-02-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "3", "NAT_Total": "2", "Dactilitis_Total": "0",
         "EVA_Global": "38", "EVA_Dolor": "36",
         "PCR": "5", "VSG": "18",
         "BASDAI_Result": "3.0", "ASDAS_CRP_Result": "1.7",
         "Tratamiento_Actual": "Sulfasalazina 2 g/día + Secukinumab 150 mg/mes",
         "Fecha_Inicio_Tratamiento": "2026-10-15",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-07-15",
         "Comentarios_Adicionales": "Respuesta favorable tras brote resuelto.", "Fecha_Diagnostico": "2025-11-01",
         "Estado_Prebiologico_Final": "EN_CURSO",
        },
    ]
    for payload in espa3:
        row = base_visit_row(headers, *espa3_base)
        apply_payload_to_row(row, payload)
        rows["ESPA"].append(row)

    # ESPA — DEMO-ESPA-004: Cambio de biológico (5 visitas)
    espa4_base = ("DEMO-ESPA-004", "Paciente Demo ESPA 004", "M", "espa")
    espa4 = [
        {"Fecha_Visita": "2026-01-05", "Tipo_Visita": "primera", "Profesional": "PROF-REU-002",
         "Peso": "84", "Talla": "180", "IMC": "25.9", "TA": "130/82",
         "HLA_B27": "Positivo", "FR": "Negativo",
         "NAD_Total": "6", "NAT_Total": "4", "Dactilitis_Total": "1",
         "EVA_Global": "78", "EVA_Dolor": "80",
         "PCR": "16", "VSG": "42",
         "BASDAI_Result": "7.5", "ASDAS_CRP_Result": "3.6",
         "Tratamiento_Actual": "Naproxeno 500 mg/12h",
         "Fecha_Inicio_Tratamiento": "2026-01-05",
         "Decision_Terapeutica_PV": "iniciar", "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-04-20", "Fecha_Diagnostico": "2025-07-22",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-03-28",
         "Profesional_Validador": "PROF-REU-002",
         "Vacunacion_Revisada": "SI", "Vacunacion_OK": "SI",
        },
        {"Fecha_Visita": "2026-04-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "4", "NAT_Total": "3", "Dactilitis_Total": "1",
         "EVA_Global": "65", "EVA_Dolor": "68",
         "PCR": "10", "VSG": "32",
         "BASDAI_Result": "5.8", "ASDAS_CRP_Result": "2.8",
         "Tratamiento_Actual": "Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-04-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Alta actividad inicial",
         "Cambio_Biologico_Farmaco": "Adalimumab", "Cambio_Biologico_Dosis": "40 mg/14d",
         "Fecha_Proxima_Revision": "2026-08-15", "Fecha_Diagnostico": "2025-07-22",
         "Estado_Prebiologico_Final": "APTO",
        },
        {"Fecha_Visita": "2026-08-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "3", "NAT_Total": "2", "Dactilitis_Total": "0",
         "EVA_Global": "52", "EVA_Dolor": "50",
         "PCR": "7", "VSG": "24",
         "BASDAI_Result": "4.2", "ASDAS_CRP_Result": "2.1",
         "Tratamiento_Actual": "Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-04-20",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2026-12-20", "Fecha_Diagnostico": "2025-07-22",
         "Estado_Prebiologico_Final": "APTO",
        },
        {"Fecha_Visita": "2026-12-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "3", "NAT_Total": "2", "Dactilitis_Total": "0",
         "EVA_Global": "44", "EVA_Dolor": "42",
         "PCR": "6", "VSG": "20",
         "BASDAI_Result": "3.5", "ASDAS_CRP_Result": "1.8",
         "Tratamiento_Actual": "Ixekizumab 80 mg/4s",
         "Fecha_Inicio_Tratamiento": "2026-12-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Respuesta insuficiente a anti-TNF",
         "Cambio_Biologico_Farmaco": "Ixekizumab", "Cambio_Biologico_Dosis": "80 mg/4s",
         "Fecha_Proxima_Revision": "2027-05-10",
         "Comentarios_Adicionales": "Rotación a anti-IL17 por pérdida de respuesta.",
         "Fecha_Diagnostico": "2025-07-22", "Estado_Prebiologico_Final": "APTO",
        },
        {"Fecha_Visita": "2027-05-10", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "1", "NAT_Total": "1", "Dactilitis_Total": "0",
         "EVA_Global": "24", "EVA_Dolor": "22",
         "PCR": "3", "VSG": "12",
         "BASDAI_Result": "2.5", "ASDAS_CRP_Result": "1.3",
         "Tratamiento_Actual": "Ixekizumab 80 mg/4s",
         "Fecha_Inicio_Tratamiento": "2026-12-20",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-10-20",
         "Comentarios_Adicionales": "Buena respuesta a anti-IL17.", "Fecha_Diagnostico": "2025-07-22",
         "Estado_Prebiologico_Final": "APTO",
        },
    ]
    for payload in espa4:
        row = base_visit_row(headers, *espa4_base)
        apply_payload_to_row(row, payload)
        rows["ESPA"].append(row)

    # ESPA — DEMO-ESPA-005: Actividad moderada persistente (3 visitas)
    espa5_base = ("DEMO-ESPA-005", "Paciente Demo ESPA 005", "F", "espa")
    espa5 = [
        {"Fecha_Visita": "2026-03-05", "Tipo_Visita": "primera", "Profesional": "PROF-REU-002",
         "Peso": "58", "Talla": "160", "IMC": "22.7", "TA": "115/70",
         "HLA_B27": "Positivo", "FR": "Negativo",
         "NAD_Total": "4", "NAT_Total": "3", "Dactilitis_Total": "1",
         "EVA_Global": "58", "EVA_Dolor": "60",
         "PCR": "9", "VSG": "28",
         "BASDAI_Result": "5.2", "ASDAS_CRP_Result": "2.6",
         "Tratamiento_Actual": "Sulfasalazina 2 g/día",
         "Fecha_Inicio_Tratamiento": "2026-03-05",
         "Decision_Terapeutica_PV": "iniciar", "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-07-25", "Fecha_Diagnostico": "2025-10-05",
         "Estado_Prebiologico_Final": "NO_APTO", "Fecha_Validacion_Prebiologico": "2026-03-02",
         "Vacunacion_Revisada": "SI", "Vacunacion_OK": "NO",
        },
        {"Fecha_Visita": "2026-07-25", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "3", "NAT_Total": "2", "Dactilitis_Total": "1",
         "EVA_Global": "50", "EVA_Dolor": "52",
         "PCR": "7", "VSG": "22",
         "BASDAI_Result": "4.8", "ASDAS_CRP_Result": "2.5",
         "Tratamiento_Actual": "Sulfasalazina 2 g/día + Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-07-25",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Actividad moderada persistente",
         "Cambio_Biologico_Farmaco": "Adalimumab", "Cambio_Biologico_Dosis": "40 mg/14d",
         "Fecha_Proxima_Revision": "2027-01-15", "Fecha_Diagnostico": "2025-10-05",
         "Estado_Prebiologico_Final": "NO_APTO",
        },
        {"Fecha_Visita": "2027-01-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "3", "NAT_Total": "2", "Dactilitis_Total": "0",
         "EVA_Global": "46", "EVA_Dolor": "48",
         "PCR": "7", "VSG": "20",
         "BASDAI_Result": "4.5", "ASDAS_CRP_Result": "2.3",
         "Tratamiento_Actual": "Sulfasalazina 2 g/día + Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-07-25",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-07-20",
         "Comentarios_Adicionales": "Respuesta parcial. Actividad moderada persistente.",
         "Fecha_Diagnostico": "2025-10-05", "Estado_Prebiologico_Final": "NO_APTO",
        },
    ]
    for payload in espa5:
        row = base_visit_row(headers, *espa5_base)
        apply_payload_to_row(row, payload)
        rows["ESPA"].append(row)

    # ESPA — DEMO-ESPA-006: Manifestación extraarticular (uveítis) (4 visitas)
    espa6_base = ("DEMO-ESPA-006", "Paciente Demo ESPA 006", "M", "espa")
    espa6 = [
        {"Fecha_Visita": "2026-02-15", "Tipo_Visita": "primera", "Profesional": "PROF-REU-002",
         "Peso": "78", "Talla": "176", "IMC": "25.2", "TA": "128/80",
         "HLA_B27": "Positivo", "FR": "Negativo",
         "NAD_Total": "5", "NAT_Total": "3", "Dactilitis_Total": "0",
         "EVA_Global": "72", "EVA_Dolor": "70",
         "PCR": "14", "VSG": "40",
         "BASDAI_Result": "6.0", "ASDAS_CRP_Result": "3.1",
         "Tratamiento_Actual": "Naproxeno 500 mg/12h",
         "Fecha_Inicio_Tratamiento": "2026-02-15",
         "Decision_Terapeutica_PV": "iniciar", "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-06-20",
         "Comentarios_Adicionales": "EspA activa con uveítis anterior recurrente.",
         "Fecha_Diagnostico": "2025-09-12",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-06-05",
         "Vacunacion_Revisada": "SI", "Vacunacion_OK": "SI",
        },
        {"Fecha_Visita": "2026-06-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "3", "NAT_Total": "2", "Dactilitis_Total": "0",
         "EVA_Global": "55", "EVA_Dolor": "52",
         "PCR": "8", "VSG": "26",
         "BASDAI_Result": "4.5", "ASDAS_CRP_Result": "2.3",
         "Tratamiento_Actual": "Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-06-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Actividad articular + uveítis recurrente",
         "Cambio_Biologico_Farmaco": "Adalimumab", "Cambio_Biologico_Dosis": "40 mg/14d",
         "Fecha_Proxima_Revision": "2026-11-15",
         "Comentarios_Adicionales": "Inicio anti-TNF indicado por manifestación ocular.",
         "Fecha_Diagnostico": "2025-09-12", "Estado_Prebiologico_Final": "APTO",
        },
        {"Fecha_Visita": "2026-11-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "2", "NAT_Total": "1", "Dactilitis_Total": "0",
         "EVA_Global": "38", "EVA_Dolor": "36",
         "PCR": "4", "VSG": "18",
         "BASDAI_Result": "3.2", "ASDAS_CRP_Result": "1.6",
         "Tratamiento_Actual": "Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-06-20",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-04-20",
         "Comentarios_Adicionales": "Buena respuesta articular y ocular.", "Fecha_Diagnostico": "2025-09-12",
         "Estado_Prebiologico_Final": "APTO",
        },
        {"Fecha_Visita": "2027-04-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-002",
         "NAD_Total": "1", "NAT_Total": "0", "Dactilitis_Total": "0",
         "EVA_Global": "18", "EVA_Dolor": "16",
         "PCR": "2", "VSG": "10",
         "BASDAI_Result": "2.0", "ASDAS_CRP_Result": "1.0",
         "Tratamiento_Actual": "Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-06-20",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-10-10",
         "Comentarios_Adicionales": "Remisión clínica articular y ocular.", "Fecha_Diagnostico": "2025-09-12",
         "Estado_Prebiologico_Final": "APTO",
        },
    ]
    for payload in espa6:
        row = base_visit_row(headers, *espa6_base)
        apply_payload_to_row(row, payload)
        rows["ESPA"].append(row)

    # APS — DEMO-APS-001 (4 visitas)
    aps_base = ("DEMO-APS-001", "Paciente Demo APS", "F", "aps")
    aps_visits = [
        {
            "Fecha_Visita": "2026-02-05",
            "Tipo_Visita": "primera",
            "Profesional": "PROF-REU-003",
            "Peso": "76",
            "Talla": "168",
            "IMC": "26.9",
            "TA": "128/80",
            "Comorbilidad_HTA": "SI",
            "Comorbilidad_DLP": "SI",
            "HLA_B27": "Negativo",
            "FR": "Negativo",
            "APCC": "Negativo",
            "NAD_Total": "9",
            "NAT_Total": "8",
            "Dactilitis_Total": "2",
            "EVA_Global": "72",
            "EVA_Dolor": "76",
            "PCR": "13",
            "VSG": "34",
            "HAQ_Total": "1.7",
            "RAPID3_Score": "16",
            "LEI_Score": "5",
            "PASI_Score": "9.5",
            "BSA_Percentage": "14",
            "Tratamiento_Actual": "Metotrexato 20 mg/semana",
            "Fecha_Inicio_Tratamiento": "2026-02-05",
            "Decision_Terapeutica": "iniciar",
            "Fecha_Proxima_Revision": "2026-06-10",
            "Comentarios_Adicionales": "Actividad articular y cutánea alta.",
            "Fecha_Diagnostico": "2025-12-10",
            "Estado_Prebiologico_Final": "APTO",
            "Fecha_Validacion_Prebiologico": "2026-05-28",
            "Vacunacion_Revisada": "SI",
            "Vacunacion_OK": "SI",
        },
        {
            "Fecha_Visita": "2026-06-10",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-003",
            "NAD_Total": "6",
            "NAT_Total": "5",
            "Dactilitis_Total": "1",
            "EVA_Global": "55",
            "EVA_Dolor": "56",
            "PCR": "8",
            "VSG": "28",
            "HAQ_Total": "1.1",
            "RAPID3_Score": "12",
            "LEI_Score": "3",
            "PASI_Score": "6.2",
            "BSA_Percentage": "9",
            "Tratamiento_Actual": "Metotrexato 20 mg/semana + Adalimumab 40 mg/14d",
            "Fecha_Inicio_Tratamiento": "2026-06-10",
            "Decision_Terapeutica": "cambiar",
            "Cambio_Motivo": "Control incompleto",
            "Cambio_Biologico_Farmaco": "Adalimumab",
            "Cambio_Biologico_Dosis": "40 mg/14d",
            "Fecha_Proxima_Revision": "2026-10-20",
            "Comentarios_Adicionales": "Añadido biológico por actividad persistente.",
            "Fecha_Diagnostico": "2025-12-10",
            "Estado_Prebiologico_Final": "APTO",
            "Fecha_Validacion_Prebiologico": "2026-05-28",
        },
        {
            "Fecha_Visita": "2026-10-20",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-003",
            "NAD_Total": "3",
            "NAT_Total": "2",
            "Dactilitis_Total": "0",
            "EVA_Global": "30",
            "EVA_Dolor": "28",
            "PCR": "4",
            "VSG": "18",
            "HAQ_Total": "0.7",
            "RAPID3_Score": "7",
            "LEI_Score": "1",
            "PASI_Score": "3.0",
            "BSA_Percentage": "4",
            "Tratamiento_Actual": "Metotrexato 15 mg/semana + Adalimumab 40 mg/14d",
            "Fecha_Inicio_Tratamiento": "2026-06-10",
            "Decision_Terapeutica": "continuar",
            "Fecha_Proxima_Revision": "2027-02-20",
            "Comentarios_Adicionales": "Mejoría clínica sostenida.",
            "Fecha_Diagnostico": "2025-12-10",
            "Estado_Prebiologico_Final": "APTO",
            "Fecha_Validacion_Prebiologico": "2026-05-28",
        },
        {
            "Fecha_Visita": "2027-02-20",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-003",
            "NAD_Total": "1",
            "NAT_Total": "1",
            "Dactilitis_Total": "0",
            "EVA_Global": "16",
            "EVA_Dolor": "14",
            "PCR": "2",
            "VSG": "10",
            "HAQ_Total": "0.3",
            "RAPID3_Score": "3",
            "LEI_Score": "0",
            "PASI_Score": "1.2",
            "BSA_Percentage": "1",
            "Tratamiento_Actual": "Metotrexato 10 mg/semana + Adalimumab 40 mg/14d",
            "Fecha_Inicio_Tratamiento": "2026-06-10",
            "Decision_Terapeutica": "continuar",
            "Fecha_Proxima_Revision": "2027-06-25",
            "Comentarios_Adicionales": "Baja actividad/remisión funcional.",
            "Fecha_Diagnostico": "2025-12-10",
            "Estado_Prebiologico_Final": "APTO",
            "Fecha_Validacion_Prebiologico": "2026-05-28",
        },
    ]
    for payload in aps_visits:
        row = base_visit_row(headers, *aps_base)
        apply_payload_to_row(row, payload)
        rows["APS"].append(row)

    # APS — DEMO-APS-002: Psoriasis cutánea significativa (4 visitas)
    aps2_base = ("DEMO-APS-002", "Paciente Demo APS 002", "M", "aps")
    aps2 = [
        {"Fecha_Visita": "2026-02-10", "Tipo_Visita": "primera", "Profesional": "PROF-REU-003",
         "Peso": "85", "Talla": "178", "IMC": "26.8", "TA": "130/84",
         "Comorbilidad_HTA": "SI",
         "NAD_Total": "8", "NAT_Total": "6", "Dactilitis_Total": "1",
         "EVA_Global": "72", "EVA_Dolor": "70", "PCR": "10", "VSG": "30",
         "HAQ_Total": "1.6", "RAPID3_Score": "14", "LEI_Score": "4",
         "PASI_Score": "18", "BSA_Percentage": "25",
         "Tratamiento_Actual": "Metotrexato 20 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-02-10",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-06-20",
         "Comentarios_Adicionales": "Psoriasis extensa con artritis.", "Fecha_Diagnostico": "2025-12-01",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-06-05",
         "Vacunacion_Revisada": "SI", "Vacunacion_OK": "SI",
        },
        {"Fecha_Visita": "2026-06-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "5", "NAT_Total": "3", "Dactilitis_Total": "1",
         "EVA_Global": "55", "EVA_Dolor": "52", "PCR": "7", "VSG": "22",
         "HAQ_Total": "1.1", "RAPID3_Score": "10", "LEI_Score": "2",
         "PASI_Score": "12", "BSA_Percentage": "15",
         "Tratamiento_Actual": "Metotrexato 20 mg/semana + Secukinumab 150 mg/mes",
         "Fecha_Inicio_Tratamiento": "2026-06-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Psoriasis extensa persistente",
         "Cambio_Biologico_Farmaco": "Secukinumab", "Cambio_Biologico_Dosis": "150 mg/mes",
         "Fecha_Proxima_Revision": "2026-11-15",
         "Comentarios_Adicionales": "Inicio anti-IL17 por componente cutáneo.", "Fecha_Diagnostico": "2025-12-01",
         "Estado_Prebiologico_Final": "APTO",
        },
        {"Fecha_Visita": "2026-11-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "3", "NAT_Total": "2", "Dactilitis_Total": "0",
         "EVA_Global": "34", "EVA_Dolor": "30", "PCR": "3", "VSG": "14",
         "HAQ_Total": "0.7", "RAPID3_Score": "6", "LEI_Score": "1",
         "PASI_Score": "6", "BSA_Percentage": "8",
         "Tratamiento_Actual": "Metotrexato 20 mg/semana + Secukinumab 150 mg/mes",
         "Fecha_Inicio_Tratamiento": "2026-06-20",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-04-20",
         "Comentarios_Adicionales": "Mejoría articular y cutánea notable.", "Fecha_Diagnostico": "2025-12-01",
         "Estado_Prebiologico_Final": "APTO",
        },
        {"Fecha_Visita": "2027-04-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "1", "NAT_Total": "0", "Dactilitis_Total": "0",
         "EVA_Global": "18", "EVA_Dolor": "16", "PCR": "2", "VSG": "8",
         "HAQ_Total": "0.3", "RAPID3_Score": "3", "LEI_Score": "0",
         "PASI_Score": "3", "BSA_Percentage": "3",
         "Tratamiento_Actual": "Secukinumab 150 mg/mes",
         "Fecha_Inicio_Tratamiento": "2027-04-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Remisión mantenida, retirar MTX",
         "Fecha_Proxima_Revision": "2027-10-15",
         "Comentarios_Adicionales": "Buena respuesta. Monoterapia biológica.",
         "Fecha_Diagnostico": "2025-12-01", "Estado_Prebiologico_Final": "APTO",
        },
    ]
    for payload in aps2:
        row = base_visit_row(headers, *aps2_base)
        apply_payload_to_row(row, payload)
        rows["APS"].append(row)

    # APS — DEMO-APS-003: Entesitis predominante (3 visitas)
    aps3_base = ("DEMO-APS-003", "Paciente Demo APS 003", "F", "aps")
    aps3 = [
        {"Fecha_Visita": "2026-03-15", "Tipo_Visita": "primera", "Profesional": "PROF-REU-003",
         "Peso": "67", "Talla": "165", "IMC": "24.6", "TA": "118/72",
         "NAD_Total": "5", "NAT_Total": "4", "Dactilitis_Total": "2",
         "EVA_Global": "60", "EVA_Dolor": "62", "PCR": "8", "VSG": "28",
         "HAQ_Total": "1.5", "RAPID3_Score": "12", "LEI_Score": "8",
         "PASI_Score": "5", "BSA_Percentage": "7",
         "Tratamiento_Actual": "Naproxeno 500 mg/12h",
         "Fecha_Inicio_Tratamiento": "2026-03-15",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-07-20", "Fecha_Diagnostico": "2025-11-10",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "Hemograma_Solicitado": "SI", "Bioquimica_Solicitada": "SI",
         "Vacunacion_Revisada": "SI",
        },
        {"Fecha_Visita": "2026-07-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "3", "NAT_Total": "2", "Dactilitis_Total": "1",
         "EVA_Global": "44", "EVA_Dolor": "42", "PCR": "5", "VSG": "18",
         "HAQ_Total": "1.0", "RAPID3_Score": "8", "LEI_Score": "5",
         "PASI_Score": "4", "BSA_Percentage": "5",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-07-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Entesitis persistente",
         "Fecha_Proxima_Revision": "2026-12-10",
         "Comentarios_Adicionales": "Inicio FAME por entesitis refractaria.", "Fecha_Diagnostico": "2025-11-10",
         "Estado_Prebiologico_Final": "EN_CURSO",
        },
        {"Fecha_Visita": "2026-12-10", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "1", "NAT_Total": "1", "Dactilitis_Total": "0",
         "EVA_Global": "24", "EVA_Dolor": "22", "PCR": "3", "VSG": "12",
         "HAQ_Total": "0.5", "RAPID3_Score": "4", "LEI_Score": "2",
         "PASI_Score": "2", "BSA_Percentage": "2",
         "Tratamiento_Actual": "Metotrexato 15 mg/semana + Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-12-10",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Entesitis aún activa con MTX",
         "Cambio_Biologico_Farmaco": "Adalimumab", "Cambio_Biologico_Dosis": "40 mg/14d",
         "Fecha_Proxima_Revision": "2027-05-15",
         "Comentarios_Adicionales": "Escalada a biológico por LEI persistente.", "Fecha_Diagnostico": "2025-11-10",
         "Estado_Prebiologico_Final": "EN_CURSO",
        },
    ]
    for payload in aps3:
        row = base_visit_row(headers, *aps3_base)
        apply_payload_to_row(row, payload)
        rows["APS"].append(row)

    # APS — DEMO-APS-004: Cambio FAME a biológico (4 visitas)
    aps4_base = ("DEMO-APS-004", "Paciente Demo APS 004", "M", "aps")
    aps4 = [
        {"Fecha_Visita": "2026-01-08", "Tipo_Visita": "primera", "Profesional": "PROF-REU-003",
         "Peso": "90", "Talla": "182", "IMC": "27.2", "TA": "138/86",
         "Comorbilidad_HTA": "SI", "Comorbilidad_DLP": "SI",
         "NAD_Total": "12", "NAT_Total": "10", "Dactilitis_Total": "3",
         "EVA_Global": "78", "EVA_Dolor": "80", "PCR": "14", "VSG": "38",
         "HAQ_Total": "1.8", "RAPID3_Score": "18", "LEI_Score": "6",
         "PASI_Score": "12", "BSA_Percentage": "16",
         "Tratamiento_Actual": "Leflunomida 20 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-01-08",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-05-25", "Fecha_Diagnostico": "2025-08-20",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-04-28",
         "Vacunacion_Revisada": "SI", "Vacunacion_OK": "SI",
        },
        {"Fecha_Visita": "2026-05-25", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "9", "NAT_Total": "7", "Dactilitis_Total": "2",
         "EVA_Global": "62", "EVA_Dolor": "64", "PCR": "10", "VSG": "28",
         "HAQ_Total": "1.3", "RAPID3_Score": "14", "LEI_Score": "4",
         "PASI_Score": "8", "BSA_Percentage": "11",
         "Tratamiento_Actual": "Leflunomida 20 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-01-08",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2026-10-10",
         "Comentarios_Adicionales": "Mejoría leve. Respuesta insuficiente a monoterapia.",
         "Fecha_Diagnostico": "2025-08-20", "Estado_Prebiologico_Final": "APTO",
        },
        {"Fecha_Visita": "2026-10-10", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "5", "NAT_Total": "3", "Dactilitis_Total": "1",
         "EVA_Global": "42", "EVA_Dolor": "40", "PCR": "5", "VSG": "18",
         "HAQ_Total": "0.9", "RAPID3_Score": "8", "LEI_Score": "2",
         "PASI_Score": "4", "BSA_Percentage": "6",
         "Tratamiento_Actual": "Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-10-10",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Cambio de FAME a biológico por respuesta insuficiente",
         "Cambio_Biologico_Farmaco": "Adalimumab", "Cambio_Biologico_Dosis": "40 mg/14d",
         "Fecha_Proxima_Revision": "2027-03-15",
         "Comentarios_Adicionales": "Inicio anti-TNF como primer biológico.", "Fecha_Diagnostico": "2025-08-20",
         "Estado_Prebiologico_Final": "APTO",
        },
        {"Fecha_Visita": "2027-03-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "2", "NAT_Total": "1", "Dactilitis_Total": "0",
         "EVA_Global": "20", "EVA_Dolor": "18", "PCR": "2", "VSG": "10",
         "HAQ_Total": "0.4", "RAPID3_Score": "4", "LEI_Score": "0",
         "PASI_Score": "2", "BSA_Percentage": "2",
         "Tratamiento_Actual": "Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-10-10",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-08-20",
         "Comentarios_Adicionales": "Buena respuesta a anti-TNF.", "Fecha_Diagnostico": "2025-08-20",
         "Estado_Prebiologico_Final": "APTO",
        },
    ]
    for payload in aps4:
        row = base_visit_row(headers, *aps4_base)
        apply_payload_to_row(row, payload)
        rows["APS"].append(row)

    # APS — DEMO-APS-005: Baja actividad estable (3 visitas)
    aps5_base = ("DEMO-APS-005", "Paciente Demo APS 005", "F", "aps")
    aps5 = [
        {"Fecha_Visita": "2026-04-10", "Tipo_Visita": "primera", "Profesional": "PROF-REU-003",
         "Peso": "62", "Talla": "160", "IMC": "24.2", "TA": "115/70",
         "NAD_Total": "3", "NAT_Total": "2", "Dactilitis_Total": "0",
         "EVA_Global": "30", "EVA_Dolor": "28", "PCR": "4", "VSG": "15",
         "HAQ_Total": "0.8", "RAPID3_Score": "5", "LEI_Score": "2",
         "PASI_Score": "3", "BSA_Percentage": "4",
         "Tratamiento_Actual": "Metotrexato 10 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-04-10",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-09-20", "Fecha_Diagnostico": "2026-01-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
        },
        {"Fecha_Visita": "2026-09-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "2", "NAT_Total": "1", "Dactilitis_Total": "0",
         "EVA_Global": "20", "EVA_Dolor": "18", "PCR": "2", "VSG": "10",
         "HAQ_Total": "0.5", "RAPID3_Score": "3", "LEI_Score": "1",
         "PASI_Score": "2", "BSA_Percentage": "2",
         "Tratamiento_Actual": "Metotrexato 10 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-04-10",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-02-20", "Fecha_Diagnostico": "2026-01-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
        },
        {"Fecha_Visita": "2027-02-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "1", "NAT_Total": "0", "Dactilitis_Total": "0",
         "EVA_Global": "14", "EVA_Dolor": "12", "PCR": "1", "VSG": "8",
         "HAQ_Total": "0.3", "RAPID3_Score": "2", "LEI_Score": "0",
         "PASI_Score": "1", "BSA_Percentage": "1",
         "Tratamiento_Actual": "Metotrexato 10 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-04-10",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-07-25",
         "Comentarios_Adicionales": "Baja actividad mantenida. Sin necesidad de escalada.",
         "Fecha_Diagnostico": "2026-01-15", "Estado_Prebiologico_Final": "NO_EVALUADO",
        },
    ]
    for payload in aps5:
        row = base_visit_row(headers, *aps5_base)
        apply_payload_to_row(row, payload)
        rows["APS"].append(row)

    # APS — DEMO-APS-006: Actividad persistente con comorbilidades (4 visitas)
    aps6_base = ("DEMO-APS-006", "Paciente Demo APS 006", "M", "aps")
    aps6 = [
        {"Fecha_Visita": "2026-01-30", "Tipo_Visita": "primera", "Profesional": "PROF-REU-003",
         "Peso": "94", "Talla": "175", "IMC": "30.7", "TA": "148/94",
         "Comorbilidad_HTA": "SI", "Comorbilidad_DM": "SI", "Comorbilidad_DLP": "SI",
         "NAD_Total": "14", "NAT_Total": "12", "Dactilitis_Total": "3",
         "EVA_Global": "85", "EVA_Dolor": "88", "PCR": "18", "VSG": "45",
         "HAQ_Total": "2.0", "RAPID3_Score": "20", "LEI_Score": "7",
         "PASI_Score": "15", "BSA_Percentage": "20",
         "Tratamiento_Actual": "Metotrexato 25 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-01-30",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-06-15",
         "Comentarios_Adicionales": "APS severa con múltiples comorbilidades.", "Fecha_Diagnostico": "2025-12-15",
         "Estado_Prebiologico_Final": "NO_APTO", "Fecha_Validacion_Prebiologico": "2026-01-28",
        },
        {"Fecha_Visita": "2026-06-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "12", "NAT_Total": "10", "Dactilitis_Total": "2",
         "EVA_Global": "75", "EVA_Dolor": "78", "PCR": "14", "VSG": "38",
         "HAQ_Total": "1.7", "RAPID3_Score": "18", "LEI_Score": "5",
         "PASI_Score": "14", "BSA_Percentage": "18",
         "Tratamiento_Actual": "Metotrexato 25 mg/semana + Adalimumab 40 mg/14d",
         "Fecha_Inicio_Tratamiento": "2026-06-15",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Actividad severa persistente",
         "Cambio_Biologico_Farmaco": "Adalimumab", "Cambio_Biologico_Dosis": "40 mg/14d",
         "Fecha_Proxima_Revision": "2026-11-20", "Fecha_Diagnostico": "2025-12-15",
         "Estado_Prebiologico_Final": "NO_APTO",
        },
        {"Fecha_Visita": "2026-11-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "10", "NAT_Total": "8", "Dactilitis_Total": "2",
         "EVA_Global": "65", "EVA_Dolor": "68", "PCR": "12", "VSG": "32",
         "HAQ_Total": "1.4", "RAPID3_Score": "15", "LEI_Score": "4",
         "PASI_Score": "12", "BSA_Percentage": "15",
         "Tratamiento_Actual": "Metotrexato 25 mg/semana + Ixekizumab 80 mg/4s",
         "Fecha_Inicio_Tratamiento": "2026-11-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Respuesta parcial a anti-TNF",
         "Cambio_Biologico_Farmaco": "Ixekizumab", "Cambio_Biologico_Dosis": "80 mg/4s",
         "Fecha_Proxima_Revision": "2027-05-10",
         "Comentarios_Adicionales": "Rotación a anti-IL17 por mejor perfil PASI.", "Fecha_Diagnostico": "2025-12-15",
         "Estado_Prebiologico_Final": "NO_APTO",
        },
        {"Fecha_Visita": "2027-05-10", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-003",
         "NAD_Total": "8", "NAT_Total": "6", "Dactilitis_Total": "1",
         "EVA_Global": "50", "EVA_Dolor": "52", "PCR": "8", "VSG": "24",
         "HAQ_Total": "1.1", "RAPID3_Score": "12", "LEI_Score": "3",
         "PASI_Score": "10", "BSA_Percentage": "12",
         "Tratamiento_Actual": "Metotrexato 25 mg/semana + Ixekizumab 80 mg/4s",
         "Fecha_Inicio_Tratamiento": "2026-11-20",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-11-15",
         "Comentarios_Adicionales": "Mejoría insuficiente. Valorar nuevo cambio.", "Fecha_Diagnostico": "2025-12-15",
         "Estado_Prebiologico_Final": "NO_APTO",
        },
    ]
    for payload in aps6:
        row = base_visit_row(headers, *aps6_base)
        apply_payload_to_row(row, payload)
        rows["APS"].append(row)

    # LES — DEMO-LES-001 (4 visitas)
    les_base = ("DEMO-LES-001", "Paciente Demo LES", "F", "les")
    les_visits = [
        {
            "Fecha_Visita": "2026-01-15",
            "Tipo_Visita": "primera",
            "Profesional": "PROF-REU-004",
            "Peso": "64",
            "Talla": "163",
            "IMC": "24.1",
            "TA": "126/82",
            "EVA_Global": "74",
            "EVA_Dolor": "70",
            "PCR": "18",
            "VSG": "52",
            "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 30 mg/día",
            "Fecha_Inicio_Tratamiento": "2026-01-15",
            "Decision_Terapeutica": "iniciar",
            "Fecha_Proxima_Revision": "2026-05-15",
            "Comentarios_Adicionales": "Brote sistémico ficticio.",
            "Fecha_Diagnostico": "2025-10-12",
            "Estado_Prebiologico_Final": "NO_APTO",
            "Fecha_Validacion_Prebiologico": "2026-01-12",
            "Vacunacion_Revisada": "SI",
            "Vacunacion_OK": "NO",
            "SLEDAI": "16",
            "SLEDAI_2K": "16",
            "SLICC_SDI": "1",
            "Dosis_Prednisona": "30",
            "Brote_Actual": "SI",
            "Tipo_Brote": "Renal/Cutáneo",
            "Actividad_Global_Medico": "8",
            "Actividad_Global_Paciente": "8",
            "LES_Cutaneo": "SI",
            "LES_Articular": "SI",
            "LES_Renal": "SI",
            "LES_Hematologico": "SI",
            "LES_Manifestaciones_Descripcion": "Caso ficticio con actividad múltiple.",
            "ANA_LES": "Positivo",
            "Anti_DNA": "Positivo",
            "C3": "52",
            "C4": "9",
            "Proteinuria_LES": "1.5",
            "Creatinina_LES": "1.1",
            "PCR_LES": "18",
            "VSG_LES": "52",
            "EVA_Dolor_LES": "7",
            "EVA_Fatiga_LES": "8",
            "EVA_Global_LES": "8",
            "ESSPRI_Result": "NA",
            "ESSDAI_Result": "NA",
            "sledaiSeizure": "NO",
            "sledaiPsychosis": "NO",
            "sledaiOrganicBrainSyndrome": "NO",
            "sledaiVisualDisturbance": "NO",
            "sledaiCranialNerveDisorder": "NO",
            "sledaiLupusHeadache": "NO",
            "sledaiCVA": "NO",
            "sledaiVasculitis": "SI",
            "sledaiArthritis": "SI",
            "sledaiMyositis": "NO",
            "sledaiUrinaryCasts": "SI",
            "sledaiHematuria": "SI",
            "sledaiProteinuria": "SI",
            "sledaiPyuria": "NO",
            "sledaiRash": "SI",
            "sledaiAlopecia": "NO",
            "sledaiMucosalUlcers": "NO",
            "sledaiPleurisy": "NO",
            "sledaiPericarditis": "NO",
            "sledaiLowComplement": "SI",
            "sledaiIncreasedDNABinding": "SI",
            "sledaiFever": "SI",
            "sledaiThrombocytopenia": "NO",
            "sledaiLeukopenia": "SI",
            "sliccOcular": "0",
            "sliccNeuropsychiatric": "0",
            "sliccRenal": "1",
            "sliccPulmonary": "0",
            "sliccCardiovascular": "0",
            "sliccPeripheralVascular": "0",
            "sliccGastrointestinal": "0",
            "sliccMusculoskeletal": "0",
            "sliccSkin": "0",
            "sliccEndocrineDiabetes": "0",
            "sliccGonadal": "0",
            "sliccMalignancy": "0",
        },
        {
            "Fecha_Visita": "2026-05-15",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-004",
            "EVA_Global": "56",
            "EVA_Dolor": "52",
            "PCR": "10",
            "VSG": "34",
            "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 20 mg/día + Micofenolato 1.5 g/día",
            "Fecha_Inicio_Tratamiento": "2026-05-15",
            "Decision_Terapeutica": "cambiar",
            "Cambio_Motivo": "Persistencia renal",
            "Fecha_Proxima_Revision": "2026-09-20",
            "Comentarios_Adicionales": "Añadido inmunosupresor.",
            "Fecha_Diagnostico": "2025-10-12",
            "Estado_Prebiologico_Final": "NO_APTO",
            "SLEDAI": "10",
            "SLEDAI_2K": "10",
            "SLICC_SDI": "2",
            "Dosis_Prednisona": "20",
            "Brote_Actual": "SI",
            "Tipo_Brote": "Articular",
            "LES_Articular": "SI",
            "LES_Renal": "SI",
            "ANA_LES": "Positivo",
            "Anti_DNA": "Positivo",
            "C3": "65",
            "C4": "12",
            "Proteinuria_LES": "1.0",
            "Creatinina_LES": "1.0",
            "PCR_LES": "10",
            "VSG_LES": "34",
            "EVA_Dolor_LES": "5",
            "EVA_Fatiga_LES": "6",
            "EVA_Global_LES": "6",
        },
        {
            "Fecha_Visita": "2026-09-20",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-004",
            "EVA_Global": "30",
            "EVA_Dolor": "28",
            "PCR": "4",
            "VSG": "16",
            "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 10 mg/día + Micofenolato 1.5 g/día",
            "Fecha_Inicio_Tratamiento": "2026-05-15",
            "Decision_Terapeutica": "continuar",
            "Fecha_Proxima_Revision": "2027-01-15",
            "Comentarios_Adicionales": "Mejoría clínica y analítica.",
            "Fecha_Diagnostico": "2025-10-12",
            "Estado_Prebiologico_Final": "APTO",
            "Fecha_Validacion_Prebiologico": "2026-09-10",
            "SLEDAI": "4",
            "SLEDAI_2K": "4",
            "SLICC_SDI": "2",
            "Dosis_Prednisona": "10",
            "Brote_Actual": "NO",
            "LES_Renal": "NO",
            "Anti_DNA": "Negativo",
            "C3": "88",
            "C4": "18",
            "Proteinuria_LES": "0.3",
            "Creatinina_LES": "0.9",
            "PCR_LES": "4",
            "VSG_LES": "16",
            "EVA_Dolor_LES": "3",
            "EVA_Fatiga_LES": "4",
            "EVA_Global_LES": "3",
        },
        {
            "Fecha_Visita": "2027-01-15",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-004",
            "EVA_Global": "14",
            "EVA_Dolor": "12",
            "PCR": "1.8",
            "VSG": "10",
            "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 5 mg/día + Micofenolato 1.5 g/día",
            "Fecha_Inicio_Tratamiento": "2026-05-15",
            "Decision_Terapeutica": "continuar",
            "Fecha_Proxima_Revision": "2027-05-20",
            "Comentarios_Adicionales": "Remisión mantenida.",
            "Fecha_Diagnostico": "2025-10-12",
            "Estado_Prebiologico_Final": "APTO",
            "Fecha_Validacion_Prebiologico": "2026-09-10",
            "SLEDAI": "1",
            "SLEDAI_2K": "1",
            "SLICC_SDI": "2",
            "Dosis_Prednisona": "5",
            "Brote_Actual": "NO",
            "Anti_DNA": "Negativo",
            "C3": "95",
            "C4": "22",
            "Proteinuria_LES": "0.1",
            "Creatinina_LES": "0.8",
            "PCR_LES": "1.8",
            "VSG_LES": "10",
            "EVA_Dolor_LES": "1",
            "EVA_Fatiga_LES": "2",
            "EVA_Global_LES": "1",
        },
    ]
    for payload in les_visits:
        row = base_visit_row(headers, *les_base)
        apply_payload_to_row(row, payload)
        rows["LES"].append(row)

    # LES — DEMO-LES-002: Baja actividad estable (3 visitas)
    les2_base = ("DEMO-LES-002", "Paciente Demo LES 002", "F", "les")
    les2 = [
        {"Fecha_Visita": "2026-02-20", "Tipo_Visita": "primera", "Profesional": "PROF-REU-004",
         "Peso": "58", "Talla": "162", "IMC": "22.1", "TA": "110/68",
         "EVA_Global": "25", "EVA_Dolor": "22", "PCR": "3", "VSG": "14",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 5 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-02-20",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-07-15", "Fecha_Diagnostico": "2025-05-12",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "SLEDAI": "3", "SLEDAI_2K": "3", "SLICC_SDI": "1", "Dosis_Prednisona": "5",
         "Brote_Actual": "NO", "Actividad_Global_Medico": "2", "Actividad_Global_Paciente": "2",
         "ANA_LES": "Positivo", "Anti_DNA": "Positivo", "C3": "95", "C4": "22",
         "EVA_Dolor_LES": "2", "EVA_Fatiga_LES": "3", "EVA_Global_LES": "2",
         "sledaiArthritis": "SI",
        },
        {"Fecha_Visita": "2026-07-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "18", "EVA_Dolor": "16", "PCR": "2", "VSG": "10",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 5 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-02-20",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-01-10", "Fecha_Diagnostico": "2025-05-12",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "SLEDAI": "2", "SLEDAI_2K": "2", "SLICC_SDI": "1", "Dosis_Prednisona": "5",
         "Brote_Actual": "NO",
        },
        {"Fecha_Visita": "2027-01-10", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "10", "EVA_Dolor": "8", "PCR": "1", "VSG": "8",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día",
         "Fecha_Inicio_Tratamiento": "2027-01-10",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Remisión mantenida, retirar prednisona",
         "Fecha_Proxima_Revision": "2027-07-15",
         "Comentarios_Adicionales": "Baja actividad mantenida. Desescalada.", "Fecha_Diagnostico": "2025-05-12",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "SLEDAI": "1", "SLEDAI_2K": "1", "SLICC_SDI": "1", "Dosis_Prednisona": "0",
         "Brote_Actual": "NO",
        },
    ]
    for payload in les2:
        row = base_visit_row(headers, *les2_base)
        apply_payload_to_row(row, payload)
        rows["LES"].append(row)

    # LES — DEMO-LES-003: Nefritis lúpica activa (4 visitas)
    les3_base = ("DEMO-LES-003", "Paciente Demo LES 003", "F", "les")
    les3 = [
        {"Fecha_Visita": "2026-01-10", "Tipo_Visita": "primera", "Profesional": "PROF-REU-004",
         "Peso": "54", "Talla": "158", "IMC": "21.6", "TA": "142/90",
         "EVA_Global": "82", "EVA_Dolor": "60", "PCR": "15", "VSG": "48",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 40 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-01-10",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-05-15",
         "Comentarios_Adicionales": "Nefritis lúpica clase IV. Caso LES 003.", "Fecha_Diagnostico": "2025-11-28",
         "Estado_Prebiologico_Final": "NO_APTO",
         "SLEDAI": "14", "SLEDAI_2K": "14", "SLICC_SDI": "0", "Dosis_Prednisona": "40",
         "Brote_Actual": "SI", "Tipo_Brote": "Renal",
         "Actividad_Global_Medico": "9", "Actividad_Global_Paciente": "8",
         "LES_Renal": "SI", "LES_Hematologico": "SI",
         "ANA_LES": "Positivo", "Anti_DNA": "Positivo",
         "C3": "35", "C4": "5",
         "Proteinuria_LES": "3.0", "Creatinina_LES": "1.6",
         "sledaiRash": "SI", "sledaiArthritis": "SI",
         "sledaiProteinuria": "SI", "sledaiHematuria": "SI",
         "sledaiUrinaryCasts": "SI", "sledaiLowComplement": "SI",
         "sledaiIncreasedDNABinding": "SI",
         "sliccRenal": "0",
        },
        {"Fecha_Visita": "2026-05-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "62", "EVA_Dolor": "42", "PCR": "10", "VSG": "34",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 30 mg/día + Micofenolato 2 g/día",
         "Fecha_Inicio_Tratamiento": "2026-05-15",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Nefritis activa, añadir inmunosupresor",
         "Fecha_Proxima_Revision": "2026-09-20", "Fecha_Diagnostico": "2025-11-28",
         "Estado_Prebiologico_Final": "NO_APTO",
         "SLEDAI": "10", "SLEDAI_2K": "10", "SLICC_SDI": "1", "Dosis_Prednisona": "30",
         "Brote_Actual": "SI", "Tipo_Brote": "Renal",
         "LES_Renal": "SI", "Anti_DNA": "Positivo",
         "C3": "55", "C4": "10",
         "Proteinuria_LES": "2.0", "Creatinina_LES": "1.3",
         "sliccRenal": "1",
        },
        {"Fecha_Visita": "2026-09-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "38", "EVA_Dolor": "28", "PCR": "5", "VSG": "18",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 15 mg/día + Micofenolato 2 g/día",
         "Fecha_Inicio_Tratamiento": "2026-05-15",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-02-15", "Fecha_Diagnostico": "2025-11-28",
         "Estado_Prebiologico_Final": "NO_APTO",
         "SLEDAI": "6", "SLEDAI_2K": "6", "SLICC_SDI": "2", "Dosis_Prednisona": "15",
         "Brote_Actual": "NO",
         "Anti_DNA": "Negativo", "C3": "78", "C4": "16",
         "Proteinuria_LES": "0.8", "Creatinina_LES": "1.0", "sliccRenal": "2",
        },
        {"Fecha_Visita": "2027-02-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "18", "EVA_Dolor": "12", "PCR": "2", "VSG": "10",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 5 mg/día + Micofenolato 2 g/día",
         "Fecha_Inicio_Tratamiento": "2026-05-15",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-07-20", "Fecha_Diagnostico": "2025-11-28",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2027-02-01",
         "SLEDAI": "3", "SLEDAI_2K": "3", "SLICC_SDI": "2", "Dosis_Prednisona": "5",
         "Brote_Actual": "NO",
         "C3": "90", "C4": "20", "Proteinuria_LES": "0.3", "Creatinina_LES": "0.9", "sliccRenal": "2",
        },
    ]
    for payload in les3:
        row = base_visit_row(headers, *les3_base)
        apply_payload_to_row(row, payload)
        rows["LES"].append(row)

    # LES — DEMO-LES-004: Cutáneo-articular (3 visitas)
    les4_base = ("DEMO-LES-004", "Paciente Demo LES 004", "F", "les")
    les4 = [
        {"Fecha_Visita": "2026-03-05", "Tipo_Visita": "primera", "Profesional": "PROF-REU-004",
         "Peso": "60", "Talla": "163", "IMC": "22.6", "TA": "118/72",
         "EVA_Global": "55", "EVA_Dolor": "58", "PCR": "8", "VSG": "28",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 15 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-03-05",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-08-20", "Fecha_Diagnostico": "2025-06-18",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-02-28",
         "SLEDAI": "8", "SLEDAI_2K": "8", "SLICC_SDI": "0", "Dosis_Prednisona": "15",
         "Brote_Actual": "SI", "Tipo_Brote": "Cutáneo/Articular",
         "LES_Cutaneo": "SI", "LES_Articular": "SI",
         "ANA_LES": "Positivo", "Anti_DNA": "Positivo", "C3": "70", "C4": "12",
         "sledaiRash": "SI", "sledaiArthritis": "SI", "sledaiAlopecia": "SI",
         "sledaiIncreasedDNABinding": "SI",
        },
        {"Fecha_Visita": "2026-08-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "35", "EVA_Dolor": "32", "PCR": "4", "VSG": "16",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 10 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-08-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Mejoría clínica, descenso prednisona",
         "Fecha_Proxima_Revision": "2027-02-10", "Fecha_Diagnostico": "2025-06-18",
         "Estado_Prebiologico_Final": "APTO",
         "SLEDAI": "5", "SLEDAI_2K": "5", "SLICC_SDI": "0", "Dosis_Prednisona": "10",
         "Brote_Actual": "SI", "LES_Cutaneo": "SI", "Anti_DNA": "Positivo",
         "C3": "80", "C4": "16", "sledaiRash": "SI",
        },
        {"Fecha_Visita": "2027-02-10", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "18", "EVA_Dolor": "14", "PCR": "2", "VSG": "10",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 5 mg/día",
         "Fecha_Inicio_Tratamiento": "2027-02-10",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Baja actividad, nuevo descenso",
         "Fecha_Proxima_Revision": "2027-08-10",
         "Comentarios_Adicionales": "Rash resuelto. Actividad mínima.", "Fecha_Diagnostico": "2025-06-18",
         "Estado_Prebiologico_Final": "APTO",
         "SLEDAI": "3", "SLEDAI_2K": "3", "SLICC_SDI": "0", "Dosis_Prednisona": "5",
         "Brote_Actual": "NO", "LES_Cutaneo": "NO", "Anti_DNA": "Negativo",
         "C3": "92", "C4": "20",
        },
    ]
    for payload in les4:
        row = base_visit_row(headers, *les4_base)
        apply_payload_to_row(row, payload)
        rows["LES"].append(row)

    # LES — DEMO-LES-005: Prednisona descendente progresiva (4 visitas)
    les5_base = ("DEMO-LES-005", "Paciente Demo LES 005", "M", "les")
    les5 = [
        {"Fecha_Visita": "2026-01-12", "Tipo_Visita": "primera", "Profesional": "PROF-REU-004",
         "Peso": "74", "Talla": "172", "IMC": "25.0", "TA": "132/84",
         "EVA_Global": "68", "EVA_Dolor": "64", "PCR": "14", "VSG": "40",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 30 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-01-12",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-05-20", "Fecha_Diagnostico": "2025-08-22",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "SLEDAI": "10", "SLEDAI_2K": "10", "SLICC_SDI": "1", "Dosis_Prednisona": "30",
         "Brote_Actual": "SI", "Tipo_Brote": "Hematológico/Articular",
         "LES_Articular": "SI", "LES_Hematologico": "SI",
         "ANA_LES": "Positivo", "Anti_DNA": "Positivo",
         "C3": "50", "C4": "8",
         "sledaiArthritis": "SI", "sledaiLeukopenia": "SI",
         "sledaiLowComplement": "SI", "sledaiIncreasedDNABinding": "SI",
         "sliccMusculoskeletal": "1",
        },
        {"Fecha_Visita": "2026-05-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "48", "EVA_Dolor": "44", "PCR": "8", "VSG": "28",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 20 mg/día + Metotrexato 15 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-05-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Añadir ahorrador de corticoides",
         "Fecha_Proxima_Revision": "2026-10-15", "Fecha_Diagnostico": "2025-08-22",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "SLEDAI": "7", "SLEDAI_2K": "7", "SLICC_SDI": "1", "Dosis_Prednisona": "20",
         "Brote_Actual": "NO",
         "C3": "68", "C4": "12",
        },
        {"Fecha_Visita": "2026-10-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "28", "EVA_Dolor": "24", "PCR": "4", "VSG": "16",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 10 mg/día + Metotrexato 15 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-05-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Descenso prednisona por mejoría",
         "Fecha_Proxima_Revision": "2027-03-20", "Fecha_Diagnostico": "2025-08-22",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "SLEDAI": "4", "SLEDAI_2K": "4", "SLICC_SDI": "2", "Dosis_Prednisona": "10",
         "Brote_Actual": "NO",
         "C3": "82", "C4": "18", "sliccMusculoskeletal": "2",
        },
        {"Fecha_Visita": "2027-03-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "14", "EVA_Dolor": "12", "PCR": "1.5", "VSG": "10",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 5 mg/día + Metotrexato 15 mg/semana",
         "Fecha_Inicio_Tratamiento": "2026-05-20",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-09-15",
         "Comentarios_Adicionales": "Actividad mínima. Desescalada corticoides exitosa.",
         "Fecha_Diagnostico": "2025-08-22", "Estado_Prebiologico_Final": "EN_CURSO",
         "SLEDAI": "2", "SLEDAI_2K": "2", "SLICC_SDI": "2", "Dosis_Prednisona": "5",
         "Brote_Actual": "NO",
         "C3": "93", "C4": "22",
        },
    ]
    for payload in les5:
        row = base_visit_row(headers, *les5_base)
        apply_payload_to_row(row, payload)
        rows["LES"].append(row)

    # LES — DEMO-LES-006: Daño acumulado SLICC alto (3 visitas)
    les6_base = ("DEMO-LES-006", "Paciente Demo LES 006", "F", "les")
    les6 = [
        {"Fecha_Visita": "2026-03-10", "Tipo_Visita": "primera", "Profesional": "PROF-REU-004",
         "Peso": "66", "Talla": "160", "IMC": "25.8", "TA": "136/82",
         "Comorbilidad_HTA": "SI", "Comorbilidad_ECV": "SI",
         "EVA_Global": "55", "EVA_Dolor": "52", "PCR": "8", "VSG": "30",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 10 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-03-10",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-08-20", "Fecha_Diagnostico": "2018-03-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "SLEDAI": "6", "SLEDAI_2K": "6", "SLICC_SDI": "5", "Dosis_Prednisona": "10",
         "Brote_Actual": "SI", "Tipo_Brote": "Articular",
         "LES_Articular": "SI", "ANA_LES": "Positivo", "Anti_DNA": "Positivo",
         "C3": "65", "C4": "10", "PCR_LES": "8", "VSG_LES": "30",
         "sledaiArthritis": "SI", "sledaiLowComplement": "SI",
         "sliccOcular": "1", "sliccRenal": "1", "sliccMusculoskeletal": "2",
         "sliccSkin": "1", "sliccEndocrineDiabetes": "0",
         "Comentarios_Adicionales": "LES de larga evolución con daño acumulado.",
        },
        {"Fecha_Visita": "2026-08-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "42", "EVA_Dolor": "38", "PCR": "5", "VSG": "22",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 10 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-03-10",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-02-15", "Fecha_Diagnostico": "2018-03-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "SLEDAI": "4", "SLEDAI_2K": "4", "SLICC_SDI": "5", "Dosis_Prednisona": "10",
         "Brote_Actual": "NO",
         "Anti_DNA": "Positivo", "C3": "72", "C4": "14",
        },
        {"Fecha_Visita": "2027-02-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-004",
         "EVA_Global": "36", "EVA_Dolor": "32", "PCR": "4", "VSG": "18",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Prednisona 10 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-03-10",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-08-20",
         "Comentarios_Adicionales": "Estabilidad clínica. Daño crónico estable.", "Fecha_Diagnostico": "2018-03-15",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "SLEDAI": "3", "SLEDAI_2K": "3", "SLICC_SDI": "5", "Dosis_Prednisona": "10",
         "Brote_Actual": "NO",
         "C3": "78", "C4": "16",
        },
    ]
    for payload in les6:
        row = base_visit_row(headers, *les6_base)
        apply_payload_to_row(row, payload)
        rows["LES"].append(row)

    # SJOGREN — DEMO-SJOGREN-001 (4 visitas)
    sj_base = ("DEMO-SJOGREN-001", "Paciente Demo SJOGREN", "F", "sjogren")
    sj_visits = [
        {
            "Fecha_Visita": "2026-02-12",
            "Tipo_Visita": "primera",
            "Profesional": "PROF-REU-005",
            "Peso": "61",
            "Talla": "162",
            "IMC": "23.2",
            "TA": "118/74",
            "EVA_Global": "70",
            "EVA_Dolor": "60",
            "PCR": "6",
            "VSG": "32",
            "Tratamiento_Actual": "Pilocarpina 5 mg/8h",
            "Fecha_Inicio_Tratamiento": "2026-02-12",
            "Decision_Terapeutica": "iniciar",
            "Fecha_Proxima_Revision": "2026-06-18",
            "Comentarios_Adicionales": "Alta carga sintomática inicial.",
            "Fecha_Diagnostico": "2025-09-01",
            "Estado_Prebiologico_Final": "NO_EVALUADO",
            "ESSPRI_Sequedad": "8",
            "ESSPRI_Fatiga": "7",
            "ESSPRI_Dolor": "6",
            "ESSPRI_Result": "7.0",
            "ESSDAI_Result": "18",
            "EVA_Sequedad_Oral": "8",
            "EVA_Sequedad_Ocular": "7",
            "EVA_Fatiga_Sjogren": "7",
            "EVA_Dolor_Sjogren": "6",
            "EVA_Global_Sjogren": "7",
            "Sjogren_Ocular_Man": "SI",
            "Sjogren_Oral_Man": "SI",
            "Sjogren_Glandular": "SI",
            "Sjogren_Articular_Man": "SI",
            "Sjogren_Biological": "SI",
            "ANA_Sjogren": "Positivo",
            "FR_Sjogren": "Positivo",
            "Anti_Ro_Sjogren": "Positivo",
            "Anti_La_Sjogren": "Positivo",
            "C3_Sjogren": "84",
            "C4_Sjogren": "15",
            "Test_Schirmer": "Patológico",
            "Trat_Sintomatico_Sequedad": "Pilocarpina",
            "Trat_Sintomatico_Sequedad_Dosis": "5 mg/8h",
            "essdaiConstitutional": "2",
            "essdaiLymphadenopathy": "0",
            "essdaiGlandular": "2",
            "essdaiArticular": "2",
            "essdaiCutaneous": "0",
            "essdaiPulmonary": "0",
            "essdaiRenal": "0",
            "essdaiMuscular": "0",
            "essdaiPeripheralNervousSystem": "0",
            "essdaiCentralNervousSystem": "0",
            "essdaiHematological": "1",
            "essdaiBiological": "3",
        },
        {
            "Fecha_Visita": "2026-06-18",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-005",
            "EVA_Global": "56",
            "EVA_Dolor": "48",
            "PCR": "5",
            "VSG": "24",
            "Tratamiento_Actual": "Pilocarpina 5 mg/8h + Hidroxicloroquina 400 mg/día",
            "Fecha_Inicio_Tratamiento": "2026-06-18",
            "Decision_Terapeutica": "cambiar",
            "Cambio_Motivo": "Persistencia sistémica",
            "Fecha_Proxima_Revision": "2026-10-25",
            "Comentarios_Adicionales": "Añadido inmunomodulador.",
            "Fecha_Diagnostico": "2025-09-01",
            "Estado_Prebiologico_Final": "EN_CURSO",
            "Hemograma_Solicitado": "SI",
            "Bioquimica_Solicitada": "SI",
            "Serologias_Solicitadas": "SI",
            "ESSPRI_Sequedad": "6",
            "ESSPRI_Fatiga": "6",
            "ESSPRI_Dolor": "5",
            "ESSPRI_Result": "5.7",
            "ESSDAI_Result": "13",
            "EVA_Sequedad_Oral": "6",
            "EVA_Sequedad_Ocular": "5",
            "EVA_Fatiga_Sjogren": "6",
            "EVA_Dolor_Sjogren": "5",
            "EVA_Global_Sjogren": "6",
            "Trat_Sintomatico_Sequedad": "Pilocarpina",
            "Trat_Sintomatico_Sequedad_Dosis": "5 mg/8h",
            "Trat_Inmunomodulador": "Hidroxicloroquina",
            "Trat_Inmunomodulador_Dosis": "400 mg/día",
            "essdaiConstitutional": "1",
            "essdaiGlandular": "2",
            "essdaiArticular": "2",
            "essdaiBiological": "2",
        },
        {
            "Fecha_Visita": "2026-10-25",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-005",
            "EVA_Global": "44",
            "EVA_Dolor": "36",
            "PCR": "3",
            "VSG": "18",
            "Tratamiento_Actual": "Pilocarpina 5 mg/8h + Hidroxicloroquina 400 mg/día + Rituximab 1 g/6 meses",
            "Fecha_Inicio_Tratamiento": "2026-10-25",
            "Decision_Terapeutica": "cambiar",
            "Cambio_Motivo": "Respuesta parcial",
            "Cambio_Biologico_Farmaco": "Rituximab",
            "Cambio_Biologico_Dosis": "1 g/6 meses",
            "Fecha_Proxima_Revision": "2027-02-28",
            "Comentarios_Adicionales": "Escalada terapéutica ficticia.",
            "Fecha_Diagnostico": "2025-09-01",
            "Estado_Prebiologico_Final": "EN_CURSO",
            "Hemograma_Recibido": "SI",
            "Hemograma_Correcto": "SI",
            "Bioquimica_Recibida": "SI",
            "Bioquimica_Correcta": "SI",
            "Serologias_Recibidas": "SI",
            "Serologias_Correctas": "SI",
            "IGRA_Mantoux_Resultado": "NEGATIVO",
            "Rx_Torax_Correcta": "SI",
            "Vacunacion_Revisada": "SI",
            "Vacunacion_OK": "SI",
            "ESSPRI_Sequedad": "4",
            "ESSPRI_Fatiga": "4",
            "ESSPRI_Dolor": "3",
            "ESSPRI_Result": "3.7",
            "ESSDAI_Result": "8",
            "EVA_Sequedad_Oral": "4",
            "EVA_Sequedad_Ocular": "4",
            "EVA_Fatiga_Sjogren": "4",
            "EVA_Dolor_Sjogren": "3",
            "EVA_Global_Sjogren": "4",
            "Trat_Inmunomodulador": "Rituximab",
            "Trat_Inmunomodulador_Dosis": "1 g/6 meses",
            "essdaiConstitutional": "1",
            "essdaiGlandular": "1",
            "essdaiArticular": "1",
            "essdaiBiological": "1",
        },
        {
            "Fecha_Visita": "2027-02-28",
            "Tipo_Visita": "seguimiento",
            "Profesional": "PROF-REU-005",
            "EVA_Global": "24",
            "EVA_Dolor": "20",
            "PCR": "2",
            "VSG": "12",
            "Tratamiento_Actual": "Pilocarpina 5 mg/8h + Hidroxicloroquina 400 mg/día + Rituximab 1 g/6 meses",
            "Fecha_Inicio_Tratamiento": "2026-10-25",
            "Decision_Terapeutica": "continuar",
            "Fecha_Proxima_Revision": "2027-07-10",
            "Comentarios_Adicionales": "Mejoría global sostenida.",
            "Fecha_Diagnostico": "2025-09-01",
            "Estado_Prebiologico_Final": "EN_CURSO",
            "Vacunacion_Revisada": "SI",
            "Vacunacion_OK": "SI",
            "ESSPRI_Sequedad": "3",
            "ESSPRI_Fatiga": "3",
            "ESSPRI_Dolor": "2",
            "ESSPRI_Result": "2.7",
            "ESSDAI_Result": "4",
            "EVA_Sequedad_Oral": "3",
            "EVA_Sequedad_Ocular": "3",
            "EVA_Fatiga_Sjogren": "3",
            "EVA_Dolor_Sjogren": "2",
            "EVA_Global_Sjogren": "2",
            "essdaiConstitutional": "0",
            "essdaiGlandular": "1",
            "essdaiArticular": "1",
            "essdaiBiological": "1",
        },
    ]
    for payload in sj_visits:
        row = base_visit_row(headers, *sj_base)
        apply_payload_to_row(row, payload)
        rows["SJOGREN"].append(row)

    # SJOGREN — DEMO-SJOGREN-002: ESSDAI alto sistémico con inmunosupresor (4 visitas)
    sj2_base = ("DEMO-SJOGREN-002", "Paciente Demo SJOGREN 002", "F", "sjogren")
    sj2 = [
        {"Fecha_Visita": "2026-01-20", "Tipo_Visita": "primera", "Profesional": "PROF-REU-005",
         "Peso": "58", "Talla": "160", "IMC": "22.7", "TA": "120/74",
         "EVA_Global": "75", "EVA_Dolor": "65", "PCR": "12", "VSG": "40",
         "Tratamiento_Actual": "Pilocarpina 5 mg/8h",
         "Fecha_Inicio_Tratamiento": "2026-01-20",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-06-15", "Fecha_Diagnostico": "2025-07-10",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-06-05",
         "ESSPRI_Sequedad": "7", "ESSPRI_Fatiga": "6", "ESSPRI_Dolor": "6",
         "ESSPRI_Result": "6.3", "ESSDAI_Result": "22",
         "EVA_Sequedad_Oral": "8", "EVA_Sequedad_Ocular": "7",
         "EVA_Fatiga_Sjogren": "7", "EVA_Dolor_Sjogren": "6", "EVA_Global_Sjogren": "8",
         "Sjogren_Glandular": "SI", "Sjogren_Articular_Man": "SI",
         "Sjogren_Hematologico": "SI", "ANA_Sjogren": "Positivo",
         "Anti_Ro_Sjogren": "Positivo", "Anti_La_Sjogren": "Positivo",
         "FR_Sjogren": "Positivo", "C3_Sjogren": "65", "C4_Sjogren": "10",
         "Trat_Sintomatico_Sequedad": "Pilocarpina", "Trat_Sintomatico_Sequedad_Dosis": "5 mg/8h",
         "essdaiConstitutional": "4", "essdaiGlandular": "4", "essdaiArticular": "2",
         "essdaiHematological": "2", "essdaiBiological": "3",
         "Hemograma_Solicitado": "SI", "Bioquimica_Solicitada": "SI",
         "Serologias_Solicitadas": "SI", "Vacunacion_Revisada": "SI", "Vacunacion_OK": "SI",
        },
        {"Fecha_Visita": "2026-06-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "62", "EVA_Dolor": "52", "PCR": "8", "VSG": "28",
         "Tratamiento_Actual": "Pilocarpina 5 mg/8h + Hidroxicloroquina 400 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-06-15",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Actividad sistémica persistente",
         "Fecha_Proxima_Revision": "2026-11-20", "Fecha_Diagnostico": "2025-07-10",
         "Estado_Prebiologico_Final": "APTO",
         "ESSPRI_Sequedad": "6", "ESSPRI_Fatiga": "5", "ESSPRI_Dolor": "5",
         "ESSPRI_Result": "5.3", "ESSDAI_Result": "16",
         "EVA_Sequedad_Oral": "6", "EVA_Sequedad_Ocular": "6",
         "EVA_Fatiga_Sjogren": "6", "EVA_Dolor_Sjogren": "5", "EVA_Global_Sjogren": "6",
         "Trat_Inmunomodulador": "Hidroxicloroquina", "Trat_Inmunomodulador_Dosis": "400 mg/día",
         "essdaiConstitutional": "2", "essdaiGlandular": "3", "essdaiArticular": "2",
         "essdaiHematological": "1", "essdaiBiological": "2",
        },
        {"Fecha_Visita": "2026-11-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "50", "EVA_Dolor": "40", "PCR": "7", "VSG": "20",
         "Tratamiento_Actual": "Pilocarpina 5 mg/8h + Hidroxicloroquina 400 mg/día + Rituximab 1 g/6 meses",
         "Fecha_Inicio_Tratamiento": "2026-11-20",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Respuesta insuficiente a HCQ",
         "Cambio_Biologico_Farmaco": "Rituximab", "Cambio_Biologico_Dosis": "1 g/6 meses",
         "Fecha_Proxima_Revision": "2027-05-15", "Fecha_Diagnostico": "2025-07-10",
         "Estado_Prebiologico_Final": "APTO",
         "ESSPRI_Sequedad": "5", "ESSPRI_Fatiga": "4", "ESSPRI_Dolor": "4",
         "ESSPRI_Result": "4.3", "ESSDAI_Result": "10",
         "EVA_Sequedad_Oral": "5", "EVA_Sequedad_Ocular": "5",
         "trat_Inmunomodulador": "Rituximab", "Trat_Inmunomodulador_Dosis": "1 g/6 meses",
         "essdaiConstitutional": "1", "essdaiGlandular": "2", "essdaiArticular": "1",
         "essdaiHematological": "1", "essdaiBiological": "2",
        },
        {"Fecha_Visita": "2027-05-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "30", "EVA_Dolor": "24", "PCR": "3", "VSG": "14",
         "Tratamiento_Actual": "Pilocarpina 5 mg/8h + Hidroxicloroquina 400 mg/día + Rituximab 1 g/6 meses",
         "Fecha_Inicio_Tratamiento": "2026-11-20",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-11-20",
         "Comentarios_Adicionales": "Buena respuesta a Rituximab.", "Fecha_Diagnostico": "2025-07-10",
         "Estado_Prebiologico_Final": "APTO",
         "ESSPRI_Sequedad": "4", "ESSPRI_Fatiga": "3", "ESSPRI_Dolor": "3",
         "ESSPRI_Result": "3.3", "ESSDAI_Result": "6",
         "EVA_Sequedad_Oral": "4", "EVA_Sequedad_Ocular": "4",
         "essdaiConstitutional": "0", "essdaiGlandular": "1", "essdaiArticular": "1",
         "essdaiBiological": "1",
        },
    ]
    for payload in sj2:
        row = base_visit_row(headers, *sj2_base)
        apply_payload_to_row(row, payload)
        rows["SJOGREN"].append(row)

    # SJOGREN — DEMO-SJOGREN-003: Sequedad predominante (3 visitas)
    sj3_base = ("DEMO-SJOGREN-003", "Paciente Demo SJOGREN 003", "F", "sjogren")
    sj3 = [
        {"Fecha_Visita": "2026-04-05", "Tipo_Visita": "primera", "Profesional": "PROF-REU-005",
         "Peso": "63", "Talla": "158", "IMC": "25.2", "TA": "122/76",
         "EVA_Global": "62", "EVA_Dolor": "30", "PCR": "3", "VSG": "16",
         "Tratamiento_Actual": "Pilocarpina 5 mg/8h",
         "Fecha_Inicio_Tratamiento": "2026-04-05",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-10-15", "Fecha_Diagnostico": "2025-05-20",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "ESSPRI_Sequedad": "9", "ESSPRI_Fatiga": "5", "ESSPRI_Dolor": "3",
         "ESSPRI_Result": "5.7", "ESSDAI_Result": "4",
         "EVA_Sequedad_Oral": "9", "EVA_Sequedad_Ocular": "8",
         "EVA_Fatiga_Sjogren": "4", "EVA_Dolor_Sjogren": "2", "EVA_Global_Sjogren": "5",
         "Sjogren_Ocular_Man": "SI", "Sjogren_Oral_Man": "SI",
         "ANA_Sjogren": "Positivo", "Anti_Ro_Sjogren": "Positivo",
         "Test_Schirmer": "Patológico",
         "Trat_Sintomatico_Sequedad": "Pilocarpina", "Trat_Sintomatico_Sequedad_Dosis": "5 mg/8h",
         "essdaiGlandular": "2", "essdaiConstitutional": "1",
        },
        {"Fecha_Visita": "2026-10-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "55", "EVA_Dolor": "28", "PCR": "2", "VSG": "12",
         "Tratamiento_Actual": "Pilocarpina 5 mg/8h + Cevimelina 30 mg/8h",
         "Fecha_Inicio_Tratamiento": "2026-10-15",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Sequedad oral persistente",
         "Fecha_Proxima_Revision": "2027-04-20", "Fecha_Diagnostico": "2025-05-20",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "ESSPRI_Sequedad": "8", "ESSPRI_Fatiga": "5", "ESSPRI_Dolor": "3",
         "ESSPRI_Result": "5.3", "ESSDAI_Result": "3",
         "EVA_Sequedad_Oral": "8", "EVA_Sequedad_Ocular": "7",
         "Trat_Sintomatico_Sequedad": "Pilocarpina+Cevimelina",
        },
        {"Fecha_Visita": "2027-04-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "48", "EVA_Dolor": "22", "PCR": "2", "VSG": "10",
         "Tratamiento_Actual": "Pilocarpina 5 mg/8h + Cevimelina 30 mg/8h",
         "Fecha_Inicio_Tratamiento": "2026-10-15",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-11-15",
         "Comentarios_Adicionales": "Mejoría parcial de la sequedad.", "Fecha_Diagnostico": "2025-05-20",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "ESSPRI_Sequedad": "7", "ESSPRI_Fatiga": "4", "ESSPRI_Dolor": "3",
         "ESSPRI_Result": "4.7", "ESSDAI_Result": "3",
         "EVA_Sequedad_Oral": "7", "EVA_Sequedad_Ocular": "7",
        },
    ]
    for payload in sj3:
        row = base_visit_row(headers, *sj3_base)
        apply_payload_to_row(row, payload)
        rows["SJOGREN"].append(row)

    # SJOGREN — DEMO-SJOGREN-004: Fatiga y dolor predominante (4 visitas)
    sj4_base = ("DEMO-SJOGREN-004", "Paciente Demo SJOGREN 004", "M", "sjogren")
    sj4 = [
        {"Fecha_Visita": "2026-02-01", "Tipo_Visita": "primera", "Profesional": "PROF-REU-005",
         "Peso": "72", "Talla": "174", "IMC": "23.8", "TA": "126/78",
         "EVA_Global": "78", "EVA_Dolor": "75", "PCR": "5", "VSG": "22",
         "Tratamiento_Actual": "Pilocarpina 5 mg/8h",
         "Fecha_Inicio_Tratamiento": "2026-02-01",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-07-15", "Fecha_Diagnostico": "2025-10-01",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "ESSPRI_Sequedad": "6", "ESSPRI_Fatiga": "9", "ESSPRI_Dolor": "8",
         "ESSPRI_Result": "7.7", "ESSDAI_Result": "6",
         "EVA_Sequedad_Oral": "5", "EVA_Sequedad_Ocular": "4",
         "EVA_Fatiga_Sjogren": "9", "EVA_Dolor_Sjogren": "8", "EVA_Global_Sjogren": "8",
         "Sjogren_Articular_Man": "SI",
         "ANA_Sjogren": "Positivo", "Anti_Ro_Sjogren": "Positivo",
         "Trat_Sintomatico_Sequedad": "Pilocarpina", "Trat_Sintomatico_Sequedad_Dosis": "5 mg/8h",
         "essdaiArticular": "2", "essdaiConstitutional": "2", "essdaiBiological": "1",
         "Hemograma_Solicitado": "SI", "Bioquimica_Solicitada": "SI",
         "Vacunacion_Revisada": "SI",
        },
        {"Fecha_Visita": "2026-07-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "68", "EVA_Dolor": "65", "PCR": "4", "VSG": "18",
         "Tratamiento_Actual": "Pilocarpina 5 mg/8h + Hidroxicloroquina 400 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-07-15",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Fatiga y dolor persistente",
         "Fecha_Proxima_Revision": "2026-12-20", "Fecha_Diagnostico": "2025-10-01",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "ESSPRI_Sequedad": "5", "ESSPRI_Fatiga": "8", "ESSPRI_Dolor": "7",
         "ESSPRI_Result": "6.7", "ESSDAI_Result": "5",
         "EVA_Fatiga_Sjogren": "8", "EVA_Dolor_Sjogren": "7", "EVA_Global_Sjogren": "7",
         "Trat_Inmunomodulador": "Hidroxicloroquina", "Trat_Inmunomodulador_Dosis": "400 mg/día",
         "essdaiConstitutional": "2", "essdaiArticular": "2",
        },
        {"Fecha_Visita": "2026-12-20", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "54", "EVA_Dolor": "52", "PCR": "3", "VSG": "14",
         "Tratamiento_Actual": "Pilocarpina 5 mg/8h + Hidroxicloroquina 400 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-07-15",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-06-15",
         "Comentarios_Adicionales": "Mejoría lenta pero progresiva.", "Fecha_Diagnostico": "2025-10-01",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "ESSPRI_Sequedad": "4", "ESSPRI_Fatiga": "7", "ESSPRI_Dolor": "6",
         "ESSPRI_Result": "5.7", "ESSDAI_Result": "4",
         "EVA_Fatiga_Sjogren": "7", "EVA_Dolor_Sjogren": "6", "EVA_Global_Sjogren": "6",
         "essdaiConstitutional": "1", "essdaiArticular": "1",
        },
        {"Fecha_Visita": "2027-06-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "38", "EVA_Dolor": "34", "PCR": "2", "VSG": "10",
         "Tratamiento_Actual": "Pilocarpina 5 mg/8h + Hidroxicloroquina 400 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-07-15",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2028-01-20",
         "Comentarios_Adicionales": "Mejoría significativa. Control aceptable.", "Fecha_Diagnostico": "2025-10-01",
         "Estado_Prebiologico_Final": "EN_CURSO",
         "ESSPRI_Sequedad": "3", "ESSPRI_Fatiga": "5", "ESSPRI_Dolor": "5",
         "ESSPRI_Result": "4.3", "ESSDAI_Result": "3",
         "EVA_Fatiga_Sjogren": "5", "EVA_Dolor_Sjogren": "4", "EVA_Global_Sjogren": "3",
         "essdaiConstitutional": "1", "essdaiArticular": "0",
        },
    ]
    for payload in sj4:
        row = base_visit_row(headers, *sj4_base)
        apply_payload_to_row(row, payload)
        rows["SJOGREN"].append(row)

    # SJOGREN — DEMO-SJOGREN-005: Actividad moderada con Rituximab (3 visitas)
    sj5_base = ("DEMO-SJOGREN-005", "Paciente Demo SJOGREN 005", "F", "sjogren")
    sj5 = [
        {"Fecha_Visita": "2026-03-15", "Tipo_Visita": "primera", "Profesional": "PROF-REU-005",
         "Peso": "68", "Talla": "165", "IMC": "25.0", "TA": "128/80",
         "EVA_Global": "72", "EVA_Dolor": "55", "PCR": "9", "VSG": "32",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-03-15",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-09-10", "Fecha_Diagnostico": "2025-12-05",
         "Estado_Prebiologico_Final": "APTO", "Fecha_Validacion_Prebiologico": "2026-09-01",
         "ESSPRI_Sequedad": "6", "ESSPRI_Fatiga": "7", "ESSPRI_Dolor": "5",
         "ESSPRI_Result": "6.0", "ESSDAI_Result": "12",
         "EVA_Sequedad_Oral": "6", "EVA_Sequedad_Ocular": "5",
         "EVA_Fatiga_Sjogren": "7", "EVA_Dolor_Sjogren": "5", "EVA_Global_Sjogren": "7",
         "ANA_Sjogren": "Positivo", "Anti_Ro_Sjogren": "Positivo",
         "C3_Sjogren": "72", "C4_Sjogren": "12",
         "Trat_Inmunomodulador": "Hidroxicloroquina", "Trat_Inmunomodulador_Dosis": "400 mg/día",
         "essdaiConstitutional": "2", "essdaiGlandular": "2", "essdaiArticular": "2",
         "essdaiBiological": "3",
         "Vacunacion_Revisada": "SI", "Vacunacion_OK": "SI",
        },
        {"Fecha_Visita": "2026-09-10", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "55", "EVA_Dolor": "42", "PCR": "6", "VSG": "22",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Rituximab 1 g/6 meses",
         "Fecha_Inicio_Tratamiento": "2026-09-10",
         "Decision_Terapeutica": "cambiar", "Cambio_Motivo": "Mejoría insuficiente con HCQ",
         "Cambio_Biologico_Farmaco": "Rituximab", "Cambio_Biologico_Dosis": "1 g/6 meses",
         "Fecha_Proxima_Revision": "2027-03-15", "Fecha_Diagnostico": "2025-12-05",
         "Estado_Prebiologico_Final": "APTO",
         "ESSPRI_Sequedad": "5", "ESSPRI_Fatiga": "6", "ESSPRI_Dolor": "4",
         "ESSPRI_Result": "5.0", "ESSDAI_Result": "8",
         "EVA_Sequedad_Oral": "5", "EVA_Sequedad_Ocular": "4",
         "EVA_Fatiga_Sjogren": "6", "EVA_Dolor_Sjogren": "4", "EVA_Global_Sjogren": "5",
         "Trat_Inmunomodulador": "Rituximab", "Trat_Inmunomodulador_Dosis": "1 g/6 meses",
         "essdaiConstitutional": "1", "essdaiGlandular": "1", "essdaiArticular": "1",
         "essdaiBiological": "2",
        },
        {"Fecha_Visita": "2027-03-15", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "38", "EVA_Dolor": "30", "PCR": "3", "VSG": "14",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día + Rituximab 1 g/6 meses",
         "Fecha_Inicio_Tratamiento": "2026-09-10",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-09-20",
         "Comentarios_Adicionales": "Buena respuesta a Rituximab.", "Fecha_Diagnostico": "2025-12-05",
         "Estado_Prebiologico_Final": "APTO",
         "ESSPRI_Sequedad": "3", "ESSPRI_Fatiga": "4", "ESSPRI_Dolor": "3",
         "ESSPRI_Result": "3.3", "ESSDAI_Result": "5",
         "EVA_Sequedad_Oral": "3", "EVA_Sequedad_Ocular": "3",
         "EVA_Fatiga_Sjogren": "4", "EVA_Dolor_Sjogren": "3", "EVA_Global_Sjogren": "3",
         "essdaiConstitutional": "0", "essdaiGlandular": "1", "essdaiArticular": "0",
         "essdaiBiological": "1",
        },
    ]
    for payload in sj5:
        row = base_visit_row(headers, *sj5_base)
        apply_payload_to_row(row, payload)
        rows["SJOGREN"].append(row)

    # SJOGREN — DEMO-SJOGREN-006: Baja actividad estable (3 visitas)
    sj6_base = ("DEMO-SJOGREN-006", "Paciente Demo SJOGREN 006", "F", "sjogren")
    sj6 = [
        {"Fecha_Visita": "2026-05-01", "Tipo_Visita": "primera", "Profesional": "PROF-REU-005",
         "Peso": "55", "Talla": "156", "IMC": "22.6", "TA": "112/68",
         "EVA_Global": "30", "EVA_Dolor": "22", "PCR": "2", "VSG": "12",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-05-01",
         "Decision_Terapeutica": "iniciar",
         "Fecha_Proxima_Revision": "2026-11-10", "Fecha_Diagnostico": "2025-03-22",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "ESSPRI_Sequedad": "4", "ESSPRI_Fatiga": "4", "ESSPRI_Dolor": "3",
         "ESSPRI_Result": "3.7", "ESSDAI_Result": "3",
         "EVA_Sequedad_Oral": "4", "EVA_Sequedad_Ocular": "4",
         "EVA_Fatiga_Sjogren": "4", "EVA_Dolor_Sjogren": "2", "EVA_Global_Sjogren": "3",
         "ANA_Sjogren": "Positivo", "Anti_Ro_Sjogren": "Positivo",
         "Trat_Inmunomodulador": "Hidroxicloroquina", "Trat_Inmunomodulador_Dosis": "400 mg/día",
         "essdaiGlandular": "1", "essdaiConstitutional": "0", "essdaiBiological": "0",
        },
        {"Fecha_Visita": "2026-11-10", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "22", "EVA_Dolor": "18", "PCR": "2", "VSG": "10",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-05-01",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2027-06-01", "Fecha_Diagnostico": "2025-03-22",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "ESSPRI_Sequedad": "3", "ESSPRI_Fatiga": "3", "ESSPRI_Dolor": "2",
         "ESSPRI_Result": "2.7", "ESSDAI_Result": "2",
         "EVA_Sequedad_Oral": "3", "EVA_Sequedad_Ocular": "3",
         "EVA_Fatiga_Sjogren": "3", "EVA_Dolor_Sjogren": "2", "EVA_Global_Sjogren": "2",
         "essdaiGlandular": "1", "essdaiBiological": "0",
        },
        {"Fecha_Visita": "2027-06-01", "Tipo_Visita": "seguimiento", "Profesional": "PROF-REU-005",
         "EVA_Global": "18", "EVA_Dolor": "14", "PCR": "1", "VSG": "8",
         "Tratamiento_Actual": "Hidroxicloroquina 400 mg/día",
         "Fecha_Inicio_Tratamiento": "2026-05-01",
         "Decision_Terapeutica": "continuar",
         "Fecha_Proxima_Revision": "2028-01-15",
         "Comentarios_Adicionales": "Baja actividad mantenida. Sin cambios.", "Fecha_Diagnostico": "2025-03-22",
         "Estado_Prebiologico_Final": "NO_EVALUADO",
         "ESSPRI_Sequedad": "2", "ESSPRI_Fatiga": "3", "ESSPRI_Dolor": "2",
         "ESSPRI_Result": "2.3", "ESSDAI_Result": "2",
         "EVA_Sequedad_Oral": "2", "EVA_Sequedad_Ocular": "2",
         "EVA_Fatiga_Sjogren": "3", "EVA_Dolor_Sjogren": "2", "EVA_Global_Sjogren": "2",
         "essdaiGlandular": "0", "essdaiBiological": "0",
        },
    ]
    for payload in sj6:
        row = base_visit_row(headers, *sj6_base)
        apply_payload_to_row(row, payload)
        rows["SJOGREN"].append(row)

    return rows


def build_auxiliary_sheets(wb: Workbook) -> None:
    ws_prof = wb.create_sheet("Profesionales")
    prof_headers = ["ID_Profesional", "Nombre_Completo", "Cargo"]
    ws_prof.append(prof_headers)
    ws_prof.append(["PROF-REU-001", "Profesional Demo 1", "Reumatología"])
    ws_prof.append(["PROF-REU-002", "Profesional Demo 2", "Reumatología"])
    ws_prof.append(["PROF-REU-003", "Profesional Demo 3", "Reumatología"])
    ws_prof.append(["PROF-REU-004", "Profesional Demo 4", "Reumatología"])
    ws_prof.append(["PROF-REU-005", "Profesional Demo 5", "Reumatología"])

    ws_drugs = wb.create_sheet("Fármacos")
    ws_drugs.append(["Sistémicos", "FAMEs", "Biológicos"])
    ws_drugs.append(["Prednisona", "Metotrexato", "Adalimumab"])
    ws_drugs.append(["Naproxeno", "Sulfasalazina", "Secukinumab"])
    ws_drugs.append(["", "Hidroxicloroquina", "Baricitinib"])
    ws_drugs.append(["", "Micofenolato", "Rituximab"])
    ws_drugs.append(["", "", "Belimumab"])


def write_workbook(headers: List[str], rows_by_sheet: Dict[str, List[Dict[str, str]]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb = Workbook()
    wb.remove(wb.active)

    for sheet in CLINICAL_SHEETS:
        ws = wb.create_sheet(sheet)
        ws.append(headers)
        for row_dict in rows_by_sheet[sheet]:
            ws.append([row_dict.get(h, "") for h in headers])

    build_auxiliary_sheets(wb)
    wb.save(output_path)


def validate_headers_no_empty_no_dup(headers: List[str]) -> Tuple[bool, bool, List[str], List[str]]:
    empties = [f"index {idx+1}" for idx, h in enumerate(headers) if not h]
    counter = Counter(headers)
    dups = [k for k, v in counter.items() if v > 1 and k]
    return len(empties) == 0, len(dups) == 0, empties, dups


def parse_iso_date(date_str: str):
    try:
        return datetime.strptime(str(date_str), "%Y-%m-%d")
    except Exception:
        return None


def run_post_generation_validations(
    demo_path: Path,
    master_headers: List[str],
    rows_by_sheet: Dict[str, List[Dict[str, str]]],
) -> Tuple[List[ValidationCheck], Dict[str, Dict[str, int]], Dict[str, int]]:
    wb = load_workbook(demo_path, read_only=True, data_only=True)

    checks: List[ValidationCheck] = []
    sheet_shape: Dict[str, Dict[str, int]] = {}

    for sheet in CLINICAL_SHEETS:
        ws = wb[sheet]
        headers = read_header(ws)
        n_cols = len(headers)
        n_rows = 0
        for _ in ws.iter_rows(min_row=2, values_only=True):
            n_rows += 1
        sheet_shape[sheet] = {"columns": n_cols, "rows": n_rows}
        checks.append(ValidationCheck(f"{sheet} = 491 columnas", n_cols == FINAL_COLUMN_COUNT, f"{n_cols}"))

    for sheet in MASTER_BASE_SHEETS:
        headers = read_header(wb[sheet])
        same = headers[:HISTORICAL_COLUMN_COUNT] == master_headers
        checks.append(
            ValidationCheck(
                f"primeras 321 columnas de {sheet} coinciden con maestro",
                same,
                "OK" if same else "Diferencia detectada",
            )
        )

    for sheet in CLINICAL_SHEETS:
        headers = read_header(wb[sheet])
        no_empty, no_dups, empties, dups = validate_headers_no_empty_no_dup(headers)
        checks.append(
            ValidationCheck(
                f"{sheet} sin cabeceras vacías",
                no_empty,
                "" if no_empty else ", ".join(empties[:5]),
            )
        )
        checks.append(
            ValidationCheck(
                f"{sheet} sin cabeceras duplicadas",
                no_dups,
                "" if no_dups else ", ".join(dups[:5]),
            )
        )

    patient_visits = {}
    patients_per_sheet = {}
    for sheet, rows in rows_by_sheet.items():
        if not rows:
            continue
        # Group rows by patient for proper per-patient validation
        by_patient = defaultdict(list)
        for r in rows:
            pid = r.get("ID_Paciente", "?")
            by_patient[pid].append(r)
        patients_per_sheet[sheet] = len(by_patient)
        for pid, p_rows in by_patient.items():
            patient_visits[pid] = len(p_rows)
    all_multi = all(v >= 3 for v in patient_visits.values())
    all_5plus = all(v >= 5 for v in patients_per_sheet.values())
    checks.append(ValidationCheck("cada paciente tiene >=3 visitas", all_multi, f"{len(patient_visits)} pacientes, {sum(patient_visits.values())} visitas total"))
    checks.append(ValidationCheck(">=5 pacientes por hoja", all_5plus, str(patients_per_sheet)))

    date_ok = True
    type_ok = True
    treatment_ok = True
    prebio_ok = True
    score_ok = True
    event_fields_ok = True

    score_fields_by_sheet = {
        "AR": ["DAS28_CRP_Result", "CDAI_Result", "SDAI_Result", "RAPID3_Score"],
        "ESPA": ["BASDAI_Result", "ASDAS_CRP_Result"],
        "APS": ["HAQ_Total", "RAPID3_Score", "LEI_Score"],
        "LES": ["SLEDAI_2K", "SLICC_SDI", "Dosis_Prednisona"],
        "SJOGREN": ["ESSPRI_Result", "ESSDAI_Result", "EVA_Sequedad_Oral"],
    }

    for sheet, rows in rows_by_sheet.items():
        # Group rows by patient for per-patient validation
        by_patient = defaultdict(list)
        for r in rows:
            pid = r.get("ID_Paciente", "?")
            by_patient[pid].append(r)

        # Validate dates within each patient group
        for pid, p_rows in by_patient.items():
            parsed_dates = [parse_iso_date(r.get("Fecha_Visita", "")) for r in p_rows]
            if any(d is None for d in parsed_dates):
                date_ok = False
            else:
                for i in range(1, len(parsed_dates)):
                    if parsed_dates[i] <= parsed_dates[i - 1]:
                        date_ok = False
                        break

        if any(not str(r.get("Tipo_Visita", "")).strip() for r in rows):
            type_ok = False

        if any(not str(r.get("Tratamiento_Actual", "")).strip() for r in rows):
            treatment_ok = False
        if any(not str(r.get("Fecha_Inicio_Tratamiento", "")).strip() for r in rows):
            treatment_ok = False

        if not any(str(r.get("Estado_Prebiologico_Final", "")).strip() for r in rows):
            prebio_ok = False

        sf = score_fields_by_sheet[sheet]
        if not all(any(str(r.get(col, "")).strip() for r in rows) for col in sf):
            score_ok = False

        has_tx_markers = any(
            str(r.get("Decision_Terapeutica", "")).strip()
            or str(r.get("Decision_Terapeutica_PV", "")).strip()
            or str(r.get("Decision_Terapeutica_SEG", "")).strip()
            for r in rows
        )
        has_change_fields = any(
            str(r.get("Cambio_Biologico_Farmaco", "")).strip()
            or str(r.get("Cambio_Motivo", "")).strip()
            or str(r.get("Cambio_Efectos_Adversos", "")).strip()
            for r in rows
        )
        if not (has_tx_markers and has_change_fields):
            event_fields_ok = False

    checks.append(ValidationCheck("Fecha_Visita existe y es ordenable", date_ok))
    checks.append(ValidationCheck("Tipo_Visita existe y está poblado", type_ok))
    checks.append(ValidationCheck("Tratamiento_Actual y Fecha_Inicio_Tratamiento poblados", treatment_ok))
    checks.append(ValidationCheck("prebiológico poblado en casos demo", prebio_ok))
    checks.append(ValidationCheck("scores longitudinales poblados", score_ok))
    checks.append(ValidationCheck("campos de evento terapéutico suficientes para timeline/marcadores", event_fields_ok))

    return checks, sheet_shape, patient_visits


def write_diff_report(
    report_path: Path,
    master_path: Path,
    output_path: Path,
    master_headers: List[str],
    v2_headers: List[str],
    checks: List[ValidationCheck],
    sheet_shape: Dict[str, Dict[str, int]],
    patient_visits: Dict[str, int],
) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines: List[str] = []
    lines.append("# Reporte Diferencias Excel Demo v2")
    lines.append("")
    lines.append(f"_Generado automáticamente: {now}_")
    lines.append("")
    lines.append("## Fuente canónica")
    lines.append("1. Excel maestro original (`Hub_Clinico_Maestro.xlsx`) para columnas 1-321.")
    lines.append("2. `docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md` para columnas 322-491.")
    lines.append("3. `modules/exportManager.js` como verificación secundaria del orden v2.")
    lines.append("")
    lines.append("## Archivos")
    lines.append(f"- Maestro leído: `{master_path}`")
    lines.append(f"- Demo generado: `{output_path}`")
    lines.append("")
    lines.append("## Estructura final")
    lines.append(f"- Columnas históricas intactas: `{len(master_headers)}`")
    lines.append(f"- Columnas v2 añadidas: `{len(v2_headers)}`")
    lines.append(f"- Total por hoja clínica: `{len(master_headers) + len(v2_headers)}`")
    lines.append("")
    lines.append("## Resumen por hoja")
    lines.append("")
    lines.append("| Hoja | Columnas | Filas |")
    lines.append("|---|---:|---:|")
    for sheet in CLINICAL_SHEETS:
        shape = sheet_shape.get(sheet, {"columns": 0, "rows": 0})
        lines.append(f"| {sheet} | {shape['columns']} | {shape['rows']} |")
    for aux in ["Profesionales", "Fármacos"]:
        lines.append(f"| {aux} | (auxiliar) | (auxiliar) |")
    lines.append("")
    lines.append("## Pacientes demo longitudinales")
    lines.append("")
    for pid, n in sorted(patient_visits.items()):
        lines.append(f"- `{pid}`: {n} visitas")
    lines.append("")
    lines.append("## Validaciones automáticas")
    lines.append("")
    for check in checks:
        mark = "[x]" if check.ok else "[ ]"
        detail = f" — {check.detail}" if check.detail else ""
        lines.append(f"- {mark} {check.label}{detail}")
    lines.append("")
    lines.append("## Diferencias conocidas")
    lines.append("- LES/SJOGREN no existen en el maestro original; se construyen con las 321 históricas + 170 v2.")
    lines.append("- No se crea hoja `Prebiologico` obligatoria en esta demo (decisión de pegado único por patología).")
    lines.append("- No se crea ninguna columna/hoja de `Solicitud FH` (salida derivada TXT).")
    lines.append("")
    lines.append("## Columnas v2 añadidas (322-491)")
    lines.append("")
    lines.append(f"Total: {len(v2_headers)}")
    lines.append("")
    lines.append("```text")
    for idx, header in enumerate(v2_headers, start=V2_START):
        lines.append(f"{idx:03d} {header}")
    lines.append("```")
    lines.append("")

    report_path.write_text("\n".join(lines), encoding="utf-8")


def print_console_summary(
    output_path: Path,
    checks: List[ValidationCheck],
    sheet_shape: Dict[str, Dict[str, int]],
    patient_visits: Dict[str, int],
) -> None:
    print(f"[OK] Demo generado: {output_path}")
    print("")
    print("Resumen de hojas clínicas:")
    for sheet in CLINICAL_SHEETS:
        shape = sheet_shape[sheet]
        print(f"  - {sheet}: {shape['rows']} filas, {shape['columns']} columnas")
    print("")
    print("Pacientes demo:")
    for pid, n in sorted(patient_visits.items()):
        print(f"  - {pid}: {n} visitas")
    print("")
    print("Validaciones:")
    for check in checks:
        state = "OK " if check.ok else "FAIL"
        detail = f" ({check.detail})" if check.detail else ""
        print(f"  [{state}] {check.label}{detail}")


def main() -> None:
    ar_headers, headers_by_sheet = load_master_historical_headers(MASTER_XLSX)

    # Validación AR/ESPA/APS = 321 e idénticas
    for sheet, headers in headers_by_sheet.items():
        if len(headers) != HISTORICAL_COLUMN_COUNT:
            raise ValueError(f"{sheet} no tiene {HISTORICAL_COLUMN_COUNT} columnas (tiene {len(headers)}).")
    if headers_by_sheet["ESPA"] != ar_headers or headers_by_sheet["APS"] != ar_headers:
        raise ValueError("AR/ESPA/APS no tienen cabeceras históricas idénticas en el maestro.")

    v2_headers = parse_v2_headers_from_contract(ORDER_MD)
    clinical_headers = ar_headers + v2_headers
    if len(clinical_headers) != FINAL_COLUMN_COUNT:
        raise ValueError(f"Cabecera final inválida: {len(clinical_headers)} columnas (esperado {FINAL_COLUMN_COUNT}).")

    rows_by_sheet = build_clinical_rows(clinical_headers)
    write_workbook(clinical_headers, rows_by_sheet, OUTPUT_XLSX)

    checks, sheet_shape, patient_visits = run_post_generation_validations(
        OUTPUT_XLSX,
        ar_headers,
        rows_by_sheet,
    )
    write_diff_report(
        REPORT_MD,
        MASTER_XLSX,
        OUTPUT_XLSX,
        ar_headers,
        v2_headers,
        checks,
        sheet_shape,
        patient_visits,
    )
    print_console_summary(OUTPUT_XLSX, checks, sheet_shape, patient_visits)


if __name__ == "__main__":
    main()
