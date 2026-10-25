# FH-EA-03 · Editor G0 de causalidad: selector EA→sospechoso marcado y cuestionarios existentes (unidad causality-editor-ui, 3/5)

## Problema

En BASE `9a89bc14164f3e8cad5988ea878fe444cb881a5e` (BASE aprobada del train, con C11 y el módulo de estado ya entregados), la sección «Análisis de causalidad» de Seguimiento sigue vinculada a la máquina legacy singular (`currentFollowupVisit.adverse_event.causality_editing_id` / `causality_by_suspect`): permanece oculta porque sus selectores singulares están fuera de la composición T01, no ofrece ningún selector de episodio real ni de sospechosos por EA, y sus chips muestran «Desconocido»/«No se sabe» preactivados con puntuación «0 · Dudosa» como si fuera una evaluación. La unidad anterior entregó el módulo de estado en memoria `FarmaciaSeguimientoEaCausalityState` (borradores por paciente×visita×episodio×referencia×método); falta el editor G0 que lo consuma: primero episodio real (ID + descripción), después solo los sospechosos marcados expresamente en ese episodio, y después los DOS cuestionarios existentes y su resumen una sola vez, calculados por el helper existente y presentados como provisionales.

## Comportamiento solicitado

1. Con presencia «Sí» y al menos un EA documentado en edición (incorporado con descripción), la sección «Análisis de causalidad» se muestra y ofrece **primero un selector de episodio real** —cada opción con el ID del episodio y su descripción, tomados exclusivamente de `currentFollowupVisit.adverse_events[]`— y **después un selector de sospechoso** cuyas opciones son exactamente los medicamentos que el profesional ha marcado expresamente como sospechosos de ese episodio (`adverse_events[].suspect_ids`). El selector **nunca agrega candidatos de otros EA** y **ningún sospechoso se selecciona automáticamente** (siempre arranca en su placeholder).
2. El selector de episodio aparece **antes** que los cuestionarios en la composición de la sección. No se ofrecen episodios DEMO del HTML (`DEMO-EP-…`) en ninguna superficie del editor.
3. Con presencia «No» o «No consta» la sección permanece inactiva y se muestra la explicación existente en español. Con «Sí» y cero EA documentados, o con un episodio sin sospechosos marcados, se muestra una **explicación en español** dentro del circuito y los controles quedan **apropiadamente inactivos** (selectores de episodio/sospechoso, chips de ambos cuestionarios y valoración final), sin usar datos DEMO.
4. La composición presenta **los DOS cuestionarios existentes** (Naranjo 10 ítems, Karch-Lasagna 7 ítems) y **su resumen una sola vez**, reutilizando el HTML/CSS existentes; ningún cuestionario se duplica dentro de las tarjetas EA.
5. El cálculo lo hace **exclusivamente el helper existente** `FarmaciaValidationModel.calculateNaranjoScore` / `categorizeNaranjo` / `categorizeKarchLasagna`; no se reimplementan escalas ni se inventan categorías. El resultado mostrado coincide con el del helper para las respuestas registradas y se presenta **como provisional** (aviso visible de que no constituye evaluación clínica formal registrada ni forma parte del acto preparado).
6. **Sin interacción el estado es «No evaluado»**: los valores por defecto (`desconocido`/`no_se_sabe`), la puntuación cero o la categoría visual inicial NO se muestran como evaluados (puntuación «—», categoría «No evaluado» en Naranjo, Karch y resumen). Solo respuestas tocadas/ratificadas expresamente se registran en el módulo de estado (incluida una selección expresa de «desconocido»/«no_se_sabe»); con respuestas parciales el borrador permanece en edición y nunca se declara «completado».
7. Los borradores se capturan y restauran **exactamente desde el módulo de estado** al alternar episodio, sospechoso o método: A/X, A/Y y B/X mantienen respuestas de Naranjo y Karch independientes aunque compartan referencia; cambiar de contexto jamás sobreescribe otro; volver a un contexto devuelve sus respuestas exactas. Un sospechoso desmarcado deja de ser evaluable sin destruir sus borradores (historial en memoria del módulo) y no se restaura nada automáticamente; una referencia pendiente de reconciliación no se ofrece como opción evaluable.
8. La fila singular legacy `fhSeguimientoEaFarmacoRow` y su selector `fhSeguimientoEaFarmacoSospechoso` **permanecen ocultas**. El editor nuevo **solo lee `currentFollowupVisit.adverse_events[].suspect_ids`** y nunca `adverse_event.suspect_ids` ni `causality_by_suspect` como fuente: con sospechosos marcados por episodio, la máquina legacy sigue vacía mientras el editor sí los muestra.
9. Regresiones: `npm run -s verify:fast`, `tools/farmacia_ea_t01_check.mjs`, `tools/farmacia_ea_t01_browser_check.mjs` (su aserción de sección oculta sin sospechoso se actualiza al nuevo contrato **sin debilitar** los requisitos de independencia y no-duplicación), `tools/farmacia_ea_suspect_identity_browser_check.mjs`, los oráculos de las unidades previas (`ea-r1-revision2-amendment`, `causality-state-module`) y `verify:nexus` siguen pasando. Las capturas T01 versionadas no se tocan. Sin sessionStorage/localStorage/IndexedDB, sin metadatos de acto (`actId`, `evaluation_id`, `authorRef`, `authoredAt`, `attributionAssurance`, `provenance`), sin persistencia y sin reclamos de «guardado».

No se exige un texto literal distinto del vocabulario clínico aprobado («No evaluado», aviso de provisionalidad), ni un orden interno de almacenamiento, ni estados «completados» (su criterio clínico no está definido por contrato: quedan en «No evaluado/Borrador», C04).

## Fuera de alcance

- Reglas de estado visibles (provisionalidad fina, desmarcado con reconciliación, paciente y contradicción): unidad `causality-status-rules`. Guardias de no entrega y aviso de edición no guardada en exportaciones: unidad `causality-export-guards`.
- `scripts/farmacia_seguimiento_ea_causality_state.js` solo puede ajustarse si un defecto del editor lo exige sin cambiar su contrato; `scripts/farmacia_validacion_model.js` es READ-ONLY. Módulos F4.4, R1 fuera de C11, exportaciones, persistencia, capturas T01 versionadas, otras patologías y pantallas.
- «Causalidad final farmacéutica» conserva su comportamiento: elegirla no convierte en completadas las evaluaciones.

## Open questions

- «EA documentado» se implementa como episodio **incorporado con descripción** (invariante T01-B); un borrador sin incorporar no habilita el selector de sospechosos. Si la usuaria quiere que los borradores también ofrezcan episodio, decidirlo antes del train.
- Un sospechoso marcado cuya fuente dejó de ser verificable («Referencia pendiente de reconciliación») no se ofrece como opción evaluable en esta unidad (fail-closed); el tratamiento completo del historial y la reconciliación pertenece a `causality-status-rules`.
- Con «Sí» y EA pero sin sospechosos, la sección se muestra con explicación y cuestionarios visibles pero inactivos (fidelidad a «controles apropiadamente inactivos»); una lectura alternativa más severa ocultaría los cuestionarios hasta haber contexto completo. La aserción T01 actualizada acepta ambos, por lo que el writer puede elegir la variante más severa.
- La captura de borradores al desmarcar el sospechoso en edición es fail-closed del módulo (los borradores pasan al historial); la UX de reconciliación posterior no es de esta unidad.

## Trazabilidad

| Requisito | Testigo |
|---|---|
| 1 Selector de episodio real primero + solo sospechosos marcados de ese episodio, sin autoselección ni candidatos de otros EA | `causality-editor-ui-oracle` §sesión A (episodio A: Alfa+Beta; episodio B: solo Alfa; placeholder sin selección) |
| 2 Episodio antes de cuestionarios; sin episodios DEMO | `causality-editor-ui-oracle` §sesión A (orden DOM, opciones sin `DEMO-EP`) |
| 3 Estados «No»/«No consta»/0 EA/sin sospechosos: explicación en español y controles inactivos, sin DEMO | `causality-editor-ui-oracle` §sesión B |
| 4 DOS cuestionarios (10+7) y resumen una sola vez, sin duplicar en tarjetas | `causality-editor-ui-oracle` §composición |
| 5 Cálculo solo con el helper existente, presentado como provisional | `causality-editor-ui-oracle` §helper (compara con `FarmaciaValidationModel` en la propia página) |
| 6 «No evaluado» sin interacción; defaults y 0/«Dudosa» no acreditados | `causality-editor-ui-oracle` §sin interacción |
| 7 Captura/restauración exacta A/X, A/Y, B/X por método desde el módulo de estado; sin sobreescritura; desmarcado sin destrucción ni restauración | `causality-editor-ui-oracle` §contextos (snapshots exactos de los seis contextos) |
| 8 Legacy oculto; fuente exclusiva `adverse_events[].suspect_ids` | `causality-editor-ui-oracle` §legacy (legacy vacío mientras el editor muestra sospechosos) |
| 9 Regresiones T01 lógico/browser, identidad 02B, verify:fast, oráculos previos | `verify-nexus`, `ea-r1-revision2-amendment-oracle`, `causality-state-module-oracle` (perfil); suite focal del writer; regresasiones dentro del oráculo (seam, storage) |
| Visual: composición del editor en los tres estados | receta `metis/visual/causality-editor-ui/recipe.mjs` (3 disparos; criterios C1–C3) |

## Unidad

```metis-unit
{
  "schema": "metis.unit/v1",
  "unit": "causality-editor-ui",
  "riskClass": "complex",
  "uiImpact": "quality",
  "sizeClass": "M",
  "maxCorrections": 1,
  "allowedPaths": ["scripts/farmacia_seguimiento.js", "farmacia_seguimiento.html", "scripts/farmacia_seguimiento_ea_causality_state.js", "tools/farmacia_ea_t01_browser_check.mjs"],
  "doNotTouch": ["docs/metis/", "metis/"],
  "ports": [8931],
  "witness": [{"id": "causality-editor-ui-oracle", "cmd": ["node", "metis/oracles/causality-editor-ui.mjs"], "timeoutSec": 600, "mustFailAtBase": true}],
  "visualRecipe": "metis/visual/causality-editor-ui/recipe.mjs",
  "visual": {
    "cmd": ["node", "metis/visual/causality-editor-ui/recipe.mjs"],
    "timeoutSec": 300,
    "shots": ["causalidad-editor-contexto", "causalidad-editor-sin-sospechosos", "causalidad-editor-sin-episodios"],
    "unchanged": [],
    "criteria": [
      "C1: el editor muestra primero el selector de episodio real (ID + descripción) y después solo los sospechosos marcados expresamente en ese episodio, sin autoselección ni candidatos de otros EA",
      "C2: los estados sin episodios o sin sospechosos muestran una explicación en español con los selectores y cuestionarios inactivos, sin episodios DEMO",
      "C3: los DOS cuestionarios existentes (10+7 ítems) y el resumen aparecen una sola vez; sin interacción el resultado se presenta «No evaluado» y con respuestas como provisional"
    ]
  }
}
```
