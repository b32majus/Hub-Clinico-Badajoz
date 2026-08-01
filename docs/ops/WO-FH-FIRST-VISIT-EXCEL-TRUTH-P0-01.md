# WO-FH-FIRST-VISIT-EXCEL-TRUTH-P0-01

**Prioridad:** P0
**Worktree:** `/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/worktrees/fh-first-visit-excel-truth-p0-01-20260801`
**Rama:** `work/fh-first-visit-excel-truth-p0-01-20260801`
**Base remota:** `origin/recovery/farmacia-pr-replay-20260727`
**Base y HEAD esperados:** `6dcedff4c1b4ac60b79d0e7d3951aaebe9f6ae5e`

## 1. Objetivo y contexto

Corregir la exportación Excel FH de **Primera Visita** para que sus 61 celdas representen exclusivamente el acto visible actual. Hoy el botón puede conservar el paciente del contexto inicial de la URL o caer en el paciente demo; por ello puede mezclar ese contexto obsoleto con lo que la profesional ve y edita en pantalla.

La fuente de verdad queda cerrada: al pulsar el botón, identidad del acto, servicio, patología, fecha, tratamiento, PROMs y notas proceden del estado visible actual. Como única excepción, el paciente del contexto actual puede aportar solo edad y sexo cuando su CIP normalizado coincide con el CIP visible normalizado; un contexto obsoleto o no coincidente y cualquier fallback demo quedan prohibidos.

## 2. Reglas cerradas de fuente de verdad

- Leer del acto visible: CIP, servicio, patología, fecha, tratamiento actual, PROMs actuales y notas actuales.
- Solo `edad` y `sexo` pueden completarse desde un paciente encontrado explícitamente o desde el paciente del contexto actual cuando su CIP normalizado coincide con el CIP visible normalizado, incluido un contexto demo coincidente. La coincidencia no autoriza identidad, servicio, patología, fecha, tratamiento, PROMs ni notas desde el contexto; quedan prohibidos cualquier paciente no coincidente y todo fallback demo.
- Preservar exactamente `0`, `false` y cadenas vacías; no sustituirlos mediante operadores de fallback ni convertirlos en valores procedentes de otra fuente.
- Todo dato ausente queda vacío. No inferir, recomponer ni completar clínicamente.
- Mantener sin cambios el orden, nombres y número de las **61 columnas** del exportador Excel FH.
- Mantener sin cambios las salidas JARA/TXT y CSV, incluidos contenido, formato y acciones.

## 3. Implementación requerida

- Exponer en la API pública `window.FarmaciaPrimeraVisita` la función `buildFirstVisitExcelExport()`.
- La función construirá un resultado verificable a partir del DOM visible y, únicamente para demografía, de un paciente cuyo CIP normalizado coincida con el CIP visible normalizado. El paciente del contexto de query está permitido solo si cumple esa coincidencia y, en ese caso, únicamente puede aportar `edad` y `sexo`; quedan prohibidos el contexto obsoleto o no coincidente y cualquier aporte terapéutico desde `ctx.patient`.
- Resolver explícitamente los selectores `Otro`/`Otra`: usar el texto libre visible de `fhPvServicioOtro` o `fhPvPatologiaOtro` cuando exista; si el complemento está vacío, preservar el valor visible del selector, `Otro` o `Otra`. Nunca inventar especialidad ni patología.
- Construir un paciente de adaptación mínimo con CIP, servicio y patología visibles, más edad/sexo solo si existe paciente del mismo CIP. Llamar primero a `FarmaciaExcelRowExport.buildContextFromPrimeraVisita(patient, opts)` con fecha, tratamiento y PROMs visibles; asignar después las notas visibles a `context.obsSeguimiento`; y llamar entonces a `FarmaciaExcelRowExport.buildExcelRowObject(context)`.
- Tras usar el adaptador y `buildExcelRowObject(context)`, la proyección final explícita obligatoria sobre `rowObject` se limita exactamente a `patient_id`, `cip_demo_o_hash`, `servicio_origen`, `patologia_indicacion`, `fecha_acto`, `dlqi`, `eva_dolor` y `observaciones_seguimiento`. Los campos terapéuticos proceden del tratamiento actual mediante el helper compartido y no se sobreescriben localmente campo a campo. No usar fecha actual como fallback.
- Construir `rowArray` con `buildExcelRowArray(rowObject)` y `sheetName` con `getServiceSheetName(servicioVisible) || 'hoja correspondiente'`.
- `buildFirstVisitExcelExport()` devolverá exactamente el contrato de resultado `{ canCopy, reason, rowObject, rowArray, sheetName }`. Con CIP vacío devolverá `canCopy: false`, un `reason` explícito y no construirá ni copiará una fila.
- El manejador del botón `fhPvExcelExportBtn` será el único consumidor runtime de esa API: si `canCopy` es falso mostrará `alert(reason)` y no copiará; si es verdadero pasará únicamente `rowArray` y `sheetName` a `copyTSVRowToClipboard`.
- No usar un `ctx.patient` obsoleto o con CIP normalizado distinto, el CIP de carga inicial ni `CIP-DEMO-FH-001` como fallback del acto. Un `ctx.patient` con el mismo CIP normalizado solo puede aportar edad y sexo, nunca tratamiento ni otro dato clínico.
- La persistencia del ledger seguirá ejecutándose antes de la salida mediante su listener existente. No cambiar el ledger, el evento persistido ni el orden persistencia → salida.
- No cambiar contratos ni añadir dependencias, persistencia, controles o interfaz nueva.

## 4. Casos de aceptación A–F

| Caso | Escenario sintético | Resultado exigido |
|---|---|---|
| **A** | Tras abrir con contexto demo, se escribe un CIP sintético desconocido arbitrario y se completan identidad visible, servicio, patología, fecha, tratamiento actual y notas. | La exportación contiene exactamente esos valores visibles y no usa ningún fallback del paciente demo. |
| **B** | El CIP visible coincide con un paciente existente. | Ese paciente puede aportar únicamente edad y sexo; identidad, servicio, patología, fecha, tratamiento, PROMs y notas siguen procediendo del acto visible. |
| **C** | PROMs activos con DLQI exacto `0` y EVA exacta `0`. | Ambos ceros se conservan como `0`; no se convierten en vacío ni se sustituyen. |
| **D** | PROMs inactivos. | DLQI y EVA se exportan vacíos, no como cero ni como valores previos. |
| **E** | La fecha visible está vacía. | `fecha_acto` queda vacía; no se inserta la fecha actual. |
| **F** | El CIP visible está vacío y se pulsa Excel. | Se bloquea la copia y se muestra un `alert` con el motivo; no se genera salida. |

## 5. Rutas autorizadas

Son las cinco únicas rutas que una ejecución posterior puede modificar:

1. `docs/ops/WO-FH-FIRST-VISIT-EXCEL-TRUTH-P0-01.md`
2. `scripts/farmacia_primera_visita.js`
3. `tools/farmacia_primera_visita_check.mjs`
4. `tools/farmacia_evaluation_ledger_browser_check.mjs`
5. `tools/farmacia_first_visit_excel_truth_browser_check.mjs`

### Solo lectura

- `farmacia_primera_visita.html`
- `scripts/farmacia_excel_row_export.js`
- `scripts/farmacia_common.js`
- `scripts/farmacia_tratamiento_common.js`
- `scripts/farmacia_pautas_catalog.js`
- `scripts/farmacia_evaluation_ledger.js`
- cualquier otra prueba, documento o artefacto consultado.

### NO TOCA

No modificar las 61 columnas ni el exportador común; JARA/TXT; CSV; Validación; Seguimiento; ledger/workbook; Inicio; CIMA/catálogos; Excel Bridge; contratos de datos; backend; Supabase; SharePoint; autenticación; workflows; `main`; `recovery`; `previews/caceres-fh/`; Pages; `docs/INDEX.md`; `docs/ops/WORK_ORDER_STATUS.md`; ni ninguna ruta no enumerada como autorizada.

Si la corrección requiere tocar una ruta de solo lectura o fuera de las cinco autorizadas, detenerse con `BLOCKED_NEEDS_SCOPE_EXPANSION`.

## 6. Seguridad clínica y datos

- No inferir fármaco, principio activo, presentación, dosis, vía, pauta, inducción, línea, indicación, resultado, PROM ni dato demográfico.
- No mezclar pacientes: toda demografía debe demostrar igualdad normalizada con el CIP visible.
- Lo desconocido o borrado permanece vacío; `0` y `false` son valores válidos.
- Usar exclusivamente CIPs y datos artificiales inequívocamente sintéticos. Nunca abrir, copiar ni registrar datos reales de pacientes.

## 7. Verificación obligatoria

### Checks estructurales y unitarios

`tools/farmacia_primera_visita_check.mjs` debe cubrir estructural y unitariamente la API pública, su contrato de retorno, el consumo exclusivo desde el botón, la proyección explícita, la resolución `Otro`/`Otra` y los casos A–F. Debe comprobar también que la fila válida conserva exactamente las 61 columnas sin modificar el exportador común.

### QA Playwright focal — verdad visible de Primera Visita

`tools/farmacia_first_visit_excel_truth_browser_check.mjs` debe ejecutar exactamente el flujo focal de la sección 11: partir del contexto demo; cambiar mediante el flujo soportado, con diálogo, a un CIP sintético desconocido arbitrario y entrar en modo manual; completar servicio, patología, fecha, tratamiento, dosis, vía, pauta, radios PROM, EVA y notas visibles; capturar la salida en el límite del portapapeles; y comprobar por nombre las columnas esperadas, el total de 61 columnas, la hoja y la ausencia de identidad demo. Debe incluir además un caso real en navegador con DLQI `0` y EVA `0`, y mantener `console` y `pageerror` en 0. Los casos A–F se cubren íntegramente en las pruebas funcionales VM/unitarias y no deben duplicarse todos en navegador.

### QA Playwright de integración — ledger

Actualizar únicamente la expectativa de Primera Visita en `tools/farmacia_evaluation_ledger_browser_check.mjs` para obtener la salida esperada mediante `FarmaciaPrimeraVisita.buildFirstVisitExcelExport()`, en lugar de reconstruir el contexto antiguo desde la query. Debe seguir verificando que el ledger persiste antes de la salida Excel, que el evento y el ledger no cambian, que la fila permanece en 61 columnas y que `console` y `pageerror` quedan en 0. No duplicar en esta prueba focal los casos A–F.

### Suite obligatoria

```text
node --check scripts/farmacia_primera_visita.js
node tools/farmacia_primera_visita_check.mjs
node tools/farmacia_excel_row_export_check.mjs
node tools/farmacia_export_clipboard_check.mjs
node tools/farmacia_evaluation_ledger_check.mjs
node tools/farmacia_smoke_check.mjs
node tools/farmacia_common_check.mjs
node tools/farmacia_tratamiento_common_check.mjs
node tools/farmacia_pautas_catalog_check.mjs
git diff --check
```

Más los dos checks de navegador exactos, con el mismo servidor local:

```text
FH_FIRST_VISIT_EXCEL_BASE_URL=http://127.0.0.1:48796/ npx --yes --package=playwright node tools/farmacia_first_visit_excel_truth_browser_check.mjs
FH_LEDGER_BASE_URL=http://127.0.0.1:48796/ npx --yes --package=playwright node tools/farmacia_evaluation_ledger_browser_check.mjs
```

Documentar cada comando, resultado y código de salida.

## 8. Revisión independiente de solo lectura

Tras checks y QA, una revisión independiente y sin modificaciones debe comprobar: separación de pacientes, precedencia del acto visible, igualdad de CIP para demografía, preservación de cero/vacío, ausencia de inferencia y fallback demo, 61 columnas intactas, JARA/CSV intactos y respeto estricto de rutas. Corregir solo dentro del alcance y repetir las verificaciones afectadas; si no es posible, bloquear.

## 9. Reversión

Si se ordena revertir antes de un commit, la reversión consiste en descartar exclusivamente los cambios no commiteados de las cinco rutas autorizadas y devolverlas al SHA esperado `6dcedff4c1b4ac60b79d0e7d3951aaebe9f6ae5e`. No ejecutar la reversión como parte de esta WO. Quedan prohibidos `git reset --hard`, `git clean`, restauraciones masivas y cualquier acción que afecte otras rutas, datos, ramas, worktrees, pruebas históricas o artefactos compartidos.

## 10. Política Git y publicación

- Durante esta materialización y la ejecución técnica: no hacer `git add`, staging, commit, push, issue, PR, merge, publicación, promoción, cambio de rama/base ni escritura en repositorios de control.
- Commit anticipado, **solo después de aprobación explícita de Cora**: `fix(farmacia): align first visit Excel truth`.
- No publicar ni afirmar que el cambio está mergeado, desplegado o listo para uso clínico.

## 11. Condiciones de parada y estado final

Detenerse ante cambio de base/HEAD, conflicto no trivial, datos reales, ambigüedad clínica, necesidad de inferencia, cambio de las 61 columnas/JARA/CSV, dependencia nueva, ampliación de rutas o dos intentos fallidos de corrección.

El reporte final debe incluir worktree, rama, base/HEAD, archivos modificados, checks con códigos de salida, ambos QA Playwright, revisión independiente, limitaciones, `git status --short` y confirmación de ausencia de staging/commit/push/publicación.

Estados permitidos:

- `READY_FOR_CORA_REVIEW`: A–F, suite, ambos QA y revisión independiente en verde, sin commit ni publicación.
- `BLOCKED_<MOTIVO>`: cualquier condición de parada; usar `BLOCKED_NEEDS_SCOPE_EXPANSION` cuando corresponda.

## 12. Resultado de ejecución y excepción de baseline

- `node tools/farmacia_export_clipboard_check.mjs`: **19 PASS, 5 FAIL**, código de salida **1**.
- Los mismos cinco fallos y el mismo código de salida **1** se reproducen sobre el SHA base publicado `6dcedff4c1b4ac60b79d0e7d3951aaebe9f6ae5e`.
- Los cinco fallos corresponden a expectativas históricas de visibilidad del CSV de Seguimiento, texto del botón Excel de Seguimiento y avisos de exportación en Validación, Primera Visita y Seguimiento.
- Las rutas responsables son de solo lectura y permanecen sin cambios en esta WO; `tools/farmacia_export_clipboard_check.mjs` también permanece sin cambios.
- La comparación entre base y worktree confirma que esta WO no introduce regresión en esos cinco casos.
- Cora adjudica este resultado como una excepción de baseline documentada para esta WO.
- Este test no se considera corregido ni verde; la deuda permanece pendiente y fuera de alcance.
- Todos los demás checks obligatorios y ambos QA Playwright resultan **PASS**.
- La WO permanece apta para revisión final, no para piloto clínico real.
