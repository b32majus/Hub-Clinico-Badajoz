# Índice documental maestro — Hub Clínico Badajoz / PROMueve Nexus

| Metadato | Valor |
| --- | --- |
| Última actualización | 2026-10-04 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Línea Farmacia de procedencia | `origin/recovery/farmacia-pr-replay-20260727`; **HISTORICAL** para nuevo desarrollo desde el merge de PR #381; conserva la historia funcional Farmacia y la trazabilidad del snapshot |
| Autoridad canónica de desarrollo (F0.2) | `origin/promueve/nexus-v4` **ACTIVE** desde el merge autorizado de PR #381 (2026-09-24). Nació de `a8cec03522017a1f4b68e18b92c944601659c84f` con equivalencia inicial exacta. Último HEAD de producto Nexus verificado tras PR #490: `3bf45760a27630823b61b0d19da8b64aeb060693` (TRAIN-NEXUS-FARMACIA-ACT-CONTRACT-11 #487 / F4.4 Pharmacy Act v1; candidate `535c65567bc8ca0aef7358f97f99d97520b0ff20`); HEAD de producto anterior: `a04a0ace25012e5f0ac397844165921dccaebcc3` (corrección PV-001, WO #482 / PR #484; candidate `75063f25b5cf3de008ab882392b9387f5fdea9c1`); HEAD anterior a este: `91262d8007642aef1d3cbe21e24d20ff369ee19b` (PR #478); los merges documentales posteriores pueden mover el tip Git sin cambiar ese HEAD de producto. Detalle de transición: [`ops/PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md`](ops/PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md) |
| Tip Git de recovery (volátil) | Consultar GitHub live; verificado 2026-09-24 tras PR #374: `771fb80c5081aa974b86d6a0119ab30059970a25`. Puede avanzar por commits documentales/administrativos sin cambiar producto. |
| Último HEAD de producto Farmacia en recovery histórico | `771fb80c5081aa974b86d6a0119ab30059970a25` (merge PR #374 — robustez de resolución de hojas Enfermería v6 / FH-DEBT-002/003) |
| Último HEAD de producto publicado PROMueve Nexus | `3bf45760a27630823b61b0d19da8b64aeb060693` (merge PR #490 — TRAIN-NEXUS-FARMACIA-ACT-CONTRACT-11 #487, F4.4 Pharmacy Act v1; candidate `535c65567bc8ca0aef7358f97f99d97520b0ff20`; evaluación sintética). HEAD de producto anterior: `a04a0ace25012e5f0ac397844165921dccaebcc3` (merge PR #484 — corrección PV-001, WO #482); HEAD anterior a este: `91262d8007642aef1d3cbe21e24d20ff369ee19b` (merge PR #478 — TRAIN-NEXUS-FARMACIA-F4.3-CLOSEOUT-09.1 #475); HEAD anterior: `e64b65db29e6536c01e4f41e182fb157ac19ce2a` (merge PR #467) |
| HEAD clínico funcional congelado | `e1120ba85817a1807cea8c1e938867ad778921f4` (PR #341; `source_sha`/`last_functional_sha` del snapshot 0.6) |
| Candidate Train C | `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` |
| CI del último HEAD Farmacia histórico | Farmacia smoke run `35936756453` `success` y Pages build/deployment run `35936755598` `success` sobre `771fb80c5081aa974b86d6a0119ab30059970a25` |
| CI del último HEAD Nexus | PR #490 head `535c65567bc8ca0aef7358f97f99d97520b0ff20` → merge `3bf45760a27630823b61b0d19da8b64aeb060693`; CI post-merge `Nexus deterministic gates` run `36880209718` `success`. Anterior: PR #484 head `75063f25b5cf3de008ab882392b9387f5fdea9c1` → merge `a04a0ace25012e5f0ac397844165921dccaebcc3`; post-merge run `36771991874` `success`. CI de PR #478: head `f82bd24ce14811627881d184ae37131bbda98ca9` → merge `91262d8007642aef1d3cbe21e24d20ff369ee19b` (padre base `bf0cb3dde91965168effb00d6f119624e43bd764`, merge de PR #474); post-merge run `36744075965` `success`. CI de PR #467: head `773ee93694f64626dfb1007a069da018a7023a96` → merge `e64b65db29e6536c01e4f41e182fb157ac19ce2a`; candidate run `36645555852` y post-merge run `36645661418` `success`. |
| `origin/main` verificado | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68` |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.6` (issue #345 / PR #346; manifest source `e1120ba85817a1807cea8c1e938867ad778921f4`) |
| Snapshot 0.6 candidate | `749c82409a415e800500b39018027b189fd6a131` |
| Snapshot 0.6 publicación | merge `19d10c9abefb7b25130b4b17e3289d54a17315ee` (PR #346) |
| Paquete externo | `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`; no refrozen por PR #333/#335/#337/#341/#346 |
| Actividad del servicio | Demo |
| Alcance | Evaluación con datos sintéticos; sin piloto / sin producción |
| WO / instrucción vigente | Consultar GitHub live; este índice no fija una WO “actual” estática para evitar deuda circular tras cierres documentales |
| Reconciliación de producto viva | [`ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`](ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md) — autoridad viva posterior a la reunión Farmacia+Dermatología y revisión manual FH; prioridad pre-Badajoz `UNDER_READJUDICATION` hasta ledger+Q&A Reuma |
| Auditoría manual anterior | [`ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md) — revisión septiembre cerrada / `PARTIALLY_PUBLISHED`; conserva trazabilidad y estados explícitos de hallazgos no implementados |
| Unified Clinical Intake V0 | **PUBLICADO Y VERIFICADO**: baseline T1–T10 + hardening; A auto-reveal (#334/#335); B D17_EXT_V1 (#336/#337); Train C C1/C2 (#338/#339/#340) promovido por #342/#341 |

## Architecture Decision Freeze — 2026-09-24

La dirección futura de plataforma queda adjudicada en:

- [`architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md`](architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md) — autoridad de arquitectura de ingeniería para el Foundation de PROMueve Nexus;
- [`architecture/adr/`](architecture/adr/) — ADR-001…ADR-008;
- [`ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`](ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md) — dependencias, WOs candidatas y lanes de ejecución;
- [`architecture/reviews/`](architecture/reviews/) — baseline, revisión adversarial, alignment y revisión final de completitud preservados como evidencia, no como autoridad automática.

**El freeze no cambió por sí mismo la autoridad Git ni el estado asistencial.** La transición separada F0.2 sí fue publicada después: PR #381 está mergeada y `promueve/nexus-v4` es desde entonces la rama **ACTIVE** para nuevo desarrollo; recovery queda **HISTORICAL**. `main` y snapshots congelados no cambian. PROMueve sigue en evaluación sintética, no piloto/producción.

**Transición Git F0.2 (#380/#381):** `promueve/nexus-v4` fue creada desde `a8cec03522017a1f4b68e18b92c944601659c84f` con equivalencia inicial demostrada (mismo commit, mismo tree, diff vacío, cero cherry-pick/rewrite). PR #381 se fusionó el 2026-09-24; por tanto Nexus está **ACTIVE** y recovery **HISTORICAL** para nuevo desarrollo. Detalle en [`ops/PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md`](ops/PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md).

Principios nuevos/reconciliados que prevalecen para trabajo futuro cuando exista conflicto con documentos históricos: monolito modular; Home hospitalaria sin carga clínica; site fijo por deployment; qualification hospital×módulo; configuración mínima y gobernada por propiedad; Read Ports por módulo mediante strangler; acto completo independiente de Excel; Excel como adapter soportado con garantías explícitas; no paciente universal/V5 genérica ahora.

**Reconciliación de producto 2026-10-03 (#501):** la reunión Farmacia+Dermatología y la revisión manual FH abren una autoridad viva posterior a septiembre. Dermatología pasa a ser módulo real candidato de Nexus; HS/PsO son las primeras verticales longitudinales previstas; eccema de manos queda `AWAIT_TEAM_INPUT`; Farmacia conserva como decisiones de producto la simplificación de Inicio/Validación, futura superficie `Pendientes`, semántica explícita de `PENDIENTE_RECOGIDA`, separación solicitud clínica por molécula vs selección CIMA en FH, soporte de tratamiento preexistente y revisión del reporting. La prioridad humana previa queda `UNDER_READJUDICATION / PRE-BADAJOZ` hasta reconstruir el ledger Reuma contra Nexus y realizar Q&A manual focalizado. Esto **no** reabre por sí solo el Architecture Freeze, no autoriza V5/Control Plane genérico y no ejecuta #446/F4.5/F4.6.

**Foundation Bootstrap Train (TRAIN-NEXUS-BOOTSTRAP-01, #387):** **PUBLICADO** mediante PR #388, candidate final `38f966033c0f7dc6084bb67d565a07a06d9e2470` y merge `5b47c146b63ae5ab10abe68c4788c649b029fcaa` sobre `promueve/nexus-v4`. Entregó norma documental/handover ([`engineering/PRODUCT_DOCUMENTATION_STANDARD.md`](engineering/PRODUCT_DOCUMENTATION_STANDARD.md)), tooling reproducible Node 20 ([`engineering/TOOLING_BASELINE.md`](engineering/TOOLING_BASELINE.md)), deployment contracts v0 (#384), readiness/navigation contract v0 (#385) y primer oracle de lectura Reuma con clasificación `KNOWN_LEGACY` ([`engineering/REUMA_READ_CHARACTERIZATION.md`](engineering/REUMA_READ_CHARACTERIZATION.md)). Promotion Review v1 independiente: PASS, 0 blocking findings. Deuda no bloqueante preservada en issue #389; desbloquea F1.2/F1.3B y PlatformContext + Home.

**Foundation Train 02 (TRAIN-NEXUS-FOUNDATION-02, #399):** **PUBLICADO Y VERIFICADO** mediante PR #400, candidate final `bcb94f1b35e693d59a5ba0c305bb0ba03e4fd9f3` y merge `f1bc9ce7f4b3c10508ef9f9d5e13366f3192fe4f` sobre `promueve/nexus-v4`. La Atenea Promotion Review v1 final, fresca e independiente, terminó **PASS** en los tres ejes y con 0 blockers sobre el candidate exacto, después de dos rondas FAIL previas cuyos blockers quedaron corregidos mediante #398-C/#396-C y F3.1-D/F3.1-E. El merge conserva exactamente el tree del candidate revisado (`5e873df0...`) y una verificación post-merge local `npm run verify:nexus` volvió a PASS. Quedan preservados como deuda no bloqueante `NEXUS-DEBT-007` (precisión de los planted tests Reuma N1/G1) y `NEXUS-DEBT-008` (rechazo temprano de `entryPath` duplicado en el manifest builder). F3.2 Home quedó técnicamente desbloqueada por este train; su estado publicado posterior se registra en la entrada siguiente. Esta publicación sigue siendo Foundation sintética y no acredita piloto/producción.

**Nexus Home F3.2 (WO-NEXUS-F3.2, #403):** **PUBLICADA** mediante PR #404, candidate exacto `61e6e9ca54a787940dc5dc241f0eb517ce5f264d` → merge `e9096e9bda1d20ac50f9c395823152b7f005403c` sobre `promueve/nexus-v4`, con tree idéntico al candidate (`c34689308376c28d9d5e3e9330fcc938ad3c9506`). WU-A `172fb2b` y WU-B `17f9db6` cerraron native review `APPROVED + burned`; el retry `native-v4-heavy` ejecutó probe + ambos workers en `nan/deepseek-v4-flash` high. La navegación funcional/fail-closed permanece demostrada (`nexus_home_navigation_check` 11/11) y `verify:nexus` post-merge PASS; GitHub Actions push run `36116079829` terminó success. Un fresh checkout del merge detectó deuda de reproducibilidad EOL en dos assertions byte-identical del oracle Home (`NEXUS-DEBT-011`, #407): 9/11 funcional/bootstrap PASS y los artefactos discrepantes son iguales tras CRLF→LF; no se observó fallo runtime. Deudas post-F3.2: #405 (`NEXUS-DEBT-009/010`) y #407 (`NEXUS-DEBT-011`). **No acredita** QA de navegador (F3.3), release sintético (F3.4), piloto ni producción. Detalle: [`engineering/NEXUS_HOME_F3.2.md`](engineering/NEXUS_HOME_F3.2.md).

**Nexus Home Qualification 03 (TRAIN-NEXUS-HOME-QUALIFICATION-03, #409):** **PUBLICADO Y CUALIFICADO EN EVALUACIÓN SINTÉTICA** mediante PR #415, candidate exacto `9004b443619bc2eb8002165de6261176e27db8e9` → merge `6e6413c4e9cb163f11ee193c24c8f287c9ebdc36` sobre `promueve/nexus-v4`, con tree idéntico al candidate (`1d6834f59c38bd90e883174a773579cd20c474ee`). En fresh worktree post-merge, `npm ci` + `npm run verify:nexus` volvió a PASS. Cerró `NEXUS-DEBT-008/009/010/011` mediante Q1–Q3 (#410–#412), dejó F3.3 browser-qualified (Q4 #413 `7c73f37`: 8/0 en Chromium `151.0.7922.34` headless) y F3.4 con release sintético determinista 13/0 + cualificación browser del artefacto 5/0 (Q5 #414 `2407532`/`612bc03`). `verify:nexus` y CI del candidate (`Nexus deterministic gates` run `36150041100`) PASS; merge tree = candidate tree. Promotion Review independiente sobre el candidate exacto terminó `PROMOTION_REVIEW=PASS`, 0 blockers y tres nonblockers materiales; por decisión explícita de la operadora el reviewer real fue `nan/deepseek-v4-flash` high aunque el manifest heredado conservaba metadata `openai-codex/gpt-5.6-sol`, desviación de binding preservada sin repetir la review. N2 documental se reconcilia post-merge; N1/N3 sobreviven como `NEXUS-DEBT-012/013`. **Madurez:** gates deterministas + QA de navegador real + release sintético; snapshots Cáceres/legacy intactos; **no acredita** piloto ni producción. Detalle y rollback: [`engineering/NEXUS_HOME_F3.4.md`](engineering/NEXUS_HOME_F3.4.md).

**Nexus Home hardening / rollover canary 04 (TRAIN-NEXUS-V4-ROLLOVER-CANARY-04, #419):** **PUBLICADO Y VERIFICADO** mediante PR #422, candidate `133c978a951c6f73a8daf09f0beeab67fa070d53` → merge `f46290cd3a368e00427dbe2fb4e5fde00270d6ac` sobre `promueve/nexus-v4`. T1 #420 cerró `NEXUS-DEBT-012` haciendo explícitos y fail-closed los punteros browser `site` y `releaseArtifact`; T2 #421 cerró `NEXUS-DEBT-013` rechazando `items` array antes de generar el validator. Evidencia candidate: validator hardening 19/0, Home 11/0, release 15/0, `verify:nexus` PASS, doble rebuild byte-idéntico e independent verifier O1–O8 PASS. Tras el merge, Fast gates y Deterministic suite de GitHub Actions volvieron a `success`. El canary de rollover T1→T2 sí continuó automáticamente en la misma sesión, pero el target económico `<25% of tokensBefore` **no queda demostrado**: la estimación post-compact fue 21,54%, la medición del primer prompt devolvió `null` y la primera medición fiable al final del turno fue 26,77%. Esta evidencia no promueve `native-v4-heavy`, no cualifica la configuración canónica de routing y no acredita piloto/producción.
**Train Stranglers Clínicos 05 (TRAIN-NEXUS-CLINICAL-STRANGLER-05, #426):** **PUBLICADO Y VERIFICADO** mediante PR #430, candidate exacto `988c2089d1dfa34d5bd1d74b606b410e6e79903c` → merge `10422f4e5b7578dbbb17af17e3b953b5501eb4b2` sobre `promueve/nexus-v4`, con tree idéntico al candidate (`c0615cb301471808e8505e8bd04a078303bb420b`). Ejecutado en orden estricto T1 → T2 → T3 sobre la base `63819da79e22e2d55146531a3662f06f9ba2584f`. T1 #427 (`a0dad4a`) publica el contrato F4.1 read DTO V2 de Farmacia con oráculo congelado; T2 #428 publica el seam de resolución por valor de identificador (`06fcba2`), la facade async con guards de vigencia y propiedad de commit delegada (`6ce61fa`, `f572ca7`) y el vertical Inicio/Quick View (`36bfcaa`); T3 #429 publica el Read Port async de Reuma como wrapper adyacente sobre `HubTools.data` (`a469ad1`, `966db97`) y el vertical búsqueda/historia (`ea34105`). Evidencia: oráculos deterministas (contrato V2 22, puerto Reuma 13 con batería de mutaciones, selectores 92, facade 18, commit explícito 10, cutover 17, session 17, data port 11), harness Reuma 10/0 y acceptance 7/0, QA Chromium real de ambos verticales con `console.error=0` y `pageerror=0`, CI del candidate `Nexus deterministic gates` en `success`, y fresh worktree del merge con `npm ci` + `npm run verify:nexus` PASS. `gentle_review assess` devolvió `risk=unassessable` (#4791, seam `schema-incompatible`) en todas las unidades y se siguió la ruta fail-closed documentada sin fabricar revisión nativa. Madurez: `wired` + `visible` + `demostrado` y publicado en la rama canónica; sigue siendo **evaluación con datos sintéticos**, no `demo` acreditada por este train, no piloto ni producción.

**Train Seguridad Clínica Reuma 06 (TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06, #442):** **PUBLICADO Y VERIFICADO** mediante PR #449. Secuencia ejecutada #443 PCR/unidades → #444 autocomplete desde catálogo publicado → #445 simplificación prebiológico; la revisión de promoción detectó la regresión semántica de categorías y se corrigió antes de publicar mediante #447. Candidate final `6b8582a158bdcd6f8e7e425e0e83bc6eb27ca952` → merge de producto `25e57b250ec3d7cc0fc80a501fa308a40620f902`; tree idéntico `f8faba3ad0b485f21d27cd14244b37522cc40054`. Evidencia final: PCR 27/0 + Chromium 32/0; catálogo #444 15/0; categorías 33/0 + Chromium 46/0; prebiológico 16/0 + Chromium 33/0; `npm run verify:nexus` PASS; CI post-merge run `36483698667` success. Mantiene tres categorías explícitas `Sistémicos / FAMEs / Biológicos`; la selección de fármaco sigue siendo identity-only y no escribe datos terapéuticos. Deuda no bloqueante: #448 (hidratación visual de preselección) y #450 (semántica de búsqueda legacy no categorizada). Detalle y siguientes hallazgos: [`ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md). **Madurez:** interacción soportada y QA Chromium con datos sintéticos; no piloto ni producción.

**Train Reuma Foundation 07 (TRAIN-NEXUS-REUMA-FOUNDATION-07, #454):** **PUBLICADO Y VERIFICADO** mediante PR #459, candidate final `52cca14a66e1a848b491b8d584d1197d96f3d0c2` → merge `3c929f8a95c588fdf9db13c593e1f8462bc561a1` sobre `promueve/nexus-v4`, con tree idéntico al candidate (`cc1d5e99aa568024cef17768732e7d2507e3abf8`). Ejecutado en orden estricto T1 → T2 → T3 sobre la base `cb748091...`: T1 #455 `a5d6295` migró las lecturas de paciente/historia de **Seguimiento** detrás del Reuma Read Port (**F5.2**); T2 #456 `07d6cae` migró las lecturas de población de **Estadísticas** detrás de un seam de lectura Reuma explícito (**F5.2**); T3 #457 `52cca14` encapsuló el **writer legacy de 497 columnas** tras una frontera de compatibilidad fail-closed con salida exacta protegida y defectos `KNOWN_LEGACY` preservados (**F5.3**). #454/#455/#456/#457/#458 cerrados/completed; `npm run verify:nexus` y `git diff --check` PASS en la publicación y CI post-merge `Nexus deterministic gates` run `36625029994` `success`. La desviación de routing de T3 quedó aceptada por la operadora como no bloqueante (provenance Atenea C-078/C-079; CURRENT para trabajo futuro C-080). El tip Git avanzó después por dos commits administrativos sin cambio neto de árbol. **F5.4** (acto de escritura Reuma) fue publicada después por TRAIN 08 (#461 / PR #467); ver entrada siguiente. **Madurez:** evaluación con datos sintéticos; no piloto ni producción.

**Train Reuma Act Contract 08 (TRAIN-NEXUS-REUMA-ACT-CONTRACT-08, #461):** **PUBLICADO Y VERIFICADO** mediante PR #467, candidate final `773ee93694f64626dfb1007a069da018a7023a96` → merge `e64b65db29e6536c01e4f41e182fb157ac19ce2a` sobre `promueve/nexus-v4`, con candidate y merge compartiendo tree `ec42a55b9c374b3987c7a44bf5ca80da9167d67d`. Ejecutado en orden estricto T1 → T2 → T3 sobre la base `9f1f7179...`: T1 #462 `c2858cf` congeló el contrato **Reuma Visit Act v1** independiente del legacy 497, con su oráculo de aceptación principal congelado `39d2764` (106/0); T2 #463 `2830744` publicó el adapter act→legacy 497 a través de la frontera F5.3, con oráculo congelado `20940f0` (51/0) y 10 journeys byte-equivalentes; T3 #464 `773ee93` ejecutó el **cutover soportado** de los journeys de exportación de Primera Visita y Seguimiento al Visit Act v1 (oráculo 58/0 + QA browser 23/23; oráculo congelado `212bc32`). La frontera F5.3 (32/0), el harness de export (9/0) y la acceptance (15/0) se mantienen; 3 `CHAR` / 1 `DRIFT` permanecen report-only sin corrección semántica. `KNOWN_LEGACY` y la deuda `pendingRows`/`createdAt` no corregidas se preservan. Gentle C-080: 3/3 reviews nativas terminales approved + burned, sin fallos de reviewer. CI del candidate run `36645555852` y post-merge run `36645661418` `success`. #461/#462/#463/#464 cerrados/completed. Con esta publicación **F5.1–F5.4 quedan PUBLISHED**; **F6** y **F7** permanecen **PENDIENTES** según el Foundation Plan. **Madurez:** evaluación con datos sintéticos; no piloto ni producción. Esta publicación no cierra #446 (renovaciones), no altera Reuma→Farmacia (`DISCOVERY_FIRST`) ni la automatización CIMA (separada/diferida).

**Train Farmacia Read Migration 09 (TRAIN-NEXUS-FARMACIA-READ-MIGRATION-09, #470) y Train 09.1 closeout (TRAIN-NEXUS-FARMACIA-F4.3-CLOSEOUT-09.1, #475):** **F4.3 COMPLETADA/PUBLICADA** en dos publicaciones sobre `promueve/nexus-v4`. Train 09 publicó por PR #474 (merge `bf0cb3dde91965168effb00d6f119624e43bd764`) la parte principal de F4.3: F4.3A dashboard/longitudinal (#471), F4.3B validación/primera visita (#472) y F4.3C seguimiento/estadísticas (#473), migrando las lecturas de paciente detrás del facade/contrato V2. Train 09.1 (#475) cerró la deuda residual por PR #478 (merge `91262d8007642eaf1d3cbe21e24d20ff369ee19b`): F4.3D consumidores residuales (#476: Inicio, Actividad del servicio y review de intake detrás de seams sync publicados) y F4.3E cualificación de cinco checkers previos en rojo reparando sólo drift de harness (#477, estado `HARNESS_DRIFT_FIXED`, sin defectos runtime); el correction cycle `f82bd24ce14811627881d184ae37131bbda98ca9` resolvió la stale init-read race de `farmacia_index.js` (init tardío nunca reemplaza la búsqueda soportada del usuario), quedando RESOLVED y sin advisories abiertos. CI post-merge `Nexus deterministic gates` run `36744075965` `success`. **Checkpoint visual post-F4.3 (#480, TRAIN #479 T1):** QA de navegador real con interacciones soportadas sobre la base `91262d8`; 17 observaciones `PASS` y **1 `PRODUCT_DEFECT_BLOCKING` (PV-001)**: Primera Visita presenta el tratamiento solicitado de un paciente demo pendiente como «Relación terapéutica: validado» e hidrata la captura con él (semántica preexistente del camino legacy coexistence, no introducida por F4.3); estado T1 `HUMAN_STOP_BLOCKER`, follow-up técnico aprobado **#482**. PV-001 fue posteriormente corregido y publicado por #482 / PR #484 (candidate `75063f25b5cf3de008ab882392b9387f5fdea9c1` → merge `a04a0ace25012e5f0ac397844165921dccaebcc3`, CI post-merge run `36771991874` success); estado actual del hallazgo = `RESOLVED/PUBLISHED`; F4.4 quedó técnicamente desbloqueada y fue publicada después por TRAIN #487 / PR #490. Detalle: [`ops/audits/PROMUEVE_NEXUS_POST_F43_VISUAL_CHECKPOINT_20260930.md`](ops/audits/PROMUEVE_NEXUS_POST_F43_VISUAL_CHECKPOINT_20260930.md). **Madurez:** evaluación con datos sintéticos y browser QA focalizada; no piloto ni producción. R3-001 (#448) sigue `CONTRACT_COMPLIANT_DEMO_DEBT`; esta publicación no altera por sí sola la secuencia de producto previa.

**Train Farmacia Act Contract 11 (TRAIN-NEXUS-FARMACIA-ACT-CONTRACT-11, #487):** **PUBLICADO Y VERIFICADO** mediante PR #490, candidate final `535c65567bc8ca0aef7358f97f99d97520b0ff20` → merge `3bf45760a27630823b61b0d19da8b64aeb060693` sobre `promueve/nexus-v4`. Ejecutado en orden estricto T1 → T2 sobre la base `7e30f5d8...`: T1 #488 `98c7aa76b9457f31c17912090e299f0fb62e4c84` congeló el contrato común **Pharmacy Act v1** (`HubTools.farmaciaActContract.createAct`, `contractVersion = pharmacy-act/v1`) independiente de transporte —sin dependencia de Excel/TSV/SharePoint/SQL ni `commit(event)` público—, con envelope explícito común para Validación/Primera Visita/Seguimiento, fail-closed, deep detachment / sin referencias compartidas del caller y oráculo de invariantes congelado **243/0**; T2 #489 `b73e1e7e8a219794be8b778d1ae9c4b6d1a5f7bb` publicó los payloads específicos e independientes por caso de uso (`createValidationAct` / `createFirstVisitAct` / `createFollowupAct`, con `lines[]` explícitas), preservando la cardinalidad de líneas y los invariantes **solicitado ≠ validado**, **previo ≠ nuevo** y **`followup` ≠ validación** (oráculo **145/0**). El correction candidate `535c655` endureció la trust boundary descubierta en auditoría pre-merge: semántica own-property para metadata/bloques/`lines` (la cadena de prototipos no otorga autoridad), prototypes custom del caller fail-closed y deep clone sin preservar prototipo controlado por el caller; sólo cambió los dos módulos de contrato y sus oráculos. Aseguramiento compuesto Gentle C-080 sobre el delta compuesto `98c7aa76..535c655`: review `review-707b45b6c20d35ee` **APPROVED + acknowledged + burned** (transporte primario `atenea-review-host`, 2 WARNING informativos, sin corrección requerida); los recibos históricos fallidos se conservan como evidencia de incidente y no se usan como autoridad. CI del candidate `Nexus deterministic gates` run `36879118233` y post-merge run `36880209718` `success`. #487/#488/#489 cerrados/completed. Sin captura clínica, UI, delivery ni persistencia modificados (contrato puro, sin wiring visible). Con esta publicación **F4.4 queda COMPLETADA/PUBLICADA**; **F4.5 (DeliveryResult / adapter semantics) pasa a ser la siguiente frontera Foundation técnicamente disponible, sin ser prioridad humana automática ni autorización de ejecución**; **F4.6, F6 y F7 permanecen PENDIENTES**. **Madurez:** evaluación con datos sintéticos; no piloto ni producción. Esta publicación no cierra #446 (renovaciones, con su `TEMPORARY EXECUTION HOLD` intacto), no altera Reuma→Farmacia (`DISCOVERY_FIRST`) ni la automatización CIMA (separada/diferida).

> **Estado vivo:** la autoridad canónica de nuevo desarrollo es `promueve/nexus-v4`; el último HEAD de producto Nexus verificado tras PR #490 es `3bf45760a27630823b61b0d19da8b64aeb060693` (F4.4 Pharmacy Act v1, TRAIN #487; candidate `535c655...`; HEAD de producto anterior `a04a0ace25012e5f0ac397844165921dccaebcc3` tras PR #484). El tip Git de la rama canónica puede avanzar por documentación/administración sin cambiar ese HEAD de producto. El tip Git de `recovery/farmacia-pr-replay-20260727` es histórico y deliberadamente volátil. El último HEAD de producto Farmacia publicado en esa línea es `771fb80c5081aa974b86d6a0119ab30059970a25` (PR #374). El HEAD clínico funcional congelado por `CÁCERES-REVIEW-0.6` sigue siendo `e1120ba85817a1807cea8c1e938867ad778921f4` (PR #341): el snapshot Cáceres permanece congelado y **no** incorpora automáticamente SEFH #362/#363 ni Enfermería v6 #364–#370. La dirección de producto viva posterior a septiembre está en [`PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`](ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md); la prioridad humana pre-Badajoz permanece `UNDER_READJUDICATION` hasta ledger+Q&A Reuma.

> **Fronteras clínicas:** tratamiento solicitado no equivale a validado; pegar/importar nunca valida; datos ausentes no limpian controles; valores existentes quedan protegidos; no hay inferencia terapéutica desde nombre genérico de fármaco o dato ausente. La reconciliación 2026-10-03 añade una precisión de producto para Farmacia: una **selección explícita de medicamento/presentación CIMA**, con indicación/contexto explícito cuando sea necesario, puede proponer datos de ficha técnica aplicables siempre editables y sin sobrescribir ajustes profesionales.

> **Recovery publicado y snapshot Cáceres son artefactos distintos y ya no están alineados funcionalmente.** `recovery` avanzó con acceso SEFH (#362/#363) y Enfermería v6/reconciliación por `solicitud_id` (#364–#370), mientras `CÁCERES-REVIEW-0.6` conserva su manifest con `source_sha`/`last_functional_sha = e1120ba85817a1807cea8c1e938867ad778921f4`. El paquete externo/workbooks tampoco se ha refrozen.

---

## 1. Lectura recomendada actual

1. [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md) — estado vivo de recovery y relación con el snapshot Cáceres 0.6, actualizado 2026-09-24.
2. [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) — trazabilidad de WOs, candidates, PRs y merges.
3. [`docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`](/docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md) — autoridad viva de producto posterior a la reunión Farmacia+Dermatología y revisión manual FH; contiene decisiones, preguntas abiertas y siguiente paso Reuma.
4. [`docs/ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](/docs/ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md) — revisión manual de septiembre cerrada/partially-published; conserva shaping e historial de hallazgos.
5. [`docs/ops/NEXUS_DEBT_REGISTER.md`](/docs/ops/NEXUS_DEBT_REGISTER.md) — registro vivo de deuda transversal de plataforma/Foundation; issues conservan la evidencia detallada.
6. [`docs/ops/FARMACIA_DEBT_REGISTER.md`](/docs/ops/FARMACIA_DEBT_REGISTER.md) — deuda aceptada específica del módulo Farmacia; no sustituye backlog ni decisiones futuras.
7. [`docs/specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md`](/docs/specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md) — contrato Unified Intake y addendum post-implementación.
8. [`docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md`](/docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md) — auditoría histórica del train T8→T10; no sustituye el estado vivo actual.
9. [`docs/evaluation/FARMACIA_EVALUATION_GUIDE.md`](/docs/evaluation/FARMACIA_EVALUATION_GUIDE.md) y [`FARMACIA_EVALUATION_CHECKLIST.md`](/docs/evaluation/FARMACIA_EVALUATION_CHECKLIST.md) — evaluación sintética.
10. [`docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md`](/docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md) — freeze del paquete externo; permanece independiente del recovery actual.
11. [`docs/ops/audits/PROMUEVE_NEXUS_POST_F43_VISUAL_CHECKPOINT_20260930.md`](/docs/ops/audits/PROMUEVE_NEXUS_POST_F43_VISUAL_CHECKPOINT_20260930.md) — checkpoint visual post-F4.3 (#480): 17 observaciones PASS y 1 `PRODUCT_DEFECT_BLOCKING` (PV-001, follow-up aprobado #482); PV-001 quedó posteriormente `RESOLVED/PUBLISHED` por #482 / PR #484, por lo que F4.4 quedó técnicamente desbloqueada sin ser prioridad humana automática; F4.4 fue publicada después por TRAIN #487 / PR #490.

---

## 2. Orden de verdad

1. WO/instrucción vigente: consultar GitHub live; este índice no fija una WO “actual” estática para evitar deuda circular tras cierres documentales.
2. GitHub live: `promueve/nexus-v4` es la autoridad canónica activa desde el merge de PR #381. El último HEAD de producto Nexus verificado tras PR #490 es `3bf45760a27630823b61b0d19da8b64aeb060693`; el tip Git puede moverse por documentación. Para trazabilidad Farmacia histórica, consultar además `recovery`; último HEAD de producto Farmacia: `771fb80c5081aa974b86d6a0119ab30059970a25`; HEAD clínico funcional congelado por 0.6: `e1120ba85817a1807cea8c1e938867ad778921f4`.
3. `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` una vez reconciliados.
4. Documento vivo relacionado más reciente: para la readjudicación actual, [`PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`](/docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md).
5. Auditoría previa [`PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](/docs/ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md), conservada como evidencia histórica/partially-published y autoridad de sus hallazgos no supersedidos.
6. Estado vivo [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md).
7. Specs/contratos publicados relacionados.
8. Documentos históricos y biblioteca.

Una rama, SHA, prioridad o PR recordados no son fuente de verdad sin verificación.

---

## 3. Ramas y referencias

| Rama / ref | Estado | Fuente de verdad para | No es fuente de verdad para |
| --- | --- | --- | --- |
| `origin/main` | Legacy / congelada; verificado `a25cccb8...` | Historia previa | Estado Farmacia actual |
| `origin/promueve/nexus-v4` | **ACTIVE** desde PR #381; último HEAD de producto verificado tras PR #490 `3bf45760...`; tip Git consultar live | Nuevo desarrollo Nexus/Foundation | Piloto/producción o cambio automático del snapshot Cáceres |
| `origin/recovery/farmacia-pr-replay-20260727` | **HISTORICAL** para nuevo desarrollo desde PR #381; conserva trazabilidad del último producto Farmacia publicado y del snapshot | Historia/código Farmacia y recuperación | Autoridad canónica Nexus, piloto o producción |
| `previews/caceres-fh/` | **Snapshot estable `CÁCERES-REVIEW-0.6`**; manifest source/last-functional `e1120ba85817a1807cea8c1e938867ad778921f4` | Evaluación Pharmacy-only Cáceres con datos sintéticos | Piloto, producción o espejo automático de futuros merges |
| `origin/work/*`, `origin/docs/*` | Trabajo/revisión | WOs atómicas | Estado publicado sin merge |
| `origin/backup/*` y tags demo | Retorno/historia | Recuperación de estados | Desarrollo activo |

### Convención de SHAs de publicación

- **Tip Git de una rama**: último commit, incluya producto o solo documentación/administración. Es volátil y se consulta live.
- **Último HEAD de producto publicado**: último commit/merge que cambió código funcional o un snapshot distribuible. Solo cambia cuando cambia producto/snapshot.
- **HEAD clínico funcional congelado**: SHA funcional que un snapshot declara en `source_sha` / `last_functional_sha`; puede ser anterior al HEAD de producto si la promoción del snapshot añade solo artefactos de publicación.
- Un merge `documentation-only` puede mover el tip Git sin cambiar el HEAD de producto ni el HEAD clínico funcional. **No abrir una nueva reconciliación solo porque haya cambiado el tip por documentación.**

### Reglas

- No tocar `main` sin autorización explícita.
- El snapshot Cáceres solo cambia por promoción/refreeze explícito; no editar manualmente `previews/caceres-fh/`.
- Recovery, snapshot Cáceres y paquete externo son artefactos distintos.
- Evaluación/demo con datos sintéticos no equivale a piloto ni producción.

---

## 4. Estado vivo de Farmacia post Cáceres 0.6

| Elemento | Estado actual |
| --- | --- |
| Rama | `recovery/farmacia-pr-replay-20260727` |
| Tip Git de recovery | Volátil; consultar GitHub live. Verificado 2026-09-24 tras PR #374: `771fb80c5081aa974b86d6a0119ab30059970a25` |
| Último HEAD de producto publicado | `771fb80c5081aa974b86d6a0119ab30059970a25` — merge PR #374 |
| HEAD clínico funcional | `e1120ba85817a1807cea8c1e938867ad778921f4` — merge PR #341; congelado por 0.6 |
| CI del último HEAD de producto | Farmacia smoke run `35936756453` `success`; Pages build/deployment run `35936755598` `success` |
| Baseline Unified Intake | #323 / PR #324 → `bff76ff7095fb568948b1bfbc6288df551971add`; histórico, preservado en la cadena actual |
| Cáceres 0.6 | #345 / PR #346 → candidate `749c82409a415e800500b39018027b189fd6a131`, merge `19d10c9abefb7b25130b4b17e3289d54a17315ee`; manifest source/last-functional `e1120ba85817a1807cea8c1e938867ad778921f4` |
| A — auto-reveal | #334 / PR #335 → candidate `ad4088c...`, merge `7b99eda50e9f7b92cf921d0d6e1bd2090ca917f7`; presentación Dermatología/patología sin preescritura clínica |
| B — D17_EXT_V1 | #336 / PR #337 → candidate `773f66f...`, merge `775a8c08c00d3b678838d71b958775bba726009b`; transporte clínico versionado y fail-closed |
| Train C | #338 completado; C1 #339 `bbf898bc789840c0b4bc7635636b81d740afe60e`; C2 #340 `e5e52e2bc8f94805b4771ec40aa19820bb6be02f`; verifier final PASS |
| Promoción Train C | #342 / PR #341 → merge `e1120ba85817a1807cea8c1e938867ad778921f4` |
| Acceso estratificación SEFH | #362 / PR #363 → merge `6c36ce5d1126b3032937e8e3627b045e1e2ea081` |
| Enfermería v6 / `solicitud_id` | train #364; N1 #365, N2 #366, N3 #367, N4 correctiva, N5 #368; promoción #369 / PR #370 → merge `e058f0d25a1856ace4a8bec63dfca53584e8a9cb` |
| Deuda aceptada | [`FARMACIA_DEBT_REGISTER.md`](/docs/ops/FARMACIA_DEBT_REGISTER.md): FH-DEBT-001 sigue OPEN y debe resolverse antes de piloto real; FH-DEBT-002/003 RESOLVED por PR #374 |
| C1 | 39 conceptos explícitos de patología/comorbilidades pasan por proposals + D5/D16; adapters cerrados; gates patología y parent/child |
| C2 | 7 conceptos seguros de analítica/vacunación + superficie compartida única `formAnaliticaVacunacion` |
| Serologías combinadas | `derma_viral_serologies` permanece `NONE/NO_PROPOSAL`; nunca se divide en VHB/VHC/VIH |
| Tratamiento validado | Separado e intacto por el intake; requested/imported nunca equivale a validated |
| Patient/session | Intake no crea/selecciona paciente ni persiste una sesión por pegar/importar |
| QA Train C | final oracle PASS; T10 14/14 ejecutado una vez al final del Train; auditoría post-Train C1 147/147, C2 134/134, C2 browser 5/5, final oracle PASS; `git diff --check` PASS |
| Snapshot/package | `CÁCERES-REVIEW-0.6` sigue congelado en source `e1120ba...` y NO incorpora automáticamente #363/#370/#374; package externo/workbooks siguen sin refreeze |
| Estado asistencial | Evaluación/demo sintética; no piloto ni producción |
| Siguiente frontera | Mantener evaluación sintética; resolver FH-DEBT-001 antes de piloto real; cualquier refreeze Cáceres/paquete requiere decisión separada |
| Documento vivo | [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md) |

> Los estados documentales previos a 2026-09-08 conservan trazabilidad histórica. Cuando describan Cáceres 0.4/0.5 o un recovery anterior como estado vivo, quedan superseded por GitHub, este índice, WOS y el estado vivo 20260908.

## 5. Plan y arquitectura V4

### Plan operativo histórico

[`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md)

Este plan conserva objetivos, dependencias y aprendizaje de julio, pero **ya no gobierna la secuencia de Foundation**. Para el trabajo Nexus actual prevalece [`docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`](/docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md) bajo el Architecture Decision Freeze. Supabase, calendarios y WOs históricos del plan no se interpretan como compromisos vigentes salvo reconciliación explícita.

Históricamente definía:

- entrega rápida del 2026-08-03;
- modelo canónico;
- Export Manager;
- Excel Bridge;
- roundtrip;
- Control Plane Supabase;
- CIMA;
- parsers;
- renovaciones;
- FHIR/openEHR;
- dependencias y WOs.

### Arquitectura objetivo

[`docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](/docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md)

Decisiones principales:

- `PROMueve Nexus` como plataforma provisional;
- `FarmaNEXus` como módulo Farmacia;
- V4 local-first y backend-ready;
- un Data Plane por hospital;
- Supabase solo para configuración no-paciente;
- CIMA oficial versionado en GitHub;
- Identity Plane físico diferido hasta servidor/PROM Gateway automatizado;
- cardinalidad por acto: Validación genera 1 fila; Primera Visita `1..N` por líneas explícitamente presentes; Seguimiento `1..N` por líneas explícitamente activas;
- modelo canónico como fuente de Excel, JARA, FHIR y openEHR;
- V5 agnóstica diferida.

---

## 6. Documentos canónicos generales

| Documento | Estado | Uso |
| --- | --- | --- |
| [`AGENTS.md`](/AGENTS.md) | Vigente — Atenea C-084 / OpenCode V2 nativo visible en Herdr + Matt upstream; routing project-local | Gobernanza operativa |
| [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) | Vigente | Trazabilidad de WOs y PRs |
| [`docs/ops/PROMUEVE_BACKLOG.md`](/docs/ops/PROMUEVE_BACKLOG.md) | Vigente / propuestas no autorizantes | Backlog vivo de producto y arquitectura; separa ideas de deuda y decisiones |
| [`docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`](/docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md) | **Vigente / autoridad viva posterior** | Reconciliación Farmacia+Dermatología+Nexus, preguntas abiertas y secuencia pre-Badajoz |
| [`docs/ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](/docs/ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md) | Revisión septiembre cerrada / `PARTIALLY_PUBLISHED` | Auditoría manual previa y trazabilidad de hallazgos no supersedidos |
| [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) | Propuesta canónica + addendum 2026-07-31 | Evolución post-SES |
| [`docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md`](/docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md) | Vigente | Separación Reuma/Farmacia |
| [`docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md`](/docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md) | Vigente | Discovery Badajoz/Mérida |
| [`docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`](/docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md) | Vigencia parcial / histórica; subordinada al Architecture Decision Freeze | Principios clínicos conservables; integración por CIP y stack histórico no gobiernan Foundation |
| [`docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md`](/docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md) | Vigente | Aprendizaje y decisiones por fases |

---

## 7. Reumatología

Fuentes principales:

- [`docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`](/docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md)
- [`docs/CONTRATO_DATOS_REUMA_V2.md`](/docs/CONTRATO_DATOS_REUMA_V2.md)
- [`docs/PLAN_IMPLEMENTACION_REUMA_V2.md`](/docs/PLAN_IMPLEMENTACION_REUMA_V2.md)
- [`docs/RESUMEN_RELEASE_REUMA_V2.md`](/docs/RESUMEN_RELEASE_REUMA_V2.md)
- [`docs/CHECKLIST_E2E_CLINICO_V2.md`](/docs/CHECKLIST_E2E_CLINICO_V2.md)
- [`docs/VALIDACION_MANUAL_DEMO_V2.md`](/docs/VALIDACION_MANUAL_DEMO_V2.md)
- [`docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`](/docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md) — autoridad viva posterior; el siguiente paso es ledger Reuma contra Nexus antes de nueva revisión manual.
- [`docs/ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](/docs/ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md) — revisión septiembre cerrada, conservada como evidencia histórica/partially-published.

El contrato ancho de Reuma no debe reutilizarse automáticamente como modelo V4 de Farmacia ni normalizarse sin WO específica. Train 06 ya ha publicado, con datos sintéticos, el contrato explícito de unidades PCR, el autocomplete común con categorías explícitas y la simplificación prebiológica; Train 07 (#454 / PR #459) publicó después la migración de lectura de Seguimiento y Estadísticas (F5.2) y la frontera de compatibilidad del writer 497 (F5.3); Train 08 (#461 / PR #467) publicó el contrato Reuma Visit Act v1, el adapter act→legacy 497 y el cutover soportado de Primera Visita y Seguimiento (F5.4), quedando **F5.1–F5.4 PUBLISHED**. Ninguno de estos trains extiende por sí solo esa madurez a piloto/producción ni resuelve Reuma→Farmacia.

---

## 8. Farmacia Hospitalaria

### Estado y ejecución

- [`docs/evaluation/FARMACIA_EVALUATION_GUIDE.md`](/docs/evaluation/FARMACIA_EVALUATION_GUIDE.md)
- [`docs/evaluation/FARMACIA_EVALUATION_CHECKLIST.md`](/docs/evaluation/FARMACIA_EVALUATION_CHECKLIST.md)
- [`docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md`](/docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md)
- [`docs/ops/FARMACIA_DEBT_REGISTER.md`](/docs/ops/FARMACIA_DEBT_REGISTER.md) — registro vivo de deuda aceptada/no bloqueante
- [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md)
- [`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md)
- [`docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](/docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md)
- [`docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md) — reporte operativo de WO2 (Validación v2)
- [`docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md) — reporte operativo de WO3 (Primera Visita v2)
- [`docs/ops/WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01.md`](/docs/ops/WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01.md) — reporte operativo de WO4 (Seguimiento v2)
- Los planes históricos de recuperación PR replay y rescate V4 citados en ediciones previas no están publicados en la rama `recovery`; no se usan como estado vivo.
- [`docs/farmacia_wo_execution_protocol.md`](/docs/farmacia_wo_execution_protocol.md)

### Contratos

- [`docs/farmacia_data_contracts.md`](/docs/farmacia_data_contracts.md) — contrato regional actualizado por PR #193 con `CADA_3_SEMANAS`; incluido en la fuente funcional promovida a `CÁCERES-REVIEW-0.3`.
- [`docs/farmacia_treatment_data_contract.md`](/docs/farmacia_treatment_data_contract.md)
- [`docs/farmacia_export_longitudinal_contract_WO8.md`](/docs/farmacia_export_longitudinal_contract_WO8.md) — v3 reconciliada: fila común v2, Seguimiento por línea activa y Excel Bridge
- [`docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`](/docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md) — secuencia histórica y estado post patient-flow; flujo normal integrado; WO7 candidate pausada; Estadísticas raw/CSV superados como pendientes por #257/#258; `APP_*`, descomposición, Processor y roundtrip pendientes
- [`docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md`](/docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md) — core candidate `2.0.0-draft.1` integrado; Export v2 demo paralelo visible desde PR #227, sin cutover ni retirada v1
- [`docs/contracts/FARMACIA_EXPORT_V2_VALIDATION_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_VALIDATION_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Validación v2; integrado mediante PR #215
- [`docs/contracts/FARMACIA_EXPORT_V2_FIRST_VISIT_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_FIRST_VISIT_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Primera Visita v2; integrado mediante PR #217
- [`docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Seguimiento v2; integrado mediante PR #221
- [`docs/contracts/FARMACIA_RENEWAL_HANDOFF_CONTRACT.md`](/docs/contracts/FARMACIA_RENEWAL_HANDOFF_CONTRACT.md) — contrato N0 del circuito de renovaciones FH↔Enfermería (`renewal-handoff/v1`) **refrozen** bajo el HUMAN SHAPING REFREEZE de #446 + recuperación #509; candidato `d829939` **RECHAZADO** (checkpoint preservado); flujo MVP `ENVIADA_A_ENFERMERÍA → SOLICITADA_AL_PRESCRIPTOR → RENOVACIÓN_COMUNICADA|SUSPENSIÓN_COMUNICADA → ACTUALIZADA_POR_FH|TRATAMIENTO_SUSPENDIDO`; `RENOVACIÓN_COMUNICADA ≠ ACTUALIZADA_POR_FH` / `SUSPENSIÓN_COMUNICADA ≠ TRATAMIENTO_SUSPENDIDO`; schemas y máquina de estados en `schemas/renewal/`; checker `check:renewal:contract`; **PUBLICADO Y VERIFICADO** por PR #510, candidate `54ab2c5eced637774ac5d65e32e3bb340e204d94` → merge `aa6401af8ad636dd9d19baad9dcf80876ac780df` (CI PR `37198098263` + post-merge `37198170542` success); documentación/contrato únicamente, cero runtime; incógnitas humanas `OCT-OPEN-010..013` y `REN-OPEN-001..008` (`PENDIENTE_EQUIPO`/`CONTRACT_PENDING`)
- El contrato de escenarios Farmacia V4 citado en ediciones previas no está publicado en `recovery`; su incorporación formal permanece pendiente.

### Historia y auditoría

- [`docs/farmacia_branch_manifest_20260614.md`](/docs/farmacia_branch_manifest_20260614.md) — inventario histórico extenso.
- [`docs/ops/audits/FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md`](/docs/ops/audits/FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md)
- [`docs/audits/FARMACIA_BASELINE_AUDIT_V1_20260904.md`](/docs/audits/FARMACIA_BASELINE_AUDIT_V1_20260904.md) — auditoría baseline Farmacia V1 (issue #285 / PR #287), histórica sobre `097396a1...`; su P1 F-01/F-04 fue resuelto posteriormente por #288/#289 (merge `9fd6888b...`) según el postscript §13 añadido por la WO #290
- [`docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md`](/docs/ops/FH_UNIFIED_CLINICAL_INTAKE_TRAIN_AUDIT_20260906.md) — auditoría factual del train T8→T10; el addendum §11 registra después Repair C #317, SES hardening #319, composición #322 y publicación #323/#324 sin reescribir la auditoría original.
- `docs/ops/FARMACIA_V0_3_*`, `FARMACIA_V0_4_*`, `FARMACIA_V0_5_*` — exploración histórica, no estado vivo.

---

## 9. Enfermería, PROMs e identidad

- [`docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md`](/docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md)
- [`docs/farmacia_enfermeria_excel_sintetico_gap_WO8.md`](/docs/farmacia_enfermeria_excel_sintetico_gap_WO8.md)
- [`docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`](/docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md)
- [`docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md`](/docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md)

Decisión 2026-07-31: el Identity Plane físico no se implementa durante el ciclo de vacaciones. Se reservan identificadores e interfaz, pero se evita todo doble registro manual hasta disponer de servidor/PROM Gateway automatizado.

Desde PR #370, el Hub soporta el workbook Enfermería v6 multihoja (`DERMATOLOGÍA`, `REUMATOLOGÍA`, `DIGESTIVO`) y reconcilia solicitudes con Farmacia exclusivamente por `solicitud_id`. `OK FARMACIA` sigue significando lista para tramitación, no validada; `validado`/`denegado` requieren acto FH explícito con el mismo ID; misma CIP con IDs distintos permanece independiente. El handoff Inicio→Validación y el fallo de persistencia están cubiertos de forma fail-closed.

---

## 10. Treatment Lifecycle y renovaciones

- [`docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`](/docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md)

Principios conservados bajo el Architecture Decision Freeze (el documento original sigue siendo exploratorio y no constituye un contrato de configuración aprobado):

- renovación por línea;
- fechas confirmadas, verificadas y estimadas separadas;
- la configuración no introduce lógica clínica arbitraria: solo puede seleccionar políticas implementadas, versionadas, probadas y autorizadas;
- tareas, alertas y notificaciones son conceptos distintos;
- no marcar renovado por silencio;
- Presalud solo alimentará el motor desde campos reales verificados;
- la necesidad de lifecycle e interoperabilidad se conserva como evolución futura sin activar automáticamente el mecanismo histórico propuesto.

---

## 11. Catálogo CIMA y catálogo local

- [`docs/ops/FARMACIA_V0_3_CIMA_AUTOUPDATE_PLAN_20260607.md`](/docs/ops/FARMACIA_V0_3_CIMA_AUTOUPDATE_PLAN_20260607.md)
- [`docs/deuda-tecnica/cdc-001-cima-auto-update.md`](/docs/deuda-tecnica/cdc-001-cima-auto-update.md)

Estado real:

- CIMA oficial puede permanecer versionado en GitHub.
- El catálogo hospitalario publicado actual es consumido por Reuma desde Train 06 mediante una capacidad común de solo lectura.
- Para preservar `Sistémicos / FAMEs / Biológicos`, #447 añadió `data/catalogos/reuma/reuma_medication_categories.v1.json`: clasificación explícita/versionada, no inferida en runtime, con entradas identity-only para miembros declarados no cubiertos por el workbook.
- La selección de catálogo nunca decide dosis, vía, pauta, presentación, inducción, duración, línea, switch/add-on, renovación ni validación. En Farmacia, la reconciliación #501 distingue esta prohibición de decisión/inferencia de la **propuesta editable** de datos de ficha técnica tras selección explícita de medicamento/presentación CIMA y contexto clínico explícito cuando proceda.
- El snapshot Cáceres usa el artefacto de junio de 2026.
- No existe todavía una Action mensual activa.
- La futura Action debe extraer, validar, generar diff y abrir PR revisable; la fuente categorial de #447 no sustituye esa automatización.
- El catálogo local especial no se sobrescribe al actualizar CIMA.

---

## 12. Backend, Control Plane e interoperabilidad

- [`docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](/docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md)
- [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md)
- [`ARCHITECTURE.md`](/ARCHITECTURE.md) — útil, pero desactualizado respecto a recovery.

Fronteras:

- Excel Bridge: datos clínico-operativos por hospital.
- Supabase: configuración no-paciente.
- Identity Plane: backend local futuro.
- FHIR/openEHR: adaptadores del modelo canónico, no conversión directa del Excel.
- V5: diferida.

---

## 13. Deuda documental abierta

La deuda funcional/técnica aceptada de producto se registra separadamente en [`docs/ops/FARMACIA_DEBT_REGISTER.md`](/docs/ops/FARMACIA_DEBT_REGISTER.md). Esta sección conserva únicamente deuda documental.

Requiere WO posterior, sin mezclarla con quick wins clínicos:

| Documento | Deuda |
| --- | --- |
| `README.md` | Reconciliado 2026-09-24; mantenerlo como front door y evitar estado volátil duplicado |
| `ARCHITECTURE.md` | Marcado como referencia histórica; la arquitectura/estado actuales se resuelven desde este índice y documentos vivos |
| `CHANGELOG.md` | No recoge la línea recovery reciente |
| `AGENTS.md` | Reconciliado a Atenea C-084 por WO #499; C-077–C-083/Gentle/Pi/RDD/4R/OpenCode V1 quedan históricos |
| `docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md` | Modelo operativo antiguo |
| `opencode.json` + `.opencode/agents/` | Superficie project-local C-084 nativa V2; `experimental.subagent_depth=2`, agentes `permissions`/`shell`/`subagent`, sin `--pure`; bindings Atenea versionados |
| Planes históricos PR replay/rescate V4 | Referenciados previamente, pero sus archivos no están publicados en recovery |
| Contrato de escenarios Farmacia V4 | Referenciado previamente, pero no publicado en recovery |

---

## 14. Documentos históricos / no usar como estado vivo

- [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md) — fotografía 0.1.
- [`docs/archive/CHANGELOG_20260307.md`](/docs/archive/CHANGELOG_20260307.md)
- [`docs/archive/ESTADO_IMPLEMENTACION_20260307.md`](/docs/archive/ESTADO_IMPLEMENTACION_20260307.md)
- [`docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md`](/docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md)
- ramas nocturnas/demo antiguas sin merge.

Para el estado actual de Farmacia también son memoria histórica o referencia secundaria, no fuente de estado vivo:

- `ARCHITECTURE.md` — referencia histórica explícitamente marcada;
- `TODO.md` — navegación, no backlog vivo;
- `CHANGELOG.md` — historia, no estado vivo;
- documentos `FARMACIA_V0_3_*` y `FARMACIA_V0_4_*`;
- issues replay históricos abiertos de julio.

Cuando contradigan el estado vivo, prevalecen GitHub live, el último HEAD de producto Nexus (`3bf45760a27630823b61b0d19da8b64aeb060693` tras PR #490), el último HEAD de producto Farmacia histórico (`771fb80c5081aa974b86d6a0119ab30059970a25`), el HEAD clínico funcional (`e1120ba85817a1807cea8c1e938867ad778921f4`), este índice, `WORK_ORDER_STATUS.md` y los documentos vivos relacionados. Los documentos de #289, #323/#324, trains previos y freezes 0.4/0.5 conservan valor histórico sin convertirse automáticamente en estado vivo.

---

## 15. Decisiones pendientes

| Tema | Estado |
| --- | --- |
| Formato PreSalud | Contrato/parser V0 estricto implementado; ampliaciones futuras pendientes |
| Diccionario regional de patologías | Allowlist SES Dermatología V0 implementada; diccionario regional amplio pendiente |
| Formulario Digestivo | Pendiente |
| Consenso SEFH/PROs | Preparación por Silvia |
| Trigger HTML Power Automate | Pendiente de PoC |
| Servidor local por hospital | Disponibilidad comunicada en Badajoz/Mérida; diseño pendiente |
| Identity Plane físico | Diferido hasta servidor/PROM Gateway automatizado |
| Auth/permisos | Pendiente institucional |
| Arquitectura FHIR/openEHR SES | Pendiente institucional |
| Nomenclatura externa PROMueve Nexus/FarmaNEXus | Provisional |
| Prioridad de producto pre-Badajoz | `UNDER_READJUDICATION`: ledger Reuma → Q&A manual focalizado → cruce con revisión FH → adjudicación pre-8 |
| Eccema de manos | `AWAIT_TEAM_INPUT`; no diseñar clínica por analogía |

---

*Estado reconciliado 2026-10-03: F4.4 continúa como último HEAD de producto Nexus (`3bf45760a27630823b61b0d19da8b64aeb060693`; PR #490), mientras el tip Git de `promueve/nexus-v4` puede avanzar por documentación/administración. La reconciliación de producto #501 no cambia código ni madurez asistencial: la prioridad humana previa queda `UNDER_READJUDICATION / PRE-BADAJOZ` hasta ledger+Q&A Reuma. F4.5 sigue técnicamente disponible sin autorización automática; #446 y su hold permanecen intactos. Farmacia recovery histórico mantiene como último HEAD de producto `771fb80c5081aa974b86d6a0119ab30059970a25`; HEAD clínico funcional congelado por Cáceres 0.6: `e1120ba85817a1807cea8c1e938867ad778921f4`. `CÁCERES-REVIEW-0.6` y el paquete externo siguen sin refreeze. Uso: evaluación/demo sintética; no piloto ni producción.*