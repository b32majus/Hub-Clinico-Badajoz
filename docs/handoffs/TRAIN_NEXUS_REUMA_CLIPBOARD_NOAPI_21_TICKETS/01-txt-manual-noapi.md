# T21-01 — TXT manual sin Clipboard API

**Status:** READY_AFTER_FROZEN_RED. **Blocked by:** ninguno. **Spec:** ../TRAIN_NEXUS_REUMA_CLIPBOARD_NOAPI_21_SPEC.md

**WHAT:** mediante botón real `Exportar TXT` en Primera Visita y Seguimiento, la ausencia de `navigator.clipboard` o `writeText` debe abrir el modal TXT ya publicado con nota íntegra, sin autorización automática del CSV. Éxito real del botón `Copiar` o atestación existente autoriza en memoria; cierre, cancelación o fallo conserva bloqueo. No falsos éxitos de pegado en HCE.

**WHERE:** solo camino de copia de `modules/exportManager.js::exportarTXT` (aprox. línea 2110), sin tocar su generador, invalidaciones de intento o callbacks; reutilizar `HubTools.form.mostrarModalTexto` opt-in existente.

**REUSE:** `tools/reuma_txt_gate_memory_browser_check.mjs` D10, E1–E7, centinelas legacy y fixtures sintéticos; `tools/reuma_shared_modal_copy_truth_browser_check.mjs` C4/C5 para semántica de Copiar.

**CLOSED DECISIONS:** mismo fallback de rechazo de Clipboard API y mismo permiso efímero; modal-open ≠ copia, confirmación ≠ HCE; no modificar contrato clínico ni 497.

**NO TOCA:** `formController.js`, CSS, proyección, `copyTextWithFallback` CSV (T21-02), storage, datos clínicos, helpers nuevos si seam existente basta, INDEX/WOS/ledger.

**PROOF:** oráculo independiente congelado RED antes de builder prueba ausencia de API con Exportar TXT real, modal visible, cierre sin confirmar y CSV bloqueado; GREEN tras arreglo. Focal PV+Seguimiento de atestación explícita permitida y fail-closed; sin suite global por defecto. Mantener las aserciones negativas del oracle legado.

**STOP:** modificación de gate temporal, callbacks, persistencia o alcance clínico; requerir transporte nuevo o prueba no soportada. **REVERSIÓN:** `git revert` del commit propio, sin resets. **OUTPUT:** commit local T21-01 + evidencia y SHA; sin publicación.
