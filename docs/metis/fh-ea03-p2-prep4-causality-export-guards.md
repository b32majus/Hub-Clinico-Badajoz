# FH-EA-03 · Guardias de no entrega y aviso visible de edición no guardada (unidad causality-export-guards, 5/5)

## Problema

En BASE `6f8424ea774be4b7188f19a664a4e531bf633b07` (unidades 1–4 ya entregadas y fusionadas al train: C11, módulo de estado, editor G0 y reglas de estado), las guardias de no entrega de `buildEaActBlockSnapshot()` y de las exportaciones TXT/JARA, CSV, Excel y proyección v2 no están demostradas frente al editor G0, y faltan dos capacidades verificables:

1. **Aviso (C09).** Con un contexto de evaluación seleccionado y SIN interacción, el aviso `#fhCausalityAvisoProvisional` (texto entregado por la unidad 3 con la semántica T01 + provisionalidad) está OCULTO: solo se muestra cuando existen resultados provisionales que pintar. El objetivo de la unidad exige que la sección muestre el aviso visible en cuanto hay causalidad en edición — la edición no forma parte del acto preparado ni se ha guardado/exportado aunque todavía no haya puntuaciones que mostrar.
2. **Fuga de exportación (C09, defecto reproducido).** En una visita reconstituida por el seam `restoreEvaluationState` (llamador real en producción: `farmacia_evaluation_ledger.js` llama `api.restoreEvaluationState`) cuya máquina legacy singular apunta al sospechoso en edición (`adverse_event.suspect_ids + causality_editing_id`), `buildFollowupVisitExportModel()` captura el DOM del editor G0 hacia `causality_by_suspect` (vía `captureCausalityEditor`) y las salidas presentan el borrador provisional como causalidad evaluada: el TXT/JARA imprime `Causalidad other:seg-other-1 (…): Naranjo 1 · Posible | …` y las columnas `causalidad_naranjo`/`causalidad_karch` de Excel/CSV imprimen `other:seg-other-1: 1 · Posible`. La causalidad en edición SÍ entra en la representación de exportación, parcialmente y sin metadatos, cambiando las salidas al registrarse el borrador.

Adicionalmente el editor G0 es alcanzable por el envelope de borradores del runtime del paciente (los select `#fhCausalityEpisode`, `#fhCausalitySuspect`, `#fhCausalidadFinal` son controles con id elegibles para el page draft): con un envelope activo en producción, interactuar con el editor escribiría su estado en sessionStorage. El harness de QA no puede activar ese envelope (no hay data port), de modo que la guardia se demuestra como ausencia de contenido de causalidad en ambos almacenamientos y el fix la garantiza estructuralmente.

## Comportamiento solicitado

1. **P1-3 · Igualdad estructural (C09).** En la sesión de UN único EA incorporado (sospechoso marcado expresamente, línea seleccionada y dispensada para que las filas Excel/CSV no sean triviales), ANTES de tocar un cuestionario y DESPUÉS de registrar un borrador Naranjo G0 (respuestas explícitas q1/q2), comparadas por el seam soportado de solo lectura SIN crear acto, SIN guardar y SIN exportar: `buildSegLines()`, `buildFollowupExcelRows(buildFollowupVisitExportModel())`, `buildFollowupCsv(buildFollowupVisitExportModel())`, la proyección v2 (`buildFollowupV2ProjectionFromCurrentContext`, seam existente y de solo lectura; no se requiere STOP) y `buildEaActBlockSnapshot()`. Todas las representaciones pertinentes son idénticas antes/después: el borrador de causalidad no cambia ninguna salida, aun cuando la salida singular de 1 EA esté permitida.
2. **P1-3 · Ausencia de evaluación formal (C09/C04).** En todas las representaciones no aparece puntuación provisional ni categoría formal presentada como evaluación: el TXT no contiene puntuaciones de causalidad (`Naranjo <n>`), las columnas `causalidad_naranjo`/`causalidad_karch` de Excel y CSV no contienen patrón de puntuación (`<n> · <categoría>`) ni categorías formales (Posible/Probable/Definida/Cierta), la proyección v2 no contiene contenido de causalidad y `buildEaActBlockSnapshot()` no contiene claves de causalidad (`naranjo`, `karch`, `causal*`, `final_assessment`).
3. **Visita reconstituida (C09, falsador principal).** Tras usar `restoreEvaluationState` (seam técnico identificado con llamador real en el ledger) con una visita cuya máquina legacy singular apunta al sospechoso en edición y sin borrador en el módulo G0: capturadas las representaciones antes y después de registrar el borrador Naranjo por interacción soportada, siguen siendo idénticas y sin puntuación/categoría formal en TXT, Excel, CSV; la proyección v2 falla cerrada (validación BRIDGE del contexto técnico) o sale sin contenido de causalidad; el snapshot del acto sigue representando el EA incorporado sin causalidad. En BASE el borrador entra como `Naranjo <n> · <categoría>` (RED).
4. **Nada declara «persisted» (C09).** Ninguna representación (TXT, CSV, Excel, v2, snapshot) contiene `persisted`/`persistido`.
5. **Sin almacenamiento (C09).** Tras el recorrido completo de edición (selectores, chips, valoración final, construcción de todas las representaciones, intentos de exportación bloqueados), sessionStorage y localStorage no contienen ninguna entrada con contenido de causalidad en edición (`causality`, `causalidad`, `naranjo`, `karch`).
6. **Aviso visible (C09/C04).** Con contexto de evaluación seleccionado y sin interacción, y también con borrador activo, `#fhCausalityAvisoProvisional` es visible en español y reutiliza semánticamente el aviso T01 («no forman parte del acto preparado», «no se ha guardado ni exportado») añadiendo que las puntuaciones y categorías de Naranjo/Karch mostradas son provisionales y NO constituyen una evaluación clínica formal registrada. No se exige un literal nuevo del vocabulario aprobado.
7. **Negativo de cardinalidad conservado (C09).** Con 2 EA incorporados y borrador Naranjo activo, los intentos REALES de exportar (botones `#fhSegExportTxt`, `#fhSegExportCsv`, `#fhSegExcelExportBtn`) muestran el aviso visible de bloqueo con la cardinalidad («2 EA incorporados», «Exportación no realizada») y el intento real de copia v2 (`#fhSegExportV2Btn`) muestra su bloqueo por cobertura EA («Copia no realizada»). La frontera singular sigue activa por seam (`getEaSingularExportBlockReason`) y en el modelo (`ea_singular_export_block_reason`).
8. **Sin pérdida de borradores (objetivo 3).** Tras construir todas las representaciones por seam y tras los intentos de exportación bloqueados, el borrador G0 sigue en memoria de edición con sus respuestas exactas (`borrador_en_edicion`, `{q1: 'si', …}`), el aviso sigue visible y el snapshot del acto preparado mantiene `event_count` correcto sin contenido de causalidad.
9. **Consumidores y regresiones.** Los oráculos de las unidades 1–4 (`ea-r1-revision2-amendment`, `causality-state-module`, `causality-editor-ui`, `causality-status-rules`), `verify:nexus` y los testigos T01 (`farmacia_ea_t01_check.mjs`, `farmacia_ea_t01_browser_check.mjs`, `farmacia_ea_suspect_identity_browser_check.mjs`) siguen en verde. El mundo legacy sin módulo de estado (T01 Node, `farmacia_pr57d_visit_outputs_check.mjs`) conserva su comportamiento de exportación exacto: la guardia de exportación solo aplica con el editor G0 activo (módulo de estado presente).

No se exige una redacción nueva del aviso, ni cambios de HTML/CSS, ni criterios clínicos de completitud (C04: siguen sin definirse por contrato; los estados permanecen `No evaluado/Borrador`), ni persistencia, ni metadatos de acto (`actId`, `evaluation_id`, `authorRef`, `authoredAt`, `attributionAssessment`, `provenance`), ni guardar/exportar de verdad en las pruebas (P1-3: sin crear acto, sin guardar, sin exportar).

## Fuera de alcance

- Tickets, oráculos, patches y preguntas heredados de las unidades 1–4 (intocables; el oráculo de unidad 3 `causality-editor-ui.mjs` no se modifica).
- `farmacia_seguimiento.html` y `scripts/farmacia_seguimiento_ea_causality_state.js` (la unidad no necesita tocarlos), módulos F4.4, funciones R1, `scripts/farmacia_validacion_model.js` (READ-ONLY), capturas T01 versionadas, `package.json`/lock, `main`, canónica, push/PR/merge.
- Cualquier criterio clínico de completitud de Naranjo/Karch (C04) y cualquier evaluación causal formal.

## Open questions

- El oráculo exige el aviso visible con un CONTEXTO de evaluación seleccionado (con o sin borrador). No exige el aviso cuando la sección está activa pero sin contexto (sin episodio/sospechoso): si la usuaria quiere el aviso también en ese estado intermedio, decidirlo antes del train; el fix de referencia lo mostraría igualmente al seleccionar contexto y no lo mostraría sin contexto.
- La redacción del aviso es la entregada por la unidad 3 (semántica T01 + provisionalidad aprobada); no se exige literal nuevo.
- La guardia de almacenamiento se demuestra como ausencia de contenido de causalidad en sessionStorage/localStorage: el envelope del runtime no puede activarse en el harness estático (sin data port). El fix de referencia marca además las secciones de causalidad con `data-fh-transient` desde `farmacia_seguimiento.js` para que un envelope activo en producción nunca pueda redactar el editor; ese atributo no es observable en el harness y no es exigido por aserción.
- La proyección v2 en la visita reconstituida falla cerrada (validación BRIDGE del contexto técnico sintético); se acepta como guardia válida («falla cerrada o sale limpia»).
- `verify:nexus` forma parte del perfil; su gate de previews reacciona a rutas sin tratar en `git status --porcelain` (p. ej. artefactos de receta no comprometidos): con la preparación comprometida y solo el cambio de producto sin comprometer, el gate es reproducible; un fallo por entorno no es defecto de la unidad.

## Trazabilidad

| Requisito | Testigo |
|---|---|
| 1 Igualdad estructural TXT/Excel/CSV/v2/snapshot antes/después del borrador (1 EA) | `causality-export-guards-oracle` §sesión 1 (P1-3) |
| 2 Ausencia de puntuación provisional/categoría formal en todas las representaciones; snapshot sin causalidad | `causality-export-guards-oracle` §sesión 1 |
| 3 Visita reconstituida: el borrador G0 nunca se exporta como causalidad evaluada; v2 falla cerrada o limpia | `causality-export-guards-oracle` §sesión 2 (RED en BASE: `Naranjo 1 · Posible` en TXT/CSV/Excel) |
| 4 Nada declara «persisted» | `causality-export-guards-oracle` §sesión 1 |
| 5 Sin almacenamiento de la causalidad en edición | `causality-export-guards-oracle` §sesiones 1 y 3 |
| 6 Aviso visible en español con contexto en edición (sin interacción y con borrador), semántica T01 + provisionalidad | `causality-export-guards-oracle` §sesión 1; receta `metis/visual/causality-export-guards/recipe.mjs` (disparo `causalidad-aviso-contexto-en-edicion`) |
| 7 Negativo de cardinalidad conservado (2 EA: TXT/CSV/Excel/v2 bloqueados de forma visible) | `causality-export-guards-oracle` §sesión 3 |
| 8 Sin pérdida de borradores en memoria tras construir representaciones e intentos bloqueados | `causality-export-guards-oracle` §sesiones 1, 2 y 3 |
| 9 Consumidores y regresiones (oráculos 1–4, T01 Node/browser, identidad 02B, verify:nexus; mundo legacy sin módulo intacto) | `ea-r1-revision2-amendment-oracle`, `causality-state-module-oracle`, `causality-editor-ui-oracle`, `causality-status-rules-oracle`, `verify-nexus` (perfil) |
| Visual: aviso visible con contexto sin interacción (discriminante) y composición con borrador sin cambio | receta `metis/visual/causality-export-guards/recipe.mjs` (criterios C1–C2) |

## Unidad

```metis-unit
{
  "schema": "metis.unit/v1",
  "unit": "causality-export-guards",
  "riskClass": "complex",
  "uiImpact": "quality",
  "sizeClass": "S",
  "maxCorrections": 1,
  "allowedPaths": ["scripts/farmacia_seguimiento.js", "tools/farmacia_ea_t01_check.mjs"],
  "doNotTouch": ["docs/metis/", "metis/", "farmacia_seguimiento.html", "scripts/farmacia_seguimiento_ea_causality_state.js", "tools/farmacia_ea_suspect_identity_browser_check.mjs"],
  "ports": [8934],
  "witness": [{"id": "causality-export-guards-oracle", "cmd": ["node", "metis/oracles/causality-export-guards.mjs"], "timeoutSec": 600, "mustFailAtBase": true}],
  "visualRecipe": "metis/visual/causality-export-guards/recipe.mjs",
  "visual": {
    "cmd": ["node", "metis/visual/causality-export-guards/recipe.mjs"],
    "timeoutSec": 300,
    "shots": ["causalidad-aviso-contexto-en-edicion"],
    "unchanged": ["causalidad-borrador-naranjo-activo"],
    "criteria": [
      "C1: la sección real #modSeguimientoCausalidad con contexto de evaluación seleccionado y SIN interacción muestra el aviso visible en español de edición no guardada (la edición no forma parte del acto preparado ni se ha guardado/exportado) con la provisionalidad de Naranjo/Karch (no constituyen evaluación clínica formal registrada); en BASE ese aviso está oculto y el disparo lo evidencia",
      "C2: con un borrador Naranjo activo la sección muestra la puntuación y categoría provisionales junto al aviso sin presentar el resultado como evaluación clínica formal registrada; esa composición ya la entregó la unidad 3 y NO debe cambiar con esta unidad (regresión visual)"
    ]
  }
}
```
