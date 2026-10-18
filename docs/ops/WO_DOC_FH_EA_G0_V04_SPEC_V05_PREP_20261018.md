# WO-DOC #793 · Preparación y publicación de autoridad FH EA G0 v0.4 y especificación v0.5

**Corte:** 2026-10-18. **Estado de preparación:** `ASSET_TRANSFER_PASS_3_OF_3`. **WO documental [#793](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/793) `status:approved`, publicación acreditable solo tras merge verificado; T01 `NO_READY_TO_LAUNCH`.**
**Autorización humana:** «adelante» para preparar WO documental y, tras aclarar qué es worktree, «ok, sigue» para crear worktree aislado y preparar sus archivos. **Esa aprobación inicial no autorizaba publicación. La autorización posterior «adelante» (18-10-2026) habilita crear issue #793, commit/push en esta rama, PR y merge solo si sus checks y revisión documental son verdes. No autoriza commit de implementación, despliegue, OpenCode ni arranque de T01.**

## Objetivo y autoridad

Preparar para publicación posterior la composición G0 v0.4 de Seguimiento FH para EA 0..N aceptada en conversación, el contrato v0.5 aceptado como base de Ticketing (no ratificado institucionalmente), y el handoff C-087 **candidato** de T01. Alinear G0 con el plan publicado como propuesta [PR #792](../ops/PLAN_FH_EA_0N_MULTISURFACE_DESTINATIONS_20261017.md), Atenea C-087 y PR #156. No convertir las siete fichas T01–T07 en issues aprobados por esta preparación.

## Base y preflight verificados

- Repo `b32majus/Hub-Clinico-Badajoz` rama `promueve/nexus-v4`.
- Base remota verificada: `7c0b7bea2c16d8d2e10f16993603e954ea8a408e` (fotografía 18-10, revalidar antes de aprobar/push).
- Worktree creado sin mover la rama canónica ni tocar checkout operativo: `/srv/kairos-lab/worktrees/promueve-fh-ea-g0-spec-t01-doc-prep-20261018`, rama `docs/fh-ea-g0-spec-t01-prep-20261018`.
- Fuentes: `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, plan EA, contrato EA/FEDRA publicado, F4.5 fase 1, PR #778 OPEN (incluye cambios en INDEX; no mergear ni sobrescribir), `docs/ATENEA_EXECUTION_ROUTING_V0.md`, `docs/CORA_TICKET_TRAIN_PREPARATION_PROMPT_C087.md` y `docs/C087_THIN_WRITER_REVIEW_AND_EVIDENCE_RECOVERY_20261017.md`.
- Arnés observado: `opencode.json`, perfiles en `.opencode/agents/`; no asumir `opencode.jsonc`. Revalidar agentes/permisos al preparar lanzamiento real.

## Rutas exactas previstas para la futura WO documental

1. `docs/product/fh-ea/g0-v0.4/G0_Seguimiento_EA_v0_4_MASTER_VISUAL_APROBADO_LOCAL.html` — original visual (sin cambiar bytes).
2. `docs/product/fh-ea/g0-v0.4/G0_Seguimiento_EA_v0_4_Captura.png` — **PRESENTE; SHA-256 original verificado**.
3. `docs/product/fh-ea/g0-v0.4/G0_Seguimiento_EA_v0_4_Causalidad.png` — **PRESENTE; SHA-256 original verificado**.
4. `docs/product/fh-ea/g0-v0.4/ACCEPTANCE_AND_SHA256.md` — acta aprobada en conversación, NO piloto.
5. `docs/product/fh-ea/g0-v0.4/ASSET_TRANSFER_GATE.md` — transferencia completada localmente y verificación de hashes.
6. `docs/contracts/FH_EA_0N_SPEC_V0_5_PRODUCT_BASE_20261018.md` — especificación funcional v0.5, aceptada para Ticketing; resto clínico/institucional pendiente.
7. `docs/product/fh-ea/g0-v0.4/T01_TICKET_CANDIDATE.md` — ticket candidato, no issue aprobado.
8. `docs/handoffs/FH_EA_T01_CAPTURA_0N_C087.md` — handoff `NO_READY_TO_LAUNCH`; no invocar agente.
9. `docs/ops/WO_DOC_FH_EA_G0_V04_SPEC_V05_PREP_20261018.md` — esta WO de preparación.

**INDEX / WORK_ORDER_STATUS:** se añaden únicamente dos filas documentales (11 rutas totales en #793), preservando su CRLF, sin editar PR #778 ni dar por fusionado su registro G0. La PR #778 podrá requerir reconciliación tras la publicación de #793; no se toca dentro de este alcance.

## Contrato de integridad y QA

- Copiar **bytes originales**, nunca regenerar capturas PNG ni cambiar hashes sin nueva aceptación humana.
- `sha256sum` exacto: HTML `6dae55cb9b25372ad4c32904a7319b41ee16a71e197e6072eb411a5b6cd6bdd9`; Captura `3ce6059642b490526bcde774bead2a35913c034d9e295e67ad7c5e90bc557e34`; Causalidad `a7a58f89540aa39289e6379a6eb91f6dd78901fe62afb72d01e4eeb7a91c0ce0`.
- Comprobar solo rutas previstas, integridad de textos y diferencias respecto al HEAD base; `git diff --check` y enlaces. **No** ejecutar suites clínicas para Markdown/prototipo ni prometer QA de aplicación.
- La evidencia anterior 10/10 corresponde a maqueta sintética (Chromium con `page.set_content`), no a producto ni piloto. No citar captura del mockup como QA real.
- Gate documental: **3 de 3 archivos visuales** presentes y sus hashes correctos; `LOCAL_ASSET_TRANSFER_PASS_3_OF_3`. Pendientes autorización y publicación GitHub; no es `ATENEA_FIDELITY_AUTHORITY_IN_REPO`.

## NO TOCA / reversión

No `main`, no código Farmacia ni cambios de dominio/export/Bridge/DB, no T02–T07, no modelos ni agentes, no worktrees ajenos, no PR #778, no datos reales ni credenciales. La rama/worktree independiente permite abandonar preparación sin tocar el checkout operacional, pero **no borrar**, limpiar/reset, mover refs ni aplicar revert sin autorización.

## Política Git y checkpoint

Esta WO tiene issue propia [#793](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/793) `status:approved` y autorización específica de publicación documental. Confirmar HEAD y asset gate, validar 11 rutas, enlaces, hashes, diff/CI; push/PR solo en rama aislada y merge de esa PR solo con checks verdes y sin drift. Reversión mediante revert acotado autorizado, sin reset/force-push ni borrados. T01 requiere issue propio, G0 publicada, pruebas focales y selección explícita del perfil, además del GO humano.

**OUTPUT / STOP:** informar worktree/rama/base, las 11 rutas, hashes 3/3 PASS, issue/PR/CI/merge verificados y límites clínicos; el prompt pointer-first permanece **solo como plantilla, no para ejecutar**. Sin iniciar T01.
