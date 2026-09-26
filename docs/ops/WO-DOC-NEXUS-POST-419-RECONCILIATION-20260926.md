# WO-DOC-NEXUS-POST-419-RECONCILIATION — 2026-09-26

**Tipo:** documentación / reconciliación post-merge
**Estado:** `AUTHORIZED_FOR_LOCAL_EXECUTION`
**Autorización humana:** reconciliar el estado post-merge de PR #422 y situar el avance real frente al Foundation Train Plan.
**Repo:** `b32majus/Hub-Clinico-Badajoz`
**Issue:** #423 (`status:approved`)
**Base canónica:** `promueve/nexus-v4`
**Base / HEAD esperado:** `f46290cd3a368e00427dbe2fb4e5fde00270d6ac` (merge PR #422)
**Rama de trabajo:** `docs/nexus-postmerge-reconciliation-419-20260926`

## Objetivo y contexto

Reconciliar la autoridad documental después de publicar TRAIN-NEXUS-V4-ROLLOVER-CANARY-04 (#419) mediante PR #422, registrar el cierre material de `NEXUS-DEBT-012/013`, hacer explícito que PR #381 ya activó `promueve/nexus-v4` como línea canónica y reflejar el avance real de F0–F7 sin presentar trabajo pendiente como implementado.

La reconciliación separa el éxito de producto del experimento de rollover: D012/D013 están publicados y verificados; el rollover automático funcionó operacionalmente, pero su target económico `<25% of tokensBefore` no quedó demostrado con una medición fiable del primer prompt post-compact y no cualifica/promueve `native-v4-heavy`.

## Preflight

- GitHub live: PR #381 `MERGED`; Nexus = autoridad canónica activa para nuevo desarrollo.
- GitHub live: PR #422 `MERGED` en `promueve/nexus-v4` con merge `f46290cd3a368e00427dbe2fb4e5fde00270d6ac`.
- GitHub Actions post-merge sobre ese SHA: Fast gates y Deterministic suite `success`.
- Worktree aislado creado desde `origin/promueve/nexus-v4 @ f46290c...`; árbol limpio antes de editar.
- `main`, recovery y snapshots no se modifican.

## Alcance

1. `docs/INDEX.md`: autoridad Nexus actual, publicación #422 y estado F0–F3.
2. `docs/ops/WORK_ORDER_STATUS.md`: estado publicado Nexus y trazabilidad de #419/#420/#421/#422.
3. `docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`: checkpoint de ejecución F0–F7 y siguiente critical path sin reescribir el plan original.
4. `docs/ops/NEXUS_DEBT_REGISTER.md`: enlazar D012/D013 a la publicación #422 y mantener visibles D004/D005/D007.
5. Este documento: contrato/reporte de la WO documental.

## NO TOCA

- código HTML/CSS/JS, schemas, fixtures, builders/checkers o runtime;
- clínica Farmacia/Reuma ni datos reales;
- `main`, recovery, snapshots Cáceres, workbooks o paquete externo;
- Atenea/Gentle/HOME global;
- crear nueva arquitectura o ampliar alcance de D012/D013;
- cerrar deudas abiertas por conveniencia;
- cualificar piloto/producción o promover perfiles/modelos por el canary #419.

## Reversión

Mientras no exista publicación, la rama/worktree aislados pueden abandonarse sin alterar la rama canónica. Si se publicase y después hubiese que revertir, usar un commit de reversión documental normal; no force-push ni reescritura de historia.

## Tests / QA

- `git diff --check`.
- verificación de enlaces relativos de los documentos modificados.
- comprobación textual de que PR #381 no siga descrita como pendiente para resolver la autoridad actual.
- comprobación de que D012/D013 se enlazan a PR #422 y D004/D005/D007 siguen abiertos.
- no QA de navegador: cambio exclusivamente documental.

## Criterios de aceptación

- Nexus figura como autoridad canónica activa desde PR #381.
- PR #422 / merge `f46290c...` y CI post-merge quedan registrados sin confundir candidate y publicación.
- F0–F3 quedan distinguidos de F4–F7 en el plan vivo.
- la Home sintética se marca alcanzada; integración de módulos, multi-site y pre-pilot no se presentan como completadas.
- el registro no sugiere barrido de deuda: D004, D005 y D007 conservan su timing/dependencia.
- canary #419 queda descrito como éxito operacional con target económico no demostrado, no como qualification de profile.

## Política de commit / push / PR / merge

- **Commit local:** autorizado dentro de esta reconciliación.
- **Push:** no autorizado en esta WO hasta autorización humana explícita.
- **PR:** no autorizada en esta WO hasta autorización humana explícita.
- **Merge:** no autorizado.

## Reporte final

**Resultado local:** `PASS` dentro del alcance documental.

- base y worktree correctos: `f46290cd3a368e00427dbe2fb4e5fde00270d6ac`, rama aislada `docs/nexus-postmerge-reconciliation-419-20260926`;
- `git diff --check`: PASS;
- enlaces relativos de las cinco rutas de esta WO: PASS, 0 rotos;
- autoridad current-state: PR #381 queda descrita como `MERGED`, Nexus `ACTIVE`, recovery `HISTORICAL`;
- D012/D013: `RESOLVED/PUBLISHED` vía PR #422;
- deuda abierta preservada: D004, D005 parcial y D007;
- plan reconciliado: Home sintética alcanzada; F4 pendiente; F5 parcial; F6/F7 pendientes;
- browser QA: no ejecutada/no requerida por ser cambio exclusivamente documental;
- no se modificó runtime, clínica, `main`, recovery, snapshots ni workbooks.

**Boundary de publicación:** commit local permitido; push/PR/merge no ejecutados. Si se autoriza la publicación, el closeout administrativo deberá cerrar/reconciliar #420, #421 y #419 con la misma distinción entre producto publicado y canary no promovido.
