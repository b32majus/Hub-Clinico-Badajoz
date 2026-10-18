# WO FH EA T01 — preparación de entrega clínica limpia tras C-088/VIS-04

**Estado:** CANDIDATO LOCAL DE INTEGRACIÓN / QA SINTÉTICA VERIFICADA / CIERRE OPERADOR C-088 PENDIENTE / SIN PUBLICACIÓN NI PILOTO. **Fecha:** 2026-10-18.

## Objetivo y autoridades

Preparar, sin publicar, la entrega de la unidad T01 autorizada en [issue #795](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/795), excluyendo el overlay operativo experimental de Atenea C-088 y transportando la corrección focal VIS-04 aceptada por la responsable. La orden de cierre T01 **no** autoriza a inventar firma de operador, cierres `VERDICT`/`DONE`, inferir persistencia, ni a ejecutar el siguiente Train.

GitHub consultado: `promueve/nexus-v4@a48e05b190ebb9fc7c9836bc2d9a57f37f294fc3` (merge #797; FH-DEBT-005 publicada OPEN/P3); issue #795 OPEN y `status:approved`; PR clínica G0 #778 independiente. Origen candidato T01 experimental `4c0b58a758832c9e40e8f75643a55a60601bb081` (su preflight/overlay `1bde064...` no se transporta), VIS-04 aislada `88de94186144f47655ab201fcee538a69c5b5e7f`.

## Base, branch, reversión y límite

Worktree único nuevo: `/srv/kairos-lab/worktrees/promueve-nexus-fh-ea-t01-clean-delivery-20261018`; branch `work/fh-ea-t01-clean-delivery-20261018` creada desde el SHA canónico indicado, limpio en el momento de crearla. La reversión de un eventual commit se realizará solo por revert focal autorizado; no reset/clean/force-push ni borrar trabajos ajenos.

Archivos de producto permitidos: `farmacia_seguimiento.html`, `scripts/farmacia_seguimiento.js` (de T01 final + el diff exacto de VIS-04); `tools/farmacia_ea_t01_browser_check.mjs`, `tools/farmacia_ea_t01_check.mjs` (tests existentes); `artifacts/FH_EA_T01_producto_1440x900.png`, `artifacts/FH_EA_T01_producto_EA_recorte.png` (testigos reales regenerados). Documentación de preparación: únicamente esta WO. NO TOCA `.opencode/**`, plugins, `tools/atenea-*`, `tools/experiments/c088-*`, ledger/evidence `fheat01c088`, programas Reuma/Derma, Excel, API, otras ramas, `main`, PR #778, G0 aprobado ni datos clínicos reales.

## Decisiones cerradas y falsificadores

- `Sí / No / No consta`, 0/1/2/5 EA explícitos, descripción obligatoria **para incorporar**, IDs de episodio/observación estables en memoria, una fecha de acto solo si registrada por el profesional; no datos terapéuticos, autoría, metadatos F4.4, gravedad o causalidad inferidos.
- Ni sessionStorage/localStorage/IndexedDB ni ledger antiguo como almacén clínico de EA; sin entrega durable, restauración de actos, ni afirmaciones de `persisted`.
- Exportaciones singulares que no soportan 0..N deben negarse de modo visible y sin pérdida silenciosa. T02–T07 no se implementan aquí.
- Fidelidad maestro G0 v0.4 con VIS-04 cerrado localmente: Evolución y Gravedad paralelas a 1440 px y apiladas sin overflow a 600 px (unidad VIS-04 externa; QA visual independiente 19/19 en copia aislada).
- FH-DEBT-005 abierta y no bloqueante tras PR #797; no pulir estética aquí.

## Evidencia y QA de la reconstrucción local

Sobre este worktree: `node tools/farmacia_ea_t01_check.mjs` **69/69**; `PATH="<ubicación Playwright ya disponible>:$PATH" node tools/farmacia_ea_t01_browser_check.mjs` **17/17**, capturas reales regeneradas de producto a 1440x900/recorte; `node tools/farmacia_seguimiento_check.mjs` **153/153**; `node tools/farmacia_statistics_cohort_check.mjs` **30 escenarios**; `node tools/farmacia_act_payloads_check.mjs` **145/145**. Todos sintéticos, sin QA alojada ni piloto. VIS-04 responsive: 19/19 en QA aislada de corrección. `git diff --check` y exact-path gate para commit local.

## STOP, publicación y reconciliación

El ledger C-088 `fheat01c088` conserva 15 eventos, sus hallazgos originales y ausencia de `VERDICT`/`DONE`: dos correcciones gastadas y VIS-04 se cerró **fuera** de esa unidad, sin reabrir presupuesto. La prueba de operador firmada necesita entorno/clave externa; no firmar ni modificar ledger como modelo. **Estado C-088 = no completado.** La preparación de este candidato no acredita por sí sola revisión final independiente, firma de operador, piloto ni CI GitHub de T01.

Se autoriza commit **local de preparación** dentro de esta rama, pero **no push/PR/merge/deploy/cierre de issue #795** hasta nueva decisión y gates de publicación; separar una futura reconciliación `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` cuando cambie el estado publicado. No limpiar/editar el worktree del experimento ni VIS-04. El siguiente Train, aunque quede PREPARED, no se ejecutará ni inicializará ledger bajo este mandato.
