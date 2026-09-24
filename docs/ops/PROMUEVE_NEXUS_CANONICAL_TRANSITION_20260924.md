# PROMueve Nexus — Git Canonical Transition (F0.2)

**Fecha:** 2026-09-24
**WO / Issue:** [`#380`](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/380) — `WO-NEXUS-F0.2-GIT-CANONICAL-TRANSITION` (`status:approved`)
**Autoridad de arquitectura:** [`PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md`](../architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md) y [`ADR-001`](../architecture/adr/ADR-001-product-authority-and-canonical-line.md)
**Plan:** [`PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`](PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md) — fase F0.2
**Estado de este documento:** ejecución publicada en PR de F0.2; sin cambio de autoridad Git hasta merge autorizado.

---

## 1. Resumen

F0.2 crea la futura línea canónica de PROMueve Nexus, `promueve/nexus-v4`, desde el SHA live cualificado de la autoridad publicada vigente (`recovery/farmacia-pr-replay-20260727`), demuestra equivalencia inicial exacta y define la semántica de activación. **La creación de la rama no cambia la autoridad**: recovery permanece ACTIVE hasta que la PR de F0.2 se fusione mediante autorización explícita.

## 2. Identidad de la transición

| Elemento | Valor |
| --- | --- |
| Repositorio | `b32majus/Hub-Clinico-Badajoz` (único repositorio, sin repo nuevo) |
| Rama fuente (autoridad vigente) | `recovery/farmacia-pr-replay-20260727` |
| SHA fuente live verificado | `a8cec03522017a1f4b68e18b92c944601659c84f` (merge PR #379 — Architecture Decision Freeze) |
| Rama canónica creada | `promueve/nexus-v4` |
| SHA inicial de `promueve/nexus-v4` | `a8cec03522017a1f4b68e18b92c944601659c84f` (idéntico al fuente) |
| Rama de trabajo de la WO | `work/nexus-f0-2-git-canonical-transition-380-20260924` |
| Método de creación | `git branch` + `git push` desde el SHA fuente exacto; **cero cherry-picks, cero rewrite, cero rebase** |

## 3. Prueba de equivalencia inicial (determinista)

Ejecutada localmente y verificada contra GitHub live el 2026-09-24:

| Comprobación | Resultado |
| --- | --- |
| Mismo commit inicial | `a8cec03522017a1f4b68e18b92c944601659c84f` en recovery, `promueve/nexus-v4` local y `origin/promueve/nexus-v4` |
| Mismo tree SHA | `82e019bbcfb4959c0e31d6a6575edc88363587e3` en ambos refs |
| Diff source ↔ nexus-v4 | **vacío** (0 líneas, `git diff` local y contra `origin/promueve/nexus-v4`) |
| Commits de diferencia | `0` en ambos sentidos (`git rev-list --count`) |
| Cherry-picks | **0** (historia idéntica commit a commit; mismo SHA raíz y tip) |
| Rewrite de historia | **0** (rama creada por ref apuntando al SHA existente, sin `filter-branch`/`rebase`/`commit-tree`) |
| Verificación GitHub live | `gh api .../branches/promueve/nexus-v4` → `sha: a8cec03…`, sin protección, sin contenido inesperado |

Esta equivalencia se conserva porque la PR de F0.2 parte de esa misma base: el diff de la PR contiene únicamente los cambios documentales listados en la sección 8.

## 4. Semántica de autoridad

### 4.1 Antes del merge autorizado de F0.2 (estado actual)

| Ref | Estado |
| --- | --- |
| `recovery/farmacia-pr-replay-20260727` | **ACTIVE** — única autoridad de producto publicada |
| `promueve/nexus-v4` | **CANDIDATE** — futura línea canónica, sin autoridad de producto |
| `main` | legacy/intacto, fuera de la línea |
| Snapshots (`CÁCERES-REVIEW-0.6`) y paquete externo | autoridad de artefacto propia, congelados, sin cambio |

### 4.2 Después de un merge autorizado de F0.2

| Ref | Estado |
| --- | --- |
| `promueve/nexus-v4` | **ACTIVE** — autoridad para nuevo desarrollo Nexus/Foundation |
| `recovery/farmacia-pr-replay-20260727` | **HISTORICAL** para nuevo desarrollo; preservada como referencia histórica y fallback de recuperación |
| `main` | sigue intacto |
| Snapshots | siguen conservando su autoridad de artefacto propia; no se rehijan ni se refrozen por esta transición |

La activación es **explícita y única**: ocurre en el momento del merge autorizado de la PR de F0.2 contra `promueve/nexus-v4`, y no por publicación de esta documentación ni por la creación de la rama.

## 5. Rollback

Si la PR de F0.2 se rechaza o se aborta antes del merge:

1. La autoridad permanece en recovery (nunca dejó de ser ACTIVE): **no se requiere acción de rollback de autoridad**.
2. La rama `promueve/nexus-v4` queda como candidate sin contenido propio y puede eliminarse con autorización explícita o re-crearse desde el mismo SHA fuente en una ejecución futura.
3. Si recovery avanzara materialmente respecto de `a8cec03…` antes del merge, F0.2 se re-ejecuta desde el nuevo SHA live verificado (nueva equivalencia inicial); no se adaptan silenciosamente los SHA de este documento.

Después del merge, `promueve/nexus-v4` es la línea ACTIVE y recovery es referencia histórica; la reversión a recovery como autoridad exigiría una decisión explícita documentada, no una operación Git silenciosa.

## 6. Recovery histórico tras activación

Tras el merge autorizado, `recovery/farmacia-pr-replay-20260727`:

- conserva toda su historia y se mantiene accesible como referencia y fallback;
- no recibe nuevo desarrollo Nexus/Foundation; los WOs nuevos parten de `promueve/nexus-v4`;
- deja de describirse como "rama publicada actual" en los documentos vivos, que se reconciliarán en una acción documental posterior a la activación (ver sección 7);
- sus snapshots y artefactos asociados conservan la trazabilidad original.

## 7. Reconciliación documental incluida en esta PR

| Documento | Cambio |
| --- | --- |
| `docs/ops/PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md` | nuevo; este documento |
| `docs/INDEX.md` | registra la línea candidate y su semántica CANDIDATE/ACTIVE |
| `docs/ops/WORK_ORDER_STATUS.md` | registra la transición F0.2 y la entrega de #380 |
| `docs/architecture/adr/ADR-001-product-authority-and-canonical-line.md` | anota la ejecución del procedimiento (rama creada, pendiente de activación) |
| `docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md` | marca F0.2 como ejecutada, activación pendiente de merge |
| `README.md` | menciona la línea candidate sin cambiar la autoridad vigente declarada |

**Deuda documental post-activación (fuera de esta WO):** tras el merge autorizado, los documentos vivos que describen recovery como autoridad actual (`README.md`, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, estado vivo `FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`) deberán reconciliarse para reflejar `promueve/nexus-v4` = ACTIVE y recovery = HISTORICAL. Esta reconciliación no puede anticiparse aquí sin declarar una autoridad que aún no existe.

## 8. Verificación y gates

- Cambios **solo documentales**: cero HTML/CSS/JS, cero schema ejecutable, cero workbook/snapshot, cero package/tooling/runtime (verificable por la lista de archivos del diff de la PR).
- Smoke vigente `tools/farmacia_smoke_check.mjs`: **PASS** (49 OK / 0 FALLIDO) sobre el árbol del candidate.
- Enlaces relativos de los documentos nuevos/editados verificados manualmente.
- Equivalencia inicial determinista: sección 3.
- Browser QA: no requerido; F0.2 no cambia UI/runtime.
- Native Gentle review (RDD): ejecutado sobre el exact candidate de esta PR; resultado registrado en la PR.

## 9. Fronteras

- `main`, default branch, snapshots Cáceres, paquete externo, estado asistencial, runtime clínico: **sin cambio**.
- No se inicia ninguna otra WO ni fase del Foundation Train (F0.3, F1, F2, F3) en esta ejecución.
- El merge de la PR de F0.2 **no está autorizado** dentro de esta WO: es una decisión humana posterior.
