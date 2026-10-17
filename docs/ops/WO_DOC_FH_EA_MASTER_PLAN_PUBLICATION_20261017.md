# WO-DOC — Publicación del plan EA 0..N multisuperficie y destinos

**Fecha:** 2026-10-17
**Estado:** WO de PUBLICACIÓN DOCUMENTAL del PLAN PROPUESTO; sin aprobación de tickets técnicos, sin código clínico y NO PILOTO.
**Issue aprobada:** [#791](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/791), `status:approved`. La aprobación se limita a esta WO documental.

## Objetivo y alcance
Versionar como propuesta viva el plan maestro para captura FH de EA 0..N, relaciones por episodio/observación, Quick View, Dashboard, Estadísticas, salida CSV longitudinal y tres modalidades de destino (Excel manual, Excel Bridge y API/BD futura). El plan indexa 20 WOs EA-00..19 como *candidatas*, no tickets aprobados. La implementación posterior exige handoff/WO propia, decisiones G0 y C-087 #156.

## Repo, base y preflight
- Repositorio: b32majus/Hub-Clinico-Badajoz; destino canónico `promueve/nexus-v4`.
- HEAD base remoto exacto al preparar: `f37405b5a8d19456a6a976bb7e3a08e754e61387` (merge #790). Volver a verificar antes de publicar/mergear.
- Worktree aislado: `/srv/kairos-lab/worktrees/promueve-nexus-fh-ea-plan-doc-20261017`; rama `docs/fh-ea-plan-v04-20261017`.
- Checkout operacional no actualizado y limpio; OpenCode/Herdr activos, fuera de alcance.
- Fuentes primarias leídas: `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, alineamiento EA/FEDRA, contrato analítico longitudinal, ADR-006, contrato y dossier F4.5, PR #747 y #778, #671/#721, arnés C-087 #156.
- Fuente de propuesta: `PROMueve_FH_EA_Plan_Maestro_v0_4_PROPUESTA_20261017.md` y ZIP de 20 fichas; contrato FH v0.3 y maqueta locales (no aprobados institucionalmente). La versión publicada incorpora **corrección factual del estado F4.5** según GitHub: DTO fase 1 ya publicado por PR #747, mapping y runtime no aprobados.

## Rutas exactas — cuatro Markdown
1. NUEVO `docs/ops/PLAN_FH_EA_0N_MULTISURFACE_DESTINATIONS_20261017.md`.
2. NUEVO `docs/ops/WO_DOC_FH_EA_MASTER_PLAN_PUBLICATION_20261017.md`.
3. `docs/INDEX.md`: una fila de plan **publicado como propuesta**.
4. `docs/ops/WORK_ORDER_STATUS.md`: una fila documental, ninguna funcionalidad EA 0..N como implementada.

## NO TOCA
`main`, producto clínico, Follow-up, Quick View, Dashboard, Estadísticas, Export V2, adaptadores, Processor, workbook, API/backend, F4.4/F4.5 runtime, modelos/permisos, `opencode.json`, sesiones/TUI/Herdr activas, otros worktrees/branches, PR #778 y WOs #671/#721. No crear veinte issues, no ejecutar EA-00/01/02, no inventar validación FH/FEDRA/MedDRA ni datos reales.

## Validación y QA documental
- `git diff --check` y árbol limpio tras commit; exactamente cuatro rutas autorizadas.
- Verificación de referencias repo-locales y Unicode, preservando CRLF de INDEX y WORK_ORDER_STATUS.
- Plan contiene 20 referencias EA-00..EA-19, status propuesta, G0-G4, dependencias/destinos separados, y límites del CSV y Excel L0/L1/L2.
- Contrastar F4.5 fase 1 con PR #747 y `docs/contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md`, y PR #778 todavía OPEN. No afirmar aprobación de #721, publicación de WOs candidatas o experiencia clínica/QA browser.
- Revisar PR y CI del commit exacto, con base/HEAD sin deriva. Una validación documental no acredita funcionalidad ni piloto.

## Reversión y gobernanza
Preparar un commit acotado en worktree aislado. Push solo de esa rama, PR contra `promueve/nexus-v4` con issue `status:approved`, y merge solo si CI completa verde y revisión sin defectos materiales. Si hay drift/CI roja/bloqueo, STOP. Reversión mediante revert puntual autorizado; no reset, no force-push ni borrar worktrees/ramas. Tras el merge, verificar los documentos publicados y cerrar #791 completed; la propia fila de INDEX/STATUS describe solo el estado documental. Para cualquier trabajo técnico se requiere un nuevo GO humano.

## OUTPUT
WO #791 / PR documental / commit candidato y merge, CI, cuatro rutas, estado de los documentos, checkout operacional y límites de la propuesta. **No ejecutar Trains ni crear otras issues.**
