# Work Order Status — Hub Clínico Badajoz / PROMueve Nexus

**Última actualización:** 2026-09-08
**Propósito:** tablero de estado y trazabilidad de work orders ejecutadas
**Mantenedor:** Cora / Hermes PM; actualizar al cambiar el estado real de una WO

---

## Estado publicado actual de Farmacia

| Elemento | Valor |
| --- | --- |
| Rama regional | `recovery/farmacia-pr-replay-20260727` |
| Tip Git de recovery (volátil) | Consultar GitHub live; último verificado al iniciar #349: `91e0049b2bf44b4862e7172f4e6d1cbe92a8efbd` |
| Último HEAD de producto publicado | `19d10c9abefb7b25130b4b17e3289d54a17315ee` — merge PR #346 / promoción Cáceres 0.6 |
| HEAD clínico funcional | `e1120ba85817a1807cea8c1e938867ad778921f4` — merge PR #341; source/last-functional de 0.6 |
| Candidate Train C | `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` |
| CI del último HEAD de producto | Farmacia smoke #1025 `success` sobre `19d10c9abefb7b25130b4b17e3289d54a17315ee`; Pages #219 `success` |
| `origin/main` | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68`; fuera de esta línea |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.6`; issue #345 / PR #346; candidate `749c82409a415e800500b39018027b189fd6a131`; merge `19d10c9abefb7b25130b4b17e3289d54a17315ee` |
| Source/last-functional snapshot 0.6 | `e1120ba85817a1807cea8c1e938867ad778921f4` según `deployment-manifest.json` |
| Paquete externo | `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`; no refrozen por 0.6 (#345/#346) |
| Estado asistencial | Evaluación con datos sintéticos; no piloto ni producción |
| Documento vivo | [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`](./FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md) |
| Work order documental actual | #349 — `WO-DOC-FH-RECOVERY-HEAD-TERMINOLOGY-01` |

## Convención operativa de SHAs

- **Tip Git de `recovery`**: se obtiene live de GitHub. Incluye commits de producto, documentación y administración; por tanto puede moverse sin que cambie el producto.
- **Último HEAD de producto publicado**: último commit/merge que cambia producto funcional o snapshot distribuible. Esta es la referencia estable para afirmar qué entrega está publicada.
- **HEAD clínico funcional congelado**: SHA que un snapshot fija en `source_sha` / `last_functional_sha`.
- Un merge `documentation-only` **no** obliga a reconciliar de nuevo los HEADs funcionales. Solo se actualizan si el diff publicado cambia producto/snapshot o si cambia el manifest funcional.
- Incidencia administrativa al iniciar #349: creación accidental de `__noop__` y eliminación inmediata mediante commit normal. Compare `a7428b...→91e0049...` = 2 commits, `files: []`; cero cambio neto de árbol. Detalle completo en #349.

## Última evolución — Unified Clinical Intake A/B/Train C

| Frontera | Autoridad / entrega | Estado real |
| --- | --- | --- |
| Baseline T1–T10 + hardening | #323 / PR #324 → `bff76ff7095fb568948b1bfbc6288df551971add` | Histórico publicado y preservado en la cadena actual |
| Cáceres review 0.5 | #331 / PR #333 → `2ee9c54f310ac8e32d8928b756f007efa0d56b0d` | Snapshot 0.5 publicado desde source `456454172b67a00ea5ba9583f14999a4be5ff0c2`; no espejo automático del recovery posterior |
| A — auto-reveal | #334 / PR #335 → candidate `ad4088c3689b761d695799c86295207653fcab0f`, merge `7b99eda50e9f7b92cf921d0d6e1bd2090ca917f7` | MERGED_AND_VERIFIED; presentación Dermatología/patología, sin prewrite clínico |
| B — D17_EXT_V1 | #336 / PR #337 → candidate `773f66f85081c6d9476599797a289a466adbfed7`, merge `775a8c08c00d3b678838d71b958775bba726009b` | MERGED_AND_VERIFIED; producer→segmenter→parser clínico extendido, backward-compatible y fail-closed |
| Train C parent | #338 | CLOSED/completed; final verifier PASS |
| C1 | #339 → `bbf898bc789840c0b4bc7635636b81d740afe60e` | CLOSED/completed; 39 conceptos clínicos/comorbilidades con proposals/aplicación protegida |
| C2 | #340 → `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` | CLOSED/completed; superficie compartida analítica/vacunación + 7 conceptos seguros |
| Promoción Train C | #342 / PR #341 → `e1120ba85817a1807cea8c1e938867ad778921f4` | MERGED_AND_VERIFIED; #342 CLOSED/completed; smoke post-merge #1019 success |
| Reconciliación documental post Train C | #343 / PR #344 → `79c9fd37f2a631a4316439013e4b0632268cf90a` | MERGED_AND_VERIFIED; #343 CLOSED/completed; smoke #1022 success |
| Promoción Cáceres 0.6 | #345 / PR #346 → candidate `749c82409a415e800500b39018027b189fd6a131`, merge `19d10c9abefb7b25130b4b17e3289d54a17315ee` | MERGED_AND_VERIFIED; #345 CLOSED/completed; smoke #1025 success; Pages #219 success |
| Reconciliación documental post 0.6 | #347 / PR #348 → `a7428b0195435477bfa86e779b63ea95955ed723` | MERGED_AND_VERIFIED; #347 CLOSED/completed; smoke #1028 success; documentation-only |
| Convención HEAD/tip Git | #349 | IN_PROGRESS; documentation-only; establece taxonomía estable y evita reconciliación circular |

### Garantías clínicas publicadas

- `REQUESTED_TREATMENT` sigue separado de `VALIDATED_TREATMENT`; pegar/importar nunca valida.
- Ausencia/desmarcado no se convierte en NO y nunca limpia un valor existente.
- Valores existentes requieren reemplazo profesional explícito; reparse/stale-stage conservan sus guards.
- C1 aplica únicamente los 39 mappings cerrados; composites no se trocean.
- C2 aplica únicamente 7 conceptos seguros; `derma_viral_serologies` combinado sigue `NONE/NO_PROPOSAL` y no se reparte a VHB/VHC/VIH.
- No inferencia desde nombre de fármaco, CIMA, catálogo, historial o dato ausente.
- Intake no crea/selecciona paciente ni escribe tratamiento validado.

### Evidencia vigente

- Train C final verifier: oracle final PASS + T10 `14/14 PASS` una sola vez, árbol limpio, cero mutación del verifier.
- Auditoría independiente pre-PR #341 sobre candidate exacto: C1 `147/147`, C2 `134/134`, C2 browser oracle `5/5`, final oracle PASS, IDs DOM duplicados `0`, `git diff --check` PASS.
- PR #341 head smoke #1018 `success`; post-merge recovery smoke #1019 `success`.
- QA manual humana sobre recovery con plantilla D17_EXT_V1 correcta confirmó auto-reveal + hidratación C1/C2.
- Promoción 0.6: builder reproducible, checker 16/16, `BADAJOZ_ZERO`, oracle integrado sobre snapshot PASS, T10 snapshot 14/14, PR #346 head smoke #1024 `success`, post-merge smoke #1025 `success` y Pages #219 `success`.
- Todo lo anterior usa fixtures/datos sintéticos; no acredita piloto ni producción.

### Snapshot y paquete

`CÁCERES-REVIEW-0.6` es el snapshot estable vigente y fue promovido explícitamente por #345/#346 desde el HEAD clínico funcional `e1120ba85817a1807cea8c1e938867ad778921f4`. Su publicación no convierte el entorno en piloto/producción. El paquete externo/workbooks permanece en su freeze sintético anterior y no se refreezea por 0.6.

---

## Leyenda

| Símbolo | Estado |
| --- | --- |
| ✅ Merged | Incorporada a la rama base |
| ✅ MERGED_AND_VERIFIED | Fusionada en recovery y verificada en el alcance de su WO; la visibilidad vigente se consulta en el estado publicado superior |
| 📋 Ready for review | Publicada en rama de trabajo y pendiente de revisión/merge |
| 🔄 Superseded | Sustituida funcional o documentalmente por otra WO |
| 🟢 Validated | Validada en una candidata histórica no integrada |
| ✅ Completada | Trabajo finalizado sin merge aplicable |
| 📋 Draft | Borrador no apto para merge |
| ⏸️ Pausada | Detenida hasta decisión humana |
| 🔴 Bloqueada | No puede continuar sin resolver una incidencia |
| ❌ Descartada | No se ejecutará |

> Un merge técnico no demuestra por sí solo corrección funcional. Cuando la QA humana contradice los tests, el tablero refleja la adjudicación funcional real.

---

## Work orders

| WO | Título | Estado | Rama | Merge/Commit | Notas |
| --- | --- | --- | --- | --- | --- |
| **WO-FH-CACERES-REVIEW-0.5 (#331)** | Promoción snapshot Cáceres 0.5 | ✅ Merged | `work/fh-caceres-review-0.5-331-20260907` | candidate `59d7b7e...` → merge `2ee9c54...` (PR #333) | Manifest `CÁCERES-REVIEW-0.5`, source `45645417...`; synthetic/demo only |
| **WO-FH-EORDEN-CONTEXT-AUTO-REVEAL (#334)** | Auto-reveal Dermatología/patología | ✅ Merged | `work/fh-eorden-context-auto-reveal-334-20260907` | `ad4088c...` → `7b99eda...` (PR #335) | Presentation-only; no prewrite de patología |
| **WO-FH-EORDEN-DERMA-EXTENDED-CONTRACT (#336)** | D17_EXT_V1 | ✅ Merged | `work/fh-eorden-derma-extended-contract-336-20260907` | `773f66f...` → `775a8c08...` (PR #337) | Transporte clínico extendido seguro; legacy D17 preservado |
| **TRAIN-FH-EORDEN-CLINICAL-HYDRATION-C (#338)** | Train C C1→C2→verifier | ✅ Completed | `work/fh-eorden-clinical-hydration-train-c-338-20260907` | C1 `bbf898b...`; C2 `e5e52e2...` | Final oracle PASS; T10 14/14 una vez |
| **WO C1 (#339)** | Hidratación clínica patología/comorbilidades | ✅ Completed | Train C | `bbf898bc789840c0b4bc7635636b81d740afe60e` | 39 concepts; D5/D16 + pathology/parent gates |
| **WO C2 (#340)** | Analítica/vacunación compartida + hidratación | ✅ Completed | Train C | `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` | 7 conceptos; serología combinada no-write |
| **WO Train C Promotion (#342)** | Promoción técnica a recovery | ✅ Merged | `work/fh-eorden-clinical-hydration-train-c-338-20260907` | merge `e1120ba85817a1807cea8c1e938867ad778921f4` (PR #341) | Smoke #1019 success; snapshot/package no refrozen |
| **WO-DOC-FH-POST-TRAIN-C (#343)** | Reconciliación documental post Train C | ✅ Merged | `docs/fh-post-train-c-reconciliation-343-20260907` | merge `79c9fd37f2a631a4316439013e4b0632268cf90a` (PR #344) | #343 CLOSED/completed; documentación-only |
| **WO-FH-CACERES-REVIEW-0.6 (#345)** | Promoción snapshot Cáceres 0.6 | ✅ Merged | `work/fh-caceres-review-0.6-345-20260907` | candidate `749c824...` → merge `19d10c9...` (PR #346) | Manifest `CÁCERES-REVIEW-0.6`, source/last-functional `e1120ba8...`; smoke #1025 + Pages #219 success |
| **WO-DOC-FH-POST-CACERES-0.6 (#347)** | Reconciliación documental post 0.6 | ✅ Merged | `docs/fh-post-caceres-0.6-reconciliation-347-20260908` | merge `a7428b0195435477bfa86e779b63ea95955ed723` (PR #348) | #347 CLOSED/completed; smoke #1028 success; documentación-only |
| **WO-DOC-FH-RECOVERY-HEAD-TERMINOLOGY (#349)** | Convención tip Git / HEAD de producto / HEAD clínico | 📋 Ready for review | `docs/fh-recovery-head-terminology-349-20260908` | pendiente | Solo INDEX/WOS/estado vivo; no cambia producto/snapshot |
| **Preflight 1** | SSH GitHub + clonado | ✅ Merged | `feature/reuma-v2-prebiologico-fh-les-sjogren` | — | Preflight manual, sin WO formal |
| **Preflight 2** | Validación post-merge WO-001 | ✅ Merged | `feature/reuma-v2-prebiologico-fh-les-sjogren` | `f7e1083` | Pull `--ff-only` y verificación de gobernanza |
| **WO-001** | Gobernanza ejecutable | ✅ Merged | `work/hermes/wo-001-agent-governance` → `feature/...` | `f5177f7` → `f7e1083` | PR #2 |
| **WO-001b** | Refinar plantilla de reporte | ✅ Merged | `work/hermes/wo-001b-report-template-refinement` | `cf4ed35` | Incluida en PR #2 |
| **WO-002** | Contratos mínimos documentales | ⏸️ Pausada | `work/hermes/wo-002-contratos-minimos` | `fa59106` | Borrador prematuro; no mergear |
| **WO-003** | Inventario técnico Reuma v2 | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `d4172d0` | Integrada vía WO-009b |
| **WO-004** | Mapa de flujos actuales | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `1f61f9d` | Integrada vía WO-009b |
| **WO-005** | Smoke test checklist | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `352fbe1` | Integrada vía WO-009b |
| **WO-006** | Índice documental | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `6e20a2c` | Integrada vía WO-009b |
| **WO-007** | Estado de ramas y decisiones | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `3f40902` | Integrada vía WO-009b |
| **WO-008** | Auditoría de riesgos técnicos | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `6414324` | Integrada vía WO-009b |
| **WO-009** | Reporte de lote nocturno | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `c9a1276` | Integrada vía WO-009b |
| **WO-009b** | Corrección editorial lote nocturno | ✅ Merged | `work/hermes/wo-009b-correccion-editorial-lote-nocturno` | `16ff810` | Incluye WO-003 a WO-009 |
| **WO-010** | Canvas formularios Enfermería/Farmacia | ✅ Merged | `work/hermes/wo-010-canvas-diseno-formularios` | `194bef0` | Documento de trabajo, no contrato final |
| **WO-011** | Política de modelos y delegación | 🔄 Superseded | `work/hermes/wo-011-model-routing-governance` | `f4a9a33` | Sustituida por WO-012/012b |
| **WO-012** | Governance hygiene | ✅ Merged | `work/hermes/wo-012-governance-hygiene-status` | — | Integrada vía WO-012b |
| **WO-012b** | Refinamiento de gobernanza | ✅ Merged | `work/hermes/wo-012b-status-risk-refinement` | `97f673d` | Incluye WO-012 |
| **WO-013** | Alinear documentación canónica | ✅ Merged | `work/hermes/wo-013-canonical-docs-alignment` | `da39ace` | Integrada vía WO-013b |
| **WO-013b** | Corregir criterios de avance | ✅ Merged | `work/hermes/wo-013b-fix-advancement-criteria` | `1ed2e9b` | Incluye WO-013 |
| **WO-014** | Plan formativo y decisiones por fase | ✅ Merged | `work/hermes/wo-014-learning-decision-protocol` | `bc68cb4` | Integrada vía WO-014b |
| **WO-014b** | Corrección editorial post-WO14 | ✅ Merged | `work/hermes/wo-014b-fix-status-index-formatting` | `f843298` | Incluye WO-014 |
| **WO-015** | Capa temporal multipatología Farmacia | ✅ Merged | `work/hermes/wo-015-documentar-capa-entrada-farmacia` | `d3f785f` | Integrada vía WO-015b |
| **WO-015b** | Corregir frase de arquitectura | ✅ Merged | `work/hermes/wo-015b-fix-arquitectura-frase-perfiles` | `c3bade0` | Incluye WO-015 |
| **WO-016** | Especificación Farmacia v0.1 | ✅ Merged | `work/hermes/wo-016-especificacion-funcional-farmacia-v0-1` | `f5a6397` | Hito histórico de demo |
| **WO-DOC-ROADMAP-POST-SES-01** | Roadmap post-SES | ✅ Merged | `work/hermes/WO-DOC-ROADMAP-POST-SES-01-20260710` | `14e86b29` (PR #9) | Propuesta documental |
| **WO-DOC-ARCHIVE-POST-SES-01** | Archivar documentos obsoletos | ✅ Merged | `work/hermes/WO-DOC-ARCHIVE-POST-SES-01-20260710` | `fa2a4d53` (PR #10) | Solo documentación |
| **WO-DOC-UPDATE-ARCHITECTURE-POST-SES-01** | Alinear arquitectura post-SES | ✅ Merged | `work/hermes/WO-DOC-UPDATE-ARCHITECTURE-POST-SES-01-20260710` | `dc1ce11` (PR #11) | Solo documentación |
| **WO-DOC-DECISION-DISCOVERY-REUMA-FH-POST-SES-01** | No merge Reuma-Farmacia + discovery | ✅ Merged | `work/hermes/WO-DOC-DECISION-DISCOVERY-REUMA-FH-POST-SES-01-20260710` | `bd5687c` (PR #13) | Decisión vigente y revisable |
| **WO-DOC-INDEX-CONTROL-PLANE-POST-SES-01** | Índice + control plane federado | ✅ Merged | `work/hermes/WO-DOC-INDEX-CONTROL-PLANE-POST-SES-01-20260713` | `17f29fa` (PR #14) | La rama HOLD no se mergea |
| **WO-DOC-PROM-CAPTURE-GATEWAY-QR-01** | PROM Gateway QR | ✅ Merged | `work/hermes/WO-DOC-PROM-CAPTURE-GATEWAY-QR-20260714` | `2440924` (PR #16) | Arquitectura exploratoria |
| **WO-DOC-IDENTITY-PLANE-NURSING-READINESS-01** | Identity Plane + Nursing Readiness | ✅ Merged | `work/hermes/WO-DOC-IDENTITY-PLANE-NURSING-READINESS-20260714` | `0a9019b` (PR #17) | Exploratorio; Identity Plane físico diferido el 2026-07-31 |
| **WO-DOC-TREATMENT-LIFECYCLE-ENGINE-01** | Lifecycle y renovaciones | ✅ Merged | `work/hermes/WO-DOC-TREATMENT-LIFECYCLE-ENGINE-20260714` | `b59e09a` (PR #18) | Arquitectura por línea; no implementada |
| **WO-DOC-HOUSEKEEPING-POST-PR17-PR18-01** | Estado post PR #17/#18 | ✅ Merged | `work/hermes/WO-DOC-HOUSEKEEPING-POST-PR17-PR18-20260714` | `84d161d` (PR #19) | Housekeeping |
| **WO-DOC-INGEST-SIL-SCREEN-REVIEW-POST-PR20-01** | Revisión funcional Sil | ✅ Merged | `work/hermes/WO-DOC-INGEST-SIL-SCREEN-REVIEW-POST-PR20-01-20260714` | merge `269627cd...` (PR #21) | Evidencia histórica |
| **WO-DOC-INGEST-FH-TECHNICAL-SCREEN-AUDIT-POST-PR21-01** | Auditoría técnica Farmacia | ✅ Merged | `work/hermes/WO-DOC-INGEST-FH-TECHNICAL-SCREEN-AUDIT-POST-PR21-01-20260715` | merge `7d9bedd6...` (PR #22) | Evidencia histórica |
| **WO-DOC-FH-SCREEN-AUDIT-RECONCILIATION-POST-PR22-01** | Reconciliar auditorías | ✅ Merged | `work/hermes/WO-DOC-FH-SCREEN-AUDIT-RECONCILIATION-POST-PR22-01-20260715` | merge `06b5e2ff...` (PR #23) | No autoriza piloto |
| **WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01** | Cambio seguro de CIP | ✅ Merged | `work/hermes/WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01-20260715` | merge `48de5909...` (PR #24) | QA acotada |
| **WO-FH-ALTA-GUIADA-CONTEXT-PROPAGATION-01** | Propagar alta guiada | ✅ Merged | `work/hermes/WO-FH-ALTA-GUIADA-CONTEXT-PROPAGATION-01-20260715` | merge `8f7fc562...` (PR #25) | Navegación demo |
| **WO-FH-VALIDACION-FLOW-PREFILL-MINIMAL-01** | Precarga explícita | ✅ Merged | `work/hermes/WO-FH-VALIDACION-FLOW-PREFILL-MINIMAL-01-20260715` | merge `1d8aac74...` (PR #26) | Solicitado separado de validado |
| **WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-MINIMAL-01** | Simplificar Validación | ✅ Merged | `work/hermes/WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-MINIMAL-01-20260715` | merge `58e59b11...` (PR #27) | Limpieza mínima |
| **WO-FH-SEGUIMIENTO-FIRST-SEARCH-CONFIRMATION-FIX-01** | Evitar confirmación falsa | ✅ Merged | `fix/fh-seguimiento-first-search-confirmation-20260715` | merge `84a44bbb...` (PR #29) | Guard de primer contexto |
| **WO-FH-PR57E-DASHBOARD-VISIT-LINE-GROUPING-01** | Dashboard por visita y línea | ✅ Merged | `work/fh-pr57e-dashboard-visit-line-grouping-20260728` | merge `712b413e...` (PR #173, issue #172) | Demo, no persistencia real |
| **WO-FH-DERMA-PATHOLOGY-SPECIFIC-VALIDATION-01** | Dermatología multipatología | ✅ Merged | `work/fh-derma-pathology-validation-20260728` | merge `ce88818b...` (PR #175, issue #174) | Cinco patologías y salidas coherentes |
| **WO-FH-CACERES-PHARMACY-ONLY-DEPLOYMENT-01** | Snapshot Cáceres 0.1 | ✅ Merged | `work/fh-caceres-pharmacy-only-deployment-20260728` | merge `cd258e76...` (PR #177, issue #176) | Histórico; sustituido como snapshot actual por 0.2 |
| **WO-FH-CIMA-CONTEXTLESS-SELECTION-P0-01** | Restaurar CIMA sin contexto de paciente | ✅ Merged | `work/fh-cima-contextless-selection-p0-20260730` | merge `ee1abd88...` (PR #183, issue #182) | QA técnica y navegador PASS |
| **WO-FH-VALIDATION-MANUAL-REQUESTED-CIMA-MINIFIX-01** | Minifix del autocomplete manual | 🔄 Superseded | `work/fh-validation-manual-requested-cima-minifix-20260730` | merge `5e70afa5...` (PR #185, issue #184) | Fusionada, pero FAIL en QA humana pública; sustituida por PR #187 |
| **WO-FH-VALIDATION-MANUAL-REQUESTED-CLONE-WORKING-AUTOCOMPLETE-P0-03** | Clonar autocomplete validado | ✅ Merged | `work/fh-validation-manual-requested-clone-p0-20260730` | merge `54f6bb2c...` (PR #187, issue #186) | Corrección definitiva; QA humana regional PASS |
| **WO-FH-CACERES-REVIEW-02-PROMOTION-01** | Promover Cáceres 0.2 | ✅ Merged | `work/fh-caceres-review-02-promotion-20260730` | merge `accac670...` (PR #189, issue #188) | Snapshot generado; QA humana Cáceres PASS |
| **WO-DOC-FH-V4-VACATION-PLAN-ARCHITECTURE-20260731** | Estado, plan de vacaciones y arquitectura V4 | ✅ Merged | `docs/fh-v4-vacation-plan-architecture-20260731` | merge `9725bf60...` (PR #191, issue #190) | Seis rutas documentales; sin código ni datos reales |
| **WO-FH-CACERES-QUICK-WINS-03-01** | Quick wins de Validación Farmacia | ✅ Merged | `work/fh-caceres-quick-wins-03-01-20260731` | merge `4801e9aa...` (PR #193, issue #192) | En ese merge: CI verde y promoción pendiente; promovida después mediante PR #197 |
| **WO-DOC-FH-CACERES-QUICK-WINS-RECONCILIATION-20260731** | Reconciliar publicación de quick wins | ✅ Merged | `work/doc-fh-caceres-quick-wins-reconciliation-20260731` | merge `815e16f9...` (PR #195, issue #194) | Estado documental y QA reconciliados |
| **WO-FH-CACERES-REVIEW-03-PROMOTION-01** | Promover Cáceres 0.3 | ✅ Merged | `work/fh-caceres-review-03-promotion-20260731` | merge `96a4cb0b...` (PR #197, issue #196) | Snapshot 0.3; fuente funcional `815e16f9...` |
| **WO-FH-SYNTHETIC-EVALUATION-LEDGER-01** | Ledger local de evaluación sintética | ✅ Merged | `work/fh-synthetic-evaluation-ledger-01-20260801` | merge `ac93575d...` (PR #199, issue #198) | Histórico en runtime: módulo aún versionado, pero desacoplado de las tres pantallas por PR #231 |
| **WO-FH-SYNTHETIC-EVALUATION-WORKBOOK-01** | Workbook técnico de evaluación | ✅ Merged | `work/fh-synthetic-evaluation-workbook-01-20260801` | merge `25c75165...` (PR #201, issue #200) | 11 hojas técnicas; artefacto histórico, no workbook operativo definitivo |
| **WO-FH-EVALUATION-FLOW-REALIGN-01** | Realinear persistencia con el flujo asistencial | ✅ Merged | `work/fh-evaluation-flow-realign-01-20260801` | merge `6dcedff4...` (PR #203, issue #202) | Retira cohorte ficticia visible; QA pública PASS; persistencia ledger retirada después por PR #231 |
| **WO-FH-FIRST-VISIT-EXCEL-TRUTH-P0-01** | Verdad del Excel de Primera Visita | ✅ Merged | `work/fh-first-visit-excel-truth-p0-01-20260801` | merge `68b53837...` (PR #205, issue #204) | CIP/acto visible; 61 columnas; QA pública PASS |
| **WO-FH-EXPORT-CONTRACT-V2-RECONCILIATION-01** | Reconciliar contrato export v2 | ✅ Merged | `work/fh-export-contract-v2-reconciliation-01-20260801` | merge `2f54c4ec...` (PR #207, issue #206) | Fila común v2, grano por línea activa y componentes del Bridge documentados |
| **WO-DOC-FH-EXPORT-V2-SEQUENCE-WO1-01** | Secuencia WO1–WO9 y WO1 técnica | ✅ Merged | `work/fh-export-v2-sequence-wo1-docs-20260802` | merge `5e9b59ba...` (PR #209, issue #208) | Siete rutas documentales; no añadió capacidad funcional |
| **WO-FH-EXPORT-V2-CANONICAL-CORE-01** | Núcleo canónico fila v2 | ✅ Merged | `work/fh-export-v2-canonical-core-01-20260802` | commit `7109b5f1...`, merge `6ac041f8...` (PR #211, issue #210) | Estado histórico al merge: 152 columnas candidate y roundtrip TSV, sin salida pública v2; visibilidad añadida después por PR #227 |
| **WO-DOC-FH-EXPORT-V2-CORE-MERGE-RECONCILIATION-01** | Reconciliar publicación de WO1 | ✅ Merged | `work/doc-fh-export-v2-core-merge-reconciliation-01-20260802` | commit `ed1cb13a...`, merge `f46d99a0...` (PR #213, issue #212) | Cinco rutas documentales; reconcilió la publicación del core; superada como estado actual por la reconciliación de adaptadores de 2026-08-03 |
| **WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01** | Adaptador interno de Validación v2 | ✅ MERGED_AND_VERIFIED | `work/fh-export-v2-adapters-stack-01-20260802` | commit `1fcd9e4a...`, merge `17426f60...` (PR #215, issue #214) | Estado histórico al merge: infraestructura interna sin salida pública v2 ni cutover; visibilidad añadida por PR #227 |
| **WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01** | Adaptador interno de Primera Visita v2 | ✅ MERGED_AND_VERIFIED | `work/fh-export-v2-first-visit-adapter-01-20260803` | commit `c42eecef...`, merge `c45b7d13...` (PR #217, issue #216) | Estado histórico al merge: infraestructura interna sin salida pública v2 ni cutover; visibilidad añadida por PR #227 |
| **WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01** | Adaptador interno de Seguimiento v2 por líneas activas | ✅ MERGED_AND_VERIFIED | `work/fh-export-v2-followup-active-lines-01-20260803` | commit `8b7372ac...`, merge `b9f27e96...` (PR #221, issue #220) | Estado histórico al merge: infraestructura interna sin salida pública v2 ni cutover; `activeLines`, guards y QA PASS; visibilidad añadida por PR #227 |
| **WO-FH-EXPORT-V2-FOLLOWUP-DOC-RECONCILIATION-01** | Reconciliar publicación de Seguimiento v2 | ✅ Merged | `work/fh-export-v2-followup-doc-reconciliation-01-20260804` | commit `b803b4c7...`, merge `dfbbf76b...` (PR #223, issue #222) | Reconciliación documental post-Seguimiento v2; histórica tras PR #227 |
| **WO-FH-EXPORT-V2-TECHNICAL-CONTEXT-01** | Proveedor técnico sintético cerrado | ✅ Merged | `work/fh-export-v2-technical-context-01-20260804` | commit `00e5c8a6...`, merge `e2f2c663...` (PR #225, issue #224) | Registro cerrado a FH-001/FH-004; identidad técnica explícita y separada del CIP; sin storage ni salida pública propia |
| **WO-FH-EXPORT-V2-PARALLEL-ACTIVATION-01** | Activar Export v2 demo en paralelo | ✅ Merged | `work/fh-export-v2-parallel-activation-01-20260804` | commit `fe84d83c...`, merge `f86f72f8...` (PR #227, issue #226) | TSV común de 152 columnas: Validación 1 fila; Primera Visita/Seguimiento `1..N` según líneas explícitas; v1 intacta |
| **WO-FH-EVALUATION-LEDGER-RUNTIME-RETIREMENT-01** | Retirar ledger clínico del runtime soportado | ✅ Merged | `work/fh-evaluation-ledger-runtime-retirement-01-20260804` | commit `b1ee11e0...`, merge `19867ef1...` (PR #231, issue #230) | En aquel merge, tres pantallas sin carga del ledger, sin restauración ni alternativa; superseded después por issue #250 / PR #251 y issue #252 / PR #253 |
| **WO-FH-EXCEL-BRIDGE-WORKBOOK-01** | Workbook operativo Excel Bridge Cáceres | ✅ MERGED_AND_VERIFIED | `work/fh-excel-bridge-workbook-01-20260804` | commit `c286afab...` (PR #233, issue #232) | 18 hojas, 152 columnas, `01_DERMA`/`03_DIGESTIVO`, 16 shells técnicos; QA manual Microsoft Excel y controles negativos PASS; sin Office Script ni `APP_*` |
| **WO-FH-EXCEL-BRIDGE-RAW-READ-MODEL-01** | Lector raw v2 y read model | ✅ MERGED_AND_VERIFIED | `work/fh-excel-bridge-raw-read-model-01-20260805` | commit `7da866b2...`, merge histórico `92c00eb7...` (PR #238, issue #237) | Workbook Bridge, botón `Cargar Excel de Farmacia`, dos hojas raw, 152 columnas, cardinalidad `1..N`; read model solo en memoria; candidate SHA-256 `2b7b2eed0f4310156e701c6357505442f47d13e7492869fcfbc1e9dedf564af4`; QA Node 21 casos, workbook/openpyxl, navegador, legacy, Enfermería y smoke CI PASS |
| **WO-FH-BRIDGE-V2-PATIENT-SELECTORS-QUICK-VIEW-01** | Selectores de paciente y Quick View Bridge v2 | ✅ MERGED_AND_VERIFIED | `work/fh-bridge-v2-patient-selectors-quick-view-01-20260805` | issue #241; PR #242; commits `3da3d450890508e7ee11ea7b801ad37ba4052cf5` + `94cd44688b82aea0a10e4778e3182ab300bd6be0`; merge `e2c54583ccc5876058403c34a675496cab897972` | Búsqueda por sistema + valor explícitos, `patient_id` técnico, Quick View visible dentro de `farmacia_index.html`, sin fallback demo ni alta guiada con Bridge activo; selector checker 82 casos, reader checker 21, smoke 48, Actions SUCCESS, QA navegador/focal PASS, consola limpia, `pageerror = 0`, revisión independiente APTO; no declara piloto, deploy ni persistencia longitudinal |
| **WO-FH-BRIDGE-V2-RUNTIME-HANDOFF-DASHBOARD-01 (histórica)** | Handoff efímero y dashboard Bridge de solo lectura | ✅ MERGED_AND_VERIFIED | `work/fh-bridge-v2-runtime-handoff-dashboard-01-20260805` | issue #245; PR #246; merge `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6` | Capacidad histórica; no experiencia soportada actual, no persistencia, piloto ni deploy |
| **WO-FH-RAW-EXCEL-CURRENT-PATIENT-SESSION-01** | Data Port y sesión del paciente actual | ✅ MERGED_AND_VERIFIED | `recovery/farmacia-pr-replay-20260727` | issue #250; PR #251; merge `de830803e84bc5e89446084bbf5a0313d15426a0` | `RawExcelDataSource`, `CurrentPatientSession` y envelope temporal |
| **WO-FH-RAW-EXCEL-PATIENT-FLOW-CUTOVER-01** | Cutover del flujo normal | ✅ MERGED_AND_VERIFIED | `recovery/farmacia-pr-replay-20260727` | issue #252; PR #253; merge histórico `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f` | Flujo normal publicado sin modo Bridge visible; superseded como HEAD regional por #257/#258 y posteriormente #261/#262 y #265/#266 |
| **WO-FH-RAW-STATISTICS-CUTOVER-01** | Estadísticas raw y CSV de cohorte | ✅ MERGED_AND_VERIFIED | `work/fh-raw-statistics-cutover-01-20260806` | issue #257; PR #258; candidate `5a7ad559...`; merge histórico `a9d6d464...` | Raw population statistics; handoff efímero; CSV 37 columnas; QA Chromium; `LOCAL_CI_EQUIVALENT_PASS` por incidencia GitHub; no es el HEAD vigente |
| **WO-FH-RAW-QUICKVIEW-PROMS-01** | Quick View PROM raw | ✅ MERGED_AND_VERIFIED | `work/fh-raw-quickview-proms-01-20260806` | issue #261; PR #262; candidate `13963f89...`; merge `f2b827fe...` | Renderer estructurado publicado/demostrado para evaluación sintética; `PREEXISTING_QUICKVIEW_P2` resuelto; sin thresholds ni interpretación clínica; Reader 21/21, Selectors 82/82, Quick View PROM Chromium PASS |
| **WO-FH-RAW-PATIENT-LONGITUDINAL-CUTOVER-01** | Patient Longitudinal raw | ✅ MERGED_AND_VERIFIED | `recovery/farmacia-pr-replay-20260727` | issue #265; PR #266; candidate `a7b8deb...`; merge publicado vigente `fb7b70c...` | Patient Longitudinal raw implementado, publicado y demostrado para evaluación sintética; `LONGITUDINAL_FULL_HISTORY_NOT_DEMONSTRATED` resuelto; hosted Farmacia smoke #914 SUCCESS; sin piloto ni producción |
| **WO-FH-EVALUATION-PACKAGE-01** | Paquete externo de evaluación sintética | ✅ Merged | `work/fh-evaluation-package-01-20260807` | issue #269; PR #270; initial candidate `a026549...`; merge `8bfceaaa956199610be9c0e6df40740a04b73699` | Package exclusivamente sintético, sin cambios funcionales ni autorización de piloto o producción; superseded como WO activa del package por el freeze autónomo del issue #277 |
| **WO-FH-CACERES-EVALUATION-SNAPSHOT-04-01** | Promover snapshot Cáceres 0.4 | ✅ Merged | `work/fh-caceres-evaluation-snapshot-04-20260807` | issue #271; PR #272; candidate `d9cbd56b515ee75c871bfb5e63f96320c963b1e0`; merge `9125518a74151010eaa2d48b913c5954fa54b8a1` | Snapshot `CÁCERES-REVIEW-0.4` publicado; evaluación Pharmacy-only Cáceres |
| **WO-FH-CACERES-MANIFEST-EOL-INTEGRITY-01** | Estabilizar integridad de manifest | ✅ Merged | `work/fh-caceres-manifest-eol-integrity-01-20260807` | issue #273; PR #276; candidate `963bac71ffac4e2d6d088aeeb4d9abeaf8f5bad1`; merge histórico `451d02361fc54cc01f493ca2a89192bde52d7fd9` | Integridad EOL/line-ending del manifest del snapshot 0.4; merge histórico, superado como estado publicado por el freeze documental del issue #277 / PR #278 |
| **WO-FH-EVALUATION-AUTONOMOUS-FREEZE-01** | Freeze autónomo del paquete de evaluación sintética | ✅ MERGED_AND_VERIFIED | `work/fh-evaluation-autonomous-freeze-01-20260807` | issue #277; PR #278; candidate freeze `9d95ec997ff7907e6403f5b69de9375052f817c5`; merge `827163d8c0d4eafb8af235da9a97aa4338a8141f` | Freeze documental `MERGED_AND_VERIFIED` dentro del alcance documental/freeze; paquete final `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`; ZIP final integridad PASS |
| **WO-FH-DASHBOARD-PROMS-SHAPE-P1-01** | Fix P1 F-01/F-04 Dashboard PROMs | ✅ MERGED_AND_VERIFIED | `recovery/farmacia-pr-replay-20260727` | issue #288 (CLOSED / completed); PR #289 (MERGED); merge histórico/preservado `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb` | Fix P1 F-01/F-04 del Dashboard demo publicado en recovery; `proms` STRING legacy como contexto demo sin parseo/iteración clínica; ARRAY raw intacto; QA pre-merge Chromium supported-route PASS y hosted post-merge smoke #943 `success`; snapshot/package NO refrozen |
| **WO-DOC-FH-P1-POSTMERGE-RECONCILIATION-01** | Reconciliación documental post-merge #289 | 🔄 Superseded | `work/fh-p1-doc-reconciliation-20260904` | issue #290; PR #291 abierto/histórico | Fuente del baseline/postscript P1; superseded como estado vivo por #325 tras publicación #324 |
| **WO-DOC-FH-UNIFIED-INTAKE-FINAL-RECONCILIATION-01** | Auditoría/reconciliación final del train original | ✅ Completada | `work/hermes/fh-unified-intake-final-reconciliation-20260906` | issue #315; commit `4cb2c9dd…`; sin merge | Fuente factual del train original; auditoría incorporada por #325 |
| **WO-FH-T8-REPAIR-C-STALE-STAGE-EXPIRY-01** | Repair C autorización stale-stage | ✅ Completada | `work/hermes/fh-t8-repair-c-317-20260906` | issue #317; `d6d4bac…` | Checkpoint aceptado; posteriormente incorporado a recovery por #324 |
| **WO-FH-T9-HARDEN-SES-ATOMIC-WRITE-01** | Hardening SES atomic write | ✅ Completada | `work/hermes/fh-t9-ses-atomic-repair-319-r3-20260906` | issue #319; `4ec70f5…` | Checkpoint aceptado; posteriormente incorporado a recovery por #324 |
| **WO-FH-UNIFIED-INTAKE-COMPOSE-T1-T10-01** | Composición física T1–T10 | ✅ Completada | `work/hermes/fh-unified-intake-compose-t1-t10-322-20260906` | issue #322; `0916989…` | Candidate físico aceptado y usado como fuente de promoción |
| **WO-FH-UNIFIED-INTAKE-PROMOTE-RECOVERY-01** | Promoción Unified Intake a recovery | ✅ MERGED_AND_VERIFIED | `recovery/farmacia-pr-replay-20260727` | issue #323; PR #324; merge `bff76ff7095fb568948b1bfbc6288df551971add` | Producto publicado y verificado post-merge; snapshot Cáceres/package no refrozen |
| **WO-DOC-FH-POST-UNIFIED-INTAKE-PUBLICATION-RECONCILIATION-01** | Reconciliación documental post-publicación | ✅ Completed | `docs/fh-post-unified-intake-reconciliation-325-20260906` | issue #325 CLOSED/completed | Reconciliación histórica post #324; superseded como estado vivo por #347 |
| **WO-DOC-FH-EVALUATION-FINAL-RECONCILIATION-01** | Reconciliación documental final del freeze | 📋 Ready for review | `docs/fh-evaluation-final-reconciliation-01-20260807` | issue #279; sin PR/merge | Reconciliación documental histórica del freeze #277/#278; superada como WO actual por #290 |

Correcciones P1 publicadas en `7ebc482629e1e818a6227c8e8946cddd12ee113a`: normalización simétrica mediante `trim()` para contexto e identificadores almacenados; padding almacenado soportado; componentes whitespace-only rechazados con `HANDOFF_IDENTIFIER_COMPONENT_EMPTY`; sensibilidad a mayúsculas preservada; payload original no mutado; TTL único `sessionTtlMs = 45000`; timeout funcional de 1500 ms retirado. El dashboard Bridge y su handoff quedan como historia técnica; los formularios normales publicados se describen en las entradas posteriores de patient-flow.

### Adjudicación de WO5 Export v2

El alcance original de `WO-FH-EXPORT-V2-CUTOVER-01` incluía activación pública, compatibilidad y retirada gobernada de v1. PR #225 y PR #227 satisfacen una parte mediante unidades menores. Su adjudicación descriptiva es `PARTIALLY_SATISFIED_BY_SMALLER_UNITS / REMAINING_SCOPE_DEFERRED`: no se añade un estado nuevo a la leyenda, no se reabre WO5 como megadesarrollo y tampoco se declara completamente cerrada.

Para esta reconciliación, **WO5A** nombra retrospectivamente `WO-FH-EXPORT-V2-TECHNICAL-CONTEXT-01` (issue #224, PR #225). Aporta fixtures de contexto técnico sintético con `patient_id`, IDs de acto, `treatment_id` y `line_id` explícitos, estables y predeclarados. El proveedor no genera esos IDs, no deriva ni transforma el CIP en identidad técnica y falla cerrado para cualquier contexto no registrado; no es un `IdentityRepository` ni añade salida pública propia. **WO5B** nombra retrospectivamente `WO-FH-EXPORT-V2-PARALLEL-ACTIVATION-01` (issue #226, PR #227). No son títulos oficiales originales. No existe WO5C ejecutada ni se declarará sin issue, manifest, PR y evidencia publicada.

Quedan aplazadas la retirada de v1 y la promoción de versiones `draft`. El workbook operativo está implementado y verificado desde PR #233; el reader/Data Port, sesión, dashboards y formularios normales están integrados por los issues #250/#252 y las PR #251/#253. PR #246 queda como historia técnica del Bridge. Estadísticas raw y CSV están implementados y publicados por #257/#258; Office Script integrado, tablas relacionales pobladas, vistas `APP_*`, `RelationalExcelDataSource`, Processor y roundtrip no están implementados. La decisión completa vive en [`../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md).

### Estado técnico de persistencia en navegador

PR #231 retiró del runtime soportado el ledger clínico basado en `localStorage`. El issue #250 y la PR #251 usan `sessionStorage` solo para el envelope temporal del paciente actual, con claves cerradas y sin workbook, bytes, read model completo, población, cohorte u otros pacientes. Cambiar de CIP purga el contexto anterior. PR #238/#242/#246 se conserva como trazabilidad del Bridge histórico; no define un modo visible actual. No hay persistencia longitudinal definitiva resuelta.

### Deuda administrativa de issues

A 2026-08-07, los issues #184, #186, #188, #190, #192, #269, #271, #273 y #277 continúan abiertos aunque sus PR están fusionadas (para #277, su PR #278 está fusionada y verificado). Los issues #194, #196, #198, #200, #202, #204, #206, #208, #210, #212, #214, #216, #220, #222, #224, #226, #230, #232 y #245 están cerrados. Esta WO documental no modifica issues históricos ni cierra #269/#271/#273/#277; su cierre queda pendiente de una decisión separada de la operadora.

---

## Bloque Farmacia v0.1 — rama frozen histórica

> Rama: `work/hermes/nightly-farmacia-v0-1-20260606`. No mergeada; se conserva como respaldo histórico.

| WO | Título | Estado | Referencia | Nota |
| --- | --- | --- | --- | --- |
| **WO-017** | Shell UI Farmacia | 📋 Ready for review | `e1892e0` | Histórico, no mergeado |
| **WO-018** | Buscador CIP y alta guiada | 📋 Ready for review | rama nocturna | Histórico |
| **WO-019** | Validación farmacoterapéutica | 📋 Ready for review | rama nocturna | Histórico |
| **WO-020** | Primera Visita | 📋 Ready for review | rama nocturna | Histórico |
| **WO-021** | Seguimiento + Morisky | 📋 Ready for review | rama nocturna | Histórico |
| **WO-022** | Dashboard paciente | 📋 Ready for review | rama nocturna | Histórico |
| **WO-023** | Dataset demo y catálogos | 📋 Ready for review | rama nocturna | Histórico |
| **WO-024** | TXT JARA + CSV | 📋 Ready for review | rama nocturna | Histórico |
| **WO-025** | Smoke/reporte macro | 📋 Ready for review | rama nocturna | Histórico |
| **WO-026** | Hardening visual | 📋 Ready for review | `0ceac8b` | Histórico |
| **WO-027** | Executive summary | 📋 Ready for review | `5ce00a4` | Histórico |
| **WO-028** | Auditorías Claude | 📋 Ready for review | `9fa56ad`, `0d893e4` | Histórico |
| **WO-029** | Pulido pre-demo | 📋 Ready for review | `947b066` | Histórico |
| **WO-030** | Robustez pre-demo | 📋 Ready for review | rama nocturna | Histórico |
| **WO-031** | Reducción de deuda | 📋 Ready for review | `22e7a93` | Histórico |
| **WO-032-lite** | Limpieza + smoke | 📋 Ready for review | `a80b4af` | Histórico |
| **WO-033-lite** | Freeze + CI | 📋 Ready for review | `d0d9739`, `0ac562d` | Histórico |
| **WO-034** | Cierre documental v0.1 | 📋 Ready for review | `1fe6f9b` | Histórico |

---

## Bloque Farmacia v0.2 — candidatas históricas

| WO | Título | Estado | Rama/commit | Notas |
| --- | --- | --- | --- | --- |
| **WO-035** | Catálogo CIMA completo | 🔄 Superseded | `work/farmacia-catalogo-cima-v0-1-20260606` / `3047673` | Sustituido por catálogo hospitalario |
| **WO-036** | Autocomplete dual hospitalario | 🟢 Validated | `work/hermes/farmacia-demo-v0-2-candidate-20260606` / `d631ee7` | Validada como demo histórica |
| **WO-037** | Rama limpia PR #5 | 📋 Draft | `work/farmacia-v0-2-autocomplete-dual-clean-20260606` / `b5643fd` | No mergear |
| **WO-038** | Auditoría técnica v0.2 | ✅ Completada | candidata v0.2 | Sin P0/P1 en su contexto histórico |

---

## Resumen

| Estado | Cantidad |
| --- | ---: |
| ✅ Merged | 64 |
| ✅ MERGED_AND_VERIFIED | 15 |
| 📋 Ready for review | 20 |
| 📋 Draft | 1 |
| 🟢 Validated | 1 |
| 🔄 Superseded | 4 |
| ✅ Completada | 5 |
| ⏸️ Pausada | 1 |
| 🔴 Bloqueada | 0 |
| ❌ Descartada | 0 |

**Total:** 111 work orders / preflights gestionadas.

Comprobación aritmética de las filas de tabla: 64 + 15 + 20 + 1 + 1 + 4 + 5 + 1 + 0 + 0 = 111, coherente con el total registrado.

Los totales incluyen referencias históricas no mergeadas. Ninguna cifra equivale a aptitud para piloto o producción.
