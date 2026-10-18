# WO documental — FH-DEBT-005 · Refinamiento visual diferido T01

**Fecha:** 2026-10-18 · **Estado:** PUBLICACIÓN DOCUMENTAL AUTORIZADA Y EN TRÁMITE; [issue #796](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/796) `status:approved` / `type:docs`. NO AUTORIZA EJECUCIÓN ESTÉTICA.

## Objetivo y decisión humana

Registrar en el documento vivo `docs/ops/FARMACIA_DEBT_REGISTER.md` la aceptación de la dirección visual T01 como suficiente para demo sintética y la **deuda de pulido no bloqueante** observada en contraste con el master G0 v0.4. La instrucción «regístralo como deuda» no autorizaba publicación; el mandato posterior «publica, audita PR y si todo correcto merge y limpieza» sí autoriza la publicación documental condicionada a revisión/CI, sin nueva modificación de producto.

**FH-DEBT-005**: (1) jerarquía visual de información, (2) detalles de tarjetas/cabeceras/espaciado, y (3) refinamiento tipográfico/mayúsculas. Es deuda de **presentación**, no fallo funcional, no requisito de piloto ni reapertura de VIS-04.

## Autoridad, base y preflight

- Repo `b32majus/Hub-Clinico-Badajoz`. GitHub/origin verificados en `promueve/nexus-v4@1e4fbf41911e2d7afaa74185a4dd614b8a0ad2e2`; `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` leídos. Ambos ya enlazan al registro de deuda; no necesitan alterar el estado publicado de T01, que sigue sin publicarse.
- Rama documental local `docs/fh-ea-t01-visual-debt-20261018` en worktree `/srv/kairos-lab/worktrees/promueve-nexus-fh-ea-t01-visual-debt-20261018`. Base exacta `1e4fbf41911e2d7afaa74185a4dd614b8a0ad2e2`. Worktree nuevo limpio antes de escribir.
- Autoridad visual `docs/product/fh-ea/g0-v0.4/`, contraste humano de capturas y corrección VIS-04 del candidato local `88de94186144f47655ab201fcee538a69c5b5e7f` con parent `4c0b58a758832c9e40e8f75643a55a60601bb081`.
- Registro fuente: `docs/ops/FARMACIA_DEBT_REGISTER.md` (FH-DEBT-001..004); nueva entrada `FH-DEBT-005`, sin reutilizar IDs.

## Alcance / NO TOCA

**Solo:** añadir la deuda aceptada al registro vivo e incorporar esta WO documental local.
**No toca:** código, CSS, masters, pruebas, capturas, `main`, `promueve/nexus-v4`, rama de corrección VIS-04, piloto C-088, ledger, issue #795, PR #778, ni otras deudas históricas. Issue documental propia [#796](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/796) ya creada para publicación; no abrir una WO de refinamiento estético ni ejecutar producto ahora.

## QA y criterios de aceptación

Comprobar que `FH-DEBT-005` existe una vez, describe los tres puntos observados, prioridad baja P3, estado OPEN/no bloqueante y condición de cierre visual futura, distinguiendo *candidato local* de *publicación canónica*. Comprobar `git diff --check`, que el diff solo modifica el registro y añade esta WO, y que `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` permanecen intactos. No procede QA clínica ni de navegador: esta WO solo documenta.

## Reversión, commit y publicación

Reversión: retirarla únicamente mediante nueva WO documental autorizada, sin reset destructivo ni limpiar trabajo ajeno. **Autorizado:** commit, push, PR, auditoría y merge condicional sobre `promueve/nexus-v4`, siguiendo la autorización expresa del 18-10-2026 y la issue propia #796 `status:approved`. Verificar diff, estado CI/PR y HEAD antes del merge. Cerrar issue tras confirmación de merge. **No desplegar ni modificar código**. Limpieza solo de este worktree/rama, una vez fusionados y sin cambios ajenos; no force-push ni reset destructivo. `INDEX.md` y `WORK_ORDER_STATUS.md` ya enlazan el registro; no atribuir estado de T01 publicado al registrar deuda.

## OUTPUT

Resultado buscado de esta WO: `FH-DEBT-005` visible en la rama canónica tras PR/CI y merge verificados, con referencia a issue #796, sin código clínico nuevo. Si el merge no ocurre, reportar `LOCAL_ONLY` / `PR_OPEN` verídicos. Deuda P3 diferida hasta WO de refinamiento autorizada tras integración T01.
