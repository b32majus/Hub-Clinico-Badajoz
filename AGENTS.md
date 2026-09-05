# AGENTS.md — Hub Clínico Badajoz / PROMueve Extremadura

## Authority and operating mode

This repository is a clinical product. Safety, functional coherence and assistive usefulness outrank aesthetics, speed or speculative expansion.

Before diagnosing, implementing, reviewing or changing status:
1. Verify current GitHub issue/branch/HEAD/PR/merge state.
2. Read `docs/INDEX.md`.
3. Read `docs/ops/WORK_ORDER_STATUS.md`.
4. Read the current live spec/audit/plan linked from those documents.
5. Treat library, Engram and conversational memory as auxiliary evidence only.

Truth order: current approved WO/instruction → published GitHub code/docs → `docs/INDEX.md` → `docs/ops/WORK_ORDER_STATUS.md` → latest related live document → auxiliary memory.

Do not use remembered SHAs, branches, priorities or PR states as authority.

## Execution architecture

The accepted unattended path is:

`human authorization → human or Cora/DC mechanical launch → plain Pi supervisor → Herdr → separate Pi + Gentle Pi implementation worker → Gentle native RDD → ordinary repository delivery`

The supervisor is non-implementing, runs without Gentle Pi, and is event-driven through pi-intercom. It does not own or invoke the Gentle lifecycle, review mode, provider transitions, acknowledgement/burn or implementation. The separate Pi + Gentle Pi worker owns implementation and the full Gentle/RDD lifecycle. OpenCode is retained only as a historical/alternative runtime, not as a dependency of the normal unattended path.

For normal execution, dispatch from the current issue/spec rather than rewriting them into a second Agent Brief. Keep operator prompts bounded. Do not introduce SDD, custom runners, daemons, launchers, headless controllers or new orchestration layers unless explicitly requested.

Project `AGENTS.md` and `CODING_STANDARDS.md` must be read before product write; bounded writers must receive the applicable project constraints in their handoff. Runtime model routing is operational configuration, not repository truth. Verify effective models when it matters; do not hard-code provider/model assumptions in this file.

## Engineering standards

Read `CODING_STANDARDS.md` before code changes. Repository standards supplement the active Atenea harness contract and current WO.

For semantic/domain/clinical/parser/state-transition work, the principal acceptance oracle must be derived from accepted authority and frozen before the implementation context receives write authority. The builder may run the oracle but must not weaken or replace it. Material oracle changes return the work to shaping/re-freeze.

Use fresh independent context where independence matters: oracle author, implementation worker and semantic/spec-compliance review must not inherit each other's reasoning transcript.

Passing tests is evidence, not proof of product correctness. Oracles must be able to disagree with implementation.

## Clinical safety — Farmacia Hospitalaria

Never infer from drug name, CIMA, catalogue, prior treatment, label, tray or missing data:
- dose, route, schedule, presentation, induction or duration;
- renewal, switch or add-on;
- causality, validation outcome or therapeutic line.

The catalogue may identify/select; it does not decide therapeutic data. Requested treatment is not validated treatment. Prior treatment is not a new initiation. Missing data stays blank/unknown/pending.

Do not introduce real patient data, identifiers, clinical exports, secrets or credentials into repositories, commits or external tools. Use synthetic/demo data unless an explicitly authorized environment says otherwise.

## Git and delivery

- Never edit `main` directly without explicit authorization.
- Verify repo, branch, HEAD and worktree before writing.
- Work in an isolated branch/worktree.
- Preserve unrelated/unknown changes; no broad reset, clean, restore or destructive cleanup.
- No force-push, hidden rebase/history rewrite, branch/worktree deletion or merge unless explicitly authorized.
- A local commit is not published.
- Push, PR, issue mutation and merge require the current authorization boundary.
- Before publication, revalidate the current GitHub authority and exact candidate SHA.

## Work orders

Every modification is executed as an atomic WO. Keep objective, base, preflight, rollback, scope/NO TOCA, verification/QA, acceptance criteria, delivery boundary and final report explicit enough that the task is auditable without recovering the original chat.

Do not combine urgent clinical fixes with broad refactors, future architecture, aesthetics or unrelated documentation cleanup.

Near a demo/delivery: fix P0, close essential P1, document remaining debt, avoid broad refactors.

## QA and acceptance

Distinguish:
- exists in code;
- wired;
- visible;
- works through supported interaction;
- published on the correct branch;
- demo-ready;
- pilot-ready;
- future-product-ready.

For UI work, supported browser interaction is required where the WO calls for it. DOM manipulation, changing readonly state, impossible fixtures or unsupported routes do not demonstrate a fix.

Where relevant verify loading/navigation, supported interaction, persistence/restoration, empty states, console/page errors, synthetic fail-safe behavior, cache/versioning and published branch identity.

Tests green != manual/browser QA green.

## Review/runtime failure policy

A provider/runtime/reviewer transport failure consumes zero product repairs. Follow the exact provider-issued recovery/status transition. If the same exact reviewer slot is reoffered after one bounded retry and fails again without authority progress, STOP and report. Never loop indefinitely, fabricate PASS, drop a required lens or mutate product code to compensate for transport.

A semantic/spec-compliance reviewer must fail closed on material issue/spec/oracle contradictions. It may not silently choose which authority probably meant what.

## Documentation and memory

When a WO, product decision or accepted checkpoint changes real project state, reconcile `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` and the affected live document within scope or through a separate documentation WO.

Engram is auxiliary experiential memory. Save stable lessons, defect patterns and qualification outcomes; do not treat current HEAD, branch, PR state, execution frontier or temporary priority as durable truth. Revalidate memory against GitHub/repository authority before reuse.

## Product horizon

V4: local-first, backend-ready, usable progressively for real pilot when explicitly qualified.
V5: configurable agnostic hub by service/pathology/visit/role/form/clinical variable.

Do not mix V5 expansion into urgent V4 demo/pilot repairs.
