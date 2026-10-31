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

## Fin de la transición (camino B de C1)
Cuando Validación y Primera Visita exporten filas 166 con identidad de acto/paciente autorizada, el lector dejará de aceptar filas `2.0.0-draft.1` en un libro de cabecera 166 y se retirarán, en el mismo tramo, la proyección del punto 5 y el método antiguo `getAdverseEventsAndCausality`. Esta adenda se marcará entonces como superada.
