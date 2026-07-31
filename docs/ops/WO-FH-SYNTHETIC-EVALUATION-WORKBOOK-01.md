# WO-FH-SYNTHETIC-EVALUATION-WORKBOOK-01

**Título:** Libro Excel acumulado para evaluación ficticia
**Fecha:** 2026-08-01
**Riesgo:** 🟡 Amarillo
**Base funcional:** `work/fh-synthetic-evaluation-ledger-01-20260801`
**HEAD esperado:** `ebd54557299ca434e296b84b073881e29bc8d3c1`
**Rama:** `work/fh-synthetic-evaluation-workbook-01-20260801`

## Objetivo y contexto

Permitir que Farmacia descargue desde Inicio un único libro Excel acumulado con todos los actos ficticios guardados en el registro local: Validación, Primera Visita y Seguimiento. El libro debe conservar el contenido completo del formulario y las estructuras disponibles de líneas y efectos adversos, sin utilizar las 61 columnas legacy como modelo de verdad.

## Preflight

- Verificar rama y HEAD exactos del ledger.
- Trabajar en worktree aislado y limpio.
- Verificar que la rama del ledger está publicada y que el HEAD remoto coincide.
- Leer `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, el plan vivo y la arquitectura V4.
- No tocar el repositorio principal ni `main`.

## Reversión

Revertir exclusivamente el commit de esta WO. El libro se genera bajo demanda y no modifica los actos guardados. La reversión no borra el ledger local.

## Alcance

- generador versionado `FarmaciaEvaluationWorkbook` basado únicamente en `FarmaciaEvaluationLedger`;
- descarga `.xlsx` desde la cohorte ficticia local;
- hojas `METADATOS`, `PACIENTES`, `EVENTOS`, `VALIDACION`, `PRIMERA_VISITA`, `SEGUIMIENTO`, `CAMPOS_FORMULARIO`, `DICCIONARIO_CAMPOS`, `LINEAS_TRATAMIENTO`, `EFECTOS_ADVERSOS` y `PAYLOAD_JSON`;
- filas anchas por tipo de acto y tabla larga de todos los controles capturados;
- payload JSON completo como respaldo sin pérdida;
- etiquetas visibles de los controles incorporadas al snapshot del formulario;
- protección básica frente a fórmulas al abrir el libro;
- nombres y metadatos explícitos de evaluación ficticia;
- tests unitarios y QA en navegador de construcción y descarga.

## NO TOCA

- las 61 columnas legacy ni su exportador actual;
- TXT JARA o CSV;
- interfaz de Validación, Primera Visita o Seguimiento salvo la captura de etiqueta ya almacenada por el ledger;
- servidor, Supabase, SharePoint, Office Script o roundtrip;
- CIMA, Presalud, parser de Dermatología o Digestivo;
- `previews/caceres-fh/` y promoción Cáceres;
- documentación viva general;
- datos reales;
- `main`.

## Rutas permitidas

- `docs/ops/WO-FH-SYNTHETIC-EVALUATION-WORKBOOK-01.md`
- `farmacia_index.html`
- `scripts/farmacia_evaluation_ledger.js`
- `scripts/farmacia_evaluation_workbook.js`
- `tools/farmacia_evaluation_workbook_check.mjs`
- `tools/farmacia_evaluation_workbook_browser_check.mjs`

## Criterios de aceptación

- [ ] El botón de descarga solo está disponible si hay actos ficticios.
- [ ] Un mismo libro contiene los tres tipos de acto.
- [ ] `PACIENTES` agrupa por `patient_id` y CIP ficticio.
- [ ] `EVENTOS` conserva IDs, fechas, servicio, patología y estado.
- [ ] Las hojas de acto incluyen todos los controles capturados como columnas dinámicas.
- [ ] `CAMPOS_FORMULARIO` conserva valor, checked, tipo, visibilidad, disabled y etiqueta.
- [ ] `LINEAS_TRATAMIENTO` conserva las líneas disponibles y su rol de origen.
- [ ] `EFECTOS_ADVERSOS` conserva el objeto completo por acto.
- [ ] `PAYLOAD_JSON` conserva el evento completo sin pérdida.
- [ ] La descarga produce un `.xlsx` con nombre fechado.
- [ ] Celdas que podrían ejecutarse como fórmulas quedan neutralizadas.
- [ ] El libro no modifica ni elimina actos del ledger.
- [ ] Consola y `pageerror` permanecen sin errores.

## Tests y QA

- `node --check` de módulos afectados.
- check unitario del modelo del libro.
- checks del ledger, smoke, storage policy y exportaciones legacy.
- Playwright: crear tres actos, construir libro, comprobar hojas/contenido y descargar `.xlsx`.
- `git diff --check`.

## Política de commit, push, PR y merge

- Commit local solo con todos los tests verdes.
- Mensaje: `feat(farmacia): add synthetic evaluation workbook`.
- Esta WO depende del ledger. Push, issue, PR y merge se realizarán dentro de la autorización de cierre y continuación, respetando la secuencia de dependencias y CI verde.
- No se borran ramas ni se toca `main`.

## Reporte final

- base y dependencia;
- rutas modificadas;
- hojas y semántica del libro;
- tests y QA;
- limitaciones;
- commit, publicación y estado GitHub.
