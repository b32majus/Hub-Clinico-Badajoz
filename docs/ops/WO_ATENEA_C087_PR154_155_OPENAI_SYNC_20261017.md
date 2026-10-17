# WO-OPS — Atenea C-087: sync PR #154/#155 de OpenAI y prompt de preparación

**Fecha:** 2026-10-17
**Estado:** CANDIDATO LOCAL AISLADO / PENDIENTE RECHECK / NO PUBLICADO.
**Autorización humana:** handoff global Atenea C-087 (17-10-2026) para diagnóstico y preparación/sincronización de infraestructura; no autoriza push, PR, merge, deploy, inicio de Trains ni activación automática de Sprint/Frontier.

## Objetivo y contexto
Sincronizar las diferencias de Atenea PR #154 y #155 que aún faltan en PROMueve Nexus, conservando PR #780/#782 Free y Standard ya integradas sin repetirlas. Sprint/Frontier son OPERATIVOS por decisión humana, pero requieren activación EXPLÍCITA para cada unidad en una frontera limpia. Mantener literalmente cost_policy: openai_experimental como identificador técnico histórico.

## Base, HEAD esperado, preflight
- Repo destino: b32majus/Hub-Clinico-Badajoz, rama canónica promueve/nexus-v4.
- Base remota comprobada antes de crear worktree: fbe063e58268bc5ba48f0aa721c258ed8e150f37 (PR #782 MERGED).
- Rama local: ops/nexus-atenea-155-openai-prep-20261017.
- Worktree: /srv/kairos-lab/worktrees/promueve-nexus-atenea-155-sync-prep-20261017, aislado del checkout operativo y de los demás.
- Atenea b32majus/Atenea main comprobada: 0874db41b197dbd1f4874a99b529d24e71159fba; PR #152–#155 fusionadas. START_HERE, CURRENT_DECISIONS, prompt C-087 y contratos Visual revisados.
- Leídos docs/INDEX.md, docs/ops/WORK_ORDER_STATUS.md, docs/ATENEA_EXECUTION_ROUTING_V0.md y agentes/config propios del proyecto; anterior sync Free/Standard #780 y reconciliación #782 verificadas. PR clínica #778 ajena al alcance.
- Sesiones OpenCode/Herdr activas en otros worktrees: no modificarlas ni detener procesos.

## Rutas (exactamente estas superficies)
- Actualizar los NUEVE agentes OpenAI existentes conforme a Atenea main: atenea-corrector-openai, atenea-implementer-openai-{sprint,frontier}, atenea-openai-{sprint,frontier}, atenea-review-spec-openai-{sprint,frontier}, atenea-review-standards-openai-{sprint,frontier}. Fuente exacta upstream; no reinterpretar tablas ni cambiar modelos/modes. Coordinadores autorizados a delegar en visual reviewers.
- Añadir los DOS agentes nativos read-only atenea-review-visual-openai-{sprint,frontier}, solo UI impact quality/fidelity.
- Añadir documentos canónicos docs/ATENEA_OPENAI_EXPERIMENTAL_PROFILE_V0.md, docs/ATENEA_OPENAI_VISUAL_UX_ROUTING_V1.md, docs/CORA_TICKET_TRAIN_PREPARATION_PROMPT_C087.md.
- Extender herramientas tools/free-visual-handoff-contract.mjs, añadir tools/check-experimental-openai-visual-handoff.mjs y tools/test-experimental-openai-visual-handoff.mjs (mismos bytes de Atenea).
- Adaptar de manera mínima AGENTS.md y docs/ATENEA_EXECUTION_ROUTING_V0.md como punteros a la autoridad nueva, corrección histórica del estado Free ya publicado y explicitación de los siete campos Visual de handoffs nuevos. No copiar políticas Atenea enteras dentro de AGENTS.
- Esta WO local: docs/ops/WO_ATENEA_C087_PR154_155_OPENAI_SYNC_20261017.md.

## Contrato operativo
- Sprint = volume, escritor Luna High, Standards DeepSeek V4, Spec Sol High, Visual condicional Sol High, corrector Sol High.
- Frontier = complex, escritor Sol High, Standards GLM High, Spec Luna High, Visual condicional Luna High, corrector Sol High.
- Coordinadores/merger/explorer previos preservados. Nada de autopromoción por reset o tokens, fallback, relabeling/alias, ni cambio a mitad de unidad.
- Nuevo prompt C-087 no sustituye selección humana, WOs clínicas aprobadas ni handoffs existentes. No reformular decisiones previamente cerradas.
- Todo handoff nuevo Free/Standard/OpenAI declara Cost policy, Risk class, Implementation focus, UI impact, Visual authority, Visual viewport/state y Visual witness con valores concretos. None => tres campos visuales NONE. Quality => screenshot real y Design System. Fidelity => PNG aprobado repo-local con SHA256 y captura del mismo viewport/estado. Evidencia visual requiere píxeles realmente recibidos, respetando privacidad/credenciales.
- Standards + Spec obligatorios; Visual condicional en el MISMO fixed candidate, tercera evidencia sin ciclo Matt extra, mismo presupuesto máximo de dos correctores frescos por unidad. Go sigue sin revisor visual.
- Prioridad clínica y seguridad de Nexus, no datos reales de pacientes, inferencias terapéuticas ni estado de validación inventado.

## NO TOCA
main, producto (Farmacia/Reuma/Derma), exportaciones, DB, configuración opencode.json, Free/Standard agent files ya publicados, Go, modelos OpenAI/Standard preexistentes, Herdr/TUI, sesiones activas, ramas/worktrees ajenos, handoffs ya aprobados, PR clínica #778 y otros tickets/Trains.

## QA focal, aceptación y reversión
- Comprobar 11 agentes OpenAI iguales a upstream, incluyendo 2 nuevos; para los 9 antiguos identidad de modelos/mode y solo ampliación permitida de subagentes visuales donde procede. Visual reviewers estrictamente read-only.
- Comparar exactitud byte a byte de los seis documentos/tools importados; contratos Free/Standard previos no degradados; Go y opencode.json sin cambios.
- Ejecutar upstream checks (authority, routing, transport, lifecycle y tests Free/Standard/OpenAI), más tests locales de tres cost policies.
- Resolver los 11 agentes desde opencode debug agents y verificar que los modelos declarados están presentes en catálogo cuando sea posible, sin invocarlos. Un debug vacío no prueba ausencia sin confirmar en PTY.
- git diff --check, diff acotado a rutas autorizadas y worktree limpio tras commit. Sin QA navegador, generación de imágenes o test clínico: esta WO solo prepara arnés.
- Si no se publica, no integrar la rama aislada. Tras autorización futura de publicación, revert puntual autorizado del commit; sin force-push, reset/clean, borrado de worktrees o sobrescritura ajena.

## Política de commit, push, PR, merge
Un commit local acotado y reporte READY_FOR_CORA_ATENEA_155_SYNC_RECHECK, STOP. No push/PR/merge ni issue de publicación salvo nueva autorización humana. Antes de eventual PR se verificará issue con status:approved, HEAD remoto, drift, CI y cambios exactos. No iniciar nuevos Trains y no cambiar sesiones activas. Una publicación posterior exige reconciliar INDEX, WORK_ORDER_STATUS y esta WO si cambia el estado real.

## OUTPUT
Rama, base/parent, SHA local, archivos, 11 agentes y su invariancia, contratos y prompt sincronizados, test/CI, estado sesiones, pendientes humanos y límites. No presentar preparación local como integración publicada.
