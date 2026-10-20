# WO documental — Nexus · Metis NX-READINESS-DUP-03 postmerge

**Fecha:** 2026-10-20. **WO aprobada:** [#811](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/811). **Estado de publicación de esta WO:** verificar PR documental GitHub, no inferir por su presencia local. **Sin cambios clínicos ni piloto.**

## Objetivo y evidencias verificadas

Reconciliar `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` tras publicar la corrección del readiness builder. No alterar producto ni arnés. El guard de `tools/deployment_readiness_build.mjs` falla con exit 1 y sin output cuando `manifest.modules` contiene IDs repetidos, incluidos duplicados idénticos o rutas contradictorias. Conserva el golden, orden, contrato CLI y diagnósticos previos.

| Referencia | Estado |
| --- | --- |
| Base canónica inicial | `promueve/nexus-v4@47cd3ddd4f8e6a32fde38132d5c1f7da376f44a1` |
| Commit preparación | `a0596158816d802fb07f1bbf36ca036e8e5302f0`, contrato + testigo |
| Commit implementación | `47a9dd31b13812ef9706e4cfd39d3d128652945d`, un único builder modificado |
| Publicación técnica | [Issue #809](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/809) CLOSED/completed; [PR #810](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/810) MERGED `270cdcec788ec4d678600d6a0d95096bbc2b6bf7` |
| CI postmerge | [Nexus gates #39402235182](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/39402235182) y [Pages #39402234340](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/39402234340), SUCCESS en SHA del merge |

**QA:** BASE 5 PASS/3 FAIL esperados, candidato testigo 8/8 PASS; readiness 10/10 PASS; validación independiente en `git archive` sintético: `nexus_home_check` 11/11, `home_release_check` 15/15, `verify:fast` PASS y `git diff --check` PASS. La máquina de QA usó Node 26.7 pese a que el proyecto declara Node 20.x; GitHub CI terminó verde. Sin QA manual de navegador por ser cambio exclusivamente de tooling.

## Calibración comparada Metis C-091 (3 tickets Nexus)

Metis pilot-2 congelado `b152a71b6724cf60574501b5a0c53627c16005ac`, externo a Nexus. Claude emitió `CALIBRATION_GO` previo para esta tercera unidad. `nx-readiness-dup-03-r1` terminó `PR_READY` al primer lanzamiento, 1 writer, gate PASS, 1 evaluador independiente PASS sin findings, accept/package PASS, **0 correcciones y 0 resume**, duración total 104,447 segundos.

| Ticket | Resultado final | Autónomo desde el primer lanzamiento |
| --- | --- | --- |
| NX-SMOKE-INLINE-01 / [PR #800](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/800) | PASS, sin correcciones writer | No: `INFRA_STOP` por SHA de evaluación erróneo, `resume` después del STOP |
| NX-DEPLOY-PATH-02 / [PR #806](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/806) | PASS, sin correcciones writer | No: R1 `INFRA_STOP` previo a writer por PATH; R2 PASS con ejecutable explícito; `humanJudgement=null` del R1 pendiente |
| NX-READINESS-DUP-03 / [PR #810](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/810) | PASS, sin correcciones writer | **Sí**, R1 hasta `PR_READY` sin intervención |

**Conclusión limitada:** 3/3 arreglos técnicos correctos y 1/3 runs autónomos desde el primer lanzamiento; muestra de bajo riesgo, determinista, sin UI ni clínica. No demuestra reducción de coste real, de esfuerzo humano total ni cualificación integral del mecanismo. **Metis permanece experimental y no sustituye Atenea C-087**. Se justifican futuras pruebas técnicas acotadas solo si se aprueban por separado. Expedientes externos preservados en `/srv/kairos-lab/metis-runs/nexus/`. No incorporar sesiones ni logs al repo. La deuda #389 sobre otros builders sigue OPEN.

## Preflight, rutas, QA documental, NO TOCA y reversión

- **BASE:** rama `promueve/nexus-v4` y merge técnico `270cdcec788ec4d678600d6a0d95096bbc2b6bf7`; verificar GitHub, [WO #811](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/811) aprobada y HEAD esperado antes de publicar.
- **Worktree:** `/srv/kairos-lab/worktrees/promueve-nexus-metis-readinessdup-doc-20261020`, rama `docs/nexus-metis-readiness-dup-postmerge-20261020`; aislado y sin modificar checkout raíz.
- **RUTAS:** únicamente `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` y este documento; conservar enlaces y estados existentes.
- **QA documental:** 3 rutas exactas, `git diff --check`, enlaces relativos nuevos existentes, consistencia entre INDEX/STATUS, CI PR y CI/Pages postmerge en verde; no QA de navegador.
- **NO TOCA:** JS/HTML/CSS/tests, schemas, manifests, `.github`, `package*.json`, Atenea, Metis, C-088, contratos, T01, PR #778, #389, pacientes, credenciales, `main` y trabajo ajeno.
- **Reversión:** WO de revert documental focal si hiciera falta, sin force-push, reset, borrado de ramas/worktrees o cambio destructivo.

## Publicación y OUTPUT

Publicar con commit y push normal, PR documental vinculada a #811 y merge condicionado a base/HEAD exactos, estado CLEAN y CI verde. Después verificar gates/Pages sobre el commit documental y cerrar la issue #811 como completed. No declarar esta WO publicada antes del merge; no se modifica el código clínico.

**Frontera FH:** T01 EA 0..N de [PR #798](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/798) sigue en memoria y con QA sintética; T02+ continuidad, persistencia, causalidad y proyecciones pendientes. [PR #778](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/778) permanece OPEN e independiente. NO PILOTO.
