# WO documental — Nexus / Metis NX-DEPLOY-PATH-02 postmerge

**Fecha:** 2026-10-20. **Issue/WO aprobada:** [#807](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/807). **Estado factual de la corrección:** PUBLICADO / QA DETERMINISTA / NO PILOTO CLÍNICO. **Estado de ESTA reconciliación:** consultar la PR correspondiente en GitHub; un commit local o una rama documental no bastan para declararla publicada.

## Objetivo y hechos contrastados

Actualizar `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` tras el merge de la [PR técnica #806](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/806). Se separa la corrección de tooling del producto clínico, del protocolo experimental de Metis y de los cierres anteriores. No se modifica runtime.

| Referencia | Evidencia publicada o local |
| --- | --- |
| Base canónica anterior | `promueve/nexus-v4@219444f7263d1310ac56691b87b5021e7099d36a` (PR #804 previa) |
| Ticket de preparación | `NX-DEPLOY-PATH-02` en commit `eb40ba584b7cda9742c361bff79584d4ab8f0d61`, padre canónico anterior, ticket y testigo únicamente |
| Candidato Metis | `36f639f69360e35846f660b51900046566602ed8`, único archivo de implementación: `tools/deployment_manifest_build.mjs` |
| Publicación técnica | [issue #805](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/805) CLOSED/completed; [PR #806](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/806) MERGED `656788ece0ba0050a3484d2db1448454efc57ed0` |
| CI postmerge PR #806 | [Nexus deterministic gates #39349428028](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/39349428028) y [Pages #39349427465](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/39349427465) SUCCESS sobre `656788ece0ba0050a3484d2db1448454efc57ed0` |
| Último hito funcional FH | T01 de EA nuevos 0..N en memoria, [PR #798](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/798) MERGED `eef1db81a939d0e9196a61917d14f6a194cdcfc9`, QA sintética; sin persistencia longitudinal, verificación clínica alojada ni piloto |

## Alcance técnico y protección

La PR #806 corrige exclusivamente la ruta que el builder calcula para encontrar sus schemas locales: utiliza el builtin `fileURLToPath(import.meta.url)` en lugar de `new URL(import.meta.url).pathname`, sin cambiar el contrato CLI, los módulos, validaciones, hashes de procedencia, schemas, golden ni output normal. El código publicado se compara con el candidato Metis y no introduce inferencias ni información clínica.

**QA:** testigo 5/5 PASS en candidato (BASE 2/5, tres fallos esperados por URL codificada), `check:manifest` 12/12, `check:readiness` 10/10, `verify:fast` PASS en checkout limpio con npm offline; CI de PR 4/4 y postmerge gates/Pages SUCCESS. QA de navegador no ejecutada ni exigida para este cambio de tooling; **no acredita piloto clínico**.

## Metis: historia completa de la ejecución

- Metis pilot-2 congelado `b152a71b6724cf60574501b5a0c53627c16005ac`, dictamen previo Claude `CALIBRATION_GO`, preflight 6/6 PASS.
- `nx-deploy-path-02-r1`: **INFRA_STOP** antes de que existiera sesión de writer: binario `opencode` no localizable por PATH en el entorno invocador; sessionId null, 0 tokens, 0 gate, sin cambio de producto. STOP original conservado; `humanJudgement` **pendiente (`null`)**, nunca reclasificarlo sin decisión humana.
- `nx-deploy-path-02-r2`: run ID nuevo con binario OpenCode explícito, writer al primer intento, gate PASS, evaluador independiente PASS sin findings, accept PASS y package PASS, 0 correcciones, resultado **PR_READY** en 86.910 ms. **No se usó `resume`** porque R1 no había alcanzado GATE_PASS.
- Expedientes íntegros fuera de Git: `/srv/kairos-lab/metis-runs/nexus/runs/nx-deploy-path-02-r1/`, `/srv/kairos-lab/metis-runs/nexus/runs/nx-deploy-path-02-r2/`, resumen `/srv/kairos-lab/metis-runs/nexus/calibration/NX-DEPLOY-PATH-02_R1_R2_EXECUTION_CLOSEOUT_20261020.md`. No guardar sesiones ni datos reales en el repo.
- Observación menor independiente: en pilot-2 `accept.json` el detalle textual del gate es contradictorio aunque `status=PASS`. No se corrige en Nexus ni se confunde con fallo de aceptación.

## Preflight, rutas, reversión y NO TOCA

- Autoridad: GitHub live `b32majus/Hub-Clinico-Badajoz`, `promueve/nexus-v4`; SHA base de la WO documental `656788ece0ba0050a3484d2db1448454efc57ed0`. Leer INDEX/STATUS y comprobar issue #807 aprobada antes de modificar.
- Worktree aislado `/srv/kairos-lab/worktrees/promueve-nexus-metis-deploypath-doc-20261020`, rama `docs/nexus-metis-deploy-path-postmerge-20261020`, sin tocar el checkout raíz ni `main`.
- **RUTAS:** únicamente `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` y este documento. Trazabilidad sin duplicados, enlaces relativos existentes y estados coherentes con PR/issue publicados.
- **NO TOCA:** JS/HTML/CSS, tests, manifests, schemas/fixtures, contratos clínicos, C-088, PR #778, Atenea, Metis, issue #389, datos pacientes, credenciales, `.github/`, otras ramas/worktrees y `main`.
- [Issue #389](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/389) sigue OPEN por otras deudas de bootstrap/D5, que no se declaran resueltas. El patrón de URL pathname en otros builders queda pendiente de ticket aparte.
- **Reversión:** nueva WO con revert documental acotado si surgieran errores; nunca force-push/reset/borrado de ramas o evidencias.

## QA documental y política de publicación

Comprobar tres rutas exactas, `git diff --check`, existencia de enlaces relativos del contenido nuevo, coincidencia de issue/PR/SHA y de las métricas del run. Crear commit y push normal aislados, PR contra `promueve/nexus-v4`, fusionar solo con HEAD exacto, `CLEAN` y todos los checks verdes. Verificar CI y Pages postmerge y cerrar #807 como completed solo entonces. La reconciliación no cambia producto clínico ni autoriza piloto.

## OUTPUT

Reportar BASE/candidate/PR/merge, enlaces, pruebas y CI, issues, estado final de worktrees/ramas, runs conservados y pendiente de `humanJudgement` de R1. No limpiar cambios ajenos ni borrar evidencias.
