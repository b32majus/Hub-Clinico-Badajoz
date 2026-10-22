# WO-DOC-FH-EA-RESCUE-PLAN-20261023 · Publicación documental de rescate selectivo

**Issue:** [#815](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/815) (`status:approved`, `type:docs`).
**Fecha:** 2026-10-23. **Estado:** WO documental en rama de PR; no cambia el producto.
**Autorización:** responsable del producto solicita documentar/publicar directamente en GitHub desde ChatGPT el plan de rescate ya expuesto. Autoriza documentación y preparación/publicación de PR de su alcance; **merge no autorizado**.

## OBJETIVO Y CONTEXTO

Dejar trazado el cierre del intento local FH-EA-G2-CTX-01 (G2 BLOCKED + HUMAN STOP, 2/2), la reutilización selectiva de reglas y tests del candidato G2 y la continuidad de T01 publicada, sin presentar un almacén IndexedDB como arquitectura aprobada. Evitar contradicciones con el plan EA del 17-10-2026. La publicación de un plan no constituye aceptación de EA longitudinal, inicio de R1..R5 ni aptitud de piloto.

## BASE, HEAD Y PREFLIGHT

- Repositorio: b32majus/Hub-Clinico-Badajoz.
- Canónica: `promueve/nexus-v4@9dac9d3c0d5a28ed6d3464f81419d71ffd8128c7` comprobada en GitHub el 2026-10-23.
- Rama documental creada desde ese SHA: `docs/fh-ea-rescue-plan-20261023`; ningún cambio sobre `main` ni la canónica.
- Estado G2: rama/worktree local `work/fh-ea-g2-patient-authority-20261022@33c39e8`, candidato fijo `707efef`, revisiones Standards+Spec FAIL; no publicada. Rama A original separada, preservada.
- Leídos INDEX, WORK_ORDER_STATUS, PLAN_FH_EA_0N_MULTISURFACE_DESTINATIONS_20261017, Spec FH EA v0.5, G0 v0.4, Architecture Freeze, ADR-005/006, alineamiento FH V4, F4.4/F4.5, rutas T01 y diff G2.
- PR #778 sigue abierta e independiente; issue #721 abierto sin status:approved; issue #671 con status:approved solo para su alcance documental.

## RUTAS EXACTAS

1. `docs/ops/PLAN_RESCATE_FH_EA_NEXUS_20261023.md`: propuesta completa R0..R5, inventario rescate, criterios y STOP.
2. `docs/ops/WO_DOC_FH_EA_RESCUE_PLAN_20261023.md`: WO, trazabilidad y controles.
3. `docs/INDEX.md`: apuntador a rescate en bloque FH EA.
4. `docs/ops/WORK_ORDER_STATUS.md`: publicación documental propuesta y estado funcional sin reinterpretar T01/G2.
5. `docs/ops/PLAN_FH_EA_0N_MULTISURFACE_DESTINATIONS_20261017.md`: adenda de precedencia operativa del rescate, conservando resto del plan.

## NO TOCA

Todo código HTML/JS/CSS, tests, fixtures XLSX, herramientas/arnés, Excel, G0 master/PNG, contratos clínicos, otros servicios, `main`, `promueve/nexus-v4`, worktrees EA existentes, PR #778, #721, F4.5 ni Deploy. No introducir decisión técnica de R1..R5 como ejecutada ni ratificación clínica institucional. Ningún dato real de paciente ni credenciales.

## QA, CRITERIOS DE ACEPTACIÓN Y REVERSIÓN

- Diff limitado a las cinco rutas, Markdown y enlaces relativos coherentes, sin instrucciones destructivas.
- Consistencia obligatoria: T01 publicada con captura en memoria y guardias; G2 BLOCKED local; plan R0 documental; R1..R5 propuestas NO aprobadas, sin IndexedDB clínico, y cero afirmaciones de Excel roundtrip.
- PR vinculada a issue #815 aprobado, con base `promueve/nexus-v4`; revisar head y diff real en GitHub antes de cierre.
- `git diff --check` y chequeo de referencias/links; no QA de navegador porque no cambia producto.
- Reversión mediante revert documental autorizado o cierre sin merge de la PR; preservar ramas G2 y trabajo ajeno. Sin reset, clean ni force-push.

## PUBLICACIÓN / REPORTE

Se permiten commits documentales en rama, push y PR por la petición actual. **No merge** salvo autorización específica; ninguna ejecución de R1..R5 implícita. Tras merge autorizado, verificar HEAD canónico/CI si aplica y conciliar estado; hasta entonces etiquetar «publicado en rama/PR, pendiente de merge», nunca «vigente en canónica».

OUTPUT: issue #815, SHA de rama, rutas, comprobaciones, PR y estado exacto de publicación.
