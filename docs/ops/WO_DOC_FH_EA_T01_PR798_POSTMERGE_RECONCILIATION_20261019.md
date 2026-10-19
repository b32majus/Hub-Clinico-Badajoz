# WO documental — conciliación de publicación FH EA T01, PR #798

**Fecha:** 2026-10-19. **Estado:** `PREPARADA_LOCAL_NO_PUBLICADA`. **Autorización:** asentimiento de la responsable a completar reconciliación documental tras confirmar PR #798, sin autorización adicional de push/PR/merge ni de cierre de issue.

## WHAT y autoridad

Reconciliar exclusivamente `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` con la entrega **verificada en GitHub**: [PR #798](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/798) `MERGED` sobre `promueve/nexus-v4@eef1db81a939d0e9196a61917d14f6a194cdcfc9`; origen `6f2cf5da57bee18d444fd32714e76872fd448393`; [issue #795](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/795) `OPEN/status:approved` pendiente de cierre administrativo, no afirmar closed. PR [#778](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/778) sigue OPEN e independiente.

G0 v0.4 y spec v0.5 ya están versionados; esta WO no transforma propuestas de T02+ en implementaciones. T01 **sí** publica captura 0..N EA nuevos en memoria en la visita actual, con IDs separados y controles específicos, **no** escritura/relectura duradera, continuidad/recurrencia ni fuentes longitudinales. Los consumidores singulares TXT/CSV/Excel/copia estructurada rechazan la exportación incompatible visiblemente. La preparación manual de un acto no equivale a persistencia validada.

## Base, branch, preflight y rollback

Repo `b32majus/Hub-Clinico-Badajoz`, base remota verificada `promueve/nexus-v4@eef1db81a939d0e9196a61917d14f6a194cdcfc9`. Worktree `/srv/kairos-lab/worktrees/promueve-fh-ea-t01-postmerge-docs-20261019`; branch `docs/fh-ea-t01-postmerge-20261019`, independiente y limpio en preflight. Leer INDEX/STATUS antes de modificarlos y mantener enlaces y todos los hitos previos.

Rollback eventual solo mediante revert focal autorizado del commit documental; sin resets, limpieza, force-push ni cambios en `main`, canónica o trabajo ajeno.

## WHERE y NO TOCA

**Solo rutas:**
1. `docs/INDEX.md`: fila G0+T01, plan EA, alineamiento FH EA y metadatos de último producto / CI / Pages, más enlace a esta WO.
2. `docs/ops/WORK_ORDER_STATUS.md`: fila G0/T01, plan EA y estado de última entrega clínica/producto, más enlace a esta WO.
3. Este archivo WO.

**NO TOCA:** HTML/JS/CSS, tests, maestros G0, T01/FH-DEBT-005, `docs/ops/FARMACIA_DEBT_REGISTER.md` (deuda P3 no bloqueante), issue #795, PR #778, ledger experimental C-088 `fheat01c088`, otras ramas/worktrees, Atenea/Metis, despliegues, base canónica o `main`.

## QA y criterios de aceptación

- Los tres archivos constituyen la totalidad del diff; `git diff --check` PASS.
- Nuevas filas distinguen `PUBLICADO + QA SINTÉTICA` de `NO PILOTO`, fuente de GitHub y `OPEN` de issue. No se marca C-088 como `DONE`: tiene 15 eventos y no consta VERDICT ni atestaciones firmadas.
- Focal sobre T01 en candidato `6f2cf5d...`: 69/69, navegador 19/19 por QA independiente sintética (aserciones visuales en copia de QA), regresión de Seguimiento 153/153; CI PR 4/4 SUCCESS, y postmerge [Nexus gates #39326452525](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/39326452525) y [Pages #39326451063](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/39326451063) SUCCESS. **Sin QA humana en URL alojada**, sin piloto.
- Los planes de T02–T07, mapping, exportación y longitudinalidad permanecen pendientes. La implementación de T01 es solo una slice del plan multisuperficie, no su cierre.
- Enlaces Markdown locales existentes y nuevos resuelven. Las líneas históricas que describen otros cortes no se reescriben como si fueran estado vivo.

## Git y reporte

Preparar un commit **documental local** para facilitar revisión. No push, PR, merge, close issue #795 ni publicación con esta autorización. El estado al cierre de esta WO es `LOCAL_DOC_RECONCILIATION_PREPARED`. La reconciliación no quedará publicada hasta recibir GO concreto y CI/PR documental.
