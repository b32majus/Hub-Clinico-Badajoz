# Decision de Estructura Excel Demo v2

> Fecha: 2026-05-03. Decision contractual para reconstruir la demo v2 sin romper el Excel maestro historico ni el flujo clinico real.

## 1. Decision final

El Excel demo v2 debe representar el flujo real de trabajo:

1. El clinico rellena el formulario del Hub.
2. Exporta una fila clinica.
3. Pega una sola vez en la hoja de la patologia correspondiente.
4. Si necesita Farmacia Hospitalaria, pulsa `Solicitud FH`.
5. El Hub genera un TXT derivado desde los datos ya recogidos.

Por tanto:

- Una hoja = una patologia.
- Una fila = una visita.
- Cada hoja contiene primera visita y seguimientos.
- La evolucion se reconstruye por `ID_Paciente`/CIP, `Fecha_Visita` y `Tipo_Visita`.
- El bloque prebiologico/vacunal debe estar embebido al final de cada hoja de patologia.
- La hoja `Prebiologico` no sera fuente principal ni obligatoria para el flujo diario.
- Solicitud FH es una salida derivada, no una columna ni una hoja del Excel maestro.

Principio rector: guardar datos fuente estructurados, no informes generados.

## 2. Fuentes de verdad

Orden de autoridad para construir la demo:

1. Excel maestro original: fuente canonica para las 321 columnas historicas de AR/ESPA/APS.
2. `docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md`: contrato de orden exacto para las columnas finales v2.
3. `docs/AUDITORIA_FUENTES_DATO_REUMA_V2.md`: matriz de campos implementados, documentados y pendientes.
4. `modules/exportManager.js`: verificacion secundaria de lo que hoy se puede pegar desde el Hub.
5. Contrato y templates v2: intencion funcional para campos aun no implementados.

No se deben inventar cabeceras fuera de estas fuentes. Si aparece un campo nuevo necesario, debe documentarse antes de incorporarse.

## 3. Estructura final por hoja

Hojas clinicas:

- `AR`
- `ESPA`
- `APS`
- `LES`
- `SJOGREN`

Hojas auxiliares permitidas:

- `Profesionales`
- `Fármacos`

Hoja auxiliar futura opcional:

- `Prebiologico`, solo para analisis transversal o importaciones futuras, nunca como fuente obligatoria del flujo diario.

Elementos descartados como estructura Excel:

- `Solicitud_FH_Log`: descartado en esta fase.
- `Solicitud_FH_Texto`: descartado como columna.
- `Informe_FH`: descartado como columna.
- `Resumen_FH`: descartado como columna.
- `Resumen_Farmacia`: descartado como columna.
- `Bloque_Farmacia`: descartado como columna.
- `Texto_Farmacia`: descartado como columna.

## 4. Modelo superset comun

La demo corregida debe usar un modelo superset comun para todas las hojas clinicas.

### 4.1 AR / ESPA / APS

- Mantener intactas las 321 columnas historicas del maestro original.
- No renombrar columnas historicas.
- No reordenar columnas historicas.
- No eliminar columnas historicas.
- No insertar columnas nuevas dentro de las primeras 321 posiciones.
- Anadir bloques v2 solo al final.
- Usar `NA` en campos que no apliquen por patologia.

### 4.2 LES / SJOGREN

LES y SJOGREN deben ser hojas nuevas compatibles con el mismo modelo superset:

- Deben incluir identificacion, visita, diagnostico, comorbilidades, tratamientos, decision terapeutica, efectos adversos y comentarios.
- Deben incluir el bloque prebiologico/vacunal embebido.
- Deben incluir sus bloques especificos de patologia.
- Deben poder aceptar primera visita y seguimientos en la misma hoja.
- Deben evitar una estructura corta propia que obligue al loader, dashboard o exportacion a depender de aliases fragiles.

Decision: LES/SJOGREN usaran estructura compatible con el superset comun, no una estructura reducida independiente.

## 5. Bloque historico

Las 321 columnas historicas de AR/ESPA/APS son el prefijo contractual inmutable.

Reglas:

- `ID_Paciente` se mantiene como cabecera historica.
- CIP es el identificador visible/canonico logico, leido como alias de `ID_Paciente`, `NHC` o `NHS` cuando proceda.
- `Decision_Terapeutica_PV` y `Decision_Terapeutica_SEG` se conservan; no se sustituyen por `Decision_Terapeutica` dentro del bloque historico.
- Las columnas `ASDAS_*` se conservan; en AR se rellenan como `NA`.
- `Fármacos` puede conservar tilde en la hoja; el loader ya normaliza internamente a `Frmacos`.

## 6. Bloque v2 transversal prebiologico/vacunal

Este bloque debe anadirse al final de cada hoja clinica, despues del bloque historico y antes de los bloques especificos LES/SJOGREN.

Orden cerrado:

- Columna `322`: `Fecha_Diagnostico`.
- Columnas `323-365`: bloque prebiologico/vacunal transversal.
- Columnas `366-438`: bloque especifico LES.
- Columnas `439-491`: bloque especifico SJOGREN.

La referencia exacta de posiciones esta fijada en `docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md`. La condicion obligatoria es no insertar nada dentro de las primeras 321 columnas.

Columnas minimas:

```text
Estado_Prebiologico_Final
Fecha_Validacion_Prebiologico
Profesional_Validador
Decision_Clinica_Manual
Hemograma_Solicitado
Hemograma_Fecha_Solicitud
Hemograma_Recibido
Hemograma_Fecha_Recepcion
Hemograma_Correcto
Hemograma_Observaciones
Bioquimica_Solicitada
Bioquimica_Fecha_Solicitud
Bioquimica_Recibida
Bioquimica_Fecha_Recepcion
Bioquimica_Correcta
Bioquimica_Observaciones
Serologias_Solicitadas
Serologias_Fecha_Solicitud
Serologias_Recibidas
Serologias_Fecha_Recepcion
Serologias_Correctas
Serologias_Observaciones
IGRA_Mantoux_Solicitado
IGRA_Mantoux_Tipo
IGRA_Mantoux_Fecha_Solicitud
IGRA_Mantoux_Recibido
IGRA_Mantoux_Fecha_Recepcion
IGRA_Mantoux_Resultado
IGRA_Mantoux_Observaciones
Rx_Torax_Solicitada
Rx_Torax_Fecha_Solicitud
Rx_Torax_Recibida
Rx_Torax_Fecha_Recepcion
Rx_Torax_Correcta
Rx_Torax_Observaciones
Vacunacion_Revisada
Vacunacion_OK
Medicina_Preventiva_Requiere_Derivacion
Medicina_Preventiva_Derivada
Medicina_Preventiva_Fecha_Derivacion
Vacunas_Pendientes
Vacunacion_Observaciones
Observaciones_Prebiologico
```

Reglas:

- `Estado_Prebiologico_Final` es decision manual del clinico.
- `Fecha_Validacion_Prebiologico` es la fecha de validacion manual.
- `IGRA_Mantoux_Tipo` admite `IGRA`, `Quantiferon` o `Mantoux`.
- Booleanos y estados de prueba usan `SI`, `NO`, `ND` o `NA` segun corresponda.
- `Observaciones_Prebiologico` recoge observaciones globales del bloque.

Columnas no incluidas inicialmente:

- `Estado_Prebiologico_Ultimo`
- `Fecha_Validacion_Prebiologico_Ultima`

Motivo: el ultimo estado se deduce desde la ultima visita clinica del paciente ordenada por `Fecha_Visita`. Duplicarlo en cada fila introduce riesgo de desincronizacion.

## 7. Bloques especificos por patologia

### 7.1 AR

AR conserva las columnas historicas existentes para:

- DAS28 CRP/ESR.
- CDAI/SDAI.
- RAPID3/MDHAQ/HAQ.
- ACR/EULAR.
- Manifestaciones extraarticulares.
- Tratamientos, cambios y efectos adversos.

ASDAS se conserva como cabecera historica pero se rellena como `NA`.

### 7.2 ESPA

ESPA conserva las columnas historicas para:

- BASDAI.
- ASDAS CRP/ESR.
- Metrologia.
- Manifestaciones extraarticulares.
- Tratamientos, cambios y efectos adversos.

### 7.3 APS

APS conserva las columnas historicas para:

- BASDAI/ASDAS cuando proceda.
- HAQ.
- PASI/BSA.
- LEI.
- MDA.
- CASPAR.
- Tratamientos, cambios y efectos adversos.

### 7.4 LES

LES debe incluir columnas especificas v2 para:

- `SLEDAI`, `SLEDAI_2K` o nombre final equivalente documentado.
- `SLICC_SDI` o nombre final equivalente documentado.
- `Dosis_Prednisona`.
- `Brote_Actual`, `Tipo_Brote`.
- Actividad global medico/paciente.
- Manifestaciones `LES_*`.
- Inmunologia y analitica LES.
- PROs LES.

Decision de trazabilidad:

- Los 24 items SLEDAI-2K y los 12 dominios SLICC/ACR SDI deben considerarse datos fuente estructurados.
- Si se busca demo clinicamente auditable, deben anadirse como columnas finales especificas LES, no quedarse solo en resultados agregados.

### 7.5 SJOGREN

SJOGREN debe incluir columnas especificas v2 para:

- `ESSPRI_Sequedad`, `ESSPRI_Fatiga`, `ESSPRI_Dolor`, `ESSPRI_Result`.
- `ESSDAI_Result`.
- EVAs de sequedad oral, sequedad ocular, fatiga, dolor y global.
- Manifestaciones `Sjogren_*`.
- Inmunologia y complementos.
- Crioglobulinas, proteinograma.
- Biopsia glandula salival, Schirmer, tincion ocular, flujo salival, ecografia glandular.
- Tratamiento sintomatico e inmunomodulador.

Decision de trazabilidad:

- Los 12 dominios ESSDAI deben considerarse datos fuente estructurados.
- Si se busca demo clinicamente auditable, deben anadirse como columnas finales especificas SJOGREN.

## 8. Impacto en `exportManager.js`

Estado actual:

- Exporta 399 columnas.
- El objetivo v2 cerrado es exportar 491 columnas por hoja clinica siguiendo `docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md`.
- No exporta el bloque prebiologico/vacunal detallado.
- Exporta resultados LES/Sjogren, pero no todos los items/dominios de calculadoras.

Cambios funcionales necesarios en fase posterior:

- Ampliar cabeceras exportadas con el bloque prebiologico/vacunal y los campos de trazabilidad LES/SJOGREN hasta 491 columnas.
- Recopilar esos campos desde formulario cuando existan.
- Exportar `NA` para campos no aplicables por patologia.
- Resolver aliases LES/Sjogren entre templates, HTML y exportacion.
- Mantener las 321 historicas intactas.

No hacer en esta fase:

- No modificar `modules/exportManager.js`.
- No generar demo.

## 9. Impacto en `dataManager.js`, dashboard y Solicitud FH

Estado actual:

- `dataManager.js` carga hojas clinicas, pero no usa una hoja `Prebiologico` como fuente persistente.
- `scripts/script_dashboard.js` renderiza badge prebiologico desde `HubTools.prebiologic.getBadgeHTML(cip)`.
- `modules/prebiologicManager.js` guarda/lee estado desde `sessionStorage`.
- `modules/pharmacyRequest.js` toma estado desde `HubTools.prebiologic.getStatus(cip)` y muestra vacunacion como placeholder.

Fix necesario en fase posterior:

- La fuente primaria del estado prebiologico debe ser `latestVisit` de la hoja clinica.
- `sessionStorage` puede quedar solo como fallback temporal o cache.
- Dashboard debe derivar el badge desde la ultima visita del paciente.
- Solicitud FH debe extraer prebiologico/vacunacion desde la ultima visita clinica.
- Eventos terapeuticos deben recibir estado prebiologico derivado de datos clinicos persistidos.

## 10. Solicitud FH

Solicitud FH es una salida derivada, no una columna ni una hoja del Excel maestro.

Debe generarse desde:

- Ultima visita clinica.
- Tratamiento actual.
- Tratamientos previos.
- Motivo de cambio.
- Efectos adversos.
- Comorbilidades activas.
- Scores relevantes.
- Datos especificos de patologia.
- Bloque prebiologico/vacunal embebido en la hoja clinica.

No se debe persistir como:

- Columna de texto.
- Resumen.
- Log de solicitud.
- Hoja propia.

## 11. Reglas para construir la demo corregida

- Leer las 321 cabeceras historicas desde `Hub_Clinico_Maestro.xlsx`.
- Usar esas cabeceras como prefijo de todas las hojas clinicas.
- Anadir bloques v2 al final con el orden exacto documentado en `docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md`.
- Generar 491 columnas por hoja clinica.
- Crear pacientes ficticios con varias visitas por patologia.
- Poblar campos minimos necesarios para dashboard, longitudinalidad, tratamientos, eventos, prebiologico y Solicitud FH.
- Usar `NA` para no aplica, `ND` para no determinado y vacio para texto libre no informado.
- Verificar que las primeras 321 columnas de AR/ESPA/APS coinciden exactamente con el maestro.
- No generar la demo hasta aprobar este contrato.

## 12. Riesgos y mitigacion

| Riesgo | Impacto | Mitigacion |
|---|---|---|
| Demo reducida rompe exportacion/dashboard | Alto | Mantener prefijo historico de 321 columnas. |
| Doble pegado por hoja `Prebiologico` obligatoria | Alto | Embebido prebiologico en cada hoja clinica. |
| Duplicar estado ultimo | Medio | Derivar desde ultima visita; no crear columnas `_Ultimo` iniciales. |
| Perder items de calculadoras LES/Sjogren | Medio | Documentarlos como datos fuente y anadirlos si se requiere trazabilidad. |
| Guardar informes FH en Excel | Alto | Solicitud FH solo como TXT derivado. |
| Nombres divergentes entre docs/codigo | Medio | Elegir cabeceras estables y mapear aliases en fase funcional posterior. |

## 13. Proximo paso

Antes de generar la demo:

1. Aprobar esta decision de estructura.
2. Implementar formulario/exportacion siguiendo `docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md`.
3. Ajustar dashboard/Solicitud FH para leer prebiologico desde la ultima visita.
4. Generar demo reproducible y validarla contra el maestro.
