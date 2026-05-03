# Auditoria de Fuentes de Dato Reuma v2

> Fecha: 2026-05-03. Auditoria documental y tecnica para decidir la estructura del Excel demo v2 sin generar aun ningun workbook ni modificar codigo funcional.

## 1. Objetivo

Esta auditoria cruza las fuentes reales del proyecto para evitar que la futura demo v2 pierda campos clinicos ya implementados o campos v2 ya decididos:

- Excel maestro historico: `Hub_Clinico_Maestro.xlsx`.
- Documentacion v2: `docs/PLAN_IMPLEMENTACION_REUMA_V2.md`, `docs/CONTRATO_DATOS_REUMA_V2.md`, `docs/template_les_excel.md`, `docs/template_sjogren_excel.md`, `docs/template_prebiologico_excel.md`, `docs/template_solicitud_fh.md`.
- Formularios: `primera_visita.html`, `seguimiento.html`.
- Recopilacion JS: `modules/formController.js`.
- Exportacion: `modules/exportManager.js`.
- Lectura/dashboard/FH: `modules/dataManager.js`, `scripts/script_dashboard.js`, `modules/pharmacyRequest.js`, `modules/prebiologicManager.js`.

Regla de lectura:

- `Implementado`: existe en HTML/codigo actual.
- `Documentado v2`: existe en contrato/plan/templates, aunque aun no este implementado.
- `Exportado`: aparece en la fila CSV/TSV generada por `exportManager.js`.
- `Historico`: existe dentro de las 321 columnas canonicas de AR/ESPA/APS.
- `Accion`: conservar, anadir al final, implementar UI/export, mapear alias o descartar como columna.

## 2. Hallazgos ejecutivos

- AR, ESPA y APS tienen 321 columnas historicas identicas en el maestro original.
- `exportManager.js` genera actualmente 399 columnas: 220 base + 179 extra. Las posiciones 221-321 completan el bloque historico; 322-399 son extensiones LES/Sjogren.
- No hay columnas prebiologicas/vacunales detalladas en el maestro historico ni en la exportacion clinica actual.
- Los formularios actuales contienen LES/Sjogren e indices nuevos, pero no contienen el bloque prebiologico/vacunal completo.
- `prebiologicManager.js` persiste estado en `sessionStorage`; no lee aun el estado desde la ultima visita de la hoja clinica.
- `pharmacyRequest.js` genera Solicitud FH como TXT derivado y actualmente toma estado prebiologico desde `HubTools.prebiologic.getStatus(cip)`, con vacunacion como placeholder.
- `Solicitud FH` debe seguir siendo salida derivada: no es columna ni hoja del Excel maestro.

## 3. Matriz por bloque funcional

| Bloque | Fuente v2 documental | Existe en HTML | Se recopila en `formController` | Se exporta en `exportManager` | Existe en maestro historico | Accion necesaria |
|---|---|---|---|---|---|---|
| Identificacion y visita | Si | Si | Si | Si | Si | Conservar 321 historicas; usar `ID_Paciente` como columna historica y `CIP` como alias visible/canonico logico. |
| Diagnostico y patologia | Si | Si | Si | Si | Si | Conservar `Diagnostico_Primario` y `Diagnostico_Secundario`; no introducir nombres alternativos como sustitutos. |
| Datos antropometricos | Si | Si | Si | Si | Si | Conservar `Peso`, `Talla`, `IMC`, `TA`. |
| Comorbilidades | Si | Si | Si | Si | Si | Conservar `Comorbilidad_*` historicas; Solicitud FH debe consumir estos datos fuente. |
| Toxicos | Si | Si | Si | Si | Si | Conservar `Toxico_Tabaco`, `Toxico_Alcohol`, `Toxico_Drogas` y descripciones. |
| Exploracion articular NAD/NAT | Si | Si | Si | Si | Si | Conservar columnas historicas desglosadas y totales. |
| Dactilitis | Si | Si | Si | Si | Si | Conservar columnas historicas desglosadas y total. |
| Entesitis / LEI | Si | Si | Si | Si | Si | Conservar columnas historicas. |
| Psoriasis / PASI / BSA | Si | Si | Si | Si | Si | Conservar columnas historicas. |
| Tratamiento actual | Si | Si | Si | Si | Si | Conservar `Tratamiento_Actual`, `Fecha_Inicio_Tratamiento` y slots estructurados de sistemicos/FAME/biologicos. |
| Tratamientos previos | Si | Si | Si | Si | Si | Conservar `Previo_*`; son fuente para longitudinalidad y Solicitud FH. |
| Decision terapeutica | Si | Si | Si | Si | Si | Conservar `Decision_Terapeutica_PV` y `Decision_Terapeutica_SEG`; no sustituir por una columna unica dentro del bloque historico. |
| Cambio terapeutico | Si | Si | Si | Si | Si | Conservar motivo, efectos adversos, descripcion y farmacos/dosis de cambio. |
| Comentarios | Si | Si | Si | Si | Si | Conservar `Comentarios_Adicionales`. |
| Prebiologico/vacunacion | Si | Parcial/no | Parcial/no | No | No | Anadir bloque v2 transversal al final de cada hoja clinica e implementar UI/export en fase posterior. |
| Solicitud FH | Si | Boton TXT | Si, derivado | TXT, no Excel | No | Descartar como columna/hoja; generar desde datos fuente. |

## 4. Identificacion / visita

| Campo o grupo | Fuente v2 documental | HTML | JS | Export | Maestro | Accion |
|---|---|---:|---:|---:|---:|---|
| `ID_Paciente` / CIP | Si | Si | Si | Si | Si | Mantener `ID_Paciente` en bloque historico; documentar CIP como alias visible. |
| `Nombre_Paciente` | Si | Si | Si | Si | Si | Conservar. |
| `Sexo` | Si | Si | Si | Si | Si | Conservar. |
| `Fecha_Visita` | Si | Si | Si | Si | Si | Campo clave para longitudinalidad. |
| `Tipo_Visita` | Si | Si | Si | Si | Si | Usar primera visita/seguimiento en la misma hoja. |
| `Profesional` | Si | Si | Si | Si | Si | Conservar. |
| `Diagnostico_Primario` | Si | Si | Si | Si | Si | Conservar nombre historico. |
| `Diagnostico_Secundario` | Si | Si | Si | Si | Si | Conservar. |

## 5. Comorbilidades, toxicos y exploracion

| Campo o grupo | Fuente v2 documental | HTML | JS | Export | Maestro | Accion |
|---|---|---:|---:|---:|---:|---|
| `Comorbilidad_HTA`, `DM`, `DLP`, `ECV`, `Gastritis`, `Obesidad`, `Osteoporosis`, `Gota` | Si | Si | Si | Si | Si | Conservar como datos fuente para dashboard y Solicitud FH. |
| `Toxico_Tabaco`, `Toxico_Alcohol`, `Toxico_Drogas` y descripciones | Si | Si | Si | Si | Si | Conservar. |
| NAD/NAT por articulacion y totales | Si | Si | Si | Si | Si | Conservar bloque historico completo. |
| Dactilitis por dedo y total | Si | Si | Si | Si | Si | Conservar bloque historico completo. |
| Entesitis y `Otras_Entesitis` | Si | Si | Si | Si | Si | Conservar. |
| `LEI_*`, `LEI_Score` | Si | Si | Si | Si | Si | Conservar. |

## 6. Scores e indices AR / ESPA / APS

| Campo o grupo | Fuente v2 documental | HTML | JS | Export | Maestro | Accion |
|---|---|---:|---:|---:|---:|---|
| BASDAI preguntas y resultado | Si | Si | Si | Si | Si | Conservar para ESPA/APS; `NA` donde no aplique. |
| ASDAS componentes y resultados | Si | Si | Si | Si | Si | Conservar cabeceras; en AR debe exportarse `NA`. |
| HAQ | Si | Si | Si | Si | Si | Conservar. |
| RAPID3 | Si | Si | Si | Si | Si | Conservar. |
| DAS28 CRP/ESR | Si | Si | Si | Si | Si | Conservar para AR. |
| CDAI / SDAI | Si | Si | Si | Si | Si | Conservar para AR. |
| ACR/EULAR AR | Si | Si | Si | Si | Si | Conservar. |
| PASI / BSA / MDA | Si | Si | Si | Si | Si | Conservar para APS. |
| ASAS / CASPAR | Si | Si | Si | Si | Si | Conservar. |

## 7. LES

### 7.1 Campos LES implementados/exportados

| Campo o grupo | Fuente v2 documental | HTML | JS | Export | Maestro | Accion |
|---|---|---:|---:|---:|---:|---|
| `SLEDAI`, `SLEDAI_2K` / `SLEDAI_2K_Result` | Si | Si | Si | Si | No | Mantener como bloque v2 final; mapear alias entre nombres de formulario y export. |
| `SLICC_SDI` / `SLICC_ACR_SDI` | Si | Si | Si | Si | No | Mantener como bloque v2 final; mapear alias. |
| `Dosis_Prednisona`, `Brote_Actual`, `Tipo_Brote` | Si | Si | Si | Si | No | Mantener. |
| `Actividad_Global_Medico`, `Actividad_Global_Paciente` | Si | Si | Si | Si | No | Mantener. |
| Manifestaciones `LES_*` | Si | Si | Si | Si | No | Mantener. |
| Inmunologia `ANA_LES`, `Anti_DNA`, `Anti_Sm`, `Anti_Ro`, `Anti_La` | Si | Si | Si | Si | No | Mantener; resolver alias frente a template (`AntiDNA`, `AntiSm`, etc.). |
| Complemento/renal/analitica LES | Si | Si | Si | Si | No | Mantener; `Hemograma_Alteraciones_LES` es analitica LES, no prebiologico. |
| PROs LES `EVA_Dolor_LES`, `EVA_Fatiga_LES`, `EVA_Global_LES` | Si | Si | Si | Si | No | Mantener. |

### 7.2 Items de calculadora LES que pueden perder trazabilidad

Los formularios y `scoreCalculators.js` usan 24 items SLEDAI-2K y 12 dominios SLICC/ACR SDI para calcular resultados. `formController.js` actualmente usa esos controles para recalcular, pero la exportacion solo persiste resultados agregados (`SLEDAI`, `SLEDAI_2K`, `SLICC_SDI`), no todos los items/dominios.

| Grupo | Documentado v2 | HTML | JS calculo | Export itemizado | Accion |
|---|---:|---:|---:|---:|---|
| 24 items SLEDAI-2K (`sledaiSeizure` ... `sledaiLeukopenia`) | Si | Si | Si | No | Decidir en estructura final si se anaden como columnas fuente para trazabilidad completa. Recomendado: anadir al final del bloque LES. |
| 12 dominios SLICC (`sliccOcular` ... `sliccMalignancy`) | Si | Si | Si | No | Recomendado: anadir al final del bloque LES para trazabilidad del dano acumulado. |

## 8. Sjogren

### 8.1 Campos Sjogren implementados/exportados

| Campo o grupo | Fuente v2 documental | HTML | JS | Export | Maestro | Accion |
|---|---|---:|---:|---:|---:|---|
| `ESSPRI_Sequedad`, `ESSPRI_Fatiga`, `ESSPRI_Dolor`, `ESSPRI_Result` | Si | Si | Si | Si | No | Mantener. |
| `ESSDAI_Result` | Si | Si | Si | Si | No | Mantener. |
| EVAs sequedad/fatiga/dolor/global | Si | Si | Si | Si | No | Mantener. |
| Manifestaciones `Sjogren_*` | Si | Si | Si | Si | No | Mantener; evitar duplicidad con historicas `Sjogren_Ocular`/`Sjogren_Oral`. |
| Inmunologia y complementos Sjogren | Si | Si | Si | Si | No | Mantener; resolver alias `Complemento_C3` vs `C3_Sjogren`. |
| Pruebas funcionales: biopsia, Schirmer, tincion, flujo salival, ecografia | Si | Si | Si | Si | No | Mantener. |
| Tratamiento sintomatico/inmunomodulador | Si | Si | Si | Si | No | Mantener. |

### 8.2 Dominios ESSDAI que pueden perder trazabilidad

Los formularios y `scoreCalculators.js` usan 12 dominios ESSDAI para calcular `ESSDAI_Result`. La exportacion actual solo persiste el resultado final.

| Grupo | Documentado v2 | HTML | JS calculo | Export itemizado | Accion |
|---|---:|---:|---:|---:|---|
| 12 dominios ESSDAI (`essdaiConstitutional` ... `essdaiBiological`) | Si | Si | Si | No | Recomendado: anadir como columnas fuente si se quiere auditar el calculo. |

## 9. Tratamientos, cambios y efectos adversos

| Campo o grupo | Fuente v2 documental | HTML | JS | Export | Maestro | Accion |
|---|---|---:|---:|---:|---:|---|
| Tratamiento actual | Si | Si | Si | Si | Si | Conservar. |
| Fecha inicio tratamiento | Si | Si | Si | Si | Si | Conservar. |
| Plan sistemico/FAME/biologico slots 1-3 | Si | Si | Si | Si | Si | Conservar. |
| Previos sistemico/FAME/biologico slots 1-3 | Si | Si | Si | Si | Si | Conservar. |
| Decision terapeutica PV/SEG | Si | Si | Si | Si | Si | Conservar nombres historicos. |
| Cambio motivo / efectos adversos / descripcion | Si | Si | Si | Si | Si | Conservar. |
| Cambio sistemico/FAME/biologico slots | Si | Si | Si | Si | Si | Conservar. |

## 10. Prebiologico, vacunacion y medicina preventiva

El bloque prebiologico/vacunal esta decidido en docs v2, pero no esta implementado aun como bloque de formulario ni se exporta dentro de la fila clinica.

| Campo o grupo | Fuente v2 documental | HTML | JS | Export | Maestro | Accion |
|---|---|---:|---:|---:|---:|---|
| `Estado_Prebiologico_Final` | Si | No | Parcial en `sessionStorage` | No | No | Anadir al final de cada hoja clinica e implementar UI/export. |
| `Fecha_Validacion_Prebiologico` | Si | No | Parcial en `sessionStorage` | No | No | Anadir al final de cada hoja clinica e implementar UI/export. |
| `Profesional_Validador` | Si | No | No | No | No | Anadir al final de cada hoja clinica. |
| `Decision_Clinica_Manual` | Si | No | Notas parciales en `sessionStorage` | No | No | Anadir al final de cada hoja clinica. |
| Hemograma solicitado/fechas/recibido/correcto/observaciones | Si | No | No | No | No | Anadir al final de cada hoja clinica. |
| Bioquimica solicitada/fechas/recibida/correcta/observaciones | Si | No | No | No | No | Anadir al final de cada hoja clinica. |
| Serologias solicitadas/fechas/recibidas/correctas/observaciones | Si | No | No | No | No | Anadir al final de cada hoja clinica. |
| IGRA/Quantiferon/Mantoux solicitado/tipo/fechas/resultado/observaciones | Si | No | No | No | No | Anadir al final de cada hoja clinica. |
| Rx torax solicitada/fechas/recibida/correcta/observaciones | Si | No | No | No | No | Anadir al final de cada hoja clinica. |
| Vacunacion revisada/OK | Si | No | No | No | No | Anadir al final de cada hoja clinica. |
| Medicina Preventiva derivacion/fecha | Si | No | No | No | No | Anadir al final de cada hoja clinica. |
| `Vacunas_Pendientes` | Si | No | No | No | No | Anadir al final de cada hoja clinica. |
| `Vacunacion_Observaciones` / `Observaciones_Prebiologico` | Si | No | No | No | No | Anadir al final de cada hoja clinica. |

Notas:

- `Hemograma_Alteraciones_LES` no cubre el hemograma prebiologico; pertenece al bloque analitico LES.
- `Estado_Prebiologico_Ultimo` y `Fecha_Validacion_Prebiologico_Ultima` estaban documentados previamente como columnas transversales, pero la decision actual es deducir el ultimo estado desde la ultima visita clinica, no duplicarlo como columnas iniciales.
- Una hoja `Prebiologico` puede existir en el futuro como auxiliar analitica, pero no debe ser fuente principal ni obligatoria para el flujo diario.

## 11. Solicitud FH

| Elemento | Fuente v2 documental | HTML | JS | Export Excel | Accion |
|---|---|---:|---:|---:|---|
| Boton `Solicitud FH` | Si | Si | Si | No | Mantener como generador TXT derivado. |
| Texto/Informe FH persistido | No para Excel final | No | Generado en memoria/TXT | No | Descartar como columna u hoja. |
| Datos fuente para FH | Si | Si/parcial | Si/parcial | Si/parcial | Asegurar que vengan de ultima visita clinica: tratamientos, comorbilidades, scores, prebiologico/vacunacion. |

Decision: Solicitud FH es una salida derivada, no una columna ni una hoja del Excel maestro.

## 12. Riesgos detectados

- Riesgo de perdida de datos LES/Sjogren: los resultados agregados se exportan, pero no todos los items/dominios que los generan. Mitigacion: incluir items/dominios como columnas fuente si se requiere trazabilidad.
- Riesgo de prebiologico volatil: el estado vive en `sessionStorage`, no en Excel. Mitigacion: mover fuente primaria a la fila clinica exportada.
- Riesgo de doble pegado: una hoja `Prebiologico` obligatoria obligaria a pegar dos veces. Mitigacion: bloque prebiologico embebido en cada hoja de patologia.
- Riesgo de alias divergentes: docs, HTML y export usan nombres distintos en LES/Sjogren. Mitigacion: decidir nombres de cabecera estables y mapear aliases en codigo despues.
- Riesgo de guardar informes en vez de datos fuente: persistir Solicitud FH como texto duplicaria datos y quedaria obsoleto. Mitigacion: no crear columnas ni hojas FH.

## 13. Proximo paso

Crear `docs/DECISION_ESTRUCTURA_EXCEL_DEMO_V2.md` usando esta auditoria como entrada. Ese documento debe fijar la estructura superset final antes de generar cualquier demo.
