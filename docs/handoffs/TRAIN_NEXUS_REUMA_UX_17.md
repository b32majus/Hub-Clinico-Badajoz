# TRAIN-NEXUS-REUMA-UX-CLOSEOUT-17 — Execution handoff

**State:** READY_TO_LAUNCH · GitHub issue [#614](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/614) · Atenea C-087

## Identity and fixed point

- Repository: `b32majus/Hub-Clinico-Badajoz`.
- Published canonical base: `promueve/nexus-v4@8d560511f8d499ca6a37ceefbbe7e0a89728db72` (PR #609 documentation merge).
- Prepared worktree: `/srv/kairos-lab/worktrees/promueve-nexus-reuma-ux-train17-614-20261009`.
- Prepared branch: `work/nexus-reuma-ux-train17-614-c087-volume-20261009`.
- Local preparation commit containing this handoff is **NOT PUBLISHED**. The child graph must descend from it; canonical base stays the SHA above.
- `cost_policy=standard`, `risk_class=volume`. Visible primary agent: `atenea-volume` in the **existing persistent Herdr OpenCode 2.0.22**. Standard Volume coordinator MiMo 2.6; writer `nan/deepseek-v4-flash`; Standards `gpt-6-luna high`; Spec `gpt-6-luna high`. No silent fallbacks.
- **Human launches.** Stop after local reviewed final candidate; do **not** push, open PR, merge, close issues, alter Pages or delete worktree.

## Accepted outcome / authority

Close only the **already-decided** Reuma UX ledger findings §3.2 item 2 (compact dates / discrete chips), item 9 (DAPSA category feedback) and pending portion of item 16 (redundant `Buscar en tabla`). Product source: `docs/ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md`, plus `docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md` §§6–7. This is not a new clinical product decision, generic form-builder, or re-opening of the completed manual audit.

Before execution verify GitHub live, `AGENTS.md`, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, `docs/ATENEA_EXECUTION_ROUTING_V0.md`, `CODING_STANDARDS.md`. C-087 external source `b32majus/Atenea/main` has `docs/START_HERE.md`, `docs/PRE_EXECUTION_HARDENING_V1.md`, `docs/ATENEA_EXECUTION_ROUTING_V0.md`; do not substitute V1, Gentle or Pi.

## Four accepted slices — sequential, atomic, commit locally only

### T1 — #610 Dates

**WHAT:** Make already-existing PV and Seguimiento `input[type=date]` visually compact on desktop and responsive on small screens; preserve native control and all dates/IDs/readonly. No change of date parsing, timezone, export, state or count of fields.

**WHERE:** `primera_visita.html`, `seguimiento.html`, `style_primera_visita.css`, `style_seguimiento.css`. Existing generic CSS `.form-group input[type=date]` has `width:100%`. Target with local scoped selectors/classes, not global style drift.

**PROOF:** Supported browser selection, visit/next-review dates and readonly treatment-start remain legible; desktop/mobile sizing, no clipping or page overflow, unchanged values on export. **STOP:** unexpected data semantics or broad CSS seam needed.

### T2 — #611 Chips

**WHAT:** Accessible chip controls for exactly four PV fields, with their original `select` as the sole data authority. `dolorAxial`: blank / inflamatorio / mecanico / mixto. `rigidezMatutina`: blank / si / no. `irradiacionNalgas`: blank / no / dcha / izq / ambas. `maniobrasSacroiliacas`: blank / positivas / negativas / dudosas. Empty/unknown must not be interpreted as No. Labels and export mappings remain unchanged. Keep the conditional `duracionRigidezContainer`.

**WHERE:** `primera_visita.html`, local PV CSS, `modules/formController.js` if required. `modules/customSelect.js` contains these four IDs in its selector whitelist AND has a `data-no-custom-select=true` opt-out: use a local opt-out to prevent a duplicate visible decorated dropdown rather than rewriting shared helper. No extra polling; #570 discovery is out of scope.

**PROOF:** Real mouse/keyboard chips and restore of saved synthetic form state; visible single control; `input/change` semantic parity, no lost optionality, pathology switching EspA/APs, conditional rigidity minutes, disabled/focus, export exact values. **STOP:** need to change shared select behavior for unrelated controls, impossible restoration, new options/clinical inference.

### T3 — #612 DAPSA

**WHAT:** Accessible, clear textual + visual feedback by existing category for DAPSA, on PV & Seguimiento **APs only**. Do not calculate anew or change cutoffs/PCR units; preserve `Incompleto`/unknown as neutral. No color-only meaning or therapy recommendation.

**WHERE:** Existing `#dapsaResult` readonly + `#dapsaCategoria` spans in both HTMLs, `modules/formController.js` `recalcularDAPSA()` / `applyScoreCategory`; `modules/scoreCalculators.js` is read-only for this slice. Current helper already sets a color and category label; first verify supported UX and improve clarity rather than claim missing code.

**PROOF:** Current vs new PV/Seguimiento APs browser categories, missing input neutral, updates from real source fields, score/export unchanged, other indices/pathologies unaffected. **STOP:** any disputed threshold/category demands new clinical authority.

### T4 — #613 Estadísticas

**WHAT:** Remove redundant visible local `#tableSearchInput` from Reuma statistics; keep formal filters, sorting, pagination and `HubTools.export.exportCohortToCSV(currentCohort)` exactly as published.

**WHERE:** `estadisticas.html` control alongside `#exportCohortBtn`; `scripts/script_estadisticas.js` `initializeTableControls` and optional local `filterTableBySearch` only after proving no public consumer. Reuse `tools/reuma_estadisticas_csv_filtered_cohort_check.mjs` and browser companion.

**PROOF:** No search UI or layout gap; formal filter → `currentCohort` → real CSV remains invariant when total > filtered, at zero results, and after sorting/pagination. No console/pageerror. **STOP:** local search helper turns out to be supported external API.

## C-087 review and fidelity gates

- **Gate 2 representation narrowing** active for four select→chip presentations: preserve full set of actual HTML option values, blank, unknown, disabled, ordering as relevant.
- **Gate 3 affected surface** only if shared helper(s) actually modified: follow PV+Seguimiento/other supported consumers concretely implicated; no unbounded audit.
- **Gate 4 composed-product checkpoint** with Cora after integration, before publication; a human may approve/reject UI outcome.
- Matts's upstream `/implement-spec` graph applies to accepted tasks #610 → #611 → #612 → #613. Coordinator owns one canonical Standards + Spec integration review anchored to final fixed candidate; writer closes before review; findings to fresh correctors; at most 2 finding-scoped corrections.
- Writer tests stay focused; broad `npm run verify:nexus` / full browser at integration or publication only when justified. Never use DOM manipulation, altered readonly or fake impossible form state as QA. No patient information in source, fixtures, logs or external tools.

## NO TOCA

No Reuma baseline handling (#15), no PCR site defaults (#4), no BASFI (source blocked), no #587 row recovery/persistence, #577 Bridge, #570 polling rewrite, #450 legacy drug search, no score/cutoff formulas or new clinical semantics, no Excel/Pharmacy/Derma architecture, no V5/F4.5/F4.6, no changes to `main`, recovery, Cáceres snapshots, Pages configuration or secrets.

## Final report, reversibility and publication guard

Four distinct local slice commits if feasible, plus this prep handoff; report exact ancestry BASE→PREP→T1→T2→T3→T4→reviewed candidate, changed paths, focused tests and browser QA (including negative witnesses and any `KNOWN_PREEXISTING`), review verdicts, corrections, `git diff --check`, current worktree/branch, what is **not** demonstrated. Preserve unrelated work. Reversal by ordinary scoped `git revert` of own commits, never force-push/reset/clean or delete worktrees. Neither reviewer PASS nor local commit authorizes push, PR, merge or issue closures. Only update INDEX/WOS/ledger after a publication is actually approved and merged, in separately authorized documentation scope when necessary.
