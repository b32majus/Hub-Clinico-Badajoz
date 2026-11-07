# Adenda C1 · Libro Bridge 166 en transición mixta (29-10-2026)

**Decisión de producto (Sil, 29-10-2026):** se aprueba una **transición** en lugar de pasar todo el libro a 166 columnas de una vez. Esta adenda **modifica temporalmente** lo que dice C1 (`FH_BRIDGE_RAW_EA_0N_C1_FORMAT_CANDIDATE_20261025.md`, línea «Para Validación y Primera Visita, se preservan conceptualmente…»): todo el libro en 166 sigue siendo el **destino**, no el punto de partida. Issue: #867 · Epic: #860.

## Por qué
- C1 quiere el libro entero en 166 columnas, Validación y Primera Visita incluidas.
- Hoy solo Seguimiento exporta en 166 (C2b). Validación y Primera Visita exportan V2 de 152, y el core 166 exige `fh_act_id` y `fh_patient_ref` en **toda** fila, que esas pantallas no producen.
- Sin esta adenda no se puede producir un libro 166 completo y C3b (pegar → guardar → reabrir en Excel Windows → cargar desde Inicio) no puede cerrar el circuito.

## Regla de la transición
1. **Cabecera:** las hojas raw (`01_DERMA`, `03_DIGESTIVO`) llevan la cabecera de **166 columnas** (prefijo V2 de 152 intacto + 14 nuevas al final).
2. **Versión por fila, declarada:** cada fila se clasifica sólo por su `row_schema_version`/`event_schema_version` declarados:
   - `2.0.0-draft.1` → fila V2. Sus 14 columnas nuevas deben estar **vacías**; si alguna trae valor, se rechaza.
   - `2.1.0-draft.1` → fila tipada 166, validada por el core 166.
   - cualquier otra → rechazo.
3. **Un acto, una versión:** todas las filas de un mismo `source_event_id` comparten versión. Un acto mezclado, o el mismo acto presente en las dos versiones, se rechaza entero.
4. **Identidad:** cada fila 166 declara `patient_id` y `fh_patient_ref`. La correspondencia se **lee** de esas filas (no se infiere de CIP ni de `patient_id`) y debe ser 1↔1 en todo el libro; un `patient_id` con dos `fh_patient_ref`, o al revés, rechaza el libro.
5. **Camino antiguo (V1/`readPatientContext`):** sigue leyendo las filas V2 como hoy. Un Seguimiento 166 se proyecta a ese camino **solo** con lo que declara explícitamente (fecha, contexto, líneas y adherencia de sus `followup_line`), para que las pantallas aún no migradas no pierdan información. Los campos EA antiguos (`adverse_event_*`, `causality_assessments_json`) **no** se rellenan a partir de EA 166: en el camino antiguo ese acto queda «no registrado» en EA, nunca «sin EA».
6. **Camino nuevo (V2 `readAdverseEventEpisodes`):** sólo lee filas 166 (lector C3a). Un paciente sin filas 166 → `not_found` (ausente ≠ «sin EA»).
7. **Libros antiguos de 152:** siguen leyéndose por el camino legacy exactamente como hoy; no se reinterpretan como 166 ni se afirma EA 0..N.
8. Todo rechazo es cerrado: sin carga parcial del libro.

## Ampliación 31-10-2026 · Seguimiento 166 con la visita completa e identidad del libro
**Decisiones de producto (Sil, 31-10-2026).** Issue: #867.
1. **Una sola copia de Seguimiento.** «Copiar filas Excel FH» copia la visita completa en 166 (acto, líneas y EA 0..N). Se retiran de Seguimiento el CSV, la copia V2 de 152 («datos estructurados»), la copia Bridge raw suelta y la de 62 columnas. Validación y Primera Visita no cambian (152 hasta el camino B). La convivencia de esta adenda es la del **libro**, no la de los botones.
2. **Datos de la visita, una sola vez, en la fila `followup_act`:** `stratification_review_status`, `previous_stratification_level`, `new_stratification_level`, `stratification_change_reason`, `followup_proms_collection_status`, `visit_general_observations`, `proms_json` y `related_treatments_json`. `fh_act_id` agrupa las filas de la visita (fármacos y EA); ninguna otra fila repite estos campos. Un evento que los traiga para copiarlos a todas las filas se rechaza (`VISIT_FIELD_IN_EVENT`).
3. **Valores de PROMs del seguimiento** en `proms_json` de la fila del acto, con la forma de primera visita: array de `{ instrument: DLQI | EVA_DOLOR | EVA_PRURITO, value: número finito, … }`, sin instrumentos repetidos. El libro 166 es la fuente de verdad.
4. **Datos de cada línea** en su fila `followup_line`: dispensación, revisión específica, movimiento terapéutico (nueva dosis/pauta/vía, motivo, fecha), suspensión, observaciones de la línea y adherencia (`adherence_*`).
5. **Viajan todas las líneas revisadas en la visita**, cada una con su dispensación declarada (no solo las dispensadas).
6. **Ausente ≠ NO.** Un control con valor por defecto que el profesional no toca se guarda como no registrado (`not_recorded` / `no_change_recorded` / vacío); solo cuenta como «No» si lo marca.
7. **Identidad del acto desde el libro.** La identidad del paciente (`patient_id`, `fh_patient_ref`, `demo_flag`, `identifier_system`) se lee tal como la declara el libro; consultar no crea ni modifica nada. Sin `fh_patient_ref` declarado, o con datos contradictorios, la copia se bloquea con motivo. Solo el acto emite su identidad (`fh_act_id`, evento, visita) una vez, al abrirse. Los pacientes del registro demo siguen con su identidad declarada. La emisión del `fh_patient_ref` en el primer acto del paciente corresponde al camino B.

## Fin de la transición (camino B de C1)
Cuando Validación y Primera Visita exporten filas 166 con identidad de acto/paciente autorizada, el lector dejará de aceptar filas `2.0.0-draft.1` en un libro de cabecera 166 y se retirarán, en el mismo tramo, la proyección del punto 5 y el método antiguo `getAdverseEventsAndCausality`. Esta adenda se marcará entonces como superada.
