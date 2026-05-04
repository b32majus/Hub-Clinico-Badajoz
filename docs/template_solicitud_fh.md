# Template — Solicitud FH (Farmacia Hospitalaria)

> Revisión 2026-05-03.
>
> Nota de vigencia: `Solicitud FH` es una salida derivada de texto y no se persiste como hoja ni como columnas (`Solicitud_FH_Log`, `Solicitud_FH_Texto`, `Informe_FH` están descartadas en contrato vigente).

---

## Descripción

Documento de texto plano generado desde el Hub Clínico para ser copiado y pegado en la orden clínica dirigida a Farmacia Hospitalaria. No es una hoja Excel; es una exportación TXT estructurada.

---

## Secciones obligatorias

### 1. Cabecera de solicitud

```
═══════════════════════════════════════
  SOLICITUD FARMACIA HOSPITALARIA
═══════════════════════════════════════
CIP:                 [CIP]
Nombre:              [Nombre_Paciente]
Fecha solicitud:     [Fecha actual]
Profesional:         [Profesional]
Patología:           [Diagnostico_Primario]
Diagnóstico secundario: [Diagnostico_Secundario]
```

### 2. Datos antropométricos y comorbilidades

```
Peso:     [Peso] kg
IMC:      [IMC]
Comorbilidades: [HTA, DM, DLP, ECV, etc.]
Tabaquismo: [SI/NO]
```

### 3. Tratamiento previo y actual

```
Tratamiento actual:       [Tratamiento_Actual]
Fecha inicio:             [Fecha_Inicio_Tratamiento]
Tratamientos previos:     [lista]
Motivo de cambio:         [Cambio_Motivo]
Efectos adversos:         [SI/NO — descripción]
```

### 4. Datos prebiológicos (si aplica)

```
Estado prebiológico:              [Estado_Prebiologico_Ultimo]
Fecha validación prebiológica:    [Fecha_Validacion_Prebiologico_Ultima]
Hemograma:                        [Solicitado/Recibido/Correcto]
Bioquímica:                       [Solicitada/Recibida/Correcta]
Serologías:                       [Solicitadas/Recibidas/Correctas]
IGRA/Mantoux:                     [Tipo/Resultado]
Rx tórax:                         [Solicitada/Recibida/Correcta]
Vacunación revisada:              [SI/NO]
Vacunas pendientes:               [lista]
Observaciones prebiológicas:      [texto]
```

### 5. Bloque específico por patología

#### AR

```
DAS28-CRP:        [DAS28_CRP_Result]
DAS28-ESR:        [DAS28_ESR_Result]
CDAI:             [CDAI_Result]
SDAI:             [SDAI_Result]
RAPID3:           [RAPID3_Total] — [RAPID3_Categoria]
HAQ/MDHAQ:        [HAQ_Total]
PCR (mg/L):       [PCR]
VSG:              [VSG]
FR:               [FR]
Anti-CCP:         [aPCC]
ANA:              [ANA]
Erosiones:        [SI/NO — descripción]
Extraarticulares: [lista]
```

#### ESPA

```
BASDAI:     [BASDAI_Result]
ASDAS-CRP:  [ASDAS_CRP_Result]
ASDAS-ESR:  [ASDAS_ESR_Result]
PCR (mg/L): [PCR]
VSG:        [VSG]
HLA-B27:    [HLA-B27]
```

#### APS

```
BASDAI:     [BASDAI_Result]
ASDAS-CRP:  [ASDAS_CRP_Result]
ASDAS-ESR:  [ASDAS_ESR_Result]
HAQ:        [HAQ_Total]
LEI:        [LEI_Score]
MDA:        [MDA_Resultado]
PASI:       [PASI_Score]
BSA:        [BSA_Percentage]
PCR (mg/L): [PCR]
VSG:        [VSG]
HLA-B27:    [HLA-B27]
FR:         [FR]
Anti-CCP:   [aPCC]
```

#### LES

```
SLEDAI-2K (calculado):    [SLEDAI_2K_Result]
SLICC/ACR SDI (daño):     [SLICC_ACR_SDI]
Prednisona:                [Dosis_Prednisona_Mg_Dia] mg/día
Brote actual:              [SI/NO — Tipo_Brote]
ANA:                       [ANA]
Anti-dsDNA:                [AntiDNA]
Anti-Sm:                   [AntiSm]
Anti-Ro:                   [AntiRo]
Anti-La:                   [AntiLa]
C3:                        [Complemento_C3]
C4:                        [Complemento_C4]
Proteinuria:               [Proteinuria]
Creatinina:                [Creatinina]
PCR (mg/L):                [PCR]
VSG:                       [VSG]
Manifestaciones:           [lista de órganos afectados]

── Ítems SLEDAI-2K activos: ──
[lista de ítems marcados como SI]
```

#### Sjögren

```
ESSPRI:                [ESSPRI_Result]
  ─ Sequedad (0-10):   [ESSPRI_Sequedad]
  ─ Dolor (0-10):      [ESSPRI_Dolor]
  ─ Fatiga (0-10):     [ESSPRI_Fatiga]
ESSDAI:                [ESSDAI_Result]
EVA sequedad oral:     [EVA_Sequedad_Oral]
EVA sequedad ocular:   [EVA_Sequedad_Ocular]
EVA fatiga:            [EVA_Fatiga]
EVA dolor:             [EVA_Dolor]
ANA:                   [ANA]
Anti-Ro:               [AntiRo]
Anti-La:               [AntiLa]
C3:                    [Complemento_C3]
C4:                    [Complemento_C4]
Crioglobulinas:        [Crioglobulinas]
Schirmer:              [Test_Schirmer]
Biopsia salival:       [Biopsia_Glandula_Salival]
PCR (mg/L):            [PCR]
VSG:                   [VSG]
```

### 6. Tratamiento solicitado

```
Fármaco solicitado:   [nombre]
Dosis / pauta:        [dosis]
Inducción:            [Sí / No]
Justificación clínica:
[texto libre con justificación según guía y situación del paciente]

Comentarios adicionales:
[texto libre]
```

---

## Implementación

- Archivo de generación: `modules/pharmacyRequestManager.js`
- Namespace: `HubTools.pharmacy`
- Función principal: `generarSolicitudFH(datos, opciones)`
- Retorna: string de texto plano listo para copiar/pegar.
- Botones de acceso: `dashboard_paciente.html`, `seguimiento.html`.

---

## Notas

- El bloque prebiológico solo se incluye si `Estado_Prebiologico_Ultimo` existe y no es `NO_EVALUADO`.
- El bloque específico por patología se selecciona automáticamente según `Diagnostico_Primario`.
- Si algún dato no está disponible, la línea correspondiente se omite (no se muestra vacía).
