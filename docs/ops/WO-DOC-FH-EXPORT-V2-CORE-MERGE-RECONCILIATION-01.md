# WO-DOC-FH-EXPORT-V2-CORE-MERGE-RECONCILIATION-01

**Título:** Reconciliar la publicación del núcleo canónico Export v2
**Fecha:** 2026-08-02
**Riesgo:** Verde documental
**Base remota:** `origin/recovery/farmacia-pr-replay-20260727`
**Base y HEAD esperados:** `6ac041f8d5faa445140b32a7daccd3724dac3529`
**Rama:** `work/doc-fh-export-v2-core-merge-reconciliation-01-20260802`
**Estado:** `ready_for_review`

## 1. Objetivo y contexto

Reconciliar la documentación viva después de la publicación real de:

- `WO-DOC-FH-EXPORT-V2-SEQUENCE-WO1-01`, PR #209, merge `5e9b59ba36dc7760f4529deece33248922ce0b9a`;
- `WO-FH-EXPORT-V2-CANONICAL-CORE-01`, PR #211, commit `7109b5f1a9411793666e1e1f239e3ac25ce9437e`, merge `6ac041f8d5faa445140b32a7daccd3724dac3529`;
- issue #208 y issue #210 cerradas como `completed`;
- Pages run `30754082136` finalizada con `success`.

La reconciliación debe distinguir:

- el core v2 existe en código y está publicado en `recovery`;
- no está cargado por ningún HTML;
- no está conectado a Validación, Primera Visita o Seguimiento;
- no sustituye las 61 columnas v1;
- no acredita Excel Bridge, Office Script, navegador, piloto o producción.

## 2. Preflight

1. Verificar repositorio `b32majus/Hub-Clinico-Badajoz`.
2. Verificar `origin/recovery/farmacia-pr-replay-20260727` en `6ac041f8d5faa445140b32a7daccd3724dac3529`.
3. Verificar `origin/main` en `a25cccb8e5a9b90558c462b3e3b96d823f87cb68`.
4. Verificar el manifest Cáceres: versión `CÁCERES-REVIEW-0.3` y fuente `815e16f9564c82f469a95745c5c6917593a8c3f0`.
5. Trabajar en worktree documental aislado y limpio.
6. No usar, limpiar ni restaurar el checkout principal.

## 3. RUTAS

1. `docs/ops/WO-DOC-FH-EXPORT-V2-CORE-MERGE-RECONCILIATION-01.md`
2. `docs/INDEX.md`
3. `docs/ops/WORK_ORDER_STATUS.md`
4. `docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`
5. `docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md`

## 4. NO TOCA

- JavaScript, JSON Schema, fixtures o tests de WO1.
- Las 61 columnas v1 o cualquier salida pública.
- Validación, Primera Visita, Seguimiento, CSV o TXT JARA.
- HTML, CSS, Pages, workflows o snapshot Cáceres.
- Excel Bridge, Office Script, vistas `APP_*` o PostgreSQL.
- `main`.
- Datos reales.

## 5. Reversión

Revertir exclusivamente el commit documental de esta WO. No existe migración de datos ni cambio funcional asociado.

## 6. QA documental

- cinco rutas exactas;
- `git diff --check`;
- enlaces internos existentes;
- tablas Markdown coherentes;
- totales del tablero recalculados desde sus filas;
- issue #208/#210 y PR #209/#211 reflejadas correctamente;
- base, commit funcional y merge SHA diferenciados;
- Cáceres y `main` verificados sin cambios;
- ninguna ruta funcional en el diff.

## 7. Criterios de aceptación

- `docs/INDEX.md` presenta WO1 como implementada y publicada, pero no cableada.
- `WORK_ORDER_STATUS.md` presenta la WO de secuencia y WO1 como `Merged`.
- El estado vivo incorpora PR #209 y #211 y mantiene las 61 columnas como runtime público vigente.
- La WO1 registra commit, push, PR y merge reales.
- El HEAD publicado para el siguiente stack queda fijado en `6ac041f8d5faa445140b32a7daccd3724dac3529` hasta el merge de esta reconciliación.
- Ningún texto convierte los tests del core en QA de navegador, Excel o piloto.

## 8. Política Git

Un único commit documental atómico:

```text
docs(farmacia): reconcile export v2 core publication
```

Push, issue, PR y merge quedan autorizados por la instrucción actual, siempre que la base no cambie, las cinco rutas sean exactas, los checks estén verdes, la PR sea `CLEAN` y `MERGEABLE` y la issue específica tenga `status:approved`.

No borrar rama, backup o worktree automáticamente.

## 9. OUTPUT

```text
WO: WO-DOC-FH-EXPORT-V2-CORE-MERGE-RECONCILIATION-01
BASE_BRANCH:
BASE_SHA:
WORK_BRANCH:
ROUTES_CHANGED:
DOC_QA:
STATE_RECONCILIATION:
MAIN:
CACERES:
COMMIT:
PUSH:
ISSUE:
PR:
MERGE:
PAGES:
FINAL_STATUS: READY_FOR_REVIEW | MERGED | BLOCKED
```
