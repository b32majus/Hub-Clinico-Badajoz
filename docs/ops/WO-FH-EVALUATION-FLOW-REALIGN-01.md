# WO-FH-EVALUATION-FLOW-REALIGN-01

**Título:** Realinear la persistencia local con el flujo habitual paciente/acto y retirar la cohorte ficticia del runtime asistencial.

## 1. Objetivo y contexto

Preservar las capacidades técnicas válidas procedentes de las PR #199 y #201:

- persistencia local versionada;
- actualizaciones idempotentes;
- reapertura y restauración;
- estado dinámico completo de Seguimiento;
- líneas de tratamiento y dispensadas;
- tratamientos relacionados;
- acontecimientos adversos, sospechosos y causalidad;
- radios dinámicos exactos, como DLQI;
- evento estructurado completo;
- workbook técnico de 11 hojas.

Al mismo tiempo, retirar el flujo paralelo visible incorrecto: **Cohorte ficticia local**, sus contadores y tarjetas, las acciones de limpiar o descargar cohorte, el consentimiento sintético específico, **Guardar acto ficticio** y la navegación de cohorte.

El flujo correcto es:

> Paciente → Validación / Primera visita / Seguimiento → completar acto → copiar TXT JARA o generar la fila correspondiente → finalizar.

La persistencia queda subordinada al acto actual. No se creará una segunda bandeja, lista o circuito.

## 2. Decisión cerrada

No se añadirá un nuevo botón principal de guardado.

La persistencia se ejecutará de forma discreta al utilizar una salida ya soportada:

- **Validación:** TXT JARA y fila Excel; CSV solo si está visible y soportado.
- **Primera visita:** TXT y Excel; CSV solo si está soportado.
- **Seguimiento:** TXT, fila o exportación Excel; CSV solo si está soportado.

Se podrán conectar los botones existentes, pero nunca se alterará el contenido TXT, CSV o Excel.

## 3. Comportamiento esperado

### 3.1. Inicio

- Retirar toda la interfaz de cohorte, incluidos contadores, tarjetas, acciones de limpiar o descargar, mensajes y lista paralela de pacientes.
- Mantener la búsqueda, las bandejas y los accesos rápidos.
- El índice no cargará el ledger ni el workbook.
- `farmacia_index.html` mantendrá cargado `vendor/sheetjs/xlsx.full.min.js`, porque da soporte a las importaciones Excel normales, CIMA/catálogo local y lectura Excel de Enfermería/Farmacia.

### 3.2. Páginas clínicas

- Las páginas clínicas seguirán cargando el ledger.
- No mostrarán el checkbox sintético, el botón de guardado ficticio, enlaces, paneles o mensajes de cohorte ni navegación paralela.
- Se mantendrá el aviso general de demo/datos sintéticos.

### 3.3. Persistencia al usar una salida normal

Al activar una salida normal:

1. construir el evento completo;
2. persistirlo localmente;
3. ejecutar la exportación normal;
4. no alterar la salida ni inyectar campos.

Un fallo de almacenamiento no podrá bloquear la salida. El fallo mostrará un aviso secundario y no bloqueante, no afirmará que el acto se ha conservado y no mutará datos clínicos.

### 3.4. Recarga del mismo acto

- Preservar `event_id` y `source_event_id`.
- Añadir `ledger_event_id` a la URL de forma no disruptiva mediante `history.replaceState`.
- Al recargar, restaurar el acto exacto sin exportarlo.
- Se permite el mensaje compacto: **“Acto local restaurado. Revise los datos antes de volver a exportar.”**
- No añadir una tarjeta o módulo grande.

### 3.5. Reapertura normal por CIP sin `ledger_event_id`

- Buscar el mismo CIP/`patient_id` y el mismo `event_type`.
- Nunca restaurar automáticamente.
- Mostrar el aviso compacto: **“Existe un acto local anterior de este tipo para este paciente.”**
- Ofrecer las acciones secundarias **Recuperar último acto** y **Continuar con un acto nuevo**.
- **Recuperar último acto** restaura el acto más reciente del mismo tipo y paciente.
- **Continuar con un acto nuevo** conserva el formulario actual.
- Un acto nuevo nunca elimina ni sobrescribe uno anterior.
- Solo una reapertura explícita actualiza el mismo `source_event_id`.
- No crear un historial completo, una página nueva o una lista paralela.

Si este comportamiento exige modificar los scripts clínicos principales, detener la ejecución con estado `BLOCKED_NEEDS_SCOPE_EXPANSION`. No ampliar el alcance unilateralmente.

## 4. Estado de formulario que debe preservarse exactamente

La restauración preservará exactamente:

- valores vacíos;
- `0`;
- `false`;
- checkbox, radio y multiselect;
- controles dinámicos;
- `name_index`;
- DLQI exacto.

En Seguimiento se preservará todo el estado especificado:

- `current_visit`;
- `visit_id`;
- líneas terapéuticas, seleccionadas, en edición y dispensadas;
- estado por línea;
- tratamientos relacionados;
- gravedad, resolución, corrección y notas del acontecimiento adverso;
- sospechosos;
- causalidad por sospechoso;
- Naranjo;
- Karch;
- evaluación final;
- `linea_id` correcto.

Se mantendrá `window.FarmaciaSeguimiento.restoreEvaluationState()` y no se realizará sustitución artificial del DOM.

## 5. Evento estructurado que debe preservarse

El evento conservará los campos:

- `schema_version`;
- `event_id`;
- `source_event_id`;
- `event_type`;
- `patient_id`;
- `synthetic_cip` / CIP actual;
- `occurred_on`;
- `recorded_at`;
- `created_at`;
- códigos y etiquetas de servicio y patología;
- `visit_id`;
- `line_ids`;
- `source_page`;
- `record_status`;
- `payload.form_state` / `payload.domain`;
- `provenance`;
- `quality_flags`.

Esta WO no formaliza el contrato canónico ni el Export Manager.

## 6. Workbook técnico

Se conservarán:

- `scripts/farmacia_evaluation_workbook.js`;
- `tools/farmacia_evaluation_workbook_check.mjs`;
- las 11 hojas;
- el payload JSON;
- las líneas;
- los acontecimientos adversos;
- la protección frente a fórmulas.

Solo `scripts/farmacia_evaluation_workbook.js` quedará desacoplado del runtime normal de Inicio Farmacia y no tendrá un botón visible. Seguirá siendo un artefacto de cobertura técnica y una base analítica futura, no el Excel operativo ni el Export Manager definitivo.

Se adaptará `tools/farmacia_evaluation_workbook_browser_check.mjs` para comprobar que no existe en la interfaz normal, cargar explícitamente el módulo y generar un XLSX real de 11 hojas.

## 7. Rutas autorizadas

Únicamente están autorizadas estas rutas:

- `docs/ops/WO-FH-EVALUATION-FLOW-REALIGN-01.md`
- `farmacia_index.html`
- `farmacia_validacion.html`
- `farmacia_primera_visita.html`
- `farmacia_seguimiento.html`
- `farmacia_style.css`
- `scripts/farmacia_evaluation_ledger.js`
- `tools/farmacia_evaluation_ledger_check.mjs`
- `tools/farmacia_evaluation_ledger_browser_check.mjs`
- `tools/farmacia_evaluation_workbook_check.mjs`
- `tools/farmacia_evaluation_workbook_browser_check.mjs`

## 8. Rutas de solo lectura

Estas rutas son de solo lectura:

- `scripts/farmacia_evaluation_workbook.js`
- `scripts/farmacia_validacion.js`
- `scripts/farmacia_primera_visita.js`
- `scripts/farmacia_seguimiento.js`
- `scripts/farmacia_excel_row_export.js`
- `scripts/farmacia_validacion_model.js`
- `scripts/farmacia_common.js`
- `scripts/farmacia_index.js`

Si fuera necesario modificar cualquiera de ellas, detener la ejecución con estado `BLOCKED_NEEDS_SCOPE_EXPANSION`.

## 9. CSS

- Retirar únicamente estilos exclusivos de cohorte.
- Añadir estilos para avisos compactos de restauración y acto previo.
- Garantizar comportamiento responsive a 1024 px.
- No rediseñar la interfaz.

## 10. NO TOCA

Queda fuera de alcance:

- `main`;
- `recovery`;
- `previews/caceres-fh`;
- CÁCERES-REVIEW-0.3;
- GitHub Pages;
- workflows;
- JARA;
- contenido actual TXT, CSV o Excel de 61 columnas;
- Export Manager definitivo;
- contrato canónico de evento;
- diccionario;
- Excel Bridge;
- CIMA/catálogo;
- dashboard de paciente;
- Estadísticas;
- actividad de servicio;
- Enfermería;
- Digestivo;
- Reumatología;
- Supabase;
- SharePoint;
- backend;
- autenticación/permisos;
- V5;
- `docs/INDEX.md`;
- `docs/ops/WORK_ORDER_STATUS.md`;
- `docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`.

## 11. Seguridad clínica

- No inferir desde el fármaco, catálogo, tratamiento previo o ausencia: dosis, vía, pauta, presentación, inducción, duración, renovación, cambio, adición, causalidad, resultado de validación o línea terapéutica.
- Solicitado no equivale a validado.
- Todo dato ausente permanece vacío, desconocido o pendiente.
- Usar exclusivamente datos sintéticos en las pruebas.

## 12. Pruebas obligatorias

Ejecutar exactamente:

```text
node --check scripts/farmacia_evaluation_ledger.js
node --check scripts/farmacia_validacion.js
node --check scripts/farmacia_primera_visita.js
node --check scripts/farmacia_seguimiento.js
node --check scripts/farmacia_evaluation_workbook.js
node tools/farmacia_evaluation_ledger_check.mjs
node tools/farmacia_evaluation_workbook_check.mjs
node tools/farmacia_smoke_check.mjs
node tools/farmacia_storage_policy_check.mjs
node tools/farmacia_common_check.mjs
node tools/farmacia_tratamiento_common_check.mjs
node tools/farmacia_pautas_catalog_check.mjs
node tools/farmacia_validacion_derma_pathologies_check.mjs
node tools/farmacia_validation_export_truth_check.mjs
node tools/farmacia_excel_row_export_check.mjs
node tools/farmacia_validacion_ui_cleanup_check.mjs
node tools/farmacia_enfermeria_import_check.mjs
node tools/farmacia_enfermeria_board_dom_check.mjs
git diff --check
```

Además, comprobar:

- el índice no carga ni ledger ni workbook;
- no existe cohorte, checkbox sintético ni guardado ficticio;
- las páginas clínicas cargan el ledger;
- los botones de exportación normal están conectados;
- la salida no cambia;
- se conservan `name_index` y `restoreEvaluationState`;
- la prueba unitaria del workbook mantiene 11 hojas.

## 13. QA en navegador

### 13.1. Inicio

- Confirmar la ausencia de cohorte, limpiar/descargar cohorte y lista paralela.
- Confirmar la presencia de búsqueda, bandejas y accesos rápidos.
- Confirmar `console` y `pageerror` en 0.

### 13.2. Validación

- Usar CIP sintético y campos explícitos.
- Generar la salida JARA y comprobar la persistencia.
- Comprobar la URL, recargar y verificar la restauración idempotente.
- Repetir la comprobación esencial con Excel.

### 13.3. Primera visita

- Comprobar PROM/DLQI.
- Verificar la restauración exacta de los radios dinámicos.

### 13.4. Seguimiento

- Crear una línea dinámica soportada, dispensación, tratamiento relacionado, acontecimiento adverso, sospechoso, Naranjo y Karch.
- Usar una salida normal.
- Recargar y verificar la restauración completa.

### 13.5. Reapertura por CIP

- Crear dos actos para el mismo CIP.
- Comprobar que no hay restauración automática.
- Comprobar el aviso compacto y las acciones recuperar/continuar.
- Confirmar que no hay sobrescritura.

### 13.6. Fallo de almacenamiento

- Bloquear `localStorage`.
- Confirmar que la salida continúa.
- Confirmar un aviso no bloqueante que no afirma persistencia.

### 13.7. Workbook desacoplado

- Confirmar que el workbook no aparece en la interfaz.
- Cargar explícitamente el módulo.
- Generar un XLSX real con 11 hojas y payload completo.
- Confirmar cero errores.

### 13.8. Cáceres

- Confirmar que el snapshot de Cáceres permanece idéntico.

## 14. Criterios de aceptación

1. El índice normal conserva búsqueda, bandejas y accesos rápidos.
2. No existe una cohorte paralela visible ni sus controles, contadores, tarjetas, mensajes o lista.
3. No existe consentimiento sintético especial ni botón de guardado ficticio.
4. El contenido TXT, CSV y Excel permanece sin cambios.
5. Una salida normal persiste discretamente el acto completo.
6. Un fallo de persistencia no bloquea la salida y se comunica de forma secundaria y veraz.
7. La recarga restaura exactamente el mismo acto sin exportar y conserva sus identificadores.
8. La reapertura por CIP requiere acción explícita y recupera el último acto del mismo paciente y tipo.
9. Continuar con un acto nuevo no elimina ni sobrescribe actos anteriores.
10. Seguimiento restaura líneas, tratamientos relacionados, acontecimientos adversos y causalidad completos.
11. DLQI y sus radios dinámicos se restauran exactamente.
12. El workbook de 11 hojas se conserva fuera del runtime asistencial normal.
13. Todas las pruebas obligatorias quedan en verde.
14. El QA real en navegador queda documentado.
15. `console` y `pageerror` permanecen en 0.
16. Cáceres permanece intacto.
17. No se realiza inferencia terapéutica.

## 15. Revisión independiente previa al commit

Antes del commit, realizar una revisión clínica independiente de solo lectura que cubra:

- seguridad clínica;
- pérdida de datos;
- cambios en exportaciones;
- ampliación indebida de alcance;
- líneas y causalidad;
- DLQI;
- fallo seguro de `localStorage`.

Corregir únicamente problemas dentro del alcance y volver a ejecutar las pruebas y el QA afectados.

## 16. Política Git

- Trabajar únicamente en el documento autorizado y las rutas autorizadas.
- Ejecutar y documentar pruebas y QA.
- Crear un único commit local con el mensaje: `fix(farmacia): realign local event flow`.
- No están autorizados: push, issue, PR, merge, mover `recovery`, publicar Pages, promocionar, borrar ramas o worktrees ni force push.
- La reversión será mediante un único commit local.
- No borrar las PR #199/#201, sus ramas, el workbook, las pruebas históricas ni el backup.

## 17. Condiciones de parada

Detener la ejecución ante cualquiera de estas condiciones:

- cambios remotos en la base;
- conflicto no trivial;
- necesidad de modificar una ruta de solo lectura;
- necesidad de Export Manager, las 61 columnas, una pantalla nueva, Cáceres, `main` o `recovery`;
- decisión no definida;
- imposibilidad de conectar la persistencia sin modificar la salida;
- una prueba sigue fallando después de dos intentos.

El estado de bloqueo será `BLOCKED_<MOTIVO>`; cuando corresponda a la necesidad de ampliar rutas o alcance, será `BLOCKED_NEEDS_SCOPE_EXPANSION`.

## 18. Reporte final obligatorio

El reporte final incluirá:

- worktree;
- rama;
- base y HEAD inicial;
- commit local final;
- rutas modificadas;
- interfaz retirada;
- capacidades preservadas;
- mecanismo de conexión de la persistencia;
- pruebas y resultados;
- QA en navegador;
- resultados de `console` y `pageerror`;
- revisión independiente;
- límites;
- confirmación de ausencia de acciones de publicación;
- confirmación de que `main`, `recovery` y Cáceres permanecen sin cambios.

El estado final solo podrá ser `READY_FOR_CORA_REVIEW` o `BLOCKED_<MOTIVO>`. Nunca se afirmará que el trabajo está publicado, mergeado o listo para piloto.
