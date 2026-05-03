#!/usr/bin/env python3
"""
generate_demo_db.py — Generador reproducible de base demo para Hub Clínico Reuma v2.

Crea data/Hub_Clinico_Maestro_V2_DEMO.xlsx con datos ficticios longitudinales
para validar el dashboard multipatología.

Uso:
    python scripts/generate_demo_db.py

Requisitos: openpyxl
Instalar si falta: pip install openpyxl

NO contiene datos reales ni CIPs reales. Idempotente (sobrescribe el archivo).
"""

import os
import sys

# ── Dependency check ────────────────────────────────────────────────────────
try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from openpyxl.utils import get_column_letter
except ImportError:
    print("ERROR: openpyxl no está instalado.")
    print("Instálalo con: pip install openpyxl")
    sys.exit(1)

# ── Paths ───────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "Hub_Clinico_Maestro_V2_DEMO.xlsx")

os.makedirs(DATA_DIR, exist_ok=True)


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def write_header(ws, headers, bold=True):
    """Escribe fila de cabecera con formato."""
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        if bold:
            cell.font = Font(bold=True, size=10)
        cell.alignment = Alignment(horizontal='center', wrap_text=True)


def write_row(ws, row_idx, values):
    """Escribe una fila de datos desde una lista."""
    for col_idx, value in enumerate(values, 1):
        ws.cell(row=row_idx, column=col_idx, value=value)


def cols(headers, **kwargs):
    """Construye una fila a partir de dict clave→valor con defaults vacíos."""
    row = [kwargs.get(h, '') for h in headers]
    return row


# ═══════════════════════════════════════════════════════════════════════════
# Common column definitions
# ═══════════════════════════════════════════════════════════════════════════

COMMON_HEADERS = [
    # Identificación (1-4)
    "ID_Paciente", "CIP", "Nombre_Paciente", "Sexo",
    # Visita (5-8)
    "Fecha_Visita", "Tipo_Visita", "Profesional", "Diagnostico_Primario",
    # Antropométricos (9-12)
    "Peso", "Talla", "IMC", "TA",
    # Comorbilidades (13-17)
    "Comorbilidad_HTA", "Comorbilidad_DM", "Comorbilidad_DLP",
    "Comorbilidad_ECV", "Comorbilidad_Obesidad",
    # Tratamiento (18-26)
    "Tratamiento_Actual", "Fecha_Inicio_Tratamiento",
    "Decision_Terapeutica_PV", "Decision_Terapeutica",
    "Cambio_Motivo", "Cambio_Efectos_Adversos",
    "Cambio_Descripcion_Efectos", "Cambio_Biologico_Farmaco",
    "Cambio_Biologico_Dosis",
    # Seguimiento (27-30)
    "Fecha_Proxima_Revision", "Comentarios_Adicionales",
    "Estado_Prebiologico_Ultimo", "Fecha_Validacion_Prebiologico_Ultima",
]

AR_EXTRA_HEADERS = [
    # Exploración / Scores
    "HLA_B27", "FR", "APCC", "ANA",
    "NAD_Total", "NAT_Total", "NAD28", "NAT28",
    "Dactilitis_Total",
    # EVAS
    "EVA_Global", "EVA_Dolor", "EVA_Fatiga", "EVA_Medico",
    # Laboratorio
    "PCR", "VSG",
    # Scores AR
    "DAS28_CRP_Result", "DAS28_ESR_Result",
    "CDAI_Result", "SDAI_Result",
    "RAPID3_Score", "RAPID3_Categoria", "HAQ_Total",
    # Bio
    "Decision_Terapeutica_SEG",
]

# ESPA/APS extra (BASDAI, ASDAS, etc.)
ESPA_APS_EXTRA = [
    "HLA_B27", "FR", "APCC", "ANA",
    "NAD_Total", "NAT_Total", "NAD28", "NAT28",
    "Dactilitis_Total",
    "EVA_Global", "EVA_Dolor", "EVA_Fatiga", "EVA_Medico",
    "PCR", "VSG",
    "BASDAI_Result", "ASDAS_CRP_Result", "ASDAS_ESR_Result",
    "DAS28_CRP_Result", "CDAI_Result", "SDAI_Result",
    "RAPID3_Score", "HAQ_Total",
    "Decision_Terapeutica_SEG",
]

# LES-specific columns
LES_HEADERS = COMMON_HEADERS + [
    # Actividad LES (35-41)
    "SLEDAI_2K_Result", "SLICC_ACR_SDI",
    "Dosis_Prednisona_Mg_Dia", "Brote_Actual",
    "Tipo_Brote", "Actividad_Global_Medico", "Actividad_Global_Paciente",
    # Manifestaciones (42-51)
    "Manifestacion_Cutaneo", "Manifestacion_Articular",
    "Manifestacion_Renal", "Manifestacion_Neurologico",
    "Manifestacion_Hematologico", "Manifestacion_Seroso",
    "Manifestacion_Cardiopulmonar", "Manifestacion_Vascular",
    "Manifestacion_Ocular", "Manifestacion_Otros",
    # Inmunología (52-65)
    "ANA", "Anti_DNA", "Anti_Sm", "Anti_Ro", "Anti_La",
    "C3", "C4", "Proteinuria", "Sedimento_Urinario",
    "Creatinina", "PCR", "VSG",
    "Hemograma_Alteraciones", "Otros_Hallazgos_Inmunologia",
    # PROs (66-69)
    "EVA_Dolor", "EVA_Fatiga", "EVA_Global", "Calidad_Vida",
    # Tratamiento específico LES
    "Tratamiento_Actual", "Fecha_Inicio_Tratamiento",
    "Decision_Terapeutica", "Cambio_Motivo",
    "Cambio_Efectos_Adversos", "Cambio_Descripcion_Efectos",
    "Cambio_Biologico_Farmaco",
    # Seguimiento
    "Fecha_Proxima_Revision", "Comentarios_Adicionales",
    "Estado_Prebiologico_Ultimo", "Fecha_Validacion_Prebiologico_Ultima",
]

# Sjögren-specific columns
SJOGREN_HEADERS = COMMON_HEADERS + [
    # Actividad Sjögren (35-39)
    "ESSPRI_Result", "ESSDAI_Result",
    "EVA_Sequedad_Oral", "EVA_Sequedad_Ocular",
    "EVA_Fatiga", "EVA_Dolor",
    # Manifestaciones (40-47)
    "Manifestacion_Glandular", "Manifestacion_Articular",
    "Manifestacion_Cutaneo", "Manifestacion_Pulmonar",
    "Manifestacion_Renal", "Manifestacion_Neurologico",
    "Manifestacion_Hematologico", "Manifestacion_Biologico",
    # Pruebas (48-53)
    "Anti_Ro", "Anti_La", "FR", "ANA",
    "Test_Schirmer", "Biopsia_Glandula_Salival",
    # Laboratorio (54-59)
    "PCR", "VSG", "C3", "C4", "Creatinina", "Gammaglobulina",
    # PROs adicionales
    "EVA_Global", "Calidad_Vida",
    # Tratamiento específico
    "Tratamiento_Actual", "Fecha_Inicio_Tratamiento",
    "Decision_Terapeutica", "Cambio_Motivo",
    "Cambio_Efectos_Adversos", "Cambio_Descripcion_Efectos",
    "Cambio_Biologico_Farmaco",
    # Seguimiento
    "Fecha_Proxima_Revision", "Comentarios_Adicionales",
    "Estado_Prebiologico_Ultimo", "Fecha_Validacion_Prebiologico_Ultima",
]

PREBIOLOGICO_HEADERS = [
    "CIP", "Estado", "Fecha_Validacion",
    "Notas", "Fecha_Registro", "Profesional_Validador",
]

PROFESIONALES_HEADERS = [
    "ID_Profesional", "Nombre", "Rol",
]

FARMACOS_HEADERS = [
    "Sistémicos", "FAMEs", "Biológicos",
]


# ═══════════════════════════════════════════════════════════════════════════
# Sheet builders
# ═══════════════════════════════════════════════════════════════════════════

def build_ar_sheet(wb):
    """AR sheet: DEMO-AR-001 — 4 visitas longitudinales."""
    ws = wb.create_sheet("AR")
    headers = COMMON_HEADERS + AR_EXTRA_HEADERS
    write_header(ws, headers)

    # Common base for all visits
    base = {
        "ID_Paciente": "DEMO-AR-001",
        "CIP": "DEMO-AR-001",
        "Nombre_Paciente": "María Demo AR",
        "Sexo": "Femenino",
        "Profesional": "PROF-001",
        "Diagnostico_Primario": "ar",
        "Peso": "72",
        "Talla": "1.65",
        "IMC": "26.4",
        "TA": "135/85",
        "Comorbilidad_HTA": "SI",
        "Comorbilidad_DM": "NO",
        "Comorbilidad_DLP": "SI",
        "Comorbilidad_ECV": "NO",
        "Comorbilidad_Obesidad": "SI",
        "HLA_B27": "Negativo",
        "FR": "Positivo",
        "APCC": "Positivo",
        "ANA": "Negativo",
        "EVA_Fatiga": "",
    }

    visits = [
        {
            "Fecha_Visita": "15/01/2024",
            "Tipo_Visita": "primera",
            "NAD_Total": "8", "NAT_Total": "3", "NAD28": "6", "NAT28": "4",
            "Dactilitis_Total": "0",
            "EVA_Global": "75", "EVA_Dolor": "80", "EVA_Medico": "70",
            "PCR": "12", "VSG": "45",
            "DAS28_CRP_Result": "6.2", "DAS28_ESR_Result": "6.4",
            "CDAI_Result": "28", "SDAI_Result": "32",
            "RAPID3_Score": "18", "RAPID3_Categoria": "Alta actividad",
            "HAQ_Total": "1.8",
            "Tratamiento_Actual": "Metotrexato 15mg/semanal",
            "Fecha_Inicio_Tratamiento": "15/01/2024",
            "Decision_Terapeutica_PV": "iniciar",
            "Decision_Terapeutica": "iniciar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "",
            "Cambio_Efectos_Adversos": "",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "",
            "Cambio_Biologico_Dosis": "",
            "Fecha_Proxima_Revision": "20/04/2024",
            "Comentarios_Adicionales": "Primera valoración. Inicio DMARD.",
            "Estado_Prebiologico_Ultimo": "",
            "Fecha_Validacion_Prebiologico_Ultima": "",
        },
        {
            "Fecha_Visita": "20/04/2024",
            "Tipo_Visita": "seguimiento",
            "NAD_Total": "5", "NAT_Total": "2", "NAD28": "4", "NAT28": "3",
            "Dactilitis_Total": "0",
            "EVA_Global": "55", "EVA_Dolor": "60", "EVA_Medico": "50",
            "PCR": "8", "VSG": "30",
            "DAS28_CRP_Result": "4.8", "DAS28_ESR_Result": "5.0",
            "CDAI_Result": "18", "SDAI_Result": "22",
            "RAPID3_Score": "12", "RAPID3_Categoria": "Actividad moderada",
            "HAQ_Total": "1.4",
            "Tratamiento_Actual": "Metotrexato 15mg/semanal + Adalimumab 40mg cada 2 semanas",
            "Fecha_Inicio_Tratamiento": "20/04/2024",
            "Decision_Terapeutica_PV": "cambiar",
            "Decision_Terapeutica": "cambiar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "Respuesta insuficiente al DMARD",
            "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "Adalimumab",
            "Cambio_Biologico_Dosis": "40mg cada 2 semanas",
            "Fecha_Proxima_Revision": "10/08/2024",
            "Comentarios_Adicionales": "Inicio anti-TNF por respuesta insuficiente.",
            "Estado_Prebiologico_Ultimo": "APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "15/04/2024",
        },
        {
            "Fecha_Visita": "10/08/2024",
            "Tipo_Visita": "seguimiento",
            "NAD_Total": "3", "NAT_Total": "1", "NAD28": "2", "NAT28": "1",
            "Dactilitis_Total": "0",
            "EVA_Global": "30", "EVA_Dolor": "35", "EVA_Medico": "25",
            "PCR": "4", "VSG": "18",
            "DAS28_CRP_Result": "3.2", "DAS28_ESR_Result": "3.4",
            "CDAI_Result": "10", "SDAI_Result": "12",
            "RAPID3_Score": "8", "RAPID3_Categoria": "Actividad baja",
            "HAQ_Total": "0.8",
            "Tratamiento_Actual": "Metotrexato 15mg/semanal + Baricitinib 4mg/día",
            "Fecha_Inicio_Tratamiento": "10/08/2024",
            "Decision_Terapeutica_PV": "cambiar",
            "Decision_Terapeutica": "cambiar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "Efectos adversos / intolerancia",
            "Cambio_Efectos_Adversos": "SI",
            "Cambio_Descripcion_Efectos": "Reacción local en lugar de inyección, persistente",
            "Cambio_Biologico_Farmaco": "Baricitinib",
            "Cambio_Biologico_Dosis": "4mg/día",
            "Fecha_Proxima_Revision": "05/12/2024",
            "Comentarios_Adicionales": "Rotación a JAKi por reacción local a anti-TNF.",
            "Estado_Prebiologico_Ultimo": "APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "15/04/2024",
        },
        {
            "Fecha_Visita": "05/12/2024",
            "Tipo_Visita": "seguimiento",
            "NAD_Total": "1", "NAT_Total": "0", "NAD28": "1", "NAT28": "0",
            "Dactilitis_Total": "0",
            "EVA_Global": "10", "EVA_Dolor": "15", "EVA_Medico": "10",
            "PCR": "1.5", "VSG": "10",
            "DAS28_CRP_Result": "2.1", "DAS28_ESR_Result": "2.3",
            "CDAI_Result": "4", "SDAI_Result": "5",
            "RAPID3_Score": "3", "RAPID3_Categoria": "Remisión/baja actividad",
            "HAQ_Total": "0.3",
            "Tratamiento_Actual": "Metotrexato 15mg/semanal + Baricitinib 4mg/día",
            "Fecha_Inicio_Tratamiento": "05/12/2024",
            "Decision_Terapeutica_PV": "continuar",
            "Decision_Terapeutica": "continuar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "",
            "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "",
            "Cambio_Biologico_Dosis": "",
            "Fecha_Proxima_Revision": "05/06/2025",
            "Comentarios_Adicionales": "Remisión clínica mantenida con JAKi.",
            "Estado_Prebiologico_Ultimo": "APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "15/04/2024",
        },
    ]

    for i, v in enumerate(visits):
        row_data = {**base, **v}
        write_row(ws, i + 2, cols(headers, **row_data))

    return ws


def build_espa_sheet(wb):
    """EspA sheet: DEMO-ESPA-001 — 4 visitas longitudinales."""
    ws = wb.create_sheet("ESPA")
    headers = COMMON_HEADERS + ESPA_APS_EXTRA
    write_header(ws, headers)

    base = {
        "ID_Paciente": "DEMO-ESPA-001",
        "CIP": "DEMO-ESPA-001",
        "Nombre_Paciente": "Carlos Demo EspA",
        "Sexo": "Masculino",
        "Profesional": "PROF-001",
        "Diagnostico_Primario": "espa",
        "Peso": "80", "Talla": "1.78", "IMC": "25.2", "TA": "120/80",
        "Comorbilidad_HTA": "NO", "Comorbilidad_DM": "NO",
        "Comorbilidad_DLP": "NO", "Comorbilidad_ECV": "NO",
        "Comorbilidad_Obesidad": "NO",
        "HLA_B27": "Positivo", "FR": "Negativo",
        "APCC": "Negativo", "ANA": "Negativo",
        "EVA_Fatiga": "",
    }

    visits = [
        {
            "Fecha_Visita": "01/02/2024", "Tipo_Visita": "primera",
            "NAD_Total": "2", "NAT_Total": "0", "NAD28": "2", "NAT28": "0",
            "Dactilitis_Total": "1",
            "EVA_Global": "80", "EVA_Dolor": "85", "EVA_Medico": "75",
            "PCR": "15", "VSG": "50",
            "BASDAI_Result": "7.2", "ASDAS_CRP_Result": "3.8",
            "ASDAS_ESR_Result": "3.9",
            "DAS28_CRP_Result": "", "CDAI_Result": "", "SDAI_Result": "",
            "RAPID3_Score": "", "HAQ_Total": "",
            "Tratamiento_Actual": "Metotrexato 20mg/semanal",
            "Fecha_Inicio_Tratamiento": "01/02/2024",
            "Decision_Terapeutica_PV": "iniciar",
            "Decision_Terapeutica": "iniciar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "", "Cambio_Efectos_Adversos": "",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "", "Cambio_Biologico_Dosis": "",
            "Fecha_Proxima_Revision": "15/05/2024",
            "Comentarios_Adicionales": "Diagnóstico reciente. HLA-B27+.",
            "Estado_Prebiologico_Ultimo": "",
            "Fecha_Validacion_Prebiologico_Ultima": "",
        },
        {
            "Fecha_Visita": "15/05/2024", "Tipo_Visita": "seguimiento",
            "NAD_Total": "1", "NAT_Total": "0", "NAD28": "1", "NAT28": "0",
            "Dactilitis_Total": "0",
            "EVA_Global": "60", "EVA_Dolor": "65", "EVA_Medico": "55",
            "PCR": "10", "VSG": "35",
            "BASDAI_Result": "5.8", "ASDAS_CRP_Result": "2.9",
            "ASDAS_ESR_Result": "3.1",
            "DAS28_CRP_Result": "", "CDAI_Result": "", "SDAI_Result": "",
            "RAPID3_Score": "", "HAQ_Total": "",
            "Tratamiento_Actual": "Metotrexato 20mg/semanal + Secukinumab 150mg/mes",
            "Fecha_Inicio_Tratamiento": "15/05/2024",
            "Decision_Terapeutica_PV": "cambiar",
            "Decision_Terapeutica": "cambiar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "Respuesta insuficiente al DMARD",
            "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "Secukinumab",
            "Cambio_Biologico_Dosis": "150mg/mes",
            "Fecha_Proxima_Revision": "10/09/2024",
            "Comentarios_Adicionales": "Inicio anti-IL17 por BASDAI elevado.",
            "Estado_Prebiologico_Ultimo": "EN_CURSO",
            "Fecha_Validacion_Prebiologico_Ultima": "01/05/2024",
        },
        {
            "Fecha_Visita": "10/09/2024", "Tipo_Visita": "seguimiento",
            "NAD_Total": "0", "NAT_Total": "0", "NAD28": "0", "NAT28": "0",
            "Dactilitis_Total": "0",
            "EVA_Global": "30", "EVA_Dolor": "25", "EVA_Medico": "20",
            "PCR": "5", "VSG": "20",
            "BASDAI_Result": "3.2", "ASDAS_CRP_Result": "1.8",
            "ASDAS_ESR_Result": "1.9",
            "DAS28_CRP_Result": "", "CDAI_Result": "", "SDAI_Result": "",
            "RAPID3_Score": "", "HAQ_Total": "",
            "Tratamiento_Actual": "Metotrexato 20mg/semanal + Secukinumab 150mg/mes",
            "Fecha_Inicio_Tratamiento": "10/09/2024",
            "Decision_Terapeutica_PV": "continuar",
            "Decision_Terapeutica": "continuar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "", "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "", "Cambio_Biologico_Dosis": "",
            "Fecha_Proxima_Revision": "20/01/2025",
            "Comentarios_Adicionales": "Buena respuesta a anti-IL17.",
            "Estado_Prebiologico_Ultimo": "APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "01/05/2024",
        },
        {
            "Fecha_Visita": "20/01/2025", "Tipo_Visita": "seguimiento",
            "NAD_Total": "0", "NAT_Total": "0", "NAD28": "0", "NAT28": "0",
            "Dactilitis_Total": "0",
            "EVA_Global": "10", "EVA_Dolor": "5", "EVA_Medico": "10",
            "PCR": "2", "VSG": "12",
            "BASDAI_Result": "1.8", "ASDAS_CRP_Result": "1.2",
            "ASDAS_ESR_Result": "1.3",
            "DAS28_CRP_Result": "", "CDAI_Result": "", "SDAI_Result": "",
            "RAPID3_Score": "", "HAQ_Total": "",
            "Tratamiento_Actual": "Secukinumab 150mg/mes",
            "Fecha_Inicio_Tratamiento": "20/01/2025",
            "Decision_Terapeutica_PV": "cambiar",
            "Decision_Terapeutica": "cambiar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "Remisión clínica",
            "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "",
            "Cambio_Biologico_Dosis": "",
            "Fecha_Proxima_Revision": "20/07/2025",
            "Comentarios_Adicionales": "Remisión clínica. Retirada de metotrexato.",
            "Estado_Prebiologico_Ultimo": "APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "01/05/2024",
        },
    ]

    for i, v in enumerate(visits):
        row_data = {**base, **v}
        write_row(ws, i + 2, cols(headers, **row_data))

    return ws


def build_aps_sheet(wb):
    """APs sheet: DEMO-APS-001 — 4 visitas longitudinales."""
    ws = wb.create_sheet("APS")
    headers = COMMON_HEADERS + ESPA_APS_EXTRA
    write_header(ws, headers)

    base = {
        "ID_Paciente": "DEMO-APS-001",
        "CIP": "DEMO-APS-001",
        "Nombre_Paciente": "Laura Demo APs",
        "Sexo": "Femenino",
        "Profesional": "PROF-001",
        "Diagnostico_Primario": "aps",
        "Peso": "65", "Talla": "1.62", "IMC": "24.8", "TA": "118/75",
        "Comorbilidad_HTA": "NO", "Comorbilidad_DM": "NO",
        "Comorbilidad_DLP": "SI", "Comorbilidad_ECV": "NO",
        "Comorbilidad_Obesidad": "NO",
        "HLA_B27": "Negativo", "FR": "Negativo",
        "APCC": "Negativo", "ANA": "Negativo",
        "EVA_Fatiga": "",
    }

    visits = [
        {
            "Fecha_Visita": "01/03/2024", "Tipo_Visita": "primera",
            "NAD_Total": "5", "NAT_Total": "2", "NAD28": "4", "NAT28": "2",
            "Dactilitis_Total": "3",
            "EVA_Global": "65", "EVA_Dolor": "70", "EVA_Medico": "60",
            "PCR": "8", "VSG": "28",
            "BASDAI_Result": "", "ASDAS_CRP_Result": "",
            "ASDAS_ESR_Result": "",
            "DAS28_CRP_Result": "4.5", "CDAI_Result": "", "SDAI_Result": "",
            "RAPID3_Score": "14", "HAQ_Total": "1.8",
            "Tratamiento_Actual": "Metotrexato 15mg/semanal + Leflunomida 20mg/día",
            "Fecha_Inicio_Tratamiento": "01/03/2024",
            "Decision_Terapeutica_PV": "iniciar",
            "Decision_Terapeutica": "iniciar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "", "Cambio_Efectos_Adversos": "",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "", "Cambio_Biologico_Dosis": "",
            "Fecha_Proxima_Revision": "15/06/2024",
            "Comentarios_Adicionales": "APs con afectación periférica y dactilitis.",
            "Estado_Prebiologico_Ultimo": "",
            "Fecha_Validacion_Prebiologico_Ultima": "",
        },
        {
            "Fecha_Visita": "15/06/2024", "Tipo_Visita": "seguimiento",
            "NAD_Total": "3", "NAT_Total": "1", "NAD28": "2", "NAT28": "1",
            "Dactilitis_Total": "1",
            "EVA_Global": "50", "EVA_Dolor": "55", "EVA_Medico": "45",
            "PCR": "5", "VSG": "18",
            "BASDAI_Result": "", "ASDAS_CRP_Result": "",
            "ASDAS_ESR_Result": "",
            "DAS28_CRP_Result": "3.8", "CDAI_Result": "", "SDAI_Result": "",
            "RAPID3_Score": "10", "HAQ_Total": "1.2",
            "Tratamiento_Actual": "Metotrexato 15mg/semanal + Leflunomida 20mg/día + Adalimumab 40mg cada 2 semanas",
            "Fecha_Inicio_Tratamiento": "15/06/2024",
            "Decision_Terapeutica_PV": "cambiar",
            "Decision_Terapeutica": "cambiar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "Respuesta insuficiente a FAMEs combinados",
            "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "Adalimumab",
            "Cambio_Biologico_Dosis": "40mg cada 2 semanas",
            "Fecha_Proxima_Revision": "01/10/2024",
            "Comentarios_Adicionales": "Inicio anti-TNF tras fallo a FAMEs.",
            "Estado_Prebiologico_Ultimo": "APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "01/06/2024",
        },
        {
            "Fecha_Visita": "01/10/2024", "Tipo_Visita": "seguimiento",
            "NAD_Total": "1", "NAT_Total": "0", "NAD28": "1", "NAT28": "0",
            "Dactilitis_Total": "0",
            "EVA_Global": "25", "EVA_Dolor": "20", "EVA_Medico": "20",
            "PCR": "2", "VSG": "10",
            "BASDAI_Result": "", "ASDAS_CRP_Result": "",
            "ASDAS_ESR_Result": "",
            "DAS28_CRP_Result": "2.5", "CDAI_Result": "", "SDAI_Result": "",
            "RAPID3_Score": "5", "HAQ_Total": "0.6",
            "Tratamiento_Actual": "Metotrexato 15mg/semanal + Adalimumab 40mg cada 2 semanas",
            "Fecha_Inicio_Tratamiento": "01/10/2024",
            "Decision_Terapeutica_PV": "continuar",
            "Decision_Terapeutica": "continuar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "", "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "", "Cambio_Biologico_Dosis": "",
            "Fecha_Proxima_Revision": "01/02/2025",
            "Comentarios_Adicionales": "Buena respuesta a anti-TNF. Retirada leflunomida.",
            "Estado_Prebiologico_Ultimo": "APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "01/06/2024",
        },
        {
            "Fecha_Visita": "01/02/2025", "Tipo_Visita": "seguimiento",
            "NAD_Total": "0", "NAT_Total": "0", "NAD28": "0", "NAT28": "0",
            "Dactilitis_Total": "0",
            "EVA_Global": "10", "EVA_Dolor": "5", "EVA_Medico": "5",
            "PCR": "1", "VSG": "8",
            "BASDAI_Result": "", "ASDAS_CRP_Result": "",
            "ASDAS_ESR_Result": "",
            "DAS28_CRP_Result": "1.8", "CDAI_Result": "", "SDAI_Result": "",
            "RAPID3_Score": "2", "HAQ_Total": "0.3",
            "Tratamiento_Actual": "Metotrexato 10mg/semanal + Adalimumab 40mg cada 2 semanas",
            "Fecha_Inicio_Tratamiento": "01/02/2025",
            "Decision_Terapeutica_PV": "cambiar",
            "Decision_Terapeutica": "cambiar",
            "Decision_Terapeutica_SEG": "",
            "Cambio_Motivo": "Remisión clínica",
            "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "",
            "Cambio_Biologico_Dosis": "",
            "Fecha_Proxima_Revision": "01/08/2025",
            "Comentarios_Adicionales": "Reducción de metotrexato por remisión.",
            "Estado_Prebiologico_Ultimo": "APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "01/06/2024",
        },
    ]

    for i, v in enumerate(visits):
        row_data = {**base, **v}
        write_row(ws, i + 2, cols(headers, **row_data))

    return ws


def build_les_sheet(wb):
    """LES sheet: DEMO-LES-001 — 4 visitas longitudinales."""
    ws = wb.create_sheet("LES")
    headers = LES_HEADERS
    write_header(ws, headers)

    base = {
        "ID_Paciente": "DEMO-LES-001",
        "CIP": "DEMO-LES-001",
        "Nombre_Paciente": "Ana Demo LES",
        "Sexo": "Femenino",
        "Profesional": "PROF-001",
        "Diagnostico_Primario": "les",
        "Peso": "58", "Talla": "1.60", "IMC": "22.7", "TA": "110/70",
        "Comorbilidad_HTA": "NO", "Comorbilidad_DM": "NO",
        "Comorbilidad_DLP": "NO", "Comorbilidad_ECV": "NO",
        "Comorbilidad_Obesidad": "NO",
    }

    visits = [
        {
            "Fecha_Visita": "20/01/2024", "Tipo_Visita": "primera",
            "SLEDAI_2K_Result": "16", "SLICC_ACR_SDI": "2",
            "Dosis_Prednisona_Mg_Dia": "30",
            "Brote_Actual": "moderado",
            "Tipo_Brote": "Nefrítico y cutáneo",
            "Actividad_Global_Medico": "80", "Actividad_Global_Paciente": "75",
            "Manifestacion_Cutaneo": "SI", "Manifestacion_Articular": "SI",
            "Manifestacion_Renal": "SI", "Manifestacion_Neurologico": "NO",
            "Manifestacion_Hematologico": "SI", "Manifestacion_Seroso": "NO",
            "Manifestacion_Cardiopulmonar": "NO", "Manifestacion_Vascular": "NO",
            "Manifestacion_Ocular": "NO", "Manifestacion_Otros": "NO",
            "ANA": "Positivo", "Anti_DNA": "Positivo", "Anti_Sm": "Negativo",
            "Anti_Ro": "Positivo", "Anti_La": "Negativo",
            "C3": "45", "C4": "8",
            "Proteinuria": "1.8", "Sedimento_Urinario": "Patológico",
            "Creatinina": "1.2", "PCR": "18", "VSG": "55",
            "Hemograma_Alteraciones": "Leucopenia", "Otros_Hallazgos_Inmunologia": "",
            "EVA_Dolor": "70", "EVA_Fatiga": "85", "EVA_Global": "75",
            "Calidad_Vida": "Regular",
            "Tratamiento_Actual": "Hidroxicloroquina 400mg/día + Prednisona 30mg/día",
            "Fecha_Inicio_Tratamiento": "20/01/2024",
            "Decision_Terapeutica": "iniciar",
            "Cambio_Motivo": "", "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "", "Cambio_Biologico_Farmaco": "",
            "Fecha_Proxima_Revision": "10/05/2024",
            "Comentarios_Adicionales": "Brote moderado con afectación renal. SLEDAI-2K=16.",
            "Estado_Prebiologico_Ultimo": "NO_APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "01/02/2024",
        },
        {
            "Fecha_Visita": "10/05/2024", "Tipo_Visita": "seguimiento",
            "SLEDAI_2K_Result": "10", "SLICC_ACR_SDI": "2",
            "Dosis_Prednisona_Mg_Dia": "20",
            "Brote_Actual": "leve",
            "Tipo_Brote": "Articular",
            "Actividad_Global_Medico": "50", "Actividad_Global_Paciente": "55",
            "Manifestacion_Cutaneo": "NO", "Manifestacion_Articular": "SI",
            "Manifestacion_Renal": "SI", "Manifestacion_Neurologico": "NO",
            "Manifestacion_Hematologico": "NO", "Manifestacion_Seroso": "NO",
            "Manifestacion_Cardiopulmonar": "NO", "Manifestacion_Vascular": "NO",
            "Manifestacion_Ocular": "NO", "Manifestacion_Otros": "NO",
            "ANA": "", "Anti_DNA": "Positivo", "Anti_Sm": "",
            "Anti_Ro": "", "Anti_La": "",
            "C3": "60", "C4": "12",
            "Proteinuria": "1.2", "Sedimento_Urinario": "Patológico",
            "Creatinina": "1.0", "PCR": "10", "VSG": "30",
            "Hemograma_Alteraciones": "", "Otros_Hallazgos_Inmunologia": "",
            "EVA_Dolor": "45", "EVA_Fatiga": "55", "EVA_Global": "50",
            "Calidad_Vida": "Aceptable",
            "Tratamiento_Actual": "Hidroxicloroquina 400mg/día + Prednisona 20mg/día + Mofetil micofenolato 1500mg/día",
            "Fecha_Inicio_Tratamiento": "10/05/2024",
            "Decision_Terapeutica": "cambiar",
            "Cambio_Motivo": "Persistencia de actividad renal",
            "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "",
            "Fecha_Proxima_Revision": "05/09/2024",
            "Comentarios_Adicionales": "Añadido micofenolato por proteinuria persistente.",
            "Estado_Prebiologico_Ultimo": "NO_APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "01/02/2024",
        },
        {
            "Fecha_Visita": "05/09/2024", "Tipo_Visita": "seguimiento",
            "SLEDAI_2K_Result": "4", "SLICC_ACR_SDI": "3",
            "Dosis_Prednisona_Mg_Dia": "10",
            "Brote_Actual": "no",
            "Tipo_Brote": "",
            "Actividad_Global_Medico": "25", "Actividad_Global_Paciente": "30",
            "Manifestacion_Cutaneo": "NO", "Manifestacion_Articular": "NO",
            "Manifestacion_Renal": "NO", "Manifestacion_Neurologico": "NO",
            "Manifestacion_Hematologico": "NO", "Manifestacion_Seroso": "NO",
            "Manifestacion_Cardiopulmonar": "NO", "Manifestacion_Vascular": "NO",
            "Manifestacion_Ocular": "NO", "Manifestacion_Otros": "NO",
            "ANA": "", "Anti_DNA": "Negativo", "Anti_Sm": "",
            "Anti_Ro": "", "Anti_La": "",
            "C3": "85", "C4": "18",
            "Proteinuria": "0.3", "Sedimento_Urinario": "Normal",
            "Creatinina": "0.9", "PCR": "4", "VSG": "15",
            "Hemograma_Alteraciones": "", "Otros_Hallazgos_Inmunologia": "",
            "EVA_Dolor": "20", "EVA_Fatiga": "30", "EVA_Global": "25",
            "Calidad_Vida": "Buena",
            "Tratamiento_Actual": "Hidroxicloroquina 400mg/día + Prednisona 10mg/día + Mofetil micofenolato 1500mg/día",
            "Fecha_Inicio_Tratamiento": "05/09/2024",
            "Decision_Terapeutica": "continuar",
            "Cambio_Motivo": "", "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "", "Cambio_Biologico_Farmaco": "",
            "Fecha_Proxima_Revision": "15/01/2025",
            "Comentarios_Adicionales": "Mejoría progresiva. Reducción de prednisona.",
            "Estado_Prebiologico_Ultimo": "APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "15/08/2024",
        },
        {
            "Fecha_Visita": "15/01/2025", "Tipo_Visita": "seguimiento",
            "SLEDAI_2K_Result": "1", "SLICC_ACR_SDI": "3",
            "Dosis_Prednisona_Mg_Dia": "5",
            "Brote_Actual": "no",
            "Tipo_Brote": "",
            "Actividad_Global_Medico": "5", "Actividad_Global_Paciente": "10",
            "Manifestacion_Cutaneo": "NO", "Manifestacion_Articular": "NO",
            "Manifestacion_Renal": "NO", "Manifestacion_Neurologico": "NO",
            "Manifestacion_Hematologico": "NO", "Manifestacion_Seroso": "NO",
            "Manifestacion_Cardiopulmonar": "NO", "Manifestacion_Vascular": "NO",
            "Manifestacion_Ocular": "NO", "Manifestacion_Otros": "NO",
            "ANA": "", "Anti_DNA": "Negativo", "Anti_Sm": "",
            "Anti_Ro": "", "Anti_La": "",
            "C3": "95", "C4": "20",
            "Proteinuria": "0.15", "Sedimento_Urinario": "Normal",
            "Creatinina": "0.85", "PCR": "1.5", "VSG": "10",
            "Hemograma_Alteraciones": "", "Otros_Hallazgos_Inmunologia": "",
            "EVA_Dolor": "5", "EVA_Fatiga": "15", "EVA_Global": "10",
            "Calidad_Vida": "Muy buena",
            "Tratamiento_Actual": "Hidroxicloroquina 400mg/día + Prednisona 5mg/día + Mofetil micofenolato 1500mg/día",
            "Fecha_Inicio_Tratamiento": "15/01/2025",
            "Decision_Terapeutica": "continuar",
            "Cambio_Motivo": "", "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "", "Cambio_Biologico_Farmaco": "",
            "Fecha_Proxima_Revision": "15/07/2025",
            "Comentarios_Adicionales": "Remisión clínica. SLEDAI-2K=1. Mantener tratamiento.",
            "Estado_Prebiologico_Ultimo": "APTO",
            "Fecha_Validacion_Prebiologico_Ultima": "15/08/2024",
        },
    ]

    for i, v in enumerate(visits):
        row_data = {**base, **v}
        write_row(ws, i + 2, cols(headers, **row_data))

    return ws


def build_sjogren_sheet(wb):
    """Sjögren sheet: DEMO-SJOGREN-001 — 4 visitas longitudinales."""
    ws = wb.create_sheet("SJOGREN")
    headers = SJOGREN_HEADERS
    write_header(ws, headers)

    base = {
        "ID_Paciente": "DEMO-SJOGREN-001",
        "CIP": "DEMO-SJOGREN-001",
        "Nombre_Paciente": "Elena Demo Sjögren",
        "Sexo": "Femenino",
        "Profesional": "PROF-001",
        "Diagnostico_Primario": "sjogren",
        "Peso": "62", "Talla": "1.63", "IMC": "23.3", "TA": "115/72",
        "Comorbilidad_HTA": "NO", "Comorbilidad_DM": "NO",
        "Comorbilidad_DLP": "NO", "Comorbilidad_ECV": "NO",
        "Comorbilidad_Obesidad": "NO",
    }

    visits = [
        {
            "Fecha_Visita": "10/02/2024", "Tipo_Visita": "primera",
            "ESSPRI_Result": "7.5", "ESSDAI_Result": "18",
            "EVA_Sequedad_Oral": "8", "EVA_Sequedad_Ocular": "7",
            "EVA_Fatiga": "8", "EVA_Dolor": "6",
            "Manifestacion_Glandular": "SI", "Manifestacion_Articular": "SI",
            "Manifestacion_Cutaneo": "NO", "Manifestacion_Pulmonar": "NO",
            "Manifestacion_Renal": "NO", "Manifestacion_Neurologico": "NO",
            "Manifestacion_Hematologico": "NO", "Manifestacion_Biologico": "SI",
            "Anti_Ro": "Positivo", "Anti_La": "Positivo",
            "FR": "Positivo", "ANA": "Positivo",
            "Test_Schirmer": "Positivo", "Biopsia_Glandula_Salival": "Positiva",
            "PCR": "5", "VSG": "35", "C3": "80", "C4": "15",
            "Creatinina": "0.8", "Gammaglobulina": "2.5",
            "EVA_Global": "75", "Calidad_Vida": "Mala",
            "Tratamiento_Actual": "Pilocarpina 5mg 3 veces al día",
            "Fecha_Inicio_Tratamiento": "10/02/2024",
            "Decision_Terapeutica": "iniciar",
            "Cambio_Motivo": "", "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "", "Cambio_Biologico_Farmaco": "",
            "Fecha_Proxima_Revision": "20/06/2024",
            "Comentarios_Adicionales": "Alta actividad sistémica. ESSDAI=18. Anti-Ro/La+.",
            "Estado_Prebiologico_Ultimo": "",
            "Fecha_Validacion_Prebiologico_Ultima": "",
        },
        {
            "Fecha_Visita": "20/06/2024", "Tipo_Visita": "seguimiento",
            "ESSPRI_Result": "6.0", "ESSDAI_Result": "14",
            "EVA_Sequedad_Oral": "6", "EVA_Sequedad_Ocular": "5",
            "EVA_Fatiga": "7", "EVA_Dolor": "5",
            "Manifestacion_Glandular": "SI", "Manifestacion_Articular": "SI",
            "Manifestacion_Cutaneo": "NO", "Manifestacion_Pulmonar": "NO",
            "Manifestacion_Renal": "NO", "Manifestacion_Neurologico": "NO",
            "Manifestacion_Hematologico": "NO", "Manifestacion_Biologico": "SI",
            "Anti_Ro": "", "Anti_La": "", "FR": "", "ANA": "",
            "Test_Schirmer": "", "Biopsia_Glandula_Salival": "",
            "PCR": "4", "VSG": "28", "C3": "85", "C4": "16",
            "Creatinina": "0.8", "Gammaglobulina": "2.3",
            "EVA_Global": "60", "Calidad_Vida": "Regular",
            "Tratamiento_Actual": "Pilocarpina 5mg 3 veces al día + Hidroxicloroquina 400mg/día",
            "Fecha_Inicio_Tratamiento": "20/06/2024",
            "Decision_Terapeutica": "cambiar",
            "Cambio_Motivo": "Actividad sistémica persistente",
            "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "",
            "Fecha_Proxima_Revision": "15/10/2024",
            "Comentarios_Adicionales": "Añadida HCQ por ESSDAI elevado.",
            "Estado_Prebiologico_Ultimo": "NO_EVALUADO",
            "Fecha_Validacion_Prebiologico_Ultima": "",
        },
        {
            "Fecha_Visita": "15/10/2024", "Tipo_Visita": "seguimiento",
            "ESSPRI_Result": "4.5", "ESSDAI_Result": "8",
            "EVA_Sequedad_Oral": "5", "EVA_Sequedad_Ocular": "4",
            "EVA_Fatiga": "5", "EVA_Dolor": "4",
            "Manifestacion_Glandular": "NO", "Manifestacion_Articular": "SI",
            "Manifestacion_Cutaneo": "NO", "Manifestacion_Pulmonar": "NO",
            "Manifestacion_Renal": "NO", "Manifestacion_Neurologico": "NO",
            "Manifestacion_Hematologico": "NO", "Manifestacion_Biologico": "NO",
            "Anti_Ro": "", "Anti_La": "", "FR": "", "ANA": "",
            "Test_Schirmer": "", "Biopsia_Glandula_Salival": "",
            "PCR": "3", "VSG": "20", "C3": "90", "C4": "18",
            "Creatinina": "0.8", "Gammaglobulina": "1.8",
            "EVA_Global": "45", "Calidad_Vida": "Aceptable",
            "Tratamiento_Actual": "Pilocarpina 5mg 3 veces al día + Hidroxicloroquina 400mg/día + Rituximab 1g cada 6 meses",
            "Fecha_Inicio_Tratamiento": "15/10/2024",
            "Decision_Terapeutica": "cambiar",
            "Cambio_Motivo": "Respuesta insuficiente a FAMEs",
            "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "",
            "Cambio_Biologico_Farmaco": "Rituximab",
            "Fecha_Proxima_Revision": "01/03/2025",
            "Comentarios_Adicionales": "Inicio Rituximab. Mejoría progresiva.",
            "Estado_Prebiologico_Ultimo": "NO_EVALUADO",
            "Fecha_Validacion_Prebiologico_Ultima": "",
        },
        {
            "Fecha_Visita": "01/03/2025", "Tipo_Visita": "seguimiento",
            "ESSPRI_Result": "3.0", "ESSDAI_Result": "4",
            "EVA_Sequedad_Oral": "3", "EVA_Sequedad_Ocular": "2",
            "EVA_Fatiga": "3", "EVA_Dolor": "2",
            "Manifestacion_Glandular": "NO", "Manifestacion_Articular": "NO",
            "Manifestacion_Cutaneo": "NO", "Manifestacion_Pulmonar": "NO",
            "Manifestacion_Renal": "NO", "Manifestacion_Neurologico": "NO",
            "Manifestacion_Hematologico": "NO", "Manifestacion_Biologico": "NO",
            "Anti_Ro": "", "Anti_La": "", "FR": "", "ANA": "",
            "Test_Schirmer": "", "Biopsia_Glandula_Salival": "",
            "PCR": "2", "VSG": "12", "C3": "95", "C4": "20",
            "Creatinina": "0.8", "Gammaglobulina": "1.4",
            "EVA_Global": "25", "Calidad_Vida": "Buena",
            "Tratamiento_Actual": "Pilocarpina 5mg 3 veces al día + Hidroxicloroquina 400mg/día + Rituximab 1g cada 6 meses",
            "Fecha_Inicio_Tratamiento": "01/03/2025",
            "Decision_Terapeutica": "continuar",
            "Cambio_Motivo": "", "Cambio_Efectos_Adversos": "NO",
            "Cambio_Descripcion_Efectos": "", "Cambio_Biologico_Farmaco": "",
            "Fecha_Proxima_Revision": "01/09/2025",
            "Comentarios_Adicionales": "Baja actividad. ESSDAI=4. Mantener Rituximab.",
            "Estado_Prebiologico_Ultimo": "NO_EVALUADO",
            "Fecha_Validacion_Prebiologico_Ultima": "",
        },
    ]

    for i, v in enumerate(visits):
        row_data = {**base, **v}
        write_row(ws, i + 2, cols(headers, **row_data))

    return ws


def build_prebiologico_sheet(wb):
    """Prebiologico sheet — registros de valoración prebiológica."""
    ws = wb.create_sheet("Prebiologico")
    write_header(ws, PREBIOLOGICO_HEADERS)

    records = [
        ["DEMO-AR-001", "APTO", "15/04/2024",
         "Previo a inicio de biológico. Laboratorio OK.", "15/04/2024", "PROF-001"],
        ["DEMO-ESPA-001", "EN_CURSO", "01/05/2024",
         "Pendiente resultados de serologías.", "01/05/2024", "PROF-001"],
        ["DEMO-APS-001", "APTO", "01/06/2024",
         "OK para biológico. Vacunación completa.", "01/06/2024", "PROF-001"],
        ["DEMO-LES-001", "NO_APTO", "01/02/2024",
         "Infección activa en momento de valoración. Reprogramar.", "01/02/2024", "PROF-001"],
        ["DEMO-SJOGREN-001", "NO_EVALUADO", "",
         "Sin evaluación previa registrada.", "10/02/2024", "PROF-001"],
    ]

    for i, record in enumerate(records):
        write_row(ws, i + 2, record)

    return ws


def build_profesionales_sheet(wb):
    """Profesionales sheet."""
    ws = wb.create_sheet("Profesionales")
    write_header(ws, PROFESIONALES_HEADERS)

    records = [
        ["PROF-001", "Dra. Ana Demo Reuma", "Reumatóloga"],
        ["PROF-002", "Dr. Luis Demo Farmacia", "Farmacéutico Hospitalario"],
        ["PROF-003", "Enf. Marta Demo", "Enfermería Reuma"],
    ]

    for i, record in enumerate(records):
        write_row(ws, i + 2, record)

    return ws


def build_farmacos_sheet(wb):
    """Fármacos sheet — formato 3 columnas para compatibilidad con dataManager."""
    ws = wb.create_sheet("Fármacos")
    write_header(ws, FARMACOS_HEADERS)

    # Column format: Sistémicos | FAMEs | Biológicos
    # Loader reads col0→Sistemicos, col1→FAMEs, col2→Biologicos
    records = [
        ["Prednisona", "Metotrexato", "Adalimumab"],
        ["", "Leflunomida", "Secukinumab"],
        ["", "Hidroxicloroquina", "Ixekizumab"],
        ["", "Mofetil micofenolato", "Baricitinib"],
        ["", "", "Belimumab"],
        ["", "", "Rituximab"],
        ["", "", "Pilocarpina"],
    ]

    for i, record in enumerate(records):
        write_row(ws, i + 2, record)

    return ws


# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

def main():
    print(f"Generando base demo: {OUTPUT_FILE}")

    wb = Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    # Build all sheets
    build_profesionales_sheet(wb)
    build_farmacos_sheet(wb)
    build_prebiologico_sheet(wb)
    build_ar_sheet(wb)
    build_espa_sheet(wb)
    build_aps_sheet(wb)
    build_les_sheet(wb)
    build_sjogren_sheet(wb)

    # Reorder sheets: clinical first, then support
    desired_order = ["AR", "ESPA", "APS", "LES", "SJOGREN",
                     "Prebiologico", "Profesionales", "Fármacos"]
    for idx, name in enumerate(desired_order):
        if name in wb.sheetnames:
            wb.move_sheet(name, offset=idx - wb.sheetnames.index(name))

    # Save
    wb.save(OUTPUT_FILE)
    print(f"[OK] Base demo creada: {OUTPUT_FILE}")

    # Summary
    print(f"\n=== RESUMEN ===")
    print(f"Archivo: {os.path.basename(OUTPUT_FILE)}")
    size_kb = os.path.getsize(OUTPUT_FILE) / 1024
    print(f"Tamanio: {size_kb:.1f} KB")
    print(f"Hojas: {', '.join(wb.sheetnames)}")
    for name in wb.sheetnames:
        ws = wb[name]
        nrows = ws.max_row - 1  # exclude header
        ncols = ws.max_column
        print(f"  {name}: {nrows} filas x {ncols} columnas")

    print("\n=== PACIENTES DEMO ===")
    patients = [
        ("DEMO-AR-001", "AR", "Maria Demo AR",
         "4 visitas (15/01/2024 -> 05/12/2024)",
         "Tx->Bio (Adalimumab)->Bio (Baricitinib), efecto adverso, remision DAS28=2.1"),
        ("DEMO-ESPA-001", "EspA", "Carlos Demo EspA",
         "4 visitas (01/02/2024 -> 20/01/2025)",
         "Tx->Bio (Secukinumab), mejoria BASDAI 7.2->1.8, remision"),
        ("DEMO-APS-001", "APs", "Laura Demo APs",
         "4 visitas (01/03/2024 -> 01/02/2025)",
         "FAME combo->Bio (Adalimumab), HAQ 1.8->0.3, remision"),
        ("DEMO-LES-001", "LES", "Ana Demo LES",
         "4 visitas (20/01/2024 -> 15/01/2025)",
         "SLEDAI-2K 16->1, HCQ+Pred->+Micofenolato, remision"),
        ("DEMO-SJOGREN-001", "Sjogren", "Elena Demo Sjogren",
         "4 visitas (10/02/2024 -> 01/03/2025)",
         "ESSDAI 18->4, Pilocarpina->HCQ->Rituximab"),
    ]
    for cip, path, name, visits, events in patients:
        print(f"  {cip} ({path}): {name} -- {visits}")
        print(f"    Eventos: {events}")

    print("\n=== ESTADOS PREBIOLOGICOS ===")
    prebio = [
        ("DEMO-AR-001", "APTO"),
        ("DEMO-ESPA-001", "EN_CURSO"),
        ("DEMO-APS-001", "APTO"),
        ("DEMO-LES-001", "NO_APTO"),
        ("DEMO-SJOGREN-001", "NO_EVALUADO"),
    ]
    for cip, estado in prebio:
        print(f"  {cip}: {estado}")

    print("\n=== COMO EJECUTAR ===")
    print("  python scripts/generate_demo_db.py")


if __name__ == "__main__":
    main()
