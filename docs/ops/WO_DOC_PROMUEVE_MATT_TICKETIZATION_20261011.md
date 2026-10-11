# WO-DOC-PROMUEVE-MATT-TICKETIZATION-20261011

**Estado:** candidato documental LOCAL SIN PUSH/PR/MERGE. No se ha creado ni aprobado un issue propio para publicar esta WO. Los issues #674–#734 pertenecen a resultados de producto, QA, especificación, clínicos y operativos, no a la ejecución de esta WO.

## Objetivo y contexto
Dar correspondencia GitHub a las 77 unidades de la cola reconciliada mediante Matt /to-tickets; publicar 61 issues de alcance independiente, con blockers nativos cuando proceda, reutilizar seis issues y conservar tres diferidos. Mantener explícita la separación entre necesidad clínica, decisión, trabajo QA, implementación bloqueada y circuito externo.

## Base/HEAD esperado y preflight
- Repositorio b32majus/Hub-Clinico-Badajoz, promueve/nexus-v4@abcf3070500b2f190b2af2aa11a2f428a81d7252, HEAD verificado antes de crear issues.
- Atenea C-087 main@4dd488aea19870e36fa35511ce0a0b8f59dcdf6a. Skills Matt /to-tickets, /to-spec y setup consultadas; no modificación del arnés.
- Worktree aislado /srv/kairos-lab/worktrees/promueve-nexus-ticketization-matt-20261011, rama documental nueva desde canónica.

## Alcance / RUTAS y NO TOCA
- Nuevos docs/ops/PROMUEVE_TICKETIZATION_REGISTER_20261011.md y esta WO.
- Referencias acotadas en docs/INDEX.md, docs/ops/WORK_ORDER_STATUS.md, docs/ops/PROMUEVE_SHIPPING_BACKLOG_20261011.md, docs/ops/PROMUEVE_CANDIDATE_TICKETS_20261011.md, docs/ops/PROMUEVE_REQUIREMENTS_TRACEABILITY_20261011.md.
- NO TOCA: runtime, producto clínico, módulos, datasets, tests, main, arnés, WOs ajenas, PR/merge, credenciales, pacientes, aprobaciones de issues y worktrees anteriores.

## QA y aceptación
- Los 77 IDs tienen exactamente una salida: 57 issue nuevo propio, 11 mapeados a 4 issues ops, 6 anteriores y 3 diferidos.
- Los 61 nuevos issues están abiertos y carecen de status:approved y ready-for-agent, con resultado, aceptación, negativo, NO TOCA y edges.
- Bloqueos nativos sólo si realmente son dependencias; rollback de ticketización sólo mediante edición/cierre autorizado, sin borrado.
- Enlaces locales válidos, diff sólo 7 documentos, git diff --check. No ejecutar QA navegador, OpenCode ni pruebas de producto en una WO de documentación.

## Reversión, política y OUTPUT
Revert documental puntual bajo autorización futura; nunca reset/force-push. Commit LOCAL autorizado en worktree aislado; push y PR requieren autorización expresa y un issue documental propio con status:approved. No merge/deploy. Reportar SHA local, pruebas y mapa GitHub exacto.
