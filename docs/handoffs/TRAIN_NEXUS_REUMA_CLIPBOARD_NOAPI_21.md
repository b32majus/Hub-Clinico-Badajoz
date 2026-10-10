# TRAIN 21 — Reuma Clipboard API ausente: completar TXT→CSV manual

**Status:** READY_TO_LAUNCH / LOCAL ONLY. **2026-10-10**. Decisión de la operadora: preparar un train acotado de dos tickets para dejar Atenea trabajando, sin inflarlo artificialmente.

## Anchors / autoridad

- Repo `b32majus/Hub-Clinico-Badajoz`; `origin/promueve/nexus-v4@ae06dce5e94044772c14435d32af062d9ac9859e` (producto Train20 PR #630, docs PR #632 merged; issue #621 OPEN/DISCOVERY por datos legacy).
- Worktree aislado `/srv/kairos-lab/worktrees/promueve-nexus-reuma-clipboard-noapi-train21-20261010`, branch `work/nexus-reuma-clipboard-noapi-train21-20261010`. **HEAD de preparación**: padre del commit local con este handoff; comprobar antes de iniciar, no adivinar SHA.
- Leer autoridad repo en `AGENTS.md`, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, `docs/ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md`, `CODING_STANDARDS.md`, `docs/ATENEA_EXECUTION_ROUTING_V0.md` y solo las rutas funcionales de abajo. No copiar esas normas al prompt de los subagentes.
- Atenea canónico **`b32majus/Atenea/main@5accf4c1a408be88694d935f1f852c14c04b748a`**, PR #138 merged: `docs/START_HERE.md`, `docs/CURRENT_EXECUTION_DECISION_C087.md`, `docs/PRE_EXECUTION_HARDENING_V1.md`, `docs/QUALIFICATION.md` (nuevo aprendizaje Train20) leídos por Cora. **Ningún cambio** en agents, `opencode.json`, routing ni C-087; prevalece binding local versionado para ejecución.
- **Cost policy:** `standard`; **risk class:** `volume`; visible `atenea-volume` (MiMo 2.6 Flash), writer `atenea-implementer-volume` (DeepSeek V4 Flash), Standards `atenea-review-standards` Luna high, Spec `atenea-review-spec-volume` Luna high; correctores `atenea-corrector-volume` fresh como máximo dos. Modelos/bindings y permisos efectivos del worktree se comprueban en preflight. No silently switch to Go/Complex.
- **Spec aceptada** [TRAIN_NEXUS_REUMA_CLIPBOARD_NOAPI_21_SPEC.md](TRAIN_NEXUS_REUMA_CLIPBOARD_NOAPI_21_SPEC.md), `/to-spec` adaptado a preparación **sin publicar issues**. Tickets Matt `/to-tickets`, grafo lineal: [T21-01 TXT](TRAIN_NEXUS_REUMA_CLIPBOARD_NOAPI_21_TICKETS/01-txt-manual-noapi.md) → [T21-02 CSV/integración](TRAIN_NEXUS_REUMA_CLIPBOARD_NOAPI_21_TICKETS/02-csv-manual-noapi.md). Ejecutar `/implement-spec` para dos slices verticales en misma rama local de integración (no crear PRs ni worktrees sin razón, porque esta ejecución es aislada y secuencial).

## WHAT / resultado integrado

Cuando no existe `navigator.clipboard` **o `writeText`**, exportar TXT en Primera Visita/Seguimiento ofrece **el mismo modal manual de Train20** con cuatro acciones; abrir/cerrar o seleccionar sin copia/atestación no habilita CSV. Atestación explícita o copia real autoriza solamente visita/datos en memoria. Al pulsar exportar CSV, la API ausente debe mostrar el modal **CSV 497 completo** sin checklist de éxito automático; la ruta normal con API y los consumidores de Solicitud FH se conservan. No afirmar incorporación a HCE/PreSalud ni servidor hospitalario HTTP confirmado.

## WHERE / REUSE — seam map, NO rediscover

- `modules/exportManager.js::exportarTXT` (alrededor línea 2110): **API ausente** produce error síncrono en `navigator.clipboard.writeText`; reutilizar la rama `.catch` y el modal TXT opt-in. Protecciones de intento en vuelo y stale quedan intactas.
- `modules/exportManager.js::copyTextWithFallback` (aprox. línea 1546): ausencia de API actualmente rechaza sin abrir modal CSV; usar `openManualCopyModal` ya existente, sin cambiar texto fila ni semántica de resultados `false` del fallback.
- `entregarFilaProyectadaCSV` consumida por **dos** rutas de CSV: `exportarAct497` (Visit Act normal) y `exportarYCopiarCSV` (compatibilidad). No duplicar por pantallas. `modules/formController.js::mostrarModalTexto` es contrato publicado y **no se modifica**.
- REUSE FIRST: `tools/reuma_txt_gate_memory_browser_check.mjs` (D10 actualmente PASS porque falla cerrado; **no borrar la exigencia de bloqueo sin atestación**, ampliar solo la nueva capacidad), E1–E7 (modal/atestación); `tools/reuma_shared_modal_copy_truth_browser_check.mjs` C4/C5 (sin API en **modal abierto**), `tools/reuma_export_boundary_browser_check.mjs` (CSV manual 497), `tools/reuma_txt_gate_integrity_browser_check.mjs` (datos cambiados). Aprovechar fixtures SYN y helpers ya existentes; un pequeño cambio en oracle existente es preferible a generar uno nuevo.
- Siete HTML consumidores del token `exportManager.js`: `primera_visita.html`, `seguimiento.html`, `dashboard_paciente.html`, `estadisticas.html`, `reuma_index.html`, `manage_drugs.html`, `manage_professionals.html`. Actualizar **solo su token** cuando cambie el módulo. No tocar tokens ni estilos `formController.js`.

## CLOSED DECISIONS

1. TXT→CSV gate efímero Train20, no almacenamiento, autorización solo por clipboard real o **confirmación explícita**; cerrar/cancelar modal nunca autoriza.
2. CSV igual a `projectVisitAct497`: 497 campos y sin datos nuevos/inferidos. Fallback de CSV no implica portapapeles copiado; no checklist.
3. Modal FH/CSV mantiene dos acciones; modal TXT con cuatro y diseño responsive C2 publicado.
4. Sin Clipboard API, el profesional puede hacer copia/descarga manual y atestiguar; no se requiere prueba de pegado HCE.
5. `#621` se queda OPEN para legacy browser storage; no leer/migrar/borrar `HubClinico_TxtExportDone_*` ni `hubPendingRows`.
6. Si surge una cuestión nueva sobre concurrencia/temporización del gate, arquitectura o seguridad, no decidirla por analogía: HUMAN STOP.

## NO TOCA / conditional safeguards

NO cambios clínicos, nota TXT, projection 497, terapias, fórmulas, modelo/export payload, SQL/Excel/PreSalud, CSS, `formController.js`, storage, infraestructura, `main`, V5, `docs/INDEX.md`, WOS ni ledger. Semántica y testimonio de bfcache W22 se mantienen SKIP conocido, **no inventar restauración**.

**Conditional safeguards: Gate 3** (el helper CSV es compartido y tiene consumidores directos e indirectos); **Gate 4 narrow** solo si hay cambio visible/uso nuevo del modal por ruta sin API: comprobar que los controles existentes se ven y pulsables a 390/1280, sin rehacer el estudio de CSS ni campañas generales. No Gate 2 ni adversarial extra por ritual.

## PROOF por fase — proporcional y falsable

- **Pre-implementation**: aceptación independiente congelada **RED** sobre base sin API: `Exportar TXT` desde UI muestra modal (baseline carece) y `Exportar CSV` después de atestación muestra modal CSV (baseline carece). Preserve testigos existentes de fail-closed e igualdad, sin reemplazar por pruebas autorreferenciales.
- **T21-01**: focused RED→GREEN TXT en PV y Seguimiento, cerrar sin atestación bloquea, atestar después de copia manual permite; solo pruebas de su seam.
- **T21-02**: focused RED→GREEN CSV de ambas visitas, modalidad TXT confirmada, modal de 497 exacto, ningún checklist falso; modal unavailable falla veraz; smoke del helper y Solicitud FH si afecta.
- **Integración final**: journey soportado en Chromium 390 y 1280 (copia/atestación en modal real, botón CSV, ausencia de recorte/targets inaccesibles, sin DOM mutación engañosa). Preservar oracles de copia veraz, memory y boundary; ejecutar una batería seleccionada por impacto. `npm run verify:nexus` una vez en integración/closeout si riesgo compositivo lo justifica, no en cada ticket.
- **Revisión**: un candidato fijo → **una sola** revisión Standards + Spec independientes del implementador; máximo **dos** correcciones fresh por finding con RED→GREEN focal, sin re-review completa salvo fallo técnico de eje; HUMAN STOP si hay nueva decisión/scope o presupuesto agotado.
- **Cora** auditará candidato Gate 3/4 cuando corresponda, tras closeout local. No considerar PASS de tests como QA de URL hospedada ni autorización de piloto.

## Preflight del entorno real y reversión

- OpenCode v2.0.26; Node efectivo v24.15.0 frente a `package.json.engines >=20 <21`: **desviación conocida**, no "arreglada" ni prohibido ejecutar tests focales en Node24; CI Node20 posterior confirmará paridad al publicar. `ajv@8.20.0` preparado en worktree vía `npm ci --offline --ignore-scripts`, gitignored; el browser harness recupera Playwright de caché npx y Chromium de `~/.cache/ms-playwright`. Verificar disponibilidad en el preflight sin descargar infraestructura nueva.
- Inicio con HEAD exacto de preparación, rama correcta, árbol limpio, `origin/promueve/nexus-v4` sin drift, acceso real a modelos/roles, tests elegidos ejecutables.
- Un commit atómico por T21-01/T21-02 más RED witness cuando haga falta. `git revert` solo si autorizado, **no** `reset --hard`, `git clean`, force-push, borrar worktrees/branches ni storage clínico.

## OUTPUT / límite autorizado

Un único closeout con fixed HEAD, commits, rutas y diff, pruebas RED→GREEN realmente ejecutadas, regresiones justificadas/omitidas, review Standards/Spec y presupuesto restante, Node deviation, trabajo no demostrado, privacidad residual, **worktree limpio**. **LOCAL ONLY**: no push, WO/issue/label changes, PR, merge, release ni deploy; publicación posterior requiere issue `status:approved` específico y autorización humana. STOP tras closeout, sin nuevo proceso TUI/headless ni creación de launchers.
