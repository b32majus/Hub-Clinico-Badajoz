# AGENTS.md — Hub Clínico Badajoz / PROMueve Extremadura

## Authority and operating mode

This repository is a clinical product. Safety, functional coherence and assistive usefulness outrank aesthetics, speed or speculative expansion.

Before diagnosing, implementing, reviewing or changing status:
1. Verify current GitHub issue/branch/HEAD/PR/merge state.
2. Read `docs/INDEX.md`.
3. Read `docs/ops/WORK_ORDER_STATUS.md`.
4. Read the current live spec/audit/plan linked from those documents.
5. Treat library, Engram and conversational memory as auxiliary evidence only.

Truth order: current accepted issue / WO / spec / explicit instruction → published GitHub code/docs → `docs/INDEX.md` → `docs/ops/WORK_ORDER_STATUS.md` → latest related live document → auxiliary memory.

Do not use remembered SHAs, branches, priorities or PR states as authority.

## Execution architecture

Current execution follows **Atenea C-085**: C-084 remains the native OpenCode V2 runtime/lifecycle baseline, while C-085 is the current standard writer/context-economy amendment. Project-local `atenea-volume` remains the default standard primary; `atenea-complex` is selected when current accepted authority exposes a material complex-risk trigger. Explicit human-selected cost policies such as `go` are independent from `Risk class: volume|complex`; when `Cost policy: go` is authorized, select the project-local `atenea-go` primary and keep the risk class explicit in the handoff. Herdr is the already-running, user-owned persistent operator surface; workers must not launch, restart, replace or stop it. Normal visible execution enters the existing Herdr project/worktree pane and runs `opencode .`.

Global OpenCode configuration supplies provider/runtime capability only. Routing remains project-local in `opencode.json` and `.opencode/agents/`; do not use `--pure`, which belongs to the superseded V1 runtime contract. No cost policy may silently infer a provider/model fallback from quota, availability or convenience. If an explicitly bound model is unavailable, quota-blocked, removed or materially incapable inside an active work unit, STOP at a clean boundary and return the decision to Cora + human.

Under C-085 standard cost, `volume` writes on `nan/deepseek-v4-flash` and `complex` writes on `nan/glm5.3-flash#high`. This split is fixed at the clean work-unit boundary, not a quota router. Standard implementers should use tools economically and rely on compaction/context-economy policy from current Atenea, but no required test, review or evidence may be weakened to save tokens.

Matt Pocock's upstream skills own implementation/task-graph/TDD/code-review/worktree methodology when invoked. PROMueve does not fork or restate those workflows. Project-local `opencode.json` and `.opencode/agents/` bind Matt roles to the current C-085 models; current role/risk/cost-policy semantics remain governed by `b32majus/Atenea` starting at `docs/START_HERE.md`, with any project-local binding snapshot treated as implementation of that external authority rather than a competing policy.

PROMueve owns product, clinical, architecture, engineering, QA, documentation and delivery constraints. Execute from the current durable issue/spec/instruction rather than rewriting already-executable authority into a second brief or workcard. Material shaping is attended work between Cora + human before implementation: agents may gather bounded evidence but must not decide unresolved product behavior, scope, architecture, privacy/security posture, clinical/data semantics or acceptance. A new material product question or material product-fidelity drift during execution is a HUMAN STOP, not an invitation for an agent to infer intent.

**Representation narrowing is product-semantic authority, not a local implementation mechanic.** When accepted semantics are translated into UI controls, forms, adapters, schemas, persistence/export shapes or other representations, preserve the distinctions that accepted authority requires. Do not silently collapse precision/granularity, cardinality, valid ranges, states/vocabulary, combinations, ordering, optional/unknown distinctions or temporal precision/timezone semantics. This does not require exposing internal-only richness. If a material narrowing is not explicitly authorized, HUMAN STOP to Cora + human.

**Functional blast radius is behavioral, not file-based.** When source tracing or implementation reveals that a changed shared helper/generator/mapper/serializer/state authority has additional supported consumers, or that a newly discovered invariant has sibling branches, trace those materially affected paths. A zero-diff consumer is not automatically unaffected, and `NO TOCA` does not mean “its file was not edited”. Do not silently change or leave unqualified a supported surface outside the execution/evidence envelope. If a material downstream consumer or sibling invariant is outside current authority, HUMAN STOP to Cora + human rather than broadening scope; reviewers/correctors must likewise report the new issue instead of absorbing it into an old envelope.

C-077–C-084, Gentle/Pi/RDD/4R/lineage/burn/review-host/OpenCode V1 material remains historical provenance only. C-084 remains the native OpenCode V2 runtime/lifecycle baseline; C-085 is the current narrow routing/context-economy amendment, and C-083's V1 qualification / `--pure` launch boundary remain superseded. Do not follow historical material as current execution authority. Review start closes the original implementer's write phase. C-085 permits at most **two fresh, finding-scoped correction attempts for the same already-authorized finding envelope**; correction #2 is allowed only when focused evidence shows the same authorized finding(s) remain after correction #1. A new material finding, scope expansion or blocker remaining after correction #2 is a HUMAN STOP. No fix/review carousel.

Project `AGENTS.md` and `CODING_STANDARDS.md` must be read before product write; their applicable constraints remain binding regardless of the external harness.

Assurance is proportional: repository tests/oracles/type/syntax/build/artifact validators come first; Semgrep and deep OCR are conditional on material risk. Cora audits integrated material feature/train/PR candidates before merge when warranted. Review evidence never grants publication authority.

## Engineering standards

Read `CODING_STANDARDS.md` before code changes. Repository standards and the current accepted task authority are the repo-local engineering authority; they do not define a second runtime lifecycle.

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

## Execution authority

Every modification must have one durable accepted execution authority: an issue, WO, spec or explicit bounded instruction. Do not manufacture a second WO when the current authority is already executable. When a WO is used, keep objective, base, preflight, rollback, scope/NO TOCA, verification/QA, acceptance criteria, delivery boundary and final report explicit enough that the task is auditable without recovering the original chat.

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

For UI work, supported browser interaction is required where the accepted task calls for it. DOM manipulation, changing readonly state, impossible fixtures or unsupported routes do not demonstrate a fix.

Where relevant verify loading/navigation, supported interaction, persistence/restoration, empty states, console/page errors, synthetic fail-safe behavior, cache/versioning and published branch identity.

Tests green != manual/browser QA green.

## Review/runtime failure policy

A provider/runtime/reviewer transport failure consumes zero product repairs. It does not authorize product-code changes, fabricated PASS, dropped required review evidence, widened scope or indefinite retry loops. Follow the current Atenea/runtime recovery authority; if it cannot make authoritative progress, STOP and report.

A semantic/spec-compliance reviewer must fail closed on material issue/spec/oracle contradictions. It may not silently choose which authority probably meant what.

## Documentation and memory

The product documentation and handover standard is `docs/engineering/PRODUCT_DOCUMENTATION_STANDARD.md`; the project-local skill `promueve-product-documentation` helps apply it. Material product/engineering changes must evaluate documentation impact and reconcile affected live documents within scope or through a separate documentation task.

When an accepted issue/WO/spec, product decision or accepted checkpoint changes real project state, reconcile `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` and the affected live document within scope or through a separate documentation task.

Engram is auxiliary experiential memory. Save stable lessons, defect patterns and qualification outcomes; do not treat current HEAD, branch, PR state, execution frontier or temporary priority as durable truth. Revalidate memory against GitHub/repository authority before reuse.

## Agent skills metadata

GitHub is the issue/spec tracker; see `docs/agents/issue-tracker.md`. Matt triage vocabulary mapping is in `docs/agents/triage-labels.md`. Domain-document discovery for this multi-domain clinical repo is in `docs/agents/domain.md`. These files configure upstream skills; they do not replace PROMueve product authority or publication rules.

Upstream Matt skills are project-local and tracked by `skills-lock.json`. Update them only through the owner-supported `npx skills update --project` path; do not hand-fork upstream skill content. PROMueve-specific skills remain additional local context.

## Project-local skills

Project-specific skills live in `.agents/skills/` and contain domain/UI/QA/documentation context only. They do not define execution lifecycle, model routing, review orchestration or transport; the current Atenea contract governs that external harness boundary.

- `promueve-farmacia-context` — Farmacia authority and clinical boundaries.
- `promueve-vanilla-ui` — current vanilla UI constraints.
- `promueve-visual-qa` — supported browser/visual QA conventions.
- `promueve-product-documentation` — applies the product documentation & handover standard; normative authority stays in `docs/engineering/PRODUCT_DOCUMENTATION_STANDARD.md`.

Do not depend on hidden global PROMueve/KairOS skills for project behavior; durable project-specific guidance belongs in this repository.

## Product horizon

V4: local-first, backend-ready, usable progressively for real pilot when explicitly qualified.
V5: configurable agnostic hub by service/pathology/visit/role/form/clinical variable.

Do not mix V5 expansion into urgent V4 demo/pilot repairs.