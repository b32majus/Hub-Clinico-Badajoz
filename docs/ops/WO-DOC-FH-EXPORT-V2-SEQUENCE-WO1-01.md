# WO-DOC-FH-EXPORT-V2-SEQUENCE-WO1-01

**Título:** Publicar la secuencia de implementación del Export Manager v2 y la WO del núcleo canónico
**Fecha:** 2026-08-02
**Riesgo:** 🟢 Verde documental
**Base remota:** `origin/recovery/farmacia-pr-replay-20260727`
**Base y HEAD esperados:** `2f54c4ec80ed201a4026b374b711eb7572faa367`
**Rama:** `work/fh-export-v2-sequence-wo1-docs-20260802`
**Worktree:** `/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/worktrees/fh-export-v2-sequence-wo1-docs-20260802`

## 1. Objetivo y contexto

Convertir en documentación viva las decisiones funcionales acordadas después de la reconciliación del contrato v2:

- separar la construcción del núcleo canónico de los adaptadores clínicos;
- ejecutar Validación, Primera Visita y Seguimiento de forma secuencial y atómica;
- revisar conjuntamente los tres adaptadores sin convertirlos en un único commit;
- aplazar el cutover, el Excel Bridge, el Office Script y el migrador PostgreSQL a WOs distintas;
- entregar una WO1 ejecutable que no cambie la interfaz ni las salidas públicas actuales.

Esta WO no implementa el Export Manager v2. Solo fija secuencia, fronteras, gates y la primera WO técnica.

## 2. Preflight

- Verificar `origin/recovery/farmacia-pr-replay-20260727` en `2f54c4ec80ed201a4026b374b711eb7572faa367`.
- Verificar `origin/main` intacta.
- Trabajar en worktree documental aislado.
- Leer `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` y `docs/farmacia_export_longitudinal_contract_WO8.md`.
- No usar ni limpiar el checkout principal sucio.

## 3. Alcance y rutas

1. `docs/ops/WO-DOC-FH-EXPORT-V2-SEQUENCE-WO1-01.md`
2. `docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`
3. `docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md`
4. `docs/farmacia_export_longitudinal_contract_WO8.md`
5. `docs/INDEX.md`
6. `docs/ops/WORK_ORDER_STATUS.md`
7. `docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`

## 4. NO TOCA

- JavaScript, HTML, CSS o JSON funcional.
- Las 61 columnas publicadas.
- TXT JARA, CSV o botones Excel.
- Persistencia local, ledger o workbook.
- `main`, `previews/caceres-fh/` o Pages.
- Issues históricos abiertos.
- Datos reales, backend o servidor.

## 5. Reversión

Revertir exclusivamente el commit documental de esta WO. No existe migración de datos ni cambio funcional asociado.

## 6. QA documental

- siete rutas exactas;
- `git diff --check`;
- enlaces internos existentes;
- tablas Markdown coherentes;
- HEAD regional, `main` y manifest Cáceres verificados;
- distinción explícita entre documentado, implementado y publicado;
- la WO1 contiene objetivo, base, preflight, reversión, alcance, NO TOCA, tests, QA, aceptación, política Git y reporte final.

## 7. Criterios de aceptación

- La secuencia WO1–WO9 queda ordenada y sin solapamientos.
- WO1 se revisa e integra antes de construir adaptadores.
- WO2, WO3 y WO4 pueden ejecutarse en un mismo worktree con tres commits atómicos y detenerse ante una desviación del núcleo.
- WO5 no comienza hasta aprobar conjuntamente los tres adaptadores.
- Office Script y PostgreSQL permanecen fuera de WO1–WO5.
- La WO1 no activa ninguna salida v2 ni altera la experiencia visible.

## 8. Política Git

Commit, push, issue, PR y merge requieren autorización explícita. La publicación de esta documentación no autoriza la ejecución de WO1. No se borran ramas ni worktrees automáticamente.
