# T22-02 — Captura explícita de tratamiento preexistente y fecha en Seguimiento

**Bloqueado por:** T22-01 GREEN. **Spec:** ../TRAIN_NEXUS_REUMA_FOLLOWUP_BASELINE_22_SPEC.md.

**WHAT:** En la misma visita inicial `not_found`, habilitar entrada de Tratamiento Actual **preexistente** y Fecha Inicio Tratamiento solo cuando el profesional los conozca. Mantener ambos opcionales/desconocidos vacíos. Recopilar y exportar los valores explícitos en TXT y en sus columnas ya existentes del CSV 497 sin cambio de contrato; no crear `START/SWITCH/ADD_ON` ni validar terapias por efecto de rellenar campos.

**WHERE:** `seguimiento.html#tratamientoActual,#fechaInicioTratamiento`; `scripts/script_seguimiento.js`; `modules/formController.js::recopilarDatosFormularioSeguimiento`, `prefillSeguimientoForm` solo por compatibilidad. Los mappers publicados `modules/reuma_act_contract.js`, `modules/reuma_legacy_export_adapter.js`, `modules/exportManager.js` son **consumidores a comprobar**, no rutas para refactor.

**REUSE:** `reuma_seguimiento_read_browser_check.mjs` (reentradas), `reuma_act_cutover_browser_check.mjs` (acto Reuma soportado), `reuma_export_boundary_browser_check.mjs` y gate `reuma_txt_gate_memory_browser_check.mjs` si se justifica por nuevo payload.

**CLOSED DECISIONS:** campo de fecha histórica NO se autocompleta con fecha de visita/actual ni por medicamento; nombre/tratamiento faltantes vacíos; ausencia de visita previa no constituye validación. `Tipo_Visita=seguimiento`, CSV 497 inalterado.

**NO TOCA:** generar evento terapéutico nuevo, catálogo, presentación/dosis/pauta, nuevas columnas o storage, cambio de decisiones clínicas, solicitud FH, arquitectura futura.

**PROOF:** RED→GREEN focal de entrada manual, ausencia, valores exactos devueltos por `recopilarDatosFormularioSeguimiento`, TXT/CSV 497 y gate invalidado tras editar. Negativos para paciente encontrado, `error/unavailable`; un solo recorrido de integración PV/Seguimiento si el seam compartido se modifica. **HUMAN STOP** si se requiere nueva persistencia/export schema o si aparece inferencia terapéutica.

**REVERSIÓN/OUTPUT:** `git revert` autorizado; commit local T22-02, tests focales y SHA, sin publicación.
