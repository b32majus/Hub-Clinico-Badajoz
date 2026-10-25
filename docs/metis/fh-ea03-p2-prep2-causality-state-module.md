# FH-EA-03 · Módulo de estado en memoria por episodio×sospechoso×método×visita (unidad causality-state-module, 2/5)

## Problema

En BASE `6c9b541fb596cac07c00e511b945e283162380aa`, la sección «Análisis de causalidad» de Seguimiento conserva las respuestas de Naranjo/Karch-Lasagna en el estado legacy singular `currentFollowupVisit.causality_by_suspect`, vinculado a la visita y compartido por identidad de sospechoso. No existe memoria separada de borradores por (episodio EA, referencia de medicamento sospechoso, método, visita de edición actual): un candidato común a dos EA compartiría respuestas, los valores por defecto (`desconocido`/`no_se_sabe`) o la puntuación cero se confundirían con preguntas contestadas y no hay historial en memoria seguro al desmarcar un sospechoso. Esta unidad crea **solo el módulo de estado en memoria** (sin UI, sin controlador, sin persistencia) que las unidades posteriores (editor G0, reglas de estado, guardias de exportación) consumirán mediante su seam público.

## Comportamiento solicitado

1. Nuevo módulo `scripts/farmacia_seguimiento_ea_causality_state.js`: IIFE con `'use strict'` que expone el seam público `window.FarmaciaSeguimientoEaCausalityState`, cargado expresamente desde `farmacia_seguimiento.html` con su propia etiqueta `<script src="scripts/farmacia_seguimiento_ea_causality_state.js?...">`. No modifica `scripts/farmacia_seguimiento.js` ni ningún flujo legacy.
2. Seam público mínimo (contrato de esta unidad): `setEditingPatient(patientRef)`, `setEditingVisit(visitIdentity)`, `setSuspectMarked(episodeId, suspectRef, marked)`, `isSuspectMarked(episodeId, suspectRef)`, `recordAnswer(episodeId, suspectRef, method, questionId, value)`, `getState(episodeId, suspectRef, method)` y `getInactiveHistory()`. Episodio, referencia de medicamento sospechoso, identidad de paciente y de visita son identidades explícitas que pasa el consumidor; el módulo NO deduce identidad por nombre, categoría de catálogo ni posición de lista. Métodos con literales `naranjo` y `karch_lasagna`.
3. Separación de borradores por los cinco ejes (paciente en edición, visita de edición actual, episodio, referencia, método): las respuestas registradas en un contexto (A/X/naranjo) NO son visibles en (A/Y), ni en (B/X) con la MISMA referencia marcada expresamente en ambos EA, ni en (A/X/karch_lasagna); alternar contextos conserva las respuestas exactas de cada uno y jamás sobreescribe otro contexto. Volver a un contexto devuelve sus respuestas exactas mientras la misma visita siga siendo la de edición actual en la misma sesión de paciente.
4. Estado sin interacción = `No evaluado`: `getState` devuelve exactamente `{status:'no_evaluado', answers:{}}` para un contexto nunca tocado. Los valores por defecto `desconocido`/`no_se_sabe`, una puntuación cero o la categoría visual inicial NO se registran por sí solos ni acreditan preguntas contestadas: `answers` contiene exclusivamente respuestas tocadas/ratificadas expresamente vía `recordAnswer` (incluida una selección expresa cuyo valor sea `desconocido`/`no_se_sabe`, que sí se registra porque fue tocada). Una o más respuestas explícitas parciales → `{status:'borrador_en_edicion'}`. Nunca existe un estado «completado» ni puntuación/categoría en el estado: el módulo NO calcula escalas ni categorías (el helper existente `FarmaciaValidationModel` sigue siendo la única autoridad de cálculo, en la UI, unidades posteriores).
5. `recordAnswer` para un sospechoso NO marcado expresamente en ese episodio se ignora (fail-closed, devuelve `false` sin registrar) y el estado permanece `No evaluado`. Con marca expresa registra (devuelve `true`) y la última respuesta explícita de una misma pregunta sustituye a la anterior dentro del mismo borrador activo. `getState` devuelve copias (snapshot): mutar lo devuelto no altera la memoria del módulo.
6. Desmarcar (`setSuspectMarked(..., false)`) NO destruye silenciosamente los borradores con contenido de ese (episodio, referencia): dejan de ser evaluación activa —`isSuspectMarked` pasa a `false`, ambos métodos vuelven a `No evaluado`— y quedan identificables como historial en memoria vía `getInactiveHistory()`: entradas `{episodeId, suspectRef, method, answers}` con copia snapshot de las respuestas registradas, solo para contextos con al menos una respuesta explícita, distinguibles entre sí, sin metadatos de acto, autoría ni tiempo. Mutar las entradas devueltas no toca el historial del módulo.
7. Volver a marcar expresamente la misma referencia sin cambio de identidad NO imputa ni restaura automáticamente causalidad: el estado vuelve a `No evaluado` aunque el historial conserve el borrador anterior. El historial NO se sobreescrito: nuevas respuestas y un nuevo desmarcado añaden una entrada nueva distinta conservando íntegra la previa. Mientras el sospechoso permanece desmarcado, `recordAnswer` sigue ignorándose.
8. Cambio de paciente (`setEditingPatient` con identidad explícita distinta): destruye TODO el contexto en memoria —contextos, historial y marcas— sin recrearlo ni simular relectura; volver a fijar la identidad anterior no restaura nada y las marcas quedan destruidas (registrar exige marcar de nuevo). Volver a fijar la MISMA identidad no destruye nada. A→B→A con identidades explícitas y sin almacenamiento autorizado no simula relectura de A.
9. Visita de edición actual: contextos, marcas e historial quedan bajo la identidad de visita con la que se registraron; fijar otra identidad de visita no filtra respuestas ni historial a la nueva visita. Memoria de edición solamente.
10. Sin `sessionStorage`/`localStorage`/`IndexedDB`, sin reloj ni aleatoriedad (`Date`, `Math.random`, `crypto`), y sin `actId`, `evaluation_id`, `authorRef`, `authoredAt`, `attributionAssurance`, `provenance` ni llamadas F4.4 (`createAct`): el módulo es puro estado de UI en memoria y no genera ningún metadato de acto. FH-EA-01 sigue en HUMAN STOP: esto NO es una evaluación clínica F4.4.
11. Regresión: `verify:fast` y los testigos T01 (lógico y browser) y de identidad de sospechosos 02B siguen pasando sin modificación; `farmacia_seguimiento.html` solo gana la etiqueta de carga del módulo.

No se exige un texto de mensaje, idioma de identificadores internos distinto del contrato anterior, ni un orden interno de almacenamiento: basta el seam y los comportamientos observables 1–11.

## Fuera de alcance

- Editor G0 UI (selector EA→sospechoso, cuestionarios, resumen), reglas de estado visibles, guardias de no entrega y aviso de edición no guardada: unidades 3–5 del train (`causality-editor-ui`, `causality-status-rules`, `causality-export-guards`).
- `scripts/farmacia_seguimiento.js` (controlador), módulos F4.4, `modules/farmacia_ea_invariants.js`, `scripts/farmacia_validacion_model.js` (READ-ONLY), escalas Naranjo/Karch, exportaciones TXT/CSV/Excel/V2, persistencia.
- Identidad y pendientes de reconciliación de sospechosos (FH-EA-02B, ya entregado), capturas T01 versionadas, otras patologías y pantallas.

## Open questions

- Cambio de visita de edición: esta unidad fija la lectura de clave (hecho 3 y 9): los borradores quedan bajo la identidad de visita explícita con la que se registraron y vuelven si se vuelve a fijar la misma identidad dentro de la misma sesión de paciente. Una lectura alternativa más severa —destruir todo al cambiar de visita de edición— no está exigida por el issue; si la usuaria la prefiere, ajustar antes del train.
- Historial de desmarcado: esta unidad conserva solo borradores con al menos una respuesta explícita y no registra «valoración final farmacéutica» (elección de UI de la unidad de editor). Si se quiere historial también de contextos vacíos o de la elección final, decidirlo antes del train.
- `recordAnswer` no valida vocabulario de pregunta/valor ni método desconocido (el módulo es agnóstico; la validación de vocabulario clínico pertenece a la UI/editor y al helper existente). Si se exige validación en el módulo, decidirlo antes del train.
- La guarda «Referencia pendiente de reconciliación» (C05, identidad no verificada) pertenece a la unidad de reglas de estado; este módulo solo aplica su fail-closed propio: sospechoso no marcado expresamente ⇒ no se registra.

## Trazabilidad

| Requisito | Testigo |
|---|---|
| 1 Módulo + seam `window.FarmaciaSeguimientoEaCausalityState` + etiqueta de carga en el HTML | `causality-state-module-oracle` §carga (RED en BASE: módulo y etiqueta ausentes) |
| 2 Seam con las siete funciones | `causality-state-module-oracle` §carga |
| 3 Separación A/X, A/Y, B/X (referencia común), naranjo vs karch; alternancia exacta; no sobreescritura | `causality-state-module-oracle` §separación |
| 4 `No evaluado` sin interacción; defaults no acreditados; `borrador_en_edicion` parcial; nunca «completado»; sin escalas | `causality-state-module-oracle` §estado (incl. naranjo 10/10 vs karch `No evaluado`) |
| 5 Fail-closed sin marca; última respuesta explícita gana; snapshot discipline | `causality-state-module-oracle` §registro y §snapshot |
| 6 Desmarcado → `No evaluado` + historial en memoria distinguible, snapshot, sin metadatos | `causality-state-module-oracle` §desmarcado |
| 7 Re-marca sin restauración/imputación; historial íntegro y no sobreescrito; sin registro desmarcado | `causality-state-module-oracle` §re-marcado |
| 8 Cambio de paciente destruye todo sin relectura; misma identidad no destruye | `causality-state-module-oracle` §paciente |
| 9 Visita de edición: sin fuga entre visitas; conservación bajo su visita | `causality-state-module-oracle` §visita |
| 10 Sin storage/reloj/aleatoriedad/metadatos de acto en el módulo | `causality-state-module-oracle` §frontera (escaneo de fuente) |
| 11 Cardinalidad 0/1/2/5 EA con referencia común aislada por episodio | `causality-state-module-oracle` §cardinalidad |
| 12 Regresión T01 lógico | `causality-state-module-oracle` §regresión; `verify-nexus` y `ea-r1-revision2-amendment-oracle` añadidos por perfil; testigos browser T01/02B en la suite focal previa del writer (re-capturan PNG versionados, fuera del oráculo) |

## Unidad

```metis-unit
{
  "schema": "metis.unit/v1",
  "unit": "causality-state-module",
  "riskClass": "complex",
  "uiImpact": "none",
  "sizeClass": "M",
  "maxCorrections": 1,
  "allowedPaths": ["scripts/farmacia_seguimiento_ea_causality_state.js", "farmacia_seguimiento.html", "tools/farmacia_ea_causality_state_check.mjs"],
  "doNotTouch": ["docs/metis/", "metis/"],
  "ports": [],
  "witness": [{"id": "causality-state-module-oracle", "cmd": ["node", "metis/oracles/causality-state-module.mjs"], "timeoutSec": 300, "mustFailAtBase": true}]
}
```