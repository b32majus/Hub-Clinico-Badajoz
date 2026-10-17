# WO OPS — Atenea C-087: Free + Standard Visual/UX, sync local

**Fecha:** 17-10-2026. **Estado:** CANDIDATO LOCAL AISLADO; NO PUBLICADO / NO ACTIVADO. **Handoff autorizado:** global Atenea upstream PR #152 (Free) + #153 (Standard). No se inicia Train de producto como consecuencia de esta WO.

## Objetivo
Dejar el harness Nexus preparado para unidades nuevas Free/Standard con tres ejes condicionales de revisión (Standards, Spec, Visual/UX si UI impact material), preservando la autoridad de producto/seguridad clínica Nexus y sin intervenir en Go/OpenAI ni sesiones activas.

## Preflight y autoridad
- Repo: b32majus/Hub-Clinico-Badajoz; rama destino publicada: promueve/nexus-v4.
- Base publicada comprobada: de4d40264474243af0bca1dcad8d67bffbf3ac53.
- Rama de preparación: ops/nexus-atenea-153-visual-sync-prep-20261017.
- Worktree nuevo aislado: /srv/kairos-lab/worktrees/promueve-nexus-atenea-153-sync-prep-20261017.
- Upstream Atenea main: 13e07aaaedbeeb7d39d0c0a9d15ad03019423239, PR #152 y #153 MERGED.
- Checkout operacional Nexus estaba limpio pero atrasado respecto a GitHub; NO se cambió su HEAD o archivos. Se creó el worktree desde HEAD remoto verificado.
- Existen procesos OpenCode/Herdr en VPS; ninguno detenido ni reasignado. No iniciar implementación sintética para comprobar la sincronización.
- Se leyeron INDEX, WORK_ORDER_STATUS, acuerdos vivos, estado del arnés, agentes, routing, source Upstream, modelos y permisos.
- Antecedentes: WO #739 Free-only preparada pero sin merge en canónico; WO #737 sincronización Standard anterior. Son procedencia, no permiso de fusionar este nuevo candidato.

## Rutas y alcance
- Actualizar 4 agentes Standard compartidos, de modo aditivo y conservando sus líneas/modelos/permisos previos: atenea-volume.md, atenea-complex.md, atenea-implementer-volume.md y atenea-implementer-complex.md.
- Añadir 10 agentes Free C-087: coordinador, explorer, dos implementers, Standards, dos Spec, dos correctors y merger; además de atenea-review-visual-free.md.
- Añadir atenea-review-visual-standard.md, read-only.
- Añadir documentos Free profile/catalog y los dos contratos Free/Standard Visual v1: docs/ATENEA_FREE_PROFILE_V0.md, docs/ATENEA_FREE_MODEL_CATALOG_V0.md, docs/ATENEA_FREE_VISUAL_UX_ROUTING_V1.md, docs/ATENEA_STANDARD_VISUAL_UX_ROUTING_V1.md.
- Añadir validadores independientes tools/check-free-models.mjs, free-visual-handoff-contract.mjs, check-free-visual-handoff.mjs, check-standard-visual-handoff.mjs y sus dos tests.
- Adaptar solamente AGENTS.md y docs/ATENEA_EXECUTION_ROUTING_V0.md a nuevos handoffs y revisión visual. No copiar toda la política Atenea y no modificar opencode.json.
- Esta WO es la trazabilidad de preparación. Todas las rutas son harness, nunca runtime de producto.

## Contrato de futuras WOs
Cora especificará los siete campos: Cost policy, Risk class, Implementation focus, UI impact, Visual authority, Visual viewport/state, Visual witness. UI impact none no usa reviewer visual; quality usa normas visuales aprobadas y captura real; fidelity exige PNG humano aprobado versionado, SHA256 y captura comparable en mismo viewport/estado. Standards y Spec siguen obligatorios como antes; Visual si corresponde es tercer eje sobre el mismo candidato, no otro Matt review. Se mantiene el máximo de dos correcciones frescas compartidas y el STOP clínico/humano.

## Inventario de autoridad visual Nexus
- Existe skill de QA visual del proyecto: .agents/skills/promueve-visual-qa/SKILL.md.
- Existe docs/PRODUCT_FIDELITY_GATES_V1.md; no sustituir por una estética decidida por el revisor.
- Hay capturas históricas bajo docs/ops/audits/screenshots/, pero no son automáticamente masters de producto congelados.
- Farmacia: dirección visual de EA 0..N aprobada por la responsable en conversación el 17-10-2026; el HTML/PNG de Seguimiento integrado no están publicados/pineados en el repositorio a un hash de master. La futura WO de fidelidad requiere un freeze expreso y trazable; no inventar el SHA.
- Captura real: utilizar el navegador/test o skill existente según el flujo afectado, con datos sintéticos. El pixel transport se verifica en la sesión de subagente; un path sin bytes no es evidencia.
- Handoffs antiguos no se reclasifican ni se alteran mientras están ejecutándose.

## NO TOCA
main, rama canónica y worktrees ajenos; Go y Experimental, aliases/modelos Standard; opencode.json/global; Herdr/TUI/sesiones activas; Matt; código clínico, JS/CSS/HTML, Excel, pacientes y bases de datos; tickets/Trains futuros; push, PR, merge, deploy o borrado de ramas.

## QA / aceptación
1. Git diff limitado a los ficheros de harness declarados, con git diff --check y worktree aislado.
2. Standard: modelos de sus cuatro agentes invariantes; permisos ampliados únicamente para reviewer visual read-only donde aplica.
3. Free: exactamente agentes upstream autorizados, con permisos/perfiles risk-bound; no paid fallback ni Muse Free.
4. Go/Experimental y opencode.json byte-idénticos a base; documentación y AGENTS.md preservan invariantes clínicos.
5. Tests deterministas de handoff Free/Standard, validación de modelos Free + visual y resolución real con opencode debug agents.
6. Preflight upstream Atenea de autoridad, routing, transporte y reviewer lifecycle; sin invocar modelos ni benchmark.
7. El resultado NO acredita real image media delivery durante un futuro Train, visual PASS, ni piloto clínico.

## Reversión
Como no se modifica la rama canónica, basta no integrar el commit candidato. Si alguna futura publicación se autoriza, su reversión exige revert puntual autorizado; no force-push, borrado ni limpieza de trabajo ajeno.

## Commit / publicación / reporte
El handoff autoriza commit **local acotado** en la rama nueva, con reporte final y STOP. No crear issue ni publicar push/PR/merge en esta ejecución. Antes de publicar en GitHub se debe abrir WO/issue aprobado para ese alcance y verificar base, diff y CI. Tras eventual merge autorizado, reconciliar docs/INDEX.md, docs/ops/WORK_ORDER_STATUS.md y backlog vivo si hay cambio operativo real.

## OUTPUT
READY_FOR_CORA_ATENEA_153_SYNC_RECHECK. Reportar HEAD base, SHA local, archivos, comprobaciones, límites, decisiones humanas y estado de sesiones. Cerrar el turno; no ejecutar Train.
