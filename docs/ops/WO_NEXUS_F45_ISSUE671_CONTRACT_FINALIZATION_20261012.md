# WO-DOC-NEXUS-F45-ISSUE671-CONTRACT-FINALIZATION-20261012

**Estado:** `CANDIDATO LOCAL PARA APROBACIÓN HUMANA`. Ningún token, error o DTO nuevo se declara `CONTRACT_ACCEPTED`. No hay código implementado.

## Objetivo / contexto / decisión humana previa

Producir un **candidato de cierre documental acotado** para [#671](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/671): con el alcance funcional ratificado el 2026-10-12 (primera capacidad F4.5 = Export V2 manual; L2 aplazado), concretar la forma mínima de solicitud/resultado/evidencia, capacidades y errores para que la persona responsable pueda aceptar o modificar la propuesta. Reutilizar el candidato revisado C-087 `3cd87a578290e5f5ceb5e00ef1cff4d27e6fd858` sin repetir el train ni modificar el worktree anterior. #721 sigue bloqueado.

## Base / HEAD esperado / preflight

- Repo `b32majus/Hub-Clinico-Badajoz`; base canónica verificada `promueve/nexus-v4@a0556d6ef674c85ecae21308ec06fd6f9f920c85`.
- Rama aislada `docs/nexus-issue671-f45-contract-final-20261012`; worktree `/srv/kairos-lab/worktrees/promueve-nexus-issue671-final-contract-20261012`.
- Se recuperó **exclusivamente** el blob del contrato del candidato `3cd87a5` sobre la base canónica, sin cherry-pick de los dos commits locales de handoff/sincronización Atenea.
- Verificar HEAD base, worktree ajeno sin cambios, issue #671 `status:approved` solo para documentación local, #721 sin `status:approved`, `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` leídos. Revalidar GitHub antes de cualquier publicación futura.

## RUTAS / alcance / NO TOCA

- `docs/contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md`: conservar Q-1..Q-4 y 18 oráculos; añadir una **propuesta técnica de cierre** con tokens, DTO y errores explícitos **PENDIENTE_APROBACION_HUMANA**; no editar el mapping clínico.
- `docs/ops/WO_NEXUS_F45_ISSUE671_CONTRACT_FINALIZATION_20261012.md`: este registro de alcance, preflight, QA y política. **Dos Markdown exactos**.
- **NO TOCA** `main`, la rama canónica, ningún otro worktree/commit, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` (sus fotografías históricas requieren WO documental aparte), código/contract F4.4, scripts Export V2, tests, UI, Office Script, workbook, backend, Farmatool, Atenea, routing, tokens de modelos ni #721. No datos reales, secretos, endpoints o identificadores hospitalarios.

## Riesgos y límites clínicos

- Export V2 de 152 columnas es proyección tabular, **no** portador lossless de F4.4. `prepared_for_transfer` solo acredita artefacto realmente preparado, sin pegado o persistencia demostrados.
- Mapping de bloques opacos Pharmacy Act→Export V2 **no está aprobado**; se debe definir y verificar antes de cualquier éxito, con 0/1/N líneas y fallos seguros. Ningún dato terapéutico se deduce de etiquetas, catálogo, historia o ausencia.
- `attemptId` no equivale a deduplicación; `destination.kind` es capacidad lógica, no libro/hoja; procedencia declarada ≠ autenticación institucional.
- La modalidad `pharmacy_act_full` y el codec L2 quedan diferidos sin simulación de disponibilidad. El alcance inicial propone `manual_copy`, no descarga ni Bridge.

## Tests / QA / aceptación / responsable

- **Cora, revisión documental focal:** `git diff --check BASE..HEAD`; 2 rutas exactas; `grep -c '^### O-[0-9][0-9] ' docs/contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md` = 18; 18 oráculos originales no debilitados; coherencia con ADR-005/006 y matriz F4.4↔V2; no prometer mapping, codec, persistencia ni piloto.
- **Cora:** verificar que tokens de la sección propuesta y valores de ejemplo coinciden, condiciones negativas cubiertas, evidencia `external:null`, `persistence:'none'` y la coexistencia con la propuesta general previa está inequívocamente marcada `PENDIENTE_APROBACION_HUMANA`.
- Sin nuevas suites ni QA navegador/Excel: **solo Markdown**. No investigar ni reparar tests ajenos.
- **Criterio de entrega:** SHA local fijo, diff focal, documento listo para **aprobación o corrección humana concreta**. No declarar `CONTRACT_ACCEPTED` antes de aceptación explícita.

## Reversión / publicación / HUMAN STOP / OUTPUT

Revert local focal de este commit únicamente si la persona responsable lo autoriza; nunca reset, force-push, borrar worktrees ni sobrescribir cambios ajenos. Esta autorización permite documento y commit **local**, no issue nuevo, push, PR, merge, despliegue ni cambio de etiquetas/cierre de #671. Cualquier decisión material no cubierta exige HUMAN STOP y pregunta precisa; no pedir al agente que la invente. Q-1..Q-4 no se reabren.

**OUTPUT:** propuesta de forma exacta, valores candidatos, fallos y capacidades para decisión humana; commit local, pruebas focales y reporte. Solo tras aceptación se propondrá **otra acción expresamente autorizada** para publicar #671 y preparar la primera WO de mapping segura de #721.
