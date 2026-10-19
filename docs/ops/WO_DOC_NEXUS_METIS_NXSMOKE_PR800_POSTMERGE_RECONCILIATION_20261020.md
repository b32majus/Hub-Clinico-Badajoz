# WO documental — Nexus · Metis NX-SMOKE-INLINE-01 postmerge y cierre T01

**Fecha:** 2026-10-20. **WO aprobada:** [#803](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/803). **Estado factual:** T01, corrección de smoke y reconciliación T01 publicadas en GitHub; **estado de publicación de ESTA WO:** determinar exclusivamente mediante la PR asociada y la rama canónica, no por la presencia de este fichero.

## Objetivo / hechos autorizados

Registrar en las dos autoridades vivas `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` un cambio **no clínico** del smoke Farmacia y subsanar referencias administrativas desactualizadas tras los merges. No se añade funcionalidad ni se reescriben decisiones de producto.

| Entrega | Estado verificado |
| --- | --- |
| FH EA T01 | [PR #798](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/798) MERGED `eef1db81a939d0e9196a61917d14f6a194cdcfc9`; [issue #795](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/795) CLOSED/completed, 0..N nuevos EA en memoria, QA sintética y no piloto |
| Tooling NX-SMOKE-INLINE-01 | [PR #800](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/800) MERGED `13b72ae487f17fc62fe3ec713e9821d4d0f1e3e2`; [issue #799](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/799) CLOSED/completed. Sin producto clínico nuevo |
| Docs T01 | [PR #802](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/802) MERGED `7c6f95828a341763fac902f3ccf7cfdf397454ef`; [issue #801](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/801) CLOSED/completed |

### Metis: validez de la evidencia

- Congelado `metis-pilot-2@b152a71b6724cf60574501b5a0c53627c16005ac`; **no instalado en Nexus**, no se modifica Atenea.
- Run de la primera unidad `nx-smoke-inline-01-r1`: ticket sobre BASE `f6e3cb543491f33eb3ea0db1938099d3459df72c`; writer SHA `c7cfd8f0667fbc01ba7e20e34f824a970d506d57`, implementación al primer intento. Gate 5/5 testigo y smoke 49/49 PASS.
- Primera evaluación: **`INFRA_STOP`** por SHA mal copiado (39 caracteres), clasificado por revisión humana `unjustified` en `stops/STOP-1.json`. Pilot-2 `metis resume` continuó **sin repetir el writer** hasta evaluación PASS, accept PASS, package PASS y `run.json` PR_READY. No contabilizar como `pr_rate` sin intervención; conservar ambos eventos y métricas originales.
- Expediente en VPS **fuera del repo**: `/srv/kairos-lab/metis-runs/nexus/runs/nx-smoke-inline-01-r1/`. No incorporar logs, sesiones, claves ni datos reales al repositorio.
- Release smoke CI: push/PR #800 4/4 verde; postmerge [Nexus gates #39343008019](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/39343008019) y [Pages #39343007447](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/39343007447) SUCCESS.
- Docs T01 #802 CI 4/4 verde; postmerge [Nexus gates #39343658681](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/39343658681) y [Pages #39343658333](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/39343658333) SUCCESS.

## BASE, preflight, reversión

- Repo `b32majus/Hub-Clinico-Badajoz`; base exacta antes de esta WO `promueve/nexus-v4@7c6f95828a341763fac902f3ccf7cfdf397454ef`; verificar GitHub remoto, issue aprobada #803, worktree limpio y SHA antes de push y merge.
- Worktree independiente `/srv/kairos-lab/worktrees/promueve-nexus-metis-nxsmoke-doc-20261020`, rama `docs/nexus-metis-nxsmoke-postmerge-20261020`. No tocar `main`, ramas publicadas, sesiones ni worktrees ajenos.
- Reversión, si fuera necesaria: WO posterior y revert focal documental; no force-push, no clean/reset, no borrar ramas/worktrees ni modificar historia ajena.

## RUTAS, NO TOCA y criterios de aceptación

**Solo:** `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` y este documento.

INDEX y STATUS deben distinguir claramente entrega clínica T01 de corrección técnica Metis, rectificar cierre de #795/#801, preservar PR #778 OPEN y C-088 experimental sin VERDICT/DONE, y no etiquetar la demo como piloto. Evitar mostrar el HEAD de producto `eef1db81...` como HEAD absoluto actual del repo; el HEAD vivo se consulta en GitHub.

**NO TOCA:** código, HTML, JS, CSS, tests, `.github`, `package.json`, artefactos de producto, documentación histórica no viva, contratos, Atenea, Metis, run, ledger C-088, main, datos/secretos o infraestructura de despliegue.

**QA:** control de tres rutas, `git diff --check`, enlaces relativos de las filas alteradas resuelven, SHA/runs/issues verificados, no contradicciones entre INDEX y STATUS, CI PR documental 4/4 verde y postmerge GitHub verificado. No requiere QA navegador porque solo cambia documentación.

## Política de publicación y cierre

Autorizada publicación mediante push normal + PR sobre canónica, merge condicionado a CI y QA correctos; cierre de issue #803 solo tras verificar CI/Pages postmerge. Sin acciones destructivas. Un commit local no equivale a publicado. Registrar en reporte final los SHA, checks, issue y cualquier restricción restante. **No** afirmar aptitud para piloto clínico ni cerrar PR #778 o C-088.
