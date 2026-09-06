# FARMACIA BASELINE AUDIT V1 — PROMueve Farmacia (Issue #285 / WO-DOC-FH-BASELINE-AUDIT-01)

## Outcome first

PROMueve Farmacia in the audited recovery branch is **evaluation-ready, not pilot-ready**: it has a real functional spine (one-file Excel import → raw reader → selectors → Data Port → current-patient session → Inicio/Quick View → dashboards → Validación → Primera Visita → Seguimiento → Estadísticas raw cohort + CSV 55×37 → snapshot `CÁCERES-REVIEW-0.4` published to GitHub Pages), with unusually disciplined explicit-data / non-inference clinical semantics. **One P1 pre-review product blocker** remains: the published demo Dashboard Paciente (directly linked from the published Inicio demo card) crashes on every demo CIP. **No P0 clinical/inference defect was demonstrated.** Non-P0/P1 debt does not delay Pharmacy review. The audit process itself is **PASS** and the independent falsification is **PASS**.

| Verdict | Meaning |
|---|---|
| Audit process | `PASS` (primary bounded brownfield audit + one fresh independent falsification; disagreements D1–D7 recorded and applied below) |
| Product blockers | Exactly one P1 (`F-01`), non-P0; QA-hygiene workstream (`F-02`, `F-05`, `F-06`, `F-07`) is non-blocking and folded after feedback |

---

## 1. Title and metadata

| Metadato | Valor |
|---|---|
| Work order | `WO-DOC-FH-BASELINE-AUDIT-01` — Issue #285 (OPEN, `status:approved`; re-verified via `gh issue view 285`) |
| Plan / dependencies | Plan #283 (OPEN); #284 reconciled diagnostic; #286 `ATENEA_PROMUEVE_CLEAN_WORKSPACE_BOOTSTRAP_PASS` |
| Repository | `b32majus/Hub-Clinico-Badajoz` (canonical clone untouched) |
| Branch audited | `recovery/farmacia-pr-replay-20260727` |
| Audited head (base) | `097396a1d6b995a62f9fc2499879a1271259d753` (local == remote `git ls-remote origin`; no drift) |
| Last functional head | `fb7b70c50c991baf6a375b42112048d190fe0178` (merge functional issue #265 / PR #266; snapshot `last_functional_sha`) |
| Clean analysis copies | `/tmp/atenea-issue-285-20260904-k3Vuqg/primary` and `.../reviewer` (disposable clones; tracked-clean; only untracked `.atl/` auto-generated) |
| Audit date | 2026-09-04 |
| Clinical scope | Reumatología / Enfermería / Farmacia Hospitalaria — synthetic evaluation package for external Pharmacy review; **not** a clinical pilot, **not** production |
| Current package vs future PreSalud | Current package = single synthetic workbook (`PROMueve_FH_EVALUATION_FARMACIA.xlsx`, external, 55 patients) + Enfermería complement workbook, one-way Excel→Hub evaluation. Future PreSalud = conditional fast-track candidate under Plan #283 (DO_BEFORE_EXTERNAL_REVIEW **only** for a revised PreSalud package; does not block sending the unchanged current package) once a real export is inspected read-only and an explicit semantic contract is accepted. **No code seam exists today** (capability 13). |
| Audit-process verdict | `PASS` |
| Independent reviewer verdict | `INDEPENDENT_FALSIFICATION_PASS` |

---

## 2. Executive conclusion

- **Exactly one P1 pre-review blocker (product):** the published demo Dashboard Paciente breaks on the direct Inicio-linked demo card. Every demo CIP (`CIP-DEMO-FH-001..004`) throws `TypeError: (patient.proms || []).map is not a function` at `farmacia_dashboard_paciente.js:886` (`renderDashboard`), leaving `#dashboardSummaryGrid` empty (children 0) with a page error — in both the root page and the published `previews/caceres-fh/` snapshot. Root cause is a `proms` **shape-contract mismatch across consumers** (see F-01/D6). This is **P1, not P0**: the intended external synthetic evaluator path — raw single-workbook journey `CIP-LONGITUDINAL-A/B` via the dashboard `mapPatient` array-safe path — is verified passing in real Chromium.
- **No P0 clinical/inference defect.** The explicit-data / non-inference posture is confirmed by both the primary audit and the independent reviewer across import, adapters, forms, storage, export, session, handoff, CIMA, treatment, validation, longitudinal, and evaluation.
- **Intended raw single-workbook evaluator path verified** (browser QA PASS: `CIP-LONGITUDINAL-A/B`, QuickView raw PROMs, patient-flow cutover, statistics 55×37 CSV, Excel-truth exports).
- **Non-P0/P1 debt does not delay Pharmacy review**; the QA-hygiene workstream (`F-02`, `F-05`, `F-06`, `F-07`) is folded into a non-blocking post-feedback reconciliation.
- **Evaluation-ready ≠ pilot-ready** is maintained throughout: persistence/roundtrip (capability 12) is a future pilot-gated candidate; PreSalud (capability 13) is a conditional fast-track candidate only if the operator intends a revised package (Plan #283). Neither is part of the current unchanged evaluation package.
- **Ordered action set** in §11: (1) the one P1 dashboard correction in a separate WO **before** external review; (2) the conditional Plan #283 PreSalud fast-track immediately after F-01 (only if a revised PreSalud package is intended; does not block sending the unchanged current package); then (3) non-blocking QA/doc reconciliation after feedback; pilot-only persistence/roundtrip in a separate WO. No broad refactor programme.

---

## 3. Method, limitations, no-mutation statement

### Method

1. **Authority:** `gh issue view 283/284/285/286`; `git ls-remote origin` == local HEAD `097396a1...`; Issue #285 schema and priority rules applied verbatim.
2. **Subsystem/capability mapping** from root HTML/JS, `docs/INDEX.md`, `docs/ops/FARMACIA_*STATE*.md`, `docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`.
3. **12-axis evidence classification** from: file/symbol presence; HTML/DOM wiring; page-visible links; deterministic Node checkers (repo `tools/*`); project browser QA scripts with existing global Playwright + Chromium 149 (no install); direct Chromium checks of the published snapshot; module Node harness runs against a synthetic workbook built from `data/demo/farmacia/export_v2/*.json`.
4. **Technical health** via Matt Pocock `improve-codebase-architecture` as a lens only (module/interface/depth/seam/leverage/locality/deletion test); no generated HTML report.
5. **Clinical non-inference review:** static + runtime evidence (see §6).
6. **Dead/legacy classification:** conservative labels only (§9); no deletion anywhere.
7. All audit output written under `/tmp/atenea-issue-285-20260904-k3Vuqg/out/`; the audits created **no** repo file. The only repo mutation of this WO is the authorized report candidate on the docs branch (see no-mutation statement).

### Derived evidence label

No Graphify run (available but **not run** — no added signal over direct evidence; would add time), no jscpd run (not installed), no Matt HTML report. All capability/test/browser claims below were directly executed or read from the repo/snapshot. Anything resting on the **external** 55-patient workbook is explicitly labelled **derived/docs-based** (project checkers + documentation), because that file is not in the repo.

### Limitations

- Playwright is not vendored; a PATH shim to the machine's existing global Playwright was used. No download.
- Several repo browser checkers hard-code port 4174/48796, occupied by an unrelated historical server; re-run on a free port passes (recorded §7). That is environmental, not product evidence.
- The published external evaluation workbook (`PROMueve_FH_EVALUATION_FARMACIA.xlsx`) is **not locally present**; raw 55/93/152 evidence is from project checkers + docs, not a local read of that file. The local template bridge (`templates/PROMueve_FH_Caceres_Bridge_DEMO.xlsx`) has 0 populated data rows; module harness used synthetic rows from versioned JSON fixtures.
- No real patient data and no real PreSalud exports were used; no secrets printed; no install/download performed.

### No-mutation statement

The audits made **no** product/runtime mutation: no change to product/runtime source, schemas, contracts, workbooks, generated snapshot contents, Pages config, `.github`, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, `main`, issues, or PRs; no finding was remediated; no second versioned path was created. The **only** Git topology/content mutation in this WO is the authorized documentation branch `docs/fh-baseline-audit-v1-20260904` (created from the verified base `097396a1...`) carrying this one report candidate. **No commit, push, or PR has been made yet** — the candidate is stopped for supervisor verification. Analysis clones contain only auto-generated untracked `.atl/`.

---

## 4. Complete capability matrix — 14 capabilities × 12 evidence axes

Evidence legend: ✅ exists/verified; ⚠️ partial/qualified; ❌ absent/broken; PASS/PARTIAL/FAIL/N/A with exact citations. Each cell is evidence-based; presence of code never implies "works".

| # | Capability | EXISTS_IN_CODE | WIRED | VISIBLE | SUPPORTED_INTERACTION | DATA_SOURCE_AND_PROVENANCE | PERSISTENCE_REALITY | DETERMINISTIC_TESTS | BROWSER_QA | PUBLISHED_CORRECT_BRANCH_SNAPSHOT | EXTERNAL_SYNTHETIC_EVALUATION_READY | PILOT_GAP | CLINICAL_SAFETY_SEMANTICS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Inicio/loader/Data Port | ✅ `farmacia_index.html` + `scripts/farmacia_common.js` (`parseWorkbook` 1799-1906) + reader/selectors/data-port modules loaded only on index | ✅ `FarmaciaDataImports.importFile` → `parseWorkbook` → `FarmaciaBridgeV2Reader` + `FarmaciaRawExcelDataSource.create` + `FarmaciaPatientFlowRuntime.setDataPort` (common.js 1844-1878) | ✅ visible "Cargar Excel de Farmacia"/"Enfermería" (`farmacia_index.html`) | ✅ file input + button wiring (`initImportPanel` common.js 1935-1969); validated/coerced/roundtrip; raw rows = 0 on template; synthetic rows verified in harness | ✅ single-file workbook; provenance envelope (source = `'Excel Farmacia raw'`, sheet/table/physical row per event) | ❌ session envelope only (`promueve.fh.currentPatientSession.v1`); no durable store | ✅ Reader 21/21; Selectors 82/82; Data Port 11/11; smoke 48/48; storage policy PASS | ✅ actual Chromium: index loads clean (0 console errors), synthetic banner + `CÁCERES-REVIEW-0.4` visible, catalog 4032 entries loaded | ✅ snapshot includes loader assets + manifest (16/16 PASS) | ⚠️ ready only with external 55-patient workbook; local template has 0 data rows | ❌ no durable import; workbook must be re-selected after reload | ✅ no inference at load; reader rejects formulas, coerced cells, unknown columns, unsupported version; row-set validation fails closed |
| 2 | CIP search / Quick View | ✅ `farmacia_index.js` overlay (`createOverlay`), raw QuickView `renderPatientView` 400-465, `createRawPromsGroup` 265-310 | ✅ `runtime.selectByCip` (index.js 478) opens overlay | ✅ search input + Quick View overlay visible | ✅ search CIP demo → overlay opens with patient fields; A/B/A isolation verified in Chromium | ✅ raw: Data Port/current session; demo: `farmacia_common.js` patients object | ❌ overlay ephemeral DOM; raw selection stored in session envelope | ✅ `farmacia_quickview_raw_proms_browser_check.mjs` PASS; selectors 82/82; patient-flow 17/17 | ✅ Chromium: QuickView visible for CIP-DEMO-FH-001; A/B/A isolation; console/pageerror 0 | ✅ snapshot includes index/overlay code (same QuickView assets verified in snapshot Chromium) | ⚠️ demo search hints only CIP-DEMO-*; raw evaluation CIPs require workbook load; unknown CIP → alta guiada (no raw record) | ❌ no pilot-safe profile store: overlay is ephemeral DOM; selection lives in session envelope only | ✅ raw PROMs render 0/false safely, dates only if present, missing = `No registrado`, no thresholds inferred |
| 3 | Dashboard Paciente | ✅ `farmacia_dashboard_paciente.html` + `scripts/farmacia_dashboard_paciente.js` | ✅ loads runtime + session; `renderDashboard` 838-916; links to Seguimiento/Validación | ✅ visible nav and direct links | ⚠️ **demo dashboard broken (P1, F-01)**; raw dashboard (raw session) works | ✅ raw projection from envelope (`mapPatient` runtime.js 258-346); demo from hardcoded patients in `farmacia_common.js` | ❌ session envelope only | ✅ `farmacia_dashboard_paciente_check.mjs` PASS 37/37 (DOM/static/module); PR57E 60/63 (stale cache-buster, see F-05) | ❌ **FAIL — actual Chromium demo dashboard throws and leaves summary empty** (`proms.map is not a function` at line 886, `#dashboardSummaryGrid` children 0), root and snapshot | ❌ published snapshot has the same demo break (manifest includes dashboard assets; demo route broken) | ⚠️ raw evaluator path array-safe (checkers + module evidence) but demo card is a direct published Inicio link | ❌ PILOT_GAP: no durable/pilot-safe dashboard or persistence (session-envelope only); the demo dashboard route is broken on the direct published Inicio card (F-01) — a pilot needs the fixed dashboard **and** durable persistence (F-11) | ✅ CLINICAL_SAFETY_SEMANTICS: explicit-data rendering semantics safe (raw array from explicit records; 0/false/dates explicit); the demo break is a functional `proms` string-vs-array type mismatch, **not** a clinical-inference defect |
| 4 | Patient Longitudinal | ✅ `farmacia_dashboard_longitudinal.html` + `farmacia_longitudinal_raw_adapter.js` (`buildFromEnvelope` 308-356) | ✅ dashboard-paciente links to standalone longitudinal with CIP; standalone raw fetches envelope first (`dashboard_longitudinal.js` 193-231) | ✅ visible nav + "Vista completa" | ✅ raw: CIP-LONGITUDINAL full-history (browser PASS); demo: 3 patients, chart shows for CIP-DEMO-FH-004 | ✅ raw events/visits/lines/PROMs/adherence/EA/causality from envelope `explicit_data`; demo from `data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json` | ❌ read-only projection; no persistence | ✅ `farmacia_longitudinal_raw_adapter_check.mjs` 18 caps; `farmacia_longitudinal_raw_browser_check.mjs` PASS | ✅ raw browser PASS; demo Chromium: page loads, dataset 3 patients, 0 errors | ✅ snapshot includes longitudinal assets (raw path verified in snapshot Chromium) | ⚠️ raw CIPs only after workbook load; demo dataset is 3 patients | ❌ no durable longitudinal store for pilot; read-only projection from session envelope | ✅ `active_at_event` tri-state; movements exclude no_change/not_recorded; suspension explicit; dates never invented; EA absent ≠ resolved; causality explicit only; PROM 0/false preserved; raw clinical activity `[]` |
| 5 | Validación | ✅ `farmacia_validacion.html` (3 forms: manual, derma, digestivo) + `farmacia_validacion.js` (2814 lines) | ✅ `applyContext` prefills requested/validated from raw; validation status separate; Export v2/Excel/JARA/CSV bound | ✅ visible nav + action-card from Inicio | ✅ raw CIP context validations; manual workflow tested (manual requested CIMA browser PASS); demo validation loads 0 errors | ✅ raw: `solicitud`/`validacion` fields from Data Port projection (`runtime.js mapPatient`); manual: visible form fields only | ❌ drafts to session envelope only; no server | ✅ `farmacia_validation_export_truth_check.mjs` 37/37; manual-requested CIMA browser PASS; enfermeria 109; derma 33; ui_cleanup 53/54 (see F-02) | ✅ actual Chromium demo validation loads clean; V2 button disabled with "no context" message for CIP-DEMO-FH-002 | ✅ snapshot includes validation assets (demo validation loads clean in snapshot) | ⚠️ forms normal; only registered synthetic CIPs get prefill; manual path for arbitrary CIP has no raw downstream record | ❌ no durable validation record for pilot; drafts only in session envelope | ✅ requested ≠ validated (separate fields, no `p.farmaco` fallback); denied/pending/not_recorded distinct; catalog selection proposal-only; induction starts "No informado" (F-14 verified) |
| 6 | Primera Visita | ✅ `farmacia_primera_visita.html` + `farmacia_primera_visita.js` (1597 lines) | ✅ `applyContext` prefill from raw validated/first-visit; Export v2/Excel/JARA/CSV bound | ✅ visible nav + action-card | ✅ raw CIP path; `farmacia_first_visit_excel_truth_browser_check.mjs` PASS | ✅ raw: validated treatment + firstVisitData; demo: hardcoded patient | ❌ session envelope drafts only | ✅ `farmacia_primera_visita_check.mjs` PASS 97/97; export_v2_first_visit adapter PASS; excel-truth browser PASS | ✅ actual Chromium demo PV loads 0 errors; excel-truth browser PASS | ✅ snapshot includes PV assets (demo PV loads clean in snapshot) | ⚠️ demo/eval only; no durable first-visit record | ❌ no durable first-visit record for pilot; session envelope drafts only | ✅ no inference from catalog; induction tri-state; dose/route/schedule preserved as visible form values; `proms` only if explicitly collected; Excel row = 61-col v1 or 152-col v2 demo when context registered |
| 7 | Seguimiento | ✅ `farmacia_seguimiento.html` (336 lines) + `farmacia_seguimiento.js` (3104 lines) | ✅ `applyContext` prefill from raw patient, lines/EA/causality bound; Export v2/Excel/JARA/CSV bound | ✅ visible nav + action-card | ✅ raw CIP line selection/dispensing/EA/causality flows verified; demo loads 0 errors | ✅ raw: current lines from envelope (line snapshots), adherence/EA/causality from Data Port | ❌ in-memory visit state + session drafts; no durable store | ✅ `farmacia_seguimiento_check.mjs` PASS 153/153; multitreatment 19/19; PR57A-D PASS; PR57E 60/63 (stale, F-05) | ✅ actual Chromium demo Seguimiento loads clean; raw follow-up browser QA PASS | ✅ snapshot includes Seguimiento assets (demo page loads clean in snapshot) | ⚠️ demo/eval only; no durable follow-up record | ❌ no durable follow-up record for pilot; in-memory visit state + session drafts only | ✅ line state explicit; `active_at_event` only explicit active; dispensed/not dispensed explicit; EA absent ≠ resolution; causality via explicit assessment (Naranjo/Karch–Lasagna tools, final label explicit); "No consta" does not assert no EA |
| 8 | Estadísticas + CSV | ✅ `farmacia_estadisticas.html` + `farmacia_statistics_cohort.js` + `farmacia_statistics_handoff.js` | ✅ raw cohort via same-origin popup handoff (`initSenderLinks`), demo fallback dataset; CSV export bound | ✅ visible nav (new window; handoff popup) | ✅ direct/no-cohort = demo 3 patients; raw 55 via handoff verified by `farmacia_statistics_cutover_browser_check.mjs` PASS | ✅ raw cohort from Data Port `getPopulationProjection` (55 patients, 37 CSV cols); demo from versioned JSON (3 patients) | ❌ ephemeral in-memory handoff, TTL 15s, one-shot; no cohort stored | ✅ statistics_cohort 30 scenarios + handoff checks; statistics browser PASS (demo=3, raw=55, CSV 55×37) | ✅ actual Chromium statistics page loads 0 errors; no-cohort demo status correct | ✅ snapshot includes statistics assets (raw cohort via popup verified in snapshot browser QA) | ⚠️ raw 55 via handoff only after workbook load; direct reload of stats window = demo, not raw | ❌ no population durable base; ephemeral handoff cannot survive a pilot session restart | ✅ cohort excludes names/ages/sex in raw (`name:'' age:'' sex:''`); demo CSV labeled demo and never mixed with raw |
| 9 | Activity | ✅ `farmacia_actividad_servicio.html` + `farmacia_actividad_servicio.js` | ✅ reads `FarmaciaDemo.getAvailablePatients()`; source labels | ✅ visible nav/action-card | ✅ demo page loads and renders cards (actual Chromium 0 errors) | ✅ from available (demo + imported generic) patients | ❌ demo only; no population raw wiring (by design) | ✅ smoke checks + actual Chromium | ✅ actual Chromium renders cards (source label + pending) | ✅ snapshot includes Activity assets (demo cards render in snapshot Chromium) | ❌ documented demo-only (`FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md` §7), not raw-wired | ❌ functional definition deferred; no population semantics for pilot | ✅ card counts from source-flagged patients only; `extractPrinciple` digit-strip heuristic is display grouping, not clinical output |
| 10 | Enfermería complementaria | ✅ `farmacia_common.js` Enfermería parse (490-620) + loader visible on Inicio | ✅ loader + Enfermería board on index; validation route for Enfermería patients | ✅ visible `Excel de Enfermería` loader + board | ✅ synthetic Enfermería workbook template present; loader path tested at module level (95/109/45/33) | ✅ Enfermería rows normalized; Farmacia raw has precedence; Enfermería fills explicit gaps only | ❌ memory only (not persisted) | ✅ enfermeria_import 95/95; enfermeria_board_dom 45/45; enfermeria_import_validation 109/109; template check 36/36 | ✅ actual Chromium page loads clean (no Enfermería workbook loaded in smoke) | ✅ synthetic Enfermería workbook distributed in snapshot/package | ⚠️ complementary; real nurse-panel workflow not evaluated | ❌ no persisted nurse-panel store for pilot; memory-only enrichment | ✅ only explicit gaps enriched; no overwrite of explicit Farmacia values (documented merge semantics) |
| 11 | CIMA/catalog | ✅ `FarmaciaCatalog` in `farmacia_common.js` (1257-1718), catalog xlsx versioned in `data/catalogos/farmacia/` | ✅ auto-loads from local xlsx on every page (`autoLoad`, catalog 1665-1703); snapshot registry keyed by slot+CIP in sessionStorage | ✅ catalog sidebar status visible; 4032 entries loaded in actual Chromium | ✅ drug search/select proposal flows; contextless selection regression PASS (module + browser) | ✅ catalog xlsx CIMA+LOCAL sheets; snapshot stores selected drug only in session; catalog is assistant, not authority | ❌ catalog snapshot in sessionStorage only; no CIMA live auto-update (documented debt `cdc-001`) | ✅ pautas_catalog_check PASS; common_check 101/101; cima_contextless module — FAIL 1/6 stale asset version + group-6 stale frozen hashes after the asset-version fix (F-07/D4) | ✅ actual Chromium catalog auto-load PASS | ✅ snapshot includes catalog xlsx + scripts (4032 entries load in snapshot Chromium) | ⚠️ static demo catalog; real CIMA update absent (`docs/deuda-tecnica/cdc-001`) | ❌ no live CIMA/authoritative catalog for pilot; sessionStorage snapshot only | ✅ catalog select/reconcile applies only identity fields as proposal; never infers dose/route/schedule; empty context doesn't persist; professional edits preserved (browser PASS) |
| 12 | Persistence/roundtrip V4 | ❌ EXISTS_IN_CODE: only one-way half versioned — `templates/PROMueve_FH_Caceres_Bridge_DEMO.xlsx` (152-col service sheets + 18 sheets incl. relational tables), reader/selectors/data-port/runtime/session; **no roundtrip code exists** (no Office Script, no APP_* populator, no Read Adapter) | ✅ WIRED: reader+data port wired; template service sheets empty (0 data rows in checked clone); envelope session persistence wired | ✅ VISIBLE: reader/session runtime-wired; workbook template versioned | ✅ SUPPORTED_INTERACTION: module-level synthetic workbook → reader → selectors → data port → envelope → patient mapping verified (3-patients coherent, per-patient events/lines/proms/provenance) | ✅ DATA_SOURCE_AND_PROVENANCE: provenance captured per row/event (sheet/table/physical row) | ❌ PERSISTENCE_REALITY: **roundtrip not implemented** — no Office Script, no APP_* relational populator, no Excel Read Adapter, no Hub→Excel→Hub (DECISION §3.2/§6; WORK_ORDER_STATUS rows 164-165) | ✅ DETERMINISTIC_TESTS: reader 21/21; selectors 82/82; data port 11/11; storage policy; template structural checks 36/36 PASS + sintetico 38/38 PASS | ❌ N/A BROWSER_QA: no real roundtrip browser QA exists — not supported / not run | ❌ PUBLISHED_CORRECT_BRANCH_SNAPSHOT: no roundtrip capability in the published snapshot; snapshot consumes workbook one-way | ❌ EXTERNAL_SYNTHETIC_EVALUATION_READY: not ready for roundtrip-based evaluation; one-way Excel→Hub input only | ❌ PILOT_GAP: any pilot persistence claim requires F-11 roundtrip; envelope/session only, no durable store | ✅ CLINICAL_SAFETY_SEMANTICS: identity guards (normalized identifier collision/coherence, patient_id ≠ CIP, forbidden keys in envelope, no hidden persistence) + no inference; roundtrip labels/demo boundaries documented and checkered |
| 13 | PreSalud integration seams | ❌ EXISTS_IN_CODE: **no code** — no parser/adapter/seam/fixture exists in any runtime file. PreSalud appears only in **future architecture docs**, cited there as a deliberate future seam: `docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md` §Presalud and `PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md` §14.2 | ❌ WIRED: no PreSalud wiring in any runtime file | ❌ VISIBLE: no visible PreSalud surface | ❌ SUPPORTED_INTERACTION: no supported PreSalud interaction | ❌ DATA_SOURCE_AND_PROVENANCE: no PreSalud data source | ❌ PERSISTENCE_REALITY: no persistence | ❌ DETERMINISTIC_TESTS: no PreSalud tests | ❌ BROWSER_QA: no PreSalud browser QA | ❌ PUBLISHED_CORRECT_BRANCH_SNAPSHOT: no PreSalud snapshot | ❌ EXTERNAL_SYNTHETIC_EVALUATION_READY: PreSalud not part of current evaluation package; frozen current package is not blocked by its absence | ✅ PILOT_GAP explicit-and-deliberate: docs require exact real-format evidence before a parser; no invented order/delimiters; renewal alerts deferred until real fields exist | ✅ CLINICAL_SAFETY_SEMANTICS: no inference — planned parser must preserve source text, show preview, no silent overwrite, explicit dates only |
| 14 | Snapshot/Pages/evaluation packaging | ✅ `previews/caceres-fh/` full static snapshot + `deployment-manifest.json` (allowlist 45 + per-file SHA-256 hashes 47) | ✅ self-contained static package | ✅ publicly hosted Cáceres URL per docs (`previews/caceres-fh/`) | ✅ snapshot manifest checker PASS 16/16; actual Chromium opens snapshot index cleanly (identity banner + `CÁCERES-REVIEW-0.4`) | ✅ manifest binds `source_sha 8bfceaaa...` + `last_functional_sha fb7b70c...`; independent raw re-hash of all 47 entries = 0 mismatches | ✅ static snapshot versioned in repo | ✅ `farmacia_caceres_review_snapshot_check.mjs` 16/16; allowlist(45) vs hashes(47) difference intentional (generated `index.html` + `caceres_review_deployment.js`) | ✅ actual Chromium `previews/caceres-fh/farmacia_index.html` 0 errors | ✅ snapshot published; evaluation package docs `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION` | ✅ external synthetic evaluation package ready (single workbook + Enfermería complement; identity overlay; no real data) | ❌ **not pilot**: `FARMACIA_EVALUATION_READY_STATE_20260807.md` states evaluation-ready ≠ pilot/prod | ✅ identity overlay warns "Datos exclusivamente sintéticos. No usar para asistencia clínica real"; smoke check 9 + manual scan: no real data |

**Coverage note (independent-review ADD, applied):** the shipped admin demo surfaces `farmacia_farmacos.html` / `farmacia_profesionales.html` render clean in the snapshot (0 console errors) but are **outside** the minimum 14-capability contract; not a coverage gap.

---

## 5. Technical-health summary (material friction, concrete cost only)

1. **Architecture/ownership/seams:** two code families coexist in one repo/branch — Reuma v2 (legacy `modules/`, `scripts/script_*.js`, `*_dashboard*.html`, `style*.css`) and Farmacia recovery (root `farmacia_*.html` + `scripts/farmacia_*.js`). Recovery branch is a replay/cutover with its own canonical docs; the Farmacia sidebar deliberately keeps an `index.html` link to the Reuma app. Cost: scan/maintenance surface and duplicated knowledge; governed by `DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES`.
2. **Contradictory/impossible state:** (a) published docs cite HEAD `827163d8` while branch HEAD is `097396a1` (F-03); (b) the demo dashboard crash is an inconsistent `proms` model (string vs array) producing an impossible UI state (empty summary + page error) (F-01); (c) four checkers asserting "no public v2 button" contradict shipped UI and docs (F-02).
3. **Semantic duplication vs similar code:** two dashboard implementations share PROM maps/severity helpers with the legacy `script_dashboard.js`/`estadisticas.html` set; three copies of DLQI/EVA/DAS28/HAQ interpretation helpers exist. Documented (`ARCHITECTURE.md` §14; `MEJORAS_PROPUESTAS`), non-blocking.
4. **Duplicated code:** interpretation/threshold helpers repeated as above; the 152-column contract lives in three places (schemas JSON, `farmacia_export_v2_core.js` ROW_COLUMNS, contract markdown) — verified 152/152 match, but edits must be synchronized. Same for 61-col v1 contract.
5. **Dead/legacy candidates:** conservative ledger in §9; nothing implied deleted.
6. **Competing authorities:** docs INDEX/WORK_ORDER_STATUS/EVALUATION_READY_STATE cite published HEAD `827163d8`; GitHub is authoritative ("GitHub real prevalece").
7. **Module depth/locality/testability:** current-patient session + runtime envelope is a well-shaped deep seam; reader/selectors/data-port deep. Clinical pages (`farmacia_validacion.js` 2814, `farmacia_seguimiento.js` 3104, `farmacia_primera_visita.js` 1597, `farmacia_common.js` 2171) are large mixed-responsibility monoliths, but tests cross the page seam via DOM checkers + browser QA; locality acceptable for evaluation; refactor = FUTURE_V4/V5.
8. **Coupling/blast radius:** HTML script-tag dependency ordering with version cache-busters is a manual consistency burden; the stale frozen-hash assertions (F-07) show the fragility.
9. **Accidental complexity:** cohort "handoff" is intentionally ephemeral same-origin popup with nonce/digest/TTL — deliberate and documented, not accidental.
10. **Docs drift:** README/ARCHITECTURE stale at product level (Reuma v2, no Farmacia) — known; operative docs drift only on HEAD SHA (F-03).
11. **Dependency cost:** zero runtime npm deps; SheetJS vendored; Font Awesome via CDN. No install burden.
12. **Security/data trust:** no real data in snapshot; identifiers demo/synthetic; workbook validation fail-closed (formula/coercion/unknown columns/version); envelope forbidden keys; statistics handoff origin+nonce+digest. Strong for demo.
13. **Test oracle quality:** several checkers excellent (frozen hash, contract/TSV roundtrip, storage policy); some stale (v2 button count, ledger 0.3 expectation, pr57e/cima cache-busters) — F-02/F-05/F-06/F-07.
14. **Temporary compatibility/retirement:** v1 61-col Excel and v2 152-col Export run in parallel, explicitly documented as draft/v1-retention; retirement deferred (DECISION §6); governed.
15. **Unsupported cost-bearing paths:** Reuma-family HTML/CSS/JS and evaluation-ledger/workbook modules remain versioned, adding scan/maintenance surface without runtime role (§9).

---

## 6. Clinical explicit-data / non-inference review

No inference violation found by either auditor. Confirmed boundaries across all reviewed surfaces:

- **Import/adapters:** Reader requires canonical 152-col headers; rejects formulas (`BRIDGE_FORMULA_DETECTED`), coerced cells (`BRIDGE_CELL_COERCED`), unknown/duplicate/extra columns, schema-version mismatch; group row-set validation fails closed on identity/cardinality conflicts. Selectors/Data Port project only explicit fields; `latest_request`/`latest_validation` come from latest validation event rows. `mapPatient` (runtime.js 258-342) projects only explicit fields; `validatedTreatment` materializes only when `validation_result === 'validated'` AND relation ≠ `no_treatment_validated`; `lineFromSnapshot` treats `active_at_event===true` as the only explicit "active", `===false` as explicit inactive, other/absent as not-recorded; `structuredProms` yields an array only from explicit `proms_json` records, preserving `0`/`false` and explicit dates only.
- **Forms/CIMA/validation:** catalog `selectDrug`/`reconcileCatalogSelection` apply only identity proposal fields; dose/route/schedule proposed only into editable slot-specific proposal fields; professional edits preserved (manual-requested CIMA browser PASS). `applyContext` maps only raw requested/validated fields; no auto-fill of validated from requested. Induction controls start empty/unknown (`No informado`), never inferred. Enfermería normalization maps explicit workbook strings (`NEGATIVO`/`COMPLETO`/`OK`→Completo, `PENDIENT`→Pendiente, `POSITIV`→Positivo/alert, blank→No informado) confined to the Enfermería status summary; never derives dose/route/therapeutic action.
- **Storage/session/handoff/export:** only allowed envelope key `promueve.fh.currentPatientSession.v1`; envelope rejects workbook/read_model/population/bytes/secret/token/password keys; purges residue on CIP switch; drafts CIP/patient/generation-scoped. Statistics handoff in-memory with origin/nonce/digest/TTL; no cohort persisted. Raw CSV records carry `name:'' age:'' sex:''`; demo CSV is labeled demo and never mixed with raw. Excel v1 61-col uses explicit visible form values + `demoFlag:true`; v2 export labeled technical/demo "No apto para piloto real".
- **Longitudinal/safety:** `no_change_recorded`/`not_recorded` never presented as movements; suspension only explicit; `absent`/`not_recorded` EA never resolves a prior EA; causality only via explicit assessment records (Naranjo/Karch–Lasagna produce final labels only through explicit answer flows); `active_at_event` tri-state; dates never invented.
- **Prohibited-inference preservation (all confirmed):** requested != validated; previous != new start (lines only from explicit snapshots); missing stays empty/unknown/pending; no dose/route/schedule/presentation/induction/duration/renewal/switch/causality/validation/therapeutic-line inferred from drug name, catalog, previous treatment, label, tray, or missing data.

**Boundary assessment:** strong explicit-data hygiene; no demonstrated P0 inference defect. The one defect is a functional type/rendering bug (`proms` string vs array — F-01), not a clinical-inference bug.

---

## 7. Publication/test/browser-QA evidence ledger

### 7.1 Authority and cleanliness

- `gh issue view 283/284/285/286 --repo b32majus/Hub-Clinico-Badajoz` → Issue #285 OPEN, label `status:approved`; Plan #283 OPEN; #284/#286 evidence reconciled/PASS.
- `git ls-remote origin recovery/farmacia-pr-replay-20260727` → `097396a1d6b995a62f9fc2499879a1271259d753` (matches local HEAD).
- `git status --porcelain` on both disposable analysis clones → only `?? .atl/` (auto-generated untracked); 0 tracked modifications.

### 7.2 Deterministic checks (Node, no install) — 35+/42+ discrete repo checks passed

Both auditors independently batch-ran the repo `tools/*` checkers. **35+/42+ discrete repo check commands passed** (the evidence wording used conservatively: 42+ individual check invocations were run, of which 35+ distinct passing commands plus count-bearing assertions passed; exact per-check counts below). The two template checkers specifically are `farmacia_excel_operativo_template_check.mjs` **36/36** and `farmacia_excel_sintetico_check.mjs` **38/38** (the primary audit's shorthand "36/38" is corrected here per reviewer D5 — do not conflate check-command count with assertion count). All counts match between auditors: smoke 48/48; snapshot 16/16; reader 21/21; selectors 82/82; data port 11/11; session 17/17; patient flow 17/17; statistics 30 scenarios; longitudinal 18; dashboard_paciente 37/37; primera_visita 97/97; seguimiento 153/153; multitreatment 19/19; storage PASS; common 101/101; tratamiento 67/67; pautas PASS; enfermería 95/95 + 45/45 + 109/109; validation_export_truth 37/37; export_v2 core API=16 COLUMNS=152 FIXTURES=3 ROWS=4; excel_row_export 73/73; prebiologico 29/29 + 72/72 + 21/21; derma_pathologies 33/33; inicio_bandejas 28/28; evaluation_workbook 11 sheets; alta_guiada 18/18; pr57a/b/c/d PASS; bridge_handoff 37; `node --check` on all farmacia scripts per GHA workflow PASS.

**Four stale-oracle FAILURES** (all confirmed by both auditors; all are test-oracle/version mismatches, not product regressions):

| Checker | Result | Cause |
|---|---|---|
| `tools/farmacia_pr57e_dashboard_visit_line_check.mjs` | FAIL 60/63 | asserts consumer page JS cache-buster `v=20260728-pr57e`; actual pages load later cache-busters (`v=20260806-patient-flow-r1` / `v=20260807-longitudinal-raw-r1`). Helper loads first; functional assertions pass. (F-05) |
| `tools/farmacia_validacion_ui_cleanup_check.mjs` | FAIL 53/54 | DOM assertion "no public v2 button/control" (`!id.*(?:Export|Download).*v2`), but shipped HTML intentionally has `fhValExportV2Btn` + v2 container. (F-02) |
| `tools/farmacia_cima_contextless_selection_check.mjs` | FAIL 1/6 → 6/6 group-6 after version fix | expects `farmacia_common.js?v=20260730-cima-contextless-p0` in validación; actual `v=20260806-patient-flow-r1`. After patching the version, groups 1–5 pass but group 6 frozen Cáceres snapshot hashes are stale (snapshot rebuilt at d9cbd56/0.4 after hashes recorded). (F-07/D4) |
| `tools/farmacia_evaluation_ledger_check.mjs` | FAIL | expects manifest version `CÁCERES-REVIEW-0.3`; actual `CÁCERES-REVIEW-0.4`. (F-06) |

Not in any CI workflow (`.github/workflows/farmacia-smoke-check.yml` runs only smoke + 3 bridge checkers + syntax checks); internal regression debt, not a live package QA ledger failure (D1).

### 7.3 Browser QA (actual Chromium 149 headless; global Playwright; local HTTP; no install)

**Passing:** `farmacia_quickview_raw_proms_browser_check.mjs`; `farmacia_patient_flow_cutover_browser_check.mjs` (raw CIP-RAW-A workbook upload → QuickView → Dashboard renders "Solicitado RAW A/Validado RAW A/RAW_PROM_A: 0 · 2026-08-04"); `farmacia_longitudinal_raw_browser_check.mjs` (CIP-LONGITUDINAL-A/B); `farmacia_statistics_cutover_browser_check.mjs` (demo=3, raw=55, CSV 55×37); `farmacia_export_v2_parallel_activation_browser_check.mjs` (expects v2 button); `farmacia_first_visit_excel_truth_browser_check.mjs`; `farmacia_validacion_manual_requested_cima_check.mjs` (free port 4175); `farmacia_evaluation_ledger_browser_check.mjs` (free port); `farmacia_evaluation_workbook_browser_check.mjs` (free port via `FH_WORKBOOK_BASE_URL`). Console/pageerror 0 where asserted.

**Published dashboard reproduction (the P1):** actual Chromium against both root and `previews/caceres-fh/` on `farmacia_dashboard_paciente.html?cip=CIP-DEMO-FH-00X&entrada=dashboard` throws `TypeError: (patient.proms || []).map is not a function` at `farmacia_dashboard_paciente.js:886:42`; `#dashboardSummaryGrid` children=0, text empty; all four demo CIPs throw (patient name/badge set before the throw). The published Inicio demo card (`previews/caceres-fh/farmacia_index.html:109` → `farmacia_dashboard_paciente.html?cip=CIP-DEMO-FH-004&entrada=dashboard`) is a direct route into the broken context.

**Direct Chromium, 0 errors:** Cáceres index (`CÁCERES-REVIEW-0.4` banner, catalog 4032 Fx); QuickView demo CIP-DEMO-FH-001; A/B/A isolation (FH-001 → FH-004 → FH-001); Seguimiento/Validación/Primera Visita demo pages; Estadísticas direct (demo fallback); Actividad; admin demo surfaces `farmacia_farmacos.html` / `farmacia_profesionales.html`.

**Snapshot integrity:** `farmacia_caceres_review_snapshot_check.mjs` 16/16 (48 files); independent raw SHA-256 re-hash of all 47 manifest `hashes` entries against checkout bytes = **0 mismatches** (snapshot 16/16 and 47/47 hashes); manifest `version=CÁCERES-REVIEW-0.4`, `source_sha=8bfceaaa...`, `last_functional_sha=fb7b70c...`; snapshot content = branch sources + documented identity/profile transform only (allowlist 45 vs hashes 47 intentional). Real-data absence: checker assertion 16 + manual scan → no `.env`/key/private-key markers; demo JSON labeled synthetic.

**External workbook not locally present:** the published external evaluation workbook is **not in this repo**; evidence about the 152/95/93/55 workbook is derived from the project's own published checkers + docs, not a local read (labelled derived throughout).

**Occupied-port runs retried on free ports:** scripts hard-coding port 4174/48796 (occupied by an unrelated historical server) were re-run with `FH_*_BASE_URL`/`FH_WORKBOOK_BASE_URL` on free ports and **PASS**; the failures are environmental, not product evidence (F-08/F-14). Browser checkers that do not support an env base URL were not re-run; their deterministic equivalents pass.

---

## 8. Material findings

Schema (per Issue #285): `ID`; subsystem/capability; type; exact evidence; observed current state; why it matters; severity `P0|P1|P2|P3|SKIP`; timing; confidence; remediation (2–4 lines max); `BLOCKS_PHARMACY_REVIEW`; `REQUIRES_SEPARATE_WO`.

### F-01 — Published demo Dashboard Paciente crashes on the direct Inicio-linked demo card (`proms` shape-contract mismatch) — **the one P1 blocker**
- Subsystem/capability: Dashboard Paciente (3) + Inicio (1) + snapshot packaging (14).
- Type: FUNCTIONAL_GAP.
- Exact evidence: `scripts/farmacia_dashboard_paciente.js` `renderDashboard` line 886 `value: (patient.proms || []).map(...)`; demo patients in `scripts/farmacia_common.js` (lines 13/60/110/117, CIP-DEMO-FH-001..004) store `proms` as a **string** (`'DLQI 8; EVA picor 3/10'`, `'Basal pendiente'`, `'HAQ 1.1 (basal)...'`, `'HAQ 0.9...'`); runtime raw patients carry array `proms` via `mapPatient`; `farmacia_excel_row_export.js` (lines 159-213) reads `proms` as an **object** (`proms.morisky_green`, `proms.haq`, `proms.eva_dolor`, `proms.dlqi`). Chromium (both auditors): `TypeError: (patient.proms || []).map is not a function` at line 886:42, `#dashboardSummaryGrid` children=0, for CIP-DEMO-FH-001..004 on root and `previews/caceres-fh/`. Published Inicio demo card `previews/caceres-fh/farmacia_index.html:109` links to `farmacia_dashboard_paciente.html?cip=CIP-DEMO-FH-004&entrada=dashboard` (F-15 merged here per D2).
- Observed current state: demo dashboard never renders the summary grid; page error in console; **same in the published Cáceres snapshot**; patient name/badge set before the throw. Raw CIP-LONGITUDINAL dashboard (array `proms`) unaffected — browser PASS.
- Why it matters: an evaluator clicking the published "Ver dashboard FH-004" card sees an empty dashboard + console error — a published defect on a supported demo surface of the evaluation package. Root cause is broader than one line: one `proms` contract with multiple consumer shapes — demo dataset stores **string**, runtime stores **array**, dashboard renderer expects **array**, v1 Excel row export expects **object**. Independent reviewer D6 also confirmed the dashboard "Copiar fila Excel FH" button (`initDashExcelBtn`, `farmacia_dashboard_paciente.js` ~1792, passing `proms: patient.proms` into `buildContextFromDashboard`) serializes **blank PROM cells** in any mode (dashboard button only; the clinical Validación/PV/Seguimiento 61-col buttons pass a correctly-shaped `{morisky_green, dlqi, eva_dolor}` object and are unaffected). Absorbed here without raising severity.
- Severity: **P1** (not P0 — the intended raw evaluator path is unaffected). · Timing: **DO_BEFORE_EXTERNAL_REVIEW**. · Confidence: 0.98.
- Remediation: normalize `proms` once before render (guard with `Array.isArray`/typed contract at a single normalization point), or normalize demo records on read; add a Chromium regression that opens the exact published card link `farmacia_dashboard_paciente.html?cip=CIP-DEMO-FH-004&entrada=dashboard` and asserts a non-empty grid + 0 page errors. Optionally harden `buildContextFromDashboard`/row-export to the object shape so the dashboard Excel button stops emitting blank PROM cells. No product redesign.
- BLOCKS_PHARMACY_REVIEW: **YES** — the report adopts F-01 as the one P1 blocker on a direct supported published route (published Inicio demo card → demo dashboard). It is P1, not P0, because the intended raw single-workbook evaluator path is unaffected; but it blocks external Pharmacy review of the package as published. · REQUIRES_SEPARATE_WO: **YES**.

### F-02 — Stale "no public v2 button" assertions contradict shipped UI (demoted per D1)
- Subsystem/capability: Validación/Primera Visita/Seguimiento (5/6/7) + persistence V4 (12).
- Type: TEST_QA_GAP.
- Exact evidence: `tools/farmacia_export_v2_context_browser_check.mjs:71`, `farmacia_export_v2_followup_browser_check.mjs:178`, `farmacia_export_v2_first_visit_browser_check.mjs:176`, `tools/farmacia_validacion_ui_cleanup_check.mjs:80-81` assert zero v2 buttons/downloads; shipped HTML has `id="fhValExportV2Btn"` (`farmacia_validacion.html:581`), `fhPvExportV2Btn` (`farmacia_primera_visita.html:174`), `fhSegExportV2Btn` (`farmacia_seguimiento.html:318`), each labeled "Copiar Export v2 demo · 152 columnas", deliberately enabled for registered contexts since commit `fe84d83`, present in current HEAD + published snapshot.
- Observed current state: 4 checkers FAIL on current HEAD for CIP-DEMO-FH-001/FH-004 (context/first_visit/followup browsers fail at `getByRole('button',{name:/v2/i}).count()===0` actual=1; ui_cleanup 53/54). After patching expectations to `count()===1`/expect v2 id, all remaining assertions pass (context PASS, first_visit 14/14, followup PASS, ui_cleanup 54/54). The authoritative checkers reflecting product truth PASS: `farmacia_export_v2_parallel_activation_browser_check.mjs` and `farmacia_validacion_manual_requested_cima_check.mjs`. None of the four stale checkers run in CI (`.github/workflows/farmacia-smoke-check.yml`).
- Why it matters: stale test oracles contradict shipped UI and would fail a local QA run, but they are internal regression debt, not an evaluator-visible defect and not a package-level QA-ledger falsity.
- Severity: **P2** (QA hygiene; reviewer D1 recommends P2; not a P1 blocker under Issue #285's priority rule). · Timing: **DO_AFTER_FEEDBACK**. · Confidence: 0.97.
- Remediation: update the three browser checkers + ui_cleanup DOM check to expect the intentional v2 control (present, labeled, disabled when context invalid, enabled when registered), aligning with the parallel-activation checker. Fold with F-05/F-06/F-07 into one QA-reconciliation WO.
- BLOCKS_PHARMACY_REVIEW: **NO**. · REQUIRES_SEPARATE_WO: **NO** (QA-reconciliation WO).

### F-03 — Published state docs cite HEAD `827163d8` while branch HEAD is `097396a1`
- Subsystem/capability: docs/governance (14).
- Type: DOC_DRIFT.
- Exact evidence: `docs/INDEX.md:9,25,46`, `docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md:6-7,14`, `docs/ops/WORK_ORDER_STATUS.md` cite published HEAD `827163d8...`; `git rev-parse HEAD` = `097396a1...`; `827163d` is an ancestor; PRs #281/#282 merged later (confirmed by independent reviewer).
- Observed current state: operative docs lag two documentation merges behind GitHub; project rule "GitHub real prevalece" resolves truth.
- Why it matters: an operator/auditor reads the wrong published HEAD; Issue #285 itself requires remote-HEAD re-verification.
- Severity: P3. · Timing: DO_AFTER_FEEDBACK (reconcile in a separate documentation WO; do not touch INDEX/WORK_ORDER_STATUS inside this WO). · Confidence: 1.0.
- Remediation: update INDEX/WORK_ORDER_STATUS/EVALUATION_READY_STATE to `097396a1...` after this audit is accepted, in a separate documentation/adoption WO.
- BLOCKS_PHARMACY_REVIEW: NO. · REQUIRES_SEPARATE_WO: YES.

### F-04 — Dashboard demo PROMs mis-render path (amended per D3; not a throw)
- Subsystem/capability: Dashboard Paciente (3).
- Type: FUNCTIONAL_GAP.
- Exact evidence: `scripts/farmacia_dashboard_paciente.js` `renderProms` (368-460) iterates `proms.length` and indexes `proms[pi]`; `renderExtendedBlocks` (749-820) at line 751 normalizes `patient.proms = Array.isArray(patient.proms) ? patient.proms : []` **only in the raw/long-dataset path** (line 1021 area); demo patients without a longitudinal-dataset entry never hit that normalization.
- Observed current state: **`renderProms` does not throw** — a string has `.length` and indexing, so it silently groups every string character under an `undefined` `tipo_prom` key and renders fixed demo types as "—", plus an `undefined — Farmacia · Último valor` garbage tile. Confirmed in Chromium for CIP-DEMO-FH-002 after longitudinal dataset load (container text `DLQI—No registradoEVA dolor—No registradoEVA prurito—No registradoundefined—FarmaciaÚltimo valor`). For CIP-DEMO-FH-001/003/004 the `.then()` long-dataset merge overwrites `proms` with an array before `renderProms` runs; for FH-002 it does not. `renderDashboard`'s `.map` (F-01) is the only throw.
- Why it matters: same root cause family as F-01 (one `proms` contract, multiple shapes); the fix must be uniform (one normalization point before render).
- Severity: P2 (absorbed by F-01 remediation). · Timing: DO_BEFORE_EXTERNAL_REVIEW (with F-01). · Confidence: 0.95.
- Remediation: normalize once before any render; add a demo-patient dashboard Chromium regression covering CIP-DEMO-FH-002.
- BLOCKS_PHARMACY_REVIEW: NO standalone (covered by F-01). · REQUIRES_SEPARATE_WO: YES (with F-01's WO).

### F-05 — `farmacia_pr57e_dashboard_visit_line_check.mjs` stale cache-buster assertion
- Subsystem/capability: Dashboard visit/line grouping (3/4).
- Type: TEST_QA_GAP.
- Exact evidence: `tools/farmacia_pr57e_dashboard_visit_line_check.mjs:80` requires consumer page JS loaded with `?v=20260728-pr57e`; actual pages load helper `longitudinal_normalizer.js?v=20260728-pr57e` before consumers with later cache-busters (`farmacia_dashboard_paciente.js?v=20260806-patient-flow-r1`, `farmacia_dashboard_longitudinal.js?v=20260807-longitudinal-raw-r1`). Helper loads before consumers (verified index positions).
- Observed current state: FAIL 60/63; failures are cache-buster-string only; functional normalization assertions pass.
- Why it matters: false negative in the local QA ledger.
- Severity: P3. · Timing: DO_AFTER_FEEDBACK. · Confidence: 0.98.
- Remediation: update expected consumer cache-busters or make the assertion content-based.
- BLOCKS_PHARMACY_REVIEW: NO. · REQUIRES_SEPARATE_WO: NO (fold into QA-reconciliation WO with F-02/F-06/F-07).

### F-06 — `farmacia_evaluation_ledger_check.mjs` expects snapshot version 0.3 (stale)
- Subsystem/capability: snapshot/packaging (14).
- Type: TEST_QA_GAP / DOC_DRIFT.
- Exact evidence: `tools/farmacia_evaluation_ledger_check.mjs:213` asserts `deployment-manifest.json` `version === 'CÁCERES-REVIEW-0.3'`; actual manifest version is `CÁCERES-REVIEW-0.4` (d9cbd56/0.4 promotion).
- Observed current state: FAIL on current HEAD.
- Why it matters: same false-negative QA issue; checker predates the 0.4 promotion.
- Severity: P3. · Timing: DO_AFTER_FEEDBACK. · Confidence: 0.99.
- Remediation: update expected version to 0.4 or read the version from the manifest.
- BLOCKS_PHARMACY_REVIEW: NO. · REQUIRES_SEPARATE_WO: NO (fold into QA-reconciliation WO).

### F-07 — `farmacia_cima_contextless_selection_check.mjs` stale asset-version + stale frozen hashes (amended per D4)
- Subsystem/capability: CIMA/catalog (11).
- Type: TEST_QA_GAP.
- Exact evidence: checker constants (`tools/farmacia_cima_contextless_selection_check.mjs:10-11,16-17`) expect validación to load `farmacia_common.js?v=20260730-cima-contextless-p0`; actual `farmacia_validacion.html:592` loads `farmacia_common.js?v=20260806-patient-flow-r1`. The checker also carries a `frozenHashes` block (line 32+, asserted line 229-230) recorded against the pre-0.4 snapshot.
- Observed current state: module regression FAIL 1/6 on the common-version assertion. After patching the version to `20260806-patient-flow-r1`, groups 1–5 pass but **group 6 frozen Cáceres snapshot hashes still fail** because the snapshot was rebuilt at d9cbd56 (0.4) after the hashes were recorded (independent reviewer D4 reproduction).
- Why it matters: two stale layers — the version assertion prevents deeper regression checks from running, and the frozen-hash block fails even after the version fix; masks whether the P0 CIMA contextless fix regressed.
- Severity: P3. · Timing: DO_AFTER_FEEDBACK. · Confidence: 0.97.
- Remediation: update the expected asset version for validación **and** refresh the frozen snapshot-hash block (or assert content rather than cache-buster/hash).
- BLOCKS_PHARMACY_REVIEW: NO. · REQUIRES_SEPARATE_WO: NO (fold into QA-reconciliation WO).

### F-08 — Manual requested CIMA browser check: earlier failure was environment (busy port), not product
- Subsystem/capability: CIMA/catalog + Validación (11/5).
- Type: OTHER (environment).
- Exact evidence: default `FH_VALIDACION_URL` port 4174 occupied by an unrelated historical server; with `FH_VALIDACION_URL=http://127.0.0.1:4175/farmacia_validacion.html` the checker **PASSES** with `consoleErrors=[]` `pageErrors=[]` (both auditors; free port).
- Observed current state: PASS under correct environment.
- Why it matters: avoid misattribution; no product finding.
- Severity: SKIP. · Timing: n/a. · Confidence: 0.99.
- Remediation: none (environmental).
- BLOCKS_PHARMACY_REVIEW: NO. · REQUIRES_SEPARATE_WO: NO.

### F-09 — Activity page is demo-only by design; not raw-wired
- Subsystem/capability: Activity (9).
- Type: FUNCTIONAL_GAP (documented).
- Exact evidence: `docs/ops/FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md` §7; `farmacia_actividad_servicio.js` reads `FarmaciaDemo.getAvailablePatients()` only; no Data Port/raw population wiring.
- Observed current state: demo cards render; raw population activity not shown.
- Why it matters: an evaluator must not interpret Activity as real population activity (guide: "Actividad permanece demo").
- Severity: P3 (documented, non-blocking). · Timing: FUTURE_V4. · Confidence: 1.0.
- Remediation: none for this review; defer functional definition per docs.
- BLOCKS_PHARMACY_REVIEW: NO. · REQUIRES_SEPARATE_WO: YES (whenever defined).

### F-10 — Export v2 152-col and v1 61-col run in parallel with no retirement; multiple live consumers
- Subsystem/capability: persistence/roundtrip V4 (12) + Validación/PV/Seguimiento (5/6/7).
- Type: TECHNICAL_DEBT.
- Exact evidence: v1 61-col row export bound on all three pages (`fhValExcelExportBtn` etc., `farmacia_excel_row_export.js`); v2 152-col demo bound in parallel (`data-export-version="v2"`, `fhValExportV2Btn`/`fhPvExportV2Btn`/`fhSegExportV2Btn`); v2 context registry per page (validation: FH-001; firstVisit: FH-001; followup: FH-001 + FH-004); DECISION doc WO5 adjudication "PARTIALLY_SATISFIED... REMAINING_SCOPE_DEFERRED"; no cutover/retirement.
- Observed current state: two export families coexist deliberately; V2 enabled only for registered demo contexts.
- Why it matters: parallel export paths increase maintenance/blast radius and add evaluator confusion if misread; must not be mistaken for a live roundtrip.
- Severity: P3. · Timing: FUTURE_V4 (retire v1 or promote v2 only after product decision + feedback). · Confidence: 0.95.
- Remediation: keep current scope; after external feedback decide v1 retirement/v2 promotion as a separate authorized WO.
- BLOCKS_PHARMACY_REVIEW: NO. · REQUIRES_SEPARATE_WO: YES.

### F-11 — Roundtrip / APP_* / relational Excel not implemented
- Subsystem/capability: persistence/roundtrip V4 (12).
- Type: FUNCTIONAL_GAP (documented, intentional).
- Exact evidence: `DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md` §3.2/§6; `docs/ops/WORK_ORDER_STATUS.md` rows 164-165; template has 152-col service sheets with 0 populated rows + hidden empty technical sheets in this clone; reader/Data Port work one-way.
- Observed current state: no Office Script, no relational populator, no Read Adapter, no Hub→Excel→Hub roundtrip.
- Why it matters: the current flow is one-way Excel→Hub; do not present as a persistence product. For the current baseline this is P3 (non-blocking). Roundtrip becomes mandatory (P1-equivalent gate) **before any pilot claim** — a pilot cannot rely on session-envelope-only state.
- Severity: P3. · Timing: FUTURE_V4. · Confidence: 1.0.
- Remediation: leave for the authorized sequence after external feedback; never present as persistence in the eval package.
- BLOCKS_PHARMACY_REVIEW: NO. · REQUIRES_SEPARATE_WO: YES.

### F-12 — PreSalud integration has no code; docs only (seam absent by design)
- Subsystem/capability: PreSalud (13).
- Type: FUNCTIONAL_GAP (documented, intentional).
- Exact evidence: only `docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md` Presalud section and `PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md` §14.2; zero runtime references.
- Observed current state: no parser, no seam, no fixture.
- Why it matters: do not claim PreSalud readiness. Plan #283 intends a fast-track PreSalud candidate. The **current frozen package without PreSalud is not blocked** by the absence. If the operator intends a **revised package with PreSalud**, that becomes a conditional pre-external-review workstream that must pass the Plan #283 gates (see §11 step 2). It is NOT deferred to FUTURE_V5 or only DO_BEFORE_PILOT.
- Severity: P2 (functional gap vs plan intent) — non-blocking for the current unchanged package. · Timing: **DO_BEFORE_EXTERNAL_REVIEW** (for a revised PreSalud candidate only). · Confidence: 1.0.
- Remediation: leave the current package unchanged; when a revised PreSalud candidate is intended, execute it as a separate fast-track WO passing all Plan #283 gates (real export inspected read-only; accepted explicit semantic contract; minimal parser/adapter; deterministic tests; supported browser QA; safety/non-inference regression; no real data in repo/artifacts; correct-branch publication; snapshot/evaluation package rebuild/refreeze; guide/checklist/manifest/hashes reconciled).
- BLOCKS_PHARMACY_REVIEW: NO (for the current unchanged package). · REQUIRES_SEPARATE_WO: YES.

### F-13 — Demo longitudinal dashboard mixes demo + raw source modes in one page with different labels
- Subsystem/capability: Patient Longitudinal (4).
- Type: OTHER / UX clarity (low).
- Exact evidence: `farmacia_dashboard_longitudinal.js` chooses raw when an envelope exists else fetches the demo JSON; dataset label differs (`statusEl.textContent`); raw mode shows a "Paciente actual" single entry; demo mode shows a demo-note banner; header/legend/selectors do not consistently indicate mode to a user who landed directly.
- Observed current state: two source modes share one page, labelled in the data-status text only.
- Why it matters: mild evaluator ambiguity about whether values are raw vs demo; not an inference issue.
- Severity: P3. · Timing: DO_AFTER_FEEDBACK. · Confidence: 0.8.
- Remediation: add an always-visible source-mode banner (raw vs demo) on the longitudinal page.
- BLOCKS_PHARMACY_REVIEW: NO. · REQUIRES_SEPARATE_WO: NO (small UI copy change).

### F-14 — Catalog "Inducción solicitada" initial-value assertion: correct and PASS on the correct clone/free port (environmental attribution, non-finding)
- Subsystem/capability: Validación (5).
- Type: OTHER (environment).
- Exact evidence: `farmacia_validacion_manual_requested_cima_check.mjs` expects `fhManualInduccion` initial `inputValue ''`; HTML first `<option value="">No informado</option>` → `inputValue ''` is correct. The assertion is **not stale**: it passed on the correct clone at free port 4175 (see F-08), and `fhValidadoInduccion`/`fhDermaInduccion` empty assertions also pass. The only earlier failure was environmental (wrong/old worktree + busy port 4174).
- Observed current state: PASS against the correct tree; no product defect, no test-oracle defect.
- Why it matters: documented to avoid misattribution of an environmental port/worktree issue to the product or the checker.
- Severity: SKIP. · Timing: n/a. · Confidence: 0.98.
- Remediation: none.
- BLOCKS_PHARMACY_REVIEW: NO. · REQUIRES_SEPARATE_WO: NO.

> F-15 from the primary audit is **merged into F-01** (independent-review D2): it was the same route/mechanism (published Inicio card → F-01 URL) with no independent severity or remediation. It is not retained as a separate numbered finding. F-01's evidence and remediation now carry the exact link and the required regression click.

---

## 9. Conservative dead/legacy ledger

Labels restricted to `DEAD_CONFIRMED`, `DEAD_LIKELY`, `LEGACY_SUPPORTED`, `LEGACY_UNSUPPORTED`, `UNREFERENCED_BUT_DYNAMIC_UNKNOWN`. **No deletion implied anywhere**; evidence = static refs, HTML/DOM, routes/interactions, tests/checkers, snapshot consumers.

| Candidate | Evidence | Classification |
|---|---|---|
| `scripts/farmacia_evaluation_ledger.js` | referenced only by checker + workbook module; absent from supported pages (ledger browser check asserts absence); no runtime role; not in snapshot allowlist | **LEGACY_UNSUPPORTED** (intentionally versioned for traceability; DECISION §4.1/§6) |
| `scripts/farmacia_evaluation_workbook.js` | referenced only by checker; no page refs; not in snapshot allowlist | **LEGACY_UNSUPPORTED** (historical technical artifact) |
| `scripts/farmacia_bridge_v2_dashboard_handoff.js` | only its checker; absent from pages (handoff checker asserts absence); not wired; not in snapshot allowlist | **LEGACY_UNSUPPORTED** (historical Bridge handoff; docs post-flow: no visible Bridge mode) |
| `scripts/farmacia_multitreatment_core.js` | **checker-only**: loaded by no page (not in `farmacia_*.html` or snapshot); absent from manifest; sole consumer is `tools/farmacia_multitreatment_core_check.mjs` (which also drives the passing 19/19 check); exports `FarmaciaMultitreatmentCore` API | **LEGACY_UNSUPPORTED (checker-only classification)** — supported QA role only; not `DEAD_CONFIRMED` because checker-only is a supported role |
| `scripts/farmacia_export_v2_core.js` + adapters + context | loaded on Validación/PV/Seguimiento and in snapshot; v2 buttons present/disabled-enabled by context; core/adapter checkers PASS; parallel-activation browser PASS | **LEGACY_SUPPORTED** (technical/demo parallel export, governed) |
| `farmacia_actividad_servicio.html/js` | wired nav/action-card; visible; loads and renders; smoke + Chromium PASS; in snapshot allowlist | **LEGACY_SUPPORTED** (demo-only, documented) |
| `data/farmacia_demo/*.csv` | only docs mention; no runtime read | **UNREFERENCED_BUT_DYNAMIC_UNKNOWN** (documented mirror dataset) |
| `data/demo/farmacia/export_v2/*.json` | used by checkers as synthetic fixtures | **LEGACY_SUPPORTED** (QA fixtures) |
| `scripts/farmacia_longitudinal_normalizer.js` + dashboard shared helpers | loaded on both dashboards; PR57E (partially stale); in snapshot allowlist | **LEGACY_SUPPORTED** |
| Reuma-family root HTML/JS (`index.html`, `script.js`, `estadisticas.html`, `manage_*`, `dashboard_*`) | nav "Reumatología" only; no Farmacia-flow consumer; not in Cáceres snapshot allowlist | **LEGACY_SUPPORTED** (separate Reuma v2 lineage; no merge per `DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES`) |

---

## 10. Independent review section — disagreements and dispositions

Independent reviewer result: `INDEPENDENT_FALSIFICATION_PASS` — one fresh reviewer, disposable clone, targeted reproduction of every challenged claim (Chromium, repo checkers, manifest re-hash), no repo mutation, no P0/P1 claim or verdict unsound. Reproduction ledger: 15/15 rows confirmed (F-01 demo crash; F-01 raw-safe; raw CIP-LONGITUDINAL; F-02 four stale checkers + only-stale-assertion-fails; F-05/F-06/F-07 stale versions; F-07 frozen-hash layer; F-08/F-14 environment PASS; 35+ deterministic checkers re-run; browser QA re-run; snapshot 16/16 + 47/47 hashes; real-data absence; docs-head drift; authority; cleanliness).

| ID | Disagreement (audit finding) | Evidence / impact | Mandatory disposition | Application in this report |
|---|---|---|---|---|
| D1 | F-02 severity P1 + BLOCKS=YES over-weights a test-oracle gap | Four stale checkers are not run in CI and not part of evaluator package QA; authoritative parallel-activation + manual-requested checkers PASS. P1 rule requires breaking an essential evaluator path or invalidating the PreSalud candidate. | AMEND/DEMOTE → P2, DO_AFTER_FEEDBACK, BLOCKS=NO, SEPARATE_WO=NO | **Applied.** F-02 is P2, DO_AFTER_FEEDBACK, BLOCKS_PHARMACY_REVIEW=NO, REQUIRES_SEPARATE_WO=NO; executive conclusion + action set carry the single P1 blocker rationale. |
| D2 | F-15 duplicates F-01 and double-counts the blocker | F-15 added no independent mechanism/severity/remediation; same crash/route. | MERGE → fold route into F-01, no standalone numbered finding | **Applied.** F-15 removed as standalone; route evidence + regression-click added to F-01 (noted at end of §8). |
| D3 | F-04 mechanism claim inaccurate ("would throw") | `renderProms` iterates `.length`/indexes; a string does not throw — it silently mis-renders (undefined-type grouping + garbage tile), confirmed in Chromium for CIP-DEMO-FH-002. | AMEND | **Applied.** F-04 now states silent mis-render, not throw; FH-002 evidence; one-normalization-point remediation kept. |
| D4 | F-07 understates the stale layer (frozen-hash block also fails) | After patching the common version, groups 1–5 pass but group 6 frozen snapshot hashes still fail (0.4 rebuild). | AMEND | **Applied.** F-07 remediation now requires refreshing the frozen-hash block or content-based assertions; observed-state covers both layers. |
| D5 | Matrix cell "36/38" imprecise | Actual: `farmacia_excel_operativo_template_check.mjs` = 36/36; `farmacia_excel_sintetico_check.mjs` = 38/38. | AMEND | **Applied.** §4 cap-12 cell now reads "template structural checks 36/36 PASS + sintetico 38/38 PASS"; §7.2 heading now states 35+/42+ discrete repo checks passed without conflating check-command count with assertion count. |
| D6 | F-01 root cause should absorb the dashboard Excel-export PROM shape mismatch | `farmacia_excel_row_export.js` reads `proms` as object; dashboard button passes `patient.proms` (array raw / string demo) → blank PROM cells on the dashboard-only Excel button; same shape-contract family. | ADD/AMEND as absorbed note under F-01; do not raise severity | **Applied.** F-01 root cause broadened to the four-consumer shape contract; dashboard Excel blank-PROM-cell behavior added as absorbed low-severity note; severity unchanged. |
| D7 | F-03, F-05, F-06, F-08, F-09, F-10, F-11, F-12, F-13, F-14, §4, §5, §8 ACCEPT | All remaining findings/sections verified against repo evidence. | ACCEPT | **Applied.** Retained as written with D5's matrix correction; no silent discard. |

**Optional reviewer ADDs applied:** §4 coverage note (admin demo surfaces `farmacia_farmacos.html`/`farmacia_profesionales.html` render clean, outside the 14-capability contract); §9 `farmacia_multitreatment_core.js` checker-only classification.

---

## 11. Ordered action set

**DO_BEFORE_EXTERNAL_REVIEW:**
1. **The one P1 product blocker** — fix F-01 in a **separate WO**: normalize the `proms` shape contract once before dashboard render (or on demo read) so demo dashboards render; add a Chromium regression on the exact published Inicio card link (`farmacia_dashboard_paciente.html?cip=CIP-DEMO-FH-004&entrada=dashboard`) and CIP-DEMO-FH-002 coverage for F-04; optionally align the dashboard Excel button's `proms` object shape (F-01/D6 note). Single bounded fix; no redesign.
2. **Conditional fast-track (Plan #283), does NOT block sending the unchanged current package** — if the operator intends a **revised package with PreSalud** (F-12), execute it as a separate WO passing every Plan #283 gate: real export inspected locally/read-only; accepted explicit semantic contract; minimal parser/adapter (hydration only if needed); deterministic tests; supported browser QA; safety/non-inference regression; no real data in repo/artifacts; correct-branch publication; new snapshot/evaluation package rebuild/refreeze; guide/checklist/manifest/hashes reconciled. The current frozen package without PreSalud is not blocked by the absence.

**DO_AFTER_FEEDBACK (non-blocking QA/doc reconciliation, separate WOs):**
3. Reconcile the stale QA oracles F-02/F-05/F-06/F-07 in one QA-reconciliation WO (update v2-button expectations, cache-buster/version/hash assertions to content-based or current values) so the local QA ledger is trustworthy.
4. Reconcile published-docs HEAD drift F-03 (INDEX/WORK_ORDER_STATUS/EVALUATION_READY_STATE → `097396a1...`) in a separate documentation/adoption WO.
5. Revisit F-13 (always-visible source-mode banner on longitudinal).

**DO_BEFORE_PILOT (separate authorized WO, only when product decides to pursue a pilot):**
6. Persistence/roundtrip V4 (F-11): Office Script / APP_* relational populator / Excel Read Adapter / Hub→Excel→Hub — never presented as persistence in the current eval package; roundtrip becomes mandatory (P1-equivalent gate) before any pilot claim.

**FUTURE_V4/V5 (no broad refactor programme):**
7. Define Activity population semantics (F-09) and v1/v2 export retirement decision (F-10) only after external feedback.
8. General refactor of page monoliths and shared interpretation helpers only after product feedback.

No real-data exposure. No `.env`/secrets/patient data touched. The audits made no product/code/schema/workbook/Pages change and **no commit/push/PR**. The **only** Git topology/content mutation is the authorized docs branch `docs/fh-baseline-audit-v1-20260904` carrying this one report candidate, stopped before commit/push/PR for supervisor verification; analysis clones contain only auto-generated untracked `.atl/`.

---

## 12. Required close-out checks and supervisor-correction record

- Output at authorized path `docs/audits/FARMACIA_BASELINE_AUDIT_V1_20260904.md`: ✅
- All 14 capabilities × all 12 axes in §4: ✅ (14 rows × **exactly 12 axis cells each**, aligned to header order; no inference of works from presence). Supervisor-precision fixes applied: row 12 BROWSER_QA now `❌ N/A` (no real roundtrip browser QA, not PASS); row 13 EXISTS_IN_CODE now `❌` with future docs cited separately; row 3 PILOT_GAP states the actual pilot gap (no durable/pilot-safe dashboard/persistence + broken demo route) while CLINICAL_SAFETY_SEMANTICS stays the explicit-data statement. Full matrix realigned so every row carries all 12 evidence axes.
- Every finding has every required field (ID/subsystem/type/evidence/state/why/severity/timing/confidence/remediation/BLOCKS/SEPARATE_WO): ✅; **exactly one severity per finding** (F-11 is P3 for the current baseline; F-14 is `OTHER (environment)`/SKIP non-finding).
- Reviewer disagreements D1–D7 recorded with mandatory disposition and application; none silently discarded: ✅
- Audit-process PASS and independent reviewer PASS recorded: ✅
- Evaluation-ready ≠ pilot-ready maintained: ✅
- Finding counts (precise): **1× P1** (F-01); **3× P2** (F-02, F-04, F-12); **8× P3** (F-03, F-05, F-06, F-07, F-09, F-10, F-11, F-13); **2× SKIP** (F-08, F-14). No P0. One P1 blocker: BLOCKS_PHARMACY_REVIEW=YES only on F-01 (current unchanged package); F-12 BLOCKS=NO for the unchanged package.
- Report ends with exactly one verdict line and no alternative verdict token appears anywhere: ✅
- No real data/secrets; no product code change; no staged files; no commit/push/PR; the **only** Git topology/content mutation is the authorized docs branch + this one report candidate: ✅

VERDICT=FARMACIA_BASELINE_AUDIT_V1_PASS_WITH_BLOCKERS

---

## 13. Postscript post-audit — resolución P1 F-01/F-04 (Issue #288 / PR #289) — 2026-09-04

> Esta sección es **posterior y ajena a la auditoría**; no reescribe ni modifica la evidencia histórica anterior (auditada sobre `097396a1d6b995a62f9fc2499879a1271259d753`). Se añade como resolución factual registrada después de la auditoría.

- El P1 `F-01` (y su manifestación `F-04`) observado por esta auditoría fue resuelto por el **issue #288** (`WO-FH-DASHBOARD-PROMS-SHAPE-P1-01`) mediante el **PR #289**, merge publicado en recovery en `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb`.
- Issue #288: **CLOSED / completed**. PR #289: **MERGED**.
- El fix preserva el `proms` STRING legacy demo como contexto literal (`PROMs demo (contexto)`), sin convertirlo en PROMs estructurados, sin extraer DLQI/EVA/HAQ ni aplicar thresholds/interpretación clínica, y conserva el renderer estructurado actual para el `proms` ARRAY raw (sin regresión). `null`/ausente/shape desconocido → `No registrado`.
- QA pre-merge: Chromium supported-route PASS (CIP-DEMO-FH-001..004 sin pageerror, summary no vacío, sin `undefined`, raw array sin regresión; `console.error = 0`, `pageerror = 0`). QA post-merge: hosted Farmacia smoke check **#943** = `success` sobre `9fd6888b...`.
- Alcance del fix: solo `farmacia_dashboard_paciente.html` (cache-buster), `scripts/farmacia_dashboard_paciente.js`, `tools/farmacia_dashboard_paciente_check.mjs` y nuevo `tools/farmacia_dashboard_demo_proms_browser_check.mjs`. **No** modificó `previews/caceres-fh/**`.
- Snapshot `CÁCERES-REVIEW-0.4`: **NO refrozen** por #288/#289. Evaluation package / manifest / ZIP: **NO refrozen**.
- El estado publicado de la rama regional tras el merge es `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb`; la verificación documental viva de este estado se registra en `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` por la WO documental #290.

VERDICT=FARMACIA_BASELINE_AUDIT_V1_PASS_WITH_BLOCKERS
