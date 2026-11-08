# Farmacia Hospitalaria — Filtros de cohorte de Estadísticas (contrato funcional)

**Estado: DECISIÓN FUNCIONAL APROBADA POR SIL (08-11-2026) · SOLO CONTRATO · SIN IMPLEMENTACIÓN · NO PILOTO.** Issues [#684](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/684), [#687](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/687), [#688](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/688), [#689](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/689), [#690](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/690) y [#691](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/691) (epic [#861](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/861)). Este documento no escribe código, no cambia el CSV de 37 columnas y no acredita piloto.

Referencias: [exportación analítica longitudinal](FARMACIA_ANALYTICAL_LONGITUDINAL_EXPORT_V1.md), `docs/ops/PROMUEVE_CANDIDATE_TICKETS_20261011.md` §3, `docs/DECISIONES.md`.

## 1. Reglas comunes a todos los filtros

- Los filtros **seleccionan pacientes**, no episodios. Hay una sola cohorte actual (`currentCohort`) compartida por los indicadores, la tabla y el CSV.
- Varios filtros se combinan con **AND**. Cero resultados es un resultado válido y se muestra como tal.
- **Desconocido no es negación ni cero.** Un dato ausente se queda como «no registrado» y no cumple ni incumple el filtro por inferencia.
- No se infiere nada del nombre del fármaco: ni dosis, ni vía, ni pauta, ni fin de línea. Una línea histórica no pasa a activa por su nombre.
- Si falta la fuente de un dato, se registra como dependencia del equipo de FH (`SOURCE_OR_TEAM`); no se crea un filtro falso.
- **CSV de 37 columnas intocable** mientras G3 siga abierto (`docs/PREGUNTAS_ABIERTAS.md`): los filtros nuevos no añaden columnas; el CSV sigue siendo la cohorte filtrada.
- Una semántica por unidad: cada filtro declara si opera sobre la línea o sobre el paciente.
- Los valores de los ejemplos (dosis, vías, pautas, fechas, pacientes) son **sintéticos e ilustrativos**: no son catálogo ni valores autorizados.
- Coincidencia de **dosis, vía y pauta: dentro de la misma línea** (si se filtran dos de ellas, ambas deben cumplirse en la misma línea) y por **igualdad exacta de texto**.

## 2. VAL — Validación explícita (#684)

**Qué pide.** Distinguir el evento histórico, el estado actual, el resultado ausente, el denegado y el confirmado. El filtro no equipara nunca tratamiento solicitado con tratamiento validado.

**Fuente del dato.** `latest_validation.validation_result`, con valores `validated`, `denied`, `pending` y `not_recorded`. Existen además `latest_request.*` y `validated_*`, que informan pero no sustituyen al resultado de validación.

**Regla fijada.** «Validación explícita» es `validation_result = validated` en la última validación del paciente. El filtro de «estado» actual (`care_status`) devuelve «seguimiento» cuando hay seguimiento y así oculta el resultado de validación: debe dejar de ocultarlo. **Implementado en #684** con un filtro propio «Validación» (`qf-validacion`, `Cohort.validationFilterOptions` / `Cohort.validationMatches`), independiente de `care_status`; «Estado seguimiento» no cambia. Check: `tools/farmacia_statistics_validation_filter_check.js`. Check cercano: `tools/farmacia_pv001_requested_not_validated_check.mjs`.

**No fijado.** No se declara dependencia abierta del equipo de FH para este filtro. Lo pendiente es corregir en la implementación la ocultación del resultado por `care_status`.

**Casos sintéticos.** Cohorte: pacientes con validación explícita.

| Caso | Datos | ¿Entra en la cohorte? |
| --- | --- | --- |
| Paciente A | Última validación `validated` | Sí |
| Paciente B | Medicamento solicitado en `latest_request.*` y última validación `pending` | No; solicitado no es validado |
| Paciente C | Última validación `denied` | No; el denegado es un estado propio, distinto del ausente |
| Paciente D | Sin validación registrada (`not_recorded`) | No; queda como «no registrado», no se cuenta como denegado |

## 3. DOSE — Dosis y presentación por línea (#687)

**Qué pide.** Filtrar por texto de dosis, unidad, presentación seleccionada y fuente, dentro de una misma línea y admitiendo pacientes con líneas múltiples. La ausencia de dosis no se infiere del medicamento.

**Fuente del dato.** `line_dose_text` y `line_presentation` por línea (`lines[]`, `treatment_lines_json`). Existen además `new_dose_text` (movimientos), `requested_dose_text` y `validated_dose_text`. La dosis es texto libre.

**Regla fijada.** Igualdad exacta de texto, misma línea. Regla de fuente (DECISIONES 07-11, C2): `line_*` es la foto de la línea al empezar el acto, `new_*` es el cambio, y la línea vigente toma la dosis de `new_*`. Los agregados `*_values` a nivel de paciente pierden el vínculo con la línea: el filtro no debe usarlos para cruzar líneas.

**No fijado.** No consta un campo «unidad» separado (no verificado). Hasta que el equipo de FH lo confirme, la unidad forma parte del texto libre de la dosis.

**Casos sintéticos.**

| Caso | Datos | ¿Entra en la cohorte? |
| --- | --- | --- |
| Paciente A | Una línea con `line_dose_text` «5 mg/kg». Filtro «5 mg/kg» | Sí |
| Paciente B | Dos líneas, «5 mg/kg» y «10 mg/kg». Filtro «5.0 mg/kg» | No; igualdad exacta, un texto parecido no equivale |
| Paciente C | Una línea con `line_dose_text` «5 mg/kg» y un movimiento posterior con `new_dose_text` «10 mg/kg». Filtro «10 mg/kg» sobre la línea vigente | Sí; la línea vigente toma la dosis de `new_*` |
| Paciente D | «5 mg/kg» aparece solo en el agregado `*_values` del paciente y en ninguna línea. Filtro «5 mg/kg» | No; el filtro no usa agregados para cruzar líneas |
| Paciente E | Medicamento conocido con dosis y presentación en blanco. Filtro «5 mg/kg» | No; queda como «no registrado» y no se deduce del fármaco |

## 4. ROUTE — Vía documentada (#688)

**Qué pide.** Filtrar por vía con etiquetas y códigos autorizados, admitiendo líneas múltiples y valores desconocidos, y poder mostrar una muestra con medicamento conocido y vía ausente.

**Fuente del dato.** `line_route`, `new_route`, `requested_route` y `validated_route` (texto).

**Regla fijada.** Igualdad exacta, misma línea. La vía de una línea nunca cambia (DECISIONES 07-11).

**No fijado.** La lista de etiquetas y códigos autorizados la debe aportar el equipo de FH. Hasta entonces, el filtro usa solo los valores presentes en los datos.

**Casos sintéticos.**

| Caso | Datos | ¿Entra en la cohorte? |
| --- | --- | --- |
| Paciente A | Una línea con `line_route` «IV». Filtro «IV» | Sí |
| Paciente B | Una línea con `line_route` «Intravenosa». Filtro «IV» | No; igualdad exacta, sin equivalencias mientras FH no aporte la lista autorizada |
| Paciente C | Dos líneas, una «IV» y otra «oral». Filtro «IV» | Sí; la coincidencia se produce en la línea «IV» |
| Paciente D | Medicamento conocido con `line_route` en blanco. Filtro «IV» | No; es la muestra pedida: medicamento conocido con vía ausente, queda como «no registrado» |

## 5. SCHED — Pauta y frecuencia (#689)

**Qué pide.** Distinguir código, etiqueta, intervalo y pauta libre, así como el cambio temporal, las líneas múltiples y los desconocidos, sin derivar la frecuencia del nombre del medicamento.

**Fuente del dato.** `line_schedule_code`, `line_schedule_label` y `line_schedule_other_text`, y para los cambios `new_schedule_code`, `new_schedule_label` y `new_schedule_other_text`. «Intervalo» no consta como campo (no verificado).

**Regla fijada.** La pauta «otro texto» cuenta como pauta libre, distinta del código y de la etiqueta, y no se mezcla con ellas. Hoy se funde con la etiqueta, lo que borra la distinción: hallazgo para la futura implementación. Igualdad exacta, misma línea.

**No fijado.** La lista de códigos válidos la debe aportar el equipo de FH. Queda sin fijar la pauta actual frente al cambio temporal (`new_*` de optimización).

**Casos sintéticos.**

| Caso | Datos | ¿Entra en la cohorte? |
| --- | --- | --- |
| Paciente A | Una línea con `line_schedule_code` «Q14D». Filtro «Q14D» | Sí |
| Paciente B | Una línea con `line_schedule_label` «cada dos semanas» y sin código. Filtro «Q14D» | No; la etiqueta no se equipara al código por inferencia |
| Paciente C | Una línea con `line_schedule_other_text` «a las 8 h si tiene fiebre». Filtro ese texto libre | Sí; cuenta como pauta libre, no mezclada con código ni etiqueta |
| Paciente D | Una línea con código «Q14D» y un movimiento con `new_schedule_code` «Q7D». Filtro «Q7D» | No fijado: depende de si el filtro lee la pauta actual o la histórica (dependencia del equipo de FH) |
| Paciente E | Una línea sin código, sin etiqueta y sin otro texto. Filtro «Q14D» | No; queda como «no registrado» |

## 6. TIME — Ventana temporal (#690)

**Qué pide.** Usar la fecha del evento clínico frente a la de captura o importación, con límites inclusivos y zona horaria si aplica, manejando fechas ausentes y concurrencia, y sustentar pruebas positivo, negativo y vacío.

**Fuente del dato.** `visit_date`, `first_visit_date`, `request_date` y `movement_effective_date`. En el CSV: `latest_event_date`, `first_visit_date` y `latest_followup_date`.

**Regla fijada.** Se usa la fecha clínica del evento, con límites inclusivos. Nunca la fecha de importación (`imported_at`) ni la de captura. `occurred_at` queda fuera como fallback de fecha clínica. Un paciente entra en la cohorte si tiene algún evento dentro de la ventana.

**No fijado.** El formato y la zona horaria de las fechas (no verificado). La semántica de los pacientes sin fecha: se tratan como «no registrado» y no entran.

**Casos sintéticos.** Ventana: 01-01-2026 a 31-03-2026.

| Caso | Datos | ¿Entra en la cohorte? |
| --- | --- | --- |
| Paciente A | Evento con `movement_effective_date` el 15-01-2026 | Sí |
| Paciente B | Único evento con `visit_date` el 01-01-2026 | Sí; los límites son inclusivos |
| Paciente C | Evento clínico el 20-04-2026, importado dentro de la ventana | No; la fecha de importación nunca cuenta |
| Paciente D | Acto sin fecha clínica y con `occurred_at` dentro de la ventana | No; `occurred_at` no sustituye a la fecha clínica y queda como «no registrado» |

## 7. CONCUR — Líneas concurrentes (#691)

**Qué pide.** Vigencia de cada línea en un punto de evaluación, con eventos que abren y cierran líneas, desconocidos y negativos, y distinción entre cambio frente a adición. No se cuentan líneas históricas como activas ni se deduce el cierre de una línea por aparecer un nombre nuevo.

**Fuente del dato.** `active_at_event` (true: activa, false: inactiva, null: no registrada), `line_status_at_event`, `line_role`, `is_primary_line`, `active_line_count` (CSV), `suspension_effective_date` y `movement_effective_date`.

**Regla fijada.** Solo cuentan las líneas con actividad declarada. Sin fecha de fin explícita la línea es «desconocida» y su cierre no se deduce. «Otros fármacos activos» son líneas propias: cuentan Concomitante y Tratamiento activo previo; no cuentan biológico previo ni exposición, que van a `related_treatments_json` (DECISIONES 07-11).

**No fijado.** Cambio terapéutico frente a adición: solo lo documentará el equipo de FH (dependencia registrada). No consta una fecha de fin de línea explícita (no verificado).

**Casos sintéticos.** Cohorte: pacientes con al menos dos líneas activas en el punto de evaluación.

| Caso | Datos | ¿Entra en la cohorte? |
| --- | --- | --- |
| Paciente A | Dos líneas con `active_at_event` true, una primaria y una concomitante | Sí |
| Paciente B | Una línea con `active_at_event` true y otra con false | No; la línea inactiva no cuenta |
| Paciente C | Una línea activa y un biológico previo registrado en `related_treatments_json` | No; la exposición previa no es una línea concurrente propia |
| Paciente D | Una línea activa y otra con `active_at_event` null sin fecha de fin, con un fármaco nuevo en el acto siguiente | No; la línea sin registro es «desconocida» y su cierre no se deduce del nombre nuevo |

## 8. Frontera con contratos publicados

- El **CSV de Estadísticas de 37 columnas es intocable** mientras G3 siga abierto: cualquier columna nueva obliga a actualizar los 4 checks existentes.
- Los filtros **seleccionan pacientes**; el futuro CSV longitudinal incluirá **todos los actos** de los pacientes seleccionados, según el contrato de exportación analítica longitudinal enlazado arriba.
- **No se inventan dosis, vía, pauta, fecha ni validación** en ninguna sección de este contrato.
- Checks existentes que este contrato nombra: `tools/farmacia_statistics_cohort_check.mjs`, `tools/farmacia_statistics_cutover_browser_check.mjs`, `tools/farmacia_statistics_extra_filters_browser_check.mjs` y `tools/farmacia_statistics_principio_activo_filter_browser_check.mjs`.
- **No existe hoy** ningún check de dosis, vía, pauta, ventana temporal ni concurrencia: la futura implementación los exigirá.
