# Feature tasks — fh-v6-sheet-resolution-native-gentle-20260921

WO: atomic WO resolving FH-DEBT-002 + FH-DEBT-003 (docs/ops/FARMACIA_DEBT_REGISTER.md).
Authority: recovery/farmacia-pr-replay-20260727 base 92c378b858fc13730130c1e0c8f5bc6d2fd685b9.
Worktree: work/fh-v6-sheet-resolution-native-gentle-20260921.
Boundary: no push/PR/merge/remote mutation; debt stays OPEN (candidate unpublished); no FH-DEBT-001, no UI, no unrelated cleanup.

## Frozen acceptance contract (oracle = tools/farmacia_v6_sheet_resolution_check.mjs)

Derived only from the debt register closure criteria (FH-DEBT-002 / FH-DEBT-003):

1. New API `FarmaciaDemo.resolveEnfermeriaV6ClinicalSheets(workbook)`: resolves physical
   sheet names once to the three canonical services.
   - Closed alias policy: a physical sheet is a v6 clinical sheet iff its
     `enfermeriaV6Token(name)` equals the token of a canonical service name
     (case/accent/whitespace/punctuation normalization only; no substring,
     prefix/suffix or fuzzy matching).
   - Success: `{ ok: true, sheets: { 'DERMATOLOGÍA': <physical>, 'REUMATOLOGÍA': <physical>, 'DIGESTIVO': <physical> } }`.
   - Two physical sheets collapsing to one service → `{ ok: false, status: 'ambiguous', reason }`.
   - A service without physical sheet → `{ ok: false, status: 'incomplete', reason }`.
2. `isEnfermeriaV6Workbook` reuses the same single resolution (detection = resolution).
3. `parseWorkbook('enfermeria', …)`:
   - `ok` → v6 branch reads each service through the resolved physical name (no
     canonical-exact `workbook.Sheets[...]` lookup).
   - `ambiguous` → fail-closed throw naming the service and colliding sheet names.
   - `incomplete` → fall through to legacy branches exactly as today.
4. Tests: supported accent/space/punctuation variants per service (resolver + end-to-end
   parseWorkbook equality with canonical parse); duplicate/ambiguous alias rejection
   (resolver status + detection false + parseWorkbook throw); legacy INICIO_BIOLOGICO
   and canonical-name workbooks unchanged.

## Tasks

- [x] T1 Read authority docs (INDEX, WO status, debt register, CODING_STANDARDS, AGENTS).
- [x] T2 Explore seam: `isEnfermeriaV6Workbook` / `enfermeriaV6Token` / `parseWorkbook`
      split-brain confirmed (scripts/farmacia_common.js ~840-960, ~1000-1130, ~2431-2445).
- [x] T3 Freeze acceptance oracle `tools/farmacia_v6_sheet_resolution_check.mjs`; run RED.
- [ ] T4 Implement single-resolution mapping in scripts/farmacia_common.js (delegated
      writer, surface = scripts/farmacia_common.js only); run oracle GREEN + regression suites.
- [ ] T5 Deterministic suites (v6 import, common, validacion/enfermeria imports,
      reconciliation, persistence) + documented justification for browser scope.
- [ ] T6 Work-unit commit(s) on feature branch (Conventional Commits).
- [ ] T7 Native Gentle RDD review through approved + acknowledgement/burn.
- [ ] T8 Close: report SHA, tests, lineage/outcome, remaining concerns. Debt register
      stays OPEN (no publication).
