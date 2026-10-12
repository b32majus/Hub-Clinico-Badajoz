# WO-DOC-NEXUS-F45-PR747-POSTMERGE-RECONCILIATION — 2026-10-13

**Estado:** documental, preparada en rama aislada; no equivale a publicación canónica ni a cierre de #671.

## Objetivo y autoridad

Reconciliar exclusivamente el estado vivo de F4.5 **después** del merge verificado de la [PR #747](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/747), sin reabrir decisiones clínicas ni crear funciones. Q-1..Q-4 y el DTO limitado `export_v2_tabular` + `manual_copy` están publicados; el mapeo clínico F4.4→Export V2 **sigue pendiente**, igual que codec L2, rutas persistentes y pilotos.

## Base, preflight y trazabilidad

- Repositorio: `b32majus/Hub-Clinico-Badajoz`. Base canónica y HEAD esperado antes de crear la rama: `promueve/nexus-v4@12faadd1df56160b7a8e28c93be9676bba62a2fc`.
- [PR #744](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/744): MERGED `a0556d6ef674c85ecae21308ec06fd6f9f920c85`; [PR #747](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/747): MERGED `12faadd1...`, cuatro checks SUCCESS antes de fusionar.
- [#671](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/671): OPEN, `status:approved` **solo para el contrato documental histórico**. [#721](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/721): OPEN sin `status:approved`, no autorizado ni implementado.
- Fuentes leídas: `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, contrato F4.5 publicado y WOs de #671; GitHub live prevalece sobre estados locales históricos.

## RUTAS y NO TOCA

- `docs/INDEX.md`: reentrada F4.5 y matriz, estado de publicación exacto.
- `docs/ops/WORK_ORDER_STATUS.md`: fotografía canónica actual, manteniendo las WOs anteriores como histórico.
- `docs/contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md`: quitar exclusivamente afirmaciones vivas de “local/pendiente de publicación” que quedaron caducadas; no cambiar DTO, campos, errores, Q-1..Q-4 ni oráculos.
- Esta WO documental: trazabilidad y política de publicación.
- **NO TOCA:** `main`, otros worktrees/ramas, código F4.4, Export V2, navegador, interfaz, catálogos, Excel/Office Script/Bridge, mappings clínicos, runtime, backend, datos reales, credenciales, `#721`, estados/labels de issues, L2, routing #577 ni pruebas ajenas.

## Seguridad, QA y aceptación

- No inferir dosis, pauta, vía, presentación, validación, renovación, switch ni dispensación; ausencias siguen ausencias. `prepared_for_transfer` no significa `persisted` o registro SES/JARA.
- QA focal: cuatro Markdown exactos, enlaces relativos existentes, estado de PR #744/#747, `#671` OPEN y `#721` sin aprobación, Q-1..Q-4 intactas, **18 oráculos O-01..O-18 textualmente idénticos** al contrato anterior, `git diff --check` y CI documental posterior a la PR. **Sin QA navegador/Excel ni tests clínicos runtime**.
- Aceptación: estado reconciliado sin proclamar mapeo implementado o pilotaje; branch aislada con commit y ningún archivo distinto.

## REVERSIÓN / autorización / OUTPUT

- Reversión eventual mediante revert focal de un merge previamente autorizado; nunca force-push, reset destructivo ni borrar trabajo ajeno.
- Esta WO conserva la autorización de **preparar documentación usando GitHub**. Apertura de PR/merge exige su propia autorización y un issue del alcance documental con `status:approved`; no reutilizar #671/#745, que tienen alcance diferente.
- **OUTPUT:** rama y commit focal, resultados de QA, rutas modificadas y diferencias entre `published contract`, `pending mapping` y `pilot not qualified`. Documentación histórica no se reescribe retroactivamente.
