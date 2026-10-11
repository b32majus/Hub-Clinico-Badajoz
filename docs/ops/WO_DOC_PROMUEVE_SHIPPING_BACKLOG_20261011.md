# WO-DOC-PROMUEVE-SHIPPING-BACKLOG-20261011

**Estado:** CANDIDATO DOCUMENTAL LOCAL, SIN PUSH/PR/MERGE · Issue [#663](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/663), no `status:approved` de ejecución.

## Objetivo y contexto
Dejar una única cola operativa vinculada a GitHub para Reumatología, Farmacia, Foundation V4, seguridad pre-piloto y Dermatología. Reconciliar los estados postmerge de Train29 #658, Train30 #660 y arnés #662 sin reabrir auditorías históricas ni convertir tickets en aprobaciones.

## Base/HEAD y preflight
- Repo: `b32majus/Hub-Clinico-Badajoz`; base verificada `promueve/nexus-v4@a3556b408e91c257c7cd2c829c575ff497c99745`.
- Atenea C-087 `main@4dd488aea19870e36fa35511ce0a0b8f59dcdf6a`, PR #143/#144; no modificar Atenea.
- Verificado repo, rama, HEAD, índice, WORK_ORDER_STATUS, ledger y backlog FH; PR #658/#660/#662 y sus estados GitHub al preparar la WO.
- Trabajo en worktree aislado `/srv/kairos-lab/worktrees/promueve-nexus-shipping-backlog-20261011`; otros intactos.

## Rutas y NO TOCA
- Crear `docs/ops/PROMUEVE_SHIPPING_BACKLOG_20261011.md`, `docs/ops/PROMUEVE_REQUIREMENTS_TRACEABILITY_20261011.md` y `docs/ops/PROMUEVE_CANDIDATE_TICKETS_20261011.md`.
- Actualizar solo referencias y estados vivos en `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, `docs/ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md` y `docs/ops/FARMACIA_ESTADO_Y_BACKLOG_20261011.md`.
- Este archivo documental cierra el alcance propuesto ampliado; issues #663–#672 creados como preparaciones NO aprobadas para ejecución, y 77 unidades restantes documentadas, no creadas en GitHub.
- **NO TOCA:** código de producto, modelos, schemas, tests, navegación, seguridad clínica, releases, datos, agentes/permisos, branch `main`, historial, sesiones, worktrees ajenos, issues históricos administrativos, ni orden semántico de contratos.

## QA / aceptación
- Diez issues con IDs/rutas únicos y estados reales; inventario FH/RE/F4-F7/Derma y recuperación de fuentes históricas, sin promover propuestas a decisiones clínicas.
- 77 unidades adicionales clasificadas en gates de QA, shaping, fuente, dependencia, operativo y diferido: NO crear issues adicionales en esta autorización.
- Estado publicado de Trains 29/30 y Atenea C-087 coherente con GitHub; ninguna función no implementada presentada como piloto.
- Markdown/enlaces locales válidos; `git diff --check` y diff solo de ocho documentos autorizados.
- La cola discrimina PENDIENTE_QA, FEATURE, FUENTE, SHAPING, DEFERIDO y ANTES_PILOTO. Ningún issue recibe aprobación implícita.
- QA documental/estático; no ejecución de agentes, navegador ni pruebas clínicas innecesarias.

## Reversión y publicación
La reversión futura es un revert documental puntual bajo autorización; no reset ni force push. Commit local autorizado en rama/worktree aislado. Push, PR, merge y despliegue quedan **detenidos** hasta autorización concreta. No tocar `main`.

## OUTPUT
Reportar SHA local y base, rutas cambiadas, 10 URLs de issues, pruebas PASS/FAIL, bloqueos/decisiones abiertas y estado de publicación. Revalidar HEAD y aprobación del issue #663 antes de eventual PR.
