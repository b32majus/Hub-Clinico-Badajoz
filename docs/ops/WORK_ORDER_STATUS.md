# Work Order Status — Hub Clínico Badajoz / PROMueve Nexus

**Última actualización:** 2026-08-06
**Propósito:** Tablero de estado y trazabilidad de work orders ejecutadas
**Mantenedor:** Cora / Hermes PM; actualizar al cambiar el estado real de una WO

---

## Estado publicado actual de Farmacia

| Elemento | Valor |
|---|---|
| Rama regional | `recovery/farmacia-pr-replay-20260727` |
| HEAD regional publicado | `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f` (merge PR #253) |
| Activación funcional Export v2 demo | `fe84d83c7d3574840696c9fed70f98e581ec8916` (PR #227) |
| Retirada ledger runtime | `b1ee11e00affa39c4a91626bb03f493fbcdce7d9` (PR #231), merge `19867ef16127548d0b596482360d8e5cbe6e54e5` |
| Workbook Excel Bridge Cáceres | `c286afab70c0e396f16378212e6e29cf56792064` (PR #233) |
| WO8A-1 raw reader/read model | `7da866b205e509120bb2c7abc0a4efdf7341e659` (PR #238), `MERGED_AND_VERIFIED` |
| WO8A-2A-1 selectores + Quick View (Bridge histórico) | PR #242, commits `3da3d450890508e7ee11ea7b801ad37ba4052cf5` + `94cd44688b82aea0a10e4778e3182ab300bd6be0`, merge histórico `e2c54583ccc5876058403c34a675496cab897972`, `MERGED_AND_VERIFIED` |
| WO8A-2A-2 handoff efímero + dashboard Bridge | Issue #245, PR #246; capacidad histórica conservada, no modo visible soportado actual |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.3`, tree `81740136ce2b17572ba7851ef8d31dac4940a073` |
| SHA fuente snapshot | `815e16f9564c82f469a95745c5c6917593a8c3f0` (histórico; tree publicado intacto) |
| QA pública regional del HEAD actual | PR #253 y CI verde; smoke Farmacia `48/48`, sintaxis y checkers focales reportados PASS; no equivale a piloto |
| QA humana Cáceres | PASS |
| Estado asistencial | Evaluación con datos sintéticos; no piloto ni producción |
| Documento vivo | [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](./FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md) |
| Plan vigente | [`FARMACIA_PLAN_VACACIONES_20260731.md`](./FARMACIA_PLAN_VACACIONES_20260731.md) |
| Estado post patient-flow | [`FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md`](./FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md) |

## Reconciliación post patient-flow

PR #250/#251 integran el Data Port, `RawExcelDataSource` y `CurrentPatientSession`; PR #252/#253 publican el flujo normal sin modo Bridge visible:

```text
Excel raw → reader/selectors → Data Port → sesión del paciente actual
→ Inicio/Quick View → dashboards → Validación → Primera Visita → Seguimiento
```

- `sessionStorage` solo contiene el envelope versionado del paciente actual: identificador, `patient_id`, generación, proyección, datos explícitos, provenance, borradores y `dirty`.
- El envelope no contiene workbook, bytes, read model completo, población, cohorte ni otros pacientes; cambiar de CIP purga el contexto anterior.
- Farmacia raw tiene precedencia. Excel Enfermería solo enriquece huecos explícitos.
- Estadísticas mantiene el dashboard diseñado; la fuente raw y el CSV completo de la cohorte filtrada quedan para `WO-FH-RAW-STATISTICS-CUTOVER-01`.
- Actividad permanece demo y diferida, fuera de la siguiente WO técnica.
- Secuencia inmediata: `WO-DOC-FH-POST-PATIENT-FLOW-RECONCILIATION-01` → `WO-FH-RAW-STATISTICS-CUTOVER-01` → `WO-FH-EVALUATION-PACKAGE-01` → `APP_*`, `RelationalExcelDataSource`, `Processor` y roundtrip → PostgreSQL/servidor local mediante el mismo Data Port.

---

## Leyenda

| Símbolo | Estado |
|---|---|
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
|---|---|---|---|---|---|
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
| **WO-FH-EVALUATION-LEDGER-RUNTIME-RETIREMENT-01** | Retirar ledger clínico del runtime soportado | ✅ Merged | `work/fh-evaluation-ledger-runtime-retirement-01-20260804` | commit `b1ee11e0...`, merge `19867ef1...` (PR #231, issue #230) | Tres pantallas sin carga del ledger; sin restauración, contaminación entre CIP ni acceso a la clave legacy; no añade persistencia alternativa; `sessionStorage` fuera de alcance |
| **WO-FH-EXCEL-BRIDGE-WORKBOOK-01** | Workbook operativo Excel Bridge Cáceres | ✅ MERGED_AND_VERIFIED | `work/fh-excel-bridge-workbook-01-20260804` | commit `c286afab...` (PR #233, issue #232) | 18 hojas, 152 columnas, `01_DERMA`/`03_DIGESTIVO`, 16 shells técnicos; QA manual Microsoft Excel y controles negativos PASS; sin Office Script ni `APP_*` |
| **WO-FH-EXCEL-BRIDGE-RAW-READ-MODEL-01** | Lector raw v2 y read model | ✅ MERGED_AND_VERIFIED | `work/fh-excel-bridge-raw-read-model-01-20260805` | commit `7da866b2...`, merge histórico `92c00eb7...` (PR #238, issue #237) | Workbook Bridge, botón `Cargar Excel de Farmacia`, dos hojas raw, 152 columnas, cardinalidad `1..N`; read model solo en memoria; candidate SHA-256 `2b7b2eed0f4310156e701c6357505442f47d13e7492869fcfbc1e9dedf564af4`; QA Node 21 casos, workbook/openpyxl, navegador, legacy, Enfermería y smoke CI PASS |
| **WO-FH-BRIDGE-V2-PATIENT-SELECTORS-QUICK-VIEW-01** | Selectores de paciente y Quick View Bridge v2 | ✅ MERGED_AND_VERIFIED | `work/fh-bridge-v2-patient-selectors-quick-view-01-20260805` | issue #241; PR #242; commits `3da3d450890508e7ee11ea7b801ad37ba4052cf5` + `94cd44688b82aea0a10e4778e3182ab300bd6be0`; merge `e2c54583ccc5876058403c34a675496cab897972` | Búsqueda por sistema + valor explícitos, `patient_id` técnico, Quick View visible dentro de `farmacia_index.html`, sin fallback demo ni alta guiada con Bridge activo; selector checker 82 casos, reader checker 21, smoke 48, Actions SUCCESS, QA navegador/focal PASS, consola limpia, `pageerror = 0`, revisión independiente APTO; no declara piloto, deploy ni persistencia longitudinal |
| **WO-FH-BRIDGE-V2-RUNTIME-HANDOFF-DASHBOARD-01** | Handoff efímero y dashboard Bridge de solo lectura | ✅ MERGED_AND_VERIFIED | `work/fh-bridge-v2-runtime-handoff-dashboard-01-20260805` | issue #245; PR #246; commits `fe28f21feb7cb58d57c639a7d52d85856b247108` + `7ebc482629e1e818a6227c8e8946cddd12ee113a`; merge `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6` | Dashboard Bridge conectado, visible y demostrado mediante interacción soportada; `search_context` + Quick View únicamente, READY y payload one-shot, `origin`/`source`/nonce/versión verificados, TTL 45 s, URL solo con nonce, sin browser storage, reload/direct URL fail-closed y ventanas aisladas; renderer separado del dashboard legacy, sin adaptación a paciente plano ni inferencias; handoff 37, selector 82, reader 21, smoke 48 y legacy 37 PASS; Actions, QA navegador, padding, popup, aislamiento, Farmacia/Enfermería y revisiones APTO; fingerprint `651291d5094ef402ae0f16578f6a213add6e4d4fc5372f40d9763c615dfa83fb`; no declara persistencia, piloto ni deploy |

Correcciones P1 publicadas en `7ebc482629e1e818a6227c8e8946cddd12ee113a`: normalización simétrica mediante `trim()` para contexto e identificadores almacenados; padding almacenado soportado; componentes whitespace-only rechazados con `HANDOFF_IDENTIFIER_COMPONENT_EMPTY`; sensibilidad a mayúsculas preservada; payload original no mutado; TTL único `sessionTtlMs = 45000`; timeout funcional de 1500 ms retirado; y mensaje de Quick View actualizado para declarar el dashboard como lectura temporal y mantener formularios/demás consumidores pendientes.

### Adjudicación de WO5 Export v2

El alcance original de `WO-FH-EXPORT-V2-CUTOVER-01` incluía activación pública, compatibilidad y retirada gobernada de v1. PR #225 y PR #227 satisfacen una parte mediante unidades menores. Su adjudicación descriptiva es `PARTIALLY_SATISFIED_BY_SMALLER_UNITS / REMAINING_SCOPE_DEFERRED`: no se añade un estado nuevo a la leyenda, no se reabre WO5 como megadesarrollo y tampoco se declara completamente cerrada.

Para esta reconciliación, **WO5A** nombra retrospectivamente `WO-FH-EXPORT-V2-TECHNICAL-CONTEXT-01` (issue #224, PR #225). Aporta fixtures de contexto técnico sintético con `patient_id`, IDs de acto, `treatment_id` y `line_id` explícitos, estables y predeclarados. El proveedor no genera esos IDs, no deriva ni transforma el CIP en identidad técnica y falla cerrado para cualquier contexto no registrado; no es un `IdentityRepository` ni añade salida pública propia. **WO5B** nombra retrospectivamente `WO-FH-EXPORT-V2-PARALLEL-ACTIVATION-01` (issue #226, PR #227). No son títulos oficiales originales. No existe WO5C ejecutada ni se declarará sin issue, manifest, PR y evidencia publicada.

Quedan aplazadas la retirada de v1 y la promoción de versiones `draft`. El workbook operativo está implementado y verificado desde PR #233; el lector raw v2/read model está integrado por PR #238, solo en memoria. PR #246 conecta la Quick View con un dashboard Bridge de solo lectura mediante handoff efímero; este dashboard es distinto del dashboard legacy y no constituye persistencia. Office Script integrado, tablas relacionales pobladas, vistas `APP_*`, formularios Bridge, Excel Read Adapter y roundtrip no están implementados. La decisión completa vive en [`../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md).

### Estado técnico de persistencia en navegador

PR #231 retiró del runtime soportado el ledger clínico basado en `localStorage`. El estado posterior de PR #250/#251 usa `sessionStorage` solo para el envelope temporal del paciente actual, con claves cerradas y sin workbook, bytes, read model completo, población, cohorte u otros pacientes. Cambiar de CIP purga el contexto anterior. PR #238/#242/#246 se conserva como trazabilidad del Bridge histórico; no define un modo visible actual. No hay persistencia longitudinal definitiva resuelta.

### Deuda administrativa de issues

A 2026-08-05, los issues #184, #186, #188, #190 y #192 continúan abiertos aunque sus PR están fusionadas. Los issues #194, #196, #198, #200, #202, #204, #206, #208, #210, #212, #214, #216, #220, #222, #224, #226, #230, #232 y #245 están cerrados. Esta WO documental no modifica issues históricos.

---

## Bloque Farmacia v0.1 — rama frozen histórica

> Rama: `work/hermes/nightly-farmacia-v0-1-20260606`. No mergeada; se conserva como respaldo histórico.

| WO | Título | Estado | Referencia | Nota |
|---|---|---|---|---|
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
|---|---|---|---|---|
| **WO-035** | Catálogo CIMA completo | 🔄 Superseded | `work/farmacia-catalogo-cima-v0-1-20260606` / `3047673` | Sustituido por catálogo hospitalario |
| **WO-036** | Autocomplete dual hospitalario | 🟢 Validated | `work/hermes/farmacia-demo-v0-2-candidate-20260606` / `d631ee7` | Validada como demo histórica |
| **WO-037** | Rama limpia PR #5 | 📋 Draft | `work/farmacia-v0-2-autocomplete-dual-clean-20260606` / `b5643fd` | No mergear |
| **WO-038** | Auditoría técnica v0.2 | ✅ Completada | candidata v0.2 | Sin P0/P1 en su contexto histórico |

---

## Resumen

| Estado | Cantidad |
|---|---:|
| ✅ Merged | 61 |
| ✅ MERGED_AND_VERIFIED | 5 |
| 📋 Ready for review | 18 |
| 📋 Draft | 1 |
| 🟢 Validated | 1 |
| 🔄 Superseded | 3 |
| ✅ Completada | 1 |
| ⏸️ Pausada | 1 |
| 🔴 Bloqueada | 0 |
| ❌ Descartada | 0 |

**Total:** 91 work orders / preflights gestionadas.

Comprobación aritmética de las filas de tabla: 61 + 5 + 18 + 1 + 1 + 3 + 1 + 1 + 0 + 0 = 91, coherente con el total registrado.

Los totales incluyen referencias históricas no mergeadas. Ninguna cifra equivale a aptitud para piloto o producción.
