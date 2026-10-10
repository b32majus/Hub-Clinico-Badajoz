# T21-02 — CSV manual sin Clipboard API; integración TXT→CSV

**Status:** READY_AFTER_T21-01. **Blocked by:** T21-01 completo. **Spec:** ../TRAIN_NEXUS_REUMA_CLIPBOARD_NOAPI_21_SPEC.md

**WHAT:** con TXT previamente confirmado y API ausente, el botón **Exportar CSV** abre el modal manual mostrando **la fila exacta de 497 campos**. No muestra checklist/toast de copia automática exitosa. Si no hay modal, fallo veraz. Repetir en Primera Visita y Seguimiento.

**WHERE:** `modules/exportManager.js::copyTextWithFallback` y `entregarFilaProyectadaCSV`; preferir cambio solo en control de fallback con API ausente. `exportarAct497` y `exportarYCopiarCSV` comparten transporte; NO modificar validación ni proyección.

**REUSE:** `tools/reuma_export_boundary_browser_check.mjs`, `tools/reuma_txt_gate_memory_browser_check.mjs` (TXT autorizado) y `tools/reuma_shared_modal_copy_truth_browser_check.mjs` (CSV manual/Solicitud FH). Reutilizar fixtures/helpers y añadir solo el testigo material de CSV con API ausente. No crear oracle masivo nuevo.

**CLOSED DECISIONS:** CSV bloqueado si TXT no confirmado; manual CSV no acredita pegado del TXT en HCE; contenido 497 y orden intactos, estado del gate inalterado.

**NO TOCA:** `formController.js`, CSS, TXT clínico, `projectVisitAct497`, adapter 497, terapias, marcadores legacy, Web Storage, Farmacia, backend y docs vivos.

**PROOF:** RED→GREEN de aceptación independiente: misma visita sin API, TXT atestiguado, clic CSV real, modal CSV con fila byte-identical 497, sin checklist falso; negativos sin atestación y modal inexistente. Smoke PV+Seguimiento y FH si helper compartido se ve afectado. Cache bump justificado del `exportManager.js` en siete HTML consumidores; no tocar otros tokens. `node --check`, `git diff --check`; regresión focal y suite integrada solo al final. Una única revisión canónica Standards + Spec sobre candidato fijo.

**STOP:** cambios de gate, texto clínico, CSV 497, estilo global, nuevas rutas/consumidores o semánticas no autorizadas. **REVERSIÓN:** `git revert` local. **OUTPUT:** commit local T21-02 y closeout GO/NO-GO; sin push/PR/merge/issue.
