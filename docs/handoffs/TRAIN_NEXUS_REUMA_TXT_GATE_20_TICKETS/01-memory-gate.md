# T20-01 — Puerta TXT→CSV efímera, camino automático

**Status:** READY_FOR_AGENT / LOCAL ONLY. **Blocked by:** ninguno. **Contexto:** #621; spec `docs/handoffs/TRAIN_NEXUS_REUMA_TXT_GATE_20_SPEC.md`.

**WHAT:** Primera Visita y Seguimiento: CSV bloqueado antes de TXT; una copia TXT automática **realmente confirmada** habilita 497 para los mismos datos exportables durante esa instancia de visita. No se lee/escribe/borra el antiguo `sessionStorage`, ni `hubPendingRows`. Si falla portapapeles, NO habilitar CSV; la vía manual la completa T20-02.

**WHERE/REUSE:** `modules/exportManager.js` productor `exportarTXT`, consumidores `exportarYCopiarCSV` y `exportarAct497`; llamadas públicas desde `script_primera_visita.js` / `script_seguimiento.js`. Reutilizar `projectVisitAct497` y transporte formal sin cambiarlos. Estado privado del módulo, una autorización activa, snapshot de datos exportables derivado de los datos recopilados por formularios, sin Web Storage. Los detalles de reentrada y aviso por edición se cierran en T20-03; **nunca autorizar payload distinto incluso transitoriamente**.

**Acceptance/PROOF:** oracle RED independiente sobre baseline: marcador antiguo podría autorizar sin TXT actual; luego GREEN de control soportado TXT→CSV PV+Seguimiento; clipboard resolve habilita, reject/throw sin permiso; copiar fila 497 byte-identical; old `HubClinico_TxtExportDone_*` / `hubPendingRows` centinelas sin leer, cambiar ni borrar; contextos vacíos fail-closed; ausencia total de nueva escritura de clínicos al Web Storage. Red congelado antes de conceder escritura al builder; no prueba acoplada a método privado.

**RUTAS:** `modules/exportManager.js`, nuevo oracle `tools/reuma_txt_gate_memory_browser_check.mjs` y checker determinista si necesario. **NO TOCA:** HTML, `formController.js`, farmacia, Visit Act, TXT content, 497, marker antiguo, módulos ajenos.

**PREFLIGHT:** base/handoff correctos, worktree limpio, agente y permisos verificados; oracle autor separado de builder. **STOP:** no se puede comparar payload sin ignorar campos clínicos, cambio terapéutico necesario, nueva arquitectura o cirugía del exportador. **REVERSIÓN:** `git revert` del commit local; sin reset/clean. **OUTPUT:** un commit local T20-01, RED→GREEN focalizado, SHA y lista de rutas; no push/PR/merge/issue.
