# REUMA browser storage #621 — provisional discovery report (TXT export gate + legacy hubPendingRows)

**DRAFT / NOT APPROVED / NO RUNTIME CHANGE**

- **Work unit:** TRAIN-NEXUS-COPY-STORAGE-19 · D1 · issue #621 DISCOVERY ONLY
- **Date:** 2026-10-10
- **Route:** cost_policy=standard · risk_class=complex (Atenea C-087, `atenea-implementer-complex` writer)
- **Fixed point:** base `7a25146332d24e704f779d50a8ae7f272c8d9429` (PR #623), handoff prep `e23e676`, branch `work/nexus-copy-storage-train19-c087-complex-20261010`
- **Authority:** repo-local handoff `docs/handoffs/TRAIN_NEXUS_COPY_STORAGE_19.md` (§1, §2 #621, §3 D1, §4 NO TOCA/STOP), `AGENTS.md`, `CODING_STANDARDS.md`, `docs/ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md` (debt #620/#621). This is a **local operator handoff**, not remote GitHub approval.
- **Status of this document:** provisional research report. It is **not** an ADR, not an accepted product decision, and selects **no** minimization/migration/retention option. Every option that requires a product, privacy, retention or migration choice is marked **DECISION_REQUIRED** (hospital/local privacy ownership).
- **Evidence method:** source read-only citation of the current worktree plus read-only git archaeology for the retired legacy queue. **No** synthetic browser fixture was needed (no claim below depends on runtime behaviour that source citation cannot establish). **No** real browser storage, real CIP, SharePoint, hospital system or file was inspected. No identifiers, no secrets, no real patient data. No code, test, config or fixture was modified.

---

## 1. Exact inventory of the TXT export gate in `modules/exportManager.js`

All citations are to `modules/exportManager.js` at the fixed point `7a25146`.

### 1.1 What exists

| Element | Location (line) | What it is |
| --- | --- | --- |
| `TXT_EXPORT_GATE_PREFIX` | 1341 | `const TXT_EXPORT_GATE_PREFIX = 'HubClinico_TxtExportDone_';` — key namespace prefix for every gate marker. |
| `inferVisitTypeFromContext()` | 1343–1349 | Derives `'primera'` / `'seguimiento'` from `window.location.pathname`; `''` elsewhere. |
| `normalizeVisitType(value)` | 1351–1355 | Accepts only `'primera'` / `'seguimiento'` (trimmed, lowercased); everything else → `''`. |
| `normalizeVisitDate(value)` | 1357–1365 | Parses to ISO `YYYY-MM-DD` when parseable; otherwise returns the raw trimmed string. |
| `normalizeVisitIdentityValue(value)` | 1367–1373 | Trim → uppercase → NFD normalization → strip combining accents. |
| `buildVisitExportKey(datos, context)` | 1375–1390 | Builds the visit identity key `${cip}__${fechaVisita}__${tipoVisita}__${diagnostico}`. Returns `''` if **any** of the four components is missing (fail-closed). |
| `buildTxtGateStorageKey(visitKey)` | 1392–1394 | `TXT_EXPORT_GATE_PREFIX + visitKey`. |
| `markTxtExportDone(datos, context)` | 1396–1409 | Writes the marker (see 1.2). Returns `false` on empty key, missing `sessionStorage`, or thrown storage error (catch → `console.warn('No se pudo registrar el prerrequisito TXT→CSV:')`). |
| `hasTxtExportDone(datos, context)` | 1411–1423 | Reads the marker, `JSON.parse`, and accepts it **only if** `parsed.visitKey === visitKey` (self-consistency re-check). Returns `false` on absence, parse error or thrown storage error (catch → `console.warn('No se pudo verificar el prerrequisito TXT→CSV:')`). |
| Producer call site | 1983 (`notifyTxtGateReady`, inside `exportarTXT`, 1964–2063) | The **only** producer. `markTxtExportDone(datos)` is called without context, so CIP/fecha come from `datos` and `tipoVisita` comes from the page path via `inferVisitTypeFromContext()`. Invoked on three paths: automatic clipboard success (2010), manual-copy modal fallback (2024, immediately when the modal opens — **not** on a confirmed manual copy), and `.txt` download fallback (2050). |
| Consumer call sites | 1522 (`exportarYCopiarCSV`), 1604 (`exportarAct497`) | Both block CSV with the error `'Debe exportar TXT de esta visita antes de exportar CSV.'` when the gate is not satisfied. |
| Facade | 2215 / 2217 / 2221 | `HubTools.export.exportarYCopiarCSV`, `HubTools.export.exportarAct497`, `HubTools.export.exportarTXT`. `markTxtExportDone` / `hasTxtExportDone` are **not** exposed on the facade; deterministic oracles reach them via `vm` sandbox of the module source (see §4). |

### 1.2 Exact key/value content (the data fields present)

**Key name** (per visit): `HubClinico_TxtExportDone_<cip>__<fechaVisita>__<tipoVisita>__<diagnostico>` where

- `<cip>` — patient identifier as resolved from `ctx.cip || datos.cip || datos.idPaciente || datos.ID_Paciente || datos.id`, normalized (trim, uppercase, accent-stripped);
- `<fechaVisita>` — from `ctx.fechaVisita || datos.fechaVisita || datos.Fecha_Visita`, ISO-normalized when parseable;
- `<tipoVisita>` — `'primera'` or `'seguimiento'`;
- `<diagnostico>` — `normalizePathologyExport(ctx.diagnostico || datos.diagnosticoPrimario || datos.Diagnostico_Primario, datos)`.

**Value** (JSON string):

```json
{ "completedAt": "<ISO timestamp of the TXT export>", "visitKey": "<the same visit identity key>" }
```

Consequences, stated exactly:

1. The identity tuple (CIP + visit date + visit type + primary diagnosis) is present **twice**: once in the key name, once repeated inside the value (`visitKey`). This is the "same context is presently stored in marker value" observation of the handoff §2 #621.
2. The only additional datum is `completedAt` (ISO timestamp). **No clinical content of the TXT note and no field of the 497-column CSV row is stored.** The marker is a **gate marker** whose sole purpose is the published sequencing invariant — **TXT for this visit must precede CSV for the same visit** — not the exported clinical CSV row. The clinical payloads live only in the clipboard / download artefacts; oracles X5/X6/R3 (§4) assert that the export writes **no** other storage key.
3. The gate records "TXT export flow completed" (including modal-open and download fallback paths, §3.1); it does **not** record or verify that a durable copy of the TXT exists anywhere.

## 2. Lifetime / session / tab / origin behaviour of `sessionStorage` as used here

Factual platform semantics (standard Web Storage behaviour) applied to this code:

- **Scope:** `sessionStorage` is per-origin **and per-tab**. All Nexus pages (`primera_visita.html`, `seguimiento.html`, `dashboard_paciente.html`, all loading `modules/exportManager.js?v=20261009-export-safety-18-exportmanager-r1` — `primera_visita.html:2673`, `seguimiento.html:2342`, `dashboard_paciente.html:357`) share the same origin, so a marker written on the Primera Visita page is readable after a same-tab navigation to Seguimiento, and vice versa.
- **Lifetime:** markers survive page reloads and same-tab navigations; they are **cleared when the tab closes** (browsers may restore `sessionStorage` when a closed tab is restored through session restore — the exact restore behaviour is browser-dependent and not asserted by any repo oracle).
- **No TTL / no cleanup:** there is **no expiry, pruning or deletion call site** for gate markers anywhere in the runtime sources. Markers accumulate per visit identity within the tab session, one key per visit exported in that tab, until the tab closes.
- **Not shared across tabs/windows (with a qualified opener/duplicate-tab caveat):** for independently opened tabs, a marker written in one tab does not authorize CSV export in another tab: a clinician working in two tabs (common pattern) will hit the gate error in the second tab even after a successful TXT export in the first. **Qualification (standard Web Storage semantics, not asserted by any repo oracle):** a tab created by an opener (`window.open`/`target` with an opener relationship) can **initially inherit a copy** of the opener tab's `sessionStorage` (and some browsers' "duplicate tab" flows copy it too); each copy then evolves independently. Such an inherited tab can therefore start out **already authorized** for visits exported by the opener tab, with markers that become stale copies the moment the two tabs diverge. The claim "another tab cannot inherit authorization" would be too strong; the accurate statement is "no live cross-tab sharing, but opener-created/duplicated tabs may start from a copy".
- **Denied-storage behaviour (fail-closed on marking, with a qualified read-after-failure caveat):** if `sessionStorage.setItem` throws (privacy mode, quota, storage partitioning) or `sessionStorage` is `undefined` **and no marker was previously readable for this visit**, `markTxtExportDone` returns `false` → `notifyTxtGateReady` shows `'No se pudo registrar el estado TXT→CSV para esta visita.'` (1991–1999) → `hasTxtExportDone` is `false` → **CSV export is blocked for that visit in that tab**. **Qualification:** a failed `setItem` does **not** erase or overwrite an **existing** readable marker — `hasTxtExportDone` (`modules/exportManager.js:1411-1423`) reads and validates whatever is currently stored, so if a marker was successfully written earlier in the tab session and storage only later becomes denied (a subsequent `setItem` fails, e.g. on a re-mark attempt or a different visit), the intact earlier marker is still accepted and **CSV remains authorized** for that visit. The gate therefore fails closed **for newly marked visits** but does **not** retroactively revoke already-readable markers; "any `setItem` failure necessarily makes subsequent gate reads false" would be incorrect. Symmetrically, if storage becomes entirely unavailable (reads throwing), reading fails closed. Operational consequence: storage denial does not create a new safety exposure beyond the stale-marker surface already recorded in §3, it creates an availability block of the TXT→CSV sequence for newly marked visits.
- **Cross-visit safety:** distinct visit identities produce distinct keys, so a second visit cannot be unblocked by the first — **except** for the same-day repeat collision described in §3.2.
- **Cross-user safety:** on a shared workstation, another professional continuing in the **same tab** shares the tab's `sessionStorage` for the origin. Exposure is bounded: the leftover data is only the identity tuple + timestamp per exported visit (no clinical note, no CSV row), and a stale marker only grants CSV for the **identical** identity tuple. However, the accumulated CIP/date/pathology list is readable by any script in the tab (and via devtools) until the tab closes. Different browser profiles start clean; an independently opened tab starts clean, but an **opener-created or duplicated tab may start from a copy** of the original tab's markers (see the §2 scope caveat above), so "any fresh tab starts clean" must be read with that inheritance caveat.

## 3. Identity, collision and stale-marker surface

### 3.1 Producer/consumer context asymmetry (documentary finding, no change proposed here)

`exportarTXT` calls `markTxtExportDone(datos)` **without context** (1983): `tipoVisita` is inferred from the page path and `diagnostico` from `datos.diagnosticoPrimario`. Both CSV consumers call `hasTxtExportDone(datos, visitContext)` **with explicit context** (1518–1521, 1600–1603). On the supported journeys (PV/Seguimiento pages) both resolutions coincide; on a page whose path contains neither `primera_visita` nor `seguimiento` (e.g., Dashboard), the inferred type is `''` → the key is `''` → the gate neither marks nor reads (fail-closed). This asymmetry is a latent identity-coupling between URL shape and gate identity; it is recorded here because any future minimization WO must not silently widen it.

### 3.2 Identity collision surface of `CIP__fechaVisita__tipoVisita__diagnostico`

- **Missing-field → fail-closed:** any of the four components empty → key `''` → gate never marked/read; no false positive is possible, only a block.
- **Same-day repeat visit:** two visits of the same patient, same day, same visit type and same primary diagnosis produce the **same key**. The second visit's CSV would be authorized by the first visit's TXT marker (same tab session). This is the principal stale-marker risk of the current key design.
- **Normalization collisions:** `normalizeVisitIdentityValue` collapses case/accent variants of a CIP (intended for robustness; two genuinely distinct CIPs differing only by case/accents would collide — expected to be impossible in the CIP domain, unverified here); `normalizeVisitDate` collapses different raw spellings of the same date (intended).
- **Marker-age:** there is no freshness check. `completedAt` is written but never compared against anything. Combined with session restore, a marker could in principle outlive the working session that produced it.
- **Interaction with #620 (recorded, documentary only):** in the manual-modal path the gate is marked **immediately when the modal opens** (2024), not on a confirmed manual copy; and in the automatic path it is marked on `navigator.clipboard.writeText` resolution, which — per the accepted #620 analysis — can coexist with a false success claim from `mostrarModalTexto`. Net effect: the published invariant "TXT before CSV" is currently enforced as "TXT export **flow** completed", and a clinician can reach a state where CSV is allowed while no durable TXT copy exists. This is exactly the boundary of recorded debts #620 (copy truthfulness) and #621 (this discovery); **no code is changed here** and any change to gate semantics is a product/clinical decision (**DECISION_REQUIRED**, §6).

## 4. Existing consumers and oracles that read or assert this behaviour

### 4.1 Runtime consumers (current app)

- `modules/exportManager.js` — gate functions (§1.1), both gate checks (1522, 1604), producer (1983).
- `scripts/script_primera_visita.js:153` (`HubTools.export.exportarTXT(datos)`) and `:241` (`HubTools.export.exportarAct497(proyeccion, datos)`).
- `scripts/script_seguimiento.js:454` (`exportarTXT`) and `:551` (`exportarAct497`).
- Shared module loaded in `primera_visita.html:2673`, `seguimiento.html:2342`, `dashboard_paciente.html:357` (Dashboard consumes the shared module; the supported TXT→CSV journeys are Primera Visita and Seguimiento).

### 4.2 Deterministic checkers (`tools/*.mjs`, all wired into `verify:nexus` via `package.json`)

- `tools/reuma_act_cutover_check.mjs` — X3 (module is queue-free and keeps `hasTxtExportDone` in both export entry regions; lines 334–338, 389), gate seeding via sandbox `markTxtExportDone` before `exportarAct497` probes (476, 596), a reimplemented gate in the planted-good witness (810, 829), and the planted **negative witnesses** X-f (a module that drops or renames the gate check — 875–882 — must fail the X family).
- `tools/reuma_export_boundary_check.mjs` — seeds the real gate through the production `markTxtExportDone` before boundary/export probes (298, 316).
- `tools/reuma_pending_retirement_check.mjs` — seeds the production gate (246–253), asserts the gate call remains (393), asserts **A1** no `hubPendingRows`/queue tokens in runtime sources (310–316) and **E2** legacy `hubPendingRows` content is neither read nor cleared by a delivery (546–565, sentinel preserved byte-unchanged).

### 4.3 Browser checkers (supported interaction, synthetic/demo data)

- `tools/reuma_export_boundary_browser_check.mjs` — supported fills and clicks of `#btnExportarTXT` then the CSV button on both pages; **X5/X6**: the export writes no new storage key and the controlled legacy `hubPendingRows` TEST sentinel stays byte-unchanged (541–543, 593–595); **X8** static: the TXT-gate error message stays in both `exportarYCopiarCSV` and `exportarAct497` (419–421); **X7**: CSV without prior TXT shows the gate alert with no checklist and no new pageerror (612–632).
- `tools/reuma_pending_retirement_browser_check.mjs` — **R1** happy path (TXT → CSV 497) with the gate seeded by the real supported click of `#btnExportarTXT` (281–289); **R3** TXT-gate negative: gate alert, no checklist, **no storage write**, pageerror=0 (623–647); **R5** clipboard rejection armed after the TXT step.
- `tools/reuma_act_cutover_browser_check.mjs` — supported TXT-then-CSV journey per pathology in the cutover route (295–312).

Reading rule respected: these oracles exercise and protect the gate; none of them pins the **value shape** of the marker beyond the `visitKey` self-consistency inside `hasTxtExportDone`, which means value-minimization options (§5) would be code+oracle changes, not oracle-only changes.

## 5. Legacy `hubPendingRows` in `localStorage`

- **Retirement:** the pending-rows recovery queue was retired by #618/PR #619 (train-18 commit `197135f` "retire pending-rows queue and events from the export transport", per `docs/ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md` §3.2 #587 and §89/§147). The current runtime sources contain **zero** reads, writes, clears or events for `hubPendingRows` — asserted by oracle A1 (`tools/reuma_pending_retirement_check.mjs:310–316`).
- **Current app behaviour toward historical entries:** the current app **neither reads nor clears** any historical `hubPendingRows` entry. Oracle **E2** pins this: with a legacy sentinel planted, a supported delivery leaves it byte-unchanged; browser **X5** pins that the sentinel stays unchanged on the Primera Visita journey. Per the handoff, **no sweeping, deleting or migrating** of old data is performed or proposed as an implementation here.
- **What legacy entries could contain (read-only git archaeology):** at the last pre-retirement state examined (`71bf5f8:modules/exportManager.js`, lines 922–969), the queue was: `PENDING_ROWS_KEY='hubPendingRows'`, a `localStorage` JSON array, pruned to 24 h (`PENDING_ROWS_MAX_AGE_MS`) and 20 rows, entries carrying `id`/`createdAt` plus an arbitrary `payload` passed to `addPendingRow(payload)`. Notably, at that commit `addPendingRow` had **no producer call site** inside `exportManager`; the consumer surface was the recovery indicator in `script.js` (`retryPendingRowCopy`, `pendingRowsUpdated` listener). The ledger records the queue as defective (missing timestamp → recursion) before its retirement.
- **Verdict:** whether **any real entry exists on any real machine is UNVERIFIED** and is not established by this report. If entries exist, they would predate the retirement and could contain queued export payloads — that potential content is a privacy/retention question, not a demonstrated live defect. **No real browser storage was inspected.**

## 6. Minimization / migration / retention OPTIONS — compared, NONE chosen

> Every option below is presented for comparison only. **None is selected.** Options marked **DECISION_REQUIRED** require hospital/local privacy ownership (product, privacy, retention or migration choice). None of them may become an assumed implementation.

### 6.1 TXT gate marker (sessionStorage)

| # | Option | Safety | Compatibility | Effort | Decision class |
| --- | --- | --- | --- | --- | --- |
| A | **Status quo** — keep key + value as-is | Gate invariant preserved; identity tuple in storage per tab session; no TTL | Zero risk; all oracles unchanged | None | Baseline; no decision needed to keep |
| B | **Value minimization** — stop duplicating `visitKey` inside the value (keep `completedAt`, or an empty/opaque value), adjusting the `hasTxtExportDone` self-check accordingly | Removes one of the two copies of the identity tuple; gate semantics unchanged | Requires touching `markTxtExportDone`/`hasTxtExportDone` (protected code, NO TOCA) and focused oracle updates; key contract unchanged | Small code + small focused oracle change | **DECISION_REQUIRED** (data-minimization policy for the identity tuple in browser storage) |
| C | **Pseudonymized key** — store a hash of the identity tuple instead of the raw `CIP__fecha...` key | Strongest minimization; identity no longer readable from storage | Key contract change; loses human debuggability; hash-collision handling needed; new semantics | Medium code + oracle changes | **DECISION_REQUIRED** (privacy architecture; also new representation semantics — explicitly out of this unit's authority) |
| D | **Retention/TTL** — e.g., `hasTxtExportDone` rejects markers older than N (using `completedAt`) | Bounds stale-marker risk (§3.2 same-day repeat) | Changes the published sequencing invariant: an expired-but-real TXT would re-block CSV; clock-sensitivity | Small–medium code + oracles | **DECISION_REQUIRED** (clinical/operational semantics of the gate; what "this visit" means) |
| E | **In-memory gate only** (module-level Map, no storage) | Nothing persisted at all | Gate no longer survives reload within the tab: reload after TXT re-blocks CSV; weaker operational invariant | Small code, but semantics change | **DECISION_REQUIRED** (product decision on reload behaviour) |
| F | **Gate marked only on confirmed copy** (tie marking to truthful copy outcome, #620 follow-on) | Strengthens the invariant to "durable TXT exists" | Depends on the #620 correction being published first; changes modal-path marking (2024) | Small–medium, **after** #620 | **DECISION_REQUIRED** (product/clinical: what the gate actually attests) |

### 6.2 Legacy `hubPendingRows` (localStorage)

| # | Option | Safety | Compatibility | Effort | Decision class |
| --- | --- | --- | --- | --- | --- |
| G | **Leave untouched** (current behaviour) | Zero risk of destroying data without authority; oracle E2/X5 semantics preserved | Perfect | None | Baseline; consistent with #618 retirement |
| H | **One-time opt-in cleanup** (e.g., a hospital-authorized manual step or future bounded WO that deletes historical entries) | Removes unverified historical payloads from real machines | Must not reuse the old key name in a conflicting way; oracles E2/X5 use a controlled TEST sentinel and would need explicit re-scoping | Small, but touching deletion of user-side data | **DECISION_REQUIRED** (privacy/retention ownership; data deletion on real machines is explicitly outside this unit) |
| I | **Migrate/ingest legacy entries** | Not applicable: recovery is **retired**, not replaced (ledger §89/§147); ingestion would resurrect withdrawn behaviour | Contradicts published #618 decision | — | **Not proposed.** Recorded only to state it is excluded |

## 7. Risks

- **Stale markers:** same-day same-identity repeat visit reuses the first visit's marker (§3.2); markers with no TTL persist for the whole tab session; session restore may extend that; marker set on modal-open can authorize CSV without a durable TXT (interaction with #620, §3.2).
- **Availability (not safety):** denied `sessionStorage` blocks the whole TXT→CSV sequence fail-closed (§2); the CSV side cannot be reached in a second tab (per-tab scope).
- **Identity in storage:** the accumulated per-tab marker set exposes CIP + visit date + visit type + diagnosis (twice: key name and value) to any script in the tab until tab close. No clinical note or CSV row is stored.
- **Risks of legacy cleanup:** deleting historical `hubPendingRows` without explicit hospital authority would repeat the pre-#619 failure mode where a delivery **overwrote** legacy content (old E1/E2 oracle family documents that overwriting destroyed history); oracle sentinels (E2, X5) currently assume untouched legacy data. Any cleanup is a privacy/retention decision first, code second.

## 8. DECISION_REQUIRED — explicit list (no choice made by this report)

1. **Marker value minimization** (Option B): whether the duplicated identity tuple must be removed from the marker value — data-minimization policy, hospital/local privacy ownership.
2. **Marker key pseudonymization** (Option C): whether the identity tuple may leave the key name in raw form — privacy architecture and new representation semantics.
3. **Marker retention/TTL** (Option D): whether and when a TXT marker expires — clinical/operational semantics of "this visit".
4. **Gate attestation semantics** (Option F): whether the gate may be marked on modal-open/download or only on a confirmed truthful copy — product/clinical decision, dependent on #620.
5. **Legacy `hubPendingRows` retention or cleanup** (Option G vs H): whether unverified historical entries on real machines are left untouched or cleaned under hospital authority — privacy/retention ownership; data deletion on real machines.
6. **Same-day repeat-visit collision** (§3.2): whether the identity key must distinguish two same-day visits of the same patient/type/pathology — clinical/operational decision.

## 9. HUMAN STOP evaluation

- **No HUMAN STOP condition was triggered.** No NEW immediate active clinical exposure inside the #620 scope was demonstrated: the copy-truthfulness flaw is the already-accepted #620 scope, and the gate-marking/sequencing observations of §3 are the recorded subject matter of #621 itself (the TXT content was always presented to the clinician for copying; what the gate attests is the sequencing question under discovery). All unanswered privacy/retention policy is recorded above as DECISION_REQUIRED and the report is finished, per handoff §3 D1.
- No protected file was modified; no storage was mutated outside this report's text; no real browser storage, CIP, SharePoint or hospital system was inspected.

## 10. Proposal for ONE later bounded work order (proposal only — requires its own authority)

**WO-REUMA-TXT-GATE-MARKER-MIN (proposed, not authorized).** After decisions 1/3/4 above are taken by the hospital/local privacy owner: a single bounded WO that (a) implements the chosen marker shape/retention in `markTxtExportDone`/`hasTxtExportDone` only, (b) updates the focused oracles that seed or assert the gate (`reuma_act_cutover_check.mjs`, `reuma_export_boundary_check.mjs`, `reuma_pending_retirement_check.mjs` and the three browser checkers), (c) adds one negative witness that a minimized/tampered marker fails `hasTxtExportDone`, and (d) explicitly **excludes** legacy `hubPendingRows` handling (Option H, if ever chosen, is its own separately authorized WO). Nothing in that WO touches the 497 layout, clipboard paths, or CSV projection.

## 11. Evidence index

- Source read-only: `modules/exportManager.js` lines 1341–1423 (gate), 1505–1578 and 1591–1616 (gate consumers), 1964–2063 (producer paths), 2215–2221 (facade); `scripts/script_primera_visita.js:153,241`; `scripts/script_seguimiento.js:454,551`; `primera_visita.html:2673`, `seguimiento.html:2342`, `dashboard_paciente.html:357`.
- Oracles: `tools/reuma_act_cutover_check.mjs`, `tools/reuma_export_boundary_check.mjs`, `tools/reuma_pending_retirement_check.mjs`, `tools/reuma_export_boundary_browser_check.mjs`, `tools/reuma_pending_retirement_browser_check.mjs`, `tools/reuma_act_cutover_browser_check.mjs`; `package.json` `verify:nexus` wiring.
- Read-only git archaeology (legacy queue shape): `git show 71bf5f8:modules/exportManager.js` (lines ~922–969); retirement commit `197135f` (train 18).
- Synthetic browser fixture: **not used** — every claim above is established by source citation or read-only git history; no runtime claim in this report depends on fixture evidence.
- Authority: `docs/handoffs/TRAIN_NEXUS_COPY_STORAGE_19.md` §1/§2/§3/§4; `AGENTS.md`; `CODING_STANDARDS.md`; `docs/ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md` (rows/notes for #618/#619/#620/#621 and #587).

*End of provisional discovery report. Not approved; selects nothing; no runtime change.*
