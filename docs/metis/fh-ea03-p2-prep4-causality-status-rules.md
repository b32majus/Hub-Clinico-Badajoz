# FH-EA-03 · Reglas de estado: provisionalidad, desmarcado, paciente y contradicción (unidad causality-status-rules, 4/5)

## Problema

En BASE `ba67991a2d2ce6aeaf3543df1a848df8a5d20b49` (BASE del train con las unidades 1–3 entregadas: C11, módulo de estado y editor G0), el editor G0 de causalidad de Seguimiento aún no garantiza todas las reglas de estado del objetivo de la unidad 4. El defecto reproducido en BASE: `restoreEvaluationState` (seam público de restitución, llamado tras reconstruir una visita con máquina legacy singular previa) termina invocando `restoreCausalityEditor`, que vuelca al DOM el borrador legacy de `causality_by_suspect` — «Causalidad final farmacéutica» muestra `Definida` ajena, respuestas legacy aparecen como chips activos — o, sin borrador legacy, preactiva los valores por defecto `desconocido`/`no_se_sabe` de los 17 chips como si estuvieran contestados, pese a que no existe contexto G0 ni interacción alguna. Además faltan por contrato las regresiones de unidad 4 exigidas por la enmienda PREP4: lectura visible `No evaluado` de `#resumenNaranjo`/`#resumenKl` sin interacción y tras restitución, cambio de paciente A→B→A con identificadores iguales (los efímeros de A y B pueden coincidir), y las regresiones UI de presencia «No» con 0 EA y de dos candidatos con la misma etiqueta visible.

## Comportamiento solicitado

1. **P1-1 · Provisionalidad (C03/C04).** En un contexto de evaluación (episodio real + sospechoso marcado seleccionados) **sin ninguna interacción**, los resúmenes visibles `#resumenNaranjo` y `#resumenKl` leen exactamente «No evaluado» y excluyen «0 · Dudosa», «Dudosa» y cualquier resultado causal atribuido («Posible», «Probable», «Definida»). La puntuación sin interacción no se presenta como «0» evaluado y ningún chip aparece contestado. Las puntuaciones/categorías del helper se presentan como provisionales (aviso existente).
2. **P1-1 · C04.** Elegir la opcional «Causalidad final farmacéutica» NO convierte por sí sola en evaluados Naranjo ni Karch: sus estados en el módulo siguen `no_evaluado` y ambos resúmenes siguen «No evaluado».
3. **P1-1 · Restitución sin interacción.** Tras usar `restoreEvaluationState` (seam técnico identificado, estados sin controles UI propios) con un contexto sin interacción, ambos resúmenes siguen en «No evaluado», sin cero ni categoría por defecto y **sin chips preactivados** por los valores por defecto.
4. **P1-2 · Borrador legacy ajeno (C08).** Tras usar `restoreEvaluationState` con una visita que trae un borrador legacy `causality_by_suspect[ref]` con `final_assessment: 'Definida'` y respuestas ajenas, el control `#fhCausalidadFinal` **no** muestra `Definida` como valor vigente: queda el valor propio documentado del contexto actual («No evaluada») o vacío. Tampoco se activan chips ni categorías desde ese borrador legacy, y el borrador legacy no activa una evaluación G0 del contexto. No basta comprobar Naranjo, Karch o chips: la aserción del control final es obligatoria.
5. **P2 · Cambio de paciente A→B con identificadores IGUALES (C06).** Restaurando B con el mismo `episode_id`, la misma referencia de sospechoso y el mismo nombre visible, B no muestra cuestionarios, categorías, chips, selecciones contaminadas, borradores ni historial de A: estado `no_evaluado` en ambos métodos, marcas destruidas, historial vacío, categorías y resúmenes «No evaluado», sin valoración final ajena. **Los identificadores efímeros de A y B pueden coincidir**; no se exige que difieran.
6. **P2 · A→B→A.** Volver a A no finge relectura de A: sin borradores ni historial resucitados; con la marca destruida, tocar un chip no registra respuesta (fail-closed) hasta re-marcar de forma expresa. La salida de A mediante el cambio de CIP existente conserva la confirmación de datos no guardados («Vas a cambiar de paciente…»).
7. **C05 · Desmarcado y reconciliación.** Desmarcar un sospechoso conserva su borrador como historial en memoria distinguible (respuestas exactas, sin metadatos de acto) y deja de ser evaluación activa; volver a marcar la misma referencia no restaura automáticamente causalidad alguna ni sobreescribe el historial. Ante una marca «Referencia pendiente de reconciliación» (fuente cambiada/ausente), la evaluación sobre identidad no verificada permanece inhabilitada: selector de sospechoso sin opciones evaluables/inhabilitado, cuestionarios inhabilitados, explicación visible y sin activación de estado.
8. **C06 · Contradicción.** Cambiar presencia Sí→No con EA incorporados activa la guardia de contradicción existente (la presencia vuelve a «Sí», aviso visible, EA intactos).
9. **Regresiones UI suplementarias de la enmienda (sin tocar el oráculo heredado de unidad 3).** Con presencia «No» (valor tomado del select real del DOM) y 0 EA: sección de causalidad inactiva, cuestionarios/controles inactivos y explicación visible en español. Con dos candidatos de referencias explícitas distintas y la misma etiqueta visible «Medicamento Alfa Sintético» marcados en un mismo EA: el selector ofrece dos opciones por referencia distinta pese a la misma etiqueta y los borradores A/X y A/Y quedan aislados (sin deducir identidad por nombre, categoría o posición), restaurando cada contexto sus respuestas exactas.
10. **Consumidores y regresiones.** `tools/farmacia_ea_suspect_identity_browser_check.mjs` sigue pasando sin modificación; los oráculos de las unidades 1–3 (`ea-r1-revision2-amendment`, `causality-state-module`, `causality-editor-ui`) y `verify:nexus` siguen en verde. Sin sessionStorage/localStorage/IndexedDB, sin metadatos de acto (`actId`, `evaluation_id`, `authorRef`, `authoredAt`, `attributionAssurance`, `provenance`), sin persistencia, sin escalas nuevas y sin estados «completados» (su criterio clínico no está definido por contrato: C04).

No se exige un texto literal nuevo del vocabulario clínico aprobado («No evaluado», aviso de provisionalidad), ni una UX concreta de reconciliación, ni cambiar el contrato del módulo de estado `FarmaciaSeguimientoEaCausalityState` entregado por la unidad 2.

## Fuera de alcance

- Guardias de no entrega y aviso de edición no guardada en exportaciones TXT/Excel/CSV/v2: unidad 5 `causality-export-guards`.
- Artefactos, tickets y oráculos heredados de las unidades 1–3 (intocables; las nuevas comprobaciones de C01/C02 son regresiones propias de esta unidad, en su propio oráculo).
- Código clínico, módulos F4.4, funciones R1 fuera de la excepción C11 (ya entregada), permisos, datos reales, `main`, canónica, push/PR/merge, capturas T01 versionadas, `package.json`/lock.
- HTML/CSS del editor (la unidad 3 cerró la composición G0); `scripts/farmacia_validacion_model.js` es READ-ONLY.

## Open questions

- La explicación interna de la sección cuando la marca está pendiente reutiliza el mensaje genérico «sin sospechoso marcado…» mientras el rótulo «Referencia pendiente de reconciliación» vive en la tarjeta EA (fuera de `#modSeguimientoCausalidad`). Si la usuaria quiere un mensaje específico de pendencia dentro de la sección, decidirlo antes del train; el oráculo solo exige bloqueo seguro + explicación visible (lección S17b: el resultado seguro es controles bloqueados).
- La unidad no necesita modificar los testigos T01 (`farmacia_ea_t01_browser_check.mjs`, `farmacia_ea_t01_check.mjs`); `allowedPaths` los excluye. Si alguna regresión del gate completo exigiera escribir en ellos, la unidad se detiene por conflicto de alcance según el plan.
- `verify:nexus` forma parte del perfil como testigo de regresión; un fallo por entorno (p. ej. dependencias) no es defecto de la unidad y se diagnostica con el `install` autorizado, sin tocar `package.json`/lock.
- Los disparos visuales no incluyen estados de provisionalidad ni de desmarcado propios: esas transiciones fueron entregadas visualmente por la unidad 3 y sus advertencias sin cambio visual referencia↔BASE son esperables (no son evidencia de unidad 4).

## Trazabilidad

| Requisito | Testigo |
|---|---|
| 1 Resúmenes visibles «No evaluado» sin interacción; exclusión de 0·«Dudosa»/«Dudosa»/resultado atribuido; sin chips contestados | `causality-status-rules-oracle` §sesión 1 (P1-1 falsador 1) |
| 2 Causalidad final sola no completa métodos | `causality-status-rules-oracle` §sesión 1 (C04) |
| 3 Restitución sin interacción: resúmenes «No evaluado», sin defaults ni chips preactivados | `causality-status-rules-oracle` §sesión 1 (P1-1 falsador 2, RED en BASE por chips por defecto) |
| 4 Borrador legacy «Definida»: `#fhCausalidadFinal` sin contaminación; sin chips/categorías legacy; sin activación G0 | `causality-status-rules-oracle` §sesión 1 (P1-2, RED en BASE) |
| 5 A→B con IDs iguales sin contaminación (borradores, chips, categorías, selección, historial) | `causality-status-rules-oracle` §sesión 3 (P2, RED en BASE por chips por defecto) |
| 6 A→B→A sin relectura; fail-closed; confirmación de salida por CIP | `causality-status-rules-oracle` §sesión 3 |
| 7 Desmarcado → historial distinguible; re-marcado sin restauración ni sobreescritura; pendiente de reconciliación inhabilita evaluación | `causality-status-rules-oracle` §sesión 2 |
| 8 Guardia de contradicción Sí→No con EA incorporados | `causality-status-rules-oracle` §sesión 4 |
| 9 Presencia «No» con 0 EA inactiva con explicación; misma etiqueta, referencias distintas aisladas | `causality-status-rules-oracle` §sesión 4 |
| 10 Consumidor de identidad 02B, oráculos de unidades 1–3, verify:nexus | `ea-r1-revision2-amendment-oracle`, `causality-state-module-oracle`, `causality-editor-ui-oracle`, `verify-nexus` (perfil); consumer dentro del oráculo (seam) |
| Visual: sección real con evaluación bloqueada por identidad pendiente | receta `metis/visual/causality-status-rules/recipe.mjs` (disparo `causalidad-estado-reconciliacion` sobre `#modSeguimientoCausalidad`; criterios C1–C2) |

## Unidad

```metis-unit
{
  "schema": "metis.unit/v1",
  "unit": "causality-status-rules",
  "riskClass": "complex",
  "uiImpact": "quality",
  "sizeClass": "M",
  "maxCorrections": 1,
  "allowedPaths": ["scripts/farmacia_seguimiento.js"],
  "doNotTouch": ["docs/metis/", "metis/", "farmacia_seguimiento.html", "scripts/farmacia_seguimiento_ea_causality_state.js", "tools/farmacia_ea_suspect_identity_browser_check.mjs"],
  "ports": [8933],
  "witness": [{"id": "causality-status-rules-oracle", "cmd": ["node", "metis/oracles/causality-status-rules.mjs"], "timeoutSec": 600, "mustFailAtBase": true}],
  "visualRecipe": "metis/visual/causality-status-rules/recipe.mjs",
  "visual": {
    "cmd": ["node", "metis/visual/causality-status-rules/recipe.mjs"],
    "timeoutSec": 300,
    "shots": ["causalidad-estado-reconciliacion"],
    "unchanged": [],
    "criteria": [
      "C1: el disparo fotografía la sección real #modSeguimientoCausalidad (no la tarjeta #fhSegEaList) con la marca degradada a «pendiente de reconciliación»: sección visible, selector de sospechoso y cuestionarios inhabilitados y explicación visible en español; sin captura de fallback de otro componente",
      "C2: con la evaluación bloqueada, puntuaciones, categorías y resúmenes se muestran «No evaluado», la valoración final queda «No evaluada» y ningún valor por defecto aparece presentado como contestado (los chips preactivados por defecto del BASE desaparecen)"
    ]
  }
}
```
