# WO-OPS — Atenea C-087 PR #156 · ejecución ligera y recuperación de evidencia

**Fecha:** 2026-10-17
**Estado final:** PUBLICADO EN GITHUB / ARNÉS VERSIONADO / NO ACTIVADO EN TRAINS NI SESIONES YA INICIADAS. [PR #788](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/788) MERGED, [WO #787](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/787) CLOSED/completed. Reconciliación [WO #789](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/789).
**Autorización:** handoff global Atenea C-087 PR #156 (solo sincronización incremental, validación y READY_FOR_CORA_ATENEA_156_SYNC_RECHECK). **STOP** antes de issue, push, PR, merge, deploy o Train.

## Objetivo y contexto
Incorporar la corrección operativa de Pallet Sure M1-B.2 a las futuras unidades PROMueve, sin repetir #152–#155 y sin cambiar modelo, permisos, routing, presupuestos, producto ni workflow Matt: una delegación coherente por unidad, retorno vacío fail-closed, revisión Standards/Spec y Visual condicional en el mismo SHA, evidencias focalizadas y lanzamiento pointer-first.

## Base / preflight y autoridad
- Repo receptor: b32majus/Hub-Clinico-Badajoz; canónica promueve/nexus-v4.
- HEAD publicado verificado: f4274fb05f6630a180affa44fa7b7bc5c9d30e96.
- Preparación nueva y aislada: ops/nexus-atenea-156-thin-recovery-prep-20261017 en /srv/kairos-lab/worktrees/promueve-nexus-atenea-156-sync-prep-20261017.
- Atenea main verificado: 355681fc1d8a12d33702e875f571b9daca91c731; PR #156 MERGED.
- Leídos INDEX, WORK_ORDER_STATUS, routing, prompt C-087 vigente, autoridad Visual/UX y contrato PR #156; confirmado que las PR Nexus #780, #782, #784, #786 ya estaban integradas; checkout raíz Nexus limpio pero atrasado (mantener).
- Procesos OpenCode/Herdr vivos en VPS: no se editaron ni reiniciaron. No lanzar implementadores sintéticos ni model bakeoffs.
- Nota de personalización legítima: Atenea main incluye en atenea-go.md modelo opencode-go/deepseek-v4.1-flash; Nexus canónico usa opencode-go/mimo-v2.6-flash. El modelo Nexus SE CONSERVA. Solo anexar la cláusula de PR #156.

## Rutas autorizadas
- 13 agentes: coordinadores atenea-{volume,complex,free,go,openai-sprint,openai-frontier} y escritores atenea-implementer-{volume,complex,free,free-complex,go,openai-sprint,openai-frontier}; solo cláusula aditiva final C-087, sin alterar frontmatter/model/permissions/role.
- Nuevo docs/C087_THIN_WRITER_REVIEW_AND_EVIDENCE_RECOVERY_20261017.md, copiado de Atenea main.
- Actualizar únicamente docs/CORA_TICKET_TRAIN_PREPARATION_PROMPT_C087.md y los tres contratos existentes de Visual/UX para Free, Standard y OpenAI; mantener contenido previo, importar diffs mínimos de #156.
- Enlace local y pauta pointer-first mínima en AGENTS.md y docs/ATENEA_EXECUTION_ROUTING_V0.md. Mantener autoridad clínica de PROMueve y todos los perfiles existentes.
- Esta WO local en docs/ops/WO_ATENEA_C087_PR156_THIN_RECOVERY_SYNC_20261017.md. INDEX/WORK_ORDER_STATUS se reconciliarán solo después de publicación efectivamente autorizada, en WO documental aparte.

## Contrato operativo protegido
- Una sesión escritora coherente por unidad autorizada; sin fases Writer 1/2 inventadas. Task graph multiunidad Matt legítimo.
- Retorno vacío -> INCOMPLETE_WRITER_RESULT. Solo inspección read-only de la sesión original, worktree y SHA, a lo sumo una continuación focalizada en la MISMA sesión si segura/soportada; si no, HUMAN STOP. No reintentos ni escritor de prueba.
- Reviews: mismo SHA congelado, Standards+Spec obligatorios, Visual condicional solo para perfil/UI impact permitido, preferentemente misma ventana concurrente cuando permita Matt/OpenCode; si se serializan, solo una vez cada eje, consolidar antes de corregir. Máximo dos correctores frescos por unidad. Go sin Visual.
- Tests y capturas focalizados, reutilización de fixtures autorizados; máximo una reparación ambiental acotada cuando autorizada. Autenticación sintética no prueba persistencia real.
- Launcher pointer-first: @docs/handoffs/aprobado, unidad exacta autorizada y checkpoint STOP. No duplicar matriz de modelos, protocolo, specs y tests; no reescribir handoffs históricos.

## NO TOCA
main; producto clínico (Farmacia/Reuma/Derma), HTML/CSS/JS/Excel/CSV; opencode.json; bindings/modelos/roles/permisos; PR clínicas en curso; sesiones activas/herdr/TUI persistente; trabajo ajeno; redes de pacientes, secretos, VPS infrastructure; ramas remotas y WOs nuevas. No proveedor/timeout/daemon o ciclo de revisión nuevo.

## Tests/QA y aceptación
1. Cada cambio de agente es adición al final; comparar modelo, mode, permisos y rol contra HEAD receptor exacto; Go Mimo preservado; no cambio en otros agentes.
2. Documento canónico idéntico byte a byte; prompt y tres contratos visuales igualados a Atenea PR #156 en contenido, salvo fin de línea local.
3. Ejecutar node /srv/kairos-lab/Atenea/tools/test-c087-thin-execution-recovery.mjs y controles canónicos pertinentes, sin modelos ni Trains; tests visuales locales Free/Standard/OpenAI existentes.
4. Resolver agents en OpenCode del worktree mediante debug agents en PTY si la salida no interactiva fuera vacía; validar Go Mimo y roles sin invocar.
5. Verificar diff --check, solo rutas enumeradas, todo sintético y worktree limpio tras commit local. No afirmar browser QA, producto, real reviewer pixels o piloto.

## Reversión / política Git
Antes de publicación, no integrar el commit local. No reset, clean, force-push, borrar ramas/worktrees ni limpiar trabajo ajeno. Si luego se autoriza publicación, verificar issue con status:approved, rama base/HEAD/CI; revert puntual con autorización si necesario. En esta WO solo 1 commit local, **NO push/PR/merge**, sin activar el arnés en unidades iniciadas.

## OUTPUT
READY_FOR_CORA_ATENEA_156_SYNC_RECHECK, con versiones, commit,parent, 21 rutas esperadas, validaciones, Go binding preservado, sesiones no alteradas, límite de publicación y HUMAN STOP ante cualquier fallo material.

## Postmerge — reconciliación PR #156 (2026-10-17)

- **Hecho publicado:** [PR #788](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/788) MERGED en `promueve/nexus-v4`, merge `e29eee112ba68191a4d2f75bca3f4a9f7acc70d1`; candidato `b122ebb6841b97035245c6edca77785bda1c86ea`, padre exacto `f4274fb05f6630a180affa44fa7b7bc5c9d30e96`. [WO #787](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/787) CLOSED/completed; 21 rutas solo arnés/documentación.
- **QA:** [CI Nexus #39065037459](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/39065037459) SUCCESS. En preparación local: contrato y controles C-087 PASS, regresiones Free/Standard/OpenAI PASS, 13 agentes resueltos por OpenCode, frontmatter/modelos/permisos intactos, Go local `opencode-go/mimo-v2.6-flash` preservado.
- **Fases de autorización:** el STOP original antes de push/PR/merge era aplicable exclusivamente a la preparación local. Posteriormente se autorizó publicar, y tras la CI verde, fusionar y reconciliar. Se conserva la instrucción anterior como historial; no representa el estado actual publicado.
- **Aplicabilidad:** protocolo y lanzamiento pointer-first versionados en GitHub para futuras unidades con autorización humana y frontera limpia. No se alteran sesiones OpenCode/Herdr ni Trains activos.
- **Limitaciones:** un contrato y la CI del arnés no demuestran recuperación real de respuestas vacías, concurrencia efectiva de revisores, transporte de PNG, QA funcional clínico, persistencia ni aptitud para piloto.
- **Reconciliación administrativa:** [WO #789](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/789). Solo cambian este documento, `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md`; PR clínica #778 permanece separada.
