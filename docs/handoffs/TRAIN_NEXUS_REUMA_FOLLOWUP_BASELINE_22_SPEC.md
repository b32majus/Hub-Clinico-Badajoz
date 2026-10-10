# Train 22 — Seguimiento Reuma: identidad y tratamiento preexistente explícitos

**Estado:** SPEC ACCEPTED FOR LOCAL EXECUTION ONLY, desde decisión funcional publicada §3.2.15 del ledger + §3.9 de `docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`. No es aprobación de PR, merge ni piloto.

## Problem Statement

Una visita de Seguimiento puede ser la primera registrada en PROMueve para un paciente que ya estaba en tratamiento. Hoy el formulario contiene nombre, tratamiento actual y fecha de inicio como campos readonly y el recopilador de Seguimiento no incluye el tratamiento/fecha en su payload exportable. Si se registra como primera visita del historial, el timeline puede inferir falsamente un `treatment_start`.

## Solution

Con un **CIP explícito que el Read Port resuelve como `not_found`** y sin historial, permitir al profesional consignar nombre y apellidos, **tratamiento actual PREEXISTENTE** y su fecha de inicio real cuando la conozca. Usar los campos contractuales `Tratamiento_Actual` y `Fecha_Inicio_Tratamiento`, ya existentes en el formato de 497 columnas. Ausencia de valor o de fecha permanece vacía. El Seguimiento exporta el baseline sin clasificarlo como inicio, switch, add-on ni validación por Farmacia. Si es la primera visita registrada de tipo `seguimiento`, el timeline **no afirma inicio observado** solo por detectar tratamiento en esa fila. Sin embargo, no se ocultan inicios clínicos explícitos que sí tengan autoridad publicada.

## User Stories / aceptación observable y falsable

1. Como profesional, al abrir Seguimiento con CIP y `readPatientBundle.status=not_found` real, puedo editar nombre y apellidos, tratamiento que ya venía tomando y fecha explícita, sin afirmar que el Hub ha iniciado el tratamiento.
2. Como profesional, en un paciente **encontrado** con historial real veo los datos preexistentes y los controles continúan protegidos contra sobrescritura por la ruta de no encontrado.
3. Si la lectura devuelve `unavailable` o `error`, conservo feedback fail-closed; nunca se equipara un fallo de lectura con `not_found`, ni se rellena un paciente demo.
4. Si falta tratamiento o fecha, queda en blanco, sin selección de catálogo, duración, dosis, pauta ni fecha auto-completada; nombre tampoco se inventa.
5. Como profesional, al introducir manualmente baseline en un `not_found`, `HubTools.form.recopilarDatosFormularioSeguimiento()` entrega `nombrePaciente`, `tratamientoActual` y `fechaInicioTratamiento` explícitos. La salida TXT/CSV del acto de Seguimiento refleja esos datos con la proyección existente de 497 columnas, sin modificar orden, número o semántica de columnas.
6. Si edito nombre/tratamiento/fecha después de autorizar el TXT, el gate efímero exige confirmar de nuevo antes del CSV, según Train20/21.
7. Como lector del Dashboard longitudinal, una primera fila registrada `Tipo_Visita=seguimiento` y tratamiento preexistente **no** debe originar `treatment_start`, `treatment_change` o `ADD_ON` inventados. El tipo `primera` y eventos realmente explícitos mantienen su conducta publicada; no se elimina información clínica válida por regla genérica.
8. La copia manual TXT→CSV, Solicitud FH, lectores con paciente conocido y otras patologías mantienen su contrato; un nombre de fármaco no rellena datos terapéuticos.
9. La UI de Seguimiento demuestra edición real y accesibilidad de esos controles a 390 y 1280 px en el recorrido soportado, no mediante eliminación artificial de `readonly` desde las pruebas.

## Implementation Decisions — CLOSED (no redescubrir)

- La autoridad de `not_found / ok / unavailable / error` es el Read Port ya publicado; **solo el resultado real `not_found`** habilita la captura en el flujo con CIP consultado. No cambiar contrato del Read Port, su fallback mock ni inferir inexistencia por un error.
- Reutilizar los tres campos existentes del formulario y los campos contractuales de exportación. El baseline no es una solicitud nueva ni un `START`, `SWITCH`, `ADD_ON` o validación de Farmacia. `Fecha_Inicio_Tratamiento` es fecha de inicio histórica **aportada**; no es fecha de visita.
- Mantener `Tipo_Visita=seguimiento` de la proyección Visit Act → legacy 497. No añadir columna de baseline, flag persistido, evento nuevo ni base de datos. No cambiar el sobre `reuma-visit-act/v1`.
- El timeline puede cambiar **solo** para corregir la inferencia no fundada de `START` en el **primer registro histórico de tipo Seguimiento**. No reinterpretar decisiones clínicas históricas, visitas `primera` ni otros eventos sin prueba/autoridad; si resulta imposible distinguirlos con el tipo de visita publicado, **HUMAN STOP**.
- Ninguna lectura fallida autoriza a sustituir silenciosamente los datos de un paciente existente. No añadir guardado/reimportación automática, persistencia local ni ciclo de renovación; entrega actual por TXT/CSV es el límite del producto.
- No decidir el punto abierto OCT-OPEN-004 (primera dispensación de un add-on), ni la política de borrado legacy #621.

## Testing Decisions — reuse-first, evidencia por fase

- Contrato de Read Port (5 estados/recorridos existentes): `tools/reuma_seguimiento_read_browser_check.mjs` y `tools/reuma_seguimiento_read_migration_check.mjs`, fixture de `tools/fixtures/reuma_read/corpus_v1.json`. Ampliar sus testigos mínimos; no construir un nuevo harness de navegación.
- Captura y exportación: `tools/reuma_act_cutover_browser_check.mjs`, `tools/reuma_export_boundary_browser_check.mjs`; comprobar bytes del CSV 497 y TXT con valores explícitos. Reusar tests del gate de memoria solo si el nuevo payload afecta el gate, sin repetir sus 36 casos por cada ticket.
- Timeline: no existe oracle específico `detectTreatmentStart` en `tools`; añadir **un testigo independiente pequeño**, usando `HubTools.events.extractTreatmentEvents` y 2–3 visitas sintéticas con visita tipo `seguimiento`, `primera` y control de evento real, o extender test de evento existente si se descubre uno. Congelar RED antes del builder.
- Testigos negativos son esenciales: `not_found` ≠ `error/unavailable`; sin fecha explícita ≠ hoy; primera `seguimiento` ≠ START; primera `primera` positiva conserva conducta observada.
- Fase implementador: tests de seam focales; integración: ruta soportada + 497 + Dashboard timeline + regresiones de consumidores afectados; una revisión Standards + Spec; máximo dos correctores frescos con RED→GREEN solo de findings. `verify:nexus` como comprobación global única de integración/closeout cuando la combinación lo justifique.
- Gate 2 (representación de baseline frente a evento), Gate 3 (Read Port, exportación y timeline compartido), Gate 4 narrow (visibilidad/edición real de nuevos estados UI, 390/1280). No crear suites visuales masivas.

## Out of Scope / NO TOCA

Primera Visita como nuevo proceso terapéutico, solicitudes, validación FH, doses/vías/posología/duración, catálogo/autocompletado, nueva persistencia/cookies/sessionStorage/localStorage, marcadores legacy #621, 497/schema, snapshot de Cáceres, servidor local, Form Builder V5, BASFI, PCR por centro, LES/Sjögren no adjudicados, escalado multipatología, documentación viva INDEX/WOS/ledger, cambios en `main`, deploy/piloto.

## Further Notes / STOP

La pantalla sin parámetro de CIP (alta manual en blanco sin consulta) es un recorrido distinto; **no se afirma cubierto ni se habilita automáticamente como `not_found`**. La observación de una fila CSV no acredita persistencia/restauración hospitalaria. Tratar nuevos consumidores clínicos no previstos, dificultad para distinguir baseline vs evento, o necesidad de cambiar contrato de almacenamiento como HUMAN STOP para consulta humana, no inventar decisiones. Datos únicamente `SYN-*`.
